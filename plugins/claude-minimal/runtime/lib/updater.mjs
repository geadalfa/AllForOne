import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  CACHE_TTL_MS,
  DISPLAY_NAME,
  LOCK_STALE_MS,
  PLUGIN_NAME,
  REPO,
  VERSION
} from './constants.mjs';
import { ensureDir, readJson, writeJson } from './fsx.mjs';
import { installPluginFiles } from './qoder.mjs';
import { resolveSkills } from './profiles.mjs';
import { readState, writeState } from './state.mjs';
import { runGit, syncManagedUpstream } from './upstreams.mjs';

export function isDue(lastCheck, now = Date.now(), ttl = CACHE_TTL_MS) {
  if (!lastCheck) return true;
  const then = Date.parse(lastCheck);
  if (Number.isNaN(then)) return true;
  return now - then >= ttl;
}

export function compareVersions(a, b) {
  const pa = String(a || '0').split(/[.+-]/).map((part) => Number.parseInt(part, 10) || 0);
  const pb = String(b || '0').split(/[.+-]/).map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(pa.length, pb.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (pa[index] || 0) - (pb[index] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

function processHasExited(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return error.code === 'ESRCH';
  }
}

function releaseOwner(lock, owner) {
  fs.rmSync(path.join(lock, owner), { force: true });
  try {
    fs.rmdirSync(lock);
  } catch (error) {
    // A new owner can already have replaced the empty directory.
    if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error;
  }
}

function clearStaleOwner(lock, stat) {
  if (Date.now() - stat.mtimeMs < LOCK_STALE_MS) return;
  try {
    if (stat.isFile()) {
      // Registrations created by pre-0.2 releases were JSON files.
      if (processHasExited(readJson(lock)?.pid)) fs.unlinkSync(lock);
    } else if (stat.isDirectory()) {
      const entries = fs.readdirSync(lock);
      if (!entries.length) fs.rmdirSync(lock);
      else if (entries.length === 1) {
        const match = /^owner-(\d+)-[0-9a-f-]+$/.exec(entries[0]);
        if (match && processHasExited(Number(match[1]))) releaseOwner(lock, entries[0]);
      }
    }
  } catch (error) {
    // Another contender can finish reclaiming the same dead owner first.
    if (!['ENOENT', 'EISDIR', 'ENOTDIR', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error;
  }
}

export function acquireLock(stateDir) {
  ensureDir(stateDir);
  const lock = path.join(stateDir, 'update.lock');
  const stat = fs.lstatSync(lock, { throwIfNoEntry: false });
  if (stat) {
    clearStaleOwner(lock, stat);
    if (fs.existsSync(lock)) return null;
  }
  const staging = fs.mkdtempSync(path.join(stateDir, '.update-claim-'));
  const owner = `owner-${process.pid}-${randomUUID()}`;
  try {
    fs.writeFileSync(path.join(staging, owner), '');
    // Rename publishes the owner atomically. An existing nonempty lock
    // directory cannot be replaced on either POSIX or Windows.
    fs.renameSync(staging, lock);
  } catch (error) {
    fs.rmSync(staging, { recursive: true, force: true });
    if (['EEXIST', 'ENOTEMPTY', 'EPERM', 'EACCES', 'ENOTDIR'].includes(error.code) && fs.existsSync(lock)) return null;
    throw error;
  }
  return () => releaseOwner(lock, owner);
}

function remoteHead(stateDir) {
  const result = runGit(['ls-remote', REPO, 'HEAD'], stateDir);
  if (!result.ok) return { error: result.stderr };
  const line = result.stdout.split(/\r?\n/).find(Boolean);
  return { commit: line ? line.split(/\s+/)[0] : null };
}

function ensureSelfClone(stateDir) {
  const dir = path.join(stateDir, 'self', 'repo');
  if (fs.existsSync(path.join(dir, '.git'))) {
    const status = runGit(['status', '--porcelain'], dir);
    if (!status.ok || status.stdout) return { dir, error: 'Self-update clone has local changes or cannot be inspected' };
    const fetched = runGit(['fetch', '--depth', '1', 'origin'], dir);
    if (!fetched.ok) return { dir, error: fetched.stderr };
    const reset = runGit(['reset', '--hard', 'FETCH_HEAD'], dir);
    if (!reset.ok) return { dir, error: reset.stderr };
    return { dir };
  }
  ensureDir(path.dirname(dir));
  const cloned = runGit(['clone', '--depth', '1', REPO + '.git', dir], stateDir);
  if (!cloned.ok) return { dir, error: cloned.stderr };
  return { dir };
}

export function checkSelf(ctx, state, now = Date.now()) {
  const { stateDir, qoderDir, force = false, offline = false, quiet = false } = ctx;
  if (!state.autoUpdate.self) return { status: 'disabled' };
  if (offline) return { status: 'offline' };
  if (!force && !isDue(state.self.lastCheck, now)) return { status: 'cached' };

  const head = remoteHead(stateDir);
  state.self.lastCheck = new Date(now).toISOString();
  if (head.error || !head.commit) {
    state.self.lastError = head.error || 'Cannot resolve remote HEAD';
    return { status: 'error', error: state.self.lastError };
  }
  state.self.lastError = null;

  if (state.self.commit === head.commit && state.installedVersion === VERSION) {
    return { status: 'current', commit: head.commit };
  }

  const clone = ensureSelfClone(stateDir);
  if (clone.error) {
    state.self.lastError = clone.error;
    return { status: 'error', error: clone.error };
  }
  const remotePackage = readJson(path.join(clone.dir, 'package.json'), null);
  if (!remotePackage?.version) {
    state.self.lastError = 'Remote package.json is invalid';
    return { status: 'error', error: state.self.lastError };
  }
  if (compareVersions(remotePackage.version, state.installedVersion || VERSION) < 0) {
    return { status: 'current', commit: head.commit };
  }

  let selectedProfiles = state.profiles || [];
  if (state.installMode === 'minimal' && selectedProfiles.length === 0) {
    selectedProfiles = ['engineering'];
  }
  const skills = resolveSkills({
    root: clone.dir,
    mode: state.installMode || 'full',
    profiles: selectedProfiles
  });
  const installedPath = installPluginFiles(qoderDir, {
    name: PLUGIN_NAME,
    version: remotePackage.version,
    sourceRoot: clone.dir,
    skills,
    displayName: DISPLAY_NAME
  });

  state.self.commit = head.commit;
  state.self.available = remotePackage.version;
  state.self.applied = {
    at: new Date(now).toISOString(),
    from: state.installedVersion,
    to: remotePackage.version,
    commit: head.commit
  };
  state.installedVersion = remotePackage.version;
  if (!quiet) {
    console.log(
      `AllForOne self-update: ${state.self.applied.from} -> ${remotePackage.version} (${installedPath})`
    );
  }
  return { status: 'updated', ...state.self.applied, path: installedPath };
}

export function checkUpstreams(ctx, state, now = Date.now()) {
  const { stateDir, qoderDir, force = false, quiet = false } = ctx;
  if (!state.autoUpdate.upstreams) return { status: 'disabled', results: [] };
  if (ctx.offline) return { status: 'offline', results: [] };
  const registry = readJson(path.join(ctx.root, 'upstreams', 'registry.json'), null);
  if (!registry?.upstreams) return { status: 'error', error: 'registry missing', results: [] };

  const results = [];
  for (const entry of registry.upstreams) {
    const record = state.upstreams[entry.id];
    if (!record) continue;
    if (!force && !isDue(record.lastCheck, now)) {
      results.push({ id: entry.id, status: 'cached' });
      continue;
    }
    let result;
    try {
      result = syncManagedUpstream(entry, { qoderDir, stateDir });
    } catch (error) {
      result = { id: entry.id, error: error.message, updated: false };
    }
    record.lastCheck = new Date(now).toISOString();
    record.commit = result.commit || record.commit;
    record.lastError = result.error || null;
    results.push({
      id: entry.id,
      status: result.error ? 'error' : result.updated ? 'updated' : result.skipped ? 'skipped' : 'current',
      skipped: result.skipped || null,
      commit: result.commit || null,
      installed: result.installed || [],
      error: result.error || null
    });
    if (!quiet && result.updated) {
      console.log(`AllForOne upstream updated: ${entry.id}`);
    }
  }
  return { status: 'ok', results };
}

export function writeUpdateReport(stateDir, report) {
  const file = path.join(stateDir, 'cache', 'update-status.json');
  ensureDir(path.dirname(file));
  writeJson(file, report);
  return file;
}

export function readUpdateReport(stateDir) {
  return readJson(path.join(stateDir, 'cache', 'update-status.json'), null);
}

export function autoUpdate(ctx) {
  const { stateDir, quiet = false } = ctx;
  const release = acquireLock(stateDir);
  if (!release) return { status: 'locked' };
  const now = Date.now();
  const report = {
    at: new Date(now).toISOString(),
    self: null,
    upstreams: null
  };
  try {
    const state = readState(stateDir);
    report.self = checkSelf(ctx, state, now);
    report.upstreams = checkUpstreams(ctx, state, now);
    state.lastRun = report.at;
    writeState(stateDir, state);
    writeUpdateReport(stateDir, report);
    if (!quiet) {
      console.log(
        `AllForOne update check complete: self=${report.self.status}, upstreams=${report.upstreams.status}`
      );
    }
    return report;
  } finally {
    release();
  }
}

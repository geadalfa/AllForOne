import fs from 'node:fs';
import path from 'node:path';
import {
  CACHE_TTL_MS,
  DISPLAY_NAME,
  PLUGIN_NAME,
  REPO,
  VERSION
} from './constants.mjs';
import { ensureDir, readJson, writeJson } from './fsx.mjs';
import {
  installPluginFiles,
  setPluginEnabled
} from './qoder.mjs';
import { loadProfiles, resolveSkills } from './profiles.mjs';
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

export function acquireLock(stateDir) {
  const file = path.join(stateDir, 'update.lock');
  ensureDir(stateDir);
  if (fs.existsSync(file)) {
    const age = Date.now() - fs.statSync(file).mtimeMs;
    if (age < 10 * 60 * 1000) return null;
  }
  fs.writeFileSync(file, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
  return () => fs.rmSync(file, { force: true });
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
    const fetched = runGit(['fetch', '--depth', '1', 'origin'], dir);
    if (!fetched.ok) return { dir, error: fetched.stderr };
    const reset = runGit(['reset', '--hard', 'FETCH_HEAD'], dir);
    if (!reset.ok) return { dir, error: reset.stderr };
    return { dir };
  }
  ensureDir(path.dirname(dir));
  fs.rmSync(dir, { recursive: true, force: true });
  const cloned = runGit(['clone', '--depth', '1', REPO + '.git', dir], stateDir);
  if (!cloned.ok) return { dir, error: cloned.stderr };
  return { dir };
}

export function checkSelf(ctx, state, now = Date.now()) {
  const { stateDir, qoderDir, force = false, offline = false, quiet = false } = ctx;
  if (!state.autoUpdate.self) return { status: 'disabled' };
  if (!force && !isDue(state.self.lastCheck, now)) return { status: 'cached' };
  if (offline) {
    state.self.lastCheck = new Date(now).toISOString();
    return { status: 'offline' };
  }

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
  setPluginEnabled(qoderDir, PLUGIN_NAME, true);

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
      status: result.error ? 'error' : result.updated ? 'updated' : 'current',
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
  const state = readState(stateDir);
  const now = Date.now();
  const report = {
    at: new Date(now).toISOString(),
    self: null,
    upstreams: null
  };
  try {
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

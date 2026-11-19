import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { copyDir, ensureDir, exists, readJson, remove, writeJson } from './fsx.mjs';
import {
  installPluginFiles,
  isRegistered,
  setPluginEnabled
} from './qoder.mjs';

const MARKER = '.allforone-managed.json';

export function runGit(args, cwd, options = {}) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    timeout: options.timeout || 120000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim()
  };
}

export function cloneOrUpdate(entry, stateDir, options = {}) {
  const dir = path.join(stateDir, 'upstreams', entry.id);
  if (options.offline) return { dir, commit: null, offline: true };
  ensureDir(path.dirname(dir));

  if (exists(path.join(dir, '.git'))) {
    const dirty = runGit(['status', '--porcelain'], dir);
    if (!dirty.ok || dirty.stdout) {
      return { dir, commit: null, skipped: 'managed clone has local changes' };
    }
    const fetched = runGit(['fetch', '--depth', '1', 'origin', entry.branch], dir);
    if (!fetched.ok) return { dir, commit: null, error: fetched.stderr };
    const reset = runGit(['reset', '--hard', 'FETCH_HEAD'], dir);
    if (!reset.ok) return { dir, commit: null, error: reset.stderr };
    const head = runGit(['rev-parse', 'HEAD'], dir);
    return { dir, commit: head.ok ? head.stdout : null };
  }

  remove(dir);
  const cloned = runGit(
    ['clone', '--depth', '1', '--branch', entry.branch, entry.repo, dir],
    stateDir
  );
  if (!cloned.ok) return { dir, commit: null, error: cloned.stderr };
  const head = runGit(['rev-parse', 'HEAD'], dir);
  return { dir, commit: head.ok ? head.stdout : null };
}

function writeMarker(target, payload) {
  writeJson(path.join(target, MARKER), payload);
}

function hasMarker(target) {
  return exists(path.join(target, MARKER));
}

function installSubset({ entry, dir, qoderDir, commit }) {
  const install = entry.install || {};
  const root = path.join(dir, install.root || '.');
  const specs = [];
  if (install.all) {
    for (const name of fs.readdirSync(root, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      const candidate = path.join(root, name.name, 'SKILL.md');
      if (exists(candidate)) specs.push({ from: name.name, name: name.name });
    }
  }
  for (const spec of install.skills || []) {
    specs.push(typeof spec === 'string' ? { from: spec, name: path.basename(spec) } : spec);
  }

  const installed = [];
  const skipped = [];
  for (const spec of specs) {
    const source = path.join(root, spec.from);
    const target = path.join(qoderDir, 'skills', spec.name);
    if (!exists(path.join(source, 'SKILL.md'))) {
      skipped.push(`${spec.name}: missing SKILL.md`);
      continue;
    }
    if (exists(target) && !hasMarker(target)) {
      skipped.push(`${spec.name}: already installed outside AllForOne`);
      continue;
    }
    remove(target);
    copyDir(source, target, { exclude: new Set(['.git']) });
    writeMarker(target, {
      upstream: entry.id,
      source: path.relative(dir, source).replace(/\\/g, '/'),
      commit
    });
    installed.push(spec.name);
  }
  return { installed, skipped };
}

export function installUpstream(entry, ctx) {
  const { qoderDir, stateDir, offline } = ctx;
  const clone = cloneOrUpdate(entry, stateDir, { offline });
  if (clone.error) return { id: entry.id, ...clone, installed: false };
  if (clone.offline) return { id: entry.id, ...clone, installed: false };
  if (clone.skipped) return { id: entry.id, ...clone, installed: false };

  const install = entry.install || { type: 'reference' };
  if (install.type === 'reference') {
    return { id: entry.id, ...clone, installed: false, reference: clone.dir };
  }

  if (install.type === 'qoder-plugin') {
    const manifestFile = path.join(clone.dir, install.pluginPath || '.qoder-plugin/plugin.json');
    const manifest = readJson(manifestFile, null);
    if (!manifest?.name || !manifest?.version) {
      return { id: entry.id, ...clone, installed: false, error: 'invalid plugin manifest' };
    }
    if (isRegistered(qoderDir, manifest.name)) {
      return {
        id: entry.id,
        ...clone,
        installed: false,
        skipped: `${manifest.name} is already installed`
      };
    }
    const target = installPluginFiles(qoderDir, {
      name: manifest.name,
      version: manifest.version,
      sourceRoot: clone.dir,
      skills: null,
      displayName: manifest.displayName || manifest.name
    });
    setPluginEnabled(qoderDir, manifest.name, true);
    writeMarker(target, { upstream: entry.id, commit: clone.commit });
    return {
      id: entry.id,
      ...clone,
      installed: true,
      plugin: manifest.name,
      version: manifest.version
    };
  }

  if (install.type === 'skills') {
    const result = installSubset({ entry, dir: clone.dir, qoderDir, commit: clone.commit });
    return { id: entry.id, ...clone, installed: result.installed.length > 0, ...result };
  }

  if (install.type === 'mcp') {
    const recipeDir = path.join(stateDir, 'mcp');
    ensureDir(recipeDir);
    const recipeFile = path.join(recipeDir, `${entry.id}.json`);
    writeJson(recipeFile, {
      upstream: entry.id,
      note: install.mcp?.note || 'Register this MCP server manually.',
      package: install.mcp?.package || null
    });
    return { id: entry.id, ...clone, installed: false, recipeFile };
  }

  return { id: entry.id, ...clone, installed: false, error: `unknown install type ${install.type}` };
}

export function syncManagedUpstream(entry, ctx) {
  const { qoderDir, stateDir } = ctx;
  const clone = cloneOrUpdate(entry, stateDir, {});
  if (clone.error) return { id: entry.id, ...clone, updated: false };
  if (clone.skipped) return { id: entry.id, ...clone, updated: false };
  const install = entry.install || {};
  if (install.type === 'skills') {
    const result = installSubset({ entry, dir: clone.dir, qoderDir, commit: clone.commit });
    return { id: entry.id, ...clone, updated: result.installed.length > 0, ...result };
  }
  return { id: entry.id, ...clone, updated: true };
}

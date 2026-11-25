import fs from 'node:fs';
import path from 'node:path';
import { readJsonObject, writeJson } from './fsx.mjs';

export function stateFile(stateDir) {
  return path.join(stateDir, 'state.json');
}

export function defaultState() {
  return {
    version: 1,
    installedVersion: null,
    installMode: null,
    profiles: [],
    installedAt: null,
    autoUpdate: {
      self: true,
      upstreams: true
    },
    self: {
      lastCheck: null,
      commit: null,
      available: null,
      applied: null,
      lastError: null
    },
    upstreams: {},
    lastRun: null
  };
}

export function readState(stateDir) {
  const value = readJsonObject(stateFile(stateDir), null);
  if (!value) return defaultState();
  const base = defaultState();
  return {
    ...base,
    ...value,
    autoUpdate: { ...base.autoUpdate, ...(value.autoUpdate || {}) },
    self: { ...base.self, ...(value.self || {}) },
    upstreams: value.upstreams && typeof value.upstreams === 'object' ? value.upstreams : {}
  };
}

export function prepareStatePurge(stateDir, qoderDir) {
  if (!fs.existsSync(stateDir)) return;
  const dir = fs.realpathSync(stateDir);
  const qoder = fs.existsSync(qoderDir) ? fs.realpathSync(qoderDir) : path.resolve(qoderDir);
  const overlaps = (parent, child) => {
    const rel = path.relative(parent, child);
    return rel === '' || (!path.isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + path.sep));
  };
  if (overlaps(qoder, dir) || overlaps(dir, qoder) || dir === path.parse(dir).root) {
    throw new Error('Cannot purge a state directory overlapping the Qoder profile or filesystem root');
  }
  const files = fs.readdirSync(dir);
  const expected = new Set(['state.json', 'memory', 'cache', 'self', 'upstreams', 'mcp']);
  const state = readJsonObject(stateFile(dir), null);
  if (!state?.installedVersion || !['minimal', 'full'].includes(state.installMode)
      || !state.installedAt || files.some((name) => !expected.has(name))) {
    throw new Error('Cannot purge an unrecognized or shared AllForOne state directory');
  }
  return () => {
    for (const name of files) fs.rmSync(path.join(dir, name), { recursive: true, force: true });
    fs.rmdirSync(dir);
  };
}

export function writeState(stateDir, state) {
  const file = stateFile(stateDir);
  writeJson(file, state);
  return file;
}

export function ensureUpstreamState(state, id) {
  if (!state.upstreams[id]) {
    state.upstreams[id] = {
      installedAt: null,
      lastCheck: null,
      commit: null,
      skipped: null,
      lastError: null
    };
  }
  return state.upstreams[id];
}

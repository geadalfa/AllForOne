import path from 'node:path';
import { readJson, writeJson } from './fsx.mjs';

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
  const value = readJson(stateFile(stateDir), null);
  if (!value || typeof value !== 'object') return defaultState();
  const base = defaultState();
  return {
    ...base,
    ...value,
    autoUpdate: { ...base.autoUpdate, ...(value.autoUpdate || {}) },
    self: { ...base.self, ...(value.self || {}) },
    upstreams: value.upstreams && typeof value.upstreams === 'object' ? value.upstreams : {}
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

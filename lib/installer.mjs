import { spawnSync } from 'node:child_process';
import {
  DISPLAY_NAME,
  PLUGIN_NAME,
  VERSION
} from './constants.mjs';
import {
  installPluginFiles,
  seedQoderMemory,
  setPluginEnabled
} from './qoder.mjs';
import { resolveKnowledge, resolveSkills, resolveTools, resolveUpstreams } from './profiles.mjs';
import { ensureMemoryScaffold, writeMemoryIndex } from './memory.mjs';
import { ensureUpstreamState, readState, writeState } from './state.mjs';
import { installUpstream } from './upstreams.mjs';

function sourceCommit(root) {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8'
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

export function installAll(ctx) {
  const {
    root,
    qoderDir,
    stateDir,
    mode,
    profiles = [],
    autoUpdate = true,
    upstreams = true,
    offline = false,
    quiet = false
  } = ctx;

  const startedAt = Date.now();
  const state = readState(stateDir);
  const skills = resolveSkills({ root, mode, profiles });
  const knowledge = resolveKnowledge({ root, mode, profiles });
  const tools = resolveTools({ root, mode, profiles });
  const selectedUpstreams = upstreams
    ? resolveUpstreams({ root, mode, profiles })
    : [];

  const pluginPath = installPluginFiles(qoderDir, {
    name: PLUGIN_NAME,
    version: VERSION,
    sourceRoot: root,
    skills,
    knowledge,
    tools,
    displayName: DISPLAY_NAME
  });
  setPluginEnabled(qoderDir, PLUGIN_NAME, true);

  const upstreamResults = [];
  for (const entry of selectedUpstreams) {
    if (!quiet) console.log(`Upstream: ${entry.id}...`);
    const record = ensureUpstreamState(state, entry.id);
    let result;
    try {
      result = installUpstream(entry, { qoderDir, stateDir, offline });
    } catch (error) {
      result = { id: entry.id, error: error.message, installed: false };
    }
    if (result.commit && !result.error && !result.skipped) record.installedAt ||= new Date().toISOString();
    if (!offline) record.lastCheck = new Date().toISOString();
    record.commit = result.commit || record.commit;
    record.skipped = result.skipped || null;
    record.lastError = result.error || null;
    upstreamResults.push(result);
    if (!quiet) {
      const status = result.installed
        ? `installed${result.plugin ? ` ${result.plugin}@${result.version}` : ''}`
        : result.skipped
          ? `skipped: ${result.skipped}`
          : result.error
            ? `error: ${result.error}`
            : 'tracked';
      console.log(`  ${entry.id}: ${status}`);
    }
  }

  ensureMemoryScaffold(stateDir, root);
  writeMemoryIndex(stateDir);
  const memoryPointer = seedQoderMemory(qoderDir, stateDir);

  state.installedVersion = VERSION;
  state.installMode = mode;
  state.profiles = profiles;
  state.installedAt = state.installedAt || new Date().toISOString();
  state.autoUpdate.self = Boolean(autoUpdate);
  state.autoUpdate.upstreams = Boolean(autoUpdate);
  state.self.commit = sourceCommit(root) || state.self.commit;
  state.lastRun = new Date().toISOString();
  writeState(stateDir, state);

  return {
    pluginPath,
    memoryPointer,
    mode,
    profiles,
    skills,
    knowledge,
    tools,
    upstreams: upstreamResults,
    autoUpdate: { self: Boolean(autoUpdate), upstreams: Boolean(autoUpdate) },
    elapsedMs: Date.now() - startedAt
  };
}

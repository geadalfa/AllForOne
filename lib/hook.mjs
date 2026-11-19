import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { CACHE_TTL_MS, ROOT } from './constants.mjs';
import { readState } from './state.mjs';
import { isDue, readUpdateReport } from './updater.mjs';

export function readHookInput() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function updatesDue(state, now = Date.now()) {
  if (!state.autoUpdate.self && !state.autoUpdate.upstreams) return false;
  if (state.autoUpdate.self && isDue(state.self.lastCheck, now, CACHE_TTL_MS)) return true;
  if (state.autoUpdate.upstreams) {
    for (const record of Object.values(state.upstreams || {})) {
      if (isDue(record.lastCheck, now, CACHE_TTL_MS)) return true;
    }
  }
  return false;
}

function spawnUpdate(ctx) {
  const bin = path.join(ROOT, 'bin', 'allforone.mjs');
  const child = spawn(process.execPath, [bin, 'update', '--quiet', '--auto'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: {
      ...process.env,
      ALLFORONE_HOME: ctx.stateDir,
      QODER_CONFIG_DIR: ctx.qoderDir
    }
  });
  child.unref();
}

export function sessionStart(ctx) {
  const input = readHookInput();
  const state = readState(ctx.stateDir);
  if (!state.installedVersion) return '';
  if (input.type && input.type !== 'startup') return '';

  if (updatesDue(state)) spawnUpdate(ctx);

  const report = readUpdateReport(ctx.stateDir);
  const lines = [
    '## AllForOne',
    `Version ${state.installedVersion} · mode ${state.installMode || 'unknown'} · auto-update ${
      state.autoUpdate.self ? 'on' : 'off'
    } (daily, cached)`,
    `Knowledge index: ${path.join(ROOT, 'knowledge', 'INDEX.md')}`,
    `Portable memory: ${path.join(ctx.stateDir, 'memory', 'MEMORY.md')} (local only, never publish)`,
    'Use the matching skill before complex work; run privacy-publish-gate before any public release.'
  ];
  if (report?.self?.status === 'updated' || report?.upstreams?.status === 'ok') {
    lines.push('A cached update report is available via /allforone-status.');
  }
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: lines.join('\n')
    }
  });
}

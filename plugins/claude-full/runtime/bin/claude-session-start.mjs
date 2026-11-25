#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fallbackRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT
  ? path.resolve(process.env.CLAUDE_PLUGIN_ROOT)
  : fallbackRoot;
const manifest = JSON.parse(
  fs.readFileSync(path.join(pluginRoot, '.claude-plugin', 'plugin.json'), 'utf8')
);
const stateDir = process.env.ALLFORONE_HOME
  ? path.resolve(process.env.ALLFORONE_HOME)
  : path.join(os.homedir(), '.allforone');

try {
  fs.readFileSync(0, 'utf8');
} catch {
  // Claude Code sends a JSON payload; it is not needed for the bootstrap line.
}

function seedMemory(template, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(template, { withFileTypes: true })) {
    const from = path.join(template, entry.name);
    const to = path.join(target, entry.name === 'MEMORY.template.md' ? 'MEMORY.md' : entry.name);
    if (entry.isDirectory()) seedMemory(from, to);
    else if (!fs.existsSync(to)) fs.copyFileSync(from, to);
  }
}

try {
  seedMemory(path.join(pluginRoot, 'memory'), path.join(stateDir, 'memory'));
} catch {
  // A read-only template folder must not block the session start.
}

const lines = [
  '## AllForOne',
  `Version ${manifest.version} · plugin ${manifest.name}`,
  `Knowledge index: ${path.join(pluginRoot, 'knowledge', 'INDEX.md')}`,
  `Portable memory: ${path.join(stateDir, 'memory', 'MEMORY.md')} (local only, never publish)`,
  'Use the matching skill before complex work; run privacy-publish-gate before any public release.'
];

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: lines.join('\n')
    }
  }) + '\n'
);
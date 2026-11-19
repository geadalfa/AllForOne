import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BIN = path.join(ROOT, 'bin', 'allforone.mjs');

function temp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'allforone-hook-'));
}

test('SessionStart emits a compact AllForOne bootstrap', () => {
  const stateDir = temp();
  const qoderDir = temp();
  try {
    fs.writeFileSync(
      path.join(stateDir, 'state.json'),
      JSON.stringify(
        {
          version: 1,
          installedVersion: '1.0.0',
          installMode: 'minimal',
          profiles: ['engineering'],
          autoUpdate: { self: false, upstreams: false },
          upstreams: {}
        },
        null,
        2
      )
    );
    const result = spawnSync(process.execPath, [BIN, 'hook', 'session-start'], {
      input: JSON.stringify({ type: 'startup' }),
      encoding: 'utf8',
      env: {
        ...process.env,
        ALLFORONE_HOME: stateDir,
        QODER_CONFIG_DIR: qoderDir
      }
    });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.hookSpecificOutput.hookEventName, 'SessionStart');
    assert.match(output.hookSpecificOutput.additionalContext, /AllForOne/);
    assert.match(output.hookSpecificOutput.additionalContext, /Portable memory/);
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
    fs.rmSync(qoderDir, { recursive: true, force: true });
  }
});

test('SessionStart stays silent on resume', () => {
  const stateDir = temp();
  const qoderDir = temp();
  try {
    fs.writeFileSync(
      path.join(stateDir, 'state.json'),
      JSON.stringify({
        version: 1,
        installedVersion: '1.0.0',
        autoUpdate: { self: false, upstreams: false },
        upstreams: {}
      })
    );
    const result = spawnSync(process.execPath, [BIN, 'hook', 'session-start'], {
      input: JSON.stringify({ type: 'resume' }),
      encoding: 'utf8',
      env: {
        ...process.env,
        ALLFORONE_HOME: stateDir,
        QODER_CONFIG_DIR: qoderDir
      }
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), '');
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
    fs.rmSync(qoderDir, { recursive: true, force: true });
  }
});

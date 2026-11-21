import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('privacy reports identify the file and type without emitting the matched value', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'allforone-privacy-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const script = path.join(root, 'scripts', 'privacy-scan.mjs');
  fs.mkdirSync(path.dirname(script));
  fs.copyFileSync(new URL('../scripts/privacy-scan.mjs', import.meta.url), script);
  const sample = ['gh', 'p_', 'x'.repeat(30)].join('');
  fs.writeFileSync(path.join(root, 'fixture.md'), sample);
  for (const args of [[], ['--json']]) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout + result.stderr, /fixture.md/);
    assert.match(result.stdout + result.stderr, /github-token/);
    assert.ok(!(result.stdout + result.stderr).includes(sample));
  }
  const missing = spawnSync(process.execPath, [script, '--history'], { encoding: 'utf8' });
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /could not read Git history/);
});

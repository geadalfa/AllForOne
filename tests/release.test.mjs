import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('packager produces a valid ZIP with the manifest at the root', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'allforone-zip-'));
  const out = path.join(dir, 'allforone.zip');
  try {
    const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'build-zip.mjs'), '--out', out], {
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr);
    const data = fs.readFileSync(out);
    assert.equal(data.readUInt32LE(0), 0x04034b50);
    assert.ok(data.length > 500 * 1024, `zip too small: ${data.length}`);
    assert.ok(fs.existsSync(path.join(ROOT, '.qoder-plugin', 'plugin.json')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('privacy scan reports zero findings', () => {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'privacy-scan.mjs')], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Privacy scan passed/);
});

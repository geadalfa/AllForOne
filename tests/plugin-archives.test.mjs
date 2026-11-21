import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const root = fileURLToPath(new URL('../', import.meta.url));

function archiveFiles(filename) {
  const archive = fs.readFileSync(filename);
  const files = new Map();
  let pos = 0;
  while (archive.readUInt32LE(pos) === 0x04034b50) {
    const length = archive.readUInt32LE(pos + 18);
    const nameSize = archive.readUInt16LE(pos + 26);
    const extraSize = archive.readUInt16LE(pos + 28);
    const name = archive.toString('utf8', pos + 30, pos + 30 + nameSize);
    const contentPos = pos + 30 + nameSize + extraSize;
    assert.ok(!files.has(name), `duplicate entry ${name}`);
    files.set(name, inflateRawSync(archive.subarray(contentPos, contentPos + length)));
    pos = contentPos + length;
  }
  assert.equal(archive.readUInt32LE(pos), 0x02014b50);
  return files;
}

test('ChatGPT ZIP contains its portable manifest, instructions and four public guides', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'allforone-web-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const zip = path.join(dir, 'plugin.zip');
  execFileSync(process.execPath, [path.join(root, 'scripts/build-chatgpt.mjs'), '--out', zip], { cwd: dir });
  const files = archiveFiles(zip);
  const manifest = JSON.parse(files.get('plugin.json'));
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
  assert.equal(manifest.version, pkg.version);
  assert.equal(manifest.license, pkg.license);
  const skillPath = `skills/${manifest.name}/SKILL.md`;
  const skill = files.get(skillPath).toString('utf8');
  assert.match(skill, /^name: allforone-workbench\r?$/m);
  const expectedPaths = [skillPath, 'plugin.json', 'LICENSE', 'NOTICE'];
  const references = Array.from(skill.matchAll(/`([a-z_]+\.md)`/g), match => match[1]);
  assert.equal(references.length, 4);
  for (const name of references) {
    const archivePath = `skills/${manifest.name}/references/${name}`;
    expectedPaths.push(archivePath);
    assert.deepEqual(files.get(archivePath), fs.readFileSync(path.join(root, 'knowledge', name)));
  }
  assert.deepEqual([...files.keys()].sort(), expectedPaths.sort());
});

test('Qoder ZIP includes tracked nested helpers and excludes local files', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'allforone-zip-filter-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'scripts'));
  for (const script of ['build-zip.mjs', 'zip.mjs']) {
    fs.copyFileSync(path.join(root, 'scripts', script), path.join(dir, 'scripts', script));
  }
  fs.mkdirSync(path.join(dir, 'skills/sample/scripts'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version: '1.0.0', files: ['skills/'] }));
  fs.writeFileSync(path.join(dir, 'skills/sample/scripts/check.mjs'), 'export const ok = true;');
  fs.writeFileSync(path.join(dir, 'skills/sample/local.txt'), 'local-only fixture');
  execFileSync('git', ['init', '--quiet'], { cwd: dir });
  execFileSync('git', ['add', 'package.json', 'skills/sample/scripts/check.mjs', 'scripts'], { cwd: dir });
  const zip = path.join(dir, 'out.zip');
  execFileSync(process.execPath, [path.join(dir, 'scripts/build-zip.mjs'), '--out', zip]);
  assert.deepEqual([...archiveFiles(zip).keys()].sort(), ['package.json', 'skills/sample/scripts/check.mjs']);
});

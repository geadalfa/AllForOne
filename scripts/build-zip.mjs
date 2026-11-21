#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeZip } from './zip.mjs';

const root = fs.realpathSync(fileURLToPath(new URL('../', import.meta.url)));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--out' || !args[1])) {
  throw new Error('Usage: node scripts/build-zip.mjs [--out FILE]');
}
const out = path.resolve(args[1] || path.join(root, 'dist', `allforone-${pkg.version}.qoder.zip`));

// Release from a Git checkout. Intersect the package allowlist with tracked paths so
// developer-only files inside an otherwise packaged directory cannot enter the ZIP.
const tracked = execFileSync('git', ['ls-files', '-z', '--cached', '--', '.'], { cwd: root, encoding: 'utf8' });
const roots = new Set(['package.json', ...pkg.files.map(name => name.replace(/\/$/, ''))]);
const entries = tracked.split('\0').filter(Boolean).filter(name => {
  const top = name.split('/')[0];
  return roots.has(top) || roots.has(name);
}).map(name => {
  const file = path.join(root, name);
  if (fs.realpathSync(file) !== file || !fs.lstatSync(file).isFile()) {
    throw new Error(`Invalid package file: ${name}`);
  }
  return { name, data: fs.readFileSync(file) };
});

writeZip(out, entries);
console.log(`Packed ${entries.length} files -> ${out}`);

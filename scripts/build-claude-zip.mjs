#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, VERSION } from '../lib/constants.mjs';
import { walk } from '../lib/fsx.mjs';
import { writeZip } from './zip.mjs';

const editions = [
  { mode: 'minimal', folder: 'claude-minimal' },
  { mode: 'full', folder: 'claude-full' }
];
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--out-dir' || !args[1])) {
  throw new Error('Usage: node scripts/build-claude-zip.mjs [--out-dir DIR]');
}
const outDir = path.resolve(args[1] || path.join(ROOT, 'dist'));
const marketplace = path.join(ROOT, '.claude-plugin', 'marketplace.json');
if (!fs.existsSync(marketplace)) {
  throw new Error('Run npm run build:claude before packing the Claude editions.');
}

for (const edition of editions) {
  const pluginDir = path.join(ROOT, 'plugins', edition.folder);
  const manifest = path.join(pluginDir, '.claude-plugin', 'plugin.json');
  if (!fs.existsSync(manifest)) {
    throw new Error(`Run npm run build:claude before packing ${edition.folder}.`);
  }
  const files = walk(pluginDir).sort();
  const entries = files.map((file) => ({
    name: path.relative(pluginDir, file).replace(/\\/g, '/'),
    data: fs.readFileSync(file)
  }));
  const out = path.join(outDir, `allforone-${VERSION}.${edition.folder}.zip`);
  writeZip(out, entries);
  console.log(`Packed ${entries.length} files -> ${out}`);
}
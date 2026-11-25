#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REPO, ROOT, VERSION } from '../lib/constants.mjs';
import { claudeInventory, writeClaudeEdition } from '../lib/claude-payload.mjs';
import { walk, writeJson } from '../lib/fsx.mjs';

const pluginDirectory = 'plugins';
const catalogFile = '.claude-plugin/marketplace.json';
const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const editions = [
  {
    name: 'allforone-minimal',
    folder: 'claude-minimal',
    mode: 'minimal',
    displayName: 'AllForOne Claude Minimal',
    description:
      'A curated quarter of the Full inventory for Claude Code: engineering, writing, QA, and security research, plus a reference library.',
    inventory: claudeInventory('minimal')
  },
  {
    name: 'allforone-full',
    folder: 'claude-full',
    mode: 'full',
    displayName: 'AllForOne Claude Full',
    description: 'The complete AllForOne skill and knowledge inventory for Claude Code.',
    inventory: null
  }
];

const args = process.argv.slice(2);
if (args.length !== 1 || !['--check', '--write'].includes(args[0])) {
  throw new Error('Usage: node scripts/build-claude-marketplace.mjs --check|--write');
}

const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'allforone-claude-marketplace-'));
try {
  const errors = [];
  const counts = new Map();
  for (const edition of editions) {
    const directory = path.join(stage, pluginDirectory, edition.folder);
    counts.set(edition.name, writeClaudeEdition(directory, {
      mode: edition.mode,
      name: edition.name,
      displayName: edition.displayName,
      description: edition.description,
      ...(edition.inventory || {})
    }));
  }
  for (const edition of editions) {
    const { skills, references } = counts.get(edition.name);
    if (!readme.includes(`| **${edition.displayName}** | ${skills} | ${references} |`)) {
      errors.push(`Update the README inventory for ${edition.displayName}.`);
    }
  }

  writeJson(path.join(stage, catalogFile), {
    name: 'allforone',
    description:
      'Portable agent skills, public references, deterministic tools, and a local MCP server for Claude Code and Claude Desktop.',
    owner: { name: 'AllForOne Contributors' },
    plugins: editions.map((edition) => ({
      name: edition.name,
      source: `./${pluginDirectory}/${edition.folder}`,
      description: edition.description,
      version: VERSION,
      homepage: REPO
    }))
  });

  const generated = new Set(walk(stage).map((file) => path.relative(stage, file).replace(/\\/g, '/')));
  for (const relative of generated) {
    const expected = fs.readFileSync(path.join(stage, relative), 'utf8').replaceAll('\r\n', '\n');
    const target = path.join(ROOT, relative);
    if (args[0] === '--write') {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, expected);
    }
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replaceAll('\r\n', '\n') !== expected) {
      errors.push(`Missing or outdated file: ${relative}`);
    }
  }
  for (const edition of editions) {
    const dir = path.join(ROOT, pluginDirectory, edition.folder);
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir)) {
      const relative = path.relative(ROOT, file).replace(/\\/g, '/');
      if (!generated.has(relative)) errors.push(`Unexpected file: ${relative}`);
    }
  }
  if (errors.length) {
    throw new Error(`${errors.join('\n')}\nRegenerate with npm run build:claude.`);
  }
  console.log('Claude marketplace matches the generated Minimal and Full packages.');
} finally {
  fs.rmSync(stage, { recursive: true, force: true });
}
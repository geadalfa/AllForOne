import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REPO, ROOT, VERSION } from '../lib/constants.mjs';
import { minimalCodexInventory } from '../lib/codex-payload.mjs';
import { walk, writeJson, writeText } from '../lib/fsx.mjs';
import { writeFullCodexSkills } from './codex-full.mjs';

const pluginDirectory = 'plugins';
const catalogFile = '.agents/plugins/marketplace.json';
const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const { license } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const minimal = minimalCodexInventory();
const editions = [
  {
    name: 'allforone-minimal',
    folder: 'minimal',
    displayName: 'AllForOne Minimal',
    description: 'A curated quarter of the Full inventory: engineering, writing, QA, and security research.',
    write(destination) {
      return writeFullCodexSkills(destination, { ...minimal, includeLibrary: true });
    }
  },
  {
    name: 'allforone-full',
    folder: 'full',
    displayName: 'AllForOne Full',
    description: 'The complete AllForOne skill and knowledge inventory adapted for Codex.',
    write: writeFullCodexSkills
  }
];

const args = process.argv.slice(2);
if (args.length !== 1 || !['--check', '--write'].includes(args[0])) {
  throw new Error('Usage: node scripts/build-codex-marketplace.mjs --check|--write');
}
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'allforone-codex-marketplace-'));
try {
  const errors = [];
  for (const edition of editions) {
    const directory = path.join(stage, pluginDirectory, edition.folder);
    const { skills, references } = edition.write(directory);
    if (!readme.includes(`| **${edition.displayName}** | ${skills} | ${references} |`)) {
      errors.push(`Update the README inventory for ${edition.displayName}.`);
    }
    fs.copyFileSync(path.join(ROOT, 'LICENSE'), path.join(directory, 'LICENSE'));
    writeJson(path.join(directory, '.codex-plugin', 'plugin.json'), {
      name: edition.name,
      version: VERSION,
      description: edition.description,
      author: { name: 'AllForOne Contributors' },
      repository: REPO,
      license,
      skills: './skills/',
      interface: {
        displayName: edition.displayName,
        shortDescription: edition.description,
        developerName: 'AllForOne Contributors',
        category: 'Productivity',
        defaultPrompt: ['Use AllForOne to review a proposed software change and suggest verification steps.']
      }
    });
  }

  writeJson(path.join(stage, catalogFile), {
    name: 'allforone',
    interface: { displayName: 'AllForOne' },
    plugins: editions.map(edition => ({
      name: edition.name,
      source: { source: 'local', path: `./${pluginDirectory}/${edition.folder}` },
      policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
      category: 'Productivity'
    }))
  });

  const generated = new Set(walk(stage).map(file => path.relative(stage, file)));
  for (const relative of generated) {
    const expected = fs.readFileSync(path.join(stage, relative), 'utf8').replaceAll('\r\n', '\n');
    const target = path.join(ROOT, relative);
    if (args[0] === '--write') writeText(target, expected);
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replaceAll('\r\n', '\n') !== expected) {
      errors.push(`Missing or outdated file: ${relative}`);
    }
  }
  for (const edition of editions) {
    const directory = path.join(ROOT, pluginDirectory, edition.folder);
    if (!fs.existsSync(directory)) continue;
    for (const file of walk(directory)) {
      const relative = path.relative(ROOT, file);
      if (!generated.has(relative)) errors.push(`Unexpected file: ${relative}`);
    }
  }
  if (errors.length) throw new Error(errors.join('\n') + '\nRegenerate with npm run build:codex.');
  console.log('Codex marketplace matches the generated Minimal and Full packages.');
} finally {
  fs.rmSync(stage, { recursive: true, force: true });
}

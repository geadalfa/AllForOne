#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeZip } from './zip.mjs';

const root = fs.realpathSync(fileURLToPath(new URL('../', import.meta.url)));
function read(relative) {
  const file = path.join(root, relative);
  if (fs.realpathSync(file) !== file || !fs.lstatSync(file).isFile()) {
    throw new Error(`Invalid plugin source: ${relative}`);
  }
  return fs.readFileSync(file);
}
const { version, license } = JSON.parse(read('package.json'));
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--out' || !args[1])) {
  throw new Error('Usage: node scripts/build-chatgpt.mjs [--out FILE]');
}
const out = path.resolve(args[1] || path.join(root, 'dist', `allforone-${version}.chatgpt.zip`));
const skill = 'skills/allforone-workbench';
const manifest = {
  $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
  name: 'allforone-workbench',
  version,
  description: 'Plan software changes, review UI behavior, evaluate product ideas, and edit technical writing with the AllForOne guides.',
  author: { name: 'AllForOne Contributors' },
  repository: 'https://github.com/geadalfa/AllForOne',
  license,
  extensions: {
    'com.openai': {
      interface: {
        displayName: 'AllForOne Workbench',
        shortDescription: 'Public guides for engineering, testing, product discovery, and writing',
        defaultPrompt: ['Use AllForOne to plan tests for switching between two records in a UI.']
      }
    }
  }
};
const references = [
  'app_opportunity_lab_playbook.md',
  'disciplined_software_engineering_framework.md',
  'human_writing_and_technical_prose.md',
  'software_qa_and_testing_discipline.md'
];
const entries = [
  { name: 'plugin.json', data: Buffer.from(JSON.stringify(manifest, null, 2) + '\n') },
  { name: 'LICENSE', data: read('LICENSE') },
  { name: 'NOTICE', data: read('NOTICE') },
  { name: skill + '/SKILL.md', data: read('integrations/chatgpt/SKILL.md') },
  ...references.map(name => ({ name: skill + '/references/' + name, data: read('knowledge/' + name) }))
];

writeZip(out, entries);
console.log(`Packed ChatGPT plugin with ${references.length} public references -> ${out}`);

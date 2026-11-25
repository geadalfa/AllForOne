#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function checkReadmeSync(root = DEFAULT_ROOT) {
  const errors = [];
  const add = (message) => errors.push(message);
  const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
  const readJson = (rel) => JSON.parse(read(rel));

  const pkg = readJson('package.json');
  const registry = readJson('upstreams/registry.json');
  const readme = read('README.md');

  const skills = fs
    .readdirSync(path.join(root, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(root, 'skills', entry.name, 'SKILL.md')))
    .map((entry) => entry.name)
    .sort();
  const knowledge = fs
    .readdirSync(path.join(root, 'knowledge'))
    .filter((name) => name.endsWith('.md') && name !== 'INDEX.md')
    .sort();
  const tools = fs
    .readdirSync(path.join(root, 'tools'))
    .filter((name) => name !== 'README.md' && !name.startsWith('.'))
    .sort();
  const upstreams = registry.upstreams || [];

  const want = (label, needle) => {
    if (!readme.includes(needle)) add(`${label}: README is missing \`${needle}\`.`);
  };

  want('version badge', `version-${pkg.version}-`);
  want('version alt text', `alt="Version ${pkg.version}"`);
  want('release ZIP link', `allforone-${pkg.version}.qoder.zip`);
  want('ChatGPT release ZIP link', `releases/download/v${pkg.version}/allforone-${pkg.version}.chatgpt.zip`);
  want('Codex marketplace setup', 'codex plugin marketplace add geadalfa/AllForOne');
  want('Codex Minimal installation', 'codex plugin add allforone-minimal@allforone');
  want('Codex Full installation', 'codex plugin add allforone-full@allforone');
  want('Claude marketplace setup', 'claude plugin marketplace add geadalfa/AllForOne');
  want('Claude Minimal installation', 'claude plugin install allforone-minimal@allforone');
  want('Claude Full installation', 'claude plugin install allforone-full@allforone');
  want('Claude Minimal ZIP link', `allforone-${pkg.version}.claude-minimal.zip`);
  want('Claude Full ZIP link', `allforone-${pkg.version}.claude-full.zip`);

  want('skills badge', `skills-${skills.length}-`);
  want('knowledge badge', `knowledge-${knowledge.length}-`);
  want('upstreams badge', `upstreams-${upstreams.length}-`);
  want('skills summary row', `| Skills | ${skills.length} |`);
  want('knowledge summary row', `| Knowledge documents | ${knowledge.length} |`);
  want('upstream summary row', `| Upstream packs | ${upstreams.length} |`);
  want('knowledge full column', `All ${knowledge.length} |`);
  want('upstream full column', `All ${upstreams.length} |`);
  want('skills inventory heading', `<b>Skills (${skills.length})</b>`);
  want('knowledge inventory heading', `<b>Knowledge documents (${knowledge.length})</b>`);
  want('tools inventory heading', `<b>Deterministic tools (${tools.length})</b>`);
  want('tools summary row', `| Deterministic tools | ${tools.length} |`);
  want('registry surface row', `Registry of ${upstreams.length} tracked third-party repositories`);
  want('skills tree count', `${skills.length} skills, one folder per skill`);
  want('knowledge tree count', `${knowledge.length} public knowledge documents and INDEX.md`);
  want('upstream tree count', `${upstreams.length} tracked third-party repositories`);
  want('tools tree count', `${tools.length} deterministic helpers`);

  for (const name of skills) want(`skill row ${name}`, `| \`${name}\` |`);
  for (const name of knowledge) want(`knowledge row ${name}`, `| \`${name}\` |`);
  for (const name of tools) want(`tool row ${name}`, `| \`${name}\` |`);

  for (const entry of upstreams) {
    const url = String(entry.repo || '').replace(/\.git$/, '');
    if (!url) {
      add(`upstream ${entry.id || '(no id)'}: repository URL is missing in upstreams/registry.json.`);
      continue;
    }
    if (!readme.includes(url)) add(`upstream ${entry.id}: README upstream table is missing ${url}.`);
  }

  return errors;
}

const invokedDirectly =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  const errors = checkReadmeSync();
  for (const error of errors) console.error(`error: ${error}`);
  if (errors.length) {
    console.error(`\nREADME sync failed with ${errors.length} error(s). Update README.md in the same change.`);
    process.exit(1);
  }
  console.log('README sync passed.');
}

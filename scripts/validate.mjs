#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];

function readJson(rel) {
  const file = path.join(ROOT, rel);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${rel}: ${error.message}`);
    return null;
  }
}

function listDirs(rel) {
  const dir = path.join(ROOT, rel);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function frontmatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const block = match[1];
  const name = block.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description =
    block.match(/^description:\s*(.+)$/m)?.[1]?.trim() ||
    (block.match(/^description:\s*>-?\s*\r?\n((?:\s{2,}.+\r?\n?)+)/m)?.[1] || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join(' ');
  return { name, description, text };
}

const manifest = readJson('.qoder-plugin/plugin.json');
const pkg = readJson('package.json');
const profiles = readJson('profiles.json');
const registry = readJson('upstreams/registry.json');
const hooks = readJson('hooks/hooks.json');
const mcp = readJson('.mcp.json');

if (manifest) {
  if (manifest.name !== 'allforone') errors.push('manifest name must be allforone');
  if (!manifest.version) errors.push('manifest version is missing');
  if (!manifest.skills) errors.push('manifest skills path is missing');
  if (pkg && manifest.version !== pkg.version) {
    errors.push(`version mismatch: manifest ${manifest.version}, package ${pkg.version}`);
  }
  for (const field of ['mcpServers', 'hooks']) {
    if (manifest[field] && !fs.existsSync(path.join(ROOT, manifest[field]))) {
      errors.push(`manifest ${field} path does not exist: ${manifest[field]}`);
    }
  }
}

const skills = listDirs('skills');
if (!skills.length) errors.push('no skills found');
for (const name of skills) {
  const file = path.join(ROOT, 'skills', name, 'SKILL.md');
  if (!fs.existsSync(file)) {
    errors.push(`skills/${name}: SKILL.md missing`);
    continue;
  }
  const meta = frontmatter(file);
  if (!meta) {
    errors.push(`skills/${name}: invalid frontmatter`);
    continue;
  }
  if (meta.name !== name) errors.push(`skills/${name}: frontmatter name is ${meta.name}`);
  if (!meta.description) errors.push(`skills/${name}: description is empty`);
}

const commandDirs = path.join(ROOT, 'commands');
if (fs.existsSync(commandDirs)) {
  const commands = fs.readdirSync(commandDirs).filter((name) => name.endsWith('.md'));
  for (const name of commands) {
    const text = fs.readFileSync(path.join(commandDirs, name), 'utf8').trim();
    if (!text) errors.push(`commands/${name}: empty`);
    if (!/^---\r?\n[\s\S]*?description:/m.test(text)) {
      warnings.push(`commands/${name}: no description frontmatter`);
    }
  }
}

if (profiles) {
  const known = new Set(skills);
  const seen = new Set();
  for (const skill of profiles.core || []) {
    if (!known.has(skill)) errors.push(`profiles.core references missing skill: ${skill}`);
    seen.add(skill);
  }
  for (const [profile, list] of Object.entries(profiles.profiles || {})) {
    for (const skill of list) {
      if (!known.has(skill)) errors.push(`profiles.${profile} references missing skill: ${skill}`);
      seen.add(skill);
    }
  }
  for (const skill of skills) {
    if (!seen.has(skill)) warnings.push(`skill not reachable from any profile: ${skill}`);
  }
}

const knowledgeDir = path.join(ROOT, 'knowledge');
const knowledgeDocs = fs.existsSync(knowledgeDir)
  ? fs.readdirSync(knowledgeDir).filter((name) => name.endsWith('.md'))
  : [];
const indexFile = path.join(knowledgeDir, 'INDEX.md');
if (!fs.existsSync(indexFile)) errors.push('knowledge/INDEX.md is missing');
else {
  const index = fs.readFileSync(indexFile, 'utf8');
  for (const doc of knowledgeDocs) {
    if (doc !== 'INDEX.md' && !index.includes(doc)) {
      warnings.push(`knowledge/INDEX.md does not reference ${doc}`);
    }
  }
  for (const match of index.matchAll(/`([a-z0-9_]+\.md)`/g)) {
    const doc = match[1];
    if (!knowledgeDocs.includes(doc)) errors.push(`knowledge/INDEX.md references missing ${doc}`);
  }
}

if (registry) {
  const ids = new Set();
  for (const entry of registry.upstreams || []) {
    if (!entry.id) errors.push('upstream entry without id');
    if (ids.has(entry.id)) errors.push(`duplicate upstream id: ${entry.id}`);
    ids.add(entry.id);
    if (!entry.repo) errors.push(`upstream ${entry.id}: repo missing`);
    if (!entry.branch) errors.push(`upstream ${entry.id}: branch missing`);
    if (!entry.license) errors.push(`upstream ${entry.id}: license missing`);
    if (!Array.isArray(entry.profiles)) errors.push(`upstream ${entry.id}: profiles missing`);
    const type = entry.install?.type;
    if (!['reference', 'skills', 'qoder-plugin', 'mcp'].includes(type)) {
      errors.push(`upstream ${entry.id}: invalid install type ${type}`);
    }
    if (type === 'qoder-plugin' && !entry.install.pluginPath) {
      errors.push(`upstream ${entry.id}: pluginPath missing`);
    }
    if (type === 'skills' && !entry.install.root) {
      errors.push(`upstream ${entry.id}: skills root missing`);
    }
  }
}

if (hooks && !hooks.hooks?.SessionStart) errors.push('hooks/SessionStart is missing');
if (mcp && !mcp.mcpServers?.allforone) errors.push('.mcp.json is missing the allforone server');

const walkDirs = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (fs.readdirSync(full).length === 0) warnings.push(`empty directory: ${path.relative(ROOT, full)}`);
      walkDirs(full);
    }
  }
};
walkDirs(ROOT);

for (const warning of warnings) console.warn(`warning: ${warning}`);
for (const error of errors) console.error(`error: ${error}`);
if (errors.length) {
  console.error(`\nValidation failed with ${errors.length} error(s).`);
  process.exit(1);
}
console.log(
  `Validation passed: ${skills.length} skills, ${knowledgeDocs.length - 1} knowledge docs, ${(registry?.upstreams || []).length} upstreams.`
);

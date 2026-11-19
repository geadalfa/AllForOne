import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));

test('manifest and package versions match', () => {
  const manifest = json('.qoder-plugin/plugin.json');
  const pkg = json('package.json');
  assert.equal(manifest.name, 'allforone');
  assert.equal(manifest.version, pkg.version);
  assert.equal(manifest.skills, './skills/');
  assert.equal(manifest.mcpServers, './.mcp.json');
  assert.equal(manifest.hooks, './hooks/hooks.json');
});

test('license is PolyForm Noncommercial 1.0.0', () => {
  const manifest = json('.qoder-plugin/plugin.json');
  const pkg = json('package.json');
  assert.equal(manifest.license, 'PolyForm-Noncommercial-1.0.0');
  assert.equal(pkg.license, 'PolyForm-Noncommercial-1.0.0');
  assert.match(read('LICENSE'), /PolyForm Noncommercial License 1\.0\.0/);
  assert.match(read('NOTICE'), /Commercial use, resale, or paid distribution/);
});

test('every skill has matching frontmatter', () => {
  const skills = fs
    .readdirSync(path.join(ROOT, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  assert.ok(skills.length >= 55, `expected at least 55 skills, found ${skills.length}`);
  for (const name of skills) {
    const text = read(`skills/${name}/SKILL.md`);
    assert.match(text, /^---\r?\n/, `${name} frontmatter`);
    const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
    assert.match(frontmatter, new RegExp(`^name:\\s*${name}$`, 'm'), `${name} name`);
    assert.match(frontmatter, /^description:\s*\S/m, `${name} description`);
  }
});

test('profiles only reference existing skills', () => {
  const profiles = json('profiles.json');
  const skills = new Set(
    fs
      .readdirSync(path.join(ROOT, 'skills'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  );
  for (const name of profiles.core) assert.ok(skills.has(name), `core ${name}`);
  for (const [profile, list] of Object.entries(profiles.profiles)) {
    assert.ok(list.length > 0, `${profile} is empty`);
    for (const name of list) assert.ok(skills.has(name), `${profile} -> ${name}`);
  }
});

test('knowledge index references only existing documents', () => {
  const index = read('knowledge/INDEX.md');
  const docs = new Set(
    fs
      .readdirSync(path.join(ROOT, 'knowledge'))
      .filter((name) => name.endsWith('.md') && name !== 'INDEX.md')
  );
  for (const match of index.matchAll(/`([a-z0-9_]+\.md)`/g)) {
    assert.ok(docs.has(match[1]), `missing knowledge document ${match[1]}`);
  }
});

test('upstream registry is complete and unique', () => {
  const registry = json('upstreams/registry.json');
  const ids = new Set();
  assert.ok(registry.upstreams.length >= 10);
  for (const entry of registry.upstreams) {
    assert.ok(entry.id);
    assert.ok(entry.repo.startsWith('https://github.com/'));
    assert.ok(entry.branch);
    assert.ok(entry.license);
    assert.ok(Array.isArray(entry.profiles) && entry.profiles.length > 0);
    assert.ok(['reference', 'skills', 'qoder-plugin', 'mcp'].includes(entry.install.type));
    assert.ok(!ids.has(entry.id), `duplicate ${entry.id}`);
    ids.add(entry.id);
  }
});

test('hooks and MCP declarations are present', () => {
  const hooks = json('hooks/hooks.json');
  assert.ok(hooks.hooks.SessionStart);
  const mcp = json('.mcp.json');
  assert.ok(mcp.mcpServers.allforone);
  assert.equal(mcp.mcpServers.allforone.command, '${QODER_NODE_RUNTIME}');
});

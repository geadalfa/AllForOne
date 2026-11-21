import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { ROOT, VERSION } from '../lib/constants.mjs';
import { prepareCodexMarketplace } from '../lib/codex.mjs';
import { resolveKnowledge, resolveSkills } from '../lib/profiles.mjs';

const FULL_PACKAGE = path.join(ROOT, 'plugins', 'full');
const QODER_FULL = { root: ROOT, mode: 'full' };

function isolated(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'allforone host test '));
  t.after(() => fs.rmSync(dir, { force: true, recursive: true }));
  const env = {
    ...process.env, CODEX_HOME: path.join(dir, 'codex'),
    QODER_CONFIG_DIR: path.join(dir, 'qoder'), ALLFORONE_HOME: path.join(dir, 'qoder-state')
  };
  fs.mkdirSync(env.CODEX_HOME);
  fs.mkdirSync(env.QODER_CONFIG_DIR);
  fs.writeFileSync(path.join(env.QODER_CONFIG_DIR, 'settings.json'), '{"sentinel":true}');
  return env;
}

function cli(env, ...args) {
  return spawnSync(process.execPath, [path.join(ROOT, 'bin', 'allforone.mjs'), ...args],
    { env, encoding: 'utf8', timeout: 40000 });
}

function checkQoder(env) {
  assert.deepEqual(fs.readdirSync(env.QODER_CONFIG_DIR), ['settings.json']);
  assert.equal(fs.readFileSync(path.join(env.QODER_CONFIG_DIR, 'settings.json'), 'utf8'), '{"sentinel":true}');
  assert.equal(fs.existsSync(env.ALLFORONE_HOME), false);
}

test('portable marketplace contains the declared skills, references and licenses across retries', t => {
  const env = isolated(t);
  const root = prepareCodexMarketplace(env.CODEX_HOME);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.agents/plugins/marketplace.json')));
  const payload = path.resolve(root, manifest.plugins[0].source.path);
  const plugin = JSON.parse(fs.readFileSync(path.join(payload, '.codex-plugin/plugin.json')));
  assert.equal(plugin.version, VERSION);
  assert.deepEqual(fs.readdirSync(payload).sort(),
    ['.codex-plugin', 'LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md', 'licenses', 'skills']);
  assert.equal(fs.readdirSync(path.join(payload, plugin.skills)).length, 5);
  assert.equal(fs.readdirSync(path.join(payload, 'skills/allforone-library/references')).length, 4);
  assert.ok(fs.existsSync(path.join(payload, 'skills/data-quality-checker/scripts/check_data_quality.py')));
  assert.equal(prepareCodexMarketplace(env.CODEX_HOME), root);
  fs.writeFileSync(path.join(payload, '.mcp.json'), '{}');
  assert.throws(() => prepareCodexMarketplace(env.CODEX_HOME), /differs from this release/);
  checkQoder(env);
});

test('unknown hosts, mismatched flags and overlapping host directories fail before Qoder writes', t => {
  const env = isolated(t);
  for (const argv of [['install', '--target', 'typo', '--full'], ['install', '--target', 'codex', '--full']]) {
    assert.notEqual(cli(env, ...argv).status, 0);
  }
  assert.match(cli({ ...env, CODEX_HOME: env.QODER_CONFIG_DIR }, 'install', '--target', 'chatgpt').stderr,
    /outside the Qoder configuration directory/);
  checkQoder(env);
});

test('existing marketplace data and redirected Qoder paths survive installation attempts', t => {
  const env = isolated(t);
  const market = path.join(env.CODEX_HOME, 'allforone-local');
  fs.mkdirSync(market);
  fs.writeFileSync(path.join(market, 'sentinel'), 'other publisher');
  assert.throws(() => prepareCodexMarketplace(env.CODEX_HOME), /not managed by AllForOne/);
  assert.deepEqual(fs.readdirSync(market), ['sentinel']);
  const owned = prepareCodexMarketplace(path.join(env.CODEX_HOME, 'second'));
  const manifest = path.join(owned, '.agents/plugins/marketplace.json');
  const custom = JSON.parse(fs.readFileSync(manifest));
  custom.plugins[0].source.path = './my-custom-plugin';
  fs.writeFileSync(manifest, JSON.stringify(custom));
  assert.throws(() => prepareCodexMarketplace(path.dirname(owned)), /modified outside AllForOne/);
  assert.deepEqual(JSON.parse(fs.readFileSync(manifest)), custom);
  const junction = path.join(path.dirname(env.CODEX_HOME), 'alternate');
  fs.symlinkSync(env.QODER_CONFIG_DIR, junction, process.platform === 'win32' ? 'junction' : 'dir');
  assert.match(cli({ ...env, CODEX_HOME: junction }, 'install', '--target', 'codex').stderr,
    /outside the Qoder configuration directory/);
  checkQoder(env);
});

test('native Codex and ChatGPT desktop targets share a scoped install, update and uninstall', t => {
  const env = isolated(t);
  if (spawnSync('codex', ['plugin', 'add', '--help'], { env, encoding: 'utf8' }).status !== 0) {
    t.skip('Codex CLI with local plugin support is unavailable'); return;
  }
  for (const [cmd, target] of [['install', 'codex'], ['update', 'chatgpt']]) {
    const result = cli(env, cmd, '--target', target);
    assert.equal(result.status, 0, result.stderr);
  }
  const result = cli(env, 'status', '--target', 'chatgpt', '--json');
  assert.equal(result.status, 0, result.stderr);
  const installed = JSON.parse(result.stdout).installed.find(p => p.pluginId === 'allforone@allforone-local');
  assert.equal(installed?.enabled, true);
  assert.equal(installed.version, VERSION);
  const removed = cli(env, 'uninstall', '--target', 'codex');
  assert.equal(removed.status, 0, removed.stderr);
  assert.deepEqual(JSON.parse(cli(env, 'status', '--target', 'codex', '--json').stdout).installed, []);
  const deregistered = spawnSync('codex', ['plugin', 'marketplace', 'remove', 'allforone-local'], { env });
  assert.equal(deregistered.status, 0);
  const foreign = path.join(path.dirname(env.CODEX_HOME), 'other-source');
  fs.cpSync(path.join(env.CODEX_HOME, 'allforone-local'), foreign, { recursive: true });
  assert.equal(spawnSync('codex', ['plugin', 'marketplace', 'add', foreign], { env }).status, 0);
  for (const cmd of ['install', 'uninstall']) {
    const attempt = cli(env, cmd, '--target', 'chatgpt');
    assert.notEqual(attempt.status, 0);
    assert.match(attempt.stderr, /already registered at/);
  }
  checkQoder(env);
});

test('Codex installs each repository marketplace edition with its declared skills', t => {
  const env = isolated(t);
  const codex = (...args) => spawnSync('codex', args, { env, encoding: 'utf8', timeout: 40000 });
  if (codex('plugin', 'add', '--help').status !== 0) {
    t.skip('Codex CLI with local plugin support is unavailable'); return;
  }
  const added = codex('plugin', 'marketplace', 'add', ROOT);
  assert.equal(added.status, 0, added.stderr);

  for (const edition of ['minimal', 'full']) {
    const pluginId = `allforone-${edition}@allforone`;
    const result = codex('plugin', 'add', pluginId, '--json');
    assert.equal(result.status, 0, result.stderr);
    const installed = JSON.parse(result.stdout);
    assert.equal(installed.pluginId, pluginId);
    assert.equal(installed.version, VERSION);
    const skillsDir = path.join(installed.installedPath, 'skills');
    if (edition === 'full') {
      assertFullInventory(installed.installedPath);
    } else {
      assert.equal(fs.readdirSync(skillsDir).length, 5);
      assert.equal(fs.readdirSync(path.join(skillsDir, 'allforone-library/references')).length, 4);
    }
    const removed = codex('plugin', 'remove', pluginId);
    assert.equal(removed.status, 0, removed.stderr);
  }
  checkQoder(env);
});

function assertFullInventory(root) {
  const expectedSkills = resolveSkills(QODER_FULL);
  const expectedKnowledge = resolveKnowledge(QODER_FULL);
  const skills = fs.readdirSync(path.join(root, 'skills')).sort();
  const knowledge = fs.readdirSync(path.join(root, 'knowledge')).sort();
  assert.equal(skills.length, 63);
  assert.equal(knowledge.filter(name => name !== 'INDEX.md').length, 35);
  assert.deepEqual(skills, expectedSkills);
  assert.deepEqual(knowledge, expectedKnowledge);
  for (const name of skills) {
    const skill = fs.readFileSync(path.join(root, 'skills', name, 'SKILL.md'), 'utf8');
    assert.match(skill, new RegExp(`^name: ${name}\\r?$`, 'm'));
  }
  const index = fs.readFileSync(path.join(root, 'knowledge', 'INDEX.md'), 'utf8');
  const indexed = new Set([...index.matchAll(/`([a-z0-9_]+\.md)`/g)].map(match => match[1]));
  assert.deepEqual([...indexed].sort(), knowledge.filter(name => name !== 'INDEX.md'));
}

test('Codex Full packages the Qoder inventory and the Codex-specific paths', () => {
  for (const edition of ['minimal', 'full']) {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'plugins', edition, '.codex-plugin/plugin.json')));
    assert.equal(manifest.version, VERSION);
  }
  assertFullInventory(FULL_PACKAGE);
  for (const file of ['tools/financial_calculator.py', 'skills/trader-memory-core/schemas/thesis.schema.json',
    'skills/macos-dmg-builder/scripts/build-dmg.sh', 'licenses/claude-trading-skills-LICENSE.txt']) {
    assert.ok(fs.existsSync(path.join(FULL_PACKAGE, file)), file);
  }
  for (const file of ['.qoder-plugin', 'hooks', '.mcp.json', 'memory']) {
    assert.ok(!fs.existsSync(path.join(FULL_PACKAGE, file)), file);
  }
  const knowledgeRouter = fs.readFileSync(path.join(FULL_PACKAGE, 'skills/allforone-knowledge/SKILL.md'), 'utf8');
  assert.ok(knowledgeRouter.includes('(../../knowledge/INDEX.md)'));
});

test('Codex Full memory persists only in the selected Codex home', t => {
  const env = isolated(t);
  const call = (args, input) => spawnSync(process.execPath, [path.join(FULL_PACKAGE, 'bin/memory.mjs'), ...args],
    { env, cwd: env.QODER_CONFIG_DIR, input, encoding: 'utf8' });
  const query = 'fixture decision';
  assert.deepEqual(JSON.parse(call(['search', query]).stdout), []);
  const content = JSON.stringify({ title: 'fixture', text: query, type: 'project' });
  const result = call(['add'], content);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).file, path.join(env.CODEX_HOME, 'allforone/memory/notes.md'));
  assert.match(JSON.parse(call(['search', query]).stdout)[0].snippet, /fixture decision/);
  const credential = 'ghp_' + 'x'.repeat(36);
  const refused = call(['add'], JSON.stringify({ text: credential }));
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /Refusing to store a credential/);
  assert.ok(!fs.readFileSync(JSON.parse(result.stdout).file, 'utf8').includes(credential));
  checkQoder(env);
});

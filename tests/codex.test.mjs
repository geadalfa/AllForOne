import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { ROOT, VERSION } from '../lib/constants.mjs';
import { prepareCodexMarketplace } from '../lib/codex.mjs';

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

  for (const [edition, skillCount, referenceCount] of [['minimal', 5, 4], ['full', 10, 10]]) {
    const pluginId = `allforone-${edition}@allforone`;
    const result = codex('plugin', 'add', pluginId, '--json');
    assert.equal(result.status, 0, result.stderr);
    const installed = JSON.parse(result.stdout);
    assert.equal(installed.pluginId, pluginId);
    assert.equal(installed.version, VERSION);
    assert.deepEqual(fs.readdirSync(installed.installedPath).sort(), ['.codex-plugin', 'LICENSE', 'skills']);
    const skillsDir = path.join(installed.installedPath, 'skills');
    assert.equal(fs.readdirSync(skillsDir).length, skillCount);
    assert.equal(fs.readdirSync(path.join(skillsDir, 'allforone-library/references')).length, referenceCount);
    const removed = codex('plugin', 'remove', pluginId);
    assert.equal(removed.status, 0, removed.stderr);
  }
  checkQoder(env);
});

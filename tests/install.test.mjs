import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installAll } from '../lib/installer.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function temp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'allforone-install-'));
}

function cleanup(...dirs) {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
}

test('minimal install registers, enables, and filters skills', () => {
  const qoderDir = temp();
  const stateDir = temp();
  try {
    const result = installAll({
      root: ROOT,
      qoderDir,
      stateDir,
      mode: 'minimal',
      profiles: ['engineering'],
      autoUpdate: false,
      upstreams: false,
      offline: true
    });
    assert.ok(fs.existsSync(path.join(result.pluginPath, '.qoder-plugin', 'plugin.json')));
    assert.ok(fs.existsSync(path.join(result.pluginPath, 'skills', 'plan-first', 'SKILL.md')));
    assert.ok(
      fs.existsSync(path.join(result.pluginPath, 'skills', 'repo-architecture-mentor', 'SKILL.md'))
    );
    assert.ok(!fs.existsSync(path.join(result.pluginPath, 'skills', 'financial-etf-advisory')));

    const registry = JSON.parse(
      fs.readFileSync(path.join(qoderDir, 'plugins', 'installed_plugins_v2.json'), 'utf8')
    );
    assert.equal(registry.plugins['allforone@local'][0].installPath, result.pluginPath);
    const settings = JSON.parse(fs.readFileSync(path.join(qoderDir, 'settings.json'), 'utf8'));
    assert.equal(settings.enabledPlugins['allforone@local'], true);

    const memory = fs.readFileSync(path.join(qoderDir, 'memory', 'MEMORY.md'), 'utf8');
    assert.match(memory, /allforone:start/);
    assert.ok(fs.existsSync(path.join(stateDir, 'memory', 'MEMORY.md')));

    const state = JSON.parse(fs.readFileSync(path.join(stateDir, 'state.json'), 'utf8'));
    assert.equal(state.installMode, 'minimal');
    assert.deepEqual(state.profiles, ['engineering']);
    assert.equal(state.autoUpdate.self, false);
    assert.equal(state.autoUpdate.upstreams, false);
  } finally {
    cleanup(qoderDir, stateDir);
  }
});

test('full install includes all skills and preserves existing Qoder entries', () => {
  const qoderDir = temp();
  const stateDir = temp();
  try {
    fs.mkdirSync(path.join(qoderDir, 'plugins'), { recursive: true });
    fs.writeFileSync(
      path.join(qoderDir, 'plugins', 'installed_plugins_v2.json'),
      JSON.stringify(
        { version: 2, plugins: { 'other@local': [{ scope: 'user', installPath: '/tmp/other' }] } },
        null,
        2
      )
    );
    fs.writeFileSync(
      path.join(qoderDir, 'settings.json'),
      JSON.stringify({ enabledPlugins: { 'other@local': true }, theme: 'dark' }, null, 2)
    );

    const result = installAll({
      root: ROOT,
      qoderDir,
      stateDir,
      mode: 'full',
      profiles: [],
      autoUpdate: true,
      upstreams: false,
      offline: true
    });

    const skills = fs.readdirSync(path.join(result.pluginPath, 'skills'));
    assert.ok(skills.includes('financial-etf-advisory'));
    assert.ok(skills.includes('bughunter-defensive-review'));
    assert.ok(skills.length === result.skills.length);

    const registry = JSON.parse(
      fs.readFileSync(path.join(qoderDir, 'plugins', 'installed_plugins_v2.json'), 'utf8')
    );
    assert.ok(registry.plugins['other@local']);
    assert.ok(registry.plugins['allforone@local']);
    const settings = JSON.parse(fs.readFileSync(path.join(qoderDir, 'settings.json'), 'utf8'));
    assert.equal(settings.theme, 'dark');
    assert.equal(settings.enabledPlugins['other@local'], true);
    assert.equal(settings.enabledPlugins['allforone@local'], true);
  } finally {
    cleanup(qoderDir, stateDir);
  }
});

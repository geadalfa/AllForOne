import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { writeJson } from '../lib/fsx.mjs';
import { addMemory } from '../lib/memory.mjs';
import { installPluginFiles, pluginInstallPath, qoderPaths, registerPlugin, unregisterPlugin } from '../lib/qoder.mjs';
import { defaultState, prepareStatePurge, writeState } from '../lib/state.mjs';
import { acquireLock, autoUpdate } from '../lib/updater.mjs';
import { installUpstream, syncManagedUpstream } from '../lib/upstreams.mjs';

const cli = fileURLToPath(new URL('../bin/allforone.mjs', import.meta.url));

function directory(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'allforone-preserve-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('malformed Qoder documents are preserved before any plugin copy or registration', (t) => {
  for (const [key, text] of [
    ['pluginsFile', '{bad'],
    ['pluginsFile', '{"version":2,"plugins":[]}'],
    ['settingsFile', '{"enabledPlugins":"unknown"}'],
    ['settingsFile', '[]'],
  ]) {
    const dir = directory(t);
    const paths = qoderPaths(dir);
    const file = paths[key];
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    assert.throws(() => installPluginFiles(dir, {
      name: 'demo', version: '1.0.0', sourceRoot: directory(t), displayName: 'Demo'
    }), /JSON|registry|enabledPlugins/);
    assert.equal(fs.readFileSync(file, 'utf8'), text);
    assert.equal(fs.existsSync(paths.pluginCache), false);
    if (key === 'settingsFile') assert.equal(fs.existsSync(paths.pluginsFile), false);
  }
});

test('Qoder user registration preserves other scopes and BOM-encoded settings', (t) => {
  const dir = directory(t);
  const { pluginsFile, settingsFile } = qoderPaths(dir);
  fs.mkdirSync(path.dirname(pluginsFile), { recursive: true });
  const projectEntry = { scope: 'project', installPath: '/project/demo' };
  fs.writeFileSync(pluginsFile, JSON.stringify({ version: 2, plugins: { 'demo@local': [projectEntry] } }));
  fs.writeFileSync(settingsFile, '\uFEFF{"enabledPlugins":{"demo@local":true},"theme":"light"}');
  registerPlugin(dir, { name: 'demo', version: '1.0.0', installPath: '/user/demo', displayName: 'Demo' });
  const readEntries = () => JSON.parse(fs.readFileSync(pluginsFile, 'utf8')).plugins['demo@local'];
  assert.equal(readEntries().length, 2);
  assert.equal(unregisterPlugin(dir, 'demo'), true);
  assert.deepEqual(readEntries(), [projectEntry]);
  assert.equal(fs.readFileSync(settingsFile, 'utf8'), '\uFEFF{"enabledPlugins":{"demo@local":true},"theme":"light"}');
});

test('plugin manifest name and version must stay inside their own cache directory', (t) => {
  const dir = directory(t);
  assert.throws(() => pluginInstallPath(dir, '../other', '1.0.0'), /Invalid plugin/);
  assert.throws(() => pluginInstallPath(dir, 'demo', '..'), /Invalid plugin/);
  assert.ok(pluginInstallPath(dir, 'demo-2', '1.0.0-rc.1').endsWith('1.0.0-rc.1'));
});

test('Qoder installation includes scripts bundled with a selected skill', (t) => {
  const source = directory(t);
  const qoderDir = directory(t);
  const nested = path.join('skills', 'demo', 'scripts');
  fs.mkdirSync(path.join(source, nested), { recursive: true });
  fs.writeFileSync(path.join(source, nested, 'run.py'), 'print(1)');
  fs.mkdirSync(path.join(source, 'scripts'));
  const installed = installPluginFiles(qoderDir, {
    name: 'demo', version: '1.0.0', sourceRoot: source, skills: ['demo'], displayName: 'Demo'
  });
  assert.equal(fs.readFileSync(path.join(installed, nested, 'run.py'), 'utf8'), 'print(1)');
  assert.equal(fs.existsSync(path.join(installed, 'scripts')), false);
});

test('offline update skips self and upstream network checks through the CLI', (t) => {
  const stateDir = directory(t);
  const qoderDir = directory(t);
  const result = spawnSync(process.execPath, [
    cli, 'update', '--offline', '--force', '--state-dir', stateDir, '--qoder-dir', qoderDir
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(fs.readFileSync(path.join(stateDir, 'cache', 'update-status.json'), 'utf8'));
  assert.equal(report.self.status, 'offline');
  assert.equal(report.upstreams.status, 'offline');
  assert.equal(JSON.parse(fs.readFileSync(path.join(stateDir, 'state.json'), 'utf8')).self.lastCheck, null);
  assert.deepEqual(fs.readdirSync(qoderDir), []);
});

test('invalid local state is preserved and the updater releases its lock', (t) => {
  const stateDir = directory(t);
  fs.writeFileSync(path.join(stateDir, 'state.json'), '{');
  assert.throws(() => autoUpdate({ stateDir, quiet: true, offline: true }), /Invalid JSON/);
  assert.equal(fs.readFileSync(path.join(stateDir, 'state.json'), 'utf8'), '{');
  assert.equal(fs.existsSync(path.join(stateDir, 'update.lock')), false);
});

test('failed atomic replacement preserves the original and removes the temporary file', (t) => {
  const dir = directory(t);
  const file = path.join(dir, 'state.json');
  fs.writeFileSync(file, '{"previous":true}');
  const originalRename = fs.renameSync;
  fs.renameSync = () => { throw new Error('replacement unavailable'); };
  try {
    assert.throws(() => writeJson(file, { changed: true }), /replacement unavailable/);
  } finally {
    fs.renameSync = originalRename;
  }
  assert.equal(fs.readFileSync(file, 'utf8'), '{"previous":true}');
  assert.deepEqual(fs.readdirSync(dir), ['state.json']);
});

test('concurrent update attempts have exactly one owner', async (t) => {
  const dir = directory(t);
  const gate = new Int32Array(new SharedArrayBuffer(4));
  const updater = new URL('../lib/updater.mjs', import.meta.url).href;
  const code = `
    const { parentPort, workerData } = require('node:worker_threads');
    import(workerData.updater).then(({ acquireLock }) => {
      parentPort.postMessage('ready');
      Atomics.wait(workerData.gate, 0, 0);
      const release = acquireLock(workerData.dir);
      parentPort.postMessage(Boolean(release));
      parentPort.once('message', () => release?.());
    });
  `;
  const workers = Array.from({ length: 6 }, () => new Worker(code, {
    eval: true, workerData: { dir, gate, updater }
  }));
  try {
    await Promise.all(workers.map((worker) => once(worker, 'message')));
    const results = Promise.all(workers.map((worker) => once(worker, 'message')));
    Atomics.store(gate, 0, 1);
    Atomics.notify(gate, 0);
    assert.equal((await results).filter(([won]) => won).length, 1);
    const exits = Promise.all(workers.map((worker) => once(worker, 'exit')));
    for (const worker of workers) worker.postMessage('release');
    await exits;
    assert.deepEqual(fs.readdirSync(dir), []);
  } finally {
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
});

test('lock recovery checks age and ownership and supports earlier JSON lock files', (t) => {
  const dir = directory(t);
  const lock = path.join(dir, 'update.lock');
  const deadPid = spawnSync(process.execPath, ['-e', '']).pid;
  const old = new Date(Date.now() - 15 * 60 * 1000);
  fs.writeFileSync(lock, JSON.stringify({ pid: deadPid }));
  assert.equal(acquireLock(dir), null);
  fs.utimesSync(lock, old, old);
  const release = acquireLock(dir);
  assert.equal(typeof release, 'function');
  fs.utimesSync(lock, old, old);
  assert.equal(acquireLock(dir), null);
  release();
  fs.mkdirSync(lock);
  fs.writeFileSync(path.join(lock, `owner-${deadPid}-abcdef`), '');
  fs.utimesSync(lock, old, old);
  const next = acquireLock(dir);
  assert.equal(typeof next, 'function');
  release();
  assert.equal(acquireLock(dir), null);
  next();
});

test('purge refuses a Qoder profile or a shared state directory before unregistering', (t) => {
  const stateDir = directory(t);
  const qoderDir = directory(t);
  const registry = qoderPaths(qoderDir).pluginsFile;
  fs.mkdirSync(path.dirname(registry), { recursive: true });
  const marker = '{"version":2,"plugins":{"allforone@local":[{"scope":"user"}]}}';
  fs.writeFileSync(registry, marker);
  writeState(stateDir, { ...defaultState(), installedVersion: '0.1.4', installMode: 'full', installedAt: '2026-11-01' });
  fs.writeFileSync(path.join(stateDir, 'other.txt'), 'preserve');
  for (const candidate of [qoderDir, stateDir]) {
    const result = spawnSync(process.execPath, [
      cli, 'uninstall', '--yes', '--purge', '--qoder-dir', qoderDir, '--state-dir', candidate
    ]);
    assert.notEqual(result.status, 0);
    assert.equal(fs.readFileSync(registry, 'utf8'), marker);
  }
  assert.equal(fs.readFileSync(path.join(stateDir, 'other.txt'), 'utf8'), 'preserve');
  fs.unlinkSync(path.join(stateDir, 'other.txt'));
  prepareStatePurge(stateDir, qoderDir)();
  assert.equal(fs.existsSync(stateDir), false);
});

test('bundled references never clone or synchronize an upstream checkout', (t) => {
  const dir = directory(t);
  const ctx = { stateDir: dir, qoderDir: dir };
  const entry = { id: 'bundled-demo', install: { type: 'bundled' } };
  assert.match(installUpstream(entry, ctx).skipped, /bundled/);
  assert.match(syncManagedUpstream(entry, ctx).skipped, /bundled/);
  assert.deepEqual(fs.readdirSync(dir), []);
});

test('memory rejects recognized secrets in title and type before writing notes', (t) => {
  const dir = directory(t);
  const sample = ['sk', 'proj', 'a'.repeat(32)].join('-');
  for (const key of ['title', 'type', 'text']) {
    assert.throws(() => addMemory(dir, { text: 'ordinary note', [key]: sample }), /Refusing to store/);
  }
  assert.deepEqual(fs.readdirSync(dir), []);
});

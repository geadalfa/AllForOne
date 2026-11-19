import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { isDue, compareVersions, acquireLock } from '../lib/updater.mjs';
import { installUpstream, syncManagedUpstream } from '../lib/upstreams.mjs';

function temp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'allforone-update-'));
}
function cleanup(...dirs) {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
}
function git(cwd, args) {
  return spawnSync(
    'git',
    ['-c', 'user.name=AllForOne Test', '-c', 'user.email=test@example.com', ...args],
    { cwd, encoding: 'utf8' }
  );
}

test('cache TTL is 24 hours', () => {
  const now = Date.parse('2026-11-19T12:00:00Z');
  assert.equal(isDue(null, now), true);
  assert.equal(isDue('invalid', now), true);
  assert.equal(isDue(new Date(now - 23 * 3600 * 1000).toISOString(), now), false);
  assert.equal(isDue(new Date(now - 25 * 3600 * 1000).toISOString(), now), true);
});

test('version comparison handles normal versions', () => {
  assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
  assert.equal(compareVersions('1.0.1', '1.0.0'), 1);
  assert.equal(compareVersions('0.9.9', '1.0.0'), -1);
});

test('update lock prevents concurrent runs and can be released', () => {
  const dir = temp();
  try {
    const release = acquireLock(dir);
    assert.equal(typeof release, 'function');
    assert.equal(acquireLock(dir), null);
    release();
    const release2 = acquireLock(dir);
    assert.equal(typeof release2, 'function');
    release2();
  } finally {
    cleanup(dir);
  }
});

test('upstream clone installs skills and syncs new commits', () => {
  const origin = temp();
  const qoderDir = temp();
  const stateDir = temp();
  try {
    assert.equal(git(origin, ['init', '-b', 'main']).status, 0);
    fs.mkdirSync(path.join(origin, 'skills', 'demo'), { recursive: true });
    fs.writeFileSync(
      path.join(origin, 'skills', 'demo', 'SKILL.md'),
      '---\nname: demo\ndescription: demo skill\n---\n\n# Demo\n'
    );
    assert.equal(git(origin, ['add', '.']).status, 0);
    assert.equal(git(origin, ['commit', '-m', 'initial']).status, 0);

    const entry = {
      id: 'demo',
      repo: origin,
      branch: 'main',
      license: 'MIT',
      profiles: ['test'],
      install: { type: 'skills', root: 'skills', all: true }
    };

    const first = installUpstream(entry, { qoderDir, stateDir, offline: false });
    assert.equal(first.error, undefined);
    assert.ok(first.installed.includes('demo'));
    assert.ok(fs.existsSync(path.join(qoderDir, 'skills', 'demo', 'SKILL.md')));
    assert.ok(
      fs.existsSync(path.join(qoderDir, 'skills', 'demo', '.allforone-managed.json'))
    );

    fs.writeFileSync(path.join(origin, 'skills', 'demo', 'new.md'), 'new content\n');
    assert.equal(git(origin, ['add', '.']).status, 0);
    assert.equal(git(origin, ['commit', '-m', 'second']).status, 0);

    const second = syncManagedUpstream(entry, { qoderDir, stateDir });
    assert.equal(second.error, undefined);
    assert.ok(second.updated);
    assert.ok(fs.existsSync(path.join(qoderDir, 'skills', 'demo', 'new.md')));
  } finally {
    cleanup(origin, qoderDir, stateDir);
  }
});

test('dirty managed clones are skipped, not discarded', () => {
  const origin = temp();
  const qoderDir = temp();
  const stateDir = temp();
  try {
    assert.equal(git(origin, ['init', '-b', 'main']).status, 0);
    fs.mkdirSync(path.join(origin, 'skills', 'demo'), { recursive: true });
    fs.writeFileSync(
      path.join(origin, 'skills', 'demo', 'SKILL.md'),
      '---\nname: demo\ndescription: demo skill\n---\n'
    );
    git(origin, ['add', '.']);
    git(origin, ['commit', '-m', 'initial']);

    const entry = {
      id: 'demo',
      repo: origin,
      branch: 'main',
      license: 'MIT',
      profiles: ['test'],
      install: { type: 'skills', root: 'skills', all: true }
    };
    installUpstream(entry, { qoderDir, stateDir, offline: false });
    const cloneFile = path.join(stateDir, 'upstreams', 'demo', 'skills', 'demo', 'SKILL.md');
    fs.appendFileSync(cloneFile, '\nlocal change\n');
    const result = syncManagedUpstream(entry, { qoderDir, stateDir });
    assert.match(result.skipped, /local changes/);
  } finally {
    cleanup(origin, qoderDir, stateDir);
  }
});

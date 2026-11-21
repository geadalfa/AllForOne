import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkReadmeSync } from '../scripts/check-readme-sync.mjs';

function fixture(readme) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'allforone-readme-'));
  fs.mkdirSync(path.join(root, 'skills', 'alpha'), { recursive: true });
  fs.mkdirSync(path.join(root, 'knowledge'), { recursive: true });
  fs.mkdirSync(path.join(root, 'tools'), { recursive: true });
  fs.mkdirSync(path.join(root, 'upstreams'), { recursive: true });
  fs.writeFileSync(path.join(root, 'skills', 'alpha', 'SKILL.md'), '---\nname: alpha\ndescription: x\n---\n');
  fs.writeFileSync(path.join(root, 'knowledge', 'INDEX.md'), '# Index\n');
  fs.writeFileSync(path.join(root, 'knowledge', 'alpha.md'), '# Alpha\n');
  fs.writeFileSync(path.join(root, 'tools', 'tool.py'), 'print(1)\n');
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'fixture', version: '9.9.9' }, null, 2)
  );
  fs.writeFileSync(
    path.join(root, 'upstreams', 'registry.json'),
    JSON.stringify(
      {
        version: 1,
        upstreams: [
          {
            id: 'alpha',
            repo: 'https://github.com/example/alpha.git',
            branch: 'main',
            license: 'MIT',
            profiles: ['engineering'],
            install: { type: 'reference' }
          }
        ]
      },
      null,
      2
    )
  );
  fs.writeFileSync(path.join(root, 'README.md'), readme);
  return root;
}

function syncedReadme() {
  return [
    'version-9.9.9-',
    'alt="Version 9.9.9"',
    'allforone-9.9.9.qoder.zip',
    'releases/download/v9.9.9/allforone-9.9.9.chatgpt.zip',
    'codex plugin marketplace add geadalfa/AllForOne',
    'codex plugin add allforone-minimal@allforone',
    'codex plugin add allforone-full@allforone',
    'skills-1-',
    'knowledge-1-',
    'upstreams-1-',
    '| Skills | 1 |',
    '| Knowledge documents | 1 |',
    '| Upstream packs | 1 |',
    'All 1 |',
    'All 1 |',
    '<b>Skills (1)</b>',
    '<b>Knowledge documents (1)</b>',
    '<b>Deterministic tools (1)</b>',
    '| Deterministic tools | 1 |',
    'Registry of 1 tracked third-party repositories',
    '1 skills, one folder per skill',
    '1 public knowledge documents and INDEX.md',
    '1 tracked third-party repositories',
    '1 deterministic helpers',
    '| `alpha` | skill |',
    '| `alpha.md` | doc |',
    '| `tool.py` | tool |',
    'https://github.com/example/alpha'
  ].join('\n');
}

test('README sync passes for a fully synced fixture', () => {
  const root = fixture(syncedReadme());
  try {
    assert.deepEqual(checkReadmeSync(root), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('README sync fails when a count or row is stale', () => {
  const stale = syncedReadme()
    .replace('skills-1-', 'skills-2-')
    .replace('| `alpha` | skill |\n', '');
  const root = fixture(stale);
  try {
    const errors = checkReadmeSync(root);
    assert.ok(errors.some((error) => error.includes('skills badge')), errors.join('\n'));
    assert.ok(errors.some((error) => error.includes('skill row alpha')), errors.join('\n'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

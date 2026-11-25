import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, VERSION } from '../lib/constants.mjs';
import {
  allSkills,
  allTools,
  resolveKnowledge,
  resolveSkills,
  resolveTools
} from '../lib/profiles.mjs';

const MARKETPLACE = path.join(ROOT, '.claude-plugin', 'marketplace.json');
const editions = {
  minimal: path.join(ROOT, 'plugins', 'claude-minimal'),
  full: path.join(ROOT, 'plugins', 'claude-full')
};

const read = (file) => fs.readFileSync(file, 'utf8');
const json = (file) => JSON.parse(read(file));

test('Claude marketplace lists two editions whose sources resolve', () => {
  const market = json(MARKETPLACE);
  assert.equal(market.name, 'allforone');
  assert.ok(market.owner?.name);
  assert.deepEqual(market.plugins.map((plugin) => plugin.name).sort(),
    ['allforone-full', 'allforone-minimal']);
  for (const entry of market.plugins) {
    assert.ok(!String(entry.source).includes('..'));
    const directory = path.resolve(ROOT, entry.source);
    assert.ok(fs.existsSync(directory), entry.source);
    const manifest = json(path.join(directory, '.claude-plugin', 'plugin.json'));
    assert.equal(manifest.name, entry.name);
    assert.equal(manifest.version, VERSION);
  }
});

test('Claude Minimal carries a quarter plus the reference library', () => {
  const skills = fs.readdirSync(path.join(editions.minimal, 'skills'));
  assert.equal(skills.length, resolveSkills({ root: ROOT, mode: 'minimal' }).length + 1);
  const library = path.join(editions.minimal, 'skills', 'allforone-library');
  const guides = resolveKnowledge({ root: ROOT, mode: 'minimal' }).filter((name) => name !== 'INDEX.md');
  assert.equal(fs.readdirSync(path.join(library, 'references')).length, guides.length);
  assert.equal(
    fs.readdirSync(path.join(editions.minimal, 'knowledge')).length,
    resolveKnowledge({ root: ROOT, mode: 'minimal' }).length
  );
  const tools = fs.readdirSync(path.join(editions.minimal, 'tools')).filter((name) => name !== 'README.md');
  assert.equal(tools.length, resolveTools({ root: ROOT, mode: 'minimal' }).length);
});

test('Claude Full packages the complete Qoder inventory', () => {
  assert.deepEqual(fs.readdirSync(path.join(editions.full, 'skills')).sort(), allSkills(ROOT));
  assert.deepEqual(
    fs.readdirSync(path.join(editions.full, 'knowledge')).sort(),
    resolveKnowledge({ root: ROOT, mode: 'full' }).sort()
  );
  assert.deepEqual(
    fs.readdirSync(path.join(editions.full, 'tools')).sort(),
    ['README.md', ...allTools(ROOT)].sort()
  );
  for (const name of allSkills(ROOT)) {
    assert.match(
      read(path.join(editions.full, 'skills', name, 'SKILL.md')),
      new RegExp(`^name: ${name}\\r?$`, 'm')
    );
  }
});

test('Claude editions use plugin-root paths and no top-level bin', () => {
  for (const directory of Object.values(editions)) {
    assert.ok(!fs.existsSync(path.join(directory, 'bin')));
    assert.ok(!fs.existsSync(path.join(directory, '.qoder-plugin')));
    const hooks = json(path.join(directory, 'hooks', 'hooks.json'));
    const command = hooks.hooks.SessionStart[0].hooks[0];
    assert.equal(command.type, 'command');
    assert.match(command.command, /\$\{CLAUDE_PLUGIN_ROOT\}\/runtime\/bin\/claude-session-start\.mjs/);
    const mcp = json(path.join(directory, '.mcp.json'));
    const server = mcp.mcpServers.allforone;
    assert.equal(server.command, 'node');
    assert.match(server.args[0], /^\$\{CLAUDE_PLUGIN_ROOT\}\//);
    assert.equal(server.env.ALLFORONE_CLIENT, 'claude');
    assert.equal(
      server.env.ALLFORONE_MODE,
      directory === editions.minimal ? 'minimal' : 'full'
    );
    for (const name of fs.readdirSync(path.join(directory, 'commands'))) {
      assert.match(read(path.join(directory, 'commands', name)), /^---\r?\ndescription:/);
    }
  }
  assert.match(
    read(path.join(editions.full, 'skills', 'allforone-knowledge', 'SKILL.md')),
    /`\$\{CLAUDE_PLUGIN_ROOT\}\/knowledge\/`/
  );
});

test('Claude runtime reports its client and refuses to self-update', () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'allforone-claude-mcp-'));
  try {
    const server = path.join(editions.minimal, 'runtime', 'bin', 'mcp-server.mjs');
    const lines = [
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
      JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'allforone_status', arguments: {} }
      }),
      JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'allforone_check_updates', arguments: {} }
      })
    ];
    const result = spawnSync(process.execPath, [server], {
      input: lines.join('\n') + '\n',
      encoding: 'utf8',
      env: {
        ...process.env,
        CLAUDE_PLUGIN_ROOT: editions.minimal,
        ALLFORONE_CLIENT: 'claude',
        ALLFORONE_MODE: 'minimal',
        ALLFORONE_HOME: stateDir
      }
    });
    assert.equal(result.status, 0, result.stderr);
    const messages = result.stdout.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
    const status = JSON.parse(messages.find((message) => message.id === 2).result.content[0].text);
    assert.equal(status.version, VERSION);
    assert.equal(status.installedVersion, VERSION);
    assert.equal(status.client, 'claude');
    assert.equal(status.mode, 'minimal');
    assert.ok(status.knowledgeIndex.startsWith(editions.minimal));
    const updates = messages.find((message) => message.id === 3).result.content[0].text;
    assert.match(updates, /claude plugin update/);
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test('Claude CLI validates both editions when it is installed', () => {
  const probe = spawnSync('claude', ['--version'], { encoding: 'utf8' });
  if (probe.error || probe.status !== 0) return;
  for (const directory of Object.values(editions)) {
    const result = spawnSync('claude', ['plugin', 'validate', directory], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${directory}\n${result.stdout}\n${result.stderr}`);
  }
  const market = spawnSync('claude', ['plugin', 'validate', ROOT], { encoding: 'utf8' });
  assert.equal(market.status, 0, `${market.stdout}\n${market.stderr}`);
});
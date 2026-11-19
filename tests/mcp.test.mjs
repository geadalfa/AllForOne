import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BIN = path.join(ROOT, 'bin', 'mcp-server.mjs');

function temp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'allforone-mcp-'));
}

test('MCP server initializes and exposes tools', () => {
  const stateDir = temp();
  try {
    const lines = [
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
      JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'allforone_status', arguments: {} }
      })
    ];
    const result = spawnSync(process.execPath, [BIN], {
      input: lines.join('\n') + '\n',
      encoding: 'utf8',
      env: { ...process.env, ALLFORONE_HOME: stateDir }
    });
    assert.equal(result.status, 0, result.stderr);
    const messages = result.stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const init = messages.find((message) => message.id === 1);
    assert.equal(init.result.serverInfo.name, 'allforone');
    const tools = messages.find((message) => message.id === 2);
    assert.ok(tools.result.tools.length >= 8);
    assert.ok(tools.result.tools.some((tool) => tool.name === 'allforone_search_knowledge'));
    const status = messages.find((message) => message.id === 3);
    assert.ok(status.result.content[0].text.includes('knowledgeIndex'));
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test('MCP memory add rejects secrets', () => {
  const stateDir = temp();
  try {
    const secret = ['gh', 'p_', 'a'.repeat(24)].join('');
    const lines = [
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
      JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'allforone_memory_add',
          arguments: { text: `token ${secret}`, type: 'note' }
        }
      })
    ];
    const result = spawnSync(process.execPath, [BIN], {
      input: lines.join('\n') + '\n',
      encoding: 'utf8',
      env: { ...process.env, ALLFORONE_HOME: stateDir }
    });
    assert.equal(result.status, 0, result.stderr);
    const messages = result.stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const call = messages.find((message) => message.id === 2);
    assert.equal(call.result.isError, true);
    assert.match(call.result.content[0].text, /Refusing to store/);
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

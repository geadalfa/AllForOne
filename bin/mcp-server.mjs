#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, VERSION, defaultQoderDir } from '../lib/constants.mjs';
import { readState } from '../lib/state.mjs';
import { defaultStateDir } from '../lib/constants.mjs';
import { addMemory, searchMemory } from '../lib/memory.mjs';
import { autoUpdate } from '../lib/updater.mjs';
import { loadProfiles } from '../lib/profiles.mjs';

const STATE_DIR = defaultStateDir();
const KNOWLEDGE_DIR = path.join(ROOT, 'knowledge');
const SKILLS_DIR = path.join(ROOT, 'skills');

const TOOLS = [
  {
    name: 'allforone_status',
    description:
      'Show the installed AllForOne version, install mode, enabled profiles, auto-update flags, and tracked upstream repositories.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'allforone_search_knowledge',
    description:
      'Search the public AllForOne knowledge base. Returns matching document names and snippets. Read only.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search terms' },
        limit: { type: 'number', description: 'Maximum results (default 5, max 10)' }
      },
      required: ['query'],
      additionalProperties: false
    }
  },
  {
    name: 'allforone_read_knowledge',
    description:
      'Read one public knowledge document by file name. Path traversal is rejected.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Document file name, for example anti_vibe_coding_engineering_protocol.md' }
      },
      required: ['file'],
      additionalProperties: false
    }
  },
  {
    name: 'allforone_list_skills',
    description:
      'List the skills shipped with AllForOne, their descriptions, and which install profile contains each skill.',
    inputSchema: {
      type: 'object',
      properties: {
        profile: { type: 'string', description: 'Optional profile filter' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'allforone_memory_search',
    description:
      'Search the local portable AllForOne memory. Memory stays on this machine and is never published.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number' }
      },
      required: ['query'],
      additionalProperties: false
    }
  },
  {
    name: 'allforone_memory_add',
    description:
      'Append a local memory entry. Refuses credentials and secrets. Memory stays on this machine and is never published.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        type: { type: 'string', description: 'user, feedback, project, reference, or note' },
        title: { type: 'string' }
      },
      required: ['text'],
      additionalProperties: false
    }
  },
  {
    name: 'allforone_check_updates',
    description:
      'Check the daily-cached self and upstream updates. Set force=true to ignore the 24-hour cache.',
    inputSchema: {
      type: 'object',
      properties: {
        force: { type: 'boolean' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'allforone_policy',
    description:
      'Return the AllForOne privacy, authorization, and auto-update policy in plain text.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  }
];

function frontmatterDescription(file) {
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return '';
  const block = match[1];
  const scalar = block.match(/^description:\s*(.+)$/m);
  if (scalar) return scalar[1].trim();
  const folded = block.match(/^description:\s*>-?\s*\r?\n((?:\s{2,}.+\r?\n?)+)/m);
  if (folded) {
    return folded[1]
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join(' ');
  }
  return '';
}

function searchKnowledge(query, limit = 5) {
  const terms = String(query || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!terms.length) return [];
  const results = [];
  for (const name of fs.readdirSync(KNOWLEDGE_DIR)) {
    if (!name.endsWith('.md')) continue;
    const file = path.join(KNOWLEDGE_DIR, name);
    const text = fs.readFileSync(file, 'utf8');
    const lower = text.toLowerCase();
    const score = terms.reduce((sum, term) => sum + (lower.split(term).length - 1), 0);
    if (score === 0) continue;
    const at = Math.max(0, lower.indexOf(terms[0]) - 200);
    results.push({
      file: name,
      score,
      snippet: text.slice(at, at + 600).replace(/\s+/g, ' ').trim()
    });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, Math.min(limit, 10));
}

function readKnowledge(file) {
  const safe = path.basename(String(file || ''));
  if (!safe.endsWith('.md')) throw new Error('Only .md files are readable');
  const full = path.join(KNOWLEDGE_DIR, safe);
  if (!full.startsWith(KNOWLEDGE_DIR + path.sep)) throw new Error('Path traversal rejected');
  if (!fs.existsSync(full)) throw new Error(`Not found: ${safe}`);
  return fs.readFileSync(full, 'utf8').slice(0, 30000);
}

function listSkills(profile) {
  const profiles = loadProfiles(ROOT);
  const memberships = new Map();
  for (const [name, skills] of Object.entries(profiles.profiles)) {
    for (const skill of skills) {
      if (!memberships.has(skill)) memberships.set(skill, []);
      memberships.get(skill).push(name);
    }
  }
  const rows = [];
  for (const name of fs.readdirSync(SKILLS_DIR).sort()) {
    const file = path.join(SKILLS_DIR, name, 'SKILL.md');
    if (!fs.existsSync(file)) continue;
    const profilesForSkill = memberships.get(name) || ['core'];
    if (profile && !profilesForSkill.includes(profile)) continue;
    rows.push({
      name,
      description: frontmatterDescription(file).slice(0, 300),
      profiles: profilesForSkill
    });
  }
  return rows;
}

function policyText() {
  return [
    'AllForOne policy',
    '',
    '1. Public repository, private runtime. The repository contains no personal memory, employer data, internal endpoints, credentials, or customer records.',
    '2. Memory is local only. It lives in the AllForOne state directory and is never published by this plugin.',
    '3. Security review is static by default. Active testing requires written authorization and a published scope.',
    '4. Auto-update is daily and cached. The first install lets the user opt out; it can be disabled later with `allforone config autoUpdate.self false` and `allforone config autoUpdate.upstreams false`.',
    '5. Upstream repositories keep their own licenses. See THIRD_PARTY_NOTICES.md and upstreams/registry.json.',
    '6. No telemetry. The only network calls are git operations against the configured repository URLs.'
  ].join('\n');
}

function statusPayload() {
  const state = readState(STATE_DIR);
  return {
    version: VERSION,
    installedVersion: state.installedVersion,
    mode: state.installMode,
    profiles: state.profiles,
    autoUpdate: state.autoUpdate,
    upstreams: Object.keys(state.upstreams || {}),
    stateDir: STATE_DIR,
    memory: path.join(STATE_DIR, 'memory', 'MEMORY.md'),
    knowledgeIndex: path.join(KNOWLEDGE_DIR, 'INDEX.md')
  };
}

async function callTool(name, args = {}) {
  switch (name) {
    case 'allforone_status':
      return JSON.stringify(statusPayload(), null, 2);
    case 'allforone_search_knowledge':
      return JSON.stringify(searchKnowledge(args.query, args.limit || 5), null, 2);
    case 'allforone_read_knowledge':
      return readKnowledge(args.file);
    case 'allforone_list_skills':
      return JSON.stringify(listSkills(args.profile), null, 2);
    case 'allforone_memory_search':
      return JSON.stringify(searchMemory(STATE_DIR, args.query, args.limit || 5), null, 2);
    case 'allforone_memory_add': {
      const result = addMemory(STATE_DIR, {
        text: args.text,
        type: args.type || 'note',
        title: args.title || null
      });
      return `Stored locally at ${result.file} at ${result.timestamp}. This entry is not published.`;
    }
    case 'allforone_check_updates': {
      const report = autoUpdate({
        root: ROOT,
        qoderDir: defaultQoderDir(),
        stateDir: STATE_DIR,
        force: Boolean(args.force),
        quiet: true
      });
      return JSON.stringify(report, null, 2);
    }
    case 'allforone_policy':
      return policyText();
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function send(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

function sendResult(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

async function handle(message) {
  const { id, method, params } = message;
  if (method === 'initialize') {
    sendResult(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'allforone', version: VERSION }
    });
    return;
  }
  if (method === 'notifications/initialized' || method === 'initialized') return;
  if (method === 'ping') {
    sendResult(id, {});
    return;
  }
  if (method === 'tools/list') {
    sendResult(id, { tools: TOOLS });
    return;
  }
  if (method === 'resources/list') {
    sendResult(id, { resources: [] });
    return;
  }
  if (method === 'prompts/list') {
    sendResult(id, { prompts: [] });
    return;
  }
  if (method === 'tools/call') {
    try {
      const text = await callTool(params?.name, params?.arguments || {});
      sendResult(id, { content: [{ type: 'text', text }] });
    } catch (error) {
      sendResult(id, {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      });
    }
    return;
  }
  if (id !== undefined) sendError(id, -32601, `Method not found: ${method}`);
}

let buffer = Buffer.alloc(0);
process.stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd !== -1 && /^Content-Length:/i.test(buffer.slice(0, headerEnd).toString())) {
      const header = buffer.slice(0, headerEnd).toString();
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        buffer = buffer.slice(headerEnd + 4);
        continue;
      }
      const length = Number(match[1]);
      const start = headerEnd + 4;
      if (buffer.length < start + length) break;
      const body = buffer.slice(start, start + length).toString();
      buffer = buffer.slice(start + length);
      try {
        handle(JSON.parse(body));
      } catch (error) {
        process.stderr.write(`AllForOne MCP parse error: ${error.message}\n`);
      }
      continue;
    }
    const newline = buffer.indexOf('\n');
    if (newline === -1) break;
    const line = buffer.slice(0, newline).toString().trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    try {
      handle(JSON.parse(line));
    } catch (error) {
      process.stderr.write(`AllForOne MCP parse error: ${error.message}\n`);
    }
  }
});

process.stdin.on('end', () => process.exit(0));

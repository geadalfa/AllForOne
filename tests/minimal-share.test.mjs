import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/constants.mjs';
import {
  allSkills,
  allTools,
  loadProfiles,
  resolveKnowledge,
  resolveSkills,
  resolveTools
} from '../lib/profiles.mjs';

const profiles = loadProfiles(ROOT);
const share = profiles.minimalShare;

function knowledgeDocuments() {
  return fs
    .readdirSync(path.join(ROOT, 'knowledge'))
    .filter((name) => name.endsWith('.md'))
    .sort();
}

test('default minimal carries a quarter of skills, knowledge, and tools', () => {
  const skills = resolveSkills({ root: ROOT, mode: 'minimal' });
  const all = allSkills(ROOT);
  assert.equal(skills.length, Math.ceil(all.length * share));

  const knowledge = resolveKnowledge({ root: ROOT, mode: 'minimal' });
  const docs = knowledgeDocuments().filter((name) => name !== 'INDEX.md');
  assert.equal(knowledge.filter((name) => name !== 'INDEX.md').length, Math.ceil(docs.length * share));
  assert.ok(knowledge.includes('INDEX.md'));

  const tools = resolveTools({ root: ROOT, mode: 'minimal' });
  const everyTool = allTools(ROOT);
  assert.equal(tools.length, Math.ceil(everyTool.length * share));
});

test('profiles extend minimal without dropping the quarter', () => {
  const base = resolveSkills({ root: ROOT, mode: 'minimal' });
  const security = resolveSkills({ root: ROOT, mode: 'minimal', profiles: ['security'] });
  assert.ok(security.includes('ghidra-headless-analysis'));
  assert.ok(security.length >= base.length);
  const automationTools = resolveTools({ root: ROOT, mode: 'minimal', profiles: ['automation'] });
  assert.ok(automationTools.includes('n8n_workflow_tool.py'));
});

test('full returns every public asset and the new upstreams are wired', () => {
  assert.deepEqual(resolveSkills({ root: ROOT, mode: 'full' }), allSkills(ROOT));
  assert.deepEqual(resolveKnowledge({ root: ROOT, mode: 'full' }), knowledgeDocuments());
  assert.deepEqual(resolveTools({ root: ROOT, mode: 'full' }), allTools(ROOT));
  for (const skill of ['ghidra-headless-analysis', 'n8n-workflow-automation', 'socratic-tutor']) {
    assert.ok(allSkills(ROOT).includes(skill), skill);
  }
  for (const doc of ['ghidra_software_reverse_engineering.md', 'n8n_workflow_automation.md', 'socratic_tutoring_method.md']) {
    assert.ok(knowledgeDocuments().includes(doc), doc);
  }
  assert.ok(allTools(ROOT).includes('n8n_workflow_tool.py'));
});

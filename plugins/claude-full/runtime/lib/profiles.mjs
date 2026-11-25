import fs from 'node:fs';
import path from 'node:path';
import { listDirs, readJson } from './fsx.mjs';

const DEFAULT_MINIMAL_SHARE = 0.25;

export function loadProfiles(root) {
  const file = path.join(root, 'profiles.json');
  const data = readJson(file, null);
  if (!data || !Array.isArray(data.core) || !data.profiles) {
    throw new Error(`Invalid profiles.json at ${file}`);
  }
  return data;
}

function minimalShare(data) {
  const value = Number(data.minimalShare);
  return Number.isFinite(value) && value > 0 && value <= 1 ? value : DEFAULT_MINIMAL_SHARE;
}

function quotaFor(total, share) {
  return Math.min(total, Math.max(1, Math.ceil(total * share)));
}

function rankedSelection({ ordered, pool, quota }) {
  const selected = [];
  const add = (name) => {
    if (pool.includes(name) && !selected.includes(name)) selected.push(name);
  };
  for (const name of ordered) add(name);
  for (const name of pool) {
    if (selected.length >= quota) break;
    add(name);
  }
  return selected;
}

export function allSkills(root) {
  return listDirs(path.join(root, 'skills')).sort();
}

export function allTools(root) {
  const dir = path.join(root, 'tools');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name !== 'README.md' && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
}

export function availableProfiles(root) {
  return Object.keys(loadProfiles(root).profiles).sort();
}

export function resolveSkills({ root, mode, profiles = [] }) {
  const data = loadProfiles(root);
  const all = allSkills(root);
  if (mode === 'full') return all;
  if (mode !== 'minimal') throw new Error(`Unknown install mode: ${mode}`);

  const unknown = profiles.filter((name) => !data.profiles[name]);
  if (unknown.length) {
    throw new Error(
      `Unknown profile(s): ${unknown.join(', ')}. Available: ${Object.keys(data.profiles).join(', ')}`
    );
  }

  const ordered = [...data.core];
  for (const profile of profiles) ordered.push(...(data.profiles[profile] || []));
  const selected = rankedSelection({
    ordered,
    pool: all,
    quota: quotaFor(all.length, minimalShare(data))
  });
  return all.filter((skill) => selected.includes(skill));
}

export function resolveKnowledge({ root, mode, profiles = [] }) {
  const data = loadProfiles(root);
  const dir = path.join(root, 'knowledge');
  const all = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort();
  if (mode === 'full') return all;
  if (mode !== 'minimal') throw new Error(`Unknown install mode: ${mode}`);

  const docs = all.filter((name) => name !== 'INDEX.md');
  const ordered = [];
  for (const profile of profiles) ordered.push(...(data.knowledge?.[profile] || []));
  const selected = rankedSelection({
    ordered: [...(data.coreKnowledge || []), ...ordered],
    pool: docs,
    quota: quotaFor(docs.length, minimalShare(data))
  });
  // Knowledge is intentionally shared: the index stays small, docs load on demand.
  return all.filter((doc) => doc === 'INDEX.md' || selected.includes(doc));
}

export function resolveTools({ root, mode, profiles = [] }) {
  const data = loadProfiles(root);
  const all = allTools(root);
  if (mode === 'full') return all;
  if (mode !== 'minimal') throw new Error(`Unknown install mode: ${mode}`);

  const ordered = [...(data.coreTools || [])];
  for (const profile of profiles) ordered.push(...(data.profileTools?.[profile] || []));
  const selected = rankedSelection({
    ordered,
    pool: all,
    quota: quotaFor(all.length, minimalShare(data))
  });
  return all.filter((tool) => selected.includes(tool));
}

export function loadUpstreamRegistry(root) {
  const file = path.join(root, 'upstreams', 'registry.json');
  const data = readJson(file, null);
  if (!data || !Array.isArray(data.upstreams)) {
    throw new Error(`Invalid upstream registry at ${file}`);
  }
  return data;
}

export function resolveUpstreams({ root, mode, profiles = [] }) {
  const registry = loadUpstreamRegistry(root);
  if (mode === 'full') return registry.upstreams;
  const selected = new Set(profiles);
  return registry.upstreams.filter((entry) =>
    (entry.profiles || []).some((profile) => selected.has(profile))
  );
}

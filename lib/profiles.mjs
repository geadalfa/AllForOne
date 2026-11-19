import fs from 'node:fs';
import path from 'node:path';
import { listDirs, readJson } from './fsx.mjs';

export function loadProfiles(root) {
  const file = path.join(root, 'profiles.json');
  const data = readJson(file, null);
  if (!data || !Array.isArray(data.core) || !data.profiles) {
    throw new Error(`Invalid profiles.json at ${file}`);
  }
  return data;
}

export function allSkills(root) {
  return listDirs(path.join(root, 'skills')).sort();
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

  const selected = new Set(data.core);
  for (const profile of profiles) {
    for (const skill of data.profiles[profile] || []) selected.add(skill);
  }

  const missing = [...selected].filter((skill) => !all.includes(skill));
  if (missing.length) {
    throw new Error(`profiles.json references missing skill(s): ${missing.join(', ')}`);
  }
  return all.filter((skill) => selected.has(skill));
}

export function resolveKnowledge({ root, mode, profiles = [] }) {
  const data = loadProfiles(root);
  const dir = path.join(root, 'knowledge');
  const all = fs.readdirSync(dir).filter((name) => name.endsWith('.md')).sort();
  // Knowledge is intentionally shared: the index stays small, docs load on demand.
  if (mode === 'full') return all;
  const coreDocs = new Set(data.coreKnowledge || []);
  for (const profile of profiles) {
    for (const doc of data.knowledge?.[profile] || []) coreDocs.add(doc);
  }
  return all.filter((doc) => coreDocs.has(doc) || coreDocs.size === 0);
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

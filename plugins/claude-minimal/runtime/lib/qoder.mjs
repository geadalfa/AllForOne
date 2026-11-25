import fs from 'node:fs';
import path from 'node:path';
import {
  backupFile,
  copyDir,
  ensureDir,
  exists,
  readJsonObject,
  writeJson,
  writeText
} from './fsx.mjs';

export function qoderPaths(qoderDir) {
  return {
    qoderDir,
    pluginsFile: path.join(qoderDir, 'plugins', 'installed_plugins_v2.json'),
    settingsFile: path.join(qoderDir, 'settings.json'),
    pluginCache: path.join(qoderDir, 'plugins', 'cache', 'local'),
    userSkills: path.join(qoderDir, 'skills'),
    memoryFile: path.join(qoderDir, 'memory', 'MEMORY.md')
  };
}

export function pluginInstallPath(qoderDir, name, version) {
  for (const part of [name, version]) {
    if (typeof part !== 'string' || !/^[\p{L}\p{N}][\p{L}\p{N}._+-]*$/u.test(part) || part.endsWith('.')) {
      throw new Error('Invalid plugin name or version in manifest');
    }
  }
  return path.join(qoderPaths(qoderDir).pluginCache, name, version);
}

export function readPluginRegistry(qoderDir) {
  const { pluginsFile } = qoderPaths(qoderDir);
  const value = readJsonObject(pluginsFile, { version: 2, plugins: {} });
  if (!value.plugins || typeof value.plugins !== 'object' || Array.isArray(value.plugins)
      || (value.version !== undefined && value.version !== 2)) {
    throw new Error(`Unsupported plugin registry in ${pluginsFile}`);
  }
  value.version = 2;
  return value;
}

export function pluginId(name) {
  return `${name}@local`;
}

function registrationEntries(registry, id) {
  if (!Object.hasOwn(registry.plugins, id)) return [];
  const entries = registry.plugins[id];
  if (!Array.isArray(entries) || entries.some((entry) => !entry || typeof entry !== 'object' || Array.isArray(entry))) {
    throw new Error(`Invalid Qoder registration for ${id}`);
  }
  return entries;
}

function userScope(entry) {
  return entry.scope === undefined || entry.scope === 'user';
}

export function isRegistered(qoderDir, name) {
  const registry = readPluginRegistry(qoderDir);
  return Boolean(registry.plugins[pluginId(name)]);
}

export function registerPlugin(qoderDir, { name, version, installPath, displayName }) {
  const { pluginsFile } = qoderPaths(qoderDir);
  const registry = readPluginRegistry(qoderDir);
  const id = pluginId(name);
  const now = new Date().toISOString();
  const entries = registrationEntries(registry, id);
  const previous = entries.find(userScope);
  backupFile(pluginsFile);
  registry.plugins[id] = [
    {
      ...previous,
      scope: 'user',
      installPath,
      version,
      installedAt: previous?.installedAt || now,
      lastUpdated: now,
      displayName
    },
    ...entries.filter((entry) => !userScope(entry))
  ];
  writeJson(pluginsFile, registry);
  return id;
}

export function unregisterPlugin(qoderDir, name) {
  const { pluginsFile } = qoderPaths(qoderDir);
  const registry = readPluginRegistry(qoderDir);
  const id = pluginId(name);
  if (!registry.plugins[id]) return false;
  readSettings(qoderDir);
  const entries = registrationEntries(registry, id);
  const remaining = entries.filter((entry) => !userScope(entry));
  if (remaining.length === entries.length) return false;
  backupFile(pluginsFile);
  if (remaining.length) registry.plugins[id] = remaining;
  else delete registry.plugins[id];
  writeJson(pluginsFile, registry);
  if (!remaining.length) setPluginEnabled(qoderDir, name, false);
  return true;
}

export function readSettings(qoderDir) {
  const { settingsFile } = qoderPaths(qoderDir);
  const value = readJsonObject(settingsFile);
  if ('enabledPlugins' in value && (!value.enabledPlugins || Array.isArray(value.enabledPlugins)
      || typeof value.enabledPlugins !== 'object')) {
    throw new Error(`Invalid enabledPlugins in ${settingsFile}`);
  }
  return value;
}

export function setPluginEnabled(qoderDir, name, enabled) {
  const { settingsFile } = qoderPaths(qoderDir);
  const settings = readSettings(qoderDir);
  if (!settings.enabledPlugins || typeof settings.enabledPlugins !== 'object') {
    settings.enabledPlugins = {};
  }
  const id = pluginId(name);
  if (settings.enabledPlugins[id] === enabled) return;
  backupFile(settingsFile);
  settings.enabledPlugins[id] = enabled;
  writeJson(settingsFile, settings);
}

export function installPluginFiles(qoderDir, { name, version, sourceRoot, skills, knowledge, tools, displayName }) {
  const target = pluginInstallPath(qoderDir, name, version);
  registrationEntries(readPluginRegistry(qoderDir), pluginId(name));
  readSettings(qoderDir);
  ensureDir(target);
  copyDir(sourceRoot, target, {
    exclude: new Set([
      '.git',
      '.github',
      '.allforone',
      'node_modules',
      'tests',
      'dist',
      'coverage',
      'outputs'
    ]),
    filter: (from) => {
      const rel = path.relative(sourceRoot, from).replace(/\\/g, '/');
      if (['scripts', 'plugins', '.agents/plugins', '.claude-plugin', 'integrations/codex', 'integrations/claude'].includes(rel)) return false;
      if (rel.startsWith('skills/')) {
        const skill = rel.split('/')[1];
        return skills ? skills.includes(skill) : true;
      }
      if (rel.startsWith('knowledge/')) {
        if (!knowledge) return true;
        const doc = rel.slice('knowledge/'.length);
        return doc === 'INDEX.md' || (!doc.includes('/') && knowledge.includes(doc));
      }
      if (rel.startsWith('tools/')) {
        if (!tools) return true;
        const tool = rel.slice('tools/'.length);
        return tool === 'README.md' || (!tool.includes('/') && tools.includes(tool));
      }
      return true;
    }
  });
  registerPlugin(qoderDir, { name, version, installPath: target, displayName });
  return target;
}

export function seedQoderMemory(qoderDir, stateDir) {
  const { memoryFile } = qoderPaths(qoderDir);
  ensureDir(path.dirname(memoryFile));
  const block = [
    '<!-- allforone:start -->',
    `- AllForOne portable memory: ${path.join(stateDir, 'memory', 'MEMORY.md')} (local only).`,
    '- Read that file when the user asks about prior decisions, preferences, or project context.',
    '<!-- allforone:end -->'
  ].join('\n');
  const current = exists(memoryFile) ? fs.readFileSync(memoryFile, 'utf8') : '';
  if (current.includes('<!-- allforone:start -->')) return memoryFile;
  const next = current.trim()
    ? `${current.trimEnd()}\n\n${block}\n`
    : `# Memory Index\n\n${block}\n`;
  writeText(memoryFile, next);
  return memoryFile;
}

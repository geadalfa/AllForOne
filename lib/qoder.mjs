import fs from 'node:fs';
import path from 'node:path';
import {
  backupFile,
  copyDir,
  ensureDir,
  exists,
  readJson,
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
  return path.join(qoderPaths(qoderDir).pluginCache, name, version);
}

export function readPluginRegistry(qoderDir) {
  const { pluginsFile } = qoderPaths(qoderDir);
  const value = readJson(pluginsFile, null);
  if (!value || typeof value !== 'object') return { version: 2, plugins: {} };
  if (!value.plugins || typeof value.plugins !== 'object') value.plugins = {};
  value.version = value.version || 2;
  return value;
}

export function pluginId(name) {
  return `${name}@local`;
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
  const previous = Array.isArray(registry.plugins[id]) ? registry.plugins[id][0] : null;
  backupFile(pluginsFile);
  registry.plugins[id] = [
    {
      scope: 'user',
      installPath,
      version,
      installedAt: previous?.installedAt || now,
      lastUpdated: now,
      displayName
    }
  ];
  writeJson(pluginsFile, registry);
  return id;
}

export function unregisterPlugin(qoderDir, name) {
  const { pluginsFile } = qoderPaths(qoderDir);
  const registry = readPluginRegistry(qoderDir);
  const id = pluginId(name);
  if (!registry.plugins[id]) return false;
  backupFile(pluginsFile);
  delete registry.plugins[id];
  writeJson(pluginsFile, registry);
  setPluginEnabled(qoderDir, name, false);
  return true;
}

export function readSettings(qoderDir) {
  const { settingsFile } = qoderPaths(qoderDir);
  const value = readJson(settingsFile, null);
  return value && typeof value === 'object' ? value : {};
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

export function installPluginFiles(qoderDir, { name, version, sourceRoot, skills, displayName }) {
  const target = pluginInstallPath(qoderDir, name, version);
  ensureDir(target);
  copyDir(sourceRoot, target, {
    exclude: new Set([
      '.git',
      '.github',
      '.allforone',
      'node_modules',
      'tests',
      'scripts',
      'dist',
      'coverage',
      'outputs'
    ]),
    filter: (from) => {
      const rel = path.relative(sourceRoot, from).replace(/\\/g, '/');
      if (rel.startsWith('skills/')) {
        const skill = rel.split('/')[1];
        return skills ? skills.includes(skill) : true;
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

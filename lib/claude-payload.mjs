import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, VERSION } from './constants.mjs';
import { ensureDir, writeJson, writeText } from './fsx.mjs';
import { resolveKnowledge, resolveSkills, resolveTools } from './profiles.mjs';

const PLUGIN = '${CLAUDE_PLUGIN_ROOT}';
const ADAPTATIONS = 'integrations/claude/';
const RUNTIME_LIBS = [
  'codex-payload.mjs',
  'codex.mjs',
  'constants.mjs',
  'fsx.mjs',
  'hook.mjs',
  'installer.mjs',
  'memory.mjs',
  'profiles.mjs',
  'qoder.mjs',
  'state.mjs',
  'updater.mjs',
  'upstreams.mjs'
];

export function claudeInventory(mode) {
  return {
    skills: resolveSkills({ root: ROOT, mode }),
    knowledge: resolveKnowledge({ root: ROOT, mode }),
    tools: resolveTools({ root: ROOT, mode })
  };
}

export function adaptSkillForClaude(text, name) {
  return text
    .replaceAll(`skills/${name}/scripts/`, `${PLUGIN}/skills/${name}/scripts/`)
    .replace(
      /^([ \t]*(?:node|bash|python3?|python)[ \t]+)scripts\//gm,
      `$1${PLUGIN}/skills/${name}/scripts/`
    )
    .replaceAll('<skill-dir>', () => `${PLUGIN}/skills/${name}`)
    .replaceAll('<plugin-root>', () => PLUGIN);
}

function trackedSources(root) {
  return new Set(
    execFileSync('git', [
      'ls-files', '-z', '--', 'skills', 'knowledge', 'tools', 'licenses', 'memory', ADAPTATIONS
    ], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean)
  );
}

function assertTracked(tracked, file) {
  if (!tracked.has(file)) {
    throw new Error(`Stage the Claude source before building: ${file}`);
  }
}

export function writeClaudeEdition(destination, options) {
  const root = fs.realpathSync(ROOT);
  const { license } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const {
    mode,
    name,
    displayName,
    description,
    skills = resolveSkills({ root, mode }),
    knowledge = resolveKnowledge({ root, mode }),
    tools = resolveTools({ root, mode }),
    tracked = trackedSources(root)
  } = options;
  if (!['minimal', 'full'].includes(mode)) throw new Error(`Unknown Claude edition mode: ${mode}`);

  const skillNames = new Set(skills);
  const toolNames = new Set(tools);
  const files = [];
  for (const file of tracked) {
    const [group, entry] = file.split('/');
    if (group === 'licenses') files.push(file);
    else if (group === 'memory') files.push(file);
    else if (group === 'tools' && (entry === 'README.md' || toolNames.has(entry))) files.push(file);
    else if (group === 'skills' && skillNames.has(entry) && !file.includes('/scripts/tests/')) {
      files.push(file);
    } else if (group === 'knowledge' && knowledge.includes(entry)) files.push(file);
  }
  for (const file of [
    ...skills.map((skill) => `skills/${skill}/SKILL.md`),
    ...knowledge.map((doc) => `knowledge/${doc}`)
  ]) {
    assertTracked(tracked, file);
    if (!files.includes(file)) files.push(file);
  }

  for (const file of files) {
    const target = path.join(destination, file);
    ensureDir(path.dirname(target));
    const text = fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n');
    const skill = /^skills\/([^/]+)\/SKILL\.md$/.exec(file)?.[1];
    writeText(target, skill ? adaptSkillForClaude(text, skill) : text);
  }

  if (mode === 'minimal') {
    const guides = knowledge.filter((doc) => doc !== 'INDEX.md');
    const library = ensureDir(path.join(destination, 'skills', 'allforone-library'));
    const refs = ensureDir(path.join(library, 'references'));
    for (const doc of guides) {
      fs.copyFileSync(path.join(root, 'knowledge', doc), path.join(refs, doc));
    }
    writeText(path.join(library, 'SKILL.md'), [
      '---',
      'name: allforone-library',
      'description: Consult the bundled AllForOne references for project instructions, engineering workflows, technical writing, and software QA.',
      '---', '', '# AllForOne reference library', '',
      'Read the relevant reference beside this skill and check its assumptions against the current project.', '',
      ...guides.map((doc) => `- [${doc}](references/${doc})`), ''
    ].join('\n'));
  }

  for (const file of ['LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md']) {
    fs.copyFileSync(path.join(root, file), path.join(destination, file));
  }

  const commands = [...tracked]
    .filter((file) => file.startsWith(`${ADAPTATIONS}commands/`) && file.endsWith('.md'))
    .sort();
  if (!commands.length) throw new Error('Stage the Claude command files before building.');
  for (const file of commands) {
    const target = path.join(destination, 'commands', path.basename(file));
    ensureDir(path.dirname(target));
    writeText(target, fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n'));
  }

  const runtime = path.join(destination, 'runtime');
  ensureDir(path.join(runtime, 'bin'));
  for (const [source, target] of [
    ['bin/mcp-server.mjs', 'runtime/bin/mcp-server.mjs'],
    [`${ADAPTATIONS}session-start.mjs`, 'runtime/bin/claude-session-start.mjs']
  ]) {
    writeText(
      path.join(destination, target),
      fs.readFileSync(path.join(root, source), 'utf8').replaceAll('\r\n', '\n')
    );
  }
  for (const file of RUNTIME_LIBS) {
    writeText(
      path.join(runtime, 'lib', file),
      fs.readFileSync(path.join(root, 'lib', file), 'utf8').replaceAll('\r\n', '\n')
    );
  }
  writeJson(path.join(runtime, 'package.json'), {
    name: 'allforone-runtime',
    version: VERSION,
    private: true,
    type: 'module',
    license
  });

  writeText(path.join(destination, 'hooks', 'hooks.json'), `${JSON.stringify({
    hooks: {
      SessionStart: [
        {
          matcher: 'startup',
          hooks: [
            {
              type: 'command',
              command: `node "${PLUGIN}/runtime/bin/claude-session-start.mjs"`,
              timeout: 20
            }
          ]
        }
      ]
    }
  }, null, 2)}\n`);

  writeText(path.join(destination, '.mcp.json'), `${JSON.stringify({
    mcpServers: {
      allforone: {
        command: 'node',
        args: [`${PLUGIN}/runtime/bin/mcp-server.mjs`],
        env: {
          ALLFORONE_CLIENT: 'claude',
          ALLFORONE_MODE: mode
        }
      }
    }
  }, null, 2)}\n`);

  writeJson(path.join(destination, '.claude-plugin', 'plugin.json'), {
    name,
    displayName,
    version: VERSION,
    description,
    author: { name: 'AllForOne Contributors' },
    homepage: 'https://github.com/geadalfa/AllForOne',
    repository: 'https://github.com/geadalfa/AllForOne',
    license,
    keywords: ['agent-skills', 'claude-code', 'knowledge-base', 'mcp', 'engineering', 'security']
  });

  return {
    skills: skills.length + (mode === 'minimal' ? 1 : 0),
    references: knowledge.filter((doc) => doc !== 'INDEX.md').length,
    tools: tools.length
  };
}
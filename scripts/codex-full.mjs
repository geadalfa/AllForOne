import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/constants.mjs';
import { resolveSkillPaths } from '../lib/codex-payload.mjs';
import { ensureDir, writeText } from '../lib/fsx.mjs';
import { resolveKnowledge, resolveSkills, resolveTools } from '../lib/profiles.mjs';

const adaptations = 'integrations/codex/';
const runtimeFiles = ['NOTICE', 'THIRD_PARTY_NOTICES.md', 'lib/fsx.mjs', 'lib/memory.mjs'];

function trackedSources(root) {
  return new Set(execFileSync('git', [
    'ls-files', '-z', '--', 'skills', 'knowledge', 'tools', 'licenses', adaptations
  ], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean));
}

function readSource(root, name) {
  const file = path.join(root, name);
  if (fs.realpathSync(file) !== file || !fs.lstatSync(file).isFile()) {
    throw new Error(`Expected a regular Codex source file: ${name}`);
  }
  return fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
}

export function writeFullCodexSkills(destination, options = {}) {
  const root = fs.realpathSync(ROOT);
  const tracked = trackedSources(root);
  const skills = options.skills || resolveSkills({ root, mode: 'full' });
  const knowledge = options.knowledge || resolveKnowledge({ root, mode: 'full' });
  const tools = options.tools || resolveTools({ root, mode: 'full' });
  const skillNames = new Set(skills);
  const toolNames = new Set(tools);
  const files = new Set([...runtimeFiles, 'bin/memory.mjs']);
  for (const file of tracked) {
    const [group, name] = file.split('/');
    if (group === 'licenses' ||
        (group === 'tools' && (name === 'README.md' || toolNames.has(name))) ||
        (group === 'skills' && skillNames.has(name) && !file.startsWith(`skills/${name}/scripts/tests/`))) {
      files.add(file);
    }
  }
  const required = [
    ...skills.map(name => `skills/${name}/SKILL.md`),
    ...knowledge.map(name => `knowledge/${name}`)
  ];
  for (const file of required) {
    if (!tracked.has(file)) throw new Error(`Stage the Codex source before building: ${file}`);
    files.add(file);
  }
  for (const file of tracked) {
    if (!file.startsWith(adaptations)) continue;
    const base = file.slice(adaptations.length);
    const [group, name] = base.split('/');
    const inEdition =
      files.has(base) ||
      (group === 'tools' && (name === 'README.md' || toolNames.has(name))) ||
      (group === 'skills' && skillNames.has(name)) ||
      (group === 'knowledge' && knowledge.includes(name));
    if (inEdition && !files.has(base)) {
      throw new Error(`Codex adaptation has no packaged destination: ${file}`);
    }
  }

  for (const file of files) {
    const adapted = adaptations + file;
    const source = tracked.has(adapted) ? adapted : file;
    const content = readSource(root, source);
    const skill = /^skills\/([^/]+)\/SKILL\.md$/.exec(file)?.[1];
    writeText(path.join(destination, file), skill ? resolveSkillPaths(content, skill) : content);
  }

  if (options.includeLibrary) {
    const guides = knowledge.filter((name) => name !== 'INDEX.md');
    const library = ensureDir(path.join(destination, 'skills', 'allforone-library'));
    const refs = ensureDir(path.join(library, 'references'));
    for (const name of guides) {
      fs.copyFileSync(path.join(root, 'knowledge', name), path.join(refs, name));
    }
    writeText(path.join(library, 'SKILL.md'), [
      '---',
      'name: allforone-library',
      'description: Consult the bundled AllForOne references for project instructions, engineering workflows, technical writing, and software QA.',
      '---', '', '# AllForOne reference library', '',
      'Read the relevant reference beside this skill and check its assumptions against the current project.', '',
      ...guides.map(name => `- [${name}](references/${name})`), ''
    ].join('\n'));
  }

  return {
    skills: skills.length + (options.includeLibrary ? 1 : 0),
    references: knowledge.filter((name) => name !== 'INDEX.md').length,
    tools: tools.length
  };
}

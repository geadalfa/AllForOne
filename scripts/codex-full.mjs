import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/constants.mjs';
import { writeText } from '../lib/fsx.mjs';
import { resolveKnowledge, resolveSkills } from '../lib/profiles.mjs';

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

function resolveSkillPaths(text, name) {
  const content = text
    .replaceAll(`skills/${name}/scripts/`, '<skill-dir>/scripts/')
    .replace(/^([ \t]*(?:node|bash|python3?)[ \t]+)scripts\//gm, '$1<skill-dir>/scripts/')
    .replace(
      /^([ \t]*(?:node|bash|python3?)[ \t]+)(<(?:skill-dir|plugin-root)>\/[\w./-]+)(?=[ \t]|$)/gm,
      '$1"$2"'
    );
  if (!/<(?:skill-dir|plugin-root)>/.test(content)) return content;
  return content.replace(
    /^(---\n[\s\S]*?\n---\n\n[^\n]+\n)/,
    '$1\nResolve `<skill-dir>` from the directory of this installed SKILL.md and `<plugin-root>` from its grandparent. Replace placeholders with absolute paths when running commands from a different directory.\n'
  );
}

export function writeFullCodexSkills(destination) {
  const root = fs.realpathSync(ROOT);
  const tracked = trackedSources(root);
  const skills = resolveSkills({ root, mode: 'full' });
  const knowledge = resolveKnowledge({ root, mode: 'full' });
  const skillNames = new Set(skills);
  const files = new Set([...runtimeFiles, 'bin/memory.mjs']);
  for (const file of tracked) {
    const [group, name] = file.split('/');
    if (group === 'licenses' || group === 'tools' ||
        (group === 'skills' && skillNames.has(name) && !file.startsWith(`skills/${name}/scripts/tests/`))) {
      files.add(file);
    }
  }
  for (const file of [...skills.map(name => `skills/${name}/SKILL.md`), ...knowledge.map(name => `knowledge/${name}`)]) {
    if (!tracked.has(file)) throw new Error(`Stage the Codex source before building: ${file}`);
    files.add(file);
  }
  for (const file of tracked) {
    if (file.startsWith(adaptations) && !files.has(file.slice(adaptations.length))) {
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
  return { skills: skills.length, references: knowledge.filter(file => file !== 'INDEX.md').length };
}

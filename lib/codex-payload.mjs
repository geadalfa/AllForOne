import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './constants.mjs';
import { ensureDir, writeText } from './fsx.mjs';
import { resolveKnowledge, resolveSkills, resolveTools } from './profiles.mjs';

const SKIP_DIRS = new Set(['.git', 'node_modules', '__pycache__']);
const SKIP_TESTS = new Set(['tests']);

export function minimalCodexInventory() {
  return {
    skills: resolveSkills({ root: ROOT, mode: 'minimal' }),
    knowledge: resolveKnowledge({ root: ROOT, mode: 'minimal' }),
    tools: resolveTools({ root: ROOT, mode: 'minimal' })
  };
}

export function resolveSkillPaths(text, name) {
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

function copyTree(source, target, options = {}) {
  ensureDir(target);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      if (options.skipTests && SKIP_TESTS.has(entry.name)) continue;
      copyTree(from, to, options);
    } else if (entry.isFile()) {
      fs.copyFileSync(from, to);
    }
  }
}

export function writeCodexSkills(destination, skills, references, tools = []) {
  for (const name of skills) {
    const source = path.join(ROOT, 'skills', name);
    const target = path.join(destination, 'skills', name);
    copyTree(source, target, { skipTests: true });
    const instructions = path.join(target, 'SKILL.md');
    if (fs.existsSync(instructions)) {
      writeText(instructions, resolveSkillPaths(fs.readFileSync(instructions, 'utf8'), name));
    }
  }

  const library = path.join(destination, 'skills', 'allforone-library');
  const refs = ensureDir(path.join(library, 'references'));
  const guides = references.filter((name) => name !== 'INDEX.md');
  for (const name of guides) {
    fs.copyFileSync(path.join(ROOT, 'knowledge', name), path.join(refs, name));
  }
  writeText(path.join(library, 'SKILL.md'), [
    '---',
    'name: allforone-library',
    'description: Consult the bundled AllForOne references for project instructions, engineering workflows, technical writing, and software QA.',
    '---', '', '# AllForOne reference library', '',
    'Read the relevant reference beside this skill and check its assumptions against the current project.', '',
    ...guides.map(name => `- [${name}](references/${name})`), ''
  ].join('\n'));

  for (const name of tools) {
    const source = path.join(ROOT, 'tools', name);
    if (!fs.existsSync(source)) continue;
    const target = path.join(destination, 'tools', name);
    ensureDir(path.dirname(target));
    fs.copyFileSync(source, target);
  }
  return { skills: skills.length + 1, references: guides.length, tools: tools.length };
}

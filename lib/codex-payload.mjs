import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './constants.mjs';
import { ensureDir, writeText } from './fsx.mjs';

export const CORE_CODEX_SKILLS = [
  'data-quality-checker',
  'exact-output-protocol',
  'human-technical-writing',
  'software-qa-and-ui-testing'
];

export const CORE_CODEX_REFERENCES = [
  'agents_md_open_standard_specification.md',
  'disciplined_software_engineering_framework.md',
  'human_writing_and_technical_prose.md',
  'software_qa_and_testing_discipline.md'
];

export function writeCodexSkills(destination, skills, references) {
  for (const name of skills) {
    const skillDir = ensureDir(path.join(destination, 'skills', name));
    const source = path.join(ROOT, 'skills', name);
    if (name !== 'data-quality-checker') {
      fs.copyFileSync(path.join(source, 'SKILL.md'), path.join(skillDir, 'SKILL.md'));
      continue;
    }
    for (const file of ['scripts/check_data_quality.py', 'references/common_data_errors.md',
      'references/instrument_notation_standard.md', 'requirements.txt']) {
      ensureDir(path.join(skillDir, path.dirname(file)));
      fs.copyFileSync(path.join(source, file), path.join(skillDir, file));
    }
    const instructions = fs.readFileSync(path.join(source, 'SKILL.md'), 'utf8')
      .replace('### Step 2: Execute Validation Script', '### Step 2: Execute Validation Script\n\nReplace `<skill-dir>` in the commands below with the absolute directory containing this SKILL.md.')
      .replaceAll('python3 skills/data-quality-checker/scripts/check_data_quality.py', 'python3 "<skill-dir>/scripts/check_data_quality.py"');
    writeText(path.join(skillDir, 'SKILL.md'), instructions);
  }

  const library = path.join(destination, 'skills', 'allforone-library');
  const refs = ensureDir(path.join(library, 'references'));
  for (const name of references) {
    fs.copyFileSync(path.join(ROOT, 'knowledge', name), path.join(refs, name));
  }
  writeText(path.join(library, 'SKILL.md'), [
    '---',
    'name: allforone-library',
    'description: Consult the bundled AllForOne references for project instructions, engineering workflows, technical writing, and software QA.',
    '---', '', '# AllForOne reference library', '',
    'Read the relevant reference beside this skill and check its assumptions against the current project.', '',
    ...references.map(name => `- [${name}](references/${name})`), ''
  ].join('\n'));
}

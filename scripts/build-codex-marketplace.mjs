import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REPO, ROOT, VERSION } from '../lib/constants.mjs';
import { CORE_CODEX_REFERENCES, CORE_CODEX_SKILLS, writeCodexSkills } from '../lib/codex-payload.mjs';
import { walk, writeJson, writeText } from '../lib/fsx.mjs';

const pluginDirectory = 'integrations/codex';
const catalogFile = '.agents/plugins/marketplace.json';
const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const { license } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const editions = [
  {
    name: 'allforone-minimal',
    displayName: 'AllForOne Minimal',
    description: 'Core workflows for engineering, technical writing, QA, and data quality.',
    skills: CORE_CODEX_SKILLS,
    references: CORE_CODEX_REFERENCES
  },
  {
    name: 'allforone-full',
    displayName: 'AllForOne Full',
    description: 'The core workflows plus product discovery, UI design, document conversion, specs, and safe refactoring.',
    skills: [
      ...CORE_CODEX_SKILLS,
      'anti-slop-ui-design',
      'app-opportunity-lab',
      'document-ocr-and-conversion',
      'spec-driven-development',
      'zero-regression-refactoring'
    ],
    references: [
      ...CORE_CODEX_REFERENCES,
      'anti_vibe_coding_engineering_protocol.md',
      'app_opportunity_lab_playbook.md',
      'high_precision_ocr_and_document_conversion.md',
      'humanizer_id_indonesian_academic_editing.md',
      'microsoft_reality_check_smart_tool_analysis.md',
      'ui_ux_anti_slop_design_engineering.md'
    ]
  }
];

const args = process.argv.slice(2);
if (args.length !== 1 || !['--check', '--write'].includes(args[0])) {
  throw new Error('Usage: node scripts/build-codex-marketplace.mjs --check|--write');
}
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'allforone-codex-marketplace-'));
try {
  for (const edition of editions) {
    const directory = path.join(stage, pluginDirectory, edition.name);
    writeCodexSkills(directory, edition.skills, edition.references);
    fs.copyFileSync(path.join(ROOT, 'LICENSE'), path.join(directory, 'LICENSE'));
    writeJson(path.join(directory, '.codex-plugin', 'plugin.json'), {
      name: edition.name,
      version: VERSION,
      description: edition.description,
      author: { name: 'AllForOne Contributors' },
      repository: REPO,
      license,
      skills: './skills/',
      interface: {
        displayName: edition.displayName,
        shortDescription: edition.description,
        developerName: 'AllForOne Contributors',
        category: 'Productivity',
        defaultPrompt: ['Use AllForOne to review a proposed software change and suggest verification steps.']
      }
    });
  }

  writeJson(path.join(stage, catalogFile), {
    name: 'allforone',
    interface: { displayName: 'AllForOne' },
    plugins: editions.map(edition => ({
      name: edition.name,
      source: { source: 'local', path: `./${pluginDirectory}/${edition.name}` },
      policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
      category: 'Productivity'
    }))
  });

  const generated = new Set(walk(stage).map(file => path.relative(stage, file)));
  const errors = [];
  for (const relative of generated) {
    const expected = fs.readFileSync(path.join(stage, relative), 'utf8').replaceAll('\r\n', '\n');
    const target = path.join(ROOT, relative);
    if (args[0] === '--write') writeText(target, expected);
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replaceAll('\r\n', '\n') !== expected) {
      errors.push(`Missing or outdated file: ${relative}`);
    }
  }
  for (const file of walk(path.join(ROOT, pluginDirectory))) {
    const relative = path.relative(ROOT, file);
    if (!generated.has(relative)) errors.push(`Unexpected file: ${relative}`);
  }
  for (const { displayName, skills, references } of editions) {
    if (!readme.includes(`| **${displayName}** | ${skills.length + 1} | ${references.length} |`)) {
      errors.push(`Update the README inventory for ${displayName}.`);
    }
  }
  if (errors.length) throw new Error(errors.join('\n') + '\nRegenerate with npm run build:codex.');
  console.log('Codex marketplace matches the generated Minimal and Full packages.');
} finally {
  fs.rmSync(stage, { recursive: true, force: true });
}

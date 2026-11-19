import fs from 'node:fs';
import path from 'node:path';
import { copyDir, ensureDir, exists, writeJson } from './fsx.mjs';

export function ensureMemoryScaffold(stateDir, sourceRoot) {
  const memoryDir = path.join(stateDir, 'memory');
  ensureDir(memoryDir);
  const template = path.join(sourceRoot, 'memory');
  if (!exists(template)) return memoryDir;
  for (const name of fs.readdirSync(template)) {
    const src = path.join(template, name);
    const dest = path.join(memoryDir, name === 'MEMORY.template.md' ? 'MEMORY.md' : name);
    if (exists(dest)) continue;
    const stat = fs.statSync(src);
    if (stat.isDirectory()) copyDir(src, dest, { exclude: new Set() });
    else fs.copyFileSync(src, dest);
  }
  return memoryDir;
}

const SECRET_PATTERNS = [
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /password\s*[:=]\s*\S{6,}/i
];

export function memoryFiles(stateDir) {
  const dir = path.join(stateDir, 'memory');
  if (!exists(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(md|txt)$/i.test(entry.name))
    .map((entry) => path.join(dir, entry.name));
}

export function searchMemory(stateDir, query, limit = 5) {
  const terms = String(query || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const results = [];
  for (const file of memoryFiles(stateDir)) {
    const text = fs.readFileSync(file, 'utf8');
    const lower = text.toLowerCase();
    const score = terms.reduce((sum, term) => sum + (lower.split(term).length - 1), 0);
    if (score > 0) {
      const first = Math.max(0, lower.indexOf(terms[0]) - 180);
      results.push({
        file: path.basename(file),
        score,
        snippet: text.slice(first, first + 500).replace(/\s+/g, ' ').trim()
      });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function addMemory(stateDir, { text, type = 'note', title = null }) {
  const content = String(text || '').trim();
  if (!content) throw new Error('Memory text is empty');
  if (content.length > 8000) throw new Error('Memory entry is too long (max 8000 characters)');
  if (SECRET_PATTERNS.some((pattern) => pattern.test(content))) {
    throw new Error('Refusing to store a credential or secret in memory');
  }
  const dir = path.join(stateDir, 'memory');
  ensureDir(dir);
  const file = path.join(dir, 'notes.md');
  if (!exists(file)) {
    fs.writeFileSync(
      file,
      '# AllForOne Memory Notes\n\nLocal only. Never synced to the public repository.\n'
    );
  }
  const stamp = new Date().toISOString();
  const heading = title ? `\n## ${title}\n` : `\n## ${stamp}\n`;
  fs.appendFileSync(
    file,
    `${heading}- type: ${type}\n- ${content.replace(/\r?\n/g, '\n  ')}\n`
  );
  return { file, timestamp: stamp };
}

export function writeMemoryIndex(stateDir) {
  const dir = path.join(stateDir, 'memory');
  ensureDir(dir);
  const files = memoryFiles(stateDir).map((file) => path.basename(file));
  writeJson(path.join(dir, 'index.json'), {
    files,
    updatedAt: new Date().toISOString(),
    note: 'Local portable memory. Never publish this directory.'
  });
}

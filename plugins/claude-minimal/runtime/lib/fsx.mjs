import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function exists(target) {
  try {
    fs.accessSync(target);
    return true;
  } catch {
    return false;
  }
}

export function readText(file, fallback = null) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return fallback;
  }
}

export function readJson(file, fallback = null) {
  const text = readText(file);
  if (text === null) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

// Shared user configuration may be created on first use, but never repaired by
// discarding a document that could not be read.
export function readJsonObject(file, whenMissing = {}) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return whenMissing;
    throw error;
  }
  let value;
  try {
    value = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error(`Invalid JSON in ${file}`);
  }
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    throw new Error(`Expected a JSON object in ${file}`);
  }
  return value;
}

export function writeText(file, text) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.tmp-${crypto.randomUUID()}`;
  const existing = fs.statSync(file, { throwIfNoEntry: false });
  const fd = fs.openSync(tmp, 'wx', existing ? existing.mode & 0o777 : 0o600);
  try {
    try {
      fs.writeFileSync(fd, text);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmp, file);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
  return file;
}

export function writeJson(file, value) {
  return writeText(file, JSON.stringify(value, null, 2) + '\n');
}

export function backupFile(file) {
  if (!exists(file)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = `${file}.allforone-backup-${stamp}`;
  fs.copyFileSync(file, backup);
  return backup;
}

export function walk(dir, out = []) {
  if (!exists(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

export function listDirs(dir) {
  if (!exists(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

export function remove(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

const DEFAULT_EXCLUDES = new Set([
  '.git',
  '.github',
  '.allforone',
  'node_modules',
  'tests',
  'scripts',
  'dist',
  'coverage',
  'outputs'
]);

export function copyDir(src, dest, options = {}) {
  const exclude = options.exclude || DEFAULT_EXCLUDES;
  const filter = options.filter;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (exclude.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (filter && !filter(from, entry)) continue;
    if (entry.isDirectory()) copyDir(from, to, options);
    else if (entry.isFile()) {
      ensureDir(path.dirname(to));
      fs.copyFileSync(from, to);
    }
  }
}

export function sha256(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

export function isTextFile(file) {
  return /\.(md|mdx|json|jsonl|ya?ml|txt|py|sh|ps1|mjs|cjs|js|ts|css|html|xml|toml|ini|cfg)$/i.test(
    file
  );
}

export function walkTextFiles(dir) {
  return walk(dir).filter(isTextFile);
}

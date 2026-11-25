import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PLUGIN_NAME = 'allforone';
export const DISPLAY_NAME = 'AllForOne';
export const REPO = 'https://github.com/geadalfa/AllForOne';
export const REPO_SLUG = 'geadalfa/AllForOne';
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const LOCK_STALE_MS = 10 * 60 * 1000;

export const VERSION = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')
).version;

export function defaultQoderDir() {
  if (process.env.QODER_CONFIG_DIR) return path.resolve(process.env.QODER_CONFIG_DIR);
  if (process.env.QODER_CLI_HOME) {
    const name = process.env.QODER_CONFIG_DIR_NAME || '.qoder';
    return path.resolve(process.env.QODER_CLI_HOME, name);
  }
  return path.join(os.homedir(), '.qoder');
}

export function defaultStateDir() {
  return process.env.ALLFORONE_HOME
    ? path.resolve(process.env.ALLFORONE_HOME)
    : path.join(os.homedir(), '.allforone');
}

export function resolveOptions(opts = {}) {
  const sourceRoot = path.resolve(opts.sourceRoot || opts.root || ROOT);
  return {
    ...opts,
    root: sourceRoot,
    sourceRoot,
    qoderDir: path.resolve(opts.qoderDir || defaultQoderDir()),
    stateDir: path.resolve(opts.stateDir || defaultStateDir())
  };
}

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { addMemory, searchMemory } from '../lib/memory.mjs';

const [command, query, ...extra] = process.argv.slice(2);
const stateDir = path.join(path.resolve(process.env.CODEX_HOME || path.join(os.homedir(), '.codex')), 'allforone');

try {
  let result;
  if (command === 'search' && query?.trim() && !extra.length) {
    result = searchMemory(stateDir, query);
  } else if (command === 'add' && query === undefined) {
    const { text, title, type } = JSON.parse(fs.readFileSync(0, 'utf8'));
    if (typeof text !== 'string' || [title, type].some(value => value !== undefined && typeof value !== 'string')) {
      throw new Error('Pass a JSON object with a text string and optional title and type strings.');
    }
    result = addMemory(stateDir, { text, title, type });
  } else if (command === 'location' && query === undefined) {
    result = path.join(stateDir, 'memory');
  } else {
    throw new Error('Use memory.mjs search "keywords", memory.mjs add with JSON on stdin, or memory.mjs location.');
  }
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(`AllForOne memory: ${error instanceof SyntaxError ? 'Invalid JSON input.' : error.message}`);
  process.exitCode = 1;
}

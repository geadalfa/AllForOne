import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { defaultQoderDir, ROOT, VERSION } from './constants.mjs';
import { ensureDir, writeJson } from './fsx.mjs';
import { minimalCodexInventory, writeCodexSkills } from './codex-payload.mjs';

const MARKET = 'allforone-local';
const PLUGIN = `allforone@${MARKET}`;
const OWNER = 'AllForOne local marketplace v1\n';

function fingerprint(dir) {
  const hash = createHash('sha256');
  function visit(relative) {
    const root = path.join(dir, relative);
    if (!fs.lstatSync(root).isDirectory()) throw new Error(`Expected a plugin directory at ${root}`);
    for (const name of fs.readdirSync(root).sort()) {
      const rel = path.join(relative, name);
      const file = path.join(dir, rel);
      const stat = fs.lstatSync(file);
      hash.update(JSON.stringify([rel, stat.isDirectory() ? 'dir' : stat.size]));
      if (stat.isDirectory()) visit(rel);
      else if (stat.isFile()) hash.update(fs.readFileSync(file));
      else throw new Error(`Unexpected linked or special file at ${file}`);
    }
  }
  visit('');
  return hash.digest('hex');
}

function ensureLocalDirectory(dir) {
  ensureDir(dir);
  if (!fs.lstatSync(dir).isDirectory()) throw new Error(`Expected a local directory at ${dir}`);
  return dir;
}

function realLocation(file) {
  if (fs.lstatSync(file, { throwIfNoEntry: false })) return fs.realpathSync(file);
  return path.join(realLocation(path.dirname(file)), path.basename(file));
}

function assertOwned(market) {
  const marker = path.join(market, '.allforone-owner');
  if (!fs.lstatSync(market).isDirectory() || !fs.lstatSync(marker, { throwIfNoEntry: false })?.isFile() ||
      fs.readFileSync(marker, 'utf8') !== OWNER) {
    throw new Error(`Existing marketplace directory is not managed by AllForOne: ${market}`);
  }
}

function createOwnedMarketplace(market) {
  if (!fs.lstatSync(market, { throwIfNoEntry: false })) {
    const stage = fs.mkdtempSync(path.join(ensureDir(path.dirname(market)), '.allforone-init-'));
    try {
      fs.writeFileSync(path.join(stage, '.allforone-owner'), OWNER);
      fs.renameSync(stage, market);
    } catch (error) {
      if (!fs.existsSync(market)) throw error;
    } finally {
      fs.rmSync(stage, { recursive: true, force: true });
    }
  }
  assertOwned(market);
}

function catalog(version) {
  return {
    name: MARKET, interface: { displayName: 'AllForOne' },
    plugins: [{
      name: 'allforone', source: { source: 'local', path: `./packages/${version}` },
      policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' }, category: 'Productivity'
    }]
  };
}

// A native local marketplace must outlive npx's temporary package checkout.
// Keep each payload immutable and change the catalog only after it is complete.
export function prepareCodexMarketplace(codexHome) {
  const market = path.join(codexHome, MARKET);
  createOwnedMarketplace(market);
  const registry = ensureLocalDirectory(path.join(ensureLocalDirectory(path.join(market, '.agents')), 'plugins'));
  const manifest = path.join(registry, 'marketplace.json');
  const existing = fs.lstatSync(manifest, { throwIfNoEntry: false });
  if (existing) {
    if (!existing.isFile()) throw new Error(`Expected a regular marketplace manifest at ${manifest}`);
    const current = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    const version = /^\.\/packages\/([\w.-]+)$/.exec(current?.plugins?.[0]?.source?.path)?.[1];
    if (!version || !isDeepStrictEqual(current, catalog(version))) {
      throw new Error(`Marketplace was modified outside AllForOne: ${manifest}`);
    }
  }
  const payload = path.join(market, 'packages', VERSION);
  ensureLocalDirectory(path.dirname(payload));
  const staging = fs.mkdtempSync(path.join(market, '.stage-'));
  const inventory = minimalCodexInventory();
  let counts;
  try {
    counts = writeCodexSkills(staging, inventory.skills, inventory.knowledge, inventory.tools);
    for (const name of ['LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md', 'licenses']) {
      fs.cpSync(path.join(ROOT, name), path.join(staging, name), { recursive: true });
    }
    writeJson(path.join(staging, '.codex-plugin', 'plugin.json'), {
      name: 'allforone', version: VERSION,
      description: 'A quarter of AllForOne: engineering, writing, QA, and security research workflows.',
      skills: './skills/', interface: { displayName: 'AllForOne' }
    });
    // Concurrent or repeated installs of the same release share the finished directory.
    try {
      fs.renameSync(staging, payload);
    } catch (error) {
      if (!fs.existsSync(payload)) throw error;
      if (fingerprint(staging) !== fingerprint(payload)) {
        throw new Error(`Existing AllForOne payload differs from this release: ${payload}`);
      }
    }
    writeJson(manifest, catalog(VERSION));
    return market;
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

function runCodex(args, options = {}) {
  const spawnOptions = { encoding: 'utf8', windowsHide: true, ...options };
  let result = spawnSync('codex', args, spawnOptions);
  // The Windows npm distribution exposes a .cmd shim. Invoke its JS entry
  // without a shell so paths containing spaces or metacharacters stay literal.
  if (process.platform === 'win32' && result.error?.code === 'ENOENT') {
    for (const dir of (process.env.PATH || '').split(path.delimiter)) {
      const entry = path.join(dir, 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
      if (dir && fs.existsSync(entry)) {
        result = spawnSync(process.execPath, [entry, ...args], spawnOptions);
        break;
      }
    }
  }
  if (result.error?.code === 'ENOENT') throw new Error('Install the Codex CLI and make codex available on PATH.');
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `codex ${args.join(' ')} failed (exit ${result.status}).`);
  }
  return result.stdout.trim();
}

export function runCodexCommand(command, flags, run = runCodex) {
  const supportedFlags = command === 'status' ? ['target', 'json'] : ['target', 'yes'];
  const unexpected = Object.keys(flags).find(key => !supportedFlags.includes(key));
  if (unexpected) throw new Error(`--${unexpected} is unsupported for ${command} --target ${flags.target}.`);
  const codexHome = path.resolve(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'));
  for (const qoderDir of [defaultQoderDir(), path.join(os.homedir(), '.qoder')]) {
    for (const relpath of ['', 'config.toml', `plugins/cache/${MARKET}/allforone`, MARKET]) {
      const rel = path.relative(realLocation(qoderDir), realLocation(path.join(codexHome, relpath)));
      if (rel === '' || (rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel))) {
        throw new Error('Choose a CODEX_HOME outside the Qoder configuration directory.');
      }
    }
  }
  if (command === 'status') {
    console.log(run(['plugin', 'list', '--marketplace', MARKET, ...(flags.json ? ['--json'] : [])]));
    return;
  }
  if (!['install', 'update', 'uninstall'].includes(command)) {
    throw new Error(`Use install, update, status, or uninstall with --target ${flags.target}.`);
  }
  const destination = path.join(codexHome, MARKET);
  const { marketplaces } = JSON.parse(run(['plugin', 'marketplace', 'list', '--json']));
  const previous = marketplaces.find(item => item.name === MARKET);
  if (previous && path.relative(realLocation(destination), realLocation(previous.root)) !== '') {
    throw new Error(`Marketplace ${MARKET} is already registered at ${previous.root}.`);
  }
  if (command === 'uninstall') {
    assertOwned(destination);
    console.log(run(['plugin', 'remove', PLUGIN]));
    return;
  }
  const market = prepareCodexMarketplace(codexHome);
  run(['plugin', 'marketplace', 'add', market]);
  const installed = JSON.parse(run(['plugin', 'add', PLUGIN, '--json']));
  if (installed.pluginId !== PLUGIN || installed.version !== VERSION) {
    throw new Error(`Codex did not confirm installation of ${PLUGIN} version ${VERSION}. Check status before retrying.`);
  }
  console.log(`Installed at ${installed.installedPath}`);
  console.log(`AllForOne ${VERSION}: ${counts.skills} skills, ${counts.references} references, ${counts.tools} tools. Start a new Codex or ChatGPT desktop Work chat.`);
}

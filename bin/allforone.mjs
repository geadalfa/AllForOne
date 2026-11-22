#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { runCodexCommand } from '../lib/codex.mjs';
import {
  DISPLAY_NAME,
  PLUGIN_NAME,
  VERSION,
  resolveOptions
} from '../lib/constants.mjs';
import { installAll } from '../lib/installer.mjs';
import { availableProfiles, resolveSkills, loadUpstreamRegistry } from '../lib/profiles.mjs';
import { prepareStatePurge, readState, writeState } from '../lib/state.mjs';
import {
  autoUpdate,
  readUpdateReport
} from '../lib/updater.mjs';
import { sessionStart } from '../lib/hook.mjs';
import { isRegistered, qoderPaths, unregisterPlugin, pluginInstallPath } from '../lib/qoder.mjs';

const BOOLEAN_FLAGS = new Set([
  'minimal',
  'full',
  'yes',
  'offline',
  'force',
  'quiet',
  'json',
  'auto',
  'no-auto-update',
  'no-upstreams',
  'purge',
  'help'
]);

function parseArgs(argv) {
  const flags = {};
  const positionals = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    const [key, inline] = arg.slice(2).split('=');
    if (inline !== undefined) {
      flags[key] = inline;
    } else if (BOOLEAN_FLAGS.has(key)) {
      flags[key] = true;
    } else if (argv[index + 1] && !argv[index + 1].startsWith('--')) {
      flags[key] = argv[index + 1];
      index += 1;
    } else {
      flags[key] = true;
    }
  }
  return { flags, positionals };
}

function banner() {
  console.log('');
  console.log('  ALL FOR ONE');
  console.log('  One install. Every capability.');
  console.log('');
}

function usage() {
  console.log(`AllForOne ${VERSION}

Usage:
  allforone install --minimal [--profiles engineering,security]
  allforone install --full
  allforone install --target codex|chatgpt
  allforone status|update|uninstall --target codex|chatgpt
  allforone update [--force]
  allforone status [--json]
  allforone profiles
  allforone config autoUpdate.self true|false
  allforone uninstall [--purge --yes]
  allforone hook session-start
  allforone mcp

Codex and ChatGPT desktop:
  Use --target codex or --target chatgpt for the portable local plugin.
  Both require the Codex CLI with plugin support. Run status with --json to
  inspect the installed version. Update installs the invoked package version.

Qoder install flags:
  --no-auto-update   Disable daily self and upstream updates
  --no-upstreams     Skip third-party repositories
  --offline          Skip all network operations
  --qoder-dir PATH   Override the Qoder config directory
  --state-dir PATH   Override the AllForOne state directory
  --yes              Skip confirmations

For Qoder, Minimal installs a curated quarter of the full inventory, plus any extra
profiles you choose, then pulls the matching upstream repositories. Full installs every
public skill, knowledge document, tool, and upstream pack.`);
}

async function ask(question, fallback) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(question)).trim();
    return answer || fallback;
  } finally {
    rl.close();
  }
}

async function chooseMode() {
  banner();
  console.log('Choose how much to install:');
  console.log('  1) Minimal  a curated quarter of Full + any extra profiles + matching upstream repos');
  console.log('  2) Full     every public skill, knowledge doc, tool, and upstream pack');
  const answer = await ask('Mode [1/2, default 1]: ', '1');
  return answer === '2' ? 'full' : 'minimal';
}

async function chooseProfiles(profiles) {
  console.log('');
  console.log('Available profiles:');
  console.log(`  ${profiles.join(', ')}`);
  const answer = await ask(
    'Extra profiles, comma separated [default none: automatic quarter]: ',
    ''
  );
  return answer
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function confirm(question, fallback = true) {
  const suffix = fallback ? ' [Y/n]: ' : ' [y/N]: ';
  const answer = (await ask(question + suffix, '')).toLowerCase();
  if (!answer) return fallback;
  return answer === 'y' || answer === 'yes';
}

function printInstallSummary(result) {
  console.log('');
  console.log('Installed.');
  console.log(`  Plugin:   ${result.pluginPath}`);
  console.log(`  Mode:     ${result.mode}`);
  if (result.mode === 'minimal') {
    console.log(`  Profiles: ${result.profiles.join(', ') || 'none'}`);
  }
  console.log(`  Skills:   ${result.skills.length}`);
  console.log(`  Knowledge: ${result.knowledge.length} document(s)`);
  console.log(`  Tools:    ${result.tools.length}`);
  console.log(
    `  Updates:  self=${result.autoUpdate.self ? 'on' : 'off'}, upstreams=${
      result.autoUpdate.upstreams ? 'on' : 'off'
    } (daily cache)`
  );
  if (result.upstreams.length) {
    console.log('  Upstreams:');
    for (const item of result.upstreams) {
      const state = item.installed
        ? `installed${item.plugin ? ` ${item.plugin}@${item.version}` : ''}`
        : item.skipped
          ? `skipped: ${item.skipped}`
          : item.error
            ? `error: ${item.error}`
            : 'tracked';
      console.log(`    - ${item.id}: ${state}`);
    }
  }
  console.log(`  Memory:   ${result.memoryPointer}`);
  console.log('');
  console.log('Restart Qoder to load the plugin, then run /allforone-status.');
}

function printStatus(flags) {
  const opts = resolveOptions({
    qoderDir: flags['qoder-dir'],
    stateDir: flags['state-dir']
  });
  const state = readState(opts.stateDir);
  const report = readUpdateReport(opts.stateDir);
  const installPath =
    state.installedVersion &&
    pluginInstallPath(opts.qoderDir, PLUGIN_NAME, state.installedVersion);
  const installedSkills =
    installPath && fs.existsSync(path.join(installPath, 'skills'))
      ? fs
          .readdirSync(path.join(installPath, 'skills'), { withFileTypes: true })
          .filter((entry) => entry.isDirectory()).length
      : 0;
  const payload = {
    version: state.installedVersion,
    mode: state.installMode,
    profiles: state.profiles,
    installedAt: state.installedAt,
    autoUpdate: state.autoUpdate,
    pluginPath: installPath,
    installedSkills,
    memory: path.join(opts.stateDir, 'memory', 'MEMORY.md'),
    upstreams: state.upstreams,
    lastRun: state.lastRun,
    lastReport: report
  };
  if (flags.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  console.log(`${DISPLAY_NAME} ${state.installedVersion || '(not installed)'}`);
  console.log(`  Mode:      ${state.installMode || '-'}`);
  console.log(`  Profiles:  ${state.profiles?.join(', ') || '-'}`);
  console.log(`  Plugin:    ${installPath || '-'}`);
  console.log(`  Skills:    ${installedSkills}`);
  console.log(`  Memory:    ${path.join(opts.stateDir, 'memory', 'MEMORY.md')}`);
  console.log(
    `  Updates:   self=${state.autoUpdate.self ? 'on' : 'off'}, upstreams=${
      state.autoUpdate.upstreams ? 'on' : 'off'
    }`
  );
  const upstreams = Object.entries(state.upstreams || {});
  if (upstreams.length) {
    console.log('  Upstreams:');
    for (const [id, record] of upstreams) {
      const status = record.lastError
        ? `error: ${record.lastError}`
        : record.commit
          ? record.commit.slice(0, 12)
          : 'tracked';
      console.log(`    - ${id}: ${status}`);
    }
  }
  if (report) {
    console.log(
      `  Last check: ${report.at} (self=${report.self?.status}, upstreams=${report.upstreams?.status})`
    );
  }
}

async function doInstall(flags) {
  const opts = resolveOptions({
    qoderDir: flags['qoder-dir'],
    stateDir: flags['state-dir']
  });
  let mode = flags.full ? 'full' : flags.minimal ? 'minimal' : null;
  const interactive = process.stdin.isTTY && !flags.yes;
  if (!mode) {
    if (!process.stdin.isTTY) {
      console.error('Choose a mode explicitly. Run one of:');
      console.error('  npx github:geadalfa/AllForOne install --minimal');
      console.error('  npx github:geadalfa/AllForOne install --full');
      process.exitCode = 2;
      return;
    }
    mode = await chooseMode();
  }

  let profiles = flags.profiles
    ? String(flags.profiles)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  if (mode === 'minimal' && profiles.length === 0) {
    profiles = process.stdin.isTTY
      ? await chooseProfiles(availableProfiles(opts.sourceRoot))
      : [];
  }

  let autoUpdateOn = !flags['no-auto-update'];
  if (interactive && !flags['no-auto-update']) {
    autoUpdateOn = await confirm(
      'Enable daily auto-update for AllForOne and its upstream repos (checked with a 24-hour cache)?',
      true
    );
  }

  const upstreamsOn = !flags['no-upstreams'];
  if (interactive) {
    if (!(await confirm('Proceed with this install?', true))) {
      console.log('Cancelled.');
      return;
    }
  }

  banner();
  console.log(`Installing ${mode}${mode === 'minimal' ? ` (${profiles.join(', ')})` : ''}...`);
  const result = installAll({
    ...opts,
    mode,
    profiles,
    autoUpdate: autoUpdateOn,
    upstreams: upstreamsOn,
    offline: Boolean(flags.offline)
  });
  printInstallSummary(result);
}

function doUpdate(flags) {
  const opts = resolveOptions({
    qoderDir: flags['qoder-dir'],
    stateDir: flags['state-dir']
  });
  const report = autoUpdate({
    ...opts,
    force: Boolean(flags.force),
    offline: Boolean(flags.offline),
    quiet: Boolean(flags.quiet)
  });
  if (flags.quiet) return;
  if (report.status === 'locked') {
    console.log('An update is already running.');
    return;
  }
  console.log(JSON.stringify(report, null, 2));
}

function doConfig(positionals, flags) {
  const key = positionals[0];
  const value = positionals[1];
  if (!key || value === undefined) {
    console.error('Usage: allforone config <autoUpdate.self|autoUpdate.upstreams> <true|false>');
    process.exitCode = 2;
    return;
  }
  const opts = resolveOptions({
    qoderDir: flags['qoder-dir'],
    stateDir: flags['state-dir']
  });
  const state = readState(opts.stateDir);
  if (key === 'autoUpdate.self') state.autoUpdate.self = value === 'true';
  else if (key === 'autoUpdate.upstreams') state.autoUpdate.upstreams = value === 'true';
  else {
    console.error(`Unknown config key: ${key}`);
    process.exitCode = 2;
    return;
  }
  writeState(opts.stateDir, state);
  console.log(`${key} = ${value}`);
}

async function doUninstall(flags) {
  const opts = resolveOptions({
    qoderDir: flags['qoder-dir'],
    stateDir: flags['state-dir']
  });
  if (!flags.yes && process.stdin.isTTY) {
    const ok = await confirm(
      flags.purge
        ? 'Remove AllForOne, its cached plugin files, upstream clones, and local memory?'
        : 'Remove AllForOne from Qoder? Local memory and upstream clones stay.',
      false
    );
    if (!ok) {
      console.log('Cancelled.');
      return;
    }
  }
  const purge = flags.purge && prepareStatePurge(opts.stateDir, opts.qoderDir);
  const removed = unregisterPlugin(opts.qoderDir, PLUGIN_NAME);
  const cacheDir = qoderPaths(opts.qoderDir).pluginCache;
  if (removed && !isRegistered(opts.qoderDir, PLUGIN_NAME) && fs.existsSync(cacheDir)) {
    for (const name of fs.readdirSync(cacheDir)) {
      if (name === PLUGIN_NAME) fs.rmSync(path.join(cacheDir, name), { recursive: true, force: true });
    }
  }
  if (purge) purge();
  console.log('AllForOne removed from Qoder. Restart Qoder to finish.');
}

async function main() {
  const argv = process.argv.slice(2);
  const { flags, positionals } = parseArgs(argv);
  const command = positionals.shift() || 'help';

  if (flags.help || command === 'help') {
    usage();
    return;
  }
  if (flags.target !== undefined && flags.target !== 'qoder') {
    if (!['codex', 'chatgpt'].includes(flags.target)) {
      throw new Error('Choose --target qoder, codex, or chatgpt.');
    }
    runCodexCommand(command, flags);
    return;
  }
  if (command === 'install') {
    await doInstall(flags);
    return;
  }
  if (command === 'update') {
    doUpdate(flags);
    return;
  }
  if (command === 'status') {
    printStatus(flags);
    return;
  }
  if (command === 'profiles') {
    const opts = resolveOptions({});
    for (const name of availableProfiles(opts.sourceRoot)) {
      const skills = resolveSkills({ root: opts.sourceRoot, mode: 'minimal', profiles: [name] });
      console.log(`${name.padEnd(12)} ${skills.length} skills`);
    }
    return;
  }
  if (command === 'config') {
    doConfig(positionals, flags);
    return;
  }
  if (command === 'uninstall') {
    await doUninstall(flags);
    return;
  }
  if (command === 'hook') {
    const opts = resolveOptions({
      qoderDir: flags['qoder-dir'],
      stateDir: flags['state-dir']
    });
    const output = sessionStart(opts);
    if (output) process.stdout.write(output + '\n');
    return;
  }
  if (command === 'mcp') {
    await import('./mcp-server.mjs');
    return;
  }
  if (command === 'registry') {
    const opts = resolveOptions({});
    const registry = loadUpstreamRegistry(opts.sourceRoot);
    console.log(JSON.stringify(registry, null, 2));
    return;
  }

  usage();
  process.exitCode = 2;
}

main().catch((error) => {
  console.error(`AllForOne: ${error.message}`);
  process.exitCode = 1;
});

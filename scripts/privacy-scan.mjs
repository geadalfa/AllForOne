#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const json = argv.includes('--json');
const history = argv.includes('--history');
const SELF = path.relative(ROOT, fileURLToPath(import.meta.url)).replace(/\\/g, '/');

// Terms are assembled so this file does not match itself.
const T = {
  org: 'B' + 'RI',
  mobile: 'BR' + 'Imo',
  platform: 'Q' + 'ita',
  gateway: 'Era' + 'ngel',
  service: 'Vik' + 'endi',
  partner: 'Til' + 'aka',
  brand: 'Bank ' + 'Rakyat',
  host: 'bitbucket.' + 'b' + 'ri',
  nameA: 'Al' + 'fa',
  nameG: 'Ge' + 'mi',
  handle: 'gead' + 'alfa',
  squad: 'Nai' + 'robi',
  svc1: 'Hot' + 'spring',
  svc2: 'Wen' + 'gen',
  svc3: 'Roz' + 'hok',
  svc4: 'Zar' + 'khi',
  svc5: 'Ladri' + 'llera',
  svc6: 'Li' + 'vik'
};

const TEXT_EXT = /\.(md|mdx|json|jsonl|ya?ml|txt|py|sh|ps1|mjs|cjs|js|ts|css|html|xml|toml|ini|cfg|swift)$/i;
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'coverage', '.allforone']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && TEXT_EXT.test(entry.name)) out.push(full);
  }
  return out;
}

const patterns = [
  { id: 'organization', re: new RegExp(`\\b${T.org}\\b`) },
  { id: 'mobile-app', re: new RegExp(`\\b${T.mobile}\\b`, 'i') },
  { id: 'platform', re: new RegExp(`\\b${T.platform}\\b`, 'i') },
  { id: 'gateway', re: new RegExp(`\\b${T.gateway}\\b`, 'i') },
  { id: 'service', re: new RegExp(`\\b${T.service}\\b`, 'i') },
  { id: 'partner', re: new RegExp(`\\b${T.partner}\\b`, 'i') },
  { id: 'org-brand', re: new RegExp(T.brand, 'i') },
  { id: 'org-host', re: new RegExp(T.host.replace('.', '\\.'), 'i') },
  { id: 'personal-name', re: new RegExp(`\\b${T.nameA}\\b`) },
  { id: 'agent-persona', re: new RegExp(`\\b${T.nameG}\\b`) },
  { id: 'github-handle', re: new RegExp(`\\b${T.handle}\\b`, 'i') },
  { id: 'internal-squad', re: new RegExp(`\\b${T.squad}\\b`, 'i') },
  { id: 'internal-service', re: new RegExp(`\\b(?:${T.svc1}|${T.svc2}|${T.svc3}|${T.svc4}|${T.svc5}|${T.svc6})\\b`, 'i') },
  { id: 'home-path', re: /(?:[A-Z]:\\Users\\[A-Za-z]|\/Users\/[A-Za-z][^<\s]|\/home\/[A-Za-z][^<\s])/ },
  { id: 'private-ip', re: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/ },
  { id: 'github-token', re: /ghp_[A-Za-z0-9]{20,}/ },
  { id: 'github-pat', re: /github_pat_[A-Za-z0-9_]{20,}/ },
  { id: 'openai-key', re: /sk-[A-Za-z0-9]{20,}/ },
  { id: 'aws-key', re: /AKIA[0-9A-Z]{16}/ },
  { id: 'google-key', re: /AIza[0-9A-Za-z_-]{30,}/ },
  { id: 'slack-token', re: /xox[baprs]-[0-9A-Za-z-]{10,}/ },
  { id: 'private-key', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { id: 'hardware', re: new RegExp('RTX ' + '4060', 'i') },
  { id: 'non-system-drive', re: /\b[D-Z]:\\/i },
  { id: 'personal-agent-home', re: new RegExp('\\.' + 'ge' + 'mini', 'i') }
];

const REPO_SLUG = T.handle + '/AllForOne';
const REPO_URL = 'https://github.com/' + REPO_SLUG;
const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ALLOW = [
  new RegExp(escapeRe(REPO_URL), 'g'),
  new RegExp(escapeRe(REPO_SLUG), 'g'),
  new RegExp(escapeRe('github:' + REPO_SLUG), 'g'),
  // GitHub-generated merge messages include the owner's own branch path.
  new RegExp(escapeRe(T.handle + '/' + T.handle + '-') + '[A-Za-z0-9._-]+', 'g')
];

const DOC_EXAMPLE_IPS = new Set(['10.0.0.' + '0', '10.0.0.' + '1', '192.168.' + '1.1']);

function scanText(text) {
  let normalized = text;
  for (const allow of ALLOW) normalized = normalized.replace(allow, '__REPO__');
  const findings = [];
  for (const { id, re } of patterns) {
    const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
    const matcher = new RegExp(re.source, flags);
    for (const match of normalized.matchAll(matcher)) {
      if (id === 'private-ip' && DOC_EXAMPLE_IPS.has(match[0])) continue;
      findings.push({ id, match: match[0] });
    }
  }
  return findings;
}

const files = walk(ROOT).filter((file) => {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  return rel !== SELF;
});

const findings = [];
for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    for (const finding of scanText(lines[index])) {
      findings.push({ file: rel, line: index + 1, id: finding.id });
    }
  }
}

const emailRe = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(emailRe)) {
    const email = match[0].toLowerCase();
    if (
      email.endsWith('@example.com') ||
      email.endsWith('@example.net') ||
      email.endsWith('@example.org') ||
      email.endsWith('@target.com') ||
      email.endsWith('@company.com') ||
      email.endsWith('@evil.com') ||
      email.endsWith('@test.com') ||
      email.endsWith('@exploit.net') ||
      email.endsWith('@legit.com') ||
      email.endsWith('@attacker.com') ||
      email.endsWith('@victim.com') ||
      email.endsWith('@users.noreply.github.com') ||
      email.startsWith('noreply@')
    ) {
      continue;
    }
    findings.push({ file: rel, line: 0, id: 'email' });
  }
}

if (history) {
  const git = spawnSync('git', ['log', '--all', '-p', '--format=commit %H%n%B'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 200 * 1024 * 1024
  });
  if (git.status !== 0 || !git.stdout) {
    console.error('Privacy scan could not read Git history. Run in a checkout with accessible commits.');
    process.exit(2);
  }
  for (const finding of scanText(git.stdout)) {
    findings.push({ file: '(git history)', line: 0, id: finding.id });
  }
  const identities = spawnSync('git', ['log', '--all', '--format=%an <%ae>%n%cn <%ce>'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  const IDENTITY = new RegExp([T.nameA, T.nameG, T.mobile, T.org, T.handle].join('|'), 'i');
  // The public repo owner's GitHub noreply is the only personal handle allowed in commit metadata.
  const OWNER_NOREPLY = new RegExp('52628488\\+' + 'gead' + 'alfa@users\\.noreply\\.github\\.com', 'i');
  const FOREIGN_NOREPLY = new RegExp('all' + 'forone@users\\.noreply\\.github\\.com', 'i');
  if (identities.status !== 0 || !identities.stdout) {
    console.error('Privacy scan could not verify commit metadata.');
    process.exit(2);
  }
  for (const line of identities.stdout.split(/\r?\n/).filter(Boolean)) {
    if ((IDENTITY.test(line) || FOREIGN_NOREPLY.test(line)) && !OWNER_NOREPLY.test(line)) {
      findings.push({ file: '(commit metadata)', line: 0, id: 'identity' });
    }
  }
}

if (json) {
  console.log(JSON.stringify({ findings, scanned: files.length }, null, 2));
} else if (findings.length) {
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} [${finding.id}]`);
  }
  console.error(`\nPrivacy scan failed with ${findings.length} finding(s).`);
} else {
  console.log(`Privacy scan passed: ${files.length} text files, zero findings.`);
}
process.exit(findings.length ? 1 : 0);

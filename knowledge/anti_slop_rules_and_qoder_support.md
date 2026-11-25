# antislop: Rules for AI Coding Agents, and the Qoder Door

Verified 2026-11-15.

## What it is

`miqdadbadjuber/anti-slop` (MIT, https://github.com/miqdadbadjuber/anti-slop) is a rulebook an AI coding agent reads every session to filter generic AI output. It is a filter, not a style guide: it prescribes no colors, fonts, or layouts, and direction comes from the project's `DESIGN.md`.

- 40 rules in three tiers (Hard Gate, Purpose-Gate, Quality Locks), a Liveliness Toolkit, a mandatory PASS/FAIL Delivery Gate, and two usage modes (During, After).
- Six skills, each a standard `skills/<name>/SKILL.md` folder: `antislop` (core, always on), `antislop-ui`, `antislop-copywriting`, `antislop-human` (contrast checker and WCAG references), `antislop-layoutmobile`, `antislop-code`.
- Two ways to run: During guides the work and closes with the Delivery Gate report; After audits existing work with a numbered findings list. By default the agent asks which mode at session start; `npx antislop-ai --mode during|after|ask` saves a global preference.
- Snapshot 2026-11-15: 9,237 stars, 633 forks, latest release v3.2.30 (2026-11-13), npm package `antislop-ai`, docs site https://antislop.ai.id. The npm name `antislop` is a different package.

## Distribution

- Installer: `npx antislop-ai` copies skill folders and writes a session pointer. `--update` replaces installed copies and prints the release it replaced.
- skills.sh directory: `npx skills add miqdadbadjuber/anti-slop`, and the tool supports `-a qoder`.
- Plugin doors: Claude Code, Antigravity, Codex, Cursor, Kimi Code, Cline, Oh My Pi, DeepSeek Harness, Muse Code. Each reads a manifest in the repo (`.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`, `.kimi-plugin/`, `.agents/plugins/`, `.omp-plugin/`, and the root `package.json` for Cline and Pi).
- Single file: `antislop.md` pasted into any chat.
- Node.js 20.12 or newer for the installer.

## Qoder support (2026-11-15)

Upstream at commit 35b54dc (`v3.2.30`) has no Qoder manifest, installer row, or documentation. The `feat/qoder` contribution branch adds all three and is open as PR #67 (https://github.com/miqdadbadjuber/anti-slop/pull/67), version 3.2.31. It is pending review; the maintainer may assign a different version slot.

What the PR adds:

- `.qoder-plugin/plugin.json`: name `antislop`, `skills: "./skills/"`, logo `./assets/profile.png`, category Product Design, license MIT. Qoder imports a plugin from a local folder in Settings > Plugins and keeps its copy under `~/.qoder/plugins/cache/`.
- Installer row `{ id: 'qoder', label: 'Qoder', dir: '.qoder/skills', entry: 'AGENTS.md' }`. Qoder's documented skill paths are `~/.qoder/skills/{name}/SKILL.md` (user) and `.qoder/skills/{name}/SKILL.md` (project); a project skill outranks a user skill of the same name. Qoder reads `AGENTS.md` as project rules, and `.qoder/rules/` wins over it on a conflict.
- Plugin door: reads `~/.qoder/plugins/installed_plugins_v2.json`, matches plugin IDs whose name is `antislop`, and reports the newest copy so `--update` names it.
- Tests: 16 agents over 10 folders, D13 Qoder target and pointer checks, eight door probes, and a Qoder registry fixture in the store test.
- Docs: README install section and FAQ, GUIDE route table, Qoder plugin walkthrough, folder table, pointer paragraph, and the ROADMAP release row. Version 3.2.31 in all twelve stamped files; CONTRIBUTING now lists `.qoder-plugin/plugin.json`.

Verification: `node scripts/check-repo.mjs` (14 checks) and `npm test` in `cli/` pass on Windows 11 with Node 24.22.1. The same folder mapping is what `vercel-labs/skills` ships for the `qoder` agent (`skillsDir: '.qoder/skills'`, `globalSkillsDir: ~/.qoder/skills`).

## Install into Qoder today

Before the PR merges, two routes work without it:

- `npx skills add miqdadbadjuber/anti-slop -a qoder` copies the folders into Qoder's skill directory and writes no pointer.
- Clone the fork's `feat/qoder` branch and import that folder in Settings > Plugins, because `.qoder-plugin/plugin.json` exists only on the branch.

After the PR merges: `npx antislop-ai` and pick Qoder, or import the plugin from the released repository.

## Caveats

- The contrast MCP server is declared only in `.claude-plugin/plugin.json`, and its launcher expands `${CLAUDE_PLUGIN_ROOT}`. The Qoder plugin ships skills only; the checker is still available as `skills/antislop-human/contrast-check.py`.
- The project plans at most one new agent per version, so a Qoder release needs its own slot.
- Installing antislop changes agent behavior in every session. Do not install it without User's explicit consent.
- CI enforces manifest JSON, version agreement across twelve files, no em dashes in prose, generated core skill sync (`node cli/scripts/sync-skills.mjs`), the generated GUIDE catalogue (`node scripts/skill-index.mjs`), doc links, and installer smoke tests on Linux, Windows, and macOS.

## Update strategy

Fetch README.md, GUIDE.md, ROADMAP.md, `cli/lib/install.mjs` (AGENTS and PLUGIN_DOORS), `cli/scripts/smoke-worker.mjs`, and the plugin manifests. Update counts, routes, and Qoder status, then verify with `node scripts/check-repo.mjs` and `npm test` in `cli/`.

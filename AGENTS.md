# AllForOne Agent Protocol

This file is for LLM agents. For Claude Code, Claude Desktop, Codex, or ChatGPT, follow the client-specific installation section in README.md. Apply the Qoder protocol below only when the requested client is Qoder. Ask which client the user uses if the target is unclear.

## Claude Code and Claude Desktop

Ask the same one question: **Minimal or Full?**

```bash
claude plugin marketplace add geadalfa/AllForOne

# Install one edition
claude plugin install allforone-minimal@allforone
claude plugin install allforone-full@allforone
```

Minimal carries a curated quarter of the Full inventory; Full carries all 82 skills and 40 knowledge documents. Install one edition only. Verify with `claude plugin list` and report its real output. Tell the user to start a new session or run `/reload-plugins`. Updates run through `claude plugin marketplace update allforone` and `claude plugin update <edition>@allforone`; the plugin never self-updates a Claude-managed install. For Claude Desktop without the marketplace, use the MCP template in `integrations/claude/claude_desktop_config.example.json`.

## Qoder

## 1. Ask one question

> Minimal or Full?

Do not pick a mode silently. Do not install both.

## 2. Run the matching command

```bash
# Minimal
npx --yes github:geadalfa/AllForOne#v0.3.0 install --minimal

# Full
npx --yes github:geadalfa/AllForOne#v0.3.0 install --full
```

Minimal installs a curated quarter of the full inventory by default. The share is computed from the live counts (skills, knowledge, tools) and scales automatically when the inventory grows. Profiles are optional and add their skills, documents, tools, and upstream packs on top:

```bash
npx --yes github:geadalfa/AllForOne#v0.3.0 install --minimal --profiles engineering,security --yes
```

Valid profiles: `engineering`, `frontend`, `security`, `finance`, `writing`, `research`, `automation`, `gaming`, `documents`, `creative`, `llm`, `data`.

## 3. Respect the update choice

Auto-update is on by default and checked once per day with a 24-hour cache. If the user wants it off, add `--no-auto-update`. Later:

```bash
npx --yes github:geadalfa/AllForOne#v0.3.0 config autoUpdate.self false
npx --yes github:geadalfa/AllForOne#v0.3.0 config autoUpdate.upstreams false
```

## 4. Verify

```bash
npx --yes github:geadalfa/AllForOne#v0.3.0 status
```

Report the real version, plugin path, skill count, memory path, and update flags. Do not claim success without this output.

## 5. Tell the user to restart Qoder

The plugin, skills, hooks, and MCP server load on restart. After restart, the user can run `/allforone-status`.

## 6. Keep README in sync

Any change to `skills/`, `knowledge/`, `tools/`, `plugins`, `upstreams/`, or the package version must update `README.md` in the same change:

- badges and the "What you get" table;
- the "Upstream packs" table;
- the full inventory headings and rows;
- the repository tree counts;
- the version badge and release ZIP link.

Run `npm run validate`. It calls `scripts/check-readme-sync.mjs` and fails when README is stale. Do not treat the README update as a follow-up task.

## Boundaries

- Never copy the user's real memory, credentials, employer data, customer records, internal endpoints, or private repository names into a public artifact.
- Memory is local only.
- Security review is static by default. Active testing needs written authorization and a published scope.
- If a command fails, report the error and the next step. Do not retry the same failing command blindly.

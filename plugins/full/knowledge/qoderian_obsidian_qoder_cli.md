# Qoderian — Qoder CLI inside Obsidian

Source: https://github.com/QoderAI/Qoderian
License: MIT (Copyright 2026 Qoder; portions derived from Claudian, MIT, 2025)
Version studied: `1.0.19`, commit `126524d` (2026-11-12)
Verified: 2026-11-25 from manifests and release assets; runtime not exercised in this study

## What it is

An Obsidian desktop plugin that embeds Qoder CLI (`qodercli`) in the vault sidebar. The vault becomes the agent working directory, so file reads and writes, search, bash, and multi-step workflows run against notes directly.

It is an Obsidian plugin, not a Qoder plugin. It depends on the locally installed and signed-in Qoder CLI.

## Why it matters

It joins notes, an agent with filesystem and shell access, and the same `.qoder/` project configuration used in the terminal. Project skills, subagents, commands, hooks, and MCP servers can serve both a code repository and a knowledge vault.

## Features

- Agentic chat streaming into the sidebar with vault file access.
- `@` mentions for notes, the current selection, and external directories.
- Inline Edit with a diff preview before accepting a rewrite.
- Slash commands and skills from the CLI project configuration.
- Permission modes: Ask approval, Auto approval, Full access.
- `#` instruction mode and opt-in `!` bash mode.
- Model picker with per-model reasoning effort and context usage from the Qoder Agent SDK.
- MCP servers over stdio, SSE, or HTTP, configured in-app.
- Tabs, history, resume, fork, rewind.
- Subagents rendered inline, turn summaries with execution steps, and read-only per-file diff modals.

## Architecture

Layer ownership is explicit, with no provider abstraction:

- `app/` — Obsidian composition and persistence, plugin lifecycle, settings.
- `features/` — chat, inline edit, settings; may use Qoder-specific concepts directly.
- `core/` — stable product data and narrow host/runtime contracts; no SDK or CLI parsing.
- `qoder/` — all SDK and CLI concerns: auth, process spawning, Query lifecycle, session resume/fork/rewind, models, permissions, hooks, tools, MCP options, transcript parsing.
- `shared/` — reusable Obsidian UI and DOM helpers.

`QoderServices` is the integration composition root; `QoderHostContext` is the narrow host contract. `QoderChatRuntime` coordinates the long-lived Query with separate turn tracking, response routing, conversation projection, and stream bridging. The model catalog has one source: SDK initialization and `getAvailableModels()`.

## Installation

Requirements: Obsidian 1.7.2+ on desktop (macOS, Linux, Windows; no mobile) and a signed-in Qoder CLI on the same machine. The CLI installs with the official script or `npm install -g @qoder-ai/qodercli` (Node.js 20+); the official installer does not support Windows arm64.

Three routes:

1. Obsidian Settings, Community plugins, Browse, search "Qoderian", install, enable.
2. Download `main.js`, `manifest.json`, and `styles.css` from the latest GitHub release into `<vault>/.obsidian/plugins/qoderian/`, then enable.
3. Clone the repository into the plugins folder, run `npm ci` and `npm run build`, then enable.

Release `1.0.19` (2026-11-12) ships `main.js` 2.6 MB, `manifest.json`, and `styles.css` 151 KB.

## Privacy and security boundaries

- Qoderian never asks for or stores a Qoder API key; sign-in is managed by the local CLI and is not copied into the vault.
- Prompts, attachments, and tool results go to Qoder services through `qodercli` under Qoder's terms and privacy policy.
- Settings and session metadata live in `vault/.qoderian/`; project commands, skills, agents, and MCP configuration live in `vault/.qoder/`; Obsidian tab layout lives in `.obsidian/plugins/qoderian/data.json`.
- The CLI subprocess inherits Obsidian's environment; overrides are not persisted in the vault.
- Depending on permission mode, the agent may read, create, modify, or delete files and run shell commands. Full access needs backups or version control for the vault.
- External context and MCP servers can reach beyond the vault under their own rules.
- No telemetry of its own; feedback is user-initiated.

## Limitations

- Desktop only; no mobile support.
- Depends on a working signed-in `qodercli`. GUI apps may not inherit shell PATH, so `spawn qodercli ENOENT` is the common failure with nvm/fnm/volta; set the CLI path in settings.
- The bundled Qoder Agent SDK is not relicensed under MIT; Qoder service terms apply.
- Code is derived from Claudian; the original MIT notice is retained.
- Vault write access is powerful by design; permission modes are the guardrail, not a sandbox.

## How to use it well

- Install from the community list for normal use; use release files for offline or pinned installs.
- Treat the vault as a production filesystem: keep version control or backups, and do not enable Full access casually.
- Keep `.qoder/mcp.json` out of public repositories because it can contain secrets.
- Verify the installed manifest version after any upgrade.

## References

- `README.md`, `ARCHITECTURE.md`, `docs/docs/introduction.md`, `docs/docs/features.md`, `NOTICE`, `manifest.json`
- https://obsidian.md/plugins?id=qoderian
- https://qoder.com/install
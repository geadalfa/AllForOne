# CLI-Anything: Agent-Native CLIs for Professional Software

Source: HKUDS/CLI-Anything · Apache-2.0 · verified 2026-11-21
Repository: https://github.com/HKUDS/CLI-Anything · Hub: https://clianything.cc
Baseline: HEAD `34f519533bc1` (2026-09-22), latest release v0.4.0 (2026-06-25), Python >= 3.10, tech report arXiv:2606.03854.

## What it is

CLI-Anything is a community registry and generator that makes desktop software, codebases, and services usable by AI agents through command-line harnesses. It has two halves:

1. **CLI-Hub** — a package manager and live registry. `pip install cli-anything-hub`, then `cli-hub list`, `search`, `info`, `install`, `update`, `uninstall`, and `launch`.
2. **Harness generator** — a multi-phase workflow distributed as skills/plugins for coding agents (Claude Code, Codex, Cursor, OpenCode, Qoder CLI, and others). It builds a new `cli-anything-<name>` package when the registry has no harness yet.

Every harness is an independent pip package with a stable CLI, JSON output, a human-readable mode, optional REPL, stateful operations, and a generated `SKILL.md` for agent discovery.

## Why it matters

- **CLI is a durable agent interface.** Text commands compose, expose `--help` as self-documentation, and return structured JSON that avoids brittle GUI automation.
- **Breadth.** The repository ships about 70 harness skills (GIMP, Blender, LibreOffice, FreeCAD, QGIS, Krita, Audacity, OBS, Inkscape, Draw.io, Mermaid, Obsidian, Zotero, n8n, PM2, ChromaDB, Ollama, Zoom, and more) plus public third-party CLIs.
- **Scoped discovery.** Workflow matrices map intents such as `text.transcribe` to concrete providers, so an agent can install only the capability a task needs.

## Key concepts

- **Harness** — `cli-anything-<software>` package that wraps a real application or service.
- **CLI-Hub registry** — `registry.json`, `public_registry.json`, and `matrix_registry.json` at the repository root.
- **Matrix** — capabilities × providers bundle, for example `video-creation`. Commands: `cli-hub matrix list`, `matrix search`, `matrix preflight`, `matrix install --capability <id>`, `matrix doctor`.
- **Preview workflow** — some harnesses publish preview bundles; `cli-hub previews inspect|html|watch|open` reads them.
- **Meta-skill** — `cli-hub-meta-skill` teaches an agent to discover, preflight, and install CLIs instead of guessing package names.

## Workflow / architecture

1. Install the hub: `pip install cli-anything-hub`.
2. Discover: `cli-hub search <keyword>`, `cli-hub list -c <category>`, or `cli-hub can "<capability>"`.
3. Preflight a matrix: `cli-hub matrix preflight <name> --json` (exit 3 means capability gaps).
4. Install narrowly: `cli-hub matrix install <name> --capability <id>` or `cli-hub install <tool>`.
5. Run: `cli-anything-<tool> <command> --json`; read the installed `SKILL.md` for provider-selection rules.
6. For new software, run the generator phases: inspect, design, implement, test, document, generate `SKILL.md`, validate.

Qoder integration: the repository contains `qoder-plugin/setup-qodercli.sh`, which registers the plugin path in `~/.qoder.json` under `plugins.sources.local`. It requires the `cli-anything-plugin` directory and `jq` when the config already exists. For an environment without that plugin layout, the meta-skill alone provides discovery and install guidance.

## Verified behavior

Read directly from the repository on 2026-11-21:

- README documents the two entry points, the CLI-Hub commands, matrix workflow, 18 demo apps, and a claimed 2,461 passing tests.
- `skills/` contains 70 `cli-anything-*` directories plus `cli-hub-meta-skill`.
- `qoder-plugin/setup-qodercli.sh` validates `.claude-plugin/plugin.json` and writes `plugins.sources.local` atomically after a backup.
- Recent hardening named in the README includes `defusedxml` for untrusted XML/SVG/ODF parsing, token-file path hardening, and URL validation for the browser harness.
- Repository metrics at verification time: about 61.4k stars, 5.5k forks, 42 MB.

No harness was installed or executed during verification.

## Limitations

- Community-contributed quality varies; not every harness reaches the same test or documentation depth.
- Harnesses wrap real applications, so the upstream app must be installed and version-compatible.
- GUI automation can break when an application changes its UI or file format.
- CLI-Hub is a thin wrapper around pip; installing a harness is installing third-party Python code.
- Per-harness licenses vary. Check each package before redistribution.
- The Qoder CLI plugin path is community-maintained and separate from the Qoder Desktop plugin layout.

## How the assistant should use it

- Use the vendored `cli-hub-meta-skill` to find a CLI before writing custom automation.
- Prefer `matrix preflight` and capability-scoped installs; never bulk-install a matrix.
- Verify the package name, version, and license before installing.
- Treat install and execution as separate, consented actions.
- Prefer `--json` output and deterministic commands over screen automation.
- Record the harness version in any deliverable that depends on it.

## References

- https://github.com/HKUDS/CLI-Anything
- https://clianything.cc
- https://github.com/HKUDS/CLI-Anything/blob/main/README.md
- https://arxiv.org/abs/2606.03854

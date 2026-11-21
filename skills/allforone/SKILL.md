---
name: allforone
description: Use when the user asks to install, update, inspect, enable, disable, or choose capabilities for AllForOne, the self-updating Qoder capability pack. Also use when an agent must decide between the minimal and full install modes, or when the user asks what AllForOne includes.
---

# AllForOne

AllForOne is a Qoder plugin plus a portable CLI. It ships skills, public knowledge, deterministic tools, a built-in MCP server, local memory scaffolding, and a registry of third-party repositories. It updates itself and its upstream packs once per day using a 24-hour cache.

## Install protocol

When the user asks to install AllForOne, do not pick a mode silently. Ask one question:

> Minimal or Full?

Then run the matching command in the user's terminal:

```bash
# Minimal: core + only the profiles the user needs + matching upstream repos
npx github:geadalfa/AllForOne install --minimal

# Full: every public skill, knowledge doc, tool, and upstream pack
npx github:geadalfa/AllForOne install --full
```

A non-interactive agent can choose profiles directly:

```bash
npx github:geadalfa/AllForOne install --minimal --profiles engineering,security --yes
```

If the user wants no automatic updates, add `--no-auto-update`. Auto-update is on by default and can be disabled later with:

```bash
npx --yes github:geadalfa/AllForOne config autoUpdate.self false
npx --yes github:geadalfa/AllForOne config autoUpdate.upstreams false
```

## After install

1. Restart Qoder so the plugin and its hooks load.
2. Run `/allforone-status` (or `npx --yes github:geadalfa/AllForOne status`) and confirm the plugin path, skill count, and update flags.
3. Do not claim success without that output.

## What to load

- Knowledge routing: the `allforone-knowledge` skill.
- Local memory: the `allforone-memory` skill.
- Installation or update work: this skill.
- Complex engineering: `plan-first`, `verify-before-done`, `no-invented-code`, `systematic-debugging`.
- Public release: `privacy-publish-gate`.
- Security review: `bughunter-defensive-review`.
- UI work: `anti-slop-ui-design`.

## Changing capabilities

When you add, remove, or rename a skill, knowledge document, tool, plugin surface, or upstream, update `README.md` in the same change:

- badge counts and the "What you get" table;
- the "Upstream packs" table;
- the full inventory headings and rows;
- the repository tree counts;
- the version badge and release ZIP link when the version changes.

Run `npm run validate`. It includes `scripts/check-readme-sync.mjs` and fails when README is stale. Never ship a capability change with a README update deferred.

## Privacy boundary

The public repository never contains the user's real memory, credentials, employer data, internal endpoints, customer records, or private repository names. Memory is created locally under the AllForOne state directory and never synced back to the public repository. If a task requires private context, read it from the user's local files at runtime; do not copy it into the plugin.

## Troubleshooting

- `git is not installed`: install Git and retry; upstream tracking needs it.
- Plugin not visible: confirm the install path is under the Qoder local plugin cache and that `allforone@local` is enabled, then restart Qoder.
- Upstream clone failed: the core plugin still works; rerun `allforone update --force` when the network is available.
- A new version is available but the session still runs the old one: restart Qoder after the update completes.

---
name: allforone
description: Install, update, inspect, or remove AllForOne in Codex CLI or ChatGPT Desktop, and help choose the Minimal or Full edition.
---

# AllForOne for Codex

Confirm the requested edition. Minimal provides five skills and a four-document reference library. Full brings the complete AllForOne skill and knowledge inventory with local helpers.

Add the marketplace, then install the chosen edition:

```sh
codex plugin marketplace add geadalfa/AllForOne
codex plugin add allforone-full@allforone
```

For Minimal, use `codex plugin add allforone-minimal@allforone`. In ChatGPT Desktop, choose the AllForOne source in **Plugins**, install the selected edition, and open a new chat.

## Inspect and refresh

- Run `codex plugin list --marketplace allforone --json` and confirm the selected plugin ID, version, and enabled state.
- Run `codex plugin marketplace upgrade allforone` and the edition's install command to refresh it. Start a new chat for the new files.
- To switch editions, remove the installed edition with `codex plugin remove` and its exact plugin ID before installing the other edition.
- If the older `allforone@allforone-local` package is installed, remove it using its v0.2.0 AllForOne installer or `codex plugin remove allforone@allforone-local` before enabling the repository edition.

## Use the package

- For Full, invoke [allforone-knowledge](../allforone-knowledge/SKILL.md) to find a document, and [allforone-memory](../allforone-memory/SKILL.md) for local notes.
- For Minimal, invoke `allforone-library` for the bundled references.
- Locate bundled scripts from the active skill file. Install optional runtimes or connect external services only when the requested workflow requires them.

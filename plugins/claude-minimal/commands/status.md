---
description: Show the installed AllForOne Claude edition, version, plugin root, and component counts
---

1. Read `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` for the edition name and version.
2. Run `claude plugin list --json` and locate the entry whose `id` ends with `@allforone`.
3. Report the edition, version, scope, enabled state, install path, skill count, knowledge index path, and portable memory path.
4. Do not invent values. If the plugin is not listed, say so and point to `claude plugin marketplace add geadalfa/AllForOne`.
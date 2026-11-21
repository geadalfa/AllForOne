---
name: allforone-memory
description: Remember, recall, correct, or forget durable non-sensitive preferences, project decisions, and lessons using storage local to Codex.
---

# AllForOne memory

Use the bundled memory helper with Node.js 18 or newer from the Codex client that owns the memory. It reads `CODEX_HOME/allforone/memory`, where `CODEX_HOME` defaults to the user's `.codex` directory. It creates the notes file on the first write.

## Recall

```sh
node "<plugin-root>/bin/memory.mjs" search "project decision"
```

Search with specific keywords. Read only the returned snippets or the relevant note, then verify the current state before relying on past decisions.

## Save

When the user asks to remember information, save a concise non-sensitive preference, decision, reference, or lesson. For a lesson, preserve what happened, why, where to look, and what worked. The helper rejects common credential patterns. Keep personal identifiers, customer data, private endpoints, and secrets out of notes.

```sh
echo '{"type":"project","title":"Smoke tests","text":"Use an isolated test profile for installer checks."}' | node "<plugin-root>/bin/memory.mjs" add
```

In PowerShell, pipe a single-quoted JSON string to the same `node` command. Use `node "<plugin-root>/bin/memory.mjs" location` to find the exact notes directory when the user requests a correction or deletion. Edit only the relevant entry and verify the result there. Keep notes outside the repository and the installed plugin cache.

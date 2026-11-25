---
name: allforone-memory
description: Use when the user asks to remember, recall, update, or forget a preference, decision, project fact, or lesson. Keeps portable memory local to the machine, never publishes it, and refuses credentials or customer data.
---

# AllForOne Memory

AllForOne memory is local-only. It lives in the state directory:

```
~/.allforone/memory/
  MEMORY.md          index
  notes.md           appended notes
  topics/            optional topic files
```

The folder is never copied into the public repository. It is not synced to GitHub.

## Recall

1. Read `MEMORY.md` first.
2. Open only the topic files that match the task.
3. If the AllForOne MCP server is available, use `allforone_memory_search` instead of scanning files.
4. Treat memory as context from the past, not current truth. Verify names, paths, and flags against the live files before acting.

## Save

Save only durable, non-sensitive facts:

- `user`: role, goals, preferences, responsibilities.
- `feedback`: corrections and confirmed non-obvious approaches, with the reason.
- `project`: decisions, owners, deadlines, constraints that are not derivable from code.
- `reference`: where an external resource lives and what it is used for.

Never save:

- passwords, tokens, API keys, private keys, session cookies;
- customer records, KYC data, account numbers, personal identifiers;
- employer-internal endpoints, microservice names, repository names, ticket contents;
- anything that would be harmful if the machine were lost or shared.

Use `allforone_memory_add` when available; it refuses common secret patterns. Otherwise append to `notes.md` with a heading, type, and ISO date.

## Correct and forget

When a memory is wrong, update the exact entry and note the correction date. When the user asks to forget something, remove the entry and confirm what was removed. Do not keep a hidden copy.

## Privacy gate

Before any public release, run `privacy-publish-gate`. Memory must never be part of the payload. If a task needs private context, read it at runtime from the local path and keep it out of commits, screenshots, and generated examples.

# AllForOne Memory

This folder is a local scaffold. It is copied to the AllForOne state directory on install and is never published.

- `MEMORY.template.md` becomes `MEMORY.md` on the user's machine.
- `topics/` holds optional user, feedback, and project notes.
- `notes.md` is created on the first `allforone_memory_add` call.

Rules:

1. No credentials, tokens, customer records, or employer-internal data.
2. Read `MEMORY.md` first, then only the matching topic file.
3. Verify stale memory against the live files before acting.
4. Deleting a memory entry is allowed when the user asks to forget it.

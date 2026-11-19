---
description: Remember, recall, correct, or forget a local AllForOne memory entry
---

Use the `allforone-memory` skill.

- Recall: read `<state-dir>/memory/MEMORY.md`, then only the matching topic file, or call `allforone_memory_search`.
- Save: call `allforone_memory_add` with a type of `user`, `feedback`, `project`, or `reference`. If the MCP tool is unavailable, append to `<state-dir>/memory/notes.md`.
- Correct: update the exact entry and note the correction date.
- Forget: remove the entry and confirm what was removed.

Never store credentials, customer records, employer internals, or private repository names. Memory never leaves the machine.

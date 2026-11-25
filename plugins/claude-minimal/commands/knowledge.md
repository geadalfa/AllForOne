---
description: Route a task to the right AllForOne knowledge documents without loading the whole folder
---

1. Read `${CLAUDE_PLUGIN_ROOT}/knowledge/INDEX.md`.
2. Pick at most three documents that match the task.
3. Read only those files.
4. Answer with the document name cited when a decision comes from it.
5. If the knowledge base does not cover the question, say so and verify against the live code, official documentation, or the user's files.

Use the `allforone-knowledge` skill for the routing map and the `allforone_search_knowledge` MCP tool when it is connected.
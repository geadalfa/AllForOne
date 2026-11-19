---
description: Install AllForOne in minimal or full mode, or switch modes later
---

The user wants to install or reconfigure AllForOne.

1. Ask exactly one question: "Minimal or Full?"
2. If Minimal, ask which profiles fit the user's work. Valid profiles: engineering, frontend, security, finance, writing, research, automation, documents, creative, llm, data.
3. Run the matching command in the terminal:

```bash
# Minimal
npx github:geadalfa/AllForOne install --minimal --profiles <selected> --yes

# Full
npx github:geadalfa/AllForOne install --full --yes
```

4. Add `--no-auto-update` only if the user asks to disable daily updates.
5. After it finishes, tell the user to restart Qoder, then run `/allforone-status`.
6. Report the actual plugin path, skill count, and update flags from the status output. Do not claim success without it.

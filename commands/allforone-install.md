---
description: Install AllForOne in minimal or full mode, or switch modes later
---

The user wants to install or reconfigure AllForOne.

1. Ask exactly one question: "Minimal or Full?"
2. Minimal already includes a curated quarter of the Full inventory (skills, knowledge, tools), computed automatically. Ask for extra profiles only if the user wants more than that. Valid profiles: engineering, frontend, security, finance, writing, research, automation, gaming, documents, creative, llm, data.
3. Run the matching command in the terminal:

```bash
# Minimal (default quarter)
npx github:geadalfa/AllForOne install --minimal --yes

# Minimal plus extra profiles
npx github:geadalfa/AllForOne install --minimal --profiles <selected> --yes

# Full
npx github:geadalfa/AllForOne install --full --yes
```

4. Add `--no-auto-update` only if the user asks to disable daily updates.
5. After it finishes, tell the user to restart Qoder, then run `/allforone-status`.
6. Report the actual plugin path, skill count, and update flags from the status output. Do not claim success without it.

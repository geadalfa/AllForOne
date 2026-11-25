---
description: Explain or run the AllForOne Claude Code installation in minimal or full mode
---

1. Ask exactly one question: "Minimal or Full?"
2. Run the matching commands in the terminal:

```bash
claude plugin marketplace add geadalfa/AllForOne

# Minimal: a curated quarter of the Full inventory
claude plugin install allforone-minimal@allforone

# Full: every public skill and guide
claude plugin install allforone-full@allforone
```

3. Install one edition only. To switch, run `claude plugin uninstall <edition>@allforone` first.
4. Tell the user to start a new session or run `/reload-plugins`.
5. Verify with `claude plugin list` and report the real output. Do not claim success without it.
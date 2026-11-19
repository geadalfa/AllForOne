---
description: Check or force an AllForOne self-update and upstream repository update
---

Run the daily cached check:

```bash
npx --yes github:geadalfa/AllForOne update
```

Force a check that ignores the 24-hour cache:

```bash
npx --yes github:geadalfa/AllForOne update --force
```

The check covers the AllForOne plugin and every tracked upstream repository. Report what actually changed. If nothing changed, say so. Restart Qoder after a plugin update so the new skills load.

---
name: privacy-publish-gate
description: Review agent skills, knowledge, tools, and configuration for private material before a public commit or release.
---

# Privacy publishing gate

Use this workflow before sharing agent assets publicly.

1. Start from the owning source repository. Review the exact diff and staged paths, including generated bundles. Keep local memory, caches, auth configuration, session logs, screenshots with user data, credentials, and private endpoints out of public artifacts.
2. Use the repository's scanner on the working tree, reachable history, and commit metadata. In AllForOne run `npm run privacy`, which includes history and metadata checks. Review URLs, examples, shell arguments, and author identities in addition to obvious secrets.
3. Redact at the source, rebuild generated assets, and rerun the scanner. Review any legitimate public references called out by a scanner before deciding on a narrowly scoped fix.
4. Review license and notice files for any material from upstream projects. Verify the staged asset is the public version.
5. Publish the reviewed commit once checks pass and the user has authorized publishing. Preserve the normal Git history.

If an exposed secret is already public, tell its owner so they can rotate it. A history rewrite requires separate approval and a recovery plan.

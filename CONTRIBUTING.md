# Contributing

## Pull requests for external contributors

- `main` is protected. External contributions must open a pull request; direct pushes are reserved for repository maintainers.
- The repository owner can commit directly to `main`.
- Fork the repository or create a branch, then open a pull request against `main`.
- Keep each pull request scoped and describe the user-visible effect.

## Before you push

```bash
npm test
npm run validate
npm run privacy
```

`npm run privacy` scans the working tree and the full commit history. A pull request with any finding is not merged.

## Commit identity

- Use a GitHub noreply address tied to your own GitHub account.
- Do not commit with another person's noreply address or a shared placeholder identity.
- The commit must map to the contributor's own GitHub account.

## Changing capabilities

When you add, remove, or rename a skill, knowledge document, tool, plugin surface, or upstream, update `README.md` in the same pull request:

- badge counts and the "What you get" table;
- the "Upstream packs" table;
- the full inventory headings and rows;
- the repository tree counts;
- the version badge and release ZIP link when the version changes.

`npm run validate` includes `scripts/check-readme-sync.mjs` and fails on a stale README. `npm run check:readme` runs only that check.

## Third-party code

- Do not vendor upstream binaries. Add a registry entry and let the user download the release from the upstream project.
- Keep `THIRD_PARTY_NOTICES.md` and `licenses/` current when adding a source.
- Never add real memory, credentials, internal hosts, customer data, or private repository names.

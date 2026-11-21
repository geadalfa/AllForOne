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

## Third-party code

- Do not vendor upstream binaries. Add a registry entry and let the user download the release from the upstream project.
- Keep `THIRD_PARTY_NOTICES.md` and `licenses/` current when adding a source.
- Never add real memory, credentials, internal hosts, customer data, or private repository names.

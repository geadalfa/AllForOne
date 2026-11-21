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

## Build release archives

Use Git, Node.js 18 or newer, and npm. Build a release from a clean checkout of the release commit. Run `git status --short` after checking out that commit and confirm the output is empty. For a local development build, stage new runtime files first. The Qoder packager uses Git's tracked paths, the `files` list in `package.json`, and each selected file's current working-tree contents. It includes tracked scripts nested inside skills.

```bash
npm run pack
npm run pack:chatgpt
```

The archives appear under `dist/` with the version from `package.json`. `allforone-<version>.qoder.zip` contains the Qoder manifest, CLI, runtime modules, and bundled resources. `allforone-<version>.chatgpt.zip` contains a portable `plugin.json`, one skill, and four public Markdown guides. Codex installation uses the CLI described in the README.

ChatGPT workspace owners or admins with upload permission can use the web admin console to upload the ChatGPT ZIP. Signed-in users with Projects can instead extract the four guides and use them as project sources with the skill instructions. [Plugin upload permissions](https://help.openai.com/en/articles/20001256-plugins-in-chatgpt) · [Projects in ChatGPT](https://help.openai.com/en/articles/10169521-projects-in-chatgpt) · [Portable plugin format](https://developers.openai.com/plugins/build/plugins)

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

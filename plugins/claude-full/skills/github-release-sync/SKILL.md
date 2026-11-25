---
name: github-release-sync
description: Use when publishing a GitHub release for a desktop or CLI app. Rebuilds the app, uploads the installer, portable archive, and SHA256SUMS to the matching GitHub release, then verifies every asset URL.
---

# GitHub Release Sync

A pushed commit without updated release assets is an incomplete release.

## Required order

1. Run the app's tests.
2. Bump the version in the installer script and in the app's version strings and README links.
3. Commit and push the source:
   ```bash
   git add <specific files>
   git commit -m "feat(vX.Y.Z): ..."
   git push origin main
   ```
4. Build the release assets without creating another commit:
   - the installer named by the build configuration;
   - `<App>-v<version>-portable.zip`;
   - `SHA256SUMS.txt`.
5. Create or update the release:
   ```bash
   gh release create "vX.Y.Z" \
     --title "vX.Y.Z" \
     --notes-file CHANGELOG.md \
     "<installer>" "<portable.zip>" "SHA256SUMS.txt"
   ```
   For an existing release:
   ```bash
   gh release upload "vX.Y.Z" \
     "<installer>" "<portable.zip>" "SHA256SUMS.txt" --clobber
   ```
6. Verify:
   ```bash
   gh release view "vX.Y.Z" --json tagName,assets
   ```
   Issue a `HEAD` request to each asset URL and confirm the file size matches.

## App configuration

- Commit a `.release.json` in each app repository with the app name and installer glob:
  ```json
  { "app": "AppName", "setup_glob": "AppName*Setup*.exe" }
  ```
- Keep machine-local install destinations outside the repository. Never commit absolute paths.

## Asset contract

The release must contain:

- the installer named by the build configuration;
- `<App>-v<version>-portable.zip`;
- `SHA256SUMS.txt`.

Delete stale setup or portable assets from the same release before uploading replacements.

## Never do

- Never upload assets manually in the GitHub web UI when the CLI workflow is available.
- Never create a second release commit just to trigger assets; upload to the tag that already exists.
- Never claim a release is updated without checking the asset list and download URLs.
- Never publish a release with a missing checksum file.

## Onboarding a new app

1. Ensure the repository has a reproducible build script and an installer recipe.
2. Add `.release.json`.
3. Add the build and checksum steps to CI or to a local script that takes the repository path.
4. Follow the required order above.

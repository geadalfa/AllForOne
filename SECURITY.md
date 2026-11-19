# Security Policy

## Scope

AllForOne is a local Qoder plugin and CLI. It writes only to:

- the Qoder local plugin cache and plugin registry;
- the AllForOne state directory (`~/.allforone` by default);
- the Qoder memory pointer file, with a managed block that never overwrites existing content.

It makes network requests only for `git` operations against the repository URLs in `upstreams/registry.json` and the AllForOne repository.

## Reporting

Open a private security advisory on the AllForOne repository. Do not include real credentials, customer data, or employer-internal information in the report. Use redacted examples.

## Rules for contributors

- No credentials, tokens, private keys, customer records, or employer-internal data in any file, commit message, or test fixture.
- No telemetry, analytics, or hidden network calls.
- Security review skills are static-first. Active testing requires written authorization and a published scope.
- Run `node scripts/privacy-scan.mjs` before every release.
- Run `node scripts/validate.mjs` and `npm test` before every release.

## Auto-update

Auto-update runs once per day using a 24-hour cache. It updates the AllForOne plugin and the tracked upstream clones. Users can disable it at install time or later with `config autoUpdate.self false` and `config autoUpdate.upstreams false`. A dirty managed clone is never reset; the updater skips it and records the reason.

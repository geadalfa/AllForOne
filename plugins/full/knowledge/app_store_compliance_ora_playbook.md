# App Store Compliance Playbook: Pre-Submission Guard for iOS and Android

Source: mjmirza/app-store-compliance · LicenseRef-OpenRoots-ORA-2.3 · verified 2026-11-21
Repository: https://github.com/mjmirza/app-store-compliance · Site: https://mjmirza.github.io/app-store-compliance/
Baseline: HEAD `d2156bab9d71` (2026-11-15), release v2.4.0, Shell/Python, about 2.2 MB.

## What it is

An open playbook and automated guard that checks an iOS or Android project against Apple App Store Review Guidelines and Google Play Developer Program Policies before submission. It combines documented rejection patterns with a code scanner, metadata audit, regulatory deadline register, and an agent skill that can block submit commands.

The repository states 117 documented rejection patterns and fixes, privacy-manifest and Data-safety checks, and 95 tracked regulatory deadlines (EU AI Act, DSA, COPPA, age laws). It supports an on-demand scan, a pre-submit hook for many coding agents, and a full release audit.

## Why it matters

- Rejections cost review cycles. The playbook turns a one-line rejection into a known pattern with a cited guideline and a concrete fix.
- The two most common causes are covered first: a working demo account with a live backend, and privacy declarations that match runtime behavior including every third-party SDK.
- Regulatory checks extend beyond store review: EU AI Act disclosure, DSA trader status, accessibility, COPPA, and regional age-assurance laws are not verified by the stores themselves.
- Metadata errors are treated as a first-class failure surface, not an afterthought.

## Key concepts

- **Guard** — `app-store-compliance-guard.sh` scans a project, ranks findings critical/high/medium, and exits non-zero when a critical risk exists.
- **Rejection taxonomy** — `data/rejection-patterns.json`, with detection recipes and a ruling register.
- **Metadata audit** — `scripts/metadata-audit.py` checks listing limits, claims, URLs, subscription terms, and locale folders.
- **Release audit** — `scripts/release-audit.py` combines code and metadata gates; exit 0 clear, 2 blocked, 3 incomplete.
- **Regulatory register** — `data/regulatory-deadlines.json`.
- **Agent skill** — `agent-os/skill/SKILL.md`, plus `/app-store-audit` commands and hook wiring for supported tools.
- **Monitor** — `scripts/monitor.py` tracks Apple developer requirement changes and drafts migration tasks.

## Workflow / architecture

1. Clone the repository.
2. Run the guard against the project root; read the ranked findings.
3. Walk the human checks the scanner cannot see: live backend, demo account, privacy labels, screenshots, listing claims, testing tracks, age ratings, and the legal layer.
4. Pull and audit the store listing with `scripts/pull-metadata.sh` and `scripts/metadata-audit.py`.
5. Run `scripts/release-audit.py` for a combined gate.
6. Produce a fix table: pattern id, platform, cited guideline, severity, fix, file or setting.
7. After a rejection, map the cited guideline to a pattern, fix it, and follow the appeal playbook. Never resubmit an unchanged build.

Installer: `scripts/install.sh --tool <name>` wires the guard into Claude Code, Codex, Gemini CLI, OpenCode, Cursor, Copilot, Grok, Qwen, Kimi, Droid, Auggie, and Windsurf. Qoder is not in the supported list, so the skill and guard are invoked manually in a Qoder workflow.

## Licensing and redistribution limits

- The repository uses the OpenRoots Agent License 2.3 (SPDX `LicenseRef-OpenRoots-ORA-2.3`), not MIT.
- Root tier is free and unconditional for individuals, nonprofits, schools, government bodies, and companies at or below USD 20,000,000 annual gross revenue.
- Above the threshold, a royalty applies to attributable revenue; there is no fallback license.
- Section 6 requires a separate Compute license for AI Training Use, defined to include retrieval augmentation and embedding generation.
- Releases before 2026-08-24 remain MIT (code) and CC BY 4.0 (content).
- Consequence: use it locally under Root terms, but do not vendor its text, data, or scripts into a public capability pack. Link to upstream and let each user accept the license themselves.

## Verified behavior

Read directly from the repository on 2026-11-21:

- README documents the two-command scan, installer support matrix, on-demand audit prompt, and the `Install verified.` check.
- `agent-os/skill/SKILL.md` defines a five-step audit and an output contract: ranked findings plus a clear/blocked verdict.
- `data/` contains rejection patterns, detection recipes, a ruling register, and regulatory deadlines.
- `references/` contains an AI-loadable guideline tree by app type and rule category.
- The guard prints `BLOCKED.`, `CLEAR.`, or `NOT CHECKED.` and exits 2 on a critical risk, 1 when run manually without a detectable project.
- Repository metrics at verification time: about 2.8k stars, 176 forks.

No audit was executed during verification; no app project was scanned.

## Limitations

- The scanner cannot see App Store Connect or Play Console account state, agreements, review notes, or declared data usage; those are deliberate manual checks.
- Items that cannot be verified are surfaced rather than assumed clean, so some findings look like false positives by design.
- The hook installer does not support Qoder; automatic blocking requires manual integration.
- On Windows, Python-backed scripts can hit a `charmap` decode error on UTF-8 data files. Run them with `PYTHONUTF8=1` set; verified 2026-11-21 with the guard.
- Regulatory content changes frequently; verify dated sources before relying on a deadline.
- The license restricts AI-training use and requires a commercial agreement for competing offerings.

## How the assistant should use it

- Use it as the pre-submission gate for any iOS or Android release review.
- Run the guard first, then walk the checklist items a scanner cannot see.
- Cite the guideline or policy for every finding; never claim an app is "clear" while a critical finding stands.
- Keep license boundaries: local Root-tier use, no vendoring into public packs, no bulk copying of patterns or data.
- Never resubmit an unchanged build after a rejection.
- Do not claim store account readiness without user-confirmed evidence.

## References

- https://github.com/mjmirza/app-store-compliance
- https://mjmirza.github.io/app-store-compliance/
- https://developer.apple.com/app-store/review/guidelines/
- https://play.google/developer-content-policy/
- https://openroots.org/licenses/ora/2.3

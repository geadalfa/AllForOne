# Better Harness — Agent Work Loop Review

Source: https://github.com/QoderAI/better-harness
License: MIT (Copyright 2026 Qoder)
Version studied: repository main `c6240a8` (2026-11-11), package `0.7.0-alpha2`; npm stable `0.6.6`
Verified: 2026-11-25 with Node 24

## What it is

An open-source review workflow for the system around coding agents. It runs through the host agent, collects project and session evidence, evaluates the Agent Work Loop, and returns prioritized findings. Every finding carries its evidence, expected outcome, repair boundary, and acceptance checks.

It is not a code review, a unit-test runner, or a release gate. It reviews how work is understood, executed, validated, delivered, and remembered.

## Why it matters

The final diff hides system-level failures: a fuzzy goal solved in the wrong direction, improvised steps nobody can reproduce, "it works" without validation evidence, delivery speed that bypasses review, and lessons lost between tasks. Better Harness turns those into explicit, evidence-bound findings instead of a vague score.

## Agent Work Loop

| Dimension | Question | Typical backing |
|---|---|---|
| Task Understanding | Does the agent know the goal and what "done" means? | `AGENTS.md`, specs, `DESIGN.md`, rules |
| Controlled Execution | Is the work on supported, repeatable paths? | Skills, commands, MCP tools, sandbox boundaries |
| Change Validation | Is there evidence the change works? | Tests, lint, hooks, diagnostics |
| Reliable Delivery | Does AI speed bypass quality checks? | Human review, approvals, CI/CD, recovery paths |
| Learning Capture | Does the next task benefit from this one? | Loop discovery, reusable SDLC skills, memory |

The loop combines feedforward guides that steer the agent before it acts with feedback sensors that observe results and support self-correction.

## How a run works

1. The user invokes `/better-harness` with a target, decision, acceptance boundary, risks, locale, output mode, provider, and depth.
2. The skill resolves its own root and bundled CLI; it does not search other caches or runtimes.
3. One versioned evidence bundle is collected per authorized provider. Qoder and Cursor produce Canvas reports; other hosts produce self-contained HTML plus Markdown.
4. Three evidence domains stay independent until one lead agent unifies them: session evidence, project harness, and agent customization.
5. Findings are ranked with evidence, impact, expected output, scoped repair, and acceptance checks.
6. Repair can be finding-bound or a manual direct fix; the plan stays reviewable.

Configured assets prove a mechanism exists. Only linked task evidence can show that it was used or improved an outcome. Missing evidence stays explicit.

## CLI

```bash
better-harness report
better-harness doctor --platform all --json
better-harness harness analyze --workspace . --language en --format json
better-harness harness checkup --phase scan --provider qoder --workspace . --json
better-harness upload plan --input task-evidence.json --workspace . --destination <url> --organization <id>
better-harness commands --json
```

Node engine: `>=22.20.0 <25.0.0`; npm `>=10.9.3 <12.0.0`.

## Host coverage

- Qoder Desktop ships a built-in entry point; no marketplace or local plugin installation is required.
- Qoder CLI can use the version bundled with Qoder Desktop; standalone installs follow the native plugin planner.
- Claude Code installs the repository as a marketplace, then `better-harness@better-harness`.
- Codex Desktop/CLI, Cursor, GitHub Copilot CLI, Qwen Code, Pi, Kimi Code, WorkBuddy, Grok, and DeepSeek Harness have host-specific adapters with different output and lifecycle coverage.

The repository ships the `better-harness` and `intent-correlation-analysis` skills. The marketplace plugin inspected during this study exposed `better-harness` and `init`.

## Evidence and privacy boundaries

- Evidence is scoped to an authorized workspace, provider, depth, and time window.
- Session transcripts, global memory, user-home files, installed plugins, and marketplaces require explicit scope.
- The diagnostics command reports no network use, no writes, no transcript reads, and user-home path redaction.
- Behavior claims stay scoped to the task episode and the observed mechanism.

## Limitations

- Repository main is alpha while npm and marketplace versions lag at different points. Do not assume every README feature exists in an installed host.
- One report cannot prove causal improvement; only comparable later reports show a trend, and even that is not proof.
- Evidence can be missing or partial; the report must say so instead of inferring.
- Canvas, HTML, Markdown, and inline-only outputs are not interchangeable.
- It reviews the workflow around the code, not the correctness of a specific diff.

## How to use it well

- Run it after repeated friction, a workflow change, or a release retrospective.
- Use it to find missing validation, delivery bypasses, and lost lessons; keep code review and verification skills for code correctness.
- Read findings with their evidence and never quote a dimension score as proof.
- Authorize only the workspace and providers the user named.

## References

- `README.md`, `models/agent-work-loop.md`, `skills/better-harness/SKILL.md`, `docs/docs/installation.mdx`
- https://martinfowler.com/articles/harness-engineering.html
- https://qoderai.github.io/better-harness/
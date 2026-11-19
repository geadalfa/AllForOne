---
name: repo-architecture-mentor
description: Use when the user asks to learn, trace, teach, or safely refactor a codebase from Bitbucket/GitHub — onboarding to unfamiliar repositories, explaining request/data flows, mapping architecture, understanding the tech stack (Go, PHP, Python, Swift, React Native, Java, Kotlin, SQL, Kafka, Redis, ML, macOS, Windows), or planning behavior-preserving refactors. Produces repo maps, Mermaid diagrams, file:line explanations, and gated refactor plans.
---

# Repo Architecture Mentor

Turn any repository into a teachable system model: **repo map → execution flow → technology semantics → architecture boundaries → safe refactor plan**.

## When to activate

Activate when the user says any of:
- "pelajari repo ini", "ajari saya baca code", "jelaskan flow login/transaksi/…"
- "repo Bitbucket …, bagaimana arsitekturnya?"
- "saya mau refactor X tanpa merusak flow"
- "teknologi apa saja yang dipakai repo ini?"
- "bandingkan arsitektur aplikasi saya dengan aplikasi berbayar"

## Non-negotiables

1. **Evidence or silence** — every code claim cites `path:line`; no abstract symbol names.
2. **Never invent** files, functions, routes, env vars, config keys, or APIs. Verify with repo search or official docs.
3. **Never print secrets** from `.env`, config, tokens, cookies. Redact.
4. **No refactor before** a repo map, blast-radius list, and characterization tests exist.
5. **Respect repo conventions** over personal style.
6. **Bitbucket is internal**: confirm VPN/DNS before blaming MCP.
7. **Teach, don't dump** — diagram first, then one concept at a time, then a 3-question checkpoint.

## Preflight (always)

```bash
nslookup bitbucket.example.com
```

| Result | Action |
|---|---|
| Resolves | Bitbucket MCP is usable |
| `Non-existent domain` | VPN is off; use a local clone or ask the user to connect VPN. Do not claim the MCP is broken. |

MCP routing:
- `mcp__bitbucket__list_repositories` → project key usually `example repositories` (verify, do not guess silently)
- `mcp__bitbucket__get_repository_archive` → full snapshot without cloning
- `mcp__bitbucket__get_diff` / `get_pull_request` → PR review flow
- `mcp__github__*` → public portfolio repos

Never put credentials in chat. Prefer an existing clone; clone only with the user's authenticated remote.

## Step 1 — Build the Repo Map

Run the bundled scanner:

```bash
python <qoder-config>/skills/repo-architecture-mentor/scripts/repo_recon.py <repo-path> --md <repo-path>/REPO_MAP.md
```

Windows: `python $HOME/.qoder/skills/repo-architecture-mentor/scripts/repo_recon.py ...`

The scanner reports: language mix, manifests and dependencies, entry-point candidates, route candidates, infra/CI, migrations, Kafka/Redis hints, tests, and a suggested reading order.

Then read, in order:
1. `README`, build/run scripts, env sample, CI/CD.
2. Manifests: `go.mod`, `composer.json`, `package.json`, `requirements.txt`, `Package.swift`, `build.gradle(.kts)`, `*.csproj`.
3. Entry points and route tables.
4. Domain/service layer → repositories/DAOs → migrations/schema.
5. Async: producers, consumers, topics, retry, DLQ.
6. Tests and fixtures.

## Step 2 — Six-level curriculum

| Level | Question | Deliverable | Pass criteria |
|---|---|---|---|
| L0 Orientation | What is this system and how is it built? | Repo map + C4 context/container diagram | the user can name runtime, build, deploy, and external systems |
| L1 Entry points | Where does execution start? | Table of entry points → handlers | Every entry point has `file:line` |
| L2 Request flow | How does one request travel? | Mermaid sequence diagram frontend → gateway → service → DB/cache/queue | the user can re-trace the flow aloud |
| L3 Data & async | Where does state live and how does it move? | ER/schema summary, topic list, cache key patterns | Invariants and idempotency points identified |
| L4 Architecture | Which patterns and boundaries exist? | C4 component + layering/boundary audit | Violations and coupling risks listed |
| L5 Change safety | How do we change it without breaking it? | Blast-radius map + characterization test plan + ADR | Tests fail before fix and pass after |
| L6 Refactor | Execute the change incrementally | Small commits, tests each step, rollback plan | `verify-before-done` passes |

## Step 3 — Teaching protocol

1. **Pass 1 — Bird's-eye:** repo tree, runtime, C4 context/container.
2. **Pass 2 — Walkthrough:** one real request end-to-end as a sequence diagram with `file:line` citations.
3. **Pass 3 — Deep dive:** data model, async contracts, failure modes, security boundaries.
4. **Checkpoint:** ask 3 questions; require the user to explain the flow back. Correct gaps with code evidence.
5. **Language:** Bahasa Indonesia; keep identifiers and code in the original language.

## Technology playbooks

| Stack | Start here | Key idioms | Risk spots |
|---|---|---|---|
| **Go** | `main.go`, `cmd/*/main.go`, router setup | `context.Context`, goroutines/channels, error wrapping, interfaces | goroutine leaks, ignored errors, shared mutable state, N+1 in loops |
| **PHP / Laravel** | `public/index.php`, `routes/*.php`, `app/Http/Controllers` | service container, middleware, Eloquent, queues | mass assignment, N+1, fat controllers, unvalidated input |
| **PHP / CodeIgniter 3** | `index.php`, `application/config/routes.php`, controllers | `$this->load`, models, helpers | SQL injection via raw queries, CSRF gaps, legacy globals |
| **Python** | `server.py`, `app.py`, `manage.py`, `pyproject.toml` | decorators, context managers, async/await or threads | blocking calls in async paths, global state, unpinned deps |
| **Swift / iOS** | `App.swift`, `*AppDelegate.swift`, `SceneDelegate` | ARC, `[weak self]`, `@MainActor`, async/await | retain cycles, main-thread work, force unwraps |
| **React Native** | `App.tsx`, navigation stack, `package.json` | hooks, memoization, server vs client state | re-render storms, stale closures, bridge-heavy loops |
| **Kotlin / Android** | `MainActivity.kt`, `Application`, navigation graph | coroutines, `StateFlow`, lifecycle | main-thread I/O, leaked contexts, flow collection without lifecycle |
| **Java / Spring** | `Application.java`, `@RestController` | DI, transactions, JPA | N+1, transaction boundaries, blocking in reactive stack |
| **Windows / .NET** | `Program.cs`, `*.csproj` | DI, async/await, `IDisposable` | sync-over-async, unbounded threads, registry side effects |
| **ML** | notebooks, training script, inference service | data leakage, train/serve skew, metrics | random seeds, feature drift, unversioned datasets |
| **macOS** | `Package.swift`, `*.xcodeproj`, LaunchAgents | XPC, sandboxing, code signing | entitlements, sandbox escapes, signing drift |

## Architecture pattern detection

| Pattern | Cues | Main risk |
|---|---|---|
| Layered / MVC | controllers → services → repositories | layer leakage, fat controllers |
| Clean / Hexagonal | domain has no framework imports; ports/adapters | over-abstraction, mapping overhead |
| Modular monolith | one deploy, strong module folders | hidden cross-module coupling |
| Microservices | separate deploys, API gateway, service discovery | distributed transactions, latency |
| Event-driven | Kafka/RabbitMQ producers and consumers | schema drift, duplicate delivery |
| CQRS | separate write/read models | eventual consistency UX |
| Saga / orchestration | compensating actions, state machine | partial failure handling |
| BFF | per-client gateway | duplicated business logic |
| MVVM / VIPER (iOS) | view models, interactors, routers | massive view controllers |
| Redux / Flux (RN) | store, actions, reducers | boilerplate, stale selectors |

Always verify the pattern from imports and call direction, never from folder names alone.

## Safe refactor protocol — 7 gates

1. **Baseline map** — repo map + C4 + current flow diagrams.
2. **Characterization tests** — capture current behavior, including edge cases.
3. **Blast radius** — call graph, symbol references, API/DB/Kafka contracts, cross-repo consumers.
4. **Invariants** — list what must not change (status codes, payload shape, topic names, cache keys, ordering).
5. **ADR / spec** — write the decision and the rollback plan before editing.
6. **Incremental execution** — smallest reversible step, tests after each step.
7. **Verify & close** — build, lint, tests, smoke flow, diff review; then update docs and memory.

Reuse these installed skills instead of re-implementing them:
`polyglot-code-intelligence`, `zero-regression-refactoring`, `spec-driven-development`, `systematic-debugging`, `verify-before-done`, `no-invented-code`, `token-efficient-reconnaissance`, `system-analyst-diagramming`.

## Tool routing

| Need | Tool |
|---|---|
| Repository list / archive / PR diff | Bitbucket MCP |
| Public portfolio repos | GitHub MCP |
| Local file evidence | Read / Grep / Glob |
| Repo map | `scripts/repo_recon.py` |
| Database schema/data | `database-query` skill / DataGrip profiles |
| Kafka inspection | `kafka-dev-access` skill |
| Business requirements | Confluence MCP + `frd_trd_confluence_engineering_playbook` knowledge |
| Ticket traceability | Jira MCP / `jira-spreadsheet-automation` |
| Diagrams | Mermaid + `system-analyst-diagramming` |

## Output templates

**Repo Map**
```markdown
# <Repo> — System Map
## Runtime & build
## Languages & frameworks
## Entry points (file:line)
## Request flow (Mermaid)
## Data & async
## Architecture pattern & boundaries
## Top risks
## Suggested learning order
```

**Flow Trace**
```markdown
## Trigger
## Transport & contract
## Routing & middleware
## Business logic
## Persistence / cache / queue
## Failure modes
## Evidence (file:line)
```

**Refactor Plan**
```markdown
## Goal & non-goals
## Blast radius
## Invariants
## Characterization tests
## Steps (each reversible)
## Verification
## Rollback
```

## References

- `references/resource_catalog.md` — 60+ verified learning links (languages, data, architecture, code intelligence, journals).
- `references/architecture_patterns.md` — detection checklist per pattern.
- `references/refactor_safety.md` — characterization testing and blast-radius recipes.
- Knowledge: `<plugin-root>/knowledge/repo_architecture_learning_os.md`

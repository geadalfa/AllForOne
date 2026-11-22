# Refactor Safety Recipes

## Gate 1 — Baseline map

- Run `scripts/repo_recon.py` and archive `REPO_MAP.md`.
- Draw current flow with Mermaid; link `file:line` for every hop.
- Record current API contracts (status codes, payloads), DB schema, Kafka topics, cache keys.

## Gate 2 — Characterization / golden master tests

| Stack | Recipe |
|---|---|
| Go | Table tests around handler/service; `httptest` for HTTP; golden files for JSON |
| PHP/Laravel | Feature tests with `RefreshDatabase`; snapshot JSON responses |
| PHP/CI3 | Controller tests via CI test hooks; capture raw HTTP output |
| Python | `pytest` + `responses`/`respx`; snapshot dict/JSON |
| Swift | XCTest around view models; snapshot UI if needed |
| React Native | Jest + React Native Testing Library; mock network |
| Kotlin/Java | JUnit + MockK/Mockito; contract tests for APIs |
| .NET | xUnit + `WebApplicationFactory`; Verify snapshots |
| ML | Freeze dataset + seed; snapshot metrics with tolerance |

Rule: the test must **fail before the fix/refactor** if behavior changes, and pass after.

## Gate 3 — Blast radius

```bash
# symbol references
rg -n "FunctionName|ClassName|endpoint/path" .

# call sites by language
rg -n "\.MethodName\(" --glob '*.go'
rg -n "->methodName\(|::methodName\(" --glob '*.php'
rg -n "method_name\(" --glob '*.py'

# contracts
rg -n "topic|Topic|queue|redis|Key" --glob '*.{go,php,py,kt,java,ts,js}'
```

Inventory:
- HTTP consumers (mobile, web, other services)
- Kafka consumers and producers
- Shared DB tables/views
- Cache keys and TTL assumptions
- Scheduled jobs and retries

## Gate 4 — Invariants

Write them down explicitly:
1. Response shape and status codes.
2. Auth/permission behavior.
3. Ordering and idempotency.
4. Topic names, partition keys, message schema.
5. Cache key format and TTL.
6. Database constraints and transaction boundaries.
7. Feature flags and rollout behavior.

## Gate 5 — ADR / spec

Minimum ADR fields: context, decision, alternatives, consequences, rollback.
Use `spec-driven-development` for interface contracts and 1:1 test parity.

## Gate 6 — Incremental execution

- One behavior change per commit.
- Keep old path behind a flag until the new path is verified.
- Run tests after each step; never batch unrelated refactors.
- Use `zero-regression-refactoring` quality gates.

## Gate 7 — Verify & close

- Build, lint, unit, integration, contract tests.
- Smoke the real user flow (UI → API → DB → async).
- Diff review by an independent agent or human.
- Update repo map, ADR, and knowledge/memory.

## Rollback checklist

- Revert commit is possible without data migration.
- Feature flag off restores old behavior.
- DB migration has a down path or is backward-compatible.
- Kafka schema change is backward-compatible.
- Cache can be flushed without data loss.

## Anti-patterns

- Refactoring while adding a feature.
- Changing API + DB + events in one step.
- Deleting "unused" code without reference proof.
- Renaming topics, cache keys, or columns silently.
- Trusting folder names as architecture evidence.

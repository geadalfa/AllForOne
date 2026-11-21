---
name: konoha-agentic-workflow
description: Run the Konoha engineering workflow in Codex with triage, bounded repository research, architecture review, implementation, verification, and documentation.
---

# Konoha engineering workflow

Use the workflow for multi-file features, architecture audits, refactors, or changes across subsystems. Keep the user's scope and the repository's instructions at each stage.

| Responsibility | Codex workflow |
|---|---|
| Sannin · triage | Use [plan-first](../plan-first/SKILL.md) to scope the task, identify dependencies, and choose checks. |
| Genin · repository reconnaissance | Use [token-efficient-reconnaissance](../token-efficient-reconnaissance/SKILL.md) to locate call paths and read only relevant regions. |
| Chunin · external research | Consult official docs and versioned primary sources for API and platform contracts. |
| Kage · architecture and review | Use [repo-architecture-mentor](../repo-architecture-mentor/SKILL.md) and [zero-regression-refactoring](../zero-regression-refactoring/SKILL.md) to identify invariants and the affected callers. |
| Jonin · UI | Use [anti-slop-ui-design](../anti-slop-ui-design/SKILL.md) with the existing design system and platform conventions. |
| Anbu · operations and QA | Use [systematic-debugging](../systematic-debugging/SKILL.md) and [software-qa-and-ui-testing](../software-qa-and-ui-testing/SKILL.md) to test real entry points and diagnose failures. |
| Tokubetsu-Jonin · write-up | Use [human-technical-writing](../human-technical-writing/SKILL.md) for the exact requested artifacts and report. |

These labels describe responsibilities. Work through them in the current session. When the user requests delegation and the host provides agents, hand off bounded independent tasks with clear scope, then review the results.

## Delivery stages

1. Confirm the goal, change boundaries, and expected result.
2. Map source modules, dependencies, and data flows that affect that result.
3. Verify current API and library contracts against evidence.
4. Define the interface changes, retained invariants, and regression checks.
5. Implement the smallest coherent set of changes and test incrementally.
6. Exercise the normal entry points. Compare actual output against the intended behavior.
7. Review the complete diff for unintended changes, data exposure, and unsupported assumptions.
8. Document verified results and unresolved items with [verify-before-done](../verify-before-done/SKILL.md).

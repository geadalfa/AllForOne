# Claude Trading Skills Toolkit

Source · https://github.com/tradermonty/claude-trading-skills · TraderMonty · MIT · commit `a627d17dd1d8fde1c8fa73b3cc69ffe83b33cb71` · verified 2026-11-18 · scope: public

## What it is

A bundle of **74 Claude Code skills** for discretionary US-equity investors: market-regime review, screening, trade planning, risk gates, journaling, and strategy research. It is explicitly **not a signal service and places no orders** (`README.md:25` disclaims financial, tax, and legal advice; AS IS).

Repo is ~74 MB / 57 MB on disk: `skills/` 19 MB, `examples/` 10 MB, `skill-packages/*.skill` ZIPs 5.4 MB, `scripts/` 3.3 MB, `docs/` 3 MB. Bulk is 5 sample JPEG charts plus duplicated example copies.

## Why it matters

Two distinct values for the user, and they are not equally strong:

1. **Generic QA tooling (high value, zero finance risk).** `dual-axis-skill-reviewer` and `data-quality-checker` are domain-agnostic. The reviewer scores any `skills/*/SKILL.md` tree deterministically 0–100 and accepts `--project-root`, so it can gate the user's own skill library. The FMP hits in that skill are test fixtures and a secret-denylist regex (`scripts/run_dual_axis_review.py:700`), not a runtime dependency.
2. **Personal trading discipline (medium value).** Keyless local calculators and a thesis journal that complement the existing `financial-etf-advisory` and `holistic-financial-advisor` skills. Pure computation, no API, no advice.

## Key concepts

- **Thesis lifecycle** (`trader-memory-core`): YAML state machine from screening idea → open position → closed → postmortem, with MAE/MFE and R-multiple.
- **Circuit breaker**: account-level drawdown and losing-streak halts that block new risk.
- **Pre-trade discipline gate**: blocks planless, oversized, revenge-risk, or regime-blocked entries before manual order entry.
- **Edge pipeline**: `edge-hint-extractor` → `edge-concept-synthesizer` → `edge-strategy-designer` → `edge-strategy-reviewer` → `edge-pipeline-orchestrator`. The reviewer exists specifically to counter overfitting.
- **Regime breadth scoring**: 0–100 composite from public CSVs, no key.

## Workflow / architecture

Each skill is self-contained: `skills/<name>/SKILL.md` (YAML `name` + `description` only) plus `scripts/` and `scripts/tests/`. 27 skills import shared helpers (`fmp_client`, `_market_calendar`, `_price_bars`) but **each vendors its own copy**, so copying a directory wholesale works. No `${CLAUDE_PLUGIN_ROOT}`, no `allowed-tools`, no hooks, no `plugin.json` inside skills.

Root `pyproject.toml`: Python >=3.11.5,<3.14 (packaged skills floor 3.9); deps `jsonschema`, `packaging`, `pyyaml`, `requests`, `scipy`, `yfinance`.

## Verified behavior

Installed subset (12 skills) at `<qoder-config>/skills/`, all entry points run with `--help` under `<qoder-config>/tools/trading-skills/.venv/bin/python`:

| Skill | Entry point | Status |
|---|---|---|
| position-sizer | `position_sizer.py` | OK |
| futures-position-sizer | `futures_position_sizer.py` | OK |
| drawdown-circuit-breaker | `check_circuit_breaker.py` | OK |
| pre-trade-discipline-gate | `check_pre_trade_discipline.py` | OK |
| weekly-performance-digest | `generate_weekly_digest.py` | OK |
| edge-strategy-reviewer | `review_strategy_drafts.py` | OK |
| data-quality-checker | `check_data_quality.py` | OK |
| dual-axis-skill-reviewer | `run_dual_axis_review.py` | OK |
| market-breadth-analyzer | `market_breadth_analyzer.py` | OK |
| uptrend-analyzer | `uptrend_analyzer.py` | OK |
| trader-memory-core | `thesis_store.py` | OK |
| backtest-expert | guidance-only, no top-level script | n/a |

Functional smoke test (real calculation, not just `--help`):
`position_sizer.py --account-size 10000 --entry 100 --stop 95 --risk-pct 1` → **20 shares @ $100.00, position $2,000.00, risk $100.00 (1.0%)**. Arithmetic independently checks out: $100 risk ÷ $5 stop distance = 20 shares.

`trader_memory_cli.py store --help` works under system Python but its subprocess wrapper prefers `uv run --project <repo-root>` (`trader_memory_cli.py:116`) and falls back to plain `python3`, which lacks `yaml`. **Call `thesis_store.py` / `thesis_ingest.py` / `thesis_review.py` directly with the venv interpreter**, or install `uv`.

Upstream quality signals: 526 `test_*.py` files, every skill has `scripts/tests`, 11 CI workflows (lint, test, coverage, metadata, workflow-replay, security, supply-chain, dependency-review, compat-smoke, FMP/public-CSV contract canaries), `detect-secrets` baseline present.

## Limitations

- **Verification is mostly self-declared absent.** `skills-index.yaml` marks `financial_logic_review`, `empirical_validation`, and `data_provenance` as `not_verified` for most skills. No code was executed upstream by us beyond the installed subset; no API calls, no live data.
- **Single-maintainer data risk.** `market-breadth-analyzer` and `uptrend-analyzer` fetch the author's own GitHub Pages CSVs (`tradermonty.github.io/market-breadth-analysis`, `raw.githubusercontent.com/tradermonty/uptrend-dashboard`). If he stops publishing, they break. Keyless ≠ dependency-free.
- **Keys.** Verified env vars in code: `FMP_API_KEY` (59 hits, ~20 skills), `FINVIZ_API_KEY`, `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`, `ALPACA_PAPER`, `FXMACRODATA_API_KEY`, `MT5_TERMINAL_PATH`. 48 of 74 skills need no paid key. FMP free tier 250 req/day is *claimed, unverified*. FINVIZ Elite $39.50/mo optional.
- **Not installed, and why.** `scenario-analyzer` needs the Claude `Task` tool plus `agents/` subagent types; `skill-designer` pipes to `claude -p --allowedTools`; `skill-idea-miner` reads `~/.claude/projects`; `skill-integration-tester` parses `CLAUDE.md`; `mt5-robot-tester` needs Windows `terminal64.exe`.
- **Soft dependency gaps in the installed subset.** `edge-strategy-reviewer` expects drafts from `edge-strategy-designer` (4 refs, not installed); `pre-trade-discipline-gate` references `exposure-coach` (3 refs, not installed); `weekly-performance-digest` references `signal-postmortem` (1 ref, not installed). They still run, but produce thinner output without those companions.
- **US-only tax/broker content.** `kanchi-dividend-us-tax-accounting` is US tax law, irrelevant to Indonesian tax. Alpaca is a US broker.
- **Path fix applied.** `dual-axis-skill-reviewer/SKILL.md` had 5 occurrences of `~/.claude/skills`; retargeted to `<qoder-config>/skills` on install. Upstream still says "Claude Code will discover the skill" in prose elsewhere.
- Delayed data: `theme-detector:499` notes 15-minute delay (skill not installed).

## How the agent should use it

- **Skill-library QA:** run `dual-axis-skill-reviewer` against `<qoder-config>/skills` with `--project-root` before merging new skills; pair with `agent-asset-hygiene`'s validation gate. This is the highest-value, lowest-risk use.
- **Document QA:** `data-quality-checker` catches price-scale, instrument-notation, date/day-of-week, allocation-total, and unit errors before publishing any market write-up. Supports English and Japanese, **not Indonesian** — treat Indonesian output as unvalidated.
- **Personal discipline journal:** `trader-memory-core` + `position-sizer` + `drawdown-circuit-breaker` + `pre-trade-discipline-gate` + `weekly-performance-digest`, feeding `financial-etf-advisory`. Always use the venv interpreter. Keep the existing domain ethics: no advice, deterministic math, cite evidence.
- **Never** frame output as a signal service or paid investment advice. Indonesian paid investment advice needs OJK licensing; employees of regulated organizations trading US equities need a personal compliance check.

## Claude → Qoder transformation (2026-11-18, second pass)

Two previously-excluded Claude-bound skills were transformed and installed:

**`skill-idea-miner`** — mines session logs for skill ideas.
- Session path retargeted to the verified Qoder location `<qoder-config>/projects/<cwd-slug>/<session-uuid>.jsonl`, overridable via `$QODER_PROJECTS_DIR` (new env var; upstream had none).
- Parser fixed to read `tool_result` blocks **nested inside `user` entries** — the real Qoder shape. Before the fix, error signals counted 0; after, 3 on the real session.
- Both `claude -p` subprocess blocks (`mine_session_logs.py` and `score_ideas.py`) redesigned: the script does all deterministic work, writes `analysis_prompt.md` / `scoring_prompt.md`, sets status `pending_in_session`, prints an explicit "PENDING LLM STEP — ACTION REQUIRED IN THIS SESSION" banner, and exits 0. The agent answers in-session, then re-runs with `--candidates-file` / `--scores-file`. **No subprocess remains; unscored ideas are never silently zeroed.**
- **Verified with real pytest** (installed into the isolated venv): `scripts/tests` → **71 passed**. Real dry-run scan with `--project 7a78c52b` → found 1 project dir, 1 session log, parsed and wrote candidates. Full read-only enumeration by the implementer: 27 dirs / 27 logs, all parse, 223 user messages, 3743 tool uses.
- **Usability caveat:** `PROJECT_ALLOWLIST` still holds upstream trading-repo names (tests assert them), so the **default scan matches 0 of 27 Qoder project dirs**. Always pass `--project <slug-segment>` — a *segment* like `7a78c52b`, not the full slug (a full slug starting with `-` is parsed as a flag and argparse errors).

**`scenario-analyzer`** — 18-month scenario analysis from a news headline.
- `Task` + custom types `scenario-analyst` / `strategy-reviewer` → `Agent` with `subagent_type: general-purpose`; upstream `agents/*.md` role prompts copied to `references/` and inlined into the `prompt` argument.
- Contract test updated to assert `general-purpose` ×2. **Verified: 3 passed.**
- Role prompts retain upstream `model: sonnet` / `color:` metadata; SKILL.md instructs inlining the body only.

**Fixed silent failures in already-installed skills:** `dual-axis-skill-reviewer/SKILL.md:70` (LLM axis was gated on "inside Claude Code" → silently skipped in Qoder, yielding an auto-only score); `run_dual_axis_review.py:9,311` (`~/.claude` → `<qoder-config>`); `trader-memory-core` test assuming upstream repo-root `CLAUDE.md`.

**BLOCKED, not faked:** `engine/`, `cbh/`, `commands/autopilot.md`, `eval/` need a headless `claude -p` CLI. **No Qoder headless CLI exists** (`command -v qoder` → not found). Use the in-session `Agent` tool. Upstream `run_skill_generation_pipeline.py` / launchd scheduling not installed.

10 of the original 12 installed trading skills were verified already clean (zero `claude` hits).

## Side-income angles (honest ratings)

| Angle | Feasibility | Reasoning |
|---|---|---|
| Package the offline risk/journal workflow as a desktop app | Medium | Fits the user's ConvertMyDocuments/DiagnoseMyDisk pattern; sells a tool, not advice. No licensing issue. |
| Sell trading signals or reports | **Low — not advisable** | Upstream forbids signal-service framing, most validation is `not_verified`, and OJK licensing applies to paid advice in Indonesia. |
| Internal QA service for agent skill libraries | Medium-High | The dual-axis reviewer is genuinely reusable and keyless; value is in the method, not the finance domain. |

## References

- Installed skills: `<qoder-config>/skills/{position-sizer,futures-position-sizer,drawdown-circuit-breaker,pre-trade-discipline-gate,weekly-performance-digest,edge-strategy-reviewer,data-quality-checker,dual-axis-skill-reviewer,market-breadth-analyzer,uptrend-analyzer,trader-memory-core,backtest-expert}`
- Runtime setup: `$AGENT_HOME/bin/tools/upstream-toolkits/trading-skills-setup.sh`
- Attribution: `<qoder-config>/skills/_attribution/claude-trading-skills/LICENSE`
- Related knowledge: `financial_market_and_etf_intelligence.md`, `holistic_financial_agent_intelligence.md`
- Related skills: `financial-etf-advisory`, `holistic-financial-advisor`, `agent-asset-hygiene`, `app-opportunity-lab`
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

The Full plugin carries the following 12 workflows. Invoke their scripts from the installed skill directories and follow the per-skill requirements:

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
- Delayed data: `theme-detector:499` notes 15-minute delay (skill not installed).

## How the agent should use it

- **Skill-library QA:** run `dual-axis-skill-reviewer` against the installed plugin with `--project-root <plugin-root>` before merging new skills; pair with `agent-asset-hygiene`'s validation gate. This is the highest-value, lowest-risk use.
- **Document QA:** `data-quality-checker` catches price-scale, instrument-notation, date/day-of-week, allocation-total, and unit errors before publishing any market write-up. Supports English and Japanese, **not Indonesian** — treat Indonesian output as unvalidated.
- **Personal discipline journal:** `trader-memory-core` + `position-sizer` + `drawdown-circuit-breaker` + `pre-trade-discipline-gate` + `weekly-performance-digest`, feeding `financial-etf-advisory`. Always use the venv interpreter. Keep the existing domain ethics: no advice, deterministic math, cite evidence.
- **Never** frame output as a signal service or paid investment advice. Indonesian paid investment advice needs OJK licensing; employees of regulated organizations trading US equities need a personal compliance check.

## Side-income angles (honest ratings)

| Angle | Feasibility | Reasoning |
|---|---|---|
| Package the offline risk/journal workflow as a desktop app | Medium | Requires reviewing distribution terms and separating portfolio tooling from personalized recommendations. |
| Sell trading signals or reports | **Low — not advisable** | Upstream forbids signal-service framing, most validation is `not_verified`, and OJK licensing applies to paid advice in Indonesia. |
| Internal QA service for agent skill libraries | Medium-High | The dual-axis reviewer is genuinely reusable and keyless; value is in the method, not the finance domain. |

## References

- Installed skills: `<plugin-root>/skills/{position-sizer,futures-position-sizer,drawdown-circuit-breaker,pre-trade-discipline-gate,weekly-performance-digest,edge-strategy-reviewer,data-quality-checker,dual-axis-skill-reviewer,market-breadth-analyzer,uptrend-analyzer,trader-memory-core,backtest-expert}`
- Runtime requirements: see each packaged skill. Its Python helpers run in the selected Python environment.
- Attribution: [Claude Trading Skills license](../licenses/claude-trading-skills-LICENSE.txt).
- Related knowledge: `financial_market_and_etf_intelligence.md`, `holistic_financial_agent_intelligence.md`
- Related skills: `financial-etf-advisory`, `holistic-financial-advisor`, `agent-asset-hygiene`, `app-opportunity-lab`
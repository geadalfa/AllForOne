# PaperOrchestra — Automated Research Paper Pipeline

Source · https://github.com/google-research/paper-orchestra · Google Cloud AI Research (Yiwen Song, Yale Song, Tomas Pfister, Jinsung Yoon) · Apache-2.0 · commit `d9bae997e793a015ed38bb1605be9eb58c00284f` (2026-11-15) · paper arXiv:2604.05018 · verified 2026-11-18 · scope: public

`README.md:105`: "not an officially supported Google product."

## What it is

A multi-agent framework that turns raw research materials into a LaTeX paper with simulated peer review and revision. **Not a pip package** — no `setup.py`/`pyproject.toml`; a 9,032-LOC script repo installed via `pip install -r requirements.txt` (18 unpinned deps).

**Status: INSTALLED, PATCHED FOR OPENAI-COMPATIBLE BACKEND, NOT RUN.** Durable runtime at `<qoder-config>/tools/paper-orchestra/` (repo pinned to `d9bae99` with 7 patched files + isolated venv + verified BasicTeX.pkg). Portable installer: `$AGENT_HOME/bin/tools/upstream-toolkits/paper-orchestra-setup.sh`; backend patch: `paper-orchestra-openai-backend.patch`; TeX installer: `basictex-install.sh`; wrapper: `paper-orchestra-run.sh`. the user chose on 2026-11-18: **patch only, do not run** (no compliant key yet) and **install BasicTeX** (needs his admin password).

## Why it matters

the user's daily deliverables are FRD/BRD, user stories, Confluence pages, and PR reviews — structured technical writing under review pressure. PaperOrchestra's **critique-and-revise loop with score-gated accept/revert** is the transferable idea. The code itself is LaTeX-first and Gemini-hardwired, so reuse the pattern, not the pipeline.

## Key concepts

- **Linear 4-stage pipeline with retry**, not a graph or supervisor: Outline → HybridLiterature → SectionWriting → ContentRefinement. `methods/paper_writer.py:33 write_single_paper`, stages at `:93`, `:108`, `:139`, `:167`; `max_n_tries=3` at `:58`.
- **Simulated peer review** (`autoraters/agent_review.py`) plus a **VLM review of rendered PDF page images**, score-gated accept/revert (`content_refinement_agent.py:375-400`), `max_reflections=3`.
- **Grounding to a source of truth**: numbers must verify against `experimental_log.md`; citations only from `citation_map.json`; requests for new experiments are ignored.
- **Pre-flight-only human-in-the-loop**: Streamlit idea/log editors and figure captions. "Begin Writing" sets `locked=True` (`frontend/app.py:705`); all edits become `disabled=locked`; Outline/Citation tabs are read-only (`app.py:251`). **No mid-run approval.**

## Workflow / architecture

Agents (real module paths — `methods/agents/`, not `agents/`):

| Agent | File | Notes |
|---|---|---|
| OutlineAgent | `methods/agents/outline_agent.py:23` | Gemini hard-call at `:51` |
| HybridLiteratureAgent | `methods/agents/literature_review_agent.py:64` | 3 threads; hardcoded `gemini-3-flash-preview` at `:465` |
| SectionWritingAgent | `methods/agents/section_writing_agent.py:43` | **only agent using the router** (`:201`) |
| ContentRefinementAgent | `methods/agents/content_refinement_agent.py:35` | Gemini at `:165`, `:293`, `:520`; sends raw PDF bytes at `:295` |
| PlottingAgent | `methods/agents/plotting_agent.py:204` | 5 threads; depends on sibling PaperBanana repo |

Artifacts: `outline.json` → `outline_v1.json` + `updated_template.tex` + `references.bib` + `citation_map.json` → `raw_draft_paper.tex` → `refined_paper_vN.tex/pdf` → `final_paper.pdf`, plus `peer_reviews/*.json` and worklogs.

LLM router: `utils/llm_backend_utils.py:53/105/164` dispatches on substring `"gpt"`/`"o1"`/`"o3"` (`:73`), else Gemini. **4 of 5 agents bypass the router** and hard-call Gemini; `utils/paper_banana_utils.py` is entirely Gemini-bound.

Env vars: `GEMINI_API_KEY` or `VERTEX_AI_PROJECT` + `VERTEX_AI_LOCATION` (`utils/gemini_utils.py:47-62`, Vertex wins), `OPENAI_API_KEY` (`utils/openai_utils.py:45`), `SEMANTIC_SCHOLAR_API_KEY`, `SMTP_EMAIL`/`SMTP_PASSWORD`. Models: `gemini-3.1-pro-preview`, `gemini-3-pro-image-preview`, `gemini-3-flash-preview`.

Inputs: `raw_materials_dir` (`idea_sparse.md`, `experimental_log.md`, `figures/` + `info.json`) and `latex_template_dir` (`template.tex`, `guidelines.md`, `references.bib`). Only `cvpr2025`/`iclr2025` templates ship. Outputs: `.tex`, `.pdf`, `.bib`, JSON, figures.

## Verified behavior

Install reproduced durably on 2026-11-18 via `paper-orchestra-setup.sh`, exit 0:

- Repo pinned: `git rev-parse HEAD` = `d9bae997e793a015ed38bb1605be9eb58c00284f`.
- Runtime: `<qoder-config>/tools/paper-orchestra/{repo,.venv}`, 497 MB, Python **3.9.6** (only interpreter on this Mac; README wants 3.11).
- **Import check: 18/18 OK** across `methods.paper_writer`, the 5 `methods.agents.*`, `utils.{llm_backend_utils,gemini_utils,openai_utils,pdf_utils,prompt_utils,scholar_utils}`, `autoraters.agent_review`, and the 5 `methods.prompts.*`.
- `pymupdf4llm` resolved to **0.0.27** (the deliberate fix).
- CLI verified: `paper_writing_cli.py --help` → 12 flags. `--raw_materials_dir` and `--latex_template_dir` are **required**. Others: `--output_dir`, `--idea_filename`, `--experimental_log_filename`, `--writer_model_name`, `--reflection_model_name`, `--research_cutoff`, `--use_plotting`, `--plotting_model_name`, `--image_model_name`, `--plotting_max_critic_rounds`. No `console_scripts` entry point.
- Wrapper `paper-orchestra-run.sh --help` works.
- **No generation job was run. No API key was used.**

### The dependency trap (reproduced and fixed)

Upstream pins `pymupdf4llm==2.0`, which is an **intentional empty shim** ("empty package required by pymupdf-2.x"). On Python 3.9 that resolves PyMuPDF 1.26.5 and breaks 6 imports. Installing `pymupdf4llm==0.0.27` afterwards restores all imports. The setup script encodes this fix.

### Confirmed upstream bug

`utils/scholar_utils.py:28` **prints the Semantic Scholar API key to stdout**. Observed live: `Using S2 API Key: None` during import. With a real key set, it would print the secret. **Never set `SEMANTIC_SCHOLAR_API_KEY` in a shared/logging environment without patching this line.**

## Unblock investigation (2026-11-18, second pass) — two "blockers" were false

Re-investigation overturned two of the three original blockers:

| Original blocker | Verdict | Evidence |
|---|---|---|
| PaperBanana sibling repo | **NOT a blocker** | Import is fully lazy: `paper_writing_cli.py:142` → `paper_writer_with_plotting.py:29` → `plotting_agent.py:21` → `paper_banana_utils`. The default path imports only `methods.paper_writer`. `--use_plotting` defaults **False** (`paper_writing_cli.py:70`). Even when enabled, `paper_banana_utils.py:358-361` prints "Proceeding without few-shot" and returns `[]`. The *plot* branch runs matplotlib locally (`:662-668`); only the *diagram* branch calls the image model (`:674`). Canonical repo is `google-research/papervizagent` (Apache-2.0); community mirror `dwzhu-pku/PaperBanana`. Google's dataset is unreleased, so cloning gains nothing. |
| Python 3.11 required | **NOT a blocker** | All 31 repo files AST-parsed with `feature_version=(3,9)`: **0 syntax errors**. No `match`, no PEP 604 unions, no `from __future__`. pydantic 2.13.5, google-genai 1.47.0, openai 2.48.0 all 3.9-compatible. Only interpreter is `/usr/bin/python3` (3.9.6); brew exists at `/opt/homebrew/bin/brew` but no brew/pyenv python. |
| Gemini key | **Real, and patched around** | See below. |
| pdflatex/bibtex | **Real** | `compile_latex` (`pdf_utils.py:169-250`) never raises, but it is fatal downstream: `content_refinement_agent.py:231-233` returns an error string when `initial_draft.pdf` is absent → `paper_writer.py:178` `assert osp.exists(...)` fails → 3 retries → returns False. **No skip-PDF flag exists.** The VLM step is never reached (early return at `:233`), so it does not crash without a PDF. |

### Backend facts (verified, not guessed)

- SDK `google-genai` 1.47.0; only `client.models.generate_content` (`gemini_utils.py:177,308`). No streaming.
- `types.Tool(google_search=types.GoogleSearch())` at `literature_review_agent.py:87`, used at `:468`.
- Native PDF bytes at `llm_backend_utils.py:207` and `content_refinement_agent.py:295`.
- Image gen: `response_modalities=["IMAGE"]` + `types.ImageConfig` (`gemini_utils.py:301-304`).
- `openai_utils.py:48` is `OpenAI(api_key=...)` with no explicit `base_url`, **but openai 2.48.0 `_client.py:250` reads `os.environ["OPENAI_BASE_URL"]`** — env-only redirect works, zero plumbing needed.
- `openai_utils.py:138` splats extra configs into `create()`, so `extra_body` passes through.
- Existing seam already had OpenAI branches for text (`:85`), images (`:143`, base64 `image_url`), and PDF (`:189`, degrades to `load_paper()` text extraction).
- **Router predicate tested before patch:** `qwen3.8-max`, `qwen-max`, `qwen-vl-max`, `qwen-plus` ALL routed to Gemini.
- **A sixth bypass site the first pass missed:** `autoraters/agent_review.py:137,172,200` — three Gemini calls inside the main pipeline via `_get_peer_review`. Left unpatched, reviews silently return score **0.0** (caught at `content_refinement_agent.py:106-109`), making accept/reject meaningless.

## Applied patch — OpenAI-compatible backend (verified offline)

Patch file: `$AGENT_HOME/bin/tools/upstream-toolkits/paper-orchestra-openai-backend.patch` (347 lines, 14,204 bytes, 39-line Apache-2.0 derived-work header + `git diff`). Applies to pinned commit `d9bae99`; `git apply --check --reverse` matches the working tree. **7 files modified, HEAD unchanged, nothing committed or pushed.**

| File | Change |
|---|---|
| `utils/llm_backend_utils.py:16,42-64` | Added `resolve_llm_backend()` + `is_openai_backend()`. `LLM_BACKEND` env wins; else model-name substring `("gpt","o1","o3","qwen")`; else gemini. The four duplicated predicates (`:71,:97,:146,:200`) became one call each. Branch bodies untouched → no regression for gemini users. |
| `methods/agents/outline_agent.py:16,51` | Router text helper, `prompt="\n\n".join(part.text for part in contents)`. |
| `methods/agents/literature_review_agent.py:28-29,465-478,507` | Hardcoded `"gemini-3-flash-preview"` removed → uses `self.model_name`. `extra_body={"enable_search":True}` **only** when backend is openai; otherwise keeps `tools=[self.google_search_tool]`. Synthesis → text helper with `parse_gemini_latex_results` preserved. |
| `methods/agents/content_refinement_agent.py:19-26,165,290,513` | images → `call_llm_with_images`; PDF → `call_llm_with_pdf(...)`; formatting text → `call_llm_with_text_prompt`. `system_instruction` and `parse_gemini_json_latex_response` preserved. |
| `autoraters/agent_review.py:19,137,172,200` | All three peer-review sites routed. Fixes the silent 0.0 reviews. |
| `utils/scholar_utils.py:28` | Key-printing statement **deleted**. |
| `autoraters/citation_f1.py:41` | Second key-print bug found during verification: `print(f"Loaded S2 API Key for this project: {S2_API_KEY}")` → replaced with presence-only boolean. Non-pipeline, but a real secret leak. |

**Independent re-verification (no network, run by me not the implementer):**
- Imports **13/13** core modules OK (18/18 including the 5 `methods.prompts.*`; note `methods.prompts.plotting_agent` does not exist — the fifth is `format_agent`).
- AST `feature_version=(3,9)`: **7/7** changed files pass.
- Router resolution table observed:

| Model | `LLM_BACKEND` unset | `=openai` | `=gemini` |
|---|---|---|---|
| `gemini-3.1-pro-preview` | gemini | openai | gemini |
| `qwen3.8-max` | openai | openai | gemini |
| `qwen-vl-max` | openai | openai | gemini |
| `gpt-4o` | openai | openai | gemini |

- `paper_writing_cli.py --help` exit 0. `scholar_utils` import stdout empty — no leak.
- Remaining Gemini calls in `methods/` + `autoraters/` are intentional: `plotting_agent.py:21` (off by default), `literature_review_agent.py:88,473` (gemini-only branch), `autoraters/sxs_paper_quality.py:27,121` (standalone evaluator, not imported by the pipeline). **Zero direct Gemini calls remain in the default pipeline.**

### What degrades on a Qwen/OpenAI-compatible backend

- **Google Search grounding has no equivalent.** `enable_search` is DashScope-native and may be rejected by a Token Plan gateway. Literature discovery is the weakest link — expect fewer or hallucinated citations. Fallbacks: existing `s2_title_search`, or supply a local `.bib`.
- **Native PDF input lost** → pymupdf text extraction. Layout/figure/margin reasoning degrades.
- **VLM formatting review** needs a VL model (`qwen-vl-max`) via `--reflection_model_name`; otherwise it already degrades to `{"Error":...}` and the loop breaks harmlessly.
- **Image generation avoided entirely** with `--use_plotting false`.
- **Temperature is dropped by the upstream OpenAI seam**, so 0.1/0.4/0.75 do not reach OpenAI endpoints. Inherent to the prescribed helpers, not introduced by the patch.
- JSON/LaTeX parsing: `parse_gemini_*` are pure regex and backend-agnostic — no loss.

## Remaining blockers (honest)

1. **A compliant API key.** the user's Bailian **Token Plan** credential exists (`~/.bailian/config.json`, `active_config=token-plan`), but Bailian's own docs (`base-url.md:127`) state Token Plan is *"仅限 Claude Code、Codex 等 AI 工具交互式使用，不能用于后端服务"* — interactive AI tools only, **not backend services**. PaperOrchestra is a backend batch pipeline. Technically it would likely work; per the documented terms it should not. **the user chose (2026-11-18): patch only, do not run.** A standard DashScope API key (free to create, pay-per-token) is the legitimate path. No Gemini/Vertex/OpenAI/gcloud credential exists on this machine. `bl` 2.8.4 is installed and authenticated.
2. **pdflatex/bibtex — RESOLVED 2026-11-18.** the user ran the installer; BasicTeX-2026 is at `/usr/local/texlive/2026basic/bin/universal-darwin` (pdfTeX 3.141592653-2.6-1.40.29, BibTeX 0.99e). The `sudo tlmgr install` step **failed silently** — `texmf-dist` is root-owned and `tlmgr` refused without root, leaving `silence`, `cleveref`, `enumitem` missing. Fixed without a second password prompt via **usermode**: `tlmgr init-usertree` + `tlmgr --usermode install …` into `~/Library/texmf`. A second, non-obvious gap then appeared: `cvpr.sty:221` loads URW base-35 fonts (`phvb`, `pcrr7t`) that BasicTeX omits, so compilation died with *"Metric (TFM) file not found"* even with every `.sty` present. Fixed by `tlmgr --usermode install collection-fontsrecommended`.
   **Verified by real compilation:** `templates/cvpr2025/template.tex` → pdflatex pass1 **exit 0**, final pass **exit 0**, `template.pdf` **43,975 bytes**. (`bibtex` exits 2 on the bare template because it contains no `\citation` commands — expected, not a failure.) A separate 6-package smoke document also compiled to a 22,564-byte PDF.
   **Caveat:** tlmgr reported `package repository … (not verified: gpg unavailable)`. Packages came from CTAN mirror `mirror.unpad.ac.id` without GPG signature verification because gnupg is absent. Install gnupg if signature verification is wanted. The BasicTeX **.pkg itself was verified** (SHA512 + Apple notarization); the tlmgr packages were not.
   `basictex-install.sh` now installs the fonts collection and falls back to usermode automatically.
3. **Raw materials.** The benchmark dataset is not released (`README.md:50`). the user must supply `idea_sparse.md`, `experimental_log.md`, and `figures/` + `info.json` himself.
4. **Semantic Scholar key** absent. Unauthenticated calls are shared-rate-limited and silently drop papers (`scholar_utils.py:72-73` returns None on non-200). Free to request.

### Cost of one trial run

No pricing or runtime is stated in the repo. Counted from code: **~30 LLM calls per paper** (outline 1, literature N+1 with N≈6 search tasks, section 1, refinement 3, peer review 4 rounds × 4 calls, formatting 2), most carrying full-paper context. Estimate **300k–600k input + 50k–100k output tokens**, and `paper_writer.py:58` retries up to 3× on failure → worst case ~3×. **No `max_tokens` is set anywhere — output is unbounded.** Upstream states 35–45 min per paper (`frontend/app.py:721`).

## Limitations (original, still true)

The three original blockers were re-investigated above: PaperBanana and Python 3.11 are **not** blockers; the Gemini hard-calls are **patched**; pdflatex and a compliant key remain. Do not repeat the old "needs PaperBanana + Python 3.11" claim — it was wrong.

Other limits:
- Benchmark dataset **not released** (`README.md:50`).
- Runtime **35–45 min per paper** (`frontend/app.py:721`). No token/cost figures published.
- Python 3.9 is past EOL; `google-auth` emits FutureWarnings and urllib3 warns about LibreSSL 2.8.3. Imports work, but this is not a supported configuration.
- Evaluation: PaperWritingBench (200 papers), human win-rate margins +50–68% on literature review, +14–38% overall. Author-reported.

## Academic integrity

Positioned as **"submission-ready"** (`README.md:6`). `UNIVERSAL_NO_LEAKAGE_PROMPT` (`utils/prompt_utils.py:15`) is benchmark anti-contamination + double-blind anonymity — **not AI-disclosure**. There is **no authorship or AI-disclosure statement anywhere in the repo**. Ghostwriting submission-ready papers without disclosure is research misconduct; do not build a service on that. Drafting assistance with explicit disclosure is a different, defensible use.

Apache-2.0: keep `LICENSE` and copyright, state changes. No `NOTICE` file ships.

## How the agent should use it

- **Reuse the pattern for FRD/TRD/Confluence**, not the code. Generic and worth stealing: the pipeline+retry skeleton, outline → section → critique loop, score-gated accept/revert, worklog JSON, and grounding-to-source-of-truth prompts. Prompts total only **501 lines** — cheap to rewrite.
- **Replace**: `HybridLiteratureAgent` + `scholar_utils` + Google grounding, all LaTeX (`compile_latex`, templates, `parse_gemini_latex_results`), the peer-review rubric, the VLM PDF formatting review, and PaperBanana. Output is LaTeX-first; Confluence/Markdown needs a new renderer.
- Pair with existing `system-analyst-diagramming`, `frd_authoring_and_evolution`, `human-technical-writing`, and `architecture` skills rather than replacing them.
- If the user ever wants a real run: install BasicTeX, clone PaperBanana, supply a Gemini key, and patch the S2 key print first. Ask before spending 35–45 min of tokens.

## Side-income angles (honest ratings)

| Angle | Feasibility | Reasoning |
|---|---|---|
| Internal FRD/BRD accelerator reusing the critique loop | **High value, low drop-in feasibility** | The loop is genuinely useful for the user's day job; the code needs a renderer swap and a non-Gemini backend. |
| Paid technical-writing / whitepaper service | Medium | Needs Gemini key + TeX + **client disclosure**. Sells drafting, not authorship. |
| Academic paper ghostwriting | **Low — not advisable** | Submission-ready framing, no disclosure guidance, unreleased dataset, misconduct risk. |

## References

- Runtime: `<qoder-config>/tools/paper-orchestra/{repo,.venv}` (machine-local, **not exported**)
- Installer: `$AGENT_HOME/bin/tools/upstream-toolkits/paper-orchestra-setup.sh`
- Wrapper: `$AGENT_HOME/bin/tools/upstream-toolkits/paper-orchestra-run.sh`
- Related knowledge: `frd_authoring_and_evolution.md`, `frd_trd_confluence_engineering_playbook.md`, `human_writing_and_technical_prose.md`, `system_analyst_designer_diagramming.md`
- Related skills: `human-technical-writing`, `system-analyst-diagramming`, `architecture`, `spec-driven-development`
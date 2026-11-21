# PaperOrchestra research and writing pipeline

Source · [Google Research PaperOrchestra](https://github.com/google-research/paper-orchestra) · Apache-2.0 · source snapshot `d9bae997e793a015ed38bb1605be9eb58c00284f` · [paper](https://arxiv.org/abs/2604.05018).

## Workflow

PaperOrchestra organizes a draft as outline, initial content, related work, citation checks, optional figures, review, and revision. The reviewed snapshot produces LaTeX and uses a simulated reviewer to select revisions. Keep the draft, review findings, scores, source mapping, and revision history available to a human editor.

The portable pattern works in Codex on a supplied paper or technical document:

1. Gather the brief, evidence, and format requirements. Build an outline with each claim tied to a source or clearly marked as an open question.
2. Draft a section and record the evidence supporting its main claims. Check citations, units, tables, and figure captions.
3. Run a separate review against a defined rubric for correctness, evidence, clarity, and coverage. Name the sections and claims that need attention.
4. Revise against the findings, then re-score and compare with the baseline. Keep the history and preserve changes that improve the draft without introducing unsupported claims.
5. Verify every citation is real and relevant. Make experimental results, limitations, and the distinction between observed data and generated prose clear.

## Runtime considerations

The upstream project is a Python source checkout with a LaTeX toolchain. Inspect the current upstream README, requirements, and provider setup before installing or running it. Provider credentials, paper rendering, literature lookup, and model output validation are separate dependencies. The provider needs to allow the requested batch workload.

In the reviewed snapshot, some agents referenced Gemini clients directly while other calls went through a backend router. A single router change cannot establish backend compatibility. Trace each enabled stage, including review, plotting, and grounding. A client may transmit source text or attached PDF content, so verify what each step would send before calling a remote provider.

## Evaluation

Start with a small public draft and a fixed review rubric. Measure unsupported citations, revision quality, and runtime cost. Record external failures separately from reviewer scores so that a failed call never looks like a zero-quality draft. Ask for human review before submitting or publishing the result.

Related: [technical writing](human_writing_and_technical_prose.md), [evidence and verification](disciplined_software_engineering_framework.md).

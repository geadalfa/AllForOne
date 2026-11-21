---
name: llm-weight-ablation-and-steering
description: Evaluate benign behavior steering and ablation experiments on local open-weight language models using fixed test sets and quality, safety, and resource checks.
---

# Local model steering and ablation evaluation

Use this workflow for an authorized experiment, such as reducing formulaic writing or improving a local model's coding style. Select a baseline model and define acceptance criteria for quality, expected safeguards, performance, and resource usage.

1. Record the model revision, license, context settings, hardware, and evaluation runtime. Verify the installed runtime's options before running the experiment.
2. Build a versioned test set of benign target examples and unrelated regression cases. Separate development and held-out examples. Keep private prompts and identifiers out of shared datasets.
3. Evaluate prompt conditioning first. For a weight or adapter change, use an isolated copy, vary one factor at a time, and retain the baseline and any rollback artifacts.
4. Compare factuality, style adherence, task completion, expected safeguard behavior, and latency at fixed generation settings. Where logits are comparable, report score changes or divergence separately from end-task quality.
5. Save the configuration, dataset version, measurements, and supported deployment targets. Use a held-out run to verify an exported checkpoint before recommending it.

Report platform and model limits from the measured setup. Record VRAM peaks and the exact precision or quantization used.

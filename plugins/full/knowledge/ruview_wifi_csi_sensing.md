# RuView WiFi CSI Sensing

Source · https://github.com/ruvnet/RuView · ruvnet (rUv) · MIT · commit `13b47883a73d5070f35a3f04aec2ffa778b47e29` (2026-11-17) · verified 2026-11-18 · scope: public

## What it is

A WiFi **Channel State Information (CSI)** sensing platform, formerly `wifi-densepose`. ESP32 nodes stream per-subcarrier I/Q over UDP; a Rust DSP chain extracts spatial, presence, and vital-sign signals. Marketing claim: "real-time spatial intelligence, vital sign monitoring, and presence detection — all without a single pixel of video."

Evaluate with consent and labeled simulation data. Real hardware is a separate prerequisite.

## Why it matters

It is the most technically interesting repo in the batch and the least immediately usable. Its real value to the user is (a) a credible camera-free presence sensor for Home Assistant if he ever buys nodes, and (b) an unusually honest example of measured-vs-claimed evidence grading that is worth copying into his own review culture.

## Key concepts

- **CSI vs RSSI.** CSI = per-subcarrier amplitude/phase, rich enough for pose and vitals. RSSI = one coarse signal strength number, enough for presence/motion only.
- **DSP chain** (`v2/crates/wifi-densepose-signal/README.md`): Hampel filter, SpotFi, Fresnel-zone model, BVP — peer-reviewed algorithms cited.
- **Vitals heuristic**: bandpass + zero-crossing. Breathing 0.1–0.5 Hz, heart 0.8–2 Hz. This is a heuristic, not a clinical measurement.
- **Presence**: phase-variance threshold.
- **Calibration dependency**: cross-subject generalization collapses without in-room calibration.

## Workflow / architecture

~91 Rust crates. Axum sensing-server (HTTP 3000, WS 3001, UDP 5005). React + Three.js UI. Tauri v2 desktop (WIP). PyO3 wheel. WASM edge modules. ESP-IDF firmware.

Size: 429 MB repo = mostly git history. HEAD tree 115 MB: assets 27 MB marketing images, docs 22 MB (14 MB PNGs + **328 ADRs**), v2 20 MB (includes a committed `.vite` cache), archive 13 MB (10.4 MB `sample_csi_data.json`), firmware 7.6 MB prebuilt bins, releases 2.5 MB (`RuView-Desktop-0.3.0-macos-arm64.zip`). Bundled weights only ~950 KB; good models live externally on HuggingFace.

GPU needed only for training (RTX 5080; OccWorld 3.4 GB VRAM). Inference is CPU-only; M4 Pro numbers published.

## Hardware requirements

| Path | Hardware | Capability |
|---|---|---|
| Full CSI | **ESP32-S3** (~$9) or **ESP32-C6** (~$6–10). C3 and original ESP32 unsupported. | Pose, vitals, presence |
| Legacy CSI | Intel 5300 / Atheros AR9580 | Linux only |
| QCA9300 | adapter gated | **simulator only** |
| Nexmon pcap | Raspberry Pi, vendored `rvcsi` | capture |
| macOS RSSI | CoreWLAN Swift helper (`archive/v1/src/sensing/mac_wifi.swift`) | coarse presence/motion, no pose, low-fidelity vitals |
| Windows RSSI | `netsh` / `wlanapi` | same, community-verified (issue #36) |
| No hardware | Docker simulated mode (default), `--source simulate`, deterministic proof replay | **simulation, not measurement** |

## Documented install/run commands (NOT executed)

- `docker run ruvnet/wifi-densepose` — requires `RUVIEW_API_TOKEN`, **exits 64 without it**.
- `pip install wifi-densepose` — the real package. `ruview` on PyPI is a **3 KB meta-package shim**; a genuine `macosx_11_0_arm64` wheel (342 KB) exists.
- `cd v2 && cargo build --release`
- `./install.sh --profile rust|verify|docker` — installs rustup, brew openblas, pip deps. The `python` profile references a **stale `v1/` path** and falls back to numpy/scipy.
- `python archive/v1/data/proof/verify.py` — numpy/scipy + the 10 MB sample, no hardware.
- `./verify`, `scripts/prove.sh` — adds `cargo test`, `docker pull`.
- `npx @ruvnet/ruview` — npm 0.9.3 verified; read-only `doctor` / `claim-check` / MCP work hardware-free.
- `esptool` flash + `provision.py` for real nodes.

## Verified behavior

Nothing was executed, installed, or captured. All findings come from reading the sparse checkout (14 MB of text/docs/source) plus the GitHub trees API for sizes.

**Evidence quality is unusually self-critical.** `PROOF.md` grades claims MEASURED / CLAIMED / GATED and publishes retractions:

| Claim | Retracted to |
|---|---|
| 100% presence accuracy | **82.3%** on held-out triplet |
| 91.86% pose | **82.69%** MM-Fi torso-PCK@20 |
| WiFlow-STD checkpoint | **refuted at 0.08%** |
| `pose_v1.safetensors` (507 KB) | first-cut **PCK@20 = 3.0%**; its runtime is a `confidence=0` stub |

MM-Fi study (`docs/benchmarks/mmfi-wifi-sensing-study.md`, with repro scripts): zero-shot cross-subject collapses (pose 64%, action 10%); ~30 s in-room calibration fixes it; **a random encoder performs ≈ the trained one**.

Tests self-reported: 3,128 Rust (README badge says 1463, witness log says 1,031 — different vintages), 183 Python, 39 CI workflows. No peer review of the project itself. No clinical vitals validation. ±1 BPM, >95% occupancy, and 10M+ downloads are **asserted, not measured**.

Firmware README: person-count is a slot heuristic; presence false-positives on **fans and microwaves**; no on-device NN. Docs are heavily AI-generated (witness audit by "Claude Opus 4.6"); `PROOF.md` explicitly answers "AI slop" accusations.

Named person-identification was measured **NOT separable** on WiFi-only channels — an honest negative result. `wifi-veil` anti-sensing defense numbers are all SYNTHETIC/L0.

## Limitations

- Real vitals/pose/through-wall sensing: **impossible without ESP32 nodes**.
- macOS arm64 verdict: **PARTIAL** — Docker arm64 simulated demo, pip arm64 wheel for offline DSP on synthetic/recorded CSI, Rust source build, RSSI mode, prebuilt desktop zip (WIP). All of these are simulation or coarse presence, not the advertised capability.
- `install.sh --profile python` is broken against the current tree (stale `v1/` path).
- Test counts are inconsistent across README, badge, and witness log — treat all self-reported counts as unreliable.
- Calibration is mandatory per room and per subject; without it, accuracy collapses.

## Privacy, consent, and health constraints

This is the part that must not be skipped.

- **Through-wall sensing of non-consenting people is covert surveillance.** The README itself markets "passive/covert" military and border uses. That framing is a red flag, not a feature.
- The claim that it "avoids GDPR/HIPAA by design" is **misleading** — `docs/integrations/home-assistant.md` explicitly disclaims compliance. Consent and local law still apply. For the user: **UU PDP**, and health-derived data is sensitive personal data.
- Responsible use: own premises only, **all occupants' consent**, `--privacy-mode` (vitals stay on-device; semantic states remain health-derived), never monitor other people, never point it at a neighbour's space.
- Medical modules are "research tools, not FDA-approved medical devices" (`docs/edge-modules/medical.md`, test-enforced). Firmware vitals are "not a medical measurement". **Never present output as a health diagnosis or fall-detection guarantee.**

## How the agent should use it

- Treat as **knowledge only** until the user owns ESP32-S3/C6 nodes. Review the upstream prerequisites and acquisition risks before installing hardware or software.
- If asked to evaluate, lead with the retractions table, not the headline claims. Copy `PROOF.md`'s MEASURED/CLAIMED/GATED grading into the user's own review and benchmark write-ups — it is a better evidence discipline than most internal docs.
- If a demo is wanted, use the deterministic proof replay and label every number as simulated.
- Pair with `ha-mcp` only for presence/automation, never for health claims.

## Side-income angles (honest ratings, hardware assumed)

| Angle | Feasibility | Reasoning |
|---|---|---|
| Camera-free Home Assistant presence / HVAC automation | Medium-High | Presence + MQTT/HA integration already shipped; no health claims; consent straightforward in own home. |
| Consent-based elder fall/inactivity monitor for own family | Medium | Accuracy unvalidated; **never a medical product**. Liability and consent are the hard parts, not the code. |
| Calibrated installation service | Medium | Sells labour and calibration, not health outcomes. Requires hardware and per-room work. |
| Pet-vs-human CSI classifier | **Low** | Calibration guide admits no pet filter exists. Open research gap, not a product. |

## References

- Upstream docs worth reading: `README.md`, `PROOF.md`, `docs/user-guide.md`, `docs/build-guide.md`, `docs/calibration-guide.md`, `docs/benchmarks/mmfi-wifi-sensing-study.md`, `docs/benchmarks/pose-estimation-cog.md`, `docs/edge-modules/medical.md`, `docs/integrations/home-assistant.md`, `firmware/esp32-csi-node/README.md` + `RUNBOOK.md`, `v2/crates/wifi-densepose-signal/README.md`, `harness/ruview/README.md` + `.harness/claims.json`
- Related knowledge: `ha_mcp_home_assistant_automation.md`, `app_opportunity_lab_playbook.md`, `psychology_mental_health_and_modern_problems.md`
- Related skills: `app-opportunity-lab`, `anti-slop-ui-design`, `privacy-publish-gate`
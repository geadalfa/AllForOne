---
name: mfg-unlock-installer
description: Use when installing, verifying, or reverting DLSS multi-frame generation unlocks on RTX 20/30/40/50 for heavy single-player games — MFG Unlock (ReShade add-on) or DLSS Unlocked (OptiScaler proxy), including 3x–6x tuning, route selection, and anti-stacking checks.
---

# DLSS MFG Unlock Installer

## When to activate

Activate when the user asks to:
- install or enable **DLSS multi-frame generation (3x/4x/6x)** in a single-player game on an RTX 20/30/40/50 GPU;
- choose between **MFG Unlock** (ReShade add-on) and **DLSS Unlocked** (OptiScaler proxy);
- add frame generation to a game that has DLSS Super Resolution but no native frame generation;
- diagnose why MFG is not offered, stuck at 2x, not loading, or crashing;
- swap, back up, or revert a DLSS-G mod stack.

Do **not** use for multiplayer or anti-cheat titles, or for ordinary in-game graphics settings without a mod.

## Non-negotiables

1. **Single-player only.** Both routes patch or proxy the graphics pipeline; anti-cheat systems may treat that as tampering.
2. **One DLSS-G patcher per game folder.** Never stack MFG Unlock with DLSS Unlocked/OptiScaler or a second ReShade.
3. **Back up before overwrite.** Record sizes and hashes for every replaced DLL, INI, and manifest.
4. **Exact provider gate for MFG Unlock DLSS-G.** Use a 310.x `nvngx_dlssg.dll`; a 3.5.x DLSS 3 snippet has no multi-frame code.
5. **No FPS claim without measurement.** A menu entry or a Present-based counter is not proof of presented frames.
6. **Restart the game** after changing backend, multiplier, or provider.
7. **Per-game install.** There is no global install for either route.
8. **RTX 20/30 needs HAGS** for the MFG Unlock DLSS-G path, and the first launch may need a second start so the add-on can register early loading.

## Route decision

| GPU and game state | Preferred route | Fallback |
|---|---|---|
| RTX 50, native MFG | Use the game's native MFG; install nothing | MFG Unlock only for experimentation or a dynamic ceiling |
| RTX 40, game has native DLSS Frame Generation | MFG Unlock, DLSS-G backend | XeMFG DLSS-G if unstable; DLSS Unlocked if OptiScaler or DLSS-NR is needed |
| RTX 30/20, game has native DLSS Frame Generation | DLSS Unlocked with native `dlssg_sm86` | MFG Unlock experimental RTX 20/30 DLSS-G path |
| Any RTX, game has DLSS Super Resolution but no frame generation | MFG Unlock XeMFG backend, or Add frame generation | DLSS Unlocked when OptiScaler bridging is required |
| Game needs DLSS-NR, FSR 3.1 bridging, or a custom upscaler | DLSS Unlocked | MFG Unlock only if it supports the game |
| Multiplayer or anti-cheat | Stop. Do not install. | None |

## Workflow

1. **Recon** — run `route` and `status`. Record:
   - GPU name and driver;
   - game executable, graphics API, and whether native DLSS Frame Generation exists;
   - `nvngx_dlssg.dll`, `sl.interposer.dll`, `dxgi.dll`, `version.dll`, `winmm.dll` versions;
   - existing ReShade, OptiScaler, MFG Unlock, or DLSS Unlocked leftovers.
2. **Decide** — choose exactly one route from the table. State the reason.
3. **Back up** — copy every file that will be overwritten into `.allforone_mods/_backup_<route>_<timestamp>/`; verify counts and sizes.
4. **Install** — Route A (MFG Unlock) or Route B (DLSS Unlocked), below.
5. **Verify** — read logs and in-game telemetry before claiming success.
6. **Tune** — test 2x, then 3x, then 4x. Lower the multiplier if pacing, artifacts, or input latency is poor.
7. **Revert** — restore the backup and remove the route's files if the result is worse.

## Route A: MFG Unlock (ReShade add-on)

1. Install ReShade with **full add-on support**. If another proxy already owns `dxgi.dll`, resolve the conflict first.
2. Place `renodx-mfgunlock.addon64` beside the game executable or in the game's RenoDX add-on folder.
3. Ensure a 310.x `nvngx_dlssg.dll`. Replace an old provider from TechPowerUp only after backing up the original.
4. Launch the game, open the ReShade overlay, and select **MFG Unlock**.
5. Choose the method:
   - **DLSS-G** for the lightest RTX 40/50 native path;
   - **XeMFG DLSS-G** for native-frame-generation games that need better stability;
   - **XeMFG** for games without native frame generation.
6. Set `ForceMultiplier` to 3 or 4. Use 5/6 only as an experiment.
7. For a game with DLSS Super Resolution but no frame generation, enable **Add frame generation**; install Streamline 2.14.16 from the panel when the game has no Streamline of its own.
8. On RTX 20/30, confirm HAGS is on and start the game twice after the first install.

## Route B: DLSS Unlocked (OptiScaler proxy)

1. Download the latest `dlss-unlocked-setup-*.exe` or `dlss-unlocked-standalone-*.zip` release.
2. Windows: run the setup and select the game executable folder.
3. Standalone or Linux: extract the package contents into the executable folder, keeping the root proxy, `OptiScaler.ini`, `nvngx*.dll`, `OptiScaler/`, `OptiScaler/dlssg_sm86/`, `OptiScaler/streamline/`, and optional `REPatch/` and `Licenses/` together.
4. If ReShade already uses `dxgi.dll`, use the package's documented alternate proxy name such as `version.dll`.
5. Launch the game, open the OptiScaler overlay, and confirm `MfgUnlock=true` and `MfgUnlocker=auto` in the **DLSS Multi-Frame Generation (MFG)** section.
6. Set the multiplier ceiling, test 2x first, then 3x/4x.
7. Linux/Proton: use `install.sh` or the manual layout, then launch with `WINEDLLOVERRIDES="dxgi=n,b" PROTON_ENABLE_NVAPI=1 PROTON_NVIDIA_NVCUDA=1 %command%`.

## Verification

### MFG Unlock

- `ReShade.log`: add-on loaded, DLSS-G backend selected, provider 310.9.x validated, frame-multiplier override live.
- ReShade **Add-ons → MFG Unlock**: renderer detected, provider found, architecture gates rewritten, `slDLSSGSetOptions` and `slDLSSGGetState` intercepted, runtime status OK.
- `slDLSSGGetState` telemetry is a sample, not a direct multiplier readout. Corroborate with FrameView or a presentation trace.

### DLSS Unlocked

- The OptiScaler overlay opens and the **DLSS Multi-Frame Generation (MFG)** section shows the active unlocker and ceiling.
- Confirm which proxy DLL the game actually loaded, the `OptiScaler.ini` values, and `OptiScaler/dlssg_sm86/` on RTX 20/30.
- Measure real presentation pacing; do not trust a menu label alone.

## Tool

`<plugin-root>/tools/mfg_unlock_setup.py` (portable mirror: `<qoder-config>/tools/mfg_unlock_setup.py`)

```bat
python <plugin-root>/tools/mfg_unlock_setup.py route --game "<game-dir>"
python <plugin-root>/tools/mfg_unlock_setup.py status --game "<game-dir>"
python <plugin-root>/tools/mfg_unlock_setup.py verify --game "<game-dir>"
python <plugin-root>/tools/mfg_unlock_setup.py backup --game "<game-dir>"
python <plugin-root>/tools/mfg_unlock_setup.py set-multiplier --game "<game-dir>" --value 4
python <plugin-root>/tools/mfg_unlock_setup.py install --game "<game-dir>" --reshade-setup <exe> --addon <file> --multiplier 4 --yes
python <plugin-root>/tools/mfg_unlock_setup.py shyvortex-status --game "<game-dir>"
python <plugin-root>/tools/mfg_unlock_setup.py shyvortex-install --game "<game-dir>" --archive <zip> [--proxy version]
python <plugin-root>/tools/mfg_unlock_setup.py shyvortex-revert --game "<game-dir>" --yes
python <plugin-root>/tools/mfg_unlock_setup.py revert --game "<game-dir>" --backup <dir> --yes
```

The tool never downloads binaries. Download ReShade, the MFG Unlock add-on, and the DLSS Unlocked archive from their official sources first.

## Outputs

- Chosen route with a one-line reason.
- Verified install with log or overlay evidence.
- Backup path plus file counts and sizes.
- Active backend, multiplier, provider version, Streamline version, and proxy name.
- Clear revert instructions.
- Honest statement of what was and was not measured.

## References

- Knowledge: `<plugin-root>/knowledge/dlss_mfg_unlock_non_rtx50.md`
- Repo: https://github.com/mavismmg/MFGAdaUnlock-RenoDx
- Repo: https://github.com/ShyVortex/dlss-unlocked
- ReShade: https://reshade.me/
- NVIDIA Streamline: https://github.com/NVIDIA-RTX/Streamline/releases

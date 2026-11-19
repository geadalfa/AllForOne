---
name: mfg-unlock-installer
description: Use when installing, verifying, or reverting MFGAdaUnlock-RenoDx in a DLSS-G game on modern GPUs, configuring 3x–6x frame generation, or swapping out ShyVortex/OptiScaler. Produces a verified ReShade add-on install with backup and log evidence.
---

# MFG Unlock Installer

## When to activate

Activate when the user asks to:
- install or swap **MFGAdaUnlock-RenoDx** in a game;
- enable **3x/4x/6x DLSS frame generation** on modern GPUs;
- replace **ShyVortex/dlss-unlocked** or OptiScaler with MFGAdaUnlock;
- verify why MFGAdaUnlock is not loading, which backend is active, or whether quality patches applied;
- revert to the previous mod stack.

Do **not** use for ordinary in-game graphics settings without a mod, or for multiplayer/anti-cheat titles.

## Non-negotiables

1. **Single-player only.** ReShade full add-on support is unsigned; never use in multiplayer/anti-cheat games.
2. **Back up before removal.** Verify sizes/counts before deleting ShyVortex/OptiScaler files.
3. **One DLSS-G patcher.** Never stack ShyVortex/OptiScaler and MFGAdaUnlock in the same game folder.
4. **Exact provider gate.** Quality patches need DLSS-G 310.9.0 / 310.9.1 / 310.9.16; other providers fail closed.
5. **No FPS claims without measurement.** Addon load ≠ in-game multiplier verified.
6. **Restart the game** after changing backend, multiplier, or quality settings.
7. **Per-game install.** ReShade + addon live in the game folder; there is no global install.

## Workflow

1. **Recon** — locate the executable folder; record `nvngx_dlssg.dll` version, existing `dxgi.dll` identity, `version.dll`/`winmm.dll` (ASI/RED4ext), and ShyVortex leftovers.
2. **Backup** — copy ShyVortex files + manifest + game `UserSettings.json` to `.allforone_mods/_backup_shyvortex_<date>/`; verify.
3. **Remove old proxy** — delete `dxgi.dll` (OptiScaler), `OptiScaler.ini`, `OptiScaler.log`, `nvngx*.dlssnr.dll`, `OptiScaler/`.
4. **ReShade** — install **full add-on support** as `dxgi.dll`:
   `ReShade_Setup_6.8.0_Addon.exe --headless --api dxgi "<game exe>"`
5. **Addon** — place `renodx-mfgunlock.addon64` next to the game exe.
6. **Config** —
   - `MFGAdaUnlock.ini`: `[Backend] Selected=DLSSG`, `[DLSSG] XmxGenerator=0`.
   - `ReShade.ini`: `[RenoDX.MFGUnlock] ForceMultiplier=4`, `DynamicMFG=0`.
   - Game selector: set the multiplier if the game exposes one (Cyberpunk: `DLSS_MultiFrameGeneration=x4`).
7. **Verify log** — `ReShade.log` must show `DLSS-G backend`, provider `310.9.x`, and `frame-multiplier override is live`; no `ERROR`/`FATAL`.
8. **In-game test** — load a save; ReShade overlay `Home` → MFG Unlock → Backend = DLSS-G, multiplier = 4x. Check latency/artifacts.
9. **Revert** — restore backup, remove addon/ReShade files, or run ReShade setup with `--state uninstall`.

## Outputs

- Verified install with ReShade log evidence.
- Backup path + file counts/sizes.
- Active backend, multiplier, provider version, Streamline version.
- Clear revert instructions.
- Honest statement of what was and was not measured.

## Tool

`<plugin-root>/tools/mfg_unlock_setup.py` (portable mirror: `<qoder-config>/tools/mfg_unlock_setup.py`)

```bat
python <plugin-root>/tools/mfg_unlock_setup.py status --game "<game-dir>"
python <plugin-root>/tools/mfg_unlock_setup.py verify --game "<game-dir>"
python <plugin-root>/tools/mfg_unlock_setup.py backup --game "<game-dir>"
python <plugin-root>/tools/mfg_unlock_setup.py set-multiplier --game "<game-dir>" --value 4
python <plugin-root>/tools/mfg_unlock_setup.py install --game "<game-dir>" --reshade-setup <exe> --addon <file> --multiplier 4 --yes
python <plugin-root>/tools/mfg_unlock_setup.py revert --game "<game-dir>" --backup <dir> --yes
```

## References

- Knowledge: `<plugin-root>/knowledge/cyberpunk_mfg_ada_unlock_2026-11-16.md`
- Knowledge: `<plugin-root>/knowledge/gpu_dlss_mfg_mods_and_runtime_patching.md`
- Repo: https://github.com/mavismmg/MFGAdaUnlock-RenoDx
- Repo: https://github.com/ShyVortex/dlss-unlocked
- ReShade: https://reshade.me/

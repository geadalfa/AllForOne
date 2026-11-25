# DLSS Multi-Frame Generation Unlock on Non-RTX 50 GPUs

Source: `mavismmg/MFGAdaUnlock-RenoDx` 1.10.1 (MIT, released 2026-11-17) and `ShyVortex/dlss-unlocked` NR-v0.9.95 (MIT, released 2026-11-20). Verified 2026-11-21 against the upstream READMEs and release notes.

## What this is

Two independent community routes unlock DLSS Frame Generation and Multi-Frame Generation (MFG) on NVIDIA RTX 20, 30, and 40 cards, even though NVIDIA ships multi-frame generation for RTX 50 only.

- **MFG Unlock** is a ReShade add-on (`.addon64`) that patches the DLSS-G runtime in memory. It unlocks 3x–6x on RTX 40, an experimental DLSS-G path on RTX 20/30, and an Intel XeMFG backend on RTX 20/30/40/50. It does not replace game binaries.
- **DLSS Unlocked** is an OptiScaler-based proxy package. It installs `dxgi.dll` or another proxy name plus `OptiScaler/`, a native `dlssg_sm86` MFG unlocker for RTX 20/30, the RTX 40 Ada unlock, Streamline 2.14.16, and optional DLSS Neural Rendering components.

Both are per-game installs. Neither is a global driver mod.

## Why it matters

- A heavy single-player game can render at a comfortable base frame rate and present 3x or 4x frames on an RTX 20/30/40 card.
- Frame generation improves presentation smoothness. It does not reduce simulation or input latency. A low base frame rate stays low-latency-poor even when the counter looks high.
- The two routes have different footprints and conflicts. Pick one per game.

## GPU support matrix

| Route | RTX 20 | RTX 30 | RTX 40 | RTX 50 | Mechanism |
|---|---|---|---|---|---|
| MFG Unlock DLSS-G | Experimental | Experimental | Supported | Supported | NVIDIA DLSS-G generator, 3x–6x |
| MFG Unlock XeMFG DLSS-G | Tested on RTX 3060 Ti | Tested on RTX 3060 Ti | Tested | Tested | Intel XeFG model inside DLSS-G presentation |
| MFG Unlock XeMFG backend | Supported | Supported | Supported | Supported | Intel XeFG with its own presenter; 2x–6x |
| DLSS Unlocked | Supported | Supported | Supported | Not targeted | Native `dlssg_sm86` on 20/30; Ada unlock up to 6x on 40 |

RTX 50 cards already have native MFG. Installing an unlock there is useful only for experimentation, dynamic MFG ceilings, or games that expose fewer options than the hardware supports.

## Choose a route

1. **Game has native DLSS Frame Generation, RTX 40:** MFG Unlock with the DLSS-G backend is the lightest option. Use XeMFG DLSS-G when the DLSS-G backend is unstable or the game's menu clamps the multiplier.
2. **Game has native DLSS Frame Generation, RTX 20/30:** DLSS Unlocked's `dlssg_sm86` path is the simplest native route. MFG Unlock's RTX 20/30 DLSS-G path is experimental and needs early add-on loading plus HAGS.
3. **Game has no native frame generation:** MFG Unlock's XeMFG backend can consume DLSS Super Resolution, the game's own XeSS-FG, or FSR 3.1 frame-generation inputs. MFG Unlock 1.10.x can also add frame generation to some Streamline or NGX-only games; this is experimental.
4. **Game uses OptiScaler, DLSS Neural Rendering, or FSR 3.1 bridging:** DLSS Unlocked is the all-in-one package.
5. **Multiplayer or anti-cheat title:** do not install either route.

## Requirements

### MFG Unlock

- ReShade with full add-on support. The add-on is not a ReShade effect.
- A game that ships DLSS Frame Generation through Streamline with a modern `nvngx_dlssg.dll` (310.x). Games on the old DLSS 3 snippet (3.5.x) need a newer provider DLL beside the executable.
- Windows. Direct3D 12 is the main path; Vulkan support is experimental.
- Hardware-accelerated GPU scheduling (HAGS) for the RTX 20/30 DLSS-G path.
- For games with DLSS Super Resolution but no Streamline, NVIDIA Streamline 2.14.16 files in `MFGUnlock-Streamline`; the 1.10.1 panel can download and verify them.
- Do not stack it with OptiScaler or another DLSS-G patcher in the same game folder.

### DLSS Unlocked

- A DirectX 12 game that natively supports DLSS upscaling and DLSS Frame Generation. The upstream README states that for MFG to appear in the game's graphics settings, the game must natively support the feature.
- Windows, or Linux/Proton with the documented DLL overrides.
- One proxy name per game. Use `dxgi.dll` when ReShade is absent; rename to `version.dll` or another supported proxy when ReShade already owns `dxgi.dll`.
- Do not stack it with MFG Unlock, ReShade's `dxgi.dll`, or another OptiScaler copy.

## Route A: MFG Unlock (ReShade add-on)

1. Locate the game executable folder. Record the existing `dxgi.dll`, `version.dll`, `winmm.dll`, `nvngx_dlssg.dll`, `sl.interposer.dll`, and any OptiScaler files.
2. Back up the game's `nvngx_dlssg.dll` and any existing proxy DLL.
3. Install ReShade with full add-on support. If another proxy already exists, resolve the conflict before continuing.
4. Download `renodx-mfgunlock.addon64` from the MFG Unlock 1.10.1 release.
5. Place the add-on beside the executable, or in the RenoDX add-on folder used by that game.
6. If the game's provider is older than 310.x, replace it with a current `nvngx_dlssg.dll` from TechPowerUp and keep the backup.
7. Launch the game, open the ReShade overlay, and select **MFG Unlock**.
8. Pick the method: DLSS-G for the lightest native path, XeMFG DLSS-G for native-frame-generation games that need better stability, or XeMFG for games without native frame generation.
9. Set the multiplier to 3x or 4x first. Treat 5x/6x as experimental and measure pacing and input latency.
10. For a game with DLSS Super Resolution but no frame generation, enable **Add frame generation** and install Streamline 2.14.16 from the panel when the game has no Streamline of its own.
11. On RTX 20/30, start the game twice after the first install so the add-on can add itself to early loading, and confirm HAGS is on.

## Route B: DLSS Unlocked (OptiScaler proxy)

1. Locate the game executable folder and back up every file the package will overwrite.
2. Download `dlss-unlocked-setup-NR-v0.9.95.exe` or `dlss-unlocked-standalone-NR-v0.9.95.zip`.
3. Windows automated route: run the setup, select the executable folder, and finish the wizard.
4. Standalone route: extract the archive into the executable folder. Keep the root proxy, `OptiScaler.ini`, `nvngx.dll_dlssnr.dll`, `nvngx_dlssnr.dll`, `OptiScaler/`, `OptiScaler/dlssg_sm86/`, `OptiScaler/streamline/`, and the optional `REPatch/` and `Licenses/` folders together.
5. If ReShade already uses `dxgi.dll`, rename the package proxy to `version.dll` as documented by the package.
6. Launch the game and open the OptiScaler overlay. In the **DLSS Multi-Frame Generation (MFG)** section, confirm `MfgUnlock=true` and `MfgUnlocker=auto`, then set the multiplier ceiling and test 2x before 3x/4x.
7. Linux/Proton: use the bundled `install.sh` or the manual layout, then launch with `WINEDLLOVERRIDES="dxgi=n,b" PROTON_ENABLE_NVAPI=1 PROTON_NVIDIA_NVCUDA=1 %command%`.

## Verification

### MFG Unlock

- ReShade log: the add-on loaded, the DLSS-G backend was selected, the provider version is 310.9.x, and the frame-multiplier override is live.
- ReShade **Add-ons → MFG Unlock**: renderer detected, provider found, architecture gates rewritten, `slDLSSGSetOptions` and `slDLSSGGetState` intercepted, runtime status OK.
- The presentation count from `slDLSSGGetState` is a telemetry value, not a direct multiplier readout. Corroborate with FrameView or a presentation trace.
- In-game: the game's own menu may still show its native maximum; the add-on can force a higher multiplier. A menu entry alone is not proof that extra frames are being presented.

### DLSS Unlocked

- The OptiScaler overlay opens and the **DLSS Multi-Frame Generation (MFG)** section shows the active unlocker and multiplier ceiling.
- Confirm the proxy DLL that the game actually loaded, the `OptiScaler.ini` values, and the presence of `OptiScaler/dlssg_sm86/` on RTX 20/30.
- Measure real presentation pacing. Do not claim a frame rate from a menu item or a Present-based counter alone.

## Tuning and ergonomics

- Keep the base rendered frame rate high enough for comfortable input. 3x/4x is most defensible when the base is around 60 FPS or the game remains responsive.
- Enable NVIDIA Reflex when the game offers it.
- Test 2x first, then 3x, then 4x. Stop increasing when pacing, artifacts, or input latency become noticeable.
- For motion-sensitive players, fix FOV, disable motion blur and camera shake, and keep frame pacing stable before raising the multiplier.
- HDR caveats: NVIDIA DLSS-G does not generate frames on an FP16/scRGB swap chain. Turn the game's HDR off or use the XeMFG method. RenoDX HDR in an SDR game can make the add-on step aside; use the game's own HDR or disable RenoDX's swap-chain upgrade.

## Limitations and failure modes

- MFG Unlock's RTX 20/30 DLSS-G path is experimental. Quality patches made for RTX 40 are not applied; the add-on rewrites the provider's GPU code for SM86/SM75.
- Streamline 1.x games (for example, The Last of Us Part I) are not supported by the Add frame generation path.
- Games with no usable HUD-less image interpolate the HUD with the scene; HUD fixes are game-specific.
- DLSS Unlocked is a large package, uses a proxy DLL, and conflicts with ReShade's `dxgi.dll` unless the proxy name is changed.
- Neither route fixes missing or incorrect motion vectors, depth, exposure, or camera data from the game.
- Anti-cheat systems may treat proxy DLLs or memory patches as tampering. Use single-player only.
- No frame-rate percentage claim is valid without measuring the specific game, GPU, driver, resolution, and multiplier.

## Revert

- MFG Unlock: remove `renodx-mfgunlock.addon64`, the `MFGAdaUnlock.ini`/panel settings, and ReShade if it was installed only for this mod; restore the backed-up `nvngx_dlssg.dll` and proxy DLL.
- DLSS Unlocked: run the package's uninstaller or `install.sh uninstall` on Linux, or restore the backup of every overwritten file and remove `OptiScaler/`, `REPatch/`, and the proxy DLL.
- Never leave two DLSS-G patchers in the same folder.

## Agent workflow

1. Identify the GPU, driver version, game API, and whether the game has native DLSS Frame Generation.
2. Inspect the executable folder for `nvngx_dlssg.dll`, `sl.interposer.dll`, ReShade, OptiScaler, and MFG Unlock leftovers.
3. Recommend one route from the matrix. Do not install both.
4. Back up every file that will be replaced and record hashes.
5. Install, then verify with logs and in-game telemetry.
6. Tune the multiplier downward if pacing or latency is poor.
7. Record the exact provider, Streamline, proxy, and add-on versions so a later change is traceable.
8. Refuse multiplayer/anti-cheat targets and refuse to stack patchers.

## References

- MFG Unlock: <https://github.com/mavismmg/MFGAdaUnlock-RenoDx> · release 1.10.1 · MIT.
- DLSS Unlocked: <https://github.com/ShyVortex/dlss-unlocked> · release NR-v0.9.95 · MIT.
- ReShade: <https://reshade.me/>
- NVIDIA DLSS frame-generation DLL builds: <https://www.techpowerup.com/download/nvidia-dlss-3-frame-generation-dll/>
- NVIDIA Streamline releases: <https://github.com/NVIDIA-RTX/Streamline/releases>
- OptiScaler: <https://github.com/optiscaler/OptiScaler>
- dlssg_for_sm86: <https://github.com/sdli1995/dlssg_for_sm86>

License note: both upstream projects are MIT. Third-party binaries bundled by their releases keep their own licenses. AllForOne does not redistribute those binaries; download them from the upstream releases.

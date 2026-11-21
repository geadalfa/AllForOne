---
name: automated-game-modding
description: Discover installed games, validate mod compatibility against executable versions, resolve dependency trees, stage archives, and safely deploy/undeploy mods with transactional SHA-256 rollback and live in-game editing support.
---

# Automated Game Modding & Crash-Free Safety Skill

Resolve `<skill-dir>` from the directory of this installed SKILL.md and `<plugin-root>` from its grandparent. Replace placeholders with absolute paths when running commands from a different directory.

Use this skill whenever the user requests discovering installed PC games, downloading, installing, verifying, or customizing game mods (from Nexus Mods, GitHub, Steam Workshop, Modrinth, etc.) without corrupting vanilla files or causing crash-to-desktop (CTD) loops.

---

## 1. Safety Invariants (Strict Non-Destructive Modding)

Every modding task executed by the agent MUST follow these 5 core rules:

| Invariant | Mandatory Constraint | Rationale |
| :--- | :--- | :--- |
| **1. No Silent Clobber** | NEVER overwrite vanilla game binaries (`.exe`, `.pak`, `.bundle`, `.bsa`). | Protects game files from corruption; allows clean verification via Steam/Epic. |
| **2. Binary Version Gate** | Match `FileVersion` / `ProductVersion` of `.exe` with native hook DLLs. | Prevents silent memory address misalignment crashes on game boot. |
| **3. Staging Isolation** | Extract untrusted archives to `$AGENT_HOME/staging/`, never direct to game root. | Prevents messy partial extractions and allows inspecting FOMOD XMLs. |
| **4. Transactional Manifest** | Record relative paths and SHA-256 hashes in `.allforone_mods/<mod>/manifest.json`. | Enables atomic rollback if installation encounters errors midway. |
| **5. Non-Destructive Patch** | Never modify installed mod source files in-place; create higher-priority override patches. | Allows updating mods without losing user customizations and tuning. |

---

## 2. Deterministic CLI Execution (`game_mod_tool.py`)

The agent utilizes `<plugin-root>/tools/game_mod_tool.py` as the sensory-motor engine for modding:

### Command Matrix
```bash
# 1. Discover all installed Steam and Epic games on the user's workstation
python "<plugin-root>/tools/game_mod_tool.py" discover

# 2. Inspect game executable version, detect mod frameworks (RED4ext, SKSE, BepInEx, etc.)
python "<plugin-root>/tools/game_mod_tool.py" inspect "<game_path>"

# 3. Validate NEXUS_API_KEY from the environment
python "<plugin-root>/tools/game_mod_tool.py" validate-key

# 4. Deploy staged mod files with transactional manifest
python "<plugin-root>/tools/game_mod_tool.py" deploy "<staging_path>" "<game_path>" --name "<mod_name>"

# 5. Undeploy mod cleanly (reverting unmodified files, backing up user edits)
python "<plugin-root>/tools/game_mod_tool.py" undeploy "<game_path>" "<mod_name>"
```

---

## 3. Mod Acquisition Protocol

### 3.1. Nexus Mods API
- Nexus Mods REST API (v1) and GraphQL (v2) require a **Personal API Key**. Use the environment for an explicitly authorized credential.
- Direct API download links (`/download_link.json`) are officially supported on **Nexus Premium** accounts.
- **For Free Accounts**: Download via browser or `nxm://` URL handler into `$HOME/Downloads/game-mods/` or `$HOME\Downloads\`, then hand off the file path to the agent for automated staging, dependency checking, and deployment.

### 3.2. GitHub Open-Source Frameworks
- Core script engines and hook loaders (e.g., RED4ext, redscript, ArchiveXL, Codeware, Mod Settings, SKSE, BepInEx) should be fetched directly from official GitHub releases to ensure 100% binary matching with the user's game patch.

---

## 4. In-Game Live Editing & Hot-Reload Protocol

When requested to adjust game values, stats, or visuals during gameplay:
1. **Bethesda Creation Engine**: Generate non-destructive record overrides using Mutagen.
2. **Unity Games**: Hot-reload properties via BepInEx Harmony patches or local IPC socket.
3. **Unreal Engine 4/5**: Adjust live actors and dump schemas using RE-UE4SS Lua bridge.
4. **REDengine (Cyberpunk 2077)**: Configure dynamically via `Mod Settings` menu or `.reds` observers without quitting the game.

---

## 5. ReShade Add-ons & DLSS-G / MFG Modding Protocol

When deploying graphics pipeline mods (such as ReShade Add-ons, MFGAdaUnlock, or OptiScaler/ShyVortex):
1. **Per-Game Scope**: ReShade and its native add-ons (`.addon64`) operate per executable directory (e.g. `bin\x64\`); no global hooks exist.
2. **Zero-Stacking Invariant**: Never allow both OptiScaler/ShyVortex (`dxgi.dll` proxy) and MFGAdaUnlock (`ReShade` `dxgi.dll` + `.addon64`) in the same game folder. Both attempt to hook or patch Streamline DLSS-G (`sl.interposer.dll`), causing fatal collisions.
3. **Provider Version Gate**: MFGAdaUnlock DLSS-G quality patches require exact provider DLL versions (`nvngx_dlssg.dll` 310.9.0 / 310.9.1 / 310.9.16). Unmapped or DriverStore copies fail closed.
4. **Tool Delegation**: Use `python <plugin-root>/tools/mfg_unlock_setup.py` (or the `mfg-unlock-installer` skill) for automated status, verification, backup, and multiplier tuning.

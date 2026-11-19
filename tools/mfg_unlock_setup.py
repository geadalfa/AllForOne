#!/usr/bin/env python3
"""MFGAdaUnlock-RenoDx setup, verification, backup, and revert tool."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ADDON = "renodx-mfgunlock.addon64"
MFG_INI = "MFGAdaUnlock.ini"
RESHADE_INI = "ReShade.ini"
RESHADE_DLL = "dxgi.dll"
SESSION = "MFGAdaUnlock.session"
SHY_FILES = [
    "dxgi.dll",
    "OptiScaler.ini",
    "OptiScaler.log",
    "nvngx.dll_dlssnr.dll",
    "nvngx_dlssnr.dll",
]
SHY_DIRS = ["OptiScaler"]
SHY_MANIFEST = Path(".allforone_mods") / "DLSS_Unlocked_OptiScaler"
MFG_SECTION = "RenoDX.MFGUnlock"


def die(message: str, code: int = 1) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(code)


def run(cmd: list[str], timeout: int = 300) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def bin_dir(game: Path) -> Path:
    candidate = game / "bin" / "x64"
    return candidate if candidate.is_dir() else game


def find_exe(game: Path) -> Path:
    candidate = bin_dir(game) / "Cyberpunk2077.exe"
    if candidate.is_file():
        return candidate
    for exe in bin_dir(game).glob("*.exe"):
        if (exe.parent / "nvngx_dlssg.dll").is_file():
            return exe
    die(f"no game executable with nvngx_dlssg.dll found under {game}")


def file_version(path: Path) -> str:
    if not path.is_file():
        return "missing"
    escaped = str(path).replace("'", "''")
    try:
        result = run(
            ["powershell", "-NoProfile", "-Command",
             f"(Get-Item -LiteralPath '{escaped}').VersionInfo.FileVersion"],
            timeout=20,
        )
        return result.stdout.strip() or "unknown"
    except (OSError, subprocess.TimeoutExpired):
        return "unknown"


def binary_marker(path: Path, marker: bytes) -> bool:
    if not path.is_file():
        return False
    try:
        return marker in path.read_bytes()
    except OSError:
        return False


def ini_get(path: Path, section: str, key: str) -> str | None:
    if not path.is_file():
        return None
    current = None
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw.strip()
        match = re.match(r"^\[(.+?)\]$", line)
        if match:
            current = match.group(1)
            continue
        if current and current.lower() == section.lower():
            match = re.match(rf"^{re.escape(key)}\s*=\s*(.*)$", line, re.I)
            if match:
                return match.group(1).strip()
    return None


def ini_set(path: Path, section: str, key: str, value: str) -> None:
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines() if path.is_file() else []
    out: list[str] = []
    in_section = False
    done = False
    for line in lines:
        if re.match(r"^\s*\[", line):
            if in_section and not done:
                out.append(f"{key}={value}")
                done = True
            in_section = line.strip().lower() == f"[{section.lower()}]"
            out.append(line)
            continue
        if in_section and re.match(rf"^\s*{re.escape(key)}\s*=", line, re.I):
            if not done:
                out.append(f"{key}={value}")
                done = True
            continue
        out.append(line)
    if in_section and not done:
        out.append(f"{key}={value}")
        done = True
    if not done:
        if out and out[-1].strip():
            out.append("")
        out.extend([f"[{section}]", f"{key}={value}"])
    path.write_text("\n".join(out).rstrip() + "\n", encoding="utf-8")


def cyberpunk_settings() -> Path | None:
    local = os.environ.get("LOCALAPPDATA")
    if not local:
        return None
    path = Path(local) / "CD Projekt Red" / "Cyberpunk 2077" / "UserSettings.json"
    return path if path.is_file() else None


def set_cyberpunk_multiplier(value: int) -> None:
    path = cyberpunk_settings()
    if not path:
        print("  ! Cyberpunk UserSettings.json not found; skip game setting")
        return
    backup = path.with_name(path.name + f".bak.{datetime.now():%Y%m%d_%H%M%S}")
    shutil.copy2(path, backup)
    data = json.loads(path.read_text(encoding="utf-8"))
    hit = 0
    for group in data.get("data", []):
        for option in group.get("options", []):
            if option.get("name") == "DLSS_MultiFrameGeneration":
                option["value"] = f"x{value}"
                hit += 1
    if hit != 1:
        die(f"expected one DLSS_MultiFrameGeneration option, found {hit}")
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"  + game setting DLSS_MultiFrameGeneration=x{value} (backup {backup.name})")


def find_shyvortex(game: Path) -> list[Path]:
    root = bin_dir(game)
    found: list[Path] = []
    for name in SHY_FILES:
        path = root / name
        if not path.is_file():
            continue
        if name == RESHADE_DLL and binary_marker(path, b"ReShade"):
            continue
        found.append(path)
    found += [root / name for name in SHY_DIRS if (root / name).is_dir()]
    manifest = game / SHY_MANIFEST
    if manifest.is_dir():
        found.append(manifest)
    return found


def backup_shyvortex(game: Path, quiet: bool = False) -> Path | None:
    items = find_shyvortex(game)
    if not items:
        print("  no ShyVortex/OptiScaler files found; nothing to back up")
        return None
    root = bin_dir(game)
    backup = game / ".allforone_mods" / f"_backup_shyvortex_{datetime.now():%Y%m%d_%H%M%S}"
    (backup / "bin" / "x64").mkdir(parents=True, exist_ok=True)
    manifest = {"created": datetime.now().isoformat(), "game": str(game), "files": []}
    for item in items:
        relative = item.relative_to(game)
        target = backup / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if item.is_dir():
            shutil.copytree(item, target, dirs_exist_ok=True)
        else:
            shutil.copy2(item, target)
        manifest["files"].append({"rel_path": str(relative).replace("\\", "/"),
                                  "size": item.stat().st_size})
    settings = cyberpunk_settings()
    if settings:
        shutil.copy2(settings, backup / "UserSettings.json")
        manifest["user_settings"] = settings.name
    (backup / "backup_manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8")
    for item in items:
        relative = item.relative_to(game)
        source = item
        target = backup / relative
        if source.is_dir():
            source_files = sorted(p.relative_to(source) for p in source.rglob("*") if p.is_file())
            target_files = sorted(p.relative_to(target) for p in target.rglob("*") if p.is_file())
            if source_files != target_files:
                die(f"backup verification failed for {relative}")
        elif source.stat().st_size != target.stat().st_size:
            die(f"backup verification failed for {relative}")
    print(f"  + backup verified: {backup}")
    print(f"    files: {len(manifest['files'])} entries")
    if not quiet:
        print("    restore by copying the backup contents back into the game folder")
    return backup


def remove_shyvortex(game: Path) -> None:
    root = bin_dir(game)
    for name in SHY_FILES:
        path = root / name
        if path.is_file():
            path.unlink()
            print(f"  - removed {path.name}")
    for name in SHY_DIRS:
        path = root / name
        if path.is_dir():
            shutil.rmtree(path)
            print(f"  - removed {name}/")
    manifest = game / SHY_MANIFEST
    if manifest.is_dir():
        shutil.rmtree(manifest)
        print(f"  - removed {SHY_MANIFEST}")


def status(game: Path) -> int:
    root = bin_dir(game)
    exe = find_exe(game)
    print(f"game   : {game}")
    print(f"exe    : {exe.name}")
    print(f"folder : {root}")
    print(f"provider nvngx_dlssg.dll : {file_version(root / 'nvngx_dlssg.dll')}")
    dll = root / RESHADE_DLL
    if not dll.is_file():
        print("reshade dxgi.dll        : MISSING")
    elif binary_marker(dll, b"ReShade"):
        print(f"reshade dxgi.dll        : ReShade {file_version(dll)}")
    elif binary_marker(dll, b"OptiScaler"):
        print(f"dxgi.dll                : OptiScaler {file_version(dll)}")
    else:
        print(f"dxgi.dll                : unknown proxy {file_version(dll)}")
    print(f"addon                   : {'OK' if (root / ADDON).is_file() else 'MISSING'} ({ADDON})")
    print(f"MFGAdaUnlock.ini        : {'OK' if (root / MFG_INI).is_file() else 'MISSING'}")
    print(f"backend                 : {ini_get(root / MFG_INI, 'Backend', 'Selected') or 'not set'}")
    print(f"xmx generator           : {ini_get(root / MFG_INI, 'DLSSG', 'XmxGenerator') or 'not set'}")
    print(f"force multiplier        : {ini_get(root / RESHADE_INI, MFG_SECTION, 'ForceMultiplier') or 'not set'}")
    print(f"dynamic MFG             : {ini_get(root / RESHADE_INI, MFG_SECTION, 'DynamicMFG') or 'not set'}")
    leftovers = find_shyvortex(game)
    print(f"shyvortex leftovers     : {len(leftovers)}" + (" -> " + ", ".join(p.name for p in leftovers) if leftovers else " (clean)"))
    settings = cyberpunk_settings()
    if settings:
        data = json.loads(settings.read_text(encoding="utf-8"))
        for group in data.get("data", []):
            for option in group.get("options", []):
                if option.get("name") == "DLSS_MultiFrameGeneration":
                    print(f"game multiplier         : {option.get('value')}")
    core = (root / ADDON).is_file() and (root / MFG_INI).is_file() and (root / RESHADE_INI).is_file()
    return 0 if core else 1


def verify(game: Path) -> int:
    root = bin_dir(game)
    log = root / "ReShade.log"
    if not log.is_file():
        die(f"ReShade.log not found at {log}")
    text = log.read_text(encoding="utf-8", errors="replace")
    checks = [
        ("addon loaded", r"Loading add-on from .*renodx-mfgunlock\.addon64"),
        ("DLSS-G backend", r"mfgunlock: DLSS-G backend"),
        ("provider validated", r"verified mapped DLSS-G provider candidate version 310\.9\."),
        ("multiplier override", r"frame-multiplier override is live"),
        ("quality patch", r"full Blackwell framework kernels applied"),
    ]
    failures = 0
    for label, pattern in checks:
        match = re.search(pattern, text)
        print(f"  [{'PASS' if match else 'FAIL'}] {label}")
        if match:
            print(f"         {match.group(0)[:180]}")
        else:
            failures += 1
    errors = re.findall(r"\| (?:ERROR|FATAL) .*", text)
    print(f"  [{'PASS' if not errors else 'FAIL'}] no ERROR/FATAL lines ({len(errors)})")
    if errors:
        for line in errors[-5:]:
            print(f"         {line.strip()[:180]}")
        failures += 1
    return 0 if failures == 0 else 1


def install(args: argparse.Namespace) -> int:
    game = Path(args.game).expanduser().resolve()
    root = bin_dir(game)
    exe = find_exe(game)
    if find_shyvortex(game):
        if not args.yes:
            die("ShyVortex/OptiScaler leftovers found. Re-run with --yes to back up and remove them first.")
        backup_shyvortex(game)
        remove_shyvortex(game)
    setup = Path(args.reshade_setup).expanduser().resolve()
    addon = Path(args.addon).expanduser().resolve()
    if not setup.is_file():
        die(f"ReShade setup not found: {setup}")
    if not addon.is_file():
        die(f"addon not found: {addon}")
    dll = root / RESHADE_DLL
    if dll.is_file() and not binary_marker(dll, b"ReShade"):
        die(f"{dll} exists but is not ReShade; remove it first")
    if not (dll.is_file() and binary_marker(dll, b"ReShade")):
        result = run([str(setup), "--headless", "--api", "dxgi", str(exe)])
        print(result.stdout.strip())
        if result.returncode != 0:
            die(f"ReShade setup failed with exit {result.returncode}: {result.stderr.strip()}")
    shutil.copy2(addon, root / ADDON)
    print(f"  + addon installed: {root / ADDON}")
    ini_set(root / MFG_INI, "Backend", "Selected", "DLSSG")
    ini_set(root / MFG_INI, "DLSSG", "XmxGenerator", "0")
    ini_set(root / RESHADE_INI, MFG_SECTION, "ForceMultiplier", str(args.multiplier))
    ini_set(root / RESHADE_INI, MFG_SECTION, "DynamicMFG", "0")
    print(f"  + config: DLSS-G backend, ForceMultiplier={args.multiplier}, DynamicMFG=0")
    if args.cyberpunk_settings:
        set_cyberpunk_multiplier(args.multiplier)
    print("  next: launch the game, load a save, press Home, check MFG Unlock backend/multiplier")
    return 0


def revert(args: argparse.Namespace) -> int:
    if not args.yes:
        die("revert removes files; re-run with --yes")
    game = Path(args.game).expanduser().resolve()
    root = bin_dir(game)
    backup = Path(args.backup).expanduser().resolve() if args.backup else None
    if backup and not backup.is_dir():
        die(f"backup not found: {backup}")
    for name in (ADDON, MFG_INI, SESSION, RESHADE_INI, "ReShade.log", RESHADE_DLL):
        path = root / name
        if path.is_file():
            path.unlink()
            print(f"  - removed {name}")
    if backup:
        backup_bin = backup / "bin" / "x64"
        if backup_bin.is_dir():
            for item in backup_bin.iterdir():
                target = root / item.name
                if item.is_dir():
                    shutil.copytree(item, target, dirs_exist_ok=True)
                else:
                    shutil.copy2(item, target)
                print(f"  + restored {item.name}")
        manifest = backup / SHY_MANIFEST
        if manifest.is_dir():
            target = game / SHY_MANIFEST
            if target.exists():
                shutil.rmtree(target)
            shutil.copytree(manifest, target)
            print(f"  + restored {SHY_MANIFEST}")
        settings = backup / "UserSettings.json"
        if settings.is_file():
            current = cyberpunk_settings()
            if current:
                shutil.copy2(settings, current)
                print("  + restored UserSettings.json")
    print("  done. Start the game to verify the restored stack.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p_status = sub.add_parser("status", help="read-only install status")
    p_status.add_argument("--game", required=True)

    p_verify = sub.add_parser("verify", help="check ReShade.log evidence")
    p_verify.add_argument("--game", required=True)

    p_backup = sub.add_parser("backup", help="back up ShyVortex/OptiScaler files")
    p_backup.add_argument("--game", required=True)
    p_backup.add_argument("--remove", action="store_true")
    p_backup.add_argument("--yes", action="store_true")

    p_set = sub.add_parser("set-multiplier", help="set ForceMultiplier and game x value")
    p_set.add_argument("--game", required=True)
    p_set.add_argument("--value", type=int, choices=range(2, 7), required=True)
    p_set.add_argument("--cyberpunk-settings", action="store_true")

    p_install = sub.add_parser("install", help="install ReShade + MFGAdaUnlock")
    p_install.add_argument("--game", required=True)
    p_install.add_argument("--reshade-setup", required=True)
    p_install.add_argument("--addon", required=True)
    p_install.add_argument("--multiplier", type=int, choices=range(2, 7), default=4)
    p_install.add_argument("--cyberpunk-settings", action="store_true")
    p_install.add_argument("--yes", action="store_true")

    p_revert = sub.add_parser("revert", help="remove MFGAdaUnlock/ReShade and restore backup")
    p_revert.add_argument("--game", required=True)
    p_revert.add_argument("--backup")
    p_revert.add_argument("--yes", action="store_true")

    args = parser.parse_args()
    if args.command == "status":
        return status(Path(args.game).expanduser().resolve())
    if args.command == "verify":
        return verify(Path(args.game).expanduser().resolve())
    if args.command == "backup":
        game = Path(args.game).expanduser().resolve()
        backup_shyvortex(game)
        if args.remove:
            if not args.yes:
                die("--remove needs --yes")
            remove_shyvortex(game)
        return 0
    if args.command == "set-multiplier":
        game = Path(args.game).expanduser().resolve()
        ini_set(bin_dir(game) / RESHADE_INI, MFG_SECTION, "ForceMultiplier", str(args.value))
        ini_set(bin_dir(game) / RESHADE_INI, MFG_SECTION, "DynamicMFG", "0")
        print(f"  + ForceMultiplier={args.value}, DynamicMFG=0")
        if args.cyberpunk_settings:
            set_cyberpunk_multiplier(args.value)
        return 0
    if args.command == "install":
        return install(args)
    if args.command == "revert":
        return revert(args)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())

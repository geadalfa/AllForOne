#!/usr/bin/env python3
"""DLSS frame-generation setup: MFG Unlock (ReShade add-on) and DLSS Unlocked (OptiScaler proxy)."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import zipfile
from datetime import datetime
from pathlib import Path

ADDON = "renodx-mfgunlock.addon64"
MFG_INI = "MFGAdaUnlock.ini"
RESHADE_INI = "ReShade.ini"
RESHADE_DLL = "dxgi.dll"
SESSION = "MFGAdaUnlock.session"
SHY_DIRS = ["OptiScaler", "REPatch"]
SHY_PROXIES = ["dxgi", "version", "winmm", "dbghelp", "d3d12", "wininet", "winhttp"]
SHY_EXCLUDE = ("Licenses/", "HOW-TO-INSTALL.txt", "install.sh", ".github/")
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


def find_any_exe(game: Path) -> Path:
    root = bin_dir(game)
    candidate = root / "Cyberpunk2077.exe"
    if candidate.is_file():
        return candidate
    exes = sorted(root.glob("*.exe"))
    for exe in exes:
        if (exe.parent / "nvngx_dlssg.dll").is_file():
            return exe
    if exes:
        return exes[0]
    die(f"no game executable found under {root}")


def find_exe(game: Path) -> Path:
    return find_any_exe(game)


def game_rel(game: Path, root: Path, relative: str) -> str:
    return str((root / relative).relative_to(game)).replace("\\", "/")


def gpu_info() -> dict[str, str]:
    try:
        result = run(
            ["nvidia-smi", "--query-gpu=name,driver_version", "--format=csv,noheader"],
            timeout=20,
        )
        if result.returncode == 0:
            for line in result.stdout.splitlines():
                parts = [part.strip() for part in line.split(",")]
                if parts and parts[0]:
                    return {
                        "name": parts[0],
                        "driver": parts[1] if len(parts) > 1 else "unknown",
                    }
    except (OSError, subprocess.TimeoutExpired):
        pass
    return {"name": "unknown", "driver": "unknown"}


def gpu_family(name: str) -> str:
    match = re.search(r"RTX\s*(20|30|40|50)\d{2}", name, re.I)
    return f"RTX {match.group(1)}" if match else "unknown"


def proxy_identity(root: Path) -> str:
    for name in [f"{proxy}.dll" for proxy in SHY_PROXIES]:
        path = root / name
        if not path.is_file():
            continue
        if binary_marker(path, b"ReShade"):
            return f"{name} = ReShade {file_version(path)}"
        if binary_marker(path, b"OptiScaler"):
            return f"{name} = OptiScaler {file_version(path)}"
        return f"{name} = unknown proxy {file_version(path)}"
    return "none"


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
    for proxy in SHY_PROXIES:
        path = root / f"{proxy}.dll"
        if not path.is_file():
            continue
        if binary_marker(path, b"ReShade"):
            continue
        if proxy == "dxgi" or binary_marker(path, b"OptiScaler"):
            found.append(path)
    for name in ["OptiScaler.ini", "OptiScaler.log", "nvngx.dll_dlssnr.dll", "nvngx_dlssnr.dll"]:
        path = root / name
        if path.is_file():
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
    for proxy in SHY_PROXIES:
        path = root / f"{proxy}.dll"
        if path.is_file() and binary_marker(path, b"OptiScaler"):
            path.unlink()
            print(f"  - removed {path.name}")
    for name in ["OptiScaler.ini", "OptiScaler.log", "nvngx.dll_dlssnr.dll", "nvngx_dlssnr.dll"]:
        path = root / name
        if path.is_file():
            path.unlink()
            print(f"  - removed {name}")
    for name in SHY_DIRS:
        path = root / name
        if path.is_dir():
            shutil.rmtree(path)
            print(f"  - removed {name}/")
    manifest = game / SHY_MANIFEST
    if manifest.is_dir():
        shutil.rmtree(manifest)
        print(f"  - removed {SHY_MANIFEST}")


def route_cmd(game: Path) -> int:
    root = bin_dir(game)
    exe = find_any_exe(game)
    gpu = gpu_info()
    family = gpu_family(gpu["name"])
    provider = file_version(root / "nvngx_dlssg.dll")
    stack: list[str] = []
    if (root / ADDON).is_file() or (root / MFG_INI).is_file():
        stack.append("MFG Unlock")
    if (root / "OptiScaler").is_dir() or (root / "OptiScaler.ini").is_file():
        stack.append("DLSS Unlocked/OptiScaler")
    reshade = (root / RESHADE_DLL).is_file() and binary_marker(root / RESHADE_DLL, b"ReShade")
    if reshade:
        stack.append("ReShade dxgi.dll")

    print(f"game            : {game}")
    print(f"exe             : {exe.name}")
    print(f"GPU             : {gpu['name']} (driver {gpu['driver']})")
    print(f"GPU family      : {family}")
    print(f"DLSS-G provider : {provider}")
    print(f"proxy           : {proxy_identity(root)}")
    print(f"existing stack  : {', '.join(stack) if stack else 'clean'}")
    if provider == "missing":
        print("note            : no nvngx_dlssg.dll beside the executable")
    if len([item for item in stack if item != 'ReShade dxgi.dll']) > 1:
        print("WARNING         : multiple DLSS-G patchers detected; remove one before installing")

    if family == "RTX 50":
        print("recommended     : native MFG; install nothing. MFG Unlock only for experiments or a dynamic ceiling.")
    elif family == "RTX 40":
        print("recommended     : MFG Unlock 1.10.1, DLSS-G backend.")
        print("fallback        : XeMFG DLSS-G if unstable; DLSS Unlocked NR-v0.9.95 if OptiScaler or DLSS-NR is needed.")
    elif family in ("RTX 30", "RTX 20"):
        print("recommended     : DLSS Unlocked NR-v0.9.95 native dlssg_sm86.")
        print("fallback        : MFG Unlock experimental RTX 20/30 DLSS-G, or XeMFG when the game has no native frame generation.")
    else:
        print("recommended     : no supported RTX detected; stop and verify the GPU before installing.")
    if provider == "missing":
        print("note            : DLSS Unlocked needs native DLSS Frame Generation; MFG Unlock XeMFG/Add frame generation may still apply.")
    return 0


def shyvortex_status(game: Path) -> int:
    root = bin_dir(game)
    exe = find_any_exe(game)
    print(f"game            : {game}")
    print(f"exe             : {exe.name}")
    print(f"folder          : {root}")
    print(f"proxy           : {proxy_identity(root)}")
    print(f"OptiScaler.ini  : {'OK' if (root / 'OptiScaler.ini').is_file() else 'MISSING'}")
    print(f"MfgUnlock       : {ini_get(root / 'OptiScaler.ini', 'DLSSG', 'MfgUnlock') or 'not set'}")
    print(f"MfgUnlocker     : {ini_get(root / 'OptiScaler.ini', 'DLSSG', 'MfgUnlocker') or 'not set'}")
    print(f"OptiScaler/     : {'OK' if (root / 'OptiScaler').is_dir() else 'MISSING'}")
    print(f"dlssg_sm86      : {'OK' if (root / 'OptiScaler' / 'dlssg_sm86').is_dir() else 'MISSING'}")
    manifest = game / SHY_MANIFEST / "manifest.json"
    if manifest.is_file():
        data = json.loads(manifest.read_text(encoding="utf-8"))
        print(f"manifest        : {manifest} (proxy {data.get('proxy', 'unknown')})")
    else:
        print("manifest        : none (manual install)")
    core = (root / "OptiScaler.ini").is_file() and (root / "OptiScaler").is_dir()
    return 0 if core else 1


def archive_entries(archive: zipfile.ZipFile) -> tuple[str, list[str]]:
    names = [name for name in archive.namelist() if name and not name.endswith("/")]
    if not names:
        die("archive is empty")
    tops = {name.split("/")[0] for name in names}
    prefix = ""
    if len(tops) == 1 and all("/" in name for name in names):
        prefix = next(iter(tops)) + "/"
    entries: list[str] = []
    for name in names:
        relative = name[len(prefix):] if prefix and name.startswith(prefix) else name
        relative = relative.replace("\\", "/").lstrip("/")
        if not relative or ".." in relative.split("/"):
            die(f"unsafe path in archive: {name}")
        if relative.startswith(SHY_EXCLUDE):
            continue
        if relative == "install.sh" or relative.startswith("README") or relative.startswith(".github/"):
            continue
        entries.append(relative)
    if "OptiScaler.ini" not in entries:
        die("not a DLSS Unlocked standalone archive: OptiScaler.ini is missing")
    return prefix, sorted(set(entries))


def collapse_rels(rels: list[str]) -> list[str]:
    out: list[str] = []
    for relative in sorted(set(rels), key=lambda item: item.count("/")):
        if any(relative == parent or relative.startswith(parent + "/") for parent in out):
            continue
        out.append(relative)
    return out


def backup_relative(game: Path, rels: list[str], backup: Path) -> list[str]:
    backed: list[str] = []
    for relative in collapse_rels(rels):
        source = game / relative
        if not source.exists():
            continue
        target = backup / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.is_dir():
            shutil.copytree(source, target, dirs_exist_ok=True)
        else:
            shutil.copy2(source, target)
        backed.append(relative)
    return backed


def existing_shyvortex_rels(game: Path) -> list[str]:
    return [str(path.relative_to(game)).replace("\\", "/") for path in find_shyvortex(game)]


def target_rel(relative: str, proxy: str) -> str:
    if relative == "dxgi.dll" and proxy != "dxgi":
        return f"{proxy}.dll"
    return relative


def shyvortex_install(args: argparse.Namespace) -> int:
    game = Path(args.game).expanduser().resolve()
    root = bin_dir(game)
    exe = find_any_exe(game)
    archive = Path(args.archive).expanduser().resolve()
    if not archive.is_file():
        die(f"archive not found: {archive}")
    if not args.yes:
        die("DLSS Unlocked install replaces files; re-run with --yes")
    if (root / ADDON).is_file() or (root / MFG_INI).is_file():
        die("MFG Unlock is present in this game folder. Revert it first; never stack both patchers.")
    if not (root / "nvngx_dlssg.dll").is_file():
        die("no nvngx_dlssg.dll beside the executable; DLSS Unlocked needs a game with native DLSS Frame Generation")

    proxy = args.proxy
    reshade_owns_dxgi = (root / RESHADE_DLL).is_file() and binary_marker(root / RESHADE_DLL, b"ReShade")
    if proxy is None:
        proxy = "version" if reshade_owns_dxgi else "dxgi"
    if proxy == "dxgi" and reshade_owns_dxgi:
        die("ReShade owns dxgi.dll; re-run with --proxy version")

    try:
        with zipfile.ZipFile(archive) as bundle:
            prefix, entries = archive_entries(bundle)
            mapped = {relative: target_rel(relative, proxy) for relative in entries}
            backup = game / ".allforone_mods" / f"_backup_dlss_unlocked_{datetime.now():%Y%m%d_%H%M%S}"
            targets = [game_rel(game, root, relative) for relative in mapped.values() if (root / relative).exists()]
            backed = backup_relative(game, existing_shyvortex_rels(game) + targets, backup)
            installed: list[str] = []
            created_dirs: set[str] = set()
            for relative, target in mapped.items():
                target_path = root / target
                if target_path.is_dir():
                    die(f"cannot overwrite directory with file: {target_path}")
                parent = target_path.parent
                while parent != root and parent != game:
                    if not parent.exists():
                        created_dirs.add(str(parent.relative_to(game)).replace("\\", "/"))
                    parent = parent.parent
                target_path.parent.mkdir(parents=True, exist_ok=True)
                with bundle.open(prefix + relative) as source, open(target_path, "wb") as destination:
                    shutil.copyfileobj(source, destination)
                installed.append(game_rel(game, root, target))
    except zipfile.BadZipFile:
        die(f"not a valid ZIP archive: {archive}")

    manifest = {
        "created": datetime.now().isoformat(),
        "game": str(game),
        "exe": exe.name,
        "archive": str(archive),
        "archive_sha256": sha256(archive),
        "proxy": proxy,
        "backup": str(backup),
        "backed_up": backed,
        "installed_files": sorted(installed),
        "installed_dirs": sorted(created_dirs, key=lambda item: item.count("/"), reverse=True),
    }
    manifest_dir = game / SHY_MANIFEST
    manifest_dir.mkdir(parents=True, exist_ok=True)
    (manifest_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"  + DLSS Unlocked installed with proxy {proxy}.dll")
    print(f"  + backup: {backup} ({len(backed)} entries)")
    print(f"  + manifest: {manifest_dir / 'manifest.json'}")
    print("  next: launch the game, open the OptiScaler overlay, check DLSS MFG, start at 2x then 3x/4x")
    return 0


def shyvortex_revert(args: argparse.Namespace) -> int:
    if not args.yes:
        die("revert removes files; re-run with --yes")
    game = Path(args.game).expanduser().resolve()
    manifest_path = game / SHY_MANIFEST / "manifest.json"
    if not manifest_path.is_file():
        print("  no DLSS Unlocked manifest found; removing known proxy files without restore")
        remove_shyvortex(game)
        return 0
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    for relative in data.get("installed_files", []):
        path = game / relative
        if path.is_file():
            path.unlink()
            print(f"  - removed {relative}")
    for relative in sorted(data.get("installed_dirs", []), key=lambda item: item.count("/"), reverse=True):
        path = game / relative
        if path.is_dir():
            try:
                path.rmdir()
                print(f"  - removed {relative}/")
            except OSError:
                pass
    backup = Path(data.get("backup", ""))
    if backup.is_dir():
        for item in sorted(backup.rglob("*"), key=lambda path: len(path.parts)):
            relative = item.relative_to(backup)
            target = game / relative
            if item.is_dir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(item, target)
                print(f"  + restored {relative}")
    if (game / SHY_MANIFEST).is_dir():
        shutil.rmtree(game / SHY_MANIFEST)
    print("  done. Start the game to verify the restored stack.")
    return 0


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

    p_status = sub.add_parser("status", help="read-only MFG Unlock install status")
    p_status.add_argument("--game", required=True)

    p_route = sub.add_parser("route", help="detect GPU and recommend an MFG route")
    p_route.add_argument("--game", required=True)

    p_shy_status = sub.add_parser("shyvortex-status", help="read-only DLSS Unlocked status")
    p_shy_status.add_argument("--game", required=True)

    p_shy_install = sub.add_parser("shyvortex-install", help="install a DLSS Unlocked standalone ZIP with backup")
    p_shy_install.add_argument("--game", required=True)
    p_shy_install.add_argument("--archive", required=True)
    p_shy_install.add_argument("--proxy", choices=SHY_PROXIES)
    p_shy_install.add_argument("--yes", action="store_true")

    p_shy_revert = sub.add_parser("shyvortex-revert", help="remove DLSS Unlocked and restore the backup")
    p_shy_revert.add_argument("--game", required=True)
    p_shy_revert.add_argument("--yes", action="store_true")

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
    if args.command == "route":
        return route_cmd(Path(args.game).expanduser().resolve())
    if args.command == "shyvortex-status":
        return shyvortex_status(Path(args.game).expanduser().resolve())
    if args.command == "shyvortex-install":
        return shyvortex_install(args)
    if args.command == "shyvortex-revert":
        return shyvortex_revert(args)
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

#!/usr/bin/env python3
"""Run pagesource and emit a manifest of the captured resources."""

import argparse
from collections import Counter
from pathlib import Path
import shutil
import subprocess
import sys

CATEGORIES = {
    ".html": "html", ".htm": "html",
    ".css": "css",
    ".js": "js", ".mjs": "js", ".json": "json", ".map": "js",
    ".png": "image", ".jpg": "image", ".jpeg": "image", ".gif": "image",
    ".webp": "image", ".svg": "image", ".ico": "image", ".avif": "image",
    ".woff": "font", ".woff2": "font", ".ttf": "font", ".otf": "font", ".eot": "font",
}


def find_cli():
    exe = shutil.which("pagesource")
    if exe:
        return [exe]
    scripts = Path(sys.executable).parent / "Scripts" / "pagesource.exe"
    if scripts.exists():
        return [str(scripts)]
    local = Path(sys.executable).parent / "pagesource"
    if local.exists():
        return [str(local)]
    sys.exit("pagesource CLI not found. Run: python -m pip install pagesource")


def main():
    ap = argparse.ArgumentParser(
        description="Capture webpage resources with pagesource, then write _capture_manifest.md."
    )
    ap.add_argument("url")
    ap.add_argument("-o", "--output", default="pagesource_output")
    ap.add_argument("-w", "--wait", type=int, default=0, help="extra seconds after load")
    ap.add_argument("-e", "--include-external", action="store_true")
    args = ap.parse_args()

    cmd = find_cli() + [args.url, "-o", args.output, "--wait", str(args.wait)]
    if args.include_external:
        cmd.append("--include-external")

    proc = subprocess.run(cmd, capture_output=True, text=True)
    sys.stdout.write(proc.stdout)
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr)
        return proc.returncode

    root = Path(args.output)
    files = sorted(
        p for p in root.rglob("*")
        if p.is_file() and p.name != "_capture_manifest.md"
    )

    rows, cats, total = [], Counter(), 0
    for path in files:
        size = path.stat().st_size
        total += size
        cat = CATEGORIES.get(path.suffix.lower(), "other")
        cats[cat] += 1
        rows.append((path.relative_to(root).as_posix(), size, cat))

    lines = [
        "# pagesource capture manifest",
        "",
        f"- URL: {args.url}",
        f"- Files: {len(files)} ({total / 1024:.1f} KiB)",
        "- Categories: " + ", ".join(f"{k}={v}" for k, v in sorted(cats.items())),
        "",
        "| File | KiB | Category |",
        "|---|---|---|",
    ]
    lines += [f"| `{rel}` | {size / 1024:.1f} | {cat} |" for rel, size, cat in rows]

    manifest = root / "_capture_manifest.md"
    manifest.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"manifest: {manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
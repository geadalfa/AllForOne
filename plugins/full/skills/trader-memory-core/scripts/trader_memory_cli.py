#!/usr/bin/env python3
"""Launch the installed trader-memory-core scripts with the active Python environment."""

import importlib.util
import os
from pathlib import Path
import subprocess
import sys

COMMANDS = {"store": "thesis_store.py", "ingest": "thesis_ingest.py", "review": "thesis_review.py"}


def main(args):
    if not args or args[0] in ("-h", "--help"):
        print("usage: trader_memory_cli.py {store|ingest|review} [args...]")
        return 0 if args else 2
    command, *rest = args
    script = COMMANDS.get(command)
    if script is None:
        print(f"Unknown trader-memory command: {command}", file=sys.stderr)
        return 2
    directory = Path(__file__).resolve().parent
    if any(importlib.util.find_spec(name) is None for name in ("yaml", "jsonschema")):
        requirements = directory.parent / "requirements.txt"
        print(f'Install the skill dependencies in the active environment: python -m pip install -r "{requirements}"',
              file=sys.stderr)
        return 3
    env = dict(os.environ, PYTHONIOENCODING="utf-8")
    return subprocess.call([sys.executable, str(directory / script), *rest], env=env)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

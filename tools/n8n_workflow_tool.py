#!/usr/bin/env python3
"""Deterministic n8n REST API helper.

Reads N8N_BASE_URL and N8N_API_KEY from the environment. Read-only by default;
activation changes require --yes. Prints JSON on stdout and never echoes the key.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

SECRET_KEYS = re.compile(r"(password|secret|token|api[_-]?key|authorization|client[_-]?secret)", re.I)
SAFE_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
MAX_BODY = 500


class N8nError(RuntimeError):
    pass


def load_config() -> tuple[str, str]:
    base = os.environ.get("N8N_BASE_URL", "").strip().rstrip("/")
    key = os.environ.get("N8N_API_KEY", "").strip()
    if not base:
        raise N8nError("Set N8N_BASE_URL, for example https://n8n.example.com")
    parsed = urllib.parse.urlparse(base)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise N8nError("N8N_BASE_URL must be an http(s) URL")
    if parsed.scheme == "http" and parsed.hostname not in SAFE_LOCAL_HOSTS:
        raise N8nError("Plain HTTP is allowed only for localhost; use HTTPS for remote n8n")
    if not key:
        raise N8nError("Set N8N_API_KEY in the environment")
    return base, key


def request(method: str, path: str, params: dict | None = None, body: dict | None = None,
            timeout: int = 30) -> dict:
    base, key = load_config()
    url = base + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    data = None
    headers = {"X-N8N-API-KEY": key, "Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw = response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")[:MAX_BODY]
        raise N8nError(f"{method} {path} failed with {error.code}: {detail}") from error
    except urllib.error.URLError as error:
        raise N8nError(f"{method} {path} failed: {error.reason}") from error
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError as error:
        raise N8nError(f"{method} {path} returned non-JSON content") from error


def redact(value):
    if isinstance(value, dict):
        return {
            name: ("<redacted>" if SECRET_KEYS.search(str(name)) else redact(item))
            for name, item in value.items()
        }
    if isinstance(value, list):
        return [redact(item) for item in value]
    if isinstance(value, str) and len(value) >= 24 and re.fullmatch(r"[A-Za-z0-9_\-./+=]{24,}", value):
        prefix = value.split("_", 1)[0].lower()
        if prefix in {"ghp", "gho", "ghs", "github", "xoxb", "sk", "eyj", "bearer"}:
            return "<redacted>"
    return value


def iter_workflows(page_limit: int) -> list[dict]:
    items: list[dict] = []
    cursor = None
    while True:
        params = {"limit": page_limit}
        if cursor:
            params["cursor"] = cursor
        payload = request("GET", "/api/v1/workflows", params=params)
        items.extend(payload.get("data") or [])
        cursor = payload.get("nextCursor")
        if not cursor:
            return items


def print_json(value) -> None:
    print(json.dumps(value, indent=2, ensure_ascii=False))


def slug(text: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", text or "workflow").strip("-")
    return cleaned[:80] or "workflow"


def cmd_health(_args) -> None:
    try:
        payload = request("GET", "/healthz")
    except N8nError:
        payload = request("GET", "/api/v1/workflows", params={"limit": 1})
    print_json({"ok": True, "response": payload if payload else "healthy"})


def cmd_list(args) -> None:
    workflows = iter_workflows(args.limit)
    if args.json:
        print_json(redact([summarize(item) for item in workflows]))
        return
    if not workflows:
        print("No workflows found.")
        return
    for item in workflows:
        state = "active" if item.get("active") else "inactive"
        print(f"{item.get('id', '-'):>10}  {state:<8}  {item.get('name', '(unnamed)')}")


def summarize(item: dict) -> dict:
    return {
        "id": item.get("id"),
        "name": item.get("name"),
        "active": item.get("active"),
        "createdAt": item.get("createdAt"),
        "updatedAt": item.get("updatedAt"),
    }


def cmd_get(args) -> None:
    print_json(redact(request("GET", f"/api/v1/workflows/{args.workflow_id}")))


def cmd_export(args) -> None:
    target = Path(args.dir).resolve()
    target.mkdir(parents=True, exist_ok=True)
    workflows = iter_workflows(args.limit)
    manifest = []
    for item in workflows:
        workflow = request("GET", f"/api/v1/workflows/{item['id']}")
        if not args.keep_pin_data:
            workflow.pop("pinData", None)
        safe = redact(workflow)
        filename = f"{slug(item.get('name'))}-{item['id']}.json"
        (target / filename).write_text(json.dumps(safe, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        manifest.append({"id": item["id"], "name": item.get("name"), "file": filename,
                         "active": item.get("active")})
    (target / "manifest.json").write_text(
        json.dumps({"baseUrl": os.environ.get("N8N_BASE_URL", "").rstrip("/"),
                    "workflows": manifest}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8")
    print_json({"exported": len(manifest), "dir": str(target)})


def cmd_activate(args) -> None:
    if not args.yes:
        raise N8nError("Pass --yes to activate a workflow")
    print_json(redact(request("POST", f"/api/v1/workflows/{args.workflow_id}/activate")))


def cmd_deactivate(args) -> None:
    if not args.yes:
        raise N8nError("Pass --yes to deactivate a workflow")
    print_json(redact(request("POST", f"/api/v1/workflows/{args.workflow_id}/deactivate")))


def cmd_executions(args) -> None:
    payload = request("GET", "/api/v1/executions",
                      params={"workflowId": args.workflow_id, "limit": args.limit})
    print_json(redact(payload.get("data") or []))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Deterministic n8n REST API helper")
    sub = parser.add_subparsers(dest="command", required=True)

    health = sub.add_parser("health", help="Check the instance")
    health.set_defaults(func=cmd_health)

    listing = sub.add_parser("list", help="List workflows")
    listing.add_argument("--limit", type=int, default=100)
    listing.add_argument("--json", action="store_true")
    listing.set_defaults(func=cmd_list)

    get = sub.add_parser("get", help="Get one workflow")
    get.add_argument("workflow_id")
    get.set_defaults(func=cmd_get)

    export = sub.add_parser("export", help="Export sanitized workflow JSON")
    export.add_argument("--dir", default="n8n-export")
    export.add_argument("--limit", type=int, default=100)
    export.add_argument("--keep-pin-data", action="store_true")
    export.set_defaults(func=cmd_export)

    activate = sub.add_parser("activate", help="Activate a workflow (requires --yes)")
    activate.add_argument("workflow_id")
    activate.add_argument("--yes", action="store_true")
    activate.set_defaults(func=cmd_activate)

    deactivate = sub.add_parser("deactivate", help="Deactivate a workflow (requires --yes)")
    deactivate.add_argument("workflow_id")
    deactivate.add_argument("--yes", action="store_true")
    deactivate.set_defaults(func=cmd_deactivate)

    executions = sub.add_parser("executions", help="List recent executions for a workflow")
    executions.add_argument("workflow_id")
    executions.add_argument("--limit", type=int, default=20)
    executions.set_defaults(func=cmd_executions)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        args.func(args)
        return 0
    except N8nError as error:
        print(f"n8n: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

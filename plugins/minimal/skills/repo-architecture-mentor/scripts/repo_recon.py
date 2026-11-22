#!/usr/bin/env python3
"""Build a teachable map of a repository: languages, manifests, entry points,
route candidates, infra, data/async hints, tests, and a reading order."""
import argparse
import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

SKIP_DIRS = {
    ".git", "node_modules", "vendor", "dist", "build", "target", "Pods",
    ".venv", "venv", "env", "__pycache__", ".next", ".nuxt", "coverage",
    ".idea", ".vscode", "bin", "obj", "DerivedData", ".gradle", ".dart_tool",
    "installer_output", ".mypy_cache", ".pytest_cache",
}

LANG_BY_EXT = {
    ".go": "Go", ".php": "PHP", ".py": "Python", ".swift": "Swift",
    ".m": "Objective-C", ".mm": "Objective-C++", ".kt": "Kotlin",
    ".kts": "Kotlin", ".java": "Java", ".cs": "C#", ".js": "JavaScript",
    ".jsx": "JavaScript", ".ts": "TypeScript", ".tsx": "TypeScript",
    ".rb": "Ruby", ".rs": "Rust", ".c": "C", ".h": "C/C++",
    ".cpp": "C++", ".cc": "C++", ".sql": "SQL", ".sh": "Shell",
    ".ps1": "PowerShell", ".html": "HTML", ".css": "CSS", ".scss": "SCSS",
    ".vue": "Vue", ".svelte": "Svelte", ".dart": "Dart", ".ex": "Elixir",
    ".exs": "Elixir", ".scala": "Scala", ".groovy": "Groovy",
    ".ipynb": "Jupyter", ".md": "Markdown", ".yaml": "YAML", ".yml": "YAML",
    ".json": "JSON", ".toml": "TOML", ".xml": "XML",
}

CODE_EXTS = {
    ".go", ".php", ".py", ".swift", ".kt", ".kts", ".java", ".cs", ".js",
    ".jsx", ".ts", ".tsx", ".rb", ".rs", ".c", ".h", ".cpp", ".cc", ".scala",
    ".groovy", ".dart", ".ex", ".exs", ".sql", ".vue", ".svelte",
}

ENTRY_NAMES = {
    "main.go", "server.py", "app.py", "main.py", "manage.py", "wsgi.py",
    "asgi.py", "index.php", "artisan", "App.swift", "main.swift",
    "AppDelegate.swift", "SceneDelegate.swift", "MainActivity.kt",
    "MainApplication.kt", "Main.kt", "Program.cs", "Startup.cs",
    "index.js", "server.js", "app.js", "main.js", "index.ts", "main.ts",
    "App.tsx", "App.jsx", "App.ts", "App.js",
}

ENTRY_GLOBS = [
    re.compile(r"(^|/)cmd/[^/]+/main\.go$"),
    re.compile(r"(^|/)public/index\.php$"),
    re.compile(r"(^|/)routes/[^/]+\.(php|js|ts)$"),
    re.compile(r"(^|/)application/config/routes\.php$"),
    re.compile(r"(^|/)application/controllers/[^/]+\.php$"),
    re.compile(r"(^|/)src/main\.(kt|java)$"),
]

ROUTE_PATTERNS = [
    ("Go", {".go"}, re.compile(r"\.(?:GET|POST|PUT|DELETE|PATCH|Any|HandleFunc|Handle)\s*\(\s*[\"`]([^\"`]+)")),
    ("PHP/Laravel", {".php"}, re.compile(r"Route::(?:get|post|put|delete|patch|any|resource|apiResource)\s*\(\s*[\"']([^\"']+)")),
    ("PHP/CI", {".php"}, re.compile(r"\$route\[[\"']([^\"']+)[\"']\]")),
    ("Python/FastAPI", {".py"}, re.compile(r"@(?:app|router|bp|api)\.(?:get|post|put|delete|patch|route)\s*\(\s*[\"']([^\"']*)")),
    ("Python/HTTP", {".py"}, re.compile(r"^\s*(?:if|elif)\s+(?:parsed_path\.path|self\.path|path)\s*(?:==|\.startswith\()\s*[\"']([^\"']+)", re.M)),
    ("JS/TS", {".js", ".jsx", ".ts", ".tsx"}, re.compile(r"(?:app|router|server|api)\.(?:get|post|put|delete|patch|use)\s*\(\s*[\"`]([^\"`]+)")),
    ("JVM", {".kt", ".java"}, re.compile(r"@(?:Get|Post|Put|Delete|Patch|Request)Mapping\s*\(\s*(?:value\s*=\s*)?[\"']([^\"']*)")),
    ("C#", {".cs"}, re.compile(r"\[Http(?:Get|Post|Put|Delete|Patch)(?:\(\s*[\"']([^\"']*)[\"'])?\]")),
    ("Swift/Vapor", {".swift"}, re.compile(r"\.(?:get|post|put|delete|patch)\s*\(\s*[\"']([^\"']+)")),
]

VENDOR_NAMES = ("tailwind", "lucide", "bootstrap", "jquery", "vendor", "polyfill", "chart.min")

SIGNAL_PATTERNS = {
    "kafka": re.compile(r"\b(kafka|sarama|kafkajs|confluent[_-]?kafka|segmentio/kafka-go|spring-kafka)\b", re.I),
    "redis": re.compile(r"\b(redis|go-redis|ioredis|node-redis|Redis::|Cache::)\b", re.I),
    "rabbitmq": re.compile(r"\b(rabbitmq|amqp|streadway/amqp|pika)\b", re.I),
    "postgres": re.compile(r"\b(postgres|postgresql|pgx|lib/pq|gorm\.io/driver/postgres)\b", re.I),
    "mysql": re.compile(r"\b(mysql|gorm\.io/driver/mysql|mysqli|pdo_mysql)\b", re.I),
    "mongo": re.compile(r"\b(mongodb|mongoose|mongo-go-driver)\b", re.I),
    "oracle": re.compile(r"\b(oracle|godror|cx_Oracle|oracledb)\b", re.I),
    "sqlserver": re.compile(r"\b(sqlserver|mssql|pyodbc)\b", re.I),
    "grpc": re.compile(r"\b(grpc|protobuf|\.proto)\b", re.I),
    "s3": re.compile(r"(s3://|boto3|aws[-_]sdk|minio|S3Client)"),
}

TOPIC_PATTERN = re.compile(r"(?:topic|Topic|TOPIC)[A-Za-z0-9_]*\s*[:=]\s*[\"']([^\"']{3,120})[\"']")
TEST_PATTERN = re.compile(r"(^|/)(tests?|__tests__|spec)/|(_test\.go$|_test\.py$|\.test\.(js|ts|tsx|jsx)$|\.spec\.(js|ts|tsx|jsx)$|Test\.php$|Tests?\.swift$)")


def rel(root, path):
    return os.path.relpath(path, root).replace("\\", "/")


def read_text(path, limit=2_000_000):
    try:
        if os.path.getsize(path) > limit:
            return ""
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            return fh.read()
    except OSError:
        return ""


def iter_files(root, max_files):
    seen = 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
        for name in sorted(filenames):
            if seen >= max_files:
                return
            path = os.path.join(dirpath, name)
            if not os.path.isfile(path):
                continue
            seen += 1
            yield path


def parse_manifest(path):
    name = os.path.basename(path).lower()
    text = read_text(path, 500_000)
    info = {}
    try:
        if name == "go.mod":
            mod = re.search(r"^module\s+(\S+)", text, re.M)
            gov = re.search(r"^go\s+(\S+)", text, re.M)
            deps = re.findall(r"^\s*([\w.\-]+\.[\w.\-/]+)\s+v[\w.\-+]+", text, re.M)
            info = {"module": mod.group(1) if mod else "", "go": gov.group(1) if gov else "", "deps": deps[:20]}
        elif name == "composer.json":
            data = json.loads(text)
            info = {"name": data.get("name", ""), "require": sorted((data.get("require") or {}).keys())[:20]}
        elif name == "package.json":
            data = json.loads(text)
            info = {"name": data.get("name", ""), "scripts": sorted((data.get("scripts") or {}).keys()),
                    "deps": sorted(list((data.get("dependencies") or {}).keys()) + list((data.get("devDependencies") or {}).keys()))[:20]}
        elif name == "requirements.txt":
            deps = [l.strip() for l in text.splitlines() if l.strip() and not l.strip().startswith("#")]
            info = {"deps": deps[:20]}
        elif name in ("pyproject.toml", "setup.py", "setup.cfg"):
            deps = re.findall(r"[\"']([A-Za-z0-9_.\-]+)\s*[<>=~!]", text)
            info = {"deps": deps[:20]}
        elif name == "package.swift":
            deps = re.findall(r"\.package\([^)]*url:\s*\"([^\"]+)\"", text)
            info = {"deps": deps[:20]}
        elif name in ("build.gradle", "build.gradle.kts"):
            deps = re.findall(r"(?:implementation|api|compileOnly|testImplementation)\s*[\(\"']([^\"')]+)", text)
            info = {"deps": deps[:20]}
        elif name == "pubspec.yaml":
            name_m = re.search(r"^name:\s*(\S+)", text, re.M)
            info = {"name": name_m.group(1) if name_m else ""}
        elif name.endswith(".csproj"):
            refs = re.findall(r"PackageReference\s+Include=\"([^\"]+)\"", text)
            info = {"deps": refs[:20]}
    except Exception:
        return None
    return {"file": name, **info}


def main():
    ap = argparse.ArgumentParser(description="Build a teachable repository map.")
    ap.add_argument("path", help="Repository root")
    ap.add_argument("--md", help="Write Markdown to this file")
    ap.add_argument("--json", dest="json_out", help="Write JSON to this file")
    ap.add_argument("--max-files", type=int, default=30000)
    ap.add_argument("--max-scan", type=int, default=4000)
    args = ap.parse_args()

    root = os.path.abspath(args.path)
    if not os.path.isdir(root):
        print(f"Not a directory: {root}", file=sys.stderr)
        return 2

    files = list(iter_files(root, args.max_files))
    lang_counts = Counter()
    ext_counts = Counter()
    manifests = []
    entries = []
    infra = []
    tests = []
    sql_files = []
    migrations = []
    routes = defaultdict(list)
    route_counts = Counter()
    signals = Counter()
    signal_samples = defaultdict(list)
    topics = set()

    for path in files:
        relp = rel(root, path)
        base = os.path.basename(path)
        ext = os.path.splitext(base)[1].lower()
        if ext in LANG_BY_EXT:
            lang_counts[LANG_BY_EXT[ext]] += 1
        ext_counts[ext] += 1

        if base in ("go.mod", "composer.json", "package.json", "requirements.txt",
                    "pyproject.toml", "setup.py", "setup.cfg", "Package.swift",
                    "Podfile", "build.gradle", "build.gradle.kts", "pubspec.yaml",
                    "pom.xml") or base.endswith(".csproj"):
            m = parse_manifest(path)
            if m:
                manifests.append({**m, "path": relp})

        if base in ENTRY_NAMES or any(g.search(relp) for g in ENTRY_GLOBS):
            entries.append(relp)

        low = relp.lower()
        if (base in ("Dockerfile", "Makefile", "Jenkinsfile", "bitbucket-pipelines.yml",
                     "docker-compose.yml", "docker-compose.yaml", "Chart.yaml",
                     "kustomization.yaml", ".env.example", ".env.sample")
                or low.startswith(".github/workflows/")
                or low.endswith((".tf",))
                or "/helm/" in low or "/k8s/" in low or "/kubernetes/" in low):
            infra.append(relp)

        if TEST_PATTERN.search(relp):
            tests.append(relp)
        if ext == ".sql":
            sql_files.append(relp)
        if re.search(r"(^|/)(migrations?|migrate|db/migrate|database/migrations)/", low):
            migrations.append(relp)

        if ext not in CODE_EXTS or not base:
            continue
        if ".min." in base or any(v in base.lower() for v in VENDOR_NAMES):
            continue
        text = read_text(path, 800_000)
        if not text:
            continue

        for lang, exts, pattern in ROUTE_PATTERNS:
            if ext not in exts:
                continue
            hits = pattern.findall(text)
            if hits:
                route_counts[lang] += len(hits)
                for h in hits[:3]:
                    val = h if isinstance(h, str) else (h[1] if len(h) > 1 else h[0])
                    if val:
                        routes[lang].append(f"{relp}: {val}")

        for sig, pattern in SIGNAL_PATTERNS.items():
            if pattern.search(text):
                signals[sig] += 1
                if len(signal_samples[sig]) < 3:
                    signal_samples[sig].append(relp)

        for m in TOPIC_PATTERN.findall(text):
            if len(topics) < 60:
                topics.add(m)

    entries = sorted(set(entries))[:60]
    infra = sorted(set(infra))[:60]
    migrations = sorted(set(migrations))[:30]
    sql_files = sorted(set(sql_files))[:30]
    tests = sorted(set(tests))[:60]
    top_langs = lang_counts.most_common(12)

    reading = []
    if entries:
        reading.append("Entry points: " + ", ".join(entries[:6]))
    if routes:
        reading.append("Route files: " + ", ".join(sorted({r.split(':', 1)[0] for v in routes.values() for r in v})[:6]))
    if manifests:
        reading.append("Manifests: " + ", ".join(m["path"] for m in manifests[:6]))
    if migrations or sql_files:
        reading.append("Schema: " + ", ".join((migrations + sql_files)[:6]))
    if signals:
        reading.append("Runtime dependencies: " + ", ".join(sorted(signals.keys())))
    if tests:
        reading.append("Tests: " + ", ".join(tests[:6]))

    result = {
        "root": root,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "files_scanned": len(files),
        "languages": dict(top_langs),
        "extensions": dict(ext_counts.most_common(20)),
        "manifests": manifests,
        "entry_points": entries,
        "route_counts": dict(route_counts),
        "route_samples": {k: v[:20] for k, v in routes.items()},
        "infra": infra,
        "migrations": migrations,
        "sql_files": sql_files,
        "tests": tests,
        "signals": dict(signals),
        "signal_samples": {k: v for k, v in signal_samples.items()},
        "topics": sorted(topics),
        "reading_order": reading,
    }

    lines = []
    lines.append(f"# Repo Map — {os.path.basename(root)}")
    lines.append("")
    lines.append(f"- Root: `{root}`")
    lines.append(f"- Generated: {result['generated_at']}")
    lines.append(f"- Files scanned: {len(files)}")
    lines.append("")
    lines.append("## Languages")
    lines.append("")
    lines.append("| Language | Files |")
    lines.append("| --- | ---: |")
    for lang, count in top_langs:
        lines.append(f"| {lang} | {count} |")
    if not top_langs:
        lines.append("| (none detected) | 0 |")
    lines.append("")
    lines.append("## Manifests & dependencies")
    lines.append("")
    if manifests:
        for m in manifests:
            extra = m.get("module") or m.get("name") or ""
            lines.append(f"- `{m['path']}` {extra}")
            deps = m.get("deps") or m.get("require") or []
            if deps:
                lines.append(f"  - deps: {', '.join(map(str, deps[:12]))}")
            if m.get("scripts"):
                lines.append(f"  - scripts: {', '.join(m['scripts'])}")
    else:
        lines.append("- No manifest detected.")
    lines.append("")
    lines.append("## Entry points")
    lines.append("")
    lines.extend([f"- `{p}`" for p in entries] or ["- None detected; search for main/route/bootstrap files manually."])
    lines.append("")
    lines.append("## Route candidates")
    lines.append("")
    if route_counts:
        for lang, count in route_counts.most_common():
            lines.append(f"- **{lang}**: {count} candidates")
            for sample in routes[lang][:6]:
                lines.append(f"  - `{sample}`")
    else:
        lines.append("- None detected by regex; inspect routers/frameworks manually.")
    lines.append("")
    lines.append("## Data & async hints")
    lines.append("")
    if signals:
        for sig, count in signals.most_common():
            lines.append(f"- **{sig}**: {count} files — e.g. {', '.join(signal_samples[sig])}")
    else:
        lines.append("- No database/broker hints detected.")
    if topics:
        lines.append(f"- Topic candidates: {', '.join(sorted(topics)[:20])}")
    if migrations or sql_files:
        lines.append("")
        lines.append("### Schema / migrations")
        for p in (migrations + sql_files)[:20]:
            lines.append(f"- `{p}`")
    lines.append("")
    lines.append("## Infra & CI")
    lines.append("")
    lines.extend([f"- `{p}`" for p in infra] or ["- None detected."])
    lines.append("")
    lines.append("## Tests")
    lines.append("")
    lines.extend([f"- `{p}`" for p in tests[:30]] or ["- No tests detected."])
    lines.append("")
    lines.append("## Suggested learning order")
    lines.append("")
    lines.extend([f"{i}. {item}" for i, item in enumerate(reading, 1)] or ["1. Start from README and build files."])
    lines.append("")

    md = "\n".join(lines)
    if args.md:
        with open(args.md, "w", encoding="utf-8") as fh:
            fh.write(md)
        print(f"Wrote {args.md}")
    else:
        print(md)

    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as fh:
            json.dump(result, fh, indent=2, ensure_ascii=False)
        print(f"Wrote {args.json_out}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

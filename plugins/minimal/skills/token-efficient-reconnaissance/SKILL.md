---
name: token-efficient-reconnaissance
description: Slash LLM token consumption by 60%-98% during codebase exploration, test execution, and debugging using RTK output compression and Graphify AST knowledge graph queries without losing reasoning precision.
---

# Token-Efficient Reconnaissance Protocol (RTK & Graphify)

Resolve `<skill-dir>` from the directory of this installed SKILL.md and `<plugin-root>` from its grandparent. Replace placeholders with absolute paths when running commands from a different directory.

> **Core Philosophy:** "Fewer tokens, same answers."  
> Query structural abstractions and filter command noise instead of dumping thousands of raw, unindexed lines into the context window.

---

## 1. RTK Command Filtering (Saving 60%–98% Tokens)

Instead of running verbose standard CLI commands that pollute the context with megabytes of formatting boilerplate, use the RTK utility:

```powershell
# 1. Compact directory listing (-98% token reduction vs ls -la)
# Automatically excludes node_modules, .git, dist, __pycache__
python "<plugin-root>/tools/rtk.py" ls <path>

# 2. Extract ONLY errors and stack traces from tests or builds
# Completely suppresses thousands of passing log lines
python "<plugin-root>/tools/rtk.py" err "<command>"
# Example: rtk err "npm test" or rtk err "cargo check"

# 3. Read top-level signatures without dumping implementation bodies
python "<plugin-root>/tools/rtk.py" read <file>

# 4. Extract JSON schema skeleton without massive value arrays
python "<plugin-root>/tools/rtk.py" json <file>
```

---

## 2. Graphify AST Knowledge Graph Navigation (-96% Tokens)

When a project contains precomputed AST graphs in `graphify-out/`:

```
graphify-out/
├── graph.json          # AST topology: nodes, edges, communities
├── GRAPH_REPORT.md     # Community hubs, God Nodes, hyperedges
└── graph.html          # Interactive visual topology
```

### 2.1. The Golden Rule of Graphify
> **MANDATORY INVARIANT:** Never read `graph.json` whole (often 200,000+ tokens). Query specific nodes and community edges.

### 2.2. Surgical Node Querying
```powershell
# Query specific symbol connections and imports in ~100-500 tokens
python "<plugin-root>/tools/rtk.py" graph "<SymbolOrNodeName>" --graph graphify-out/graph.json
```

### 2.3. Reading Sequence for Codebase Reconnaissance
1. Read `graphify-out/GRAPH_REPORT.md` (Community Hubs & God Nodes).
2. Query specific node relationships using the bundled `rtk.py graph <symbol>` command above.
3. Read **only** the target source file (using targeted line ranges: 50–100 lines).
4. Avoid broad, unscoped grep searches across the entire directory tree.

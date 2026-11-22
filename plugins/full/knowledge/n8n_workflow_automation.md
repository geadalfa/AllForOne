# n8n: Fair-Code Workflow Automation and AI Agents

Source: n8n-io/n8n · Sustainable Use License (fair-code) plus the n8n Enterprise License for `.ee` files · verified 2026-11-22
Repository: https://github.com/n8n-io/n8n · Product: https://n8n.io · Docs: https://docs.n8n.io
Baseline: HEAD `bf31087be421` (2026-11-22), latest release `n8n@2.48.7` (2026-11-20), TypeScript/Node.js, about 882 MB checkout.

## What it is

n8n is a source-available workflow automation platform with AI-agent capabilities. Users build workflows on a visual canvas, add custom JavaScript or Python, connect integrations, and run the result self-hosted or in n8n Cloud. The editor listens on port 5678 by default. The README claims 1,500+ integrations and 9,000+ workflow templates, model-provider flexibility, and human-approval steps in multi-step AI workflows.

## License constraints — read first

n8n is **not** OSI open source. The README describes it as fair-code under the Sustainable Use License and the n8n Enterprise License.

- Use and modification are limited to internal business purposes or non-commercial/personal use.
- Distribution to others is allowed only free of charge for non-commercial purposes.
- License, copyright, and other notices must not be altered or removed.
- Files with `.ee` in the filename or directory require a valid n8n Enterprise License and are not covered by the Sustainable Use License.
- Content on branches other than `master` is not licensed.
- AllForOne must never vendor n8n code, workflow exports containing customer data, or `.ee` files. Reference the upstream project and let the user install it.

## Why it matters

- **Automation with real integrations.** The platform is designed to connect existing systems rather than replace them.
- **AI-native.** LLM nodes, tool use, and multi-step agents are first-class, and the repository topics include `mcp`, `mcp-client`, and `mcp-server`.
- **Self-hosting.** Docker and npm installation keep workflow data on the user's infrastructure.
- **Observable execution.** Executions, pinned test data, and per-node results make failures inspectable.

## Key concepts

- **Workflow** — a JSON graph of nodes and connections with settings such as timezone, error workflow, and active state.
- **Node** — a trigger or action. Trigger nodes start executions; action nodes call services or transform data.
- **Credential** — an encrypted connection record, referenced by name from nodes. Never place secrets directly in node parameters or exported JSON.
- **Execution** — one run of a workflow, with per-node input and output data.
- **Public REST API** — `/api/v1/*` endpoints authenticated with `X-N8N-API-KEY`, used for workflow CRUD and activation.
- **MCP surfaces** — the installed version may expose MCP Client Tool and MCP Server Trigger nodes. Confirm availability in that version before relying on them.
- **CLI** — `n8n export:workflow`, `n8n import:workflow`, and execution commands for operator tasks.

## Workflow / architecture

1. Choose hosting: Docker (`docker.n8n.io/n8nio/n8n`), the official install script, or npm. The README recommends Docker for a quick start.
2. Create the API key in the n8n UI and pass it through an environment variable, never the command line.
3. Inventory before editing: list workflows and export the current JSON. Store exports in version control with credentials stripped.
4. Change on a copy or in a staging workflow. Pin representative input data and run a manual execution.
5. Activate only after the test execution passes. Capture the execution ID as evidence.
6. For automation from an agent, prefer the public REST API and deterministic JSON over UI clicking. The `n8n-workflow-automation` skill drives `tools/n8n_workflow_tool.py`.
7. On rollback, re-import the last known-good workflow JSON and re-run a test execution.

## Verified behavior

Read from the repository and GitHub metadata on 2026-11-22:

- README documents the fair-code license split, the Docker quick start, 1,500+ integrations, 9,000+ templates, and model-provider flexibility.
- `LICENSE.md` confirms the Sustainable Use License terms and the separate Enterprise License for `.ee` files.
- Repository topics include `mcp`, `mcp-client`, and `mcp-server`.
- Repository metrics at verification time: about 211.8k stars, 61.6k forks.

No n8n instance was installed or executed during verification.

## Limitations

- The checkout is very large and the monorepo requires Node.js tooling; this is not a lightweight dependency.
- License restrictions block redistribution and commercial hosting without an enterprise agreement.
- Integrations depend on external APIs, credentials, and rate limits that AllForOne cannot verify.
- MCP node names and options change between versions; verify them in the installed release.
- Exported workflows can contain secrets or customer data. Sanitize before storage or sharing.
- The public API does not cover every UI feature; some operations still require the editor or CLI.

## How the assistant should use it

- Activate the `n8n-workflow-automation` skill for design, export, debugging, and safe activation.
- State the license limits before proposing any redistribution or hosted service.
- Never store API keys or exported credentials in knowledge, memory, or git.
- Prefer export → edit → test → activate, and keep a rollback copy.
- Treat n8n MCP endpoints as privileged automation surfaces; scope tokens and require confirmation for destructive changes.
- Cite this document when recommending n8n so the user sees the license boundary.

## References

- https://github.com/n8n-io/n8n
- https://github.com/n8n-io/n8n/blob/master/README.md
- https://github.com/n8n-io/n8n/blob/master/LICENSE.md
- https://docs.n8n.io
- https://docs.n8n.io/hosting/installation/docker/
- https://faircode.io

---
name: n8n-workflow-automation
description: Design, export, test, and safely activate n8n workflows, or self-host n8n, with the fair-code license boundary enforced. Use when the user asks to automate a process with n8n, debug an n8n workflow, export workflows as JSON, connect n8n to an AI agent or MCP surface, or evaluate self-hosting.
---

# n8n workflow automation

Operate n8n as an automation platform while keeping the Sustainable Use License boundary, credentials, and production state under control.

## When to activate

- The user asks to build, review, debug, export, import, activate, or deactivate n8n workflows.
- The user wants to connect n8n to an agent through the REST API or MCP nodes.
- The user is choosing between self-hosted n8n and another automation tool.

## License gate — state this before proposing deployment

n8n is fair-code, not OSI open source.

- Internal business use or non-commercial/personal use only.
- Redistribution is allowed only free of charge for non-commercial purposes.
- `.ee` files require a valid n8n Enterprise License.
- Content on branches other than `master` is not licensed.
- Never vendor n8n code, `.ee` files, or customer workflow exports into AllForOne or any public repository.

## Non-negotiables

1. **Credentials stay out of chat, JSON, git, and memory.** Use n8n credentials and environment variables.
2. **Export before edit.** Save the current workflow JSON before changing anything.
3. **Test before activate.** Pin representative input data, run a manual execution, and keep the execution ID as evidence.
4. **Change one workflow at a time.** Avoid bulk activation or deletion.
5. **Confirm destructive actions.** Deactivation, deletion, and credential changes require explicit approval.
6. **Sanitize exports.** Remove secrets, customer data, internal URLs, and tokens before storing or sharing.

## Discover the instance

1. Confirm the base URL, for example `https://n8n.example.com` or `http://localhost:5678` for local self-hosting.
2. Create an API key in the n8n UI.
3. Export the environment variables for the current shell:

   ```bash
   export N8N_BASE_URL="https://n8n.example.com"
   export N8N_API_KEY="<key>"
   ```

4. Run the helper against the instance:

   ```bash
   python tools/n8n_workflow_tool.py health
   python tools/n8n_workflow_tool.py list --json
   ```

The helper refuses plain HTTP except for localhost and never prints the key.

## Workflow change loop

1. **Inventory.** List workflows and identify the target by name and ID.
2. **Export.** `python tools/n8n_workflow_tool.py export --dir ./n8n-backup` writes sanitized JSON and a manifest.
3. **Design.** Edit on a copy. Name nodes clearly. Set error handling and timezone explicitly. Avoid inline secrets.
4. **Test.** Import the draft as inactive if needed, pin test data, and run a manual execution.
5. **Activate.** `python tools/n8n_workflow_tool.py activate <id> --yes` only after the test execution succeeds.
6. **Verify.** Read the execution result and confirm the expected output path.
7. **Roll back.** Re-import the saved JSON, re-run a test execution, and deactivate if the rollback is incomplete.

## AI and MCP surfaces

- The installed n8n version may expose MCP Client Tool and MCP Server Trigger nodes. Verify the node names in that version before designing around them.
- Treat an MCP trigger as a privileged entry point: scope the exposed tools, require authentication, and log executions.
- Do not point an agent at a production MCP trigger without a written scope and a rollback plan.
- Prefer the public REST API plus deterministic JSON for agent automation; use MCP when the user explicitly wants an MCP bridge.

## Self-hosting checks

- Docker is the quickest route: `docker volume create n8n_data`, then run `docker.n8n.io/n8nio/n8n` on port 5678 with the volume mounted.
- Persist `n8n_data`, set `N8N_ENCRYPTION_KEY`, and back up the database before upgrades.
- Put TLS and authentication in front of any internet-facing instance.
- Pin the image version and read release notes before upgrading.
- Confirm the license still fits the intended use.

## Outputs

- Workflow inventory with IDs and active state.
- Export directory and manifest.
- Test execution ID and result.
- Activation or rollback record.
- License note for the user's intended use.

## Failure modes

- 401: missing or wrong `X-N8N-API-KEY`.
- 404 on activation: workflow ID is wrong or the endpoint version differs; check `/api/v1/workflows`.
- Import failure: node type missing because a community node package is not installed.
- Silent data loss: editing an active workflow without an export.
- License violation: hosting n8n as a paid service or redistributing `.ee` files.

## References

- `knowledge/n8n_workflow_automation.md`
- `tools/n8n_workflow_tool.py`
- https://docs.n8n.io
- https://docs.n8n.io/hosting/installation/docker/
- https://github.com/n8n-io/n8n/blob/master/LICENSE.md

---
name: bailian-docs-llm-wiki
description: Use when the user asks about Alibaba Cloud Bailian model catalogs, API parameters, error codes, application development, RAG, memory, plugins, fine-tuning, deployment, or multimodal capabilities. Routes to the official documentation instead of shipping a 33 MB third-party mirror.
---

# Bailian Documentation Router

The full documentation mirror is intentionally not vendored. It is large, changes often, and contains example credentials and private-address snippets that do not belong in a public repository.

Use the official sources:

- Model catalog and pricing: <https://help.aliyun.com/zh/model-studio/models>
- API reference: <https://help.aliyun.com/zh/model-studio/developer-reference/>
- Error codes: <https://help.aliyun.com/zh/model-studio/error-code>
- Application and RAG guides: <https://help.aliyun.com/zh/model-studio/>

## Workflow

1. Identify the exact product surface: model API, application, RAG, memory, plugin, fine-tune, deployment, or batch.
2. Fetch the official page for that surface.
3. Quote the parameter, limit, or error code with its source URL.
4. Mark unverified details as `Unknown` instead of guessing.
5. Never paste real API keys or private endpoints into an answer or a repository. Use environment variables.

For CLI operations, use the `bailian-cli` skill. For model selection, use `bailian-model-recommend`. For generation, use `bailian-gen`.

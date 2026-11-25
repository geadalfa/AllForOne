---
name: allforone-knowledge
description: Use when a task needs durable guidance from the AllForOne public knowledge base — engineering discipline, UI/UX, security review, finance, writing, research, documents, Windows/macOS engineering, or agent operations. Routes to one to three documents instead of loading the whole folder.
---

# AllForOne Knowledge Router

The knowledge base lives at `${CLAUDE_PLUGIN_ROOT}/knowledge/`. Read `knowledge/INDEX.md` first, then open only the one to three documents the task needs. Never load the whole folder.

## Routing

- Engineering discipline, anti-vibe coding, evidence: `anti_vibe_coding_engineering_protocol.md`, `disciplined_software_engineering_framework.md`.
- Spec-first work, large repositories, token budgets: `spec_driven_development_and_token_compression.md`, `polyglot_architecture_and_graph_code_intelligence.md`.
- UI, UX, writing, QA: `ui_ux_anti_slop_design_engineering.md`, `human_writing_and_technical_prose.md`, `software_qa_and_testing_discipline.md`.
- Web capture and page evidence: `pagesource_web_resource_capture.md`, `web_content_extraction_protocol.md`.
- Security review: `cross_platform_uiux_qa_security_playbook.md`; use the `bughunter-defensive-review` skill for the class-by-class workflow.
- Finance and trading: `finance_economics_macro_micro_map.md`, `financial_market_and_etf_intelligence.md`, `holistic_financial_agent_intelligence.md`.
- Research and agent memory: `gbrain_agent_brain_patterns.md`, `paper_orchestra_research_writing_pipeline.md`, `knowledge_ingestion_automation.md`.
- Documents and local apps: `high_precision_ocr_and_document_conversion.md`, `windows_desktop_app_engineering.md`, `macos_native_dmg_app_development.md`.
- Automation and smart home: `ha_mcp_home_assistant_automation.md`, `ruview_wifi_csi_sensing.md`.
- Writing in Indonesian: `humanizer_id_indonesian_academic_editing.md`.
- Agent standards: `agents_md_open_standard_specification.md`.

## Rules

1. Cite the document name when a decision comes from it.
2. Prefer the document over memory when they conflict; memory may be stale.
3. Mark conclusions as `Verified`, `Inferred`, `Assumed`, or `Unknown`.
4. Do not invent file paths, APIs, or claims. If the knowledge base does not cover it, say so and verify elsewhere.
5. Never copy private or employer-specific data into a public artifact. Use `privacy-publish-gate` before publishing.

## MCP access

When the AllForOne MCP server is available, prefer these tools over manual file reads:

- `allforone_search_knowledge`
- `allforone_read_knowledge`
- `allforone_list_skills`

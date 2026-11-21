# AutoClip: Open-Source AI Video Clipping and Repurposing

Source: zhouxiaoka/autoclip · MIT · verified 2026-11-21
Repository: https://github.com/zhouxiaoka/autoclip · Site: https://zhouxiaoka.github.io/autoclip_intro/
Baseline: HEAD `cd8e6bed18d8` (2026-11-03), release v1.5.8 (2026-11-02), Python/TypeScript/Tauri, about 113 MB, 12.2k stars.

## What it is

AutoClip turns one source — a YouTube or Bilibili link, or a local long video such as a lecture, interview, podcast, or course — into platform-ready short videos, covers, publish copy, and ZIP publish kits. Rendering happens on the local machine; cloud models are optional and user-supplied.

It ships as a desktop app (macOS Apple Silicon and Windows x64), a Docker web service, and a CLI/MCP server that shares the same pipeline and data directory as the desktop app.

## Why it matters

- Repurposing long-form content into vertical shorts is otherwise a manual, tool-heavy workflow.
- The pipeline is inspectable and local-first: editing, framing, and rendering stay on the machine.
- The MCP surface lets an agent drive the same pipeline deterministically instead of clicking a GUI.

## Key concepts

- **Quick output** — one call from source to clips, covers, copy, and kits.
- **Platforms** — `douyin`, `xiaohongshu`, `bilibili`, `tiktok`, `instagram_reels`, `youtube_shorts`, `youtube_long`; `reels` and `shorts` are aliases. `youtube_long` requires clips of at least 180 seconds.
- **Portrait style** — `auto`, `interview`, `podcast`; affects vertical layout only.
- **Edit style** — `editorial`, `street`, `news`, `cinema`, `classic`. CLI/MCP default is `classic`; the desktop import page defaults to `editorial`.
- **Transcription** — author-provided subtitles first, then local Whisper/SenseVoice, or cloud ASR.
- **MCP tools** — `get_version`, `start_quick_output`, `get_quick_output_status`, `list_styles` (when `mcp_v2_tools` is enabled).
- **Terminal states** — `completed`, `partial`, `failed`, `interrupted`, `cancelled`; `unknown` means no such task.

## Workflow / architecture

- Frontend: React web UI; desktop shell: Tauri.
- Backend: FastAPI service; the Docker deployment exposes the web UI on port 3000 and API docs on port 8000.
- Media: FFmpeg and FFprobe; link ingestion uses yt-dlp.
- Models: any OpenAI-compatible provider, plus Ollama (`http://localhost:11434/v1`) and LM Studio (`http://localhost:1234/v1`).
- CLI/MCP: Python 3.10+ (3.11 recommended) and FFmpeg on PATH; `autoclip produce <source> --json`, `autoclip outputs <project_id> --export-kits`, `autoclip mcp`.
- One-line MCP install: `uvx autoclip-mcp`; agent skill: `npx skills add zhouxiaoka/autoclip`.
- MCPB packaging: `python scripts/pack_mcpb.py` produces `dist/autoclip-mcp.mcpb` for Smithery.

## Data flow and privacy

- Editing and rendering are local.
- Cloud analysis sends the relevant subtitles and copy; vision analysis or reference-frame generation sends sampled frames; cloud transcription sends audio.
- Finished videos are uploaded only when a publish target is explicitly connected.
- Anonymous telemetry and crash reports can be disabled in settings.
- API keys live in the desktop settings or `AUTOCLIP_API_KEY`; never pass them through tool arguments or chat.

## Verified behavior

Read directly from the repository and README on 2026-11-21:

- README documents desktop, Docker, CLI, and MCP installation paths, platform list, style IDs, and cost/time measurements for three real inputs.
- `skills/autoclip/SKILL.md` defines the agent workflow, polling rules, terminal states, and the one-source-at-a-time batch rule.
- `mcpb/manifest.json` and `server.json` exist for MCP distribution; the MCP name is `io.github.zhouxiaoka/autoclip-mcp`.
- Docker Compose and environment examples are present at the repository root.
- The skill instructs calling `get_version` first and never comparing against a hard-coded version.

No install or render was executed during verification.

## Limitations

- Heavy runtime: Python virtual environment, FFmpeg, and optional local transcription models (about 220 MB on first download).
- Cloud models and transcription require credentials and incur provider costs.
- Intel Macs have no desktop package; use Docker or the CLI.
- Documentation and UI are Chinese-first; English docs exist but are less complete.
- Long videos can take tens of minutes; results depend on subtitle quality and model choice.
- Output quality for gameplay or low-speech footage needs vision-capable models and manual review.

## How the assistant should use it

- Only start a job when the user explicitly asks for clipping or repurposing.
- Confirm the platform and optional style before submitting.
- Prefer MCP tools when available; otherwise use `autoclip produce --json`.
- Poll using `poll_after_sec`, report stage/progress/ETA in one sentence, and wait for a terminal state.
- Submit one source at a time; never invent `sources` arrays or style IDs.
- Never echo API keys or environment values.
- Treat MCP as staged: document the command, but do not enable it without consent.

## References

- https://github.com/zhouxiaoka/autoclip
- https://zhouxiaoka.github.io/autoclip_intro/
- https://github.com/zhouxiaoka/autoclip/blob/main/skills/autoclip/SKILL.md
- https://github.com/zhouxiaoka/autoclip/blob/main/docs/CLI_AND_MCP.md
- https://github.com/zhouxiaoka/autoclip/blob/main/docs/PRIVACY.md

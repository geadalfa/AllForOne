---
name: autoclip
description: Use when the user wants to clip, repurpose, or package long video — "potong video", "bikin short", "出片", "clip this podcast", a YouTube or Bilibili link turned into shorts, covers, publish copy, or ZIP kits. Produces per-platform clips, covers, captions, and kits through the AutoClip CLI or MCP. Do not use for single-frame extraction, subtitle-only edits, or plain video trimming.
---

# AutoClip: Long Video to Platform Kits

AutoClip is an MIT-licensed local pipeline (desktop, Docker, CLI, MCP) that turns one source into platform-ready clips, covers, publish copy, and ZIP kits. Editing and rendering stay on the local machine; cloud models are optional.

Verify the installed version first with `autoclip --version` or the MCP tool `get_version`. Never compare against a hard-coded version.

## When to use

The user supplies a YouTube/Bilibili HTTPS link or an absolute local path to a long video (lecture, interview, podcast, course) and wants finished clips, not a raw cut list. Deliver four things, and name any that are missing:

1. Platform-ready clips
2. Covers
3. Publish copy
4. ZIP publish kits

Do not use for frame extraction at timestamps, subtitle-only work, or trimming a single segment.

## Preconditions

- CLI: Python 3.10+ (3.11 recommended), FFmpeg and FFprobe on PATH.
- Model access: configure a provider in the desktop settings, or set `AUTOCLIP_API_KEY`. Ollama and LM Studio work locally without a cloud key.
- Ask for the platform and optional style when the user did not specify them. Never invent values.
- Do not install the runtime or download models without explicit consent.

## Workflow

1. Choose the transport: MCP tools if available, otherwise `autoclip produce <source> --json`.
2. Call `start_quick_output` with `source` and `platforms`; pass `srt_path` when subtitles exist. One source per job.
3. Record `project_id`, then poll `get_quick_output_status` using `poll_after_sec` (default 10 seconds).
4. Report `stage`, `progress`, and `eta` in one sentence per poll.
5. Terminal states: `completed`, `partial`, `failed`, `interrupted`, `cancelled`. `unknown` means no such task and must not be reported as success.
6. After a terminal state, query once with `export_kits=true`.
7. Deliver the video path, cover path, copy title, and ZIP path per platform. For `partial`, deliver finished platforms and name the failed ones without resubmitting the whole job.

## Rules

- Platforms: `douyin`, `xiaohongshu`, `bilibili`, `tiktok`, `instagram_reels`, `youtube_shorts`, `youtube_long`. `reels` and `shorts` are aliases. `youtube_long` requires clips of at least 180 seconds.
- Styles: `editorial`, `street`, `news`, `cinema`, `classic`. CLI/MCP default is `classic`; pass `template` only when `mcp_v2_tools` is enabled.
- Portrait style: `auto`, `interview`, `podcast`; affects vertical layout only.
- Submit one source at a time; never build a `sources` array or run parallel jobs.
- Never print API keys, environment values, or tokens.
- Do not promise exact durations or unsupported styles.

## Install when missing

- MCP one-liner: `uvx autoclip-mcp`.
- Upstream agent skill: `npx skills add zhouxiaoka/autoclip`.
- Source install: create a virtual environment, `pip install -r requirements.txt`, then `pip install --no-deps .`.
- Docker: `docker compose up -d --build`; web UI on port 3000, API docs on port 8000.

## Source and license

Adapted from `zhouxiaoka/autoclip`, MIT, Copyright (c) 2024 AutoClip Team. Upstream: https://github.com/zhouxiaoka/autoclip. See `docs/CLI_AND_MCP.md`, `docs/PRIVACY.md`, and the upstream `skills/autoclip/SKILL.md`.

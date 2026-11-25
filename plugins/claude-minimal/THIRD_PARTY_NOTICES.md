# Third-Party Notices

AllForOne's original code and prose are licensed under the PolyForm Noncommercial License 1.0.0. The following components keep their own licenses.

## Vendored skills

| Component | License | Attribution |
|---|---|---|
| `claude-trading-skills` subset | MIT | Copyright (c) Tradermonty. See `licenses/claude-trading-skills-LICENSE.txt`. |
| `bughunter-defensive-review` | MIT (code), CC BY 4.0 (prose) | Sachin Sharma / Claude-BugHunter. See `skills/bughunter-defensive-review/LICENSE`, `LICENSE-CONTENT`, and `NOTICE`. |
| `agent-asset-hygiene` GBrain conventions | MIT | Copyright (c) Garry Tan. See `licenses/gbrain-LICENSE.txt`. |
| `cli-hub-meta-skill` | Apache-2.0 | HKUDS / CLI-Anything. See `licenses/cli-anything-LICENSE.txt`. |
| `autoclip` | MIT | Copyright (c) 2024 AutoClip Team. See `licenses/autoclip-LICENSE.txt`. |
| `socratic-tutor` | MIT | Copyright (c) 2026 Jane Street Group, LLC. See `skills/socratic-tutor/LICENSE.md` and `licenses/janestreet-agent-skills-LICENSE.txt`. |
| `humanizer-id` and 14 sub-skills | MIT | Copyright (c) 2026 Hafizh Muzani. See `skills/humanizer-id/LICENSE` and `licenses/humanizer-id-LICENSE.txt`. |
| `reality-check` | MIT | Copyright (c) Microsoft Corporation. See `licenses/reality-check-LICENSE.txt`. |

The defensive security subset is included for static review. Offensive-only classes and any material requiring a live target are not included.

## Repositories cloned by the installer

These are cloned into the AllForOne state directory when the matching profile or a full install is selected. They are not relicensed by AllForOne.

| Repository | License | Use |
|---|---|---|
| [miqdadbadjuber/anti-slop](https://github.com/miqdadbadjuber/anti-slop) | MIT | Qoder plugin installed when selected. |
| [andycungkrinx91/konoha](https://github.com/andycungkrinx91/konoha) | Apache-2.0 | Reference clone; MCP runtime is manual. |
| [tradermonty/claude-trading-skills](https://github.com/tradermonty/claude-trading-skills) | MIT | Upstream tracking for the vendored subset. |
| [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) | MIT / CC BY 4.0 | Attribution for the earlier defensive review collection. The current guide is bundled locally. |
| [garrytan/gbrain](https://github.com/garrytan/gbrain) | MIT | Reference clone; runtime is not installed. |
| [apissaj/humanizer-id](https://github.com/apissaj/humanizer-id) | MIT | Upstream tracking for the vendored Humanizer ID skill pack. See `licenses/humanizer-id-LICENSE.txt`. |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | MIT | Reference clone; the Qoder Marketplace plugin is the supported runtime. |
| [microsoft/amplifier-smart-tool-reality-check](https://github.com/microsoft/amplifier-smart-tool-reality-check) | MIT | Upstream tracking for the vendored `reality-check` skill. See `licenses/reality-check-LICENSE.txt`. |
| [obra/superpowers](https://github.com/obra/superpowers) | MIT | Reference clone; the Qoder Marketplace plugin is the supported runtime. |
| [homeassistant-ai/ha-mcp](https://github.com/homeassistant-ai/ha-mcp) | MIT | Reference clone only; requires Home Assistant and a token. |
| [google-research/paper-orchestra](https://github.com/google-research/paper-orchestra) | Apache-2.0 | Reference clone only. |
| [ruvnet/RuView](https://github.com/ruvnet/RuView) | MIT | Reference clone only; real sensing needs hardware. |
| [mavismmg/MFGAdaUnlock-RenoDx](https://github.com/mavismmg/MFGAdaUnlock-RenoDx) | MIT | Reference clone only; the released ReShade add-on is downloaded by the user, not redistributed. See `licenses/MFGAdaUnlock-RenoDx-LICENSE.txt`. |
| [ShyVortex/dlss-unlocked](https://github.com/ShyVortex/dlss-unlocked) | MIT | Reference clone only; the setup and standalone packages are downloaded by the user, not redistributed. See `licenses/dlss-unlocked-LICENSE.txt`. |
| [HKUDS/CLI-Anything](https://github.com/HKUDS/CLI-Anything) | Apache-2.0 | Upstream tracking for the vendored meta-skill; the hub package is installed by the user. See `licenses/cli-anything-LICENSE.txt`. |
| [toeverything/AFFiNE](https://github.com/toeverything/AFFiNE) | MIT (core) / separate backend and native licenses | Reference clone only; not vendored. |
| [mjmirza/app-store-compliance](https://github.com/mjmirza/app-store-compliance) | LicenseRef-OpenRoots-ORA-2.3 | Reference clone only; intentionally not vendored because ORA 2.3 restricts AI-training use and redistribution. |
| [zhouxiaoka/autoclip](https://github.com/zhouxiaoka/autoclip) | MIT | Upstream tracking for the adapted skill; the runtime is installed by the user. See `licenses/autoclip-LICENSE.txt`. |
| [NationalSecurityAgency/ghidra](https://github.com/NationalSecurityAgency/ghidra) | Apache-2.0 | Reference clone only; the official release is downloaded by the user, not redistributed. |
| [n8n-io/n8n](https://github.com/n8n-io/n8n) | Sustainable Use License (fair-code) | Reference clone only; never vendored. The license restricts use to internal, personal, or non-commercial purposes, and `.ee` files require an enterprise license. |
| [janestreet/agent_skills](https://github.com/janestreet/agent_skills) | MIT | Upstream tracking for the vendored `socratic-tutor` skill. See `licenses/janestreet-agent-skills-LICENSE.txt`. |
| [QoderAI/better-harness](https://github.com/QoderAI/better-harness) | MIT | Reference clone only. Qoder Desktop bundles an entry point; the standalone CLI is the npm package `@qoder-ai/better-harness`, not redistributed here. |
| [QoderAI/Qoderian](https://github.com/QoderAI/Qoderian) | MIT (portions derived from Claudian, MIT) | Reference clone only. The Obsidian plugin is installed by the user from Obsidian's community list or a GitHub release, not redistributed here. |

## Media

The README uses two pieces of fan media:

- `assets/banner.png` and `assets/logo.png`, edited from “Armored All Might vs. All For One” on the My Hero Academia Fandom wiki: <https://static.wikia.nocookie.net/bokunoheroacademia/images/0/0e/Armored_All_Might_Vs._All_For_One.png>. The edit adds a dark gradient, a split accent line, the ALL FOR ONE wordmark, and a square crop.
- A GIF embedded from Tenor: <https://media.tenor.com/04fBdqc9oAkAAAAC/mha-my-hero-academia.gif>.

Character and footage rights belong to Kohei Horikoshi / Shueisha / Bones. The media is used for identification and is not covered by the PolyForm Noncommercial license. If the rights holder objects, the media will be removed.

## Community skills

Some skills were adapted from the public agent-skill ecosystem. If you recognize your work and the attribution is incomplete, open an issue with the source and license, and it will be corrected or removed.

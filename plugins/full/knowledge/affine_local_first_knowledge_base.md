# AFFiNE: Local-First Knowledge Base and Whiteboard

Source: toeverything/AFFiNE · MIT core with separate backend/native licenses · verified 2026-11-21
Repository: https://github.com/toeverything/AFFiNE · Product: https://affine.pro · Docs: https://docs.affine.pro
Baseline: default branch `canary`, HEAD `a2dbbec72b57` (2026-11-20), release v2026.11.18-canary.905, TypeScript/Rust, about 458 MB checkout.

## What it is

AFFiNE is an open-source, local-first workspace that merges documents and an edgeless whiteboard into one canvas. It is positioned as a Notion and Miro alternative: rich text, sticky notes, embedded pages, shapes, slides, and multi-view databases can all live on the same board, and the same content can switch between document and canvas views.

It ships as a web app, an Electron desktop app, and a self-hostable server. Real-time collaboration uses CRDTs, so edits work offline and sync when peers reconnect.

## Why it matters

- **Reference architecture for local-first knowledge tools.** CRDT sync, block-based editing, and a Rust data engine are directly reusable design patterns for note, wiki, and whiteboard products.
- **Self-hostable alternative.** A team can run its own workspace with Docker instead of sending documents to a SaaS.
- **Block model.** The editor treats every element as a block, which makes embedding, linking, and database views composable.

## Key concepts

- **BlockSuite** — the collaborative block editor framework behind AFFiNE.
- **y-octo** — a native Rust implementation of Yjs CRDT, used for high-performance, thread-safe sync.
- **OctoBase** — a local-first, collaborative database engine written in Rust.
- **yjs** — the CRDT foundation for state and sync on the web.
- **Multi-view database** — one dataset rendered as a table, board, or other view.
- **Edgeless canvas** — an infinite whiteboard where the same blocks can be arranged spatially.

## Workflow / architecture

- Monorepo: `packages/` (frontend, backend, common), `blocksuite/`, `tools/`, `tests/`, `scripts/`.
- Desktop shell: Electron; native Node add-ons via napi-rs.
- State: Jotai plus async-call-rpc; build tooling: Vite.
- Server: Node backend with Prisma and PostgreSQL migrations under `packages/backend/server`.
- Sync: CRDT documents via y-octo/yjs; local persistence plus real-time collaboration.
- Self-host: Docker Compose or one-click Render/Sealos deployment; configuration through environment variables.
- Contribution flow: Contributor License Agreement required before a pull request can merge.

## Licensing

- The root `LICENSE` states that content outside `packages/backend` and `packages/common/native` is MIT (`LICENSE-MIT`).
- `packages/backend` and `packages/common/native` carry their own license files in their directories.
- Third-party components keep their original licenses.
- Verify the backend license before embedding the server in a commercial product; do not assume the whole repository is MIT.

## Verified behavior

Read directly from the repository on 2026-11-21:

- README confirms the Notion/Miro positioning, merged docs and whiteboard, local-first sync, AI features, and self-hosting.
- Upstream acknowledgements list BlockSuite, y-octo, OctoBase, yjs, Electron, React, napi-rs, Jotai, async-call-rpc, and Vite.
- The repository exposes Docker deployment assets, a Render button, and a Sealos deployment link.
- Repository metrics at verification time: about 75.8k stars, 5.6k forks.
- Default branch is `canary`; releases are canary-tagged snapshots.

No build or deployment was executed during verification.

## Limitations

- Large monorepo and rapid canary cadence make it a heavy reference, not a drop-in dependency.
- The license split means a commercial self-host needs legal review of the backend and native directories.
- AI features may depend on cloud services and credentials.
- Desktop packaging and native modules increase build complexity.
- Documentation for deep internals is thinner than for end-user features.

## How the assistant should use it

- Use it as an architecture reference for local-first CRDT editors, block models, and offline sync.
- When self-hosting is requested, follow the official Docker documentation and pin a canary release.
- Read the backend license before any redistribution or commercial embedding.
- Do not vendor the repository into a capability pack; link to upstream and reuse patterns.
- Attribute BlockSuite and OctoBase when reusing code or design.

## References

- https://github.com/toeverything/AFFiNE
- https://affine.pro
- https://docs.affine.pro/self-host-affine
- https://github.com/toeverything/BlockSuite
- https://github.com/toeverything/OctoBase
- https://github.com/y-crdt/y-octo

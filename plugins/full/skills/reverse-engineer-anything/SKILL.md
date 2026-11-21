---
name: reverse-engineer-anything
description: Compare local software artifacts and release packages using static metadata, file inventories, licensing records, and build evidence.
---

# Compare shipped artifacts

Use this workflow to explain differences between local software builds. Record each artifact's filename, version, source and SHA-256 digest. Work on copies and inspect archive directories before extracting files.

Compare package manifests, signed metadata, declared dependencies, resource names, and build or symbol information that is already present. Relate differences to source revisions or release notes where available. For binaries, separate metadata observations from conclusions that require source or runtime evidence.

Report added, removed and changed components with the evidence supporting each conclusion. If build provenance is missing, record it as an open question. This workflow requires local file inspection only.

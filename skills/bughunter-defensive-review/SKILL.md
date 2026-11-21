---
name: bughunter-defensive-review
description: Review source code, pull requests, and existing scanner results for security defects. Trace trust boundaries, cite evidence, and recommend a targeted fix.
---

# Defensive code review

Identify the changed entry point, the data it accepts, and the trust boundary it crosses. Read the code that enforces the relevant invariant. For example, check whether object ownership is verified on every access path and whether a database query binds input as a parameter.

Record the file and line, affected callers, preconditions, and likely impact. Distinguish a code path you have traced from an assumption about deployment. For dependency findings, check the resolved version and whether the affected function is reachable. Preserve original scan reports and label inferred impact separately.

Recommend a small fix at the enforcement point and a regression test using local fixtures. Limit work to source, configuration and reports supplied for the review. Exclude live-target testing and sensitive values from findings.

This static review edition replaces the earlier vendored reference collection. Attribution for the original material is in the adjacent NOTICE and the project’s THIRD_PARTY_NOTICES.md.

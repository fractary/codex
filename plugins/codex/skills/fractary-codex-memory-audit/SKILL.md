---
name: fractary-codex-memory-audit
description: Audit memory entries for validity by checking claims against current project state and scoring relevance
---

# Memory Audit

Scans memories in `.fractary/codex/memory/`, extracts verifiable claims, checks them against current project state, and scores validity.

## Workflow

1. **Discover memories**: Search for files matching `.fractary/codex/memory/**/*.md`. Filter by `--type` or `--id` if provided. Skip `status: deprecated`.
2. **Extract claims**: Parse each memory for file references, package names, config keys, code references, version references.
3. **Verify claims**: Check each claim against project state — search for files, search content for packages/code/config, read files for versions.
4. **Score validity**: Read `docs/scoring-algorithm.md` for the scoring formula.
5. **Deep analysis** (if `--deep`): Read `docs/deep-analysis.md` for git history, contradiction detection, and superseded memory checks.
6. **Present findings**: For memories below threshold (default 0.5), read `docs/user-decisions.md` for the decision flow.
7. **Apply decisions**: Update frontmatter based on user choices (keep/update/deprecate/delete).
8. **Update timestamps**: Set `last_audited` to current time for all audited memories.
9. **Print summary**: Total scanned, score distribution, actions taken.

## Critical Rules

1. ALWAYS verify claims against actual project state — never assume validity
2. ALWAYS ask the user before changing status or deleting
3. NEVER modify memory content without user approval — only `last_audited` updates automatically
4. ALWAYS provide evidence when flagging — show claim, current state, and conflict
5. Skip `status: deprecated` memories unless needed for cross-reference

## Summary Format

```
Memory Audit Complete

  Total scanned: N
  Skipped (deprecated): N
  Audited: N

  Score distribution:
    Valid (0.8-1.0):   N
    Partial (0.5-0.79): N
    Warning (0.3-0.49): N
    Critical (0.0-0.29): N

  Actions taken:
    Kept as-is: N
    Updated: N
    Deprecated: N
    Deleted: N
```

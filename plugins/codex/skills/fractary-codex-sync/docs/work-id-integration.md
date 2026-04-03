# Work ID Integration

When `--work-id` is provided, the sync operation is scoped to files relevant to the GitHub issue and a summary comment is posted after completion.

## Steps

### 1. Fetch Issue Context

```bash
gh issue view <work-id> --json title,body,comments,labels \
  --jq '{title: .title, body: .body, labels: [.labels[].name], comments: [.comments[].body]}'
```

If the issue fetch fails, continue with default sync patterns and note the fetch error.

### 2. Infer Include Patterns

Analyze issue content to determine relevant file patterns. Check in priority order:

**A. Explicit `--include` patterns from user** take precedence over all inference. Skip inference if user provided explicit patterns.

**B. Direct file references** in the issue body or comments:
- Explicit paths: `docs/api/endpoints.md`, `specs/SPEC-001.md`
- Glob patterns: `*.md files in docs/`, `all templates`
- Directory references: `the api docs`, `spec files`

**C. Component/feature keywords** — see `docs/pattern-mapping.md` for the full mapping table.

**D. Labels** — see `docs/pattern-mapping.md` for label-to-pattern mapping.

**E. No patterns inferred** — use default sync patterns (do not narrow scope).

### 3. Add Inferred Patterns to CLI Command

Append each inferred pattern as `--include <pattern>` flags to the sync command.

Report inferred patterns to the user before executing:
```
Inferred patterns from issue:
  - docs/api/**/*.md
  - specs/*api*.md
```

### 4. Post Issue Comment (after sync completes)

Only when sync is NOT `--dry-run` and completed:

```bash
gh issue comment <work-id> --body "$(cat <<'EOF'
## Codex Sync Report

**Direction:** <direction>
**Environment:** <env> (<branch>)
**Status:** <status>

### Summary
- **Files synced:** <synced_count>
- **Files skipped:** <skipped_count>
- **Files failed:** <failed_count>

### Files Changed
<list of files with operations>

---
*Automated sync by fractary-codex*
EOF
)"
```

If `--dry-run`: mention that a comment would be created on a real sync, but do not post.

### 5. Status Block

Always end with a parseable status block:
```
---
SYNC_STATUS: <success|warning|failure>
WORK_ID: <work-id or none>
FILES_SYNCED: <count>
FILES_FAILED: <count>
ISSUE_COMMENT: <created|skipped|dry-run>
---
```

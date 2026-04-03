---
name: fractary-codex-sync
description: Sync project bidirectionally with codex repository, with optional GitHub issue scoping. Use when syncing with the codex.
---

# Codex Sync

Sync the current project with the codex repository. Supports bidirectional sync, issue-scoped sync, and dry-run previews.

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--work-id <id>` | No | GitHub issue number or URL to scope sync to |
| `--to-codex` | No | Push local files to codex repository |
| `--from-codex` | No | Pull files from codex to local cache |
| `--dry-run` | No | Preview what would be synced (no changes made) |
| `--env <env>` | No | Target environment (dev, test, staging, prod) |

If no direction is specified, performs bidirectional sync (both to-codex and from-codex).

When `--work-id` is provided, the sync will:
1. Fetch the issue description and comments to understand context
2. Narrow the sync to documents relevant to that issue
3. Create a comment on the issue after sync completion

## Execution

Run: `fractary-codex sync [--work-id <id>] [--to-codex|--from-codex] [--dry-run] [--env <env>]`

## Critical Rules

**This is a READ-ONLY operation with respect to configuration:**
- NEVER modify `.fractary/config.yaml` or any configuration files
- NEVER add, remove, or change sync patterns
- NEVER "fix" configuration if sync finds no files
- If sync fails or finds no files, report the error and STOP
- The user must manually fix their own configuration

**After sync completes, DO NOT take any follow-up actions** to "help" fix problems. Simply report the results.

## Status Codes

The sync returns a status indicating the outcome:
- `success`: Sync completed successfully with no issues
- `warning`: Sync completed but with conflicts or partial failures
- `failure`: Sync failed entirely

Report the status and any details to the user.

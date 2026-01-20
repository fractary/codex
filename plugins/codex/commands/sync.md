---
name: fractary-codex:sync
description: Sync project with codex repository - delegates to fractary-codex:sync-manager agent
allowed-tools: Task(fractary-codex:sync-manager)
model: claude-haiku-4-5
argument-hint: '[--to-codex|--from-codex] [--dry-run] [--env <env>]'
---

Use **Task** tool with `fractary-codex:sync-manager` agent to sync project with codex repository.

The sync-manager agent will invoke the `fractary-codex sync` CLI directly.

**Arguments:**
- `--to-codex`: Push local files to codex repository
- `--from-codex`: Pull files from codex to local cache
- `--dry-run`: Preview what would be synced (no changes made)
- `--env <env>`: Target environment (dev, test, staging, prod)

If no direction is specified, performs bidirectional sync (both to-codex and from-codex).

**CRITICAL: This is a READ-ONLY operation**
- NEVER modify `.fractary/config.yaml` or any configuration files
- NEVER add, remove, or change sync patterns
- NEVER "fix" configuration if sync finds no files
- If sync fails or finds no files, report the error and STOP
- The user must manually fix their own configuration

After the sync-manager agent returns, DO NOT take any follow-up actions to "help" fix problems. Simply report the results.

```
Task(
  subagent_type="fractary-codex:sync-manager",
  description="Sync project with codex",
  prompt="Sync project with codex repository: $ARGUMENTS"
)
```

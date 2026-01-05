---
name: fractary-codex:sync
description: Sync project with codex repository - delegates to fractary-codex:sync-manager agent
allowed-tools: Task(fractary-codex:sync-manager)
model: claude-haiku-4-5
argument-hint: '[project-name] [--env <env>] [--to-codex|--from-codex|--bidirectional] [--dry-run] [--include <patterns>] [--exclude <patterns>]'
---

Use **Task** tool with `fractary-codex:sync-manager` agent to sync project with codex repository using provided arguments.

```
Task(
  subagent_type="fractary-codex:sync-manager",
  description="Sync project with codex",
  prompt="Sync project with codex repository: $ARGUMENTS"
)
```

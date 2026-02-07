---
name: fractary-codex:config-update
description: Update specific fields in codex configuration
allowed-tools: Task(fractary-codex:config-updater)
model: claude-haiku-4-5
argument-hint: '[--org <name>] [--codex-repo <name>] [--sync-preset <name>]'
---

Use **Task** tool with `fractary-codex:config-updater` agent to update codex configuration fields.

This command updates specific fields in the existing codex section of `.fractary/config.yaml`. Only the provided fields are modified - all other values are preserved.

Requires: codex section to exist (run `config-initialize` first).

```
Task(
  subagent_type="fractary-codex:config-updater",
  description="Update codex configuration",
  prompt="Update codex config: $ARGUMENTS"
)
```

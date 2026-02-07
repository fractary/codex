---
name: fractary-codex:config-init
description: Initialize codex section in project configuration - requires base config from @fractary/core
allowed-tools: Task(fractary-codex:config-init)
model: claude-haiku-4-5
argument-hint: '[--org <name>] [--codex <repo>] [--sync-preset <name>] [--force]'
---

Use **Task** tool with `fractary-codex:config-init` agent to initialize codex configuration.

This command adds the codex section to an existing `.fractary/config.yaml` (created by `@fractary/core`'s config-initialize).

Requires: `.fractary/config.yaml` to exist. Fails if codex section already exists (use `--force` to overwrite).

```
Task(
  subagent_type="fractary-codex:config-init",
  description="Initialize codex configuration",
  prompt="Initialize codex config: $ARGUMENTS"
)
```

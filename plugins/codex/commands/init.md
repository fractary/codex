---
name: fractary-codex:init
description: Initialize codex plugin configuration - delegates to fractary-codex:config-manager agent
allowed-tools: Task(fractary-codex:config-manager)
model: claude-haiku-4-5
argument-hint: '[--org <name>] [--codex <repo>]'
---

Use **Task** tool with `fractary-codex:config-manager` agent to initialize codex plugin configuration with provided arguments.

```
Task(
  subagent_type="fractary-codex:config-manager",
  description="Initialize codex configuration",
  prompt="Initialize codex plugin configuration: $ARGUMENTS"
)
```

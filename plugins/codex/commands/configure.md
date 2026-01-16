---
name: fractary-codex:configure
description: Configure codex plugin settings - initialize or update configuration - delegates to fractary-codex:config-manager agent
allowed-tools: Task(fractary-codex:config-manager)
model: claude-haiku-4-5
argument-hint: '[--org <name>] [--codex <repo>] [--context <description>]'
---

Use **Task** tool with `fractary-codex:config-manager` agent to configure codex plugin settings with provided arguments.

This command handles both initial configuration and updates to existing configuration.

```
Task(
  subagent_type="fractary-codex:config-manager",
  description="Configure codex settings",
  prompt="Configure codex plugin: $ARGUMENTS"
)
```

---
name: fractary-codex:init
description: '[DEPRECATED] Use /fractary-codex:config instead - Initialize codex plugin configuration'
allowed-tools: Task(fractary-codex:config-manager)
model: claude-haiku-4-5
argument-hint: '[--org <name>] [--codex <repo>] - Use /fractary-codex:config instead'
---

**DEPRECATED**: This command has been renamed to `/fractary-codex:config`.

Use `/fractary-codex:config` instead, which supports both initialization and configuration updates.

For backward compatibility, this command still works and delegates to the config-manager agent.

```
Task(
  subagent_type="fractary-codex:config-manager",
  description="Configure codex settings",
  prompt="Configure codex plugin: $ARGUMENTS"
)
```

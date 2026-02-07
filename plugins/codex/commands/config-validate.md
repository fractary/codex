---
name: fractary-codex:config-validate
description: Validate codex configuration (read-only) - checks structure, formats, directories, MCP
allowed-tools: Task(fractary-codex:config-validator)
model: claude-haiku-4-5
argument-hint: ''
---

Use **Task** tool with `fractary-codex:config-validator` agent to validate codex configuration.

This is a **read-only** operation that checks the codex section of `.fractary/config.yaml` for errors and warnings without modifying any files.

Checks: config structure, field formats, directory existence, MCP server configuration, gitignore entries.

```
Task(
  subagent_type="fractary-codex:config-validator",
  description="Validate codex configuration",
  prompt="Validate codex config: $ARGUMENTS"
)
```

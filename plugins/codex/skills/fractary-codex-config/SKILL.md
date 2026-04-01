---
name: fractary-codex-config
description: Initialize, update, or validate codex configuration in .fractary/config.yaml
user-invocable: true
argument-hint: "<init|update|validate> [--org <name>] [--codex-repo <name>] [--sync-preset <name>] [--force] [--json]"
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---

# Codex Config Manager

Manages the `codex:` section in `.fractary/config.yaml`. Three operations:

## Operations

- **init**: First-time setup of codex configuration. Read `docs/init-protocol.md` for detailed instructions.
- **update**: Modify existing config fields. Read `docs/update-protocol.md` for detailed instructions.
- **validate**: Check config integrity (read-only). Read `docs/validate-protocol.md` for detailed instructions.

## Routing

Parse the first positional argument to determine operation:
- `init` or no arguments with no existing codex section → init operation
- `update` or field-specific flags present (`--org`, `--codex-repo`, `--sync-preset`) → update operation
- `validate` → validate operation

## Common Rules

1. ALL operations delegate to CLI: `fractary-codex config-{operation}` or `npx @fractary/codex-cli config-{operation}`
2. NEVER write YAML directly — the CLI handles file I/O, validation, and persistence
3. `.fractary/config.yaml` must exist (created by `@fractary/core`'s config-initialize). If missing, tell user to run that first.
4. Use `AskUserQuestion` for ALL user prompts — never use plain text questions
5. ALWAYS use `--json` flag when invoking CLI for structured output parsing

## Quick Reference

| CLI Command | Purpose |
|-------------|---------|
| `fractary-codex config-init --org <org> --project <name> --codex-repo <repo> --sync-preset <preset> --json` | Initialize config |
| `fractary-codex config-update --org <org> --codex-repo <repo> --sync-preset <preset> --json` | Update fields |
| `fractary-codex config-validate --json` | Validate config |

If `fractary-codex` is not available globally, fall back to `npx @fractary/codex-cli`.

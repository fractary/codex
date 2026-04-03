---
name: fractary-codex-config
description: Initialize, update, or validate codex configuration in .fractary/config.yaml. Use when managing codex configuration.
---

# Codex Configuration Management

Manage the codex section of `.fractary/config.yaml`. Supports three operations: initialize, update, and validate.

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `init` | — | Initialize the codex section in an existing config |
| `update` | — | Update specific fields in the codex configuration |
| `validate` | — | Validate the codex configuration (read-only) |

### Init Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--org <name>` | No | Organization name |
| `--codex <repo>` | No | Codex repository name |
| `--sync-preset <name>` | No | Sync preset to apply |
| `--force` | No | Overwrite existing codex section |

### Update Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--org <name>` | No | Organization name |
| `--codex-repo <name>` | No | Codex repository name |
| `--sync-preset <name>` | No | Sync preset to apply |

### Validate Arguments

No arguments. This is a read-only operation.

## Execution

### Initialize

Adds the codex section to an existing `.fractary/config.yaml` (created by `@fractary/core`'s config-initialize).

**Prerequisites:** `.fractary/config.yaml` must exist. Fails if codex section already exists (use `--force` to overwrite).

Run: `fractary-codex config-init [--org <name>] [--codex <repo>] [--sync-preset <name>] [--force]`

Before running, confirm auto-detected settings with the user.

### Update

Updates specific fields in the existing codex section of `.fractary/config.yaml`. Only the provided fields are modified — all other values are preserved.

**Prerequisites:** Codex section must exist in config (run init first).

Run: `fractary-codex config-update [--org <name>] [--codex-repo <name>] [--sync-preset <name>]`

### Validate

Checks the codex section of `.fractary/config.yaml` for errors and warnings without modifying any files. Checks config structure, field formats, directory existence, and MCP server configuration.

Run: `fractary-codex config-validate`

This is a **read-only** operation. Do not modify any files.

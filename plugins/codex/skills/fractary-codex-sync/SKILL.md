---
name: fractary-codex-sync
description: Sync project bidirectionally with codex repository, with optional GitHub issue scoping
user-invocable: true
argument-hint: "[--work-id <id>] [--to-codex|--from-codex] [--dry-run] [--env <env>] [--include <pattern>] [--exclude <pattern>]"
allowed-tools:
  - Bash
---

# Codex Sync

Invokes the `fractary-codex sync` CLI to synchronize files between this project and the codex repository. When `--work-id` is provided, narrows sync scope based on issue context and posts a summary comment.

## Workflow

### 1. Validate CLI

```bash
fractary-codex --version
```

If unavailable, fall back to `npx @fractary/codex-cli`. If neither works, report error and stop.

### 2. Parse Arguments and Build Command

Map user arguments to CLI flags:

| User Argument | CLI Flag |
|---------------|----------|
| `--work-id <id>` | `--work-id <id>` |
| `--to-codex` | `--direction to-codex` |
| `--from-codex` | `--direction from-codex` |
| (neither) | (bidirectional, default) |
| `--dry-run` | `--dry-run` |
| `--env <env>` | `--env <env>` |
| `--include <pattern>` | `--include <pattern>` (repeatable) |
| `--exclude <pattern>` | `--exclude <pattern>` (repeatable) |

### 3. Work ID Integration (conditional)

**If `--work-id` is provided:** Read `docs/work-id-integration.md` for the full issue inference and comment workflow. Execute those steps before building the final CLI command.

**If no `--work-id`:** Skip directly to step 4.

### 4. Execute Sync

```bash
fractary-codex sync --json [--direction <dir>] [--work-id <id>] [--include <pattern>...] [--dry-run] [--env <env>]
```

Always use `--json` for structured output.

### 5. Report Results

Parse JSON output. Report status as success/warning/failure with file counts.

## Critical Rules

1. **ONLY use `fractary-codex sync` CLI** — no manual file operations, no git operations
2. **NEVER modify config files** — this is a sync operation, not a configuration operation
3. **If sync fails, report the error and stop** — do not attempt fixes

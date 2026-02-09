# Fractary Configuration Management Standards

This document defines the unified standards for configuration management across all Fractary plugins (`fractary-core`, `fractary-faber`, `fractary-codex`).

## Overview

All plugins share a common configuration approach to ensure:
- Consistent user experience across plugins
- Safe backup and rollback capabilities
- Non-conflicting gitignore management
- Predictable behavior when plugins work together

## Agent Naming Convention

Configuration agents use noun forms of their corresponding command verbs:
- `fractary-core:config-initializer` - Core plugin configuration (fresh setup)
- `fractary-core:config-updater` - Core plugin incremental updates
- `fractary-core:env-switcher` - Environment switching
- `fractary-faber:configurator` - FABER workflow configuration
- `fractary-codex:configurator` - Codex plugin configuration

### Migration History

The core agents were renamed from `configurator` to operation-specific noun-form names for alignment with the CLI:

| Old Name | New Name |
|----------|----------|
| `fractary-core:configurator` | `fractary-core:config-initializer` (fresh setup) |
| `fractary-core:configurator` | `fractary-core:config-updater` (incremental) |
| `fractary-core:switch-env` | `fractary-core:env-switcher` |

Core plugin commands:
- `/fractary-core:config-init` - Initialize configuration
- `/fractary-core:config-update` - Incremental updates
- `/fractary-core:config-validate` - Validate configuration
- `/fractary-core:config-show` - Show configuration
- `/fractary-core:env-switch` - Switch environment
- `/fractary-core:env-list` - List environments
- `/fractary-core:env-show` - Show environment status

## Gitignore Section Markers

### Standard Format

All plugins use consistent section markers (5 equals signs, start AND end markers):

```gitignore
# ===== fractary-{plugin} (managed) =====
{entries}
# ===== end fractary-{plugin} =====
```

### Example

```gitignore
# .fractary/.gitignore
# This file is managed by multiple plugins - each plugin manages its own section

# ===== fractary-core (managed) =====
backups/
# ===== end fractary-core =====

# ===== fractary-logs (managed) =====
logs/
# ===== end fractary-logs =====

# ===== fractary-codex (managed) =====
codex/cache/
# ===== end fractary-codex =====

# ===== fractary-faber (managed) =====
runs/
faber/state/
faber/*.backup.*
# ===== end fractary-faber =====
```

### Migration

When encountering old formats (e.g., `# === fractary-core ===` without end marker), plugins should automatically migrate to the new format.

## Backup Strategy

### Centralized Location

All configuration backups are stored in `.fractary/backups/`.

### Naming Convention

`{plugin}-config-YYYYMMDD-HHMMSS.yaml`

Examples:
- `config-20260116-143022.yaml` (core shared config)
- `faber-config-20260116-143022.yaml`
- `codex-config-20260116-143022.yaml`

### Tracking File

`.fractary/backups/.last-backup` contains the path to the most recent backup for rollback purposes. This is necessary because agent contexts are stateless between tool calls.

### Retention

Keep the last 10 backups per plugin. Older backups are automatically removed.

### Rollback Procedure

1. Read backup path from `.fractary/backups/.last-backup`
2. If tracking file exists and backup is valid, restore from it
3. Fallback: use most recent backup matching `{plugin}-config-*.yaml` pattern
4. Clean up tracking file after rollback

## Context Parameter

### Maximum Length

**2000 characters** for all plugins.

### Validation

All `--context` parameters must be validated:
- Check for empty values
- Check for length (max 2000 characters)
- Check for shell metacharacters (`$`, `` ` ``, `|`, `;`, `&`, `>`, `<`)
- Check for path traversal patterns (`../`)
- Check for newlines and null bytes

### Safe Patterns

Context should be plain descriptive text only:
- "switch to jira for work tracking" ✓
- "enable S3 storage with bucket my-bucket" ✓
- "change logs path to .fractary/session-logs" ✓

## Agent Model

### Standard Model

**`claude-haiku-4-5`** for all configurator agents.

Configuration operations are primarily file I/O and validation, which don't require more powerful models.

## Version Field

### Standard Version

**`version: "2.0"`** for all plugin configurations.

### Migration

When encountering older version numbers (e.g., `version: "4.0"` from codex), show a deprecation notice and offer migration. The underlying format is compatible - only the version number changes.

## Configuration Files

### Locations

| Plugin | Config Location |
|--------|-----------------|
| Core | `.fractary/config.yaml` |
| Faber | `.fractary/faber/config.yaml` |
| Codex | `.fractary/codex/config.yaml` |

### Format

All configurations use YAML format (not JSON).

## Section Preservation

When updating configuration:

1. **Read before write**: Always read existing config first
2. **Section-level merge**: Only modify sections for the plugin being configured
3. **Preserve unknown sections**: If a section exists that the agent doesn't manage, preserve it
4. **Version field**: Always preserve or set `version: "2.0"`

## User Confirmation

1. **Preview before apply**: Always show proposed changes before applying
2. **Explicit confirmation**: Use `AskUserQuestion` for confirmation (unless `--yes` flag)
3. **Backup notification**: Inform user about backup creation before modifying existing config

## Commands

| Plugin | Command |
|--------|---------|
| Core (init) | `/fractary-core:config-init` |
| Core (update) | `/fractary-core:config-update` |
| Core (validate) | `/fractary-core:config-validate` |
| Faber | `/fractary-faber:configure` |
| Codex | `/fractary-codex:configure` |

All commands support:
- `--context "<text>"` - Natural language description of changes
- `--force` - Skip confirmation prompts
- `--dry-run` - Preview changes without applying (core only)

## Error Handling

### Standard Error Format

```
❌ [Error Type]

[Error details]

[Recovery steps]
```

### Rollback on Failure

If configuration write or validation fails:
1. Report specific validation error
2. Restore from backup (if backup exists)
3. Report rollback action
4. Provide clear recovery steps

## Cross-Reference

- Core config-initializer: `core/plugins/core/agents/config-initializer.md`
- Core config-updater: `core/plugins/core/agents/config-updater.md`
- Core env-switcher: `core/plugins/core/agents/env-switcher.md`
- Core archived configurator: `core/plugins/core/archived/agents/configurator.md`
- Faber configurator: `faber/plugins/faber/agents/configurator.md`
- Codex configurator: `codex/plugins/codex/agents/configurator.md`
- Codex gitignore utils: `codex/cli/src/config/gitignore-utils.ts`

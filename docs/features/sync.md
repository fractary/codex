# Sync

Synchronize project files with a central codex repository — push local files to the codex repo, pull shared content from it, or both.

## Quick Reference

| Operation | CLI | Plugin |
|-----------|-----|--------|
| [Sync (bidirectional)](#sync) | `fractary-codex sync` | `/fractary-codex-sync` |
| [Sync to codex only](#sync) | `fractary-codex sync --direction to-codex` | `/fractary-codex-sync --to-codex` |
| [Sync from codex only](#sync) | `fractary-codex sync --direction from-codex` | `/fractary-codex-sync --from-codex` |
| [Preview sync](#preview-dry-run) | `fractary-codex sync --dry-run` | `/fractary-codex-sync --dry-run` |

> Sync is not available via SDK or MCP — use the CLI or Claude Code plugin.

---

## Sync

Synchronizes your project with the codex repository based on the `sync:` patterns in your `.fractary/config.yaml`.

**Default behavior:**
- `to_codex` patterns: copies matching local files to the codex repository
- `from_codex` patterns: pulls matching files from the codex repository into your project
- Maps to the `main` branch of the codex repository (environment: `prod`)

### Sync: Plugin

```
/fractary-codex-sync
```

**Options:**
- `--to-codex` — Push to codex only (skip pulling)
- `--from-codex` — Pull from codex only (skip pushing)
- `--dry-run` — Preview changes without syncing
- `--env <env>` — Target environment (`dev`, `test`, `staging`, `prod`)
- `--work-id <id>` — GitHub issue number to scope the sync

When `--work-id` is provided, the skill analyzes the GitHub issue to infer relevant file patterns and narrows the sync scope automatically.

### Sync: CLI

```bash
fractary-codex sync [name] [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--direction <dir>` | `bidirectional` | `to-codex`, `from-codex`, or `bidirectional` |
| `--env <env>` | `prod` | Environment: `dev`, `test`, `staging`, `prod` |
| `--dry-run` | `false` | Preview changes without syncing |
| `--include <pattern>` | — | Include pattern (repeatable, overrides config) |
| `--exclude <pattern>` | — | Exclude pattern (repeatable) |
| `--force` | `false` | Force sync without timestamp checks |
| `--work-id <id>` | — | Scope sync to a GitHub issue |
| `--json` | `false` | Output as JSON |

**Examples:**

```bash
# Preview bidirectional sync
fractary-codex sync --dry-run

# Run full bidirectional sync
fractary-codex sync

# Push to codex only
fractary-codex sync --direction to-codex

# Pull from codex only
fractary-codex sync --direction from-codex

# Sync scoped to a GitHub issue
fractary-codex sync --work-id 42

# Sync to the test branch (test environment)
fractary-codex sync --env test
```

---

## Preview (Dry Run)

Run a sync preview to see what files would be pushed or pulled without making any changes.

### Preview: Plugin

```
/fractary-codex-sync --dry-run
```

### Preview: CLI

```bash
fractary-codex sync --dry-run
```

---

## Environment Mapping

The `--env` flag controls which branch of the codex repository is used:

| Environment | Branch |
|-------------|--------|
| `prod` (default) | `main` |
| `staging` | `staging` |
| `test` | `test` |
| `dev` | `develop` |

---

## Sync Configuration

Sync patterns are defined in `.fractary/config.yaml`:

```yaml
codex:
  sync:
    to_codex:
      include:
        - docs/**
        - README.md
        - CLAUDE.md
      exclude:
        - "*.tmp"
    from_codex:
      include:
        - codex://{org}/{codex_repo}/docs/**   # shared org docs
        - codex://{org}/{codex_repo}/.fractary/codex/memory/**
```

**Placeholders** in `from_codex` patterns are expanded from config values:
- `{org}` → your organization slug
- `{project}` → your project name
- `{codex_repo}` → your codex repository name

See [Configuration Reference](../configuration.md#sync-configuration) for full sync config options.

---

## See Also

- [Getting Started Guide](../getting-started.md) — First sync walkthrough and codex repo setup
- [Configuration Operations](./config.md) — Initialize and update sync configuration
- [Configuration Reference](../configuration.md) — Full sync config schema

# Fractary Codex Plugin

Documentation for the Fractary Codex Claude Code plugin.

## Overview

The codex plugin provides document fetching via `codex://` URIs (auto-fetched by MCP) and bidirectional synchronization with a central codex repository.

## Quick Start

### 1. Initialize (one-time setup)

```
/fractary-codex:config-init
```

This creates the codex configuration, cache directory, and MCP server entry. **Restart Claude Code after initialization.**

### 2. Sync documentation

```
/fractary-codex:sync --dry-run
/fractary-codex:sync
```

### 3. Use codex:// URIs

Reference documents in conversations:

```
codex://myorg/project/docs/api.md
```

The MCP server handles fetching and caching automatically.

## Commands

| Command | Description |
|---------|-------------|
| `/fractary-codex:config-init` | Initialize codex configuration |
| `/fractary-codex:config-update` | Update configuration fields |
| `/fractary-codex:config-validate` | Validate configuration (read-only) |
| `/fractary-codex:sync` | Sync project with codex repository |

### /fractary-codex:config-init

Initialize the codex section in `.fractary/config.yaml`.

**Options:**
- `--org <slug>` - Organization slug
- `--codex-repo <name>` - Codex repository name
- `--sync-preset <name>` - Sync preset (`standard` or `minimal`)
- `--force` - Overwrite existing configuration

The agent auto-detects your organization, project, and codex repo, then asks for confirmation before proceeding.

### /fractary-codex:config-update

Update specific fields in the codex configuration.

**Options:**
- `--org <slug>` - Update organization
- `--codex-repo <name>` - Update codex repository
- `--sync-preset <name>` - Update sync preset

### /fractary-codex:config-validate

Read-only validation of the codex configuration. Checks structure, formats, directories, MCP server config, and gitignore.

### /fractary-codex:sync

Sync project files with the codex repository.

**Options:**
- `--work-id <id>` - GitHub issue number to scope sync
- `--to-codex` or `--from-codex` - Sync direction (default: bidirectional)
- `--dry-run` - Preview changes without syncing
- `--env <env>` - Target environment (`dev`, `test`, `staging`, `prod`)

When `--work-id` is provided, the agent analyzes the GitHub issue to infer relevant file patterns and narrows the sync scope.

## Agents

The plugin delegates to four specialized agents:

| Agent | Purpose |
|-------|---------|
| `config-initializer` | Runs `fractary-codex config-init` CLI with user confirmation |
| `config-updater` | Runs `fractary-codex config-update` CLI |
| `config-validator` | Runs `fractary-codex config-validate` CLI (read-only) |
| `sync-manager` | Runs `fractary-codex sync` CLI with optional GitHub issue integration |

All agents are thin wrappers around the CLI. They do not implement business logic directly.

## Sync Configuration

### Directional Sync

Control what files sync using configuration:

```yaml
sync:
  to_codex:
    - "docs/**/*.md"
    - "CLAUDE.md"
    - "README.md"
  from_codex:
    - "codex://{org}/{codex_repo}/docs/**"
    - "codex://{org}/{project}/**"
```

**Placeholders:** `{org}`, `{project}`, `{codex_repo}` are expanded from config values.

### Example Use Cases

**Share schemas between projects:**
```yaml
# etl-project/.fractary/config.yaml
sync:
  to_codex:
    - "docs/schema/**/*.json"

# consumer-project/.fractary/config.yaml
sync:
  from_codex:
    - "codex://{org}/etl-project/docs/schema/**/*.json"
```

**Share standards across all projects:**
```yaml
sync:
  from_codex:
    - "codex://{org}/{codex_repo}/docs/**"
```

## Architecture

```
Plugin Command → Agent (Claude Haiku) → CLI → SDK → Storage/Cache
```

The MCP server provides direct tool access for AI agents:

```
Claude Code → MCP Server (stdio) → SDK → Storage/Cache
```

## Troubleshooting

**Configuration not found:** Run `/fractary-codex:config-init`. Requires base `.fractary/config.yaml` from `@fractary/core`.

**MCP tools not available:** Restart Claude Code after running `config-init`.

**Authentication failed:** Verify `GITHUB_TOKEN` is set and has access to the codex repository.

**No files syncing:** Check sync patterns in config. Use `--dry-run` to preview.

## Configuration Reference

See [Configuration Guide](../configuration.md) for the complete reference.

## See Also

- [Configuration Guide](../configuration.md)
- [SDK Reference](../sdk/js/)
- [CLI Reference](../cli/)
- [MCP Server Reference](../mcp-server/)

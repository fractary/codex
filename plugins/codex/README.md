# Fractary Codex Plugin

Claude Code plugin for knowledge retrieval and documentation synchronization.

## Overview

The codex plugin provides document fetching via `codex://` URIs (auto-fetched by MCP) and bidirectional synchronization with a central codex repository.

## Quick Start

### 1. Initialize configuration

```
/fractary-codex:config-init
```

Sets up the codex section in `.fractary/config.yaml`, cache directory, and MCP server.

**Restart Claude Code after initialization to load the MCP server.**

### 2. Sync documentation

```
/fractary-codex:sync
```

### 3. Reference documents

Use `codex://` URIs in conversations - the MCP server handles fetching and caching automatically:

```
codex://myorg/project/docs/api.md
```

## Commands

| Command | Description |
|---------|-------------|
| `/fractary-codex:config-init` | Initialize codex configuration |
| `/fractary-codex:config-update` | Update configuration fields |
| `/fractary-codex:config-validate` | Validate configuration (read-only) |
| `/fractary-codex:sync` | Sync project with codex repository |

### /fractary-codex:config-init

Initialize the codex section in `.fractary/config.yaml`.

**Options** (passed as arguments):
- `--org <slug>` - Organization slug
- `--codex-repo <name>` - Codex repository name
- `--sync-preset <name>` - Sync preset (`standard` or `minimal`)
- `--force` - Overwrite existing configuration

The agent auto-detects organization, project, and codex repo, then confirms with you before proceeding.

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

All agents are thin wrappers around the CLI - they do not implement business logic directly.

## Architecture

```
Plugin Command → Agent (Claude Haiku) → CLI → SDK → Storage/Cache
```

The MCP server provides direct tool access for AI agents:

```
Claude Code → MCP Server (stdio) → SDK → Storage/Cache
```

## License

MIT

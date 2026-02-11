# Codex Plugin Quick Start

## Prerequisites

- `.fractary/config.yaml` must exist (created by `@fractary/core`)
- `GITHUB_TOKEN` environment variable set (for private repos)
- Codex repository exists in your organization (naming: `codex.{org}.{tld}`)

## Setup

### 1. Initialize codex configuration

```
/fractary-codex:config-init
```

The agent will:
1. Auto-detect your organization from the git remote
2. Discover the codex repository
3. Ask you to confirm the detected settings
4. Create the configuration

**What gets created:**
- `codex:` section in `.fractary/config.yaml`
- Cache directory at `.fractary/codex/cache/`
- MCP server entry in `.mcp.json`
- Gitignore entries in `.fractary/.gitignore`

**Restart Claude Code after this step to load the MCP server.**

To specify values explicitly:
```
/fractary-codex:config-init --org myorg --codex-repo codex.myorg.com
```

### 2. Validate the configuration

```
/fractary-codex:config-validate
```

### 3. Preview sync changes

```
/fractary-codex:sync --dry-run
```

### 4. Run the sync

```
/fractary-codex:sync
```

### 5. Use codex:// URIs

Reference documents in conversations:
```
codex://myorg/project/docs/api.md
```

The MCP server fetches and caches documents automatically.

## Common Tasks

### Update configuration

```
/fractary-codex:config-update --org neworg
/fractary-codex:config-update --sync-preset minimal
```

### Sync in one direction

```
/fractary-codex:sync --to-codex
/fractary-codex:sync --from-codex
```

### Sync scoped to a GitHub issue

```
/fractary-codex:sync --work-id 42
```

### Sync from a different environment

```
/fractary-codex:sync --env dev
```

## Command Reference

| Command | Description |
|---------|-------------|
| `/fractary-codex:config-init` | Initialize codex configuration |
| `/fractary-codex:config-update` | Update configuration fields |
| `/fractary-codex:config-validate` | Validate configuration (read-only) |
| `/fractary-codex:sync` | Sync project with codex repository |

## Troubleshooting

**Configuration not found:** Run `/fractary-codex:config-init` first. Requires base `.fractary/config.yaml` from `@fractary/core`.

**Authentication failed:** Verify `GITHUB_TOKEN` is set and has access to the codex repository.

**MCP tools not available:** Restart Claude Code after running `config-init` to load the MCP server.

See the [full documentation](README.md) for more details.

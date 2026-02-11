# Fractary Codex CLI

Documentation for the `@fractary/codex-cli` command-line interface.

## Installation

```bash
npm install -g @fractary/codex-cli
```

Verify:

```bash
fractary-codex --version
fractary-codex --help
```

## Commands

- [config-init](#config-init) - Initialize codex configuration
- [config-update](#config-update) - Update configuration fields
- [config-validate](#config-validate) - Validate configuration
- [document-fetch](#document-fetch) - Fetch a document by URI
- [cache-list](#cache-list) - List cache entries
- [cache-clear](#cache-clear) - Clear cache entries
- [cache-stats](#cache-stats) - Display cache statistics
- [cache-health](#cache-health) - Run diagnostics
- [sync](#sync) - Sync project with codex repository

---

### config-init

Initialize the codex section in `.fractary/config.yaml`. Requires a base config file created by `@fractary/core`.

```bash
fractary-codex config-init [options]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--org <slug>` | string | auto-detected from git remote | Organization slug |
| `--project <name>` | string | derived from directory name | Project name |
| `--codex-repo <name>` | string | auto-discovered or `codex.{org}.com` | Codex repository name |
| `--sync-preset <name>` | string | `standard` | Sync preset: `standard` or `minimal` |
| `--force` | boolean | `false` | Overwrite existing codex section |
| `--no-mcp` | boolean | `false` | Skip MCP server installation |
| `--json` | boolean | `false` | Output as JSON |

**What it does:**
- Adds `codex:` section to `.fractary/config.yaml`
- Creates cache directory (`.fractary/codex/cache/`)
- Installs MCP server in `.mcp.json` (unless `--no-mcp`)
- Updates `.fractary/.gitignore`

**Examples:**

```bash
fractary-codex config-init
fractary-codex config-init --org myorg --codex-repo codex.myorg.com
fractary-codex config-init --sync-preset minimal --no-mcp
fractary-codex config-init --force
```

---

### config-update

Update specific fields in the codex configuration. Requires at least one field.

```bash
fractary-codex config-update [options]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--org <slug>` | string | | Update organization slug |
| `--project <name>` | string | | Update project name |
| `--codex-repo <name>` | string | | Update codex repository name |
| `--sync-preset <name>` | string | | Update sync preset |
| `--no-mcp` | boolean | `false` | Skip MCP server update |
| `--json` | boolean | `false` | Output as JSON |

---

### config-validate

Validate the codex configuration. Read-only - does not modify files.

```bash
fractary-codex config-validate [options]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--json` | boolean | `false` | Output as JSON |

**Checks:** Config structure, field formats, cache directory, MCP server config, gitignore entries.

---

### document-fetch

Fetch a document by its `codex://` URI.

```bash
fractary-codex document-fetch <uri> [options]
```

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `<uri>` | string | yes | Codex URI (e.g., `codex://org/project/docs/file.md`) |

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--bypass-cache` | boolean | `false` | Skip cache and fetch from source |
| `--ttl <seconds>` | number | type-based default | Override TTL in seconds |
| `--json` | boolean | `false` | Output as JSON with metadata |
| `--output <file>` | string | stdout | Write to file instead of stdout |

**Examples:**

```bash
fractary-codex document-fetch codex://myorg/project/docs/api.md
fractary-codex document-fetch codex://myorg/project/docs/api.md --bypass-cache
fractary-codex document-fetch codex://myorg/project/docs/api.md --output ./api.md --ttl 3600
fractary-codex document-fetch codex://myorg/project/docs/api.md --json
```

---

### cache-list

List documents in the cache.

```bash
fractary-codex cache-list [options]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--status <status>` | string | `all` | Filter: `fresh`, `stale`, `expired`, `all` |
| `--limit <n>` | number | no limit | Max entries to show |
| `--sort <field>` | string | `uri` | Sort by: `uri`, `size`, `createdAt`, `expiresAt` |
| `--desc` | boolean | `false` | Sort descending |
| `--verbose` | boolean | `false` | Show detailed entry info |
| `--json` | boolean | `false` | Output as JSON |

**Examples:**

```bash
fractary-codex cache-list
fractary-codex cache-list --status fresh --sort size --desc
fractary-codex cache-list --verbose --limit 10 --sort createdAt --desc
```

---

### cache-clear

Clear cache entries. Requires `--all` or `--pattern`.

```bash
fractary-codex cache-clear [options]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--all` | boolean | `false` | Clear entire cache |
| `--pattern <glob>` | string | | Clear entries matching URI pattern |
| `--dry-run` | boolean | `false` | Preview without clearing |

**Examples:**

```bash
fractary-codex cache-clear --all
fractary-codex cache-clear --pattern "codex://myorg/project/*"
fractary-codex cache-clear --pattern "codex://myorg/*" --dry-run
```

---

### cache-stats

Display cache statistics.

```bash
fractary-codex cache-stats [options]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--json` | boolean | `false` | Output as JSON |

---

### cache-health

Run diagnostics on the codex setup.

```bash
fractary-codex cache-health [options]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--json` | boolean | `false` | Output as JSON |

**Checks:** Configuration, storage providers, SDK client, cache health, type registry.

---

### sync

Sync a project with its codex repository.

```bash
fractary-codex sync [name] [options]
```

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `[name]` | string | no | Project name (auto-detected if not provided) |

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--env <env>` | string | `prod` | Environment: `dev`, `test`, `staging`, `prod` |
| `--dry-run` | boolean | `false` | Preview without syncing |
| `--direction <dir>` | string | `bidirectional` | `to-codex`, `from-codex`, `bidirectional` |
| `--include <pattern>` | string[] | from config | Include pattern (repeatable) |
| `--exclude <pattern>` | string[] | from config | Exclude pattern (repeatable) |
| `--force` | boolean | `false` | Force sync without timestamp checks |
| `--json` | boolean | `false` | Output as JSON |
| `--work-id <id>` | string | | GitHub issue number/URL to scope sync |

**Environment to branch mapping:**

| Environment | Branch |
|-------------|--------|
| `dev` | `develop` |
| `test` | `test` |
| `staging` | `staging` |
| `prod` | `main` |

**Default include patterns** (when none specified):
```
docs/**/*.md
specs/**/*.md
.fractary/standards/**
.fractary/templates/**
```

**Examples:**

```bash
fractary-codex sync --dry-run
fractary-codex sync --direction to-codex --include "docs/**"
fractary-codex sync --env dev
fractary-codex sync --work-id 42
fractary-codex sync myproject --force
```

---

## Configuration

The CLI uses `.fractary/config.yaml`. Initialize with:

```bash
fractary-codex config-init
```

See [Configuration Guide](../configuration.md) for the full reference.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub API token for private repository access |

## Deprecated Commands

The `configure` command is deprecated. Use `config-init`, `config-update`, and `config-validate` instead.

## Troubleshooting

### CLI Not Found

```bash
npm list -g @fractary/codex-cli
npm install -g @fractary/codex-cli
```

### Configuration Not Loading

```bash
fractary-codex cache-health
fractary-codex config-init --force
```

### Fetch Fails

```bash
fractary-codex cache-health
echo $GITHUB_TOKEN
```

### Cache Issues

```bash
fractary-codex cache-stats
fractary-codex cache-clear --all
```

## See Also

- [Configuration Guide](../configuration.md)
- [SDK Reference](../sdk/js/)
- [MCP Server Reference](../mcp-server/)

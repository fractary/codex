# Fractary Codex CLI

Command-line interface for Fractary Codex knowledge management.

```bash
npm install -g @fractary/codex-cli
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
| `--org <slug>` | string | auto-detected from git remote | Organization slug (e.g., `fractary`) |
| `--project <name>` | string | derived from directory name | Project name |
| `--codex-repo <name>` | string | auto-discovered or `codex.{org}.com` | Codex repository name |
| `--sync-preset <name>` | string | `standard` | Sync preset: `standard` or `minimal` |
| `--force` | boolean | `false` | Overwrite existing codex section |
| `--no-mcp` | boolean | `false` | Skip MCP server installation |
| `--json` | boolean | `false` | Output as JSON |

**Examples:**

```bash
# Auto-detect everything
fractary-codex config-init

# Specify organization and codex repo
fractary-codex config-init --org myorg --codex-repo codex.myorg.com

# Use minimal sync preset, skip MCP
fractary-codex config-init --sync-preset minimal --no-mcp

# Overwrite existing config
fractary-codex config-init --force
```

**What it does:**
- Adds a `codex:` section to `.fractary/config.yaml`
- Creates cache directory (`.fractary/codex/cache/`)
- Installs MCP server in `.mcp.json` (unless `--no-mcp`)
- Updates `.fractary/.gitignore`

---

### config-update

Update specific fields in the codex configuration. Requires at least one field to update.

```bash
fractary-codex config-update [options]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--org <slug>` | string | | Update organization slug |
| `--project <name>` | string | | Update project name |
| `--codex-repo <name>` | string | | Update codex repository name |
| `--sync-preset <name>` | string | | Update sync preset: `standard` or `minimal` |
| `--no-mcp` | boolean | `false` | Skip MCP server update |
| `--json` | boolean | `false` | Output as JSON |

**Examples:**

```bash
# Change organization
fractary-codex config-update --org neworg

# Update codex repo and sync preset
fractary-codex config-update --codex-repo codex.neworg.com --sync-preset minimal
```

---

### config-validate

Validate the codex configuration in `.fractary/config.yaml`. Read-only - does not modify any files.

```bash
fractary-codex config-validate [options]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--json` | boolean | `false` | Output as JSON |

**Checks performed:**
- Configuration structure and required fields
- Field format validation (org, project, codex-repo names)
- Cache directory existence
- MCP server configuration
- Gitignore entries

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
| `--bypass-cache` | boolean | `false` | Skip cache and fetch directly from source |
| `--ttl <seconds>` | number | type-based default | Override default TTL in seconds |
| `--json` | boolean | `false` | Output as JSON with metadata |
| `--output <file>` | string | stdout | Write content to file instead of stdout |

**Examples:**

```bash
# Fetch and print to stdout
fractary-codex document-fetch codex://myorg/project/docs/api.md

# Bypass cache for fresh content
fractary-codex document-fetch codex://myorg/project/docs/api.md --bypass-cache

# Save to file with custom TTL
fractary-codex document-fetch codex://myorg/project/specs/auth.md --output ./auth.md --ttl 3600

# Get JSON response with metadata
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
| `--status <status>` | string | `all` | Filter by status: `fresh`, `stale`, `expired`, `all` |
| `--limit <n>` | number | no limit | Maximum number of entries to show |
| `--sort <field>` | string | `uri` | Sort by: `uri`, `size`, `createdAt`, `expiresAt` |
| `--desc` | boolean | `false` | Sort in descending order |
| `--verbose` | boolean | `false` | Show detailed entry information |
| `--json` | boolean | `false` | Output as JSON |

**Examples:**

```bash
# List all cached documents
fractary-codex cache-list

# Show only fresh entries, sorted by size
fractary-codex cache-list --status fresh --sort size --desc

# Detailed view of 10 most recent
fractary-codex cache-list --verbose --limit 10 --sort createdAt --desc

# JSON output for scripting
fractary-codex cache-list --json
```

---

### cache-clear

Clear cache entries. Requires either `--all` or `--pattern`.

```bash
fractary-codex cache-clear [options]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--all` | boolean | `false` | Clear entire cache |
| `--pattern <glob>` | string | | Clear entries matching URI pattern |
| `--dry-run` | boolean | `false` | Show what would be cleared without clearing |

**Examples:**

```bash
# Clear everything
fractary-codex cache-clear --all

# Clear entries for a specific project
fractary-codex cache-clear --pattern "codex://myorg/project/*"

# Preview what would be cleared
fractary-codex cache-clear --pattern "codex://myorg/*" --dry-run
```

---

### cache-stats

Display cache statistics (entry count, total size, hit rates).

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

**Diagnostics include:**
- Configuration validity
- Storage provider accessibility
- SDK client initialization
- Cache health and integrity
- Type registry status

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
| `--env <env>` | string | `prod` | Target environment: `dev`, `test`, `staging`, `prod` |
| `--dry-run` | boolean | `false` | Show what would sync without executing |
| `--direction <dir>` | string | `bidirectional` | Sync direction: `to-codex`, `from-codex`, `bidirectional` |
| `--include <pattern>` | string[] | from config | Include files matching pattern (repeatable) |
| `--exclude <pattern>` | string[] | from config | Exclude files matching pattern (repeatable) |
| `--force` | boolean | `false` | Force sync without checking timestamps |
| `--json` | boolean | `false` | Output as JSON |
| `--work-id <id>` | string | | GitHub issue number or URL to scope sync |

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
# Preview sync changes
fractary-codex sync --dry-run

# Sync only docs to codex
fractary-codex sync --direction to-codex --include "docs/**"

# Sync from dev environment
fractary-codex sync --env dev

# Sync scoped to a GitHub issue
fractary-codex sync --work-id 42

# Force sync a specific project
fractary-codex sync myproject --force
```

---

## Configuration

The CLI uses `.fractary/config.yaml` for configuration. Initialize with:

```bash
fractary-codex config-init
```

Minimal configuration:

```yaml
codex:
  schema_version: "2.0"
  organization: myorg
  project: myproject
  codex_repo: codex.myorg.com
  remotes:
    myorg/codex.myorg.com:
      token: ${GITHUB_TOKEN}
```

See the [Configuration Guide](../docs/configuration.md) for the full reference.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub API token for private repository access |

Environment variables can be referenced in config files using `${VAR_NAME}` syntax.

## Deprecated Commands

The `configure` command is deprecated. Use `config-init`, `config-update`, and `config-validate` instead.

## License

MIT

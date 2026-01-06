# Fractary Codex CLI

Command-line interface for Fractary Codex knowledge management system.

## Installation

### Global Installation

```bash
npm install -g @fractary/codex-cli
```

### Local Development

```bash
# From repository root
npm install
cd cli
npm run build
npm link
```

## Usage

```bash
fractary-codex [command] [options]
```

## Commands

### `init` - Initialize Configuration

Initialize Codex v3.0 with YAML configuration in your project.

```bash
fractary-codex init [options]

Options:
  --force    Overwrite existing configuration
```

**Example:**
```bash
fractary-codex init
# Creates .fractary/codex/config.yaml and .fractary/codex/cache/
```

### `fetch` - Fetch Documents

Fetch documents by `codex://` URI reference with intelligent caching.

```bash
fractary-codex fetch <uri> [options]

Arguments:
  uri                  Codex URI (e.g., codex://org/project/path/file.md)

Options:
  --bypass-cache       Fetch directly from storage, bypassing cache
  --ttl <seconds>      Override default TTL
  --json               Output as JSON with metadata
  --output <file>      Write content to file instead of stdout
```

**Examples:**
```bash
# Fetch with caching
fractary-codex fetch codex://myorg/myproject/README.md

# Bypass cache
fractary-codex fetch codex://myorg/myproject/README.md --bypass-cache

# JSON output with metadata
fractary-codex fetch codex://myorg/myproject/README.md --json

# Save to file
fractary-codex fetch codex://myorg/myproject/README.md --output local-README.md
```

### `cache` - Cache Management

Manage the document cache with subcommands for listing, clearing, and viewing statistics.

#### `cache list` - List Cache Information

```bash
fractary-codex cache list [options]

Options:
  --json    Output as JSON
```

#### `cache clear` - Clear Cache Entries

```bash
fractary-codex cache clear [options]

Options:
  --all                Clear entire cache
  --pattern <glob>     Clear entries matching pattern
  --dry-run            Preview without clearing
```

**Examples:**
```bash
# Clear all cache entries
fractary-codex cache clear --all

# Clear specific pattern
fractary-codex cache clear --pattern "myorg/myproject/**"

# Preview clearing
fractary-codex cache clear --all --dry-run
```

#### `cache stats` - Cache Statistics

```bash
fractary-codex cache stats [options]

Options:
  --json    Output as JSON
```

### `sync` - Bidirectional Synchronization

Synchronize files with codex repository.

#### `sync project` - Sync Single Project

```bash
fractary-codex sync project [project-name] [options]

Options:
  --to-codex           Sync from project to codex (one-way)
  --from-codex         Sync from codex to project (one-way)
  --bidirectional      Two-way sync (default)
  --dry-run            Preview changes without syncing
  --env <environment>  Environment branch mapping
```

#### `sync org` - Sync Organization

```bash
fractary-codex sync org [options]

Options:
  --to-codex           Sync from projects to codex
  --from-codex         Sync from codex to projects
  --bidirectional      Two-way sync (default)
  --dry-run            Preview changes
  --exclude <pattern>  Exclude repositories matching pattern
  --parallel <n>       Number of parallel sync operations (default: 3)
```

**Routing-Aware Sync (v4.1+):**

When using `--from-codex` direction, the sync command uses **routing-aware file discovery** to find all files across the entire codex that should sync to your project based on `codex_sync_include` frontmatter patterns.

How it works:
1. Clones the entire codex repository to a temporary directory (`/tmp/fractary-codex-clone/`)
2. Scans ALL markdown files in the codex recursively
3. Evaluates `codex_sync_include` patterns in each file's frontmatter
4. Returns only files that match your project name or pattern

**Example frontmatter in source files:**
```yaml
---
codex_sync_include: ['*']                  # Syncs to ALL projects
codex_sync_include: ['lake-*', 'api-*']    # Syncs to lake-* and api-* projects
codex_sync_exclude: ['*-test']             # Except *-test projects
---
```

**Trade-offs:**
- **Efficient for discovery**: Finds all relevant files across hundreds of projects
- **Inefficient for execution**: Clones entire codex repository (uses shallow clone for speed)
- **Best practice**: Use `codex://` URI references + cache purging for most workflows; use sync occasionally when needed

**Recommended workflow:**
```bash
# Primary: Reference files via codex:// URIs (no sync needed)
fractary-codex fetch codex://org/project/path/file.md

# When you need latest versions: Purge cache
fractary-codex cache clear --pattern "codex://org/project/*"

# Then MCP will re-fetch fresh content automatically
```

### `types` - Type Registry Management

Manage custom artifact types for classification and caching.

#### `types list` - List All Types

```bash
fractary-codex types list [options]

Options:
  --custom-only    Show only custom types
  --builtin-only   Show only built-in types
  --json           Output as JSON
```

#### `types show` - Show Type Details

```bash
fractary-codex types show <type-name> [options]

Options:
  --json    Output as JSON
```

#### `types add` - Add Custom Type

```bash
fractary-codex types add <type-name> [options]

Options:
  --pattern <glob>        File pattern (required)
  --ttl <duration>        Cache TTL (default: 24h)
  --description <text>    Type description
```

**Example:**
```bash
fractary-codex types add api-schema --pattern "**/*.openapi.{yaml,json}" --ttl 48h --description "OpenAPI schemas"
```

#### `types remove` - Remove Custom Type

```bash
fractary-codex types remove <type-name> [options]

Options:
  --json    Output as JSON
```

### `health` - Diagnostics

Run comprehensive diagnostics on codex setup.

```bash
fractary-codex health [options]

Options:
  --json    Output as JSON for CI/CD integration
```

**Checks:**
- Configuration validity
- SDK client initialization
- Cache health and statistics
- Storage provider availability
- Type registry status

### `migrate` - Configuration Migration

Migrate legacy v2.x JSON configuration to v3.0 YAML format.

```bash
fractary-codex migrate [options]

Options:
  --dry-run    Preview migration without writing
  --json       Output as JSON
```

## Configuration

Codex uses `.fractary/codex/config.yaml` for configuration:

```yaml
organization: myorg
cacheDir: .fractary/codex/cache

storage:
  - type: github
    owner: myorg
    repo: codex-core
    ref: main
    token: ${GITHUB_TOKEN}
    priority: 50

  - type: local
    path: ./codex-local
    priority: 10

types:
  custom:
    api-schema:
      description: OpenAPI API schemas
      patterns:
        - "**/*.openapi.yaml"
        - "**/*.openapi.json"
      defaultTtl: 172800  # 48 hours

permissions:
  default: read
  rules:
    - pattern: "sensitive/**"
      permission: admin
      users: ["admin-user"]

sync:
  bidirectional: true
  conflictResolution: latest
  exclude:
    - "node_modules/**"
    - ".git/**"

mcp:
  enabled: true
  port: 3000
```

## Environment Variables

- `GITHUB_TOKEN` - GitHub personal access token for private repositories
- `CODEX_CACHE_DIR` - Override default cache directory
- `CODEX_ORG` - Override organization slug

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Type Check

```bash
npm run typecheck
```

### Link for Local Testing

```bash
npm link
fractary-codex --help
```

## Architecture

The CLI is built on top of the `@fractary/codex` SDK and uses:

- **Commander.js** for command-line parsing
- **Chalk** for colored output
- **js-yaml** for YAML configuration
- **Dynamic imports** for fast cold-start performance

All commands use lazy-loading to avoid SDK initialization overhead for simple operations like `--help`.

## License

MIT

## Links

- [GitHub Repository](https://github.com/fractary/codex)
- [Documentation](https://github.com/fractary/codex/tree/main/docs)
- [SDK Package](https://github.com/fractary/codex/tree/main/sdk/js)
- [Issue Tracker](https://github.com/fractary/codex/issues)

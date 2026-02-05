# Fractary Codex CLI

Comprehensive documentation for the `@fractary/codex-cli` command-line interface.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands Reference](#commands-reference)
  - [configure](#configure---initialize-configuration)
  - [document-fetch](#document-fetch---fetch-documents)
  - [cache-list](#cache-list---list-cache)
  - [cache-clear](#cache-clear---clear-cache)
  - [cache-stats](#cache-stats---cache-statistics)
  - [cache-health](#cache-health---diagnostics)
  - [sync](#sync---bidirectional-synchronization)
- [Configuration](#configuration)
- [Integration Patterns](#integration-patterns)
- [Troubleshooting](#troubleshooting)

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

### Verify Installation

```bash
fractary-codex --version
fractary-codex --help
```

## Quick Start

### 1. Initialize Project

```bash
fractary-codex configure
# Creates .fractary/config.yaml and .fractary/codex/cache/
```

### 2. Fetch Documents

```bash
fractary-codex document-fetch codex://myorg/myproject/README.md
```

### 3. Check Cache Status

```bash
fractary-codex cache-stats
```

## Commands Reference

### `configure` - Initialize Configuration

Initialize Codex v3.0 with YAML configuration in your project.

```bash
fractary-codex configure [options]

Options:
  --org <slug>         Organization slug (e.g., "fractary")
  --project <name>     Project name (default: derived from directory)
  --codex-repo <name>  Codex repository name (e.g., "codex.fractary.com")
  --force              Overwrite existing configuration
  --no-mcp             Skip MCP server installation
```

**Example:**

```bash
fractary-codex configure
# Creates:
#   .fractary/config.yaml
#   .fractary/codex/cache/
```

### `document-fetch` - Fetch Documents

Fetch documents by `codex://` URI reference with intelligent caching.

```bash
fractary-codex document-fetch <uri> [options]

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
fractary-codex document-fetch codex://myorg/myproject/README.md

# Bypass cache
fractary-codex document-fetch codex://myorg/myproject/README.md --bypass-cache

# JSON output with metadata
fractary-codex document-fetch codex://myorg/myproject/README.md --json

# Save to file
fractary-codex document-fetch codex://myorg/myproject/README.md --output local-README.md
```

### `cache-list` - List Cache

List cache information and entry statistics.

```bash
fractary-codex cache-list [options]

Options:
  --json    Output as JSON
```

### `cache-clear` - Clear Cache

Clear cache entries.

```bash
fractary-codex cache-clear [options]

Options:
  --all                Clear entire cache
  --pattern <glob>     Clear entries matching pattern
  --dry-run            Preview without clearing
```

**Examples:**

```bash
# Clear all cache entries
fractary-codex cache-clear --all

# Clear specific pattern
fractary-codex cache-clear --pattern "myorg/myproject/**"

# Preview clearing
fractary-codex cache-clear --all --dry-run
```

### `cache-stats` - Cache Statistics

Display cache statistics.

```bash
fractary-codex cache-stats [options]

Options:
  --json    Output as JSON
```

**Output:**

```
Cache Statistics:
Total entries: 42
Total size: 3.20 MB
Hit rate: 94.50%
Memory entries: 15
Disk entries: 27
```

### `cache-health` - Diagnostics

Run comprehensive diagnostics on codex setup.

```bash
fractary-codex cache-health [options]

Options:
  --json    Output as JSON for CI/CD integration
```

**Checks:**

- Configuration validity
- SDK client initialization
- Cache health and statistics
- Storage provider availability
- Type registry status

**Output:**

```
Codex Health Check

CONFIGURATION                   PASS
 Config file exists
 Config is valid YAML
 Required fields present

CACHE                           PASS
 Cache directory exists
 Cache index valid
 All cached files accessible

OVERALL STATUS: Healthy
Checks passed: 22/24 (92%)
```

### `sync` - Bidirectional Synchronization

Synchronize files with codex repository.

```bash
fractary-codex sync [project-name] [options]

Options:
  --to-codex           Sync from project to codex (one-way)
  --from-codex         Sync from codex to project (one-way)
  --direction <dir>    Sync direction (to-codex/from-codex/bidirectional)
  --dry-run            Preview changes without syncing
  --env <environment>  Environment branch mapping
  --include <pattern>  Include files matching pattern
  --exclude <pattern>  Exclude files matching pattern
  --work-id <id>       GitHub issue number or URL to scope sync
  --json               Output as JSON
```

**Examples:**

```bash
# Bidirectional sync
fractary-codex sync

# One-way to codex
fractary-codex sync --to-codex

# One-way from codex
fractary-codex sync --from-codex

# Preview changes
fractary-codex sync --dry-run

# Specific environment
fractary-codex sync --env test
```

**Routing-Aware Sync:**

When using `--from-codex` direction, the sync command uses **routing-aware file discovery** to find all files across the entire codex that should sync to your project based on `codex_sync_include` frontmatter patterns.

**How it works:**

1. Clones the entire codex repository to a temporary directory
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

## Configuration

Codex uses `.fractary/config.yaml` for configuration:

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

See [Configuration Guide](../configuration.md) for complete reference.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub personal access token for private repositories |
| `CODEX_CACHE_DIR` | Override default cache directory |
| `CODEX_ORG` | Override organization slug |

## Integration Patterns

### Pattern 1: Unified Codex Client

Create a client wrapper that encapsulates all Codex SDK functionality.

```typescript
// src/codex-client.ts
import {
  CacheManager,
  StorageManager,
  TypeRegistry,
  parseReference,
  resolveReference,
  loadConfig,
  type CodexConfig,
  type FetchResult
} from '@fractary/codex'

export class CodexClient {
  private cache: CacheManager
  private storage: StorageManager
  private types: TypeRegistry
  private config: CodexConfig

  private constructor(
    cache: CacheManager,
    storage: StorageManager,
    types: TypeRegistry,
    config: CodexConfig
  ) {
    this.cache = cache
    this.storage = storage
    this.types = types
    this.config = config
  }

  static async create(options?: {
    cacheDir?: string
    configPath?: string
  }): Promise<CodexClient> {
    const config = loadConfig(options?.configPath)
    const types = new TypeRegistry()
    if (config.types) {
      Object.values(config.types).forEach(type => types.register(type))
    }
    const storage = StorageManager.create({ providers: config.storage || [] })
    const cache = CacheManager.create({
      cacheDir: options?.cacheDir || config.cacheDir,
      typeRegistry: types
    })
    cache.setStorageManager(storage)
    return new CodexClient(cache, storage, types, config)
  }

  async fetch(uri: string): Promise<FetchResult> {
    const ref = parseReference(uri)
    const resolved = resolveReference(ref.uri)
    return await this.cache.get(resolved)
  }

  async invalidateCache(pattern?: string): Promise<void> {
    await this.cache.invalidate(pattern)
  }

  async getCacheStats(): Promise<any> {
    return await this.cache.getStats()
  }

  getConfig(): CodexConfig {
    return this.config
  }
}
```

### Pattern 2: Error Handling

```typescript
import {
  InvalidUriError,
  StorageError,
  CacheError,
  ConfigError,
  PermissionError
} from '@fractary/codex'

async function handleCodexOperation() {
  try {
    const client = await createCodexClient()
    await client.fetch('codex://org/project/file.md')
  } catch (error) {
    if (error instanceof InvalidUriError) {
      console.error('Invalid URI format')
      console.error('Expected: codex://org/project/path')
    } else if (error instanceof StorageError) {
      console.error('Storage operation failed')
      console.error('Check network connection and credentials')
    } else if (error instanceof CacheError) {
      console.error('Cache operation failed')
      console.error('Try clearing cache: fractary-codex cache-clear --all')
    } else if (error instanceof PermissionError) {
      console.error('Permission denied')
    } else if (error instanceof ConfigError) {
      console.error('Configuration error')
      console.error('Run: fractary-codex configure')
    } else {
      console.error(`Unexpected error: ${error.message}`)
    }
    process.exit(1)
  }
}
```

### Best Practices

**1. Initialize Client Once:**

```typescript
let clientInstance: CodexClient | null = null

async function getClient(): Promise<CodexClient> {
  if (!clientInstance) {
    clientInstance = await createCodexClient()
  }
  return clientInstance
}
```

**2. Use Progress Indicators:**

```typescript
import ora from 'ora'

async function fetchWithProgress(uri: string) {
  const spinner = ora(`Fetching ${uri}`).start()
  try {
    const client = await getClient()
    const result = await client.fetch(uri)
    spinner.succeed(`Fetched ${uri}`)
    return result
  } catch (error) {
    spinner.fail(`Failed to fetch ${uri}`)
    throw error
  }
}
```

**3. Validate URIs Early:**

```typescript
import { validateUri, parseReference } from '@fractary/codex'

function validateCodexUri(uri: string): void {
  if (!validateUri(uri)) {
    throw new Error(`Invalid codex URI: ${uri}`)
  }
  const ref = parseReference(uri)
  if (!ref.org || !ref.project || !ref.path) {
    throw new Error('URI must include org, project, and path')
  }
}
```

## Troubleshooting

### CLI Not Found

**Problem:** `fractary-codex: command not found`

**Solutions:**

```bash
# Check if installed
npm list -g @fractary/codex-cli

# Reinstall
npm install -g @fractary/codex-cli

# Or use npx
npx @fractary/codex-cli --help
```

### Configuration Not Loading

**Problem:** CLI uses defaults instead of config.

**Diagnostic:**

```bash
fractary-codex cache-health
# Check "CONFIGURATION" section
```

**Solutions:**

1. Ensure `.fractary/config.yaml` exists
2. Validate YAML syntax: `yamllint .fractary/config.yaml`
3. Run `fractary-codex configure` to recreate

### Fetch Fails

**Problem:** `StorageError: All providers failed`

**Diagnostic:**

```bash
# Enable verbose output
DEBUG=codex:* fractary-codex document-fetch codex://org/project/file.md

# Check health
fractary-codex cache-health
```

**Solutions:**

1. Verify URI format is correct
2. Check network connectivity
3. Ensure `GITHUB_TOKEN` is set for private repos
4. Verify file exists at the path

### Cache Not Working

**Problem:** Every fetch is slow (no cache hits).

**Diagnostic:**

```bash
fractary-codex cache-stats
# Check hit rate and entry count
```

**Solutions:**

1. Check cache directory exists and is writable
2. Verify TTL is not too short
3. Clear and rebuild cache:
   ```bash
   fractary-codex cache-clear --all
   fractary-codex document-fetch codex://org/project/file.md
   ```

### Sync Conflicts

**Problem:** Sync reports conflicts.

**Solutions:**

1. Use `--dry-run` to preview first
2. Check conflict resolution strategy in config
3. Manually resolve conflicts and re-sync

## See Also

- [Configuration Guide](../configuration.md) - Complete configuration reference
- [JavaScript SDK](../sdk/js/) - SDK documentation
- [MCP Server](../mcp-server/) - AI agent integration

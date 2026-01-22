# Fractary Codex CLI

Comprehensive documentation for the `@fractary/codex-cli` command-line interface.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands Reference](#commands-reference)
  - [init](#init---initialize-configuration)
  - [fetch](#fetch---fetch-documents)
  - [cache](#cache---cache-management)
  - [sync](#sync---bidirectional-synchronization)
  - [types](#types---type-registry-management)
  - [health](#health---diagnostics)
  - [migrate](#migrate---configuration-migration)
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
fractary-codex init
# Creates .fractary/config.yaml and .fractary/codex/cache/
```

### 2. Fetch Documents

```bash
fractary-codex fetch codex://myorg/myproject/README.md
```

### 3. Check Cache Status

```bash
fractary-codex cache stats
```

## Commands Reference

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
# Creates:
#   .fractary/config.yaml
#   .fractary/codex/cache/
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

**Output:**

```
Cache Statistics:
Total entries: 42
Total size: 3.20 MB
Hit rate: 94.50%
Memory entries: 15
Disk entries: 27
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

**Examples:**

```bash
# Bidirectional sync
fractary-codex sync project

# One-way to codex
fractary-codex sync project --to-codex

# One-way from codex
fractary-codex sync project --from-codex

# Preview changes
fractary-codex sync project --dry-run

# Specific environment
fractary-codex sync project --env test
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

**Output:**

```
Codex Health Check
═══════════════════════════════════════

CONFIGURATION                   ✅ PASS
✓ Config file exists
✓ Config is valid YAML
✓ Required fields present

CACHE                           ✅ PASS
✓ Cache directory exists
✓ Cache index valid
✓ All cached files accessible

OVERALL STATUS: ✅ Healthy
Checks passed: 22/24 (92%)
```

### `migrate` - Configuration Migration

Migrate legacy v2.x JSON configuration to v3.0 YAML format.

```bash
fractary-codex migrate [options]

Options:
  --dry-run    Preview migration without writing
  --json       Output as JSON
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

### Pattern 2: Command Implementation

```typescript
// src/commands/fetch.ts
import { Command } from 'commander'
import { createCodexClient } from '../codex-client'
import chalk from 'chalk'

export function createFetchCommand(): Command {
  return new Command('fetch')
    .description('Fetch a document from codex')
    .argument('<uri>', 'Codex URI (e.g., codex://org/project/path.md)')
    .option('-o, --output <path>', 'Output file path')
    .option('--no-cache', 'Bypass cache and fetch fresh')
    .option('--metadata', 'Show metadata only')
    .action(async (uri, options) => {
      try {
        const client = await createCodexClient()
        console.log(chalk.blue(`Fetching: ${uri}`))
        const result = await client.fetch(uri)

        if (options.metadata) {
          console.log(JSON.stringify(result.metadata, null, 2))
        } else if (options.output) {
          const fs = await import('fs/promises')
          await fs.writeFile(options.output, result.content)
          console.log(chalk.green(`✓ Saved to ${options.output}`))
        } else {
          console.log(result.content.toString())
        }
      } catch (error) {
        console.error(chalk.red(`Error: ${error.message}`))
        process.exit(1)
      }
    })
}
```

### Pattern 3: Error Handling

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
      console.error('Try clearing cache: fractary-codex cache clear --all')
    } else if (error instanceof PermissionError) {
      console.error('Permission denied')
    } else if (error instanceof ConfigError) {
      console.error('Configuration error')
      console.error('Run: fractary-codex init')
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
fractary-codex health
# Check "CONFIGURATION" section
```

**Solutions:**

1. Ensure `.fractary/config.yaml` exists
2. Validate YAML syntax: `yamllint .fractary/config.yaml`
3. Run `fractary-codex init` to recreate

### Fetch Fails

**Problem:** `StorageError: All providers failed`

**Diagnostic:**

```bash
# Enable verbose output
DEBUG=codex:* fractary-codex fetch codex://org/project/file.md

# Check health
fractary-codex health
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
fractary-codex cache stats
# Check hit rate and entry count
```

**Solutions:**

1. Check cache directory exists and is writable
2. Verify TTL is not too short
3. Clear and rebuild cache:
   ```bash
   fractary-codex cache clear --all
   fractary-codex fetch codex://org/project/file.md
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

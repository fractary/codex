# CLI Integration Guide

This guide shows how to integrate the Fractary Codex SDK into CLI applications, using `fractary/cli` as a reference example.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Basic Setup](#basic-setup)
- [Common CLI Patterns](#common-cli-patterns)
- [Command Implementation Examples](#command-implementation-examples)
- [MCP Server Integration](#mcp-server-integration)
- [Error Handling](#error-handling)
- [Configuration Management](#configuration-management)
- [Best Practices](#best-practices)

## Overview

The Codex SDK provides the building blocks for CLI tools that need to:
- Parse and resolve `codex://` URIs
- Fetch content from multiple storage providers (local, GitHub, HTTP)
- Cache content intelligently with type-based TTL
- Synchronize files bidirectionally
- Expose an MCP server for AI agent integration

This guide focuses on **practical integration patterns** rather than API details.

## Installation

### JavaScript/TypeScript CLI

```bash
npm install @fractary/codex
# or
yarn add @fractary/codex
# or
pnpm add @fractary/codex
```

### Python CLI

```bash
pip install fractary-codex
# or
poetry add fractary-codex
```

## Basic Setup

### TypeScript CLI Structure

```typescript
// src/cli.ts
import { Command } from 'commander'
import { createCodexClient } from './codex-client'

const program = new Command()

program
  .name('fractary')
  .description('Fractary CLI - Knowledge infrastructure for AI agents')
  .version('1.0.0')

// Add codex commands
program
  .command('fetch <uri>')
  .description('Fetch a document from codex')
  .action(async (uri) => {
    const client = await createCodexClient()
    await client.fetch(uri)
  })

program.parse()
```

### Python CLI Structure

```python
# src/cli.py
import click
from .codex_client import create_codex_client

@click.group()
@click.version_option()
def cli():
    """Fractary CLI - Knowledge infrastructure for AI agents"""
    pass

@cli.command()
@click.argument('uri')
async def fetch(uri: str):
    """Fetch a document from codex"""
    client = await create_codex_client()
    await client.fetch(uri)

if __name__ == '__main__':
    cli()
```

## Common CLI Patterns

### Pattern 1: Unified Codex Client

Create a client wrapper that encapsulates all Codex SDK functionality.

**TypeScript:**

```typescript
// src/codex-client.ts
import {
  CacheManager,
  StorageManager,
  TypeRegistry,
  parseReference,
  resolveReference,
  loadConfig,
  createMcpServer,
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
    // Load configuration
    const config = loadConfig(options?.configPath)

    // Create type registry
    const types = new TypeRegistry()
    if (config.types) {
      Object.values(config.types).forEach(type => types.register(type))
    }

    // Create storage manager
    const storage = StorageManager.create({
      providers: config.storage || []
    })

    // Create cache manager
    const cache = CacheManager.create({
      cacheDir: options?.cacheDir || config.cacheDir || '.fractary/codex/cache',
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

export async function createCodexClient(options?: {
  cacheDir?: string
  configPath?: string
}): Promise<CodexClient> {
  return CodexClient.create(options)
}
```

**Python:**

```python
# src/codex_client.py
from fractary_codex import (
    CacheManager,
    StorageManager,
    TypeRegistry,
    parse_reference,
    resolve_reference,
    load_config,
    CodexConfig,
    FetchResult
)
from typing import Optional
from pathlib import Path

class CodexClient:
    def __init__(
        self,
        cache: CacheManager,
        storage: StorageManager,
        types: TypeRegistry,
        config: CodexConfig
    ):
        self._cache = cache
        self._storage = storage
        self._types = types
        self._config = config

    @classmethod
    async def create(
        cls,
        cache_dir: Optional[str] = None,
        config_path: Optional[Path] = None
    ) -> "CodexClient":
        # Load configuration
        config = load_config(config_path)

        # Create type registry
        types = TypeRegistry()
        if config.types:
            for artifact_type in config.types.values():
                types.register(artifact_type)

        # Create storage manager
        async with StorageManager() as storage:
            for provider_config in config.storage or []:
                # Register providers based on config
                pass

        # Create cache manager
        cache_dir_path = cache_dir or config.cache_dir or ".fractary/codex/cache"
        async with CacheManager(cache_dir=cache_dir_path) as cache:
            cache.set_storage_manager(storage)

        return cls(cache, storage, types, config)

    async def fetch(self, uri: str) -> FetchResult:
        ref = parse_reference(uri)
        resolved = resolve_reference(ref.uri)
        return await self._cache.get(resolved)

    async def invalidate_cache(self, pattern: Optional[str] = None) -> None:
        await self._cache.invalidate(pattern)

    async def get_cache_stats(self) -> dict:
        return await self._cache.get_stats()

    @property
    def config(self) -> CodexConfig:
        return self._config

async def create_codex_client(
    cache_dir: Optional[str] = None,
    config_path: Optional[Path] = None
) -> CodexClient:
    return await CodexClient.create(cache_dir, config_path)
```

## Command Implementation Examples

### Fetch Command

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

### Cache Management Command

```typescript
// src/commands/cache.ts
import { Command } from 'commander'
import { createCodexClient } from '../codex-client'
import chalk from 'chalk'

export function createCacheCommand(): Command {
  const cache = new Command('cache')
    .description('Manage codex cache')

  cache
    .command('clear')
    .description('Clear cache entries')
    .option('-p, --pattern <pattern>', 'Clear entries matching pattern')
    .option('-a, --all', 'Clear all entries')
    .action(async (options) => {
      const client = await createCodexClient()

      if (options.all) {
        await client.invalidateCache()
        console.log(chalk.green('✓ All cache entries cleared'))
      } else if (options.pattern) {
        await client.invalidateCache(options.pattern)
        console.log(chalk.green(`✓ Cleared entries matching: ${options.pattern}`))
      } else {
        console.log(chalk.yellow('Please specify --all or --pattern'))
      }
    })

  cache
    .command('stats')
    .description('Show cache statistics')
    .action(async () => {
      const client = await createCodexClient()
      const stats = await client.getCacheStats()

      console.log(chalk.bold('Cache Statistics:'))
      console.log(`Total entries: ${stats.totalEntries}`)
      console.log(`Total size: ${formatBytes(stats.totalSize)}`)
      console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`)
      console.log(`Memory entries: ${stats.memoryEntries}`)
      console.log(`Disk entries: ${stats.diskEntries}`)
    })

  return cache
}

function formatBytes(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}
```

### Sync Command

```typescript
// src/commands/sync.ts
import { Command } from 'commander'
import { createCodexClient } from '../codex-client'
import { SyncManager } from '@fractary/codex'
import chalk from 'chalk'

export function createSyncCommand(): Command {
  return new Command('sync')
    .description('Synchronize files with codex repository')
    .argument('[directory]', 'Directory to sync (default: current directory)')
    .option('-d, --direction <dir>', 'Sync direction: to-codex|from-codex|bidirectional', 'bidirectional')
    .option('--dry-run', 'Show what would be synced without making changes')
    .option('-e, --exclude <pattern>', 'Exclude patterns (can be repeated)', collect, [])
    .action(async (directory = '.', options) => {
      try {
        const client = await createCodexClient()
        const syncManager = SyncManager.create({
          config: client.getConfig(),
          dryRun: options.dryRun
        })

        console.log(chalk.blue(`Syncing ${directory}...`))

        const result = await syncManager.sync(directory, {
          direction: options.direction,
          exclude: options.exclude
        })

        console.log(chalk.green(`✓ Synced ${result.filesChanged} files`))
        if (result.conflicts.length > 0) {
          console.log(chalk.yellow(`⚠ ${result.conflicts.length} conflicts detected`))
          result.conflicts.forEach(conflict => {
            console.log(`  - ${conflict.path}`)
          })
        }
      } catch (error) {
        console.error(chalk.red(`Error: ${error.message}`))
        process.exit(1)
      }
    })
}

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value])
}
```

### Config Command

```typescript
// src/commands/config.ts
import { Command } from 'commander'
import { createCodexClient } from '../codex-client'
import { resolveOrganization } from '@fractary/codex'
import chalk from 'chalk'

export function createConfigCommand(): Command {
  const config = new Command('config')
    .description('Manage codex configuration')

  config
    .command('show')
    .description('Show current configuration')
    .option('-j, --json', 'Output as JSON')
    .action(async (options) => {
      const client = await createCodexClient()
      const cfg = client.getConfig()

      if (options.json) {
        console.log(JSON.stringify(cfg, null, 2))
      } else {
        console.log(chalk.bold('Codex Configuration:'))
        console.log(`Organization: ${cfg.organization || '(not set)'}`)
        console.log(`Cache directory: ${cfg.cacheDir}`)
        console.log(`Storage providers: ${cfg.storage?.length || 0}`)
        console.log(`Custom types: ${Object.keys(cfg.types || {}).length}`)
      }
    })

  config
    .command('init')
    .description('Initialize codex configuration')
    .option('-o, --org <name>', 'Organization name')
    .option('--auto-detect', 'Auto-detect organization from git')
    .action(async (options) => {
      const fs = await import('fs/promises')
      const path = await import('path')

      let org = options.org
      if (options.autoDetect) {
        org = resolveOrganization()
        console.log(chalk.blue(`Detected organization: ${org}`))
      }

      const configDir = '.fractary'
      const configPath = path.join(configDir, 'codex.yaml')

      await fs.mkdir(configDir, { recursive: true })

      const config = {
        organization: org,
        cacheDir: '.fractary/codex/cache',
        storage: [
          { type: 'local', basePath: './knowledge' },
          { type: 'github' }
        ],
        types: {}
      }

      const yaml = await import('yaml')
      await fs.writeFile(configPath, yaml.stringify(config))

      console.log(chalk.green(`✓ Created ${configPath}`))
    })

  return config
}
```

## MCP Server Integration

The Codex SDK includes an MCP (Model Context Protocol) server that can be integrated into CLI tools to provide AI agents with access to codex content.

### Standalone MCP Server

Run the MCP server as a subprocess:

```typescript
// src/commands/mcp.ts
import { Command } from 'commander'
import { createMcpServer } from '@fractary/codex'
import { createCodexClient } from '../codex-client'
import chalk from 'chalk'

export function createMcpCommand(): Command {
  return new Command('mcp')
    .description('Start MCP server for AI agent integration')
    .option('-p, --port <port>', 'Port to listen on', '3000')
    .option('-h, --host <host>', 'Host to bind to', 'localhost')
    .action(async (options) => {
      try {
        const client = await createCodexClient()

        const server = createMcpServer({
          name: 'fractary-codex',
          version: '1.0.0',
          cache: client['cache'], // Access private cache manager
          storage: client['storage'] // Access private storage manager
        })

        await server.start({
          host: options.host,
          port: parseInt(options.port)
        })

        console.log(chalk.green(`✓ MCP server listening on ${options.host}:${options.port}`))
        console.log(chalk.blue('Available tools:'))
        console.log('  - codex_fetch: Fetch documents')
        console.log('  - codex_search: Search documents')
        console.log('  - codex_list: List documents')
        console.log('  - codex_invalidate: Invalidate cache')

        // Keep process running
        process.on('SIGINT', async () => {
          console.log(chalk.yellow('\nShutting down...'))
          await server.stop()
          process.exit(0)
        })
      } catch (error) {
        console.error(chalk.red(`Error: ${error.message}`))
        process.exit(1)
      }
    })
}
```

### Embedded MCP Server

Embed MCP tools directly in your CLI:

```typescript
// src/ai-context.ts
import { createMcpServer, type McpServer } from '@fractary/codex'
import { createCodexClient } from './codex-client'

export class AIContext {
  private mcpServer: McpServer

  private constructor(mcpServer: McpServer) {
    this.mcpServer = mcpServer
  }

  static async create(): Promise<AIContext> {
    const client = await createCodexClient()

    const server = createMcpServer({
      name: 'fractary-codex',
      version: '1.0.0',
      cache: client['cache'],
      storage: client['storage']
    })

    return new AIContext(server)
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    return await this.mcpServer.callTool(name, args)
  }

  async fetch(uri: string): Promise<string> {
    const result = await this.callTool('codex_fetch', { uri })
    return result.content
  }

  async search(query: string, type?: string): Promise<any[]> {
    return await this.callTool('codex_search', { query, type })
  }

  async list(prefix?: string): Promise<string[]> {
    return await this.callTool('codex_list', { prefix })
  }
}
```

## Error Handling

### Common Error Types

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
      console.error('Try clearing cache: fractary cache clear --all')
    } else if (error instanceof PermissionError) {
      console.error('Permission denied')
      console.error('Check document permissions in frontmatter')
    } else if (error instanceof ConfigError) {
      console.error('Configuration error')
      console.error('Run: fractary config init')
    } else {
      console.error(`Unexpected error: ${error.message}`)
    }
    process.exit(1)
  }
}
```

### Graceful Degradation

```typescript
async function fetchWithFallback(uri: string): Promise<string> {
  const client = await createCodexClient()

  try {
    // Try cache first
    const result = await client.fetch(uri)
    return result.content.toString()
  } catch (cacheError) {
    console.warn('Cache miss, trying direct fetch...')

    try {
      // Bypass cache
      const storage = client['storage']
      const ref = parseReference(uri)
      const resolved = resolveReference(ref.uri)
      const result = await storage.fetch(resolved)
      return result.content.toString()
    } catch (storageError) {
      console.error('All fetch attempts failed')
      throw storageError
    }
  }
}
```

## Configuration Management

### Loading Configuration

```typescript
// Load from default location (.fractary/config.yaml)
const config = loadConfig()

// Load from custom path
const config = loadConfig('/path/to/codex.yaml')

// Load with environment overrides
const config = loadConfig()
if (process.env.CODEX_CACHE_DIR) {
  config.cacheDir = process.env.CODEX_CACHE_DIR
}
if (process.env.GITHUB_TOKEN) {
  const githubProvider = config.storage?.find(p => p.type === 'github')
  if (githubProvider) {
    githubProvider.token = process.env.GITHUB_TOKEN
  }
}
```

### Auto-Detection

```typescript
import { resolveOrganization } from '@fractary/codex'

// Auto-detect organization from:
// 1. .fractary/config.yaml config
// 2. Git remote URL
// 3. Current directory name (fallback)
const org = resolveOrganization()
```

## Best Practices

### 1. Initialize Client Once

```typescript
// ❌ Bad: Creates new client for each command
async function badFetch(uri: string) {
  const client = await createCodexClient()
  return await client.fetch(uri)
}

// ✅ Good: Reuse client instance
let clientInstance: CodexClient | null = null

async function getClient(): Promise<CodexClient> {
  if (!clientInstance) {
    clientInstance = await createCodexClient()
  }
  return clientInstance
}

async function goodFetch(uri: string) {
  const client = await getClient()
  return await client.fetch(uri)
}
```

### 2. Use Progress Indicators

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

### 3. Validate URIs Early

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

### 4. Handle Interruptions Gracefully

```typescript
let isShuttingDown = false

process.on('SIGINT', async () => {
  if (isShuttingDown) {
    process.exit(1)
  }

  isShuttingDown = true
  console.log('\nShutting down gracefully...')

  // Cleanup
  const client = await getClient()
  await client.invalidateCache() // Persist cache

  process.exit(0)
})
```

### 5. Log Verbosity Levels

```typescript
import debug from 'debug'

const log = {
  error: console.error,
  warn: console.warn,
  info: debug('fractary:info'),
  debug: debug('fractary:debug')
}

// Usage
log.info('Fetching document...')
log.debug('Cache key:', cacheKey)

// Enable with: DEBUG=fractary:* fractary fetch ...
```

## Next Steps

- **API Reference**: See [API Reference](./api-reference.md) for detailed API documentation
- **Configuration Guide**: See [Configuration Guide](./configuration.md) for configuration options
- **Examples**: See [Examples](../examples/) for complete CLI implementations
- **Troubleshooting**: See [Troubleshooting Guide](./troubleshooting.md) for common issues

## Related Resources

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Commander.js](https://github.com/tj/commander.js) - CLI framework for Node.js
- [Click](https://click.palletsprojects.com/) - CLI framework for Python

# MCP Server

Comprehensive documentation for the `@fractary/codex-mcp-server` - Model Context Protocol server for AI agent integration.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Usage](#usage)
  - [Claude Code Integration](#claude-code-integration)
  - [Stdio Mode](#stdio-mode)
  - [HTTP Mode](#http-mode)
- [Configuration](#configuration)
  - [Basic Configuration](#basic-configuration)
  - [Archive Configuration](#archive-configuration)
- [Available Tools](#available-tools)
- [Architecture](#architecture)
- [Programmatic Usage](#programmatic-usage)
- [Authentication](#authentication)
- [Troubleshooting](#troubleshooting)

## Overview

The MCP (Model Context Protocol) server exposes Fractary Codex functionality as tools for AI agents and applications. It supports both stdio and HTTP/SSE transports for integration with Claude Code, LangChain, and other MCP-compatible clients.

**Key Features:**

- **Transparent document access** via `codex://` URIs
- **Intelligent caching** with automatic TTL management
- **Multiple storage backends** (Local, GitHub, HTTP, S3)
- **Archive support** for historical documents
- **Dual transport** (stdio for Claude Code, HTTP/SSE for other clients)

## Installation

### Global Installation

```bash
npm install -g @fractary/codex-mcp-server
```

### Direct Usage (npx)

```bash
npx @fractary/codex-mcp-server
```

### As Dependency

```bash
npm install @fractary/codex-mcp-server
```

## Usage

### Claude Code Integration

Add to your `.claude/settings.json`:

```json
{
  "mcpServers": {
    "fractary-codex": {
      "command": "npx",
      "args": ["-y", "@fractary/codex-mcp-server", "--config", ".fractary/config.yaml"]
    }
  }
}
```

After configuration, reference documents in conversations:

```
Can you explain the API in codex://myorg/project/docs/api.md?

Based on codex://myorg/shared/standards/api-guide.md, how should I structure this endpoint?
```

### Stdio Mode (Default)

```bash
fractary-codex-mcp --config .fractary/config.yaml
```

The server communicates via stdin/stdout using the MCP protocol.

### HTTP Mode

```bash
fractary-codex-mcp --port 3000 --host localhost
```

The server exposes an SSE (Server-Sent Events) endpoint for HTTP clients.

## Configuration

Create a `.fractary/config.yaml` configuration file.

### Basic Configuration

```yaml
# Organization configuration
organizationSlug: fractary

# Cache configuration
cache:
  dir: .fractary/codex/cache
  maxMemorySize: 104857600  # 100 MB
  defaultTtl: 3600          # 1 hour

# Storage providers
storage:
  providers:
    - type: local
      basePath: ./knowledge
    - type: github
      token: ${GITHUB_TOKEN}
```

### Archive Configuration

The archive feature enables transparent access to archived documents stored in cloud storage (S3, R2, GCS). When enabled, Codex automatically falls back to the archive when documents are not found locally or in GitHub.

```yaml
# Archive configuration (optional)
archive:
  projects:
    fractary/auth-service:
      enabled: true
      handler: s3              # s3, r2, gcs, or local
      bucket: fractary-archives
      patterns:                # Optional: limit to specific patterns
        - specs/**
        - docs/**
    fractary/api-gateway:
      enabled: true
      handler: r2
      bucket: api-archives
```

**Key Features:**

- **Transparent URIs**: Same `codex://org/project/path` URI works for both active and archived documents
- **Storage Priority**: Local → Archive → GitHub → HTTP (automatic fallback)
- **Per-Project Config**: Different projects can use different storage backends and buckets
- **Pattern Matching**: Optional patterns limit which files are archived

**Configuration Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | Boolean | Whether archive is active for this project |
| `handler` | String | Storage backend: `s3`, `r2`, `gcs`, or `local` |
| `bucket` | String | Cloud storage bucket name (optional) |
| `prefix` | String | Path prefix in bucket (default: `archive/`) |
| `patterns` | Array | Glob patterns to match (e.g., `specs/**`, `*.md`) |

**Archive Path Structure:**

```
archive/{type}/{org}/{project}/{original-path}

Examples:
  specs/WORK-123.md → archive/specs/fractary/auth-service/specs/WORK-123.md
  docs/api.md       → archive/docs/fractary/auth-service/docs/api.md
```

**Example Usage:**

```typescript
// Reference archived spec (same URI as before archiving)
const result = await fetch('codex://fractary/auth-service/specs/WORK-123.md')
// Codex checks: local → S3 archive → GitHub → HTTP
// Returns content from archive if not found locally
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FRACTARY_CONFIG` | Path to configuration file (default: `.fractary/config.yaml`) |
| `GITHUB_TOKEN` | GitHub personal access token for GitHub storage provider |
| `FRACTARY_CLI` | Path to fractary CLI executable (default: `fractary`) |
| `AWS_ACCESS_KEY_ID` | AWS credentials for S3 |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials for S3 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare credentials for R2 |
| `CLOUDFLARE_API_TOKEN` | Cloudflare credentials for R2 |

## Available Tools

The MCP server exposes the following tools:

### codex_document_fetch

Fetch a document from the Codex knowledge base by URI.

**Input:**

```json
{
  "uri": "codex://org/project/path/to/file.md",
  "branch": "main",
  "noCache": false
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uri` | string | Yes | Codex URI in format `codex://org/project/path` |
| `branch` | string | No | Git branch to fetch from (default: main) |
| `noCache` | boolean | No | Bypass cache and fetch fresh content |

### codex_search

Search for documents in the knowledge base.

**Input:**

```json
{
  "query": "authentication",
  "org": "fractary",
  "project": "codex",
  "limit": 10,
  "type": "docs"
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query string |
| `org` | string | No | Filter by organization |
| `project` | string | No | Filter by project |
| `limit` | number | No | Maximum results (default: 10) |
| `type` | string | No | Filter by artifact type |

### codex_cache_list

List cached documents.

**Input:**

```json
{
  "org": "fractary",
  "project": "codex",
  "includeExpired": false
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org` | string | No | Filter by organization |
| `project` | string | No | Filter by project |
| `includeExpired` | boolean | No | Include expired cache entries |

### codex_cache_clear

Clear cached documents by pattern.

**Input:**

```json
{
  "pattern": "docs/**"
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pattern` | string | Yes | Regex pattern to match URIs to invalidate |

## Architecture

The MCP server bridges the Codex SDK with the MCP protocol:

```
┌─────────────────────────────────────┐
│   MCP Client (Claude Code, etc.)   │
└─────────────┬───────────────────────┘
              │ JSON-RPC (stdio/HTTP)
              ▼
┌─────────────────────────────────────┐
│  @fractary/codex-mcp-server         │
│  ┌───────────────────────────────┐  │
│  │ MCP Protocol Handler          │  │
│  │   (StdioTransport / SSE)     │  │
│  └─────────────┬─────────────────┘  │
│                │                     │
│  ┌─────────────▼─────────────────┐  │
│  │ Tool Registration Bridge      │  │
│  │   (registerCodexTools)        │  │
│  └─────────────┬─────────────────┘  │
└────────────────┼─────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│       @fractary/codex (SDK)         │
│  ┌─────────┐  ┌──────────────┐     │
│  │ Cache   │  │  Storage     │     │
│  │ Manager │  │  Manager     │     │
│  └─────────┘  └──────────────┘     │
└─────────────────────────────────────┘
```

## Programmatic Usage

You can also use the MCP server programmatically:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CacheManager, StorageManager } from '@fractary/codex'
import { registerCodexTools } from '@fractary/codex-mcp-server'

// Initialize SDK managers
const storage = StorageManager.create({ /* config */ })
const cache = CacheManager.create({ /* config */ })
cache.setStorageManager(storage)

// Create MCP server
const server = new Server(
  { name: 'fractary-codex', version: '0.1.0' },
  { capabilities: { tools: {}, resources: {} } }
)

// Register Codex tools
registerCodexTools(server, { cache, storage })

// Connect transport
const transport = new StdioServerTransport()
await server.connect(transport)
```

### Embedding in CLI Tools

```typescript
// src/commands/mcp.ts
import { Command } from 'commander'
import { createMcpServer } from '@fractary/codex'
import chalk from 'chalk'

export function createMcpCommand(): Command {
  return new Command('mcp')
    .description('Start MCP server for AI agent integration')
    .option('-p, --port <port>', 'Port to listen on', '3000')
    .option('-h, --host <host>', 'Host to bind to', 'localhost')
    .action(async (options) => {
      const server = createMcpServer({
        name: 'fractary-codex',
        version: '1.0.0',
        cacheDir: '.fractary/codex/cache'
      })

      await server.start({
        host: options.host,
        port: parseInt(options.port)
      })

      console.log(chalk.green(`✓ MCP server listening on ${options.host}:${options.port}`))
      console.log(chalk.blue('Available tools:'))
      console.log('  - codex_document_fetch: Fetch documents')
      console.log('  - codex_search: Search documents')
      console.log('  - codex_cache_list: List documents')
      console.log('  - codex_cache_clear: Invalidate cache')

      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\nShutting down...'))
        await server.stop()
        process.exit(0)
      })
    })
}
```

## Authentication

### GitHub Token Setup

For accessing private repositories, set up GitHub authentication:

```bash
# Set environment variable
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Or in .env file (gitignored)
echo 'GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx' > .env
```

### Multiple Organizations

Configure per-remote authentication in your config:

```yaml
codex:
  auth:
    github:
      default_token_env: GITHUB_TOKEN
      fallback_to_public: true

  remotes:
    # Partner organization with separate token
    partner-org/shared-specs:
      token: ${PARTNER_GITHUB_TOKEN}
```

### Token Scopes

| Use Case | Required Scopes |
|----------|----------------|
| Public repos only | None |
| Private repos (read) | `repo` |
| Organization repos | `repo`, `read:org` |

### CI/CD Integration

**GitHub Actions:**

```yaml
# .github/workflows/codex.yml
name: Codex Fetch

on: [push]

jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Fetch from Codex
        env:
          GITHUB_TOKEN: ${{ secrets.CODEX_GITHUB_TOKEN }}
        run: |
          npm install -g @fractary/codex-cli
          fractary-codex fetch codex://org/project/file.md
```

## Migration from SDK-Embedded MCP

If you were using the MCP server from `@fractary/codex` (versions ≤0.1.x), update your configuration:

**Before:**

```json
{
  "mcpServers": {
    "fractary-codex": {
      "command": "npx",
      "args": ["@fractary/codex", "mcp", "--config", ".fractary/config.yaml"]
    }
  }
}
```

**After:**

```json
{
  "mcpServers": {
    "fractary-codex": {
      "command": "npx",
      "args": ["-y", "@fractary/codex-mcp-server", "--config", ".fractary/config.yaml"]
    }
  }
}
```

The functionality remains identical; only the package name has changed.

## Troubleshooting

### MCP Server Not Starting

**Problem:** Server fails to start or crashes immediately.

**Diagnostic:**

```bash
# Run with verbose output
DEBUG=* fractary-codex-mcp --config .fractary/config.yaml

# Check config validity
cat .fractary/config.yaml | yq
```

**Solutions:**

1. Ensure config file exists and is valid YAML
2. Check all required environment variables are set
3. Verify npx can install the package: `npx @fractary/codex-mcp-server --help`

### Resources Not Appearing in Claude

**Problem:** No codex resources visible in Claude's resource panel.

**Diagnostic:**

1. Check Claude Code settings for MCP server configuration
2. Verify server is running: check for process
3. Test fetch directly: `fractary-codex fetch codex://org/project/file.md`

**Solutions:**

1. Restart Claude Code after configuration changes
2. Verify the config path in settings.json is correct
3. Ensure documents exist and are cached:
   ```bash
   fractary-codex fetch codex://org/project/file.md
   fractary-codex cache list
   ```

### Fetch Returns 404

**Problem:** Documents not found even though they exist.

**Diagnostic:**

```bash
# Check if file exists in repo
gh api repos/org/project/contents/path/to/file.md

# Check cache
fractary-codex cache list --json | jq '.[] | select(.uri == "codex://org/project/path/to/file.md")'
```

**Solutions:**

1. Verify URI format is correct: `codex://org/project/path`
2. Check branch configuration (default is `main`)
3. Ensure path is case-sensitive correct
4. For private repos, verify `GITHUB_TOKEN` has access

### Token Validation Failures

**Problem:** "Bad credentials" or 401 errors.

**Diagnostic:**

```bash
# Verify token is set
echo $GITHUB_TOKEN

# Test token validity
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

**Solutions:**

1. Regenerate token at https://github.com/settings/tokens
2. Ensure token has required scopes (`repo` for private repos)
3. Check token hasn't expired

### Cache Problems

**Problem:** Stale content returned.

**Solutions:**

```bash
# Force fresh fetch
fractary-codex fetch codex://org/project/file.md --bypass-cache

# Clear specific entry
fractary-codex cache clear --pattern "org/project/file.md"

# Clear all cache
fractary-codex cache clear --all
```

### Rate Limiting

**Problem:** "API rate limit exceeded" errors.

**Solutions:**

1. Always use authentication (5,000 requests/hour vs 60 unauthenticated)
2. Check current rate limit:
   ```bash
   curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/rate_limit
   ```
3. Use caching to reduce API calls (default behavior)

## See Also

- [Configuration Guide](../configuration.md) - Complete configuration reference
- [JavaScript SDK](../sdk/js/) - SDK documentation
- [CLI Documentation](../cli/) - Command-line interface
- [MCP Specification](https://modelcontextprotocol.io) - Model Context Protocol

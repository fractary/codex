# @fractary/codex-mcp-server

MCP (Model Context Protocol) server for Fractary Codex knowledge management.

## Overview

This package provides a standalone MCP server that exposes Fractary Codex functionality as tools for AI agents and applications. It supports both stdio and HTTP/SSE transports for integration with Claude Code, LangChain, and other MCP-compatible clients.

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

Create a `.fractary/config.yaml` configuration file:

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

# Archive configuration (optional)
# Enables transparent access to archived documents in S3/R2/GCS
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

### Archive Configuration

The archive feature enables transparent access to archived documents stored in cloud storage (S3, R2, GCS). When enabled, Codex automatically falls back to the archive when documents are not found locally or in GitHub.

**Key Features:**
- **Transparent URIs**: Same `codex://org/project/path` URI works for both active and archived documents
- **Storage Priority**: Local → Archive → GitHub → HTTP (automatic fallback)
- **Per-Project Config**: Different projects can use different storage backends and buckets
- **Pattern Matching**: Optional patterns limit which files are archived

**Configuration Fields:**
- `enabled`: Boolean - Whether archive is active for this project
- `handler`: String - Storage backend: `s3`, `r2`, `gcs`, or `local`
- `bucket`: String (optional) - Cloud storage bucket name
- `prefix`: String (optional) - Path prefix in bucket (default: `archive/`)
- `patterns`: Array (optional) - Glob patterns to match (e.g., `specs/**`, `*.md`)

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

**Requirements:**
- [fractary CLI](https://github.com/fractary/cli) installed and configured
- Cloud storage credentials (AWS credentials for S3, Cloudflare for R2, etc.)
- Archive structure must mirror project structure

### Environment Variables

- `FRACTARY_CONFIG`: Path to configuration file (default: `.fractary/config.yaml`)
- `GITHUB_TOKEN`: GitHub personal access token for GitHub storage provider
- `FRACTARY_CLI`: Path to fractary CLI executable (default: `fractary`)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: AWS credentials for S3
- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`: Cloudflare credentials for R2

## Available Tools

The MCP server exposes the following tools:

### codex_document_fetch

Fetch a document from the Codex knowledge base by URI.

```json
{
  "uri": "codex://org/project/path/to/file.md",
  "branch": "main",
  "noCache": false
}
```

### codex_search

Search for documents in the knowledge base.

```json
{
  "query": "authentication",
  "org": "fractary",
  "project": "codex",
  "limit": 10,
  "type": "docs"
}
```

### codex_cache_list

List cached documents.

```json
{
  "org": "fractary",
  "project": "codex",
  "includeExpired": false
}
```

### codex_cache_clear

Clear cached documents by pattern.

```json
{
  "pattern": "docs/**"
}
```

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

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Type Check

```bash
npm run typecheck
```

### Testing

```bash
npm test
npm run test:watch
npm run test:coverage
```

### Linting

```bash
npm run lint
npm run format
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

## License

MIT

## Related Packages

- [@fractary/codex](https://www.npmjs.com/package/@fractary/codex) - Core SDK
- [@fractary/codex-cli](https://www.npmjs.com/package/@fractary/codex-cli) - CLI tool

## Links

- [GitHub Repository](https://github.com/fractary/codex)
- [Issue Tracker](https://github.com/fractary/codex/issues)
- [MCP Specification](https://modelcontextprotocol.io)

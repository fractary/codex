# @fractary/codex-mcp

MCP (Model Context Protocol) server for Fractary Codex knowledge management.

## Overview

Standalone MCP server that exposes Fractary Codex functionality as tools for AI agents. Supports stdio (default) and HTTP/SSE transports.

## Installation

```bash
# Direct usage (recommended)
npx @fractary/codex-mcp

# Global install
npm install -g @fractary/codex-mcp
```

## Quick Start

### Claude Code / MCP Client Integration

Add to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "fractary-codex": {
      "command": "npx",
      "args": ["-y", "@fractary/codex-mcp", "--config", ".fractary/config.yaml"]
    }
  }
}
```

### Stdio Mode (default)

```bash
fractary-codex-mcp --config .fractary/config.yaml
```

### HTTP Mode

```bash
fractary-codex-mcp --port 3000 --host localhost
```

## Available Tools

| Tool | Description |
|------|-------------|
| `codex_document_fetch` | Fetch a document by codex:// URI |
| `codex_cache_list` | List cached documents |
| `codex_cache_clear` | Clear cache entries by pattern |
| `codex_cache_stats` | Get cache statistics |
| `codex_cache_health` | Run health diagnostics |
| `codex_file_sources_list` | List file plugin sources |

### codex_document_fetch

Fetch a document by its codex:// URI with automatic caching.

**Parameters:**
- `uri` (string, required) - Codex URI (e.g., `codex://org/project/docs/file.md`)
- `bypass_cache` (boolean, optional) - Skip cache and fetch from source
- `ttl` (number, optional) - Override TTL in seconds

### codex_cache_list

List documents currently in the cache.

**Parameters:**
- `status` (string, optional) - Filter: `fresh`, `stale`, `expired`, `all`
- `limit` (number, optional) - Max entries to return

### codex_cache_clear

Clear cache entries.

**Parameters:**
- `pattern` (string, optional) - Glob pattern to match URIs
- `all` (boolean, optional) - Clear entire cache

### codex_cache_stats

Get cache statistics (entry count, total size, hit rates). No parameters.

### codex_cache_health

Run diagnostics on the codex setup. No parameters.

### codex_file_sources_list

List file plugin sources configured in `.fractary/config.yaml`. No parameters.

## Configuration

Uses `.fractary/config.yaml`:

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

See the [Configuration Guide](../../docs/configuration.md) for the full reference.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub API token for private repository access |

## Development

```bash
npm run build
npm run dev    # watch mode
npm test
npm run typecheck
```

## License

MIT

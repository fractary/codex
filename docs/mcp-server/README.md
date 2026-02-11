# MCP Server

Documentation for `@fractary/codex-mcp` - Model Context Protocol server for AI agent integration.

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

### Claude Code Integration

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

After configuration, reference documents in conversations:

```
codex://myorg/project/docs/api.md
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

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uri` | string | yes | Codex URI (e.g., `codex://org/project/docs/file.md`) |
| `bypass_cache` | boolean | no | Skip cache and fetch from source |
| `ttl` | number | no | Override TTL in seconds |

### codex_cache_list

List documents currently in the cache.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | no | Filter: `fresh`, `stale`, `expired`, `all` |
| `limit` | number | no | Max entries to return |

### codex_cache_clear

Clear cache entries.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pattern` | string | no | Glob pattern to match URIs |
| `all` | boolean | no | Clear entire cache |

### codex_cache_stats

Get cache statistics (entry count, total size, hit rates). No parameters.

### codex_cache_health

Run diagnostics on the codex setup. No parameters.

### codex_file_sources_list

List configured file plugin sources. No parameters.

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

See [Configuration Guide](../configuration.md) for the full reference.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub API token for private repository access |

## Authentication

### GitHub Token

```bash
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### Multiple Organizations

Configure per-remote authentication in config:

```yaml
codex:
  remotes:
    myorg/codex.myorg.com:
      token: ${GITHUB_TOKEN}
    partner-org/shared-specs:
      token: ${PARTNER_GITHUB_TOKEN}
```

### Token Scopes

| Use Case | Required Scopes |
|----------|----------------|
| Public repos only | None |
| Private repos (read) | `repo` |
| Organization repos | `repo`, `read:org` |

## Troubleshooting

### Server Not Starting

```bash
# Check config
cat .fractary/config.yaml

# Verify package
npx @fractary/codex-mcp --help
```

### Tools Not Available in Claude

1. Restart Claude Code after adding `.mcp.json`
2. Verify config path is correct
3. Check `fractary-codex cache-health`

### Fetch Returns 404

1. Verify URI format: `codex://org/project/path`
2. Check file exists in repository
3. Verify `GITHUB_TOKEN` has access

### Stale Content

```bash
fractary-codex document-fetch codex://org/project/file.md --bypass-cache
fractary-codex cache-clear --pattern "codex://org/project/*"
```

## See Also

- [Configuration Guide](../configuration.md)
- [SDK Reference](../sdk/js/)
- [CLI Reference](../cli/)

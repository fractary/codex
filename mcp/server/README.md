# @fractary/codex-mcp-server

MCP (Model Context Protocol) server for Fractary Codex knowledge management.

## Overview

This package provides a standalone MCP server that exposes Fractary Codex functionality as tools for AI agents. Supports both stdio and HTTP/SSE transports.

## Installation

```bash
# Global
npm install -g @fractary/codex-mcp-server

# Direct usage
npx @fractary/codex-mcp-server
```

## Quick Start

### Claude Code Integration

Add to `.claude/settings.json`:

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

### Stdio Mode

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
| `codex_document_fetch` | Fetch document by URI |
| `codex_search` | Search documents |
| `codex_cache_list` | List cached documents |
| `codex_cache_clear` | Clear cache by pattern |

## Documentation

**Full documentation**: [docs/mcp-server/](../../docs/mcp-server/)

- [Configuration](../../docs/mcp-server/#configuration)
- [Archive Configuration](../../docs/mcp-server/#archive-configuration)
- [Tools Reference](../../docs/mcp-server/#available-tools)
- [Programmatic Usage](../../docs/mcp-server/#programmatic-usage)
- [Troubleshooting](../../docs/mcp-server/#troubleshooting)

## Configuration

Uses `.fractary/config.yaml`:

```yaml
organizationSlug: fractary

cache:
  dir: .fractary/codex/cache
  defaultTtl: 3600

storage:
  providers:
    - type: local
      basePath: ./knowledge
    - type: github
      token: ${GITHUB_TOKEN}
```

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Test
npm test

# Type check
npm run typecheck
```

## License

MIT

## Related

- [@fractary/codex](https://www.npmjs.com/package/@fractary/codex) - Core SDK
- [@fractary/codex-cli](https://www.npmjs.com/package/@fractary/codex-cli) - CLI tool
- [MCP Specification](https://modelcontextprotocol.io)

# Fractary Codex Plugin

Self-managing memory fabric with MCP integration for Claude Code.

## Overview

The codex plugin provides intelligent knowledge retrieval and documentation synchronization across organization projects. Reference docs via `codex://` URIs (auto-fetched by MCP). Sync projects bidirectionally with central codex repository.

## Quick Start

### 1. Configure

```bash
/fractary-codex:configure
```

Sets up configuration at `.fractary/config.yaml`, cache directory, and MCP server.

**Restart Claude Code after initialization to load the MCP server.**

### 2. Sync Documentation

```bash
/fractary-codex:sync
```

### 3. Reference Documents

```
codex://fractary/auth-service/docs/oauth.md
```

The MCP server automatically handles caching and fetching.

## Key Commands

| Command | Description |
|---------|-------------|
| `/fractary-codex:configure` | Initialize configuration |
| `/fractary-codex:sync` | Sync documentation |
| `/fractary-codex:fetch <uri>` | Fetch document by URI |
| `/fractary-codex:cache-list` | List cached documents |
| `/fractary-codex:cache-clear` | Clear cache |
| `/fractary-codex:health` | Run diagnostics |

## Documentation

**Full documentation**: [docs/plugins/](../../docs/plugins/)

- [Commands Reference](../../docs/plugins/#commands)
- [Sync Configuration](../../docs/plugins/#sync-configuration)
- [MCP Integration](../../docs/plugins/#mcp-integration)
- [Permissions](../../docs/plugins/#permissions)
- [Troubleshooting](../../docs/plugins/#troubleshooting)
- [Configuration Guide](../../docs/configuration.md)

## Architecture

```
Request codex://org/project/docs/api.md
         ↓
  Check local cache (< 100ms)
         ↓ (if expired/missing)
  Fetch from source (< 2s)
         ↓
  Cache locally with TTL
         ↓
  Return content
```

**Key Benefits:**
- **Fast**: < 100ms cache hits
- **Secure**: Frontmatter-based permissions
- **Multi-source**: GitHub, HTTP, MCP servers
- **Offline**: Cached content available without network

## License

MIT

## See Also

- [JavaScript SDK](../../sdk/js/) - Core SDK
- [CLI](../../cli/) - Command-line interface
- [MCP Server](../../mcp/server/) - MCP server package

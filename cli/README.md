# Fractary Codex CLI

Command-line interface for Fractary Codex knowledge management system.

## Installation

```bash
npm install -g @fractary/codex-cli
```

## Quick Start

```bash
# Initialize configuration
fractary-codex init

# Fetch a document
fractary-codex fetch codex://myorg/myproject/README.md

# Check cache status
fractary-codex cache stats

# Run health check
fractary-codex health
```

## Commands Overview

| Command | Description |
|---------|-------------|
| `init` | Initialize configuration |
| `fetch <uri>` | Fetch documents by codex:// URI |
| `cache list` | List cached documents |
| `cache clear` | Clear cache entries |
| `cache stats` | Show cache statistics |
| `sync project` | Sync single project |
| `sync org` | Sync entire organization |
| `types list` | List artifact types |
| `types add` | Add custom type |
| `health` | Run diagnostics |
| `migrate` | Migrate v2.x config to v3.0 |

## Documentation

**Full documentation**: [docs/cli/](../docs/cli/)

- [Commands Reference](../docs/cli/#commands-reference)
- [Integration Patterns](../docs/cli/#integration-patterns)
- [Troubleshooting](../docs/cli/#troubleshooting)
- [Configuration Guide](../docs/configuration.md)

## Configuration

Uses `.fractary/config.yaml`:

```yaml
organization: myorg
cacheDir: .fractary/codex/cache

storage:
  - type: github
    token: ${GITHUB_TOKEN}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub access token |
| `CODEX_CACHE_DIR` | Override cache directory |
| `CODEX_ORG` | Override organization |

## Development

```bash
# Build
npm run build

# Test
npm test

# Type check
npm run typecheck

# Link for local testing
npm link
```

## License

MIT

## See Also

- [SDK Package](../sdk/js/) - Core JavaScript SDK
- [MCP Server](../mcp/server/) - AI agent integration
- [Documentation](../docs/) - Full documentation

# Fractary Codex Documentation

Knowledge infrastructure for AI agents - enabling universal document references, intelligent caching, and cross-project knowledge sharing.

## Quick Links

| Component | Description | Documentation |
|-----------|-------------|---------------|
| **JavaScript/TypeScript SDK** | Core SDK for Node.js applications | [docs/sdk/js/](./sdk/js/) |
| **Python SDK** | Core SDK for Python applications | [docs/sdk/py/](./sdk/py/) |
| **CLI** | Command-line interface | [docs/cli/](./cli/) |
| **MCP Server** | Model Context Protocol server for AI agents | [docs/mcp-server/](./mcp-server/) |
| **Claude Code Plugin** | Plugin for Claude Code integration | [docs/plugins/](./plugins/) |

## Cross-Cutting Guides

- [Configuration Guide](./configuration.md) - Universal configuration reference for all components

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Access Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Claude Code │  │    CLI      │  │    MCP Server       │  │
│  │   Plugin    │  │             │  │ (AI Agent Access)   │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
├─────────┴────────────────┴─────────────────────┴────────────┤
│                    SDK Layer                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                @fractary/codex (JS/TS)                │   │
│  │                fractary-codex (Python)                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Core Features:                                             │
│  ├─ Universal References (codex:// URIs)                    │
│  ├─ Multi-Provider Storage (Local, GitHub, HTTP, S3)        │
│  ├─ Intelligent Caching (Memory + Disk)                     │
│  ├─ File Synchronization                                    │
│  └─ Permission System                                       │
└─────────────────────────────────────────────────────────────┘
```

## Getting Started

### For SDK Users

1. **Install the SDK**:
   ```bash
   # JavaScript/TypeScript
   npm install @fractary/codex

   # Python
   pip install fractary-codex
   ```

2. **Create configuration**: See [Configuration Guide](./configuration.md)

3. **Start using codex:// URIs**:
   ```typescript
   import { parseReference, CacheManager } from '@fractary/codex'

   const cache = CacheManager.create()
   const content = await cache.get('codex://myorg/myproject/docs/api.md')
   ```

### For AI Agent Integration

1. **Install the MCP Server**:
   ```bash
   npm install -g @fractary/codex-mcp-server
   ```

2. **Configure Claude Code**: Add to `.claude/settings.json`:
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

3. **Reference documents in conversations**:
   ```
   Can you explain the API in codex://myorg/project/docs/api.md?
   ```

### For CLI Users

1. **Install the CLI**:
   ```bash
   npm install -g @fractary/codex-cli
   ```

2. **Initialize your project**:
   ```bash
   fractary-codex init
   ```

3. **Fetch documents**:
   ```bash
   fractary-codex fetch codex://myorg/project/docs/api.md
   ```

## URI Format

Codex uses a universal URI scheme for document references:

```
codex://org/project/path/to/file.md
       └─┬─┘└──┬──┘└──────┬───────┘
         │     │          └─ File path within project
         │     └─ Project/repository name
         └─ Organization name
```

**Examples**:
- `codex://fractary/codex/docs/api.md` - Documentation from this project
- `codex://fractary/auth-service/specs/oauth.md` - Spec from another project
- `codex://partner-org/shared/standards/api-design.md` - Cross-org reference

## Additional Resources

### Examples

See the [examples/](./examples/) directory for:
- CLI usage patterns
- SDK integration examples
- MCP server configuration

### Specifications

See the [specs/](./specs/) directory for:
- Technical specifications
- Architecture decisions
- Protocol documentation

## Support

- **GitHub Issues**: [github.com/fractary/codex/issues](https://github.com/fractary/codex/issues)
- **Documentation**: You're reading it!

## License

MIT - see [LICENSE](../LICENSE)

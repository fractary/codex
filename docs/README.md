# Fractary Codex Documentation

Knowledge infrastructure for AI agents - universal document references, intelligent caching, and cross-project knowledge sharing.

## Components

| Component | Description | Documentation |
|-----------|-------------|---------------|
| **JavaScript/TypeScript SDK** | Core SDK for Node.js | [SDK Reference](./sdk/js/) |
| **CLI** | Command-line interface | [CLI Reference](./cli/) |
| **MCP Server** | Model Context Protocol server for AI agents | [MCP Server Reference](./mcp-server/) |
| **Claude Code Plugin** | Plugin for Claude Code integration | [Plugin Reference](./plugins/) |

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Access Layer                         │
│  ┌──────────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │ Claude Code  │  │   CLI    │  │    MCP Server      │ │
│  │   Plugin     │  │          │  │  (AI Agent Access)  │ │
│  └──────┬───────┘  └────┬─────┘  └─────────┬──────────┘ │
├─────────┴───────────────┴───────────────────┴────────────┤
│                      SDK Layer                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │              @fractary/codex (JS/TS)                │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  Core Features:                                          │
│  ├─ Universal References (codex:// URIs)                 │
│  ├─ Multi-Provider Storage (Local, GitHub, HTTP)         │
│  ├─ Intelligent Caching (Memory + Disk)                  │
│  ├─ File Synchronization                                 │
│  └─ Permission System                                    │
└──────────────────────────────────────────────────────────┘
```

## Getting Started

### For CLI Users

```bash
npm install -g @fractary/codex-cli

# Initialize (requires .fractary/config.yaml from @fractary/core)
fractary-codex config-init

# Fetch a document
fractary-codex document-fetch codex://myorg/project/docs/api.md

# Sync with codex repository
fractary-codex sync --dry-run
```

### For SDK Users

```bash
npm install @fractary/codex
```

```typescript
import { CodexClient } from '@fractary/codex'

const client = await CodexClient.create()
const result = await client.fetch('codex://myorg/project/docs/api.md')
console.log(result.content.toString())
```

### For AI Agent Integration

Add to `.mcp.json`:

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

### For Claude Code Plugin Users

```
/fractary-codex:config-init
```

Then use `codex://` URIs in conversations - the MCP server handles fetching automatically.

## URI Format

```
codex://org/project/path/to/file.md
       └─┬─┘└──┬──┘└──────┬───────┘
         │     │          └─ File path within project
         │     └─ Project/repository name
         └─ Organization name
```

## Cross-Cutting Guides

- [Configuration Guide](./configuration.md) - Configuration reference for all components

## Additional Resources

- [Technical Specifications](./specs/) - Architecture and design specifications

## License

MIT - see [LICENSE](../LICENSE)

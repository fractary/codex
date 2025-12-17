# Fractary Codex

Core SDK for Fractary Codex - knowledge infrastructure for AI agents.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

The Codex SDK provides foundational infrastructure for managing organizational knowledge across AI agents and projects. It implements a universal reference system (`codex://` URIs), multi-provider storage, intelligent caching, and file synchronization.

### Key Features

- **Universal References**: `codex://` URI scheme for cross-project knowledge references
- **Multi-Provider Storage**: Local filesystem, GitHub, and HTTP storage backends
- **Intelligent Caching**: Multi-tier caching (L1 memory, L2 disk, L3 network) with LRU eviction
- **File Synchronization**: Bidirectional sync with conflict detection
- **Permission System**: Fine-grained access control (none/read/write/admin)
- **Type-Safe**: Full TypeScript and Python type support

## SDKs

This monorepo contains SDK implementations for multiple languages:

| Language | Package | Status | Install |
|----------|---------|--------|---------|
| **JavaScript/TypeScript** | [`@fractary/codex`](./sdk/js/) | [![npm](https://img.shields.io/npm/v/@fractary/codex.svg)](https://www.npmjs.com/package/@fractary/codex) | `npm install @fractary/codex` |
| **Python** | [`fractary-codex`](./sdk/py/) | In Development | `pip install fractary-codex` |

## CLI

A command-line interface is available for codex operations:

| Tool | Package | Status | Install |
|------|---------|--------|---------|
| **Codex CLI** | [`@fractary/codex-cli`](./cli/) | Ready | `npm install -g @fractary/codex-cli` |

**Quick example:**
```bash
# Initialize codex in your project
fractary-codex init

# Fetch a document
fractary-codex fetch codex://myorg/docs/api-guide.md

# Manage cache
fractary-codex cache list
fractary-codex cache clear --all

# Run diagnostics
fractary-codex health
```

See the [CLI documentation](./cli/README.md) for full command reference.

## MCP Server

A standalone Model Context Protocol server for AI agent integration:

| Tool | Package | Status | Install |
|------|---------|--------|---------|
| **MCP Server** | [`@fractary/codex-mcp-server`](./mcp/server/) | Ready | `npx @fractary/codex-mcp-server` |

**Quick example:**
```bash
# Run MCP server with stdio transport (default)
npx @fractary/codex-mcp-server --config .fractary/codex.yaml

# Run MCP server with HTTP transport
npx @fractary/codex-mcp-server --port 3000 --config .fractary/codex.yaml
```

**Claude Code integration:**
Add to `.claude/settings.json`:
```json
{
  "mcpServers": {
    "fractary-codex": {
      "command": "npx",
      "args": ["-y", "@fractary/codex-mcp-server", "--config", ".fractary/codex.yaml"]
    }
  }
}
```

See the [MCP Server documentation](./mcp/server/README.md) for full reference.

## Quick Start

### JavaScript/TypeScript

```typescript
import { parseReference, CacheManager } from '@fractary/codex'

// Parse a codex URI
const ref = parseReference('codex://myorg/docs/api-guide.md')

// Fetch with caching
const cache = CacheManager.create({ cacheDir: '.codex-cache' })
const content = await cache.get('codex://myorg/docs/api-guide.md')
```

### Python

```python
import asyncio
from fractary_codex import CodexClient

async def main():
    client = CodexClient()
    doc = await client.fetch("codex://myorg/docs/api-guide.md")
    print(doc.content)

asyncio.run(main())
```

## Project Structure

```
codex/
├── sdk/
│   ├── js/                 # JavaScript/TypeScript SDK
│   │   ├── src/            # TypeScript source
│   │   ├── tests/          # Test suite
│   │   └── package.json    # npm configuration
│   └── py/                 # Python SDK
│       ├── fractary_codex/ # Python package
│       ├── tests/          # Test suite
│       └── pyproject.toml  # PyPI configuration
├── cli/                    # Command-line interface
│   ├── src/                # CLI source
│   └── package.json        # npm configuration
├── mcp/
│   └── server/             # MCP server (standalone)
│       ├── src/            # Server source
│       └── package.json    # npm configuration
├── docs/                   # Shared documentation
├── specs/                  # Feature specifications
└── README.md               # This file
```

## Documentation

### Getting Started

- [JavaScript SDK](./sdk/js/README.md) - Installation and quick start for JS/TS
- [Python SDK](./sdk/py/README.md) - Installation and quick start for Python

### Guides

- [CLI Integration Guide](./docs/guides/cli-integration.md) - How to integrate Codex into CLI applications
- [API Reference](./docs/guides/api-reference.md) - Comprehensive API documentation
- [Configuration Guide](./docs/guides/configuration.md) - Complete configuration reference
- [Troubleshooting Guide](./docs/guides/troubleshooting.md) - Common issues and solutions

### Examples

- [Usage Examples](./docs/examples/) - Real-world integration patterns and code samples

### Technical Specifications

- [Specification Documents](./docs/specs/) - Detailed technical specifications

## Development

### JavaScript SDK

```bash
cd sdk/js
npm install
npm run build
npm test
```

### Python SDK

```bash
cd sdk/py
pip install -e ".[dev]"
pytest
mypy fractary_codex
```

## Related Projects

- **forge-bundle-codex-github-core** - GitHub Actions workflows for codex sync
- **forge-bundle-codex-claude-agents** - Claude Code agents for codex management

## License

MIT © Fractary Engineering

## Contributing

For issues or contributions, please visit the [GitHub repository](https://github.com/fractary/codex).

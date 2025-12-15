# Fractary Codex

Core SDK for Fractary Codex - knowledge infrastructure for AI agents.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

The Codex SDK provides foundational infrastructure for managing organizational knowledge across AI agents and projects. It implements a universal reference system (`codex://` URIs), multi-provider storage, intelligent caching, file synchronization, and MCP (Model Context Protocol) integration.

### Key Features

- **Universal References**: `codex://` URI scheme for cross-project knowledge references
- **Multi-Provider Storage**: Local filesystem, GitHub, and HTTP storage backends
- **Intelligent Caching**: Multi-tier caching (L1 memory, L2 disk, L3 network) with LRU eviction
- **File Synchronization**: Bidirectional sync with conflict detection
- **MCP Integration**: Model Context Protocol server for AI agent integration
- **Permission System**: Fine-grained access control (none/read/write/admin)
- **Type-Safe**: Full TypeScript and Python type support

## SDKs

This monorepo contains SDK implementations for multiple languages:

| Language | Package | Status | Install |
|----------|---------|--------|---------|
| **JavaScript/TypeScript** | [`@fractary/codex`](./packages/js/) | [![npm](https://img.shields.io/npm/v/@fractary/codex.svg)](https://www.npmjs.com/package/@fractary/codex) | `npm install @fractary/codex` |
| **Python** | [`fractary-codex`](./packages/python/) | In Development | `pip install fractary-codex` |

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
├── packages/
│   ├── js/                 # JavaScript/TypeScript SDK
│   │   ├── src/            # TypeScript source
│   │   ├── tests/          # Test suite
│   │   └── package.json    # npm configuration
│   └── python/             # Python SDK
│       ├── fractary_codex/ # Python package
│       ├── tests/          # Test suite
│       └── pyproject.toml  # PyPI configuration
├── docs/                   # Shared documentation
├── specs/                  # Feature specifications
└── README.md               # This file
```

## Documentation

### Getting Started

- [JavaScript SDK](./packages/js/README.md) - Installation and quick start for JS/TS
- [Python SDK](./packages/python/README.md) - Installation and quick start for Python

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
cd packages/js
npm install
npm run build
npm test
```

### Python SDK

```bash
cd packages/python
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

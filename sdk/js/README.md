# @fractary/codex

JavaScript/TypeScript SDK for Fractary Codex - knowledge infrastructure for AI agents.

[![npm version](https://img.shields.io/npm/v/@fractary/codex.svg)](https://www.npmjs.com/package/@fractary/codex)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install @fractary/codex
```

## Features

- **Universal References**: `codex://` URI scheme for cross-project knowledge references
- **Multi-Provider Storage**: Local filesystem, GitHub, HTTP, and S3 storage backends
- **Intelligent Caching**: Multi-tier caching with LRU eviction
- **File Synchronization**: Bidirectional sync with conflict detection
- **MCP Integration**: Model Context Protocol server for AI agents
- **Permission System**: Fine-grained access control
- **Type-Safe**: Full TypeScript support

## Quick Start

```typescript
import { parseReference, CacheManager, StorageManager } from '@fractary/codex'

// Parse a codex URI
const ref = parseReference('codex://myorg/docs/api-guide.md')

// Create managers
const storage = StorageManager.create()
const cache = CacheManager.create({ cacheDir: '.fractary/codex/cache' })
cache.setStorageManager(storage)

// Fetch content with caching
const content = await cache.get('codex://myorg/docs/api-guide.md')
```

## Documentation

**Full documentation**: [docs/sdk/js/](../../docs/sdk/js/)

- [API Reference](../../docs/sdk/js/#api-reference)
- [Authentication](../../docs/sdk/js/#authentication)
- [Troubleshooting](../../docs/sdk/js/#troubleshooting)
- [Configuration Guide](../../docs/configuration.md)

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

## Publishing

```bash
# Build and test
npm run build && npm test

# Bump version
npm version patch  # or minor/major

# Push with tags
git push && git push --tags

# Publish
npm publish
```

## License

MIT - see [LICENSE](LICENSE)

## See Also

- [Python SDK](../py/) - `fractary-codex` on PyPI
- [CLI](../../cli/) - Command-line interface
- [MCP Server](../../mcp/server/) - AI agent integration

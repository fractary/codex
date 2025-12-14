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
- **Multi-Provider Storage**: Local filesystem, GitHub, and HTTP storage backends
- **Intelligent Caching**: Multi-tier caching (L1 memory, L2 disk, L3 network) with LRU eviction
- **File Synchronization**: Bidirectional sync with conflict detection
- **MCP Integration**: Model Context Protocol server for AI agent integration
- **Permission System**: Fine-grained access control (none/read/write/admin)
- **Migration Tools**: Upgrade from v2.x to v3.0 configuration format
- **Type-Safe**: Full TypeScript support with strict typing

## Quick Start

```typescript
import {
  parseReference,
  resolveReference,
  CacheManager,
  StorageManager,
  createMcpServer
} from '@fractary/codex'

// Parse a codex URI
const ref = parseReference('codex://myorg/docs/api-guide.md')
console.log(ref.org)      // 'myorg'
console.log(ref.path)     // 'docs/api-guide.md'

// Create storage and cache managers
const storage = StorageManager.create()
const cache = CacheManager.create({ cacheDir: '.codex-cache' })

// Fetch content with caching
const content = await cache.get('codex://myorg/docs/api-guide.md')
```

## Core Modules

### References

```typescript
import { parseReference, buildUri, validateUri } from '@fractary/codex'

const ref = parseReference('codex://fractary/codex/docs/api.md')
const uri = buildUri('fractary', 'codex', 'docs/api.md')
const isValid = validateUri('codex://org/project/path.md')
```

### Storage

```typescript
import { StorageManager } from '@fractary/codex'

const storage = StorageManager.create({
  providers: [
    { type: 'local', basePath: './knowledge' },
    { type: 'github', token: process.env.GITHUB_TOKEN },
    { type: 'http', baseUrl: 'https://codex.example.com' }
  ]
})

const result = await storage.fetch('codex://org/project/file.md')
```

### Cache

```typescript
import { createCacheManager } from '@fractary/codex'

const cache = createCacheManager({
  cacheDir: '.codex-cache',
  maxMemorySize: 50 * 1024 * 1024,
  defaultTtl: 3600
})

const entry = await cache.get('codex://org/project/file.md')
```

### MCP Server

```typescript
import { createMcpServer } from '@fractary/codex'

const server = createMcpServer({
  name: 'codex',
  version: '1.0.0',
  cacheDir: '.codex-cache'
})

await server.start()
```

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run typecheck

# Lint
npm run lint

# Format code
npm run format
```

## Publishing to npm

### Prerequisites

1. **npm Account**: Create an account on [npmjs.com](https://www.npmjs.com)
2. **npm Login**: Run `npm login` to authenticate
3. **Organization Access**: Ensure you have publish access to `@fractary` scope

### Manual Publishing

```bash
# Build and test
npm run build
npm test

# Check what will be published
npm pack --dry-run

# Publish to npm (the prepublishOnly script runs build & test automatically)
npm publish

# For first publish or after scope changes
npm publish --access public
```

### Automated Publishing (CI/CD)

For automated publishing via GitHub Actions:

1. **npm Token**: Generate an Automation token on npmjs.com
2. **GitHub Secret**: Add `NPM_TOKEN` to repository secrets
3. **Workflow**: Create `.github/workflows/npm-publish.yml`:

```yaml
name: Publish to npm
on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Version Management

```bash
# Bump patch version (0.1.2 -> 0.1.3)
npm version patch

# Bump minor version (0.1.2 -> 0.2.0)
npm version minor

# Bump major version (0.1.2 -> 1.0.0)
npm version major

# This automatically:
# - Updates package.json version
# - Creates a git commit
# - Creates a git tag
```

To publish a new version:

```bash
# 1. Ensure all changes are committed
# 2. Bump version
npm version patch  # or minor/major

# 3. Push with tags
git push && git push --tags

# 4. Publish to npm
npm publish
```

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking API changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

## License

MIT - see [LICENSE](LICENSE)

## See Also

- [Python SDK](../python/) - `fractary-codex` on PyPI
- [Documentation](../../docs/)

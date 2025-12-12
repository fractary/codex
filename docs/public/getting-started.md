---
title: Getting Started with Codex SDK
description: Install and start using the Codex SDK in your projects
visibility: public
codex_sync_include: []
codex_sync_exclude: []
codex_sync_custom: [developers.fractary.com:src/content/docs/codex/]
tags: [codex, sdk, getting-started, tutorial]
---

# Getting Started

This guide will help you install and start using the Codex SDK in your projects.

## Installation

Install the SDK using npm:

```bash
npm install @fractary/codex
```

Or using yarn:

```bash
yarn add @fractary/codex
```

## Quick Start

Here's a simple example that demonstrates the core functionality:

```typescript
import {
  parseMetadata,
  shouldSyncToRepo,
  loadConfig
} from '@fractary/codex'

// 1. Load configuration
const config = loadConfig({
  organizationSlug: 'myorg'
})

// 2. Parse frontmatter from a markdown file
const markdown = `---
codex_sync_include: ['api-*', 'core-*']
codex_sync_exclude: ['*-test']
---

# API Documentation
`

const { metadata, content } = parseMetadata(markdown)

// 3. Check if file should sync to a repository
const shouldSync = shouldSyncToRepo({
  filePath: 'docs/api-guide.md',
  fileMetadata: metadata,
  targetRepo: 'api-gateway',
  sourceRepo: 'codex.myorg.com',
  rules: config.rules
})

console.log(`Should sync to api-gateway: ${shouldSync}`) // true
```

## Understanding Metadata

The Codex system uses YAML frontmatter to define how files are distributed:

### Basic Frontmatter

```yaml
---
codex_sync_include: ['api-*', 'core-*']
codex_sync_exclude: ['*-test', '*-dev']
---
```

- **`codex_sync_include`**: Array of glob patterns for repos that should receive this file
- **`codex_sync_exclude`**: Array of glob patterns for repos to exclude
- **`codex_sync_custom`**: Array of custom destinations in format `repo:path` for publishing to external sites

### Pattern Matching

Patterns use glob syntax:

- `api-*` - Matches any repo starting with `api-`
- `*-test` - Matches any repo ending with `-test`
- `*` - Matches all repositories
- `api-gateway` - Exact match only

### Example Patterns

| Pattern | Matches | Doesn't Match |
|---------|---------|---------------|
| `api-*` | `api-gateway`, `api-auth` | `web-api`, `core-api` |
| `*-test` | `api-test`, `core-test` | `test-api`, `production` |
| `core-*` | `core-db`, `core-utils` | `api-core`, `core` |
| `[*]` | Everything | Nothing |

## Your First Sync Rule

Let's create a document that syncs to all API repositories:

```markdown
---
title: API Design Standards
codex_sync_include: ['api-*']
codex_sync_exclude: ['*-test', '*-sandbox']
visibility: internal
tags: [api, standards, design]
---

# API Design Standards

All API services should follow these standards...
```

This document will:
- ✅ Sync to: `api-gateway`, `api-auth`, `api-payments`
- ❌ Skip: `api-test`, `api-sandbox`, `web-app`

### Publishing to External Sites

You can also publish documentation to external sites using `codex_sync_custom`:

```markdown
---
title: API Reference
codex_sync_include: ['api-*']
codex_sync_custom: ['developers.fractary.com:src/content/docs/api/']
visibility: public
---

# API Reference

Public API documentation...
```

This will:
- ✅ Sync to all `api-*` repositories (internal)
- ✅ Publish to `developers.fractary.com` at `src/content/docs/api/` (external)

See [Examples](./examples.md#example-2-custom-sync-destinations) for detailed usage.

## Using with CLI

If you're using the `fractary` CLI, you can work with Codex directly from the command line:

```bash
# Parse and validate frontmatter
fractary codex parse docs/api-guide.md

# Check which repos would receive a file
fractary codex targets docs/api-guide.md

# Validate configuration
fractary codex config validate
```

See [CLI Usage](./cli-usage.md) for complete CLI documentation.

## Common Workflows

### Workflow 1: Parse Frontmatter

```typescript
import { parseMetadata } from '@fractary/codex'
import { readFile } from 'fs/promises'

const content = await readFile('docs/api-guide.md', 'utf-8')
const result = parseMetadata(content)

console.log(result.metadata.codex_sync_include)
console.log(result.metadata.codex_sync_exclude)
console.log(result.content) // Content without frontmatter
```

### Workflow 2: Check Pattern Match

```typescript
import { matchPattern } from '@fractary/codex'

const repo = 'api-gateway'

if (matchPattern('api-*', repo)) {
  console.log('This is an API repository')
}
```

### Workflow 3: Determine Sync Targets

```typescript
import { getTargetRepos } from '@fractary/codex'

const targets = getTargetRepos({
  filePath: 'docs/api-guide.md',
  fileMetadata: metadata,
  sourceRepo: 'codex.myorg.com',
  allRepos: [
    'api-gateway',
    'api-auth',
    'api-test',
    'web-app',
    'core-db'
  ]
})

console.log('File will sync to:', targets)
// ['api-gateway', 'api-auth']
```

### Workflow 4: Load Configuration

```typescript
import { loadConfig, resolveOrganization } from '@fractary/codex'

// Auto-detect organization from repo name
const org = resolveOrganization({
  repoName: 'codex.myorg.com'
})

// Load configuration
const config = loadConfig({
  organizationSlug: org
})

console.log(config.directories)
// { source: '.myorg', target: '.myorg', systems: '.myorg/systems' }
```

## Configuration Basics

The SDK supports multiple configuration sources:

### 1. Programmatic

```typescript
const config = loadConfig({
  organizationSlug: 'myorg'
})
```

### 2. Environment Variables

```bash
export ORGANIZATION_SLUG=myorg
export CODEX_SOURCE_DIR=.myorg
```

```typescript
const config = loadConfig() // Auto-loads from env
```

### 3. Auto-Detection

```typescript
// Automatically extracts "myorg" from "codex.myorg.com"
const config = loadConfig({
  repoName: 'codex.myorg.com'
})
```

See [Configuration](./configuration.md) for complete configuration documentation.

## TypeScript Support

The SDK is written in TypeScript and exports all types:

```typescript
import type {
  Metadata,
  CodexConfig,
  SyncRules,
  ParseResult
} from '@fractary/codex'

const metadata: Metadata = {
  codex_sync_include: ['api-*'],
  codex_sync_exclude: ['*-test'],
  visibility: 'internal'
}
```

## Error Handling

The SDK throws typed errors for invalid operations:

```typescript
import {
  parseMetadata,
  ValidationError,
  ConfigurationError
} from '@fractary/codex'

try {
  const result = parseMetadata(invalidContent)
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid frontmatter:', error.message)
  } else if (error instanceof ConfigurationError) {
    console.error('Configuration error:', error.message)
  }
}
```

## Next Steps

Now that you've learned the basics, explore:

- **[API Reference](./api-reference.md)** - Complete API documentation
- **[Configuration](./configuration.md)** - Advanced configuration options
- **[Examples](./examples.md)** - Real-world examples
- **[CLI Usage](./cli-usage.md)** - Command-line interface

## Need Help?

- **Issues**: [Report bugs or request features](https://github.com/fractary/codex/issues)
- **Examples**: Check the [examples directory](https://github.com/fractary/codex/tree/main/examples)
- **NPM**: [@fractary/codex](https://www.npmjs.com/package/@fractary/codex)

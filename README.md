# @fractary/codex

Core SDK for Fractary Codex - a centralized knowledge management and distribution platform for organizations.

[![npm version](https://img.shields.io/npm/v/@fractary/codex.svg)](https://www.npmjs.com/package/@fractary/codex)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

The Codex SDK provides the foundational business logic for the Fractary Codex system, which enables organizations to maintain a single source of truth for documentation, AI tools, and organizational knowledge across all projects.

### Key Features

- **Metadata Parsing**: Extract and validate YAML frontmatter from markdown files
- **Pattern Matching**: Glob-based pattern matching for intelligent file routing
- **Smart Routing**: Determine which files should sync to which repositories
- **Configuration Management**: Multi-source configuration with sensible defaults
- **Organization-Agnostic**: Works for any organization, not just Fractary
- **Type-Safe**: Full TypeScript support with strict typing
- **Well-Tested**: Comprehensive unit test coverage

## Installation

```bash
npm install @fractary/codex
```

## Quick Start

```typescript
import {
  parseMetadata,
  shouldSyncToRepo,
  loadConfig
} from '@fractary/codex'

// 1. Load configuration
const config = loadConfig({
  organizationSlug: 'fractary'
})

// 2. Parse frontmatter from a markdown file
const fileContent = await readFile('docs/api-guide.md', 'utf-8')
const { metadata, content } = parseMetadata(fileContent)

// 3. Determine if file should sync to a target repository
const shouldSync = shouldSyncToRepo({
  filePath: 'docs/api-guide.md',
  fileMetadata: metadata,
  targetRepo: 'api-gateway',
  sourceRepo: 'codex.fractary.com',
  rules: config.rules
})

console.log(`Sync to api-gateway: ${shouldSync}`)
```

## Core Concepts

### Metadata Parsing

The SDK parses YAML frontmatter from markdown files to extract sync rules and metadata:

```yaml
---
org: fractary
system: api-gateway
codex_sync_include: ['api-*', 'core-*']
codex_sync_exclude: ['*-test', '*-dev']
visibility: internal
tags: [api, rest]
---

# API Documentation
```

```typescript
import { parseMetadata } from '@fractary/codex'

const result = parseMetadata(markdown)
console.log(result.metadata.codex_sync_include) // ['api-*', 'core-*']
```

### Pattern Matching

Glob patterns determine which repositories receive which files:

```typescript
import { matchPattern, matchAnyPattern } from '@fractary/codex'

// Single pattern
matchPattern('api-*', 'api-gateway')  // true
matchPattern('api-*', 'web-app')      // false

// Multiple patterns
matchAnyPattern(['api-*', 'core-*'], 'api-gateway')  // true
matchAnyPattern(['api-*', 'core-*'], 'web-app')      // false

// Special: match all
matchAnyPattern(['*'], 'anything')  // true
```

### Sync Routing

Determine which repositories should receive a file based on frontmatter rules:

```typescript
import { shouldSyncToRepo } from '@fractary/codex'

const shouldSync = shouldSyncToRepo({
  filePath: 'docs/api-guide.md',
  fileMetadata: {
    codex_sync_include: ['api-*', 'core-*'],
    codex_sync_exclude: ['*-test']
  },
  targetRepo: 'api-gateway',
  sourceRepo: 'codex.fractary.com'
})

// Returns: true (matches 'api-*' and not excluded)
```

### Configuration

The SDK supports multi-source configuration:

```typescript
import { loadConfig, resolveOrganization } from '@fractary/codex'

// Auto-detect organization from repo name
const org = resolveOrganization({
  repoName: 'codex.fractary.com'
})  // Returns: 'fractary'

// Load configuration
const config = loadConfig({
  organizationSlug: 'fractary'
})

console.log(config)
/*
{
  organizationSlug: 'fractary',
  directories: {
    source: '.fractary',
    target: '.fractary',
    systems: '.fractary/systems'
  },
  rules: {
    preventSelfSync: true,
    preventCodexSync: true,
    allowProjectOverrides: true,
    autoSyncPatterns: []
  }
}
*/
```

## API Reference

### Metadata Parsing

- `parseMetadata(content, options?)` - Parse YAML frontmatter from markdown
- `hasFrontmatter(content)` - Check if content has frontmatter
- `validateMetadata(metadata)` - Validate metadata against schema
- `extractRawFrontmatter(content)` - Extract raw frontmatter string

### Pattern Matching

- `matchPattern(pattern, value)` - Match a single glob pattern
- `matchAnyPattern(patterns, value)` - Match against multiple patterns
- `filterByPatterns(patterns, values)` - Filter array by patterns
- `evaluatePatterns({ value, include, exclude })` - Evaluate include/exclude rules

### Configuration

- `loadConfig(options)` - Load configuration from all sources
- `resolveOrganization(options)` - Resolve organization slug
- `extractOrgFromRepoName(repoName)` - Extract org from repo name pattern
- `getDefaultConfig(orgSlug)` - Get default configuration

### Routing

- `shouldSyncToRepo(options)` - Determine if file should sync to repo
- `getTargetRepos(options)` - Get all repos that should receive a file

## Configuration

### Environment Variables

- `ORGANIZATION_SLUG` - Organization identifier
- `CODEX_ORG_SLUG` - Alternative organization identifier
- `CODEX_SOURCE_DIR` - Source directory (default: `.{org}`)
- `CODEX_TARGET_DIR` - Target directory (default: `.{org}`)
- `CODEX_PREVENT_SELF_SYNC` - Prevent self-sync (default: `true`)
- `CODEX_ALLOW_PROJECT_OVERRIDES` - Allow project overrides (default: `true`)

### Auto-Sync Patterns

Configure patterns that automatically sync to repositories:

```typescript
const config = loadConfig({
  organizationSlug: 'fractary'
})

config.rules.autoSyncPatterns = [
  {
    pattern: '*/docs/schema/*.json',
    include: ['*'],  // All repos
    exclude: []
  },
  {
    pattern: '*/security/**/*.md',
    include: ['*'],
    exclude: ['*-public']
  }
]
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Test with coverage
npm run test:coverage

# Type check
npm run typecheck
```

## Project Structure

```
src/
├── core/
│   ├── metadata/       # Frontmatter parsing
│   ├── patterns/       # Pattern matching
│   ├── routing/        # Sync routing logic
│   └── config/         # Configuration system
├── schemas/            # Zod schemas
├── errors/             # Error classes
└── index.ts            # Main exports

tests/
├── unit/               # Unit tests
└── fixtures/           # Test fixtures
```

## Specifications

Detailed specifications are available in `/docs/specs/`:

- [SPEC-00001: Core SDK Overview](./docs/specs/SPEC-00001-core-sdk-overview.md)
- [SPEC-00002: Metadata Parsing](./docs/specs/SPEC-00002-metadata-parsing.md)
- [SPEC-00003: Pattern Matching](./docs/specs/SPEC-00003-pattern-matching.md)
- [SPEC-00004: Routing & Distribution](./docs/specs/SPEC-00004-routing-distribution.md)
- [SPEC-00005: Configuration System](./docs/specs/SPEC-00005-configuration-system.md)

## Related Projects

- **fractary-cli** - Unified CLI for all Fractary tools (coming soon)
- **forge-bundle-codex-github-core** - GitHub Actions workflows for codex sync
- **forge-bundle-codex-claude-agents** - Claude Code agents for codex management

## License

MIT © Fractary Engineering

## Contributing

This is part of the Fractary ecosystem. For issues or contributions, please refer to the [main repository](https://github.com/fractary/codex).

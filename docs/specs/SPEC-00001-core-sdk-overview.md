# SPEC-00001: Codex Core SDK Overview

**Status**: Draft
**Created**: 2025-10-06
**Author**: Fractary Engineering
**Related Specs**: SPEC-00002, SPEC-00003, SPEC-00004, SPEC-00005

## Overview

The Codex Core SDK (`@fractary/codex`) is a TypeScript library that provides the foundational business logic for the Fractary Codex system - a centralized knowledge management and distribution platform for organizations.

### Purpose

Extract all core Codex business logic from existing GitHub Actions workflows and bash scripts into a reusable, testable, organization-agnostic TypeScript SDK that can be used by:

- `fractary-cli` - Unified CLI for all Fractary tools
- `forge-bundle-codex-github-core` - GitHub Actions workflows for codex sync
- `forge-bundle-codex-claude-agents` - Claude Code agents for codex management
- Future integrations (GitLab CI, S3 storage, MCP servers, web UIs, etc.)

### Key Principles

1. **Organization-Agnostic**: Works for any organization (Fractary, Acme Corp, etc.)
2. **Platform-Independent**: No dependencies on GitHub, GitLab, or specific CI/CD platforms
3. **Type-Safe**: Full TypeScript with strict mode enabled
4. **Testable**: Pure functions with comprehensive unit tests
5. **Configurable**: Sensible defaults with full override capabilities

## Package Information

- **Package Name**: `@fractary/codex`
- **Initial Version**: `0.1.0`
- **Registry**: npmjs.org (public)
- **License**: MIT
- **Repository**: https://github.com/fractary/codex

## High-Level Architecture

```
@fractary/codex
├── Core Modules
│   ├── Metadata Parsing     (SPEC-00002)
│   ├── Pattern Matching     (SPEC-00003)
│   ├── Routing/Distribution (SPEC-00004)
│   ├── Configuration        (SPEC-00005)
│   └── Repository Discovery
├── Schemas (Zod)
│   ├── Metadata Schema
│   ├── Config Schema
│   └── Sync Operation Schema
├── Types (TypeScript)
│   ├── Metadata Types
│   ├── Config Types
│   └── Sync Types
└── Utilities
    ├── Frontmatter Parser
    ├── Glob Matcher
    └── Error Handlers
```

## Implementation Phases

### Phase 1: Foundation & Metadata (Week 1)

**Goal**: Set up project infrastructure and implement core metadata parsing

**Deliverables**:
- TypeScript project configuration (tsconfig, build tools)
- Vitest testing framework setup
- Frontmatter parser implementation (SPEC-00002)
- Metadata Zod schemas
- Pattern matching engine (SPEC-00003)
- Unit tests (70%+ coverage)

**Success Criteria**:
- ✅ Can parse YAML frontmatter from markdown files
- ✅ Can validate metadata against schemas
- ✅ Can match glob patterns against strings
- ✅ All tests passing

### Phase 2: Routing & Configuration (Week 2)

**Goal**: Implement sync rule evaluation and configuration system

**Deliverables**:
- Routing evaluator (SPEC-00004)
- Configuration loader (SPEC-00005)
- Repository discovery logic
- Sync rule evaluation engine
- Unit tests for routing logic

**Success Criteria**:
- ✅ Can determine if file should sync to target repo
- ✅ Can load org-wide and project-specific configs
- ✅ Can auto-discover organization from repo name
- ✅ All tests passing

### Phase 3: Documentation & Release (Week 3)

**Goal**: Document API and publish to npm

**Deliverables**:
- README with usage examples
- API documentation for all public interfaces
- Migration guide from bash scripts
- Published `@fractary/codex@0.1.0` to npm
- GitHub release with changelog

**Success Criteria**:
- ✅ Published to npm successfully
- ✅ Documentation complete and accurate
- ✅ At least one bundle (github-core or claude-agents) uses SDK
- ✅ Zero critical bugs

## Repository Structure

```
/mnt/c/GitHub/fractary/codex/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── tsup.config.ts                  # Build configuration
├── .npmignore
├── src/
│   ├── index.ts                    # Main exports
│   ├── core/
│   │   ├── metadata/               # See SPEC-00002
│   │   │   ├── parser.ts
│   │   │   ├── validator.ts
│   │   │   └── index.ts
│   │   ├── patterns/               # See SPEC-00003
│   │   │   ├── matcher.ts
│   │   │   ├── resolver.ts
│   │   │   └── index.ts
│   │   ├── discovery/
│   │   │   ├── repository.ts
│   │   │   ├── organization.ts
│   │   │   └── index.ts
│   │   ├── routing/                # See SPEC-00004
│   │   │   ├── evaluator.ts
│   │   │   ├── distributor.ts
│   │   │   └── index.ts
│   │   └── config/                 # See SPEC-00005
│   │       ├── loader.ts
│   │       ├── resolver.ts
│   │       └── index.ts
│   ├── schemas/
│   │   ├── metadata.ts
│   │   ├── config.ts
│   │   ├── sync.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── metadata.ts
│   │   ├── config.ts
│   │   ├── sync.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── frontmatter.ts
│   │   ├── glob.ts
│   │   └── errors.ts
│   └── errors/
│       ├── CodexError.ts
│       ├── ConfigurationError.ts
│       ├── ValidationError.ts
│       └── index.ts
├── tests/
│   ├── unit/
│   │   ├── metadata/
│   │   ├── patterns/
│   │   ├── discovery/
│   │   └── routing/
│   └── fixtures/
│       └── sample-frontmatter.md
├── docs/
│   ├── README.md
│   ├── specs/                      # This directory
│   │   ├── SPEC-00001-core-sdk-overview.md
│   │   ├── SPEC-00002-metadata-parsing.md
│   │   ├── SPEC-00003-pattern-matching.md
│   │   ├── SPEC-00004-routing-distribution.md
│   │   └── SPEC-00005-configuration-system.md
│   └── api/
│       ├── metadata.md
│       ├── patterns.md
│       ├── routing.md
│       └── configuration.md
└── examples/
    ├── basic-usage.ts
    ├── custom-config.ts
    └── pattern-matching.ts
```

## Dependencies

### Production Dependencies
- `zod` - Schema validation
- `js-yaml` - YAML parsing
- `micromatch` - Glob pattern matching

### Development Dependencies
- `typescript` - TypeScript compiler
- `vitest` - Testing framework
- `tsup` - Build tool
- `@types/js-yaml` - TypeScript types
- `@types/micromatch` - TypeScript types

## API Design Principles

### 1. Explicit Over Implicit
```typescript
// Good: Explicit configuration
const result = shouldSyncToRepo({
  filePath: 'docs/api.md',
  fileMetadata: metadata,
  targetRepo: 'api-gateway',
  sourceRepo: 'codex.fractary.com',
  rules: config.rules
})

// Avoid: Magic global state
const result = shouldSync('docs/api.md', 'api-gateway')
```

### 2. Errors for Missing Required Config
```typescript
// Throws ConfigurationError if org slug cannot be determined
const org = resolveOrganization({ repoName: 'my-repo' })

// Returns false for non-matches (not an error)
const matches = matchPattern('api-*', 'web-app')  // false
```

### 3. Composable Functions
```typescript
// Each function does one thing well
const content = await readFile('docs/api.md', 'utf-8')
const metadata = parseMetadata(content)
const validated = validateMetadata(metadata)
const shouldSync = evaluateSyncRules(validated, targetRepo, rules)
```

## Example Usage

```typescript
import {
  parseMetadata,
  shouldSyncToRepo,
  resolveOrganization,
  loadConfig
} from '@fractary/codex'

// 1. Auto-discover organization from repo name
const org = resolveOrganization({
  repoName: 'codex.fractary.com',
  autoDetect: true
})
// Returns: "fractary"

// 2. Load configuration
const config = loadConfig({
  organizationSlug: org,
  configPath: '.codex/config.json'  // Optional
})

// 3. Parse file metadata
const fileContent = await readFile('docs/api-guide.md', 'utf-8')
const metadata = parseMetadata(fileContent)

// 4. Evaluate sync rules
const shouldSync = shouldSyncToRepo({
  filePath: 'docs/api-guide.md',
  fileMetadata: metadata,
  targetRepo: 'api-gateway',
  sourceRepo: 'codex.fractary.com',
  rules: config.rules
})

console.log(`Sync to api-gateway: ${shouldSync}`)
```

## Migration Strategy

### For Existing Bundles

The SDK will be adopted incrementally:

**Phase 1**: Publish SDK, no bundle changes
**Phase 2**: Update bash scripts to call SDK functions
**Phase 3**: Fully refactor bundles to use SDK

Example migration:

```yaml
# Before: Bash script (200 lines)
- name: Parse frontmatter and evaluate
  run: |
    get_frontmatter_value() { ... }
    should_sync_to_repo() { ... }
    # ... 180 more lines

# After: SDK call (5 lines)
- name: Parse frontmatter and evaluate
  run: |
    npm install -g @fractary/codex
    SHOULD_SYNC=$(node -e "
      const {parseMetadata, shouldSyncToRepo} = require('@fractary/codex');
      // ... logic
    ")
```

## Success Metrics

### Phase 1 (Foundation)
- [ ] TypeScript builds without errors
- [ ] All unit tests pass (70%+ coverage)
- [ ] Can parse frontmatter from existing codex files
- [ ] Pattern matching works with existing patterns

### Phase 2 (Routing)
- [ ] Routing logic matches existing workflow behavior
- [ ] Configuration system handles all use cases
- [ ] Auto-discovery works for fractary repos

### Phase 3 (Release)
- [ ] Published to npm successfully
- [ ] Documentation complete
- [ ] At least one bundle integrated
- [ ] Zero critical bugs reported

## Non-Goals (Out of Scope)

The following are explicitly **NOT** part of this SDK:

- ❌ Git operations (cloning, committing, pushing)
- ❌ GitHub API interactions
- ❌ File system I/O (reading/writing files)
- ❌ Network requests
- ❌ CLI implementation (handled by `fractary-cli`)
- ❌ CI/CD platform-specific logic

These concerns are handled by the consuming packages (bundles, CLI, etc.).

## Related Specifications

- **SPEC-00002**: Metadata Parsing - Frontmatter extraction and validation
- **SPEC-00003**: Pattern Matching - Glob pattern evaluation
- **SPEC-00004**: Routing & Distribution - Sync rule evaluation
- **SPEC-00005**: Configuration System - Config loading and resolution

## Changelog

- 2025-10-06: Initial draft

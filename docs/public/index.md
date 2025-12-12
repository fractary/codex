---
title: Codex SDK - Overview
description: Core SDK for Fractary Codex - centralized knowledge management and distribution platform for organizations
visibility: public
codex_sync_include: []
codex_sync_exclude: []
codex_sync_custom: [developers.fractary.com:src/content/docs/codex/]
tags: [codex, sdk, documentation, overview]
---

# Codex SDK

The **Codex SDK** (`@fractary/codex`) is the foundational TypeScript library for the Fractary Codex system - a centralized knowledge management and distribution platform that helps organizations maintain a single source of truth for documentation, AI tools, and organizational knowledge across all projects.

## What is Codex?

Codex is a system that enables organizations to:

- **Centralize Documentation**: Maintain all organizational knowledge in one place
- **Intelligent Distribution**: Automatically sync content to the right repositories based on metadata rules
- **Version Control**: Leverage Git for all documentation and knowledge management
- **AI-Native**: Designed for consumption by both humans and AI agents
- **Scalable**: Handle dozens to hundreds of projects without losing coherence

## What is the Codex SDK?

The Codex SDK extracts all core business logic from the Codex system into a reusable, testable, organization-agnostic TypeScript library. It provides:

- **Metadata Parsing**: Extract and validate YAML frontmatter from markdown files
- **Pattern Matching**: Glob-based pattern matching for intelligent file routing
- **Smart Routing**: Determine which files should sync to which repositories
- **Configuration Management**: Multi-source configuration with sensible defaults
- **Type Safety**: Full TypeScript support with strict typing

## Key Features

### 🎯 Organization-Agnostic

Works for any organization, not just Fractary. Simply configure your organization slug and directory structure.

### 🔒 Type-Safe

Full TypeScript implementation with strict typing and comprehensive type exports for all APIs.

### ✅ Well-Tested

Over 40 unit tests with complete coverage of core functionality.

### 🔧 Configurable

Flexible configuration system supporting environment variables, config files, and programmatic configuration.

### 📦 Platform-Independent

Pure business logic with no dependencies on specific CI/CD platforms, Git hosts, or file systems.

### 🚀 Production-Ready

Used in production by Fractary's Codex system to manage knowledge across multiple projects.

## How It Works

### 1. Define Sync Rules with Metadata

Add YAML frontmatter to your markdown files to control distribution:

```yaml
---
title: API Design Standards
codex_sync_include: ['api-*', 'core-*']
codex_sync_exclude: ['*-test', '*-dev']
visibility: internal
---

# API Design Standards

Your content here...
```

### 2. Parse and Evaluate

The SDK parses this metadata and evaluates sync rules:

```typescript
import { parseMetadata, shouldSyncToRepo } from '@fractary/codex'

// Parse frontmatter
const { metadata } = parseMetadata(fileContent)

// Determine if file should sync to target repo
const shouldSync = shouldSyncToRepo({
  filePath: 'docs/api-standards.md',
  fileMetadata: metadata,
  targetRepo: 'api-gateway',
  sourceRepo: 'codex.myorg.com'
})
```

### 3. Intelligent Distribution

Files automatically sync to matching repositories based on glob patterns:

- `api-*` matches: `api-gateway`, `api-auth`, `api-payments`
- `core-*` matches: `core-db`, `core-utils`
- Excludes: `api-test`, `core-dev`

## Architecture

The Codex SDK is designed as a pure business logic layer:

```
┌─────────────────────────────────────────┐
│         Consumer Applications           │
│  (CLI, GitHub Actions, MCP Servers)     │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         @fractary/codex SDK             │
│                                          │
│  • Metadata Parsing                     │
│  • Pattern Matching                     │
│  • Routing Logic                        │
│  • Configuration                        │
└──────────────────────────────────────────┘
```

The SDK provides the brain, while consumer applications (like `fractary-cli` or GitHub Actions workflows) provide the integration with actual file systems, Git repositories, and CI/CD platforms.

## Use Cases

### For Organizations

- **Centralized Documentation**: Single source of truth for all organizational knowledge
- **Cross-Project Standards**: Share standards and guidelines across all repositories
- **AI Agent Context**: Provide consistent context to AI agents working across projects
- **Knowledge Distribution**: Automatically distribute relevant docs to relevant projects

### For Developers

- **Build Custom Tools**: Create custom CLI tools or integrations using the SDK
- **Extend Codex**: Build plugins or extensions for the Codex system
- **Automate Documentation**: Programmatically manage documentation distribution
- **CI/CD Integration**: Integrate Codex logic into your build pipelines

### For Tool Builders

- **MCP Servers**: Build Model Context Protocol servers for AI agents
- **IDE Extensions**: Create extensions for VS Code, Cursor, or other IDEs
- **Web UIs**: Build web interfaces for managing Codex content
- **Alternative Hosts**: Implement Codex on platforms beyond GitHub

## Ecosystem

The Codex SDK is part of a larger ecosystem:

- **[@fractary/codex](https://www.npmjs.com/package/@fractary/codex)** - This SDK (core business logic)
- **fractary-cli** - Unified CLI for all Fractary tools (coming soon)
- **forge-bundle-codex-github-core** - GitHub Actions workflows for codex sync
- **forge-bundle-codex-claude-agents** - Claude Code agents for codex management

## Getting Started

Ready to use the Codex SDK? Check out our [Getting Started Guide](./getting-started.md) to install and start using the SDK in minutes.

## Documentation

- **[Getting Started](./getting-started.md)** - Installation and quick start
- **[API Reference](./api-reference.md)** - Complete API documentation
- **[Configuration](./configuration.md)** - Configuration options and environment variables
- **[CLI Usage](./cli-usage.md)** - Using the SDK via fractary-cli
- **[Examples](./examples.md)** - Practical examples and use cases

## License

MIT © Fractary Engineering

## Support

- **GitHub**: [github.com/fractary/codex](https://github.com/fractary/codex)
- **Issues**: [Report bugs or request features](https://github.com/fractary/codex/issues)
- **NPM**: [@fractary/codex](https://www.npmjs.com/package/@fractary/codex)

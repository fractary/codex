# Fractary Core

Core SDK for Fractary - Primitive operations for work tracking, repository management, specifications, logging, file storage, and documentation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

The Fractary Core SDK provides foundational infrastructure for managing software development workflows across multiple platforms. It implements primitive operations for work tracking (GitHub Issues, Jira, Linear), repository management (GitHub, GitLab, Bitbucket), specification management, logging, file storage, and documentation.

### Key Features

- **Multi-Platform Work Tracking**: Unified interface for GitHub Issues, Jira, and Linear
- **Repository Management**: Git operations with GitHub, GitLab, and Bitbucket integration
- **Specification Management**: Create, validate, and refine technical specifications
- **Log Management**: Capture, search, and archive session logs
- **File Storage**: Local and remote file operations with validation
- **Documentation Management**: Create, search, and export documentation
- **Type-Safe**: Full TypeScript support with comprehensive type definitions

## SDKs

This monorepo contains SDK implementations for multiple languages:

| Language | Package | Status | Install |
|----------|---------|--------|---------|
| **JavaScript/TypeScript** | [`@fractary/core`](./sdk/js/) | Ready | `npm install @fractary/core` |
| **Python** | [`fractary-core`](./sdk/py/) | Planned | `pip install fractary-core` |

## CLI

A command-line interface is available for all core operations:

| Tool | Package | Status | Install |
|------|---------|--------|---------|
| **Core CLI** | [`@fractary/core-cli`](./cli/) | Ready | `npm install -g @fractary/core-cli` |

**Quick example:**
```bash
# Work tracking
fractary-core work issue-fetch 123
fractary-core work issue-create "Bug: Login fails" --type bug

# Repository operations
fractary-core repo commit --message "Add feature" --type feat
fractary-core repo branch-create feature/new-ui

# Specification management
fractary-core spec spec-validate-check SPEC-20241216
fractary-core spec spec-create-file --title "API Design"

# Log management
fractary-core logs search --query "error" --type session
fractary-core logs capture 123

# File operations
fractary-core file write data.json --content '{"key":"value"}'
fractary-core file list --pattern "*.json"

# Documentation
fractary-core docs doc-create --title "User Guide"
fractary-core docs doc-search --query "authentication"
```

See the [CLI documentation](./cli/README.md) for full command reference.

## MCP Server

A standalone Model Context Protocol server for AI agent integration:

| Tool | Package | Status | Install |
|------|---------|--------|---------|
| **MCP Server** | [`@fractary/core-mcp`](./mcp/server/) | Ready | `npx @fractary/core-mcp` |

The MCP server provides 80 tools across 6 toolsets for AI agents to interact with core operations.

**Quick example:**
```bash
# Run MCP server with stdio transport (default)
npx @fractary/core-mcp

# Run with custom config
npx @fractary/core-mcp --config .fractary/config.yaml
```

**Claude Code integration:**
Add to `.claude/settings.json`:
```json
{
  "mcpServers": {
    "fractary-core": {
      "command": "npx",
      "args": ["-y", "@fractary/core-mcp"]
    }
  }
}
```

See the [MCP Server documentation](./mcp/server/README.md) for full reference.

## Claude Code Plugins

Claude Code plugins are available for enhanced workflow integration:

| Plugin | Package | Status |
|--------|---------|--------|
| **work** | `fractary-work` | Ready |
| **repo** | `fractary-repo` | Ready |
| **spec** | `fractary-spec` | Ready |
| **logs** | `fractary-logs` | Ready |
| **file** | `fractary-file` | Ready |
| **docs** | `fractary-docs` | Ready |

Plugins provide agents, slash commands, and tools for Claude Code integration.

## Quick Start

### JavaScript/TypeScript

```typescript
import { WorkManager } from '@fractary/core/work'
import { RepoManager } from '@fractary/core/repo'
import { SpecManager } from '@fractary/core/spec'

// Work tracking
const workManager = new WorkManager({
  provider: 'github',
  config: {
    owner: 'myorg',
    repo: 'myrepo',
    token: process.env.GITHUB_TOKEN
  }
})

const issue = await workManager.fetchIssue(123)
console.log(issue.title)

// Repository operations
const repoManager = new RepoManager({
  provider: 'github',
  config: {
    owner: 'myorg',
    repo: 'myrepo',
    token: process.env.GITHUB_TOKEN
  }
})

await repoManager.createBranch('feature/new-feature', 'main')

// Specification management
const specManager = new SpecManager()
const spec = await specManager.create({
  title: 'API Design',
  type: 'feature',
  content: 'Design REST API for user management'
})
```

## Project Structure

```
core/
├── sdk/
│   ├── js/                 # JavaScript/TypeScript SDK
│   │   ├── src/            # TypeScript source
│   │   │   ├── work/       # Work tracking module
│   │   │   ├── repo/       # Repository module
│   │   │   ├── spec/       # Specification module
│   │   │   ├── logs/       # Logging module
│   │   │   ├── file/       # File storage module
│   │   │   └── docs/       # Documentation module
│   │   ├── tests/          # Test suite
│   │   └── package.json    # npm configuration
│   └── py/                 # Python SDK (planned)
├── cli/                    # Command-line interface
│   ├── src/                # CLI source
│   │   └── commands/       # Command implementations
│   └── package.json        # npm configuration
├── mcp/
│   └── server/             # MCP server (standalone)
│       ├── src/            # Server source
│       │   ├── tools/      # Tool definitions
│       │   └── handlers/   # Tool handlers
│       └── package.json    # npm configuration
├── plugins/                # Claude Code plugins
│   ├── work/               # Work tracking plugin
│   ├── repo/               # Repository plugin
│   ├── spec/               # Specification plugin
│   ├── logs/               # Logging plugin
│   ├── file/               # File storage plugin
│   ├── docs/               # Documentation plugin
│   └── status/             # Status plugin
├── docs/                   # Shared documentation
├── specs/                  # Feature specifications
└── README.md               # This file
```

## Documentation

**[Complete Documentation](./docs/README.md)** - Comprehensive documentation for all toolsets and interfaces.

### By Interface

| Interface | Description | Link |
|-----------|-------------|------|
| **SDK** | TypeScript API reference | [SDK Documentation](./docs/sdk/js/README.md) |
| **CLI** | Command-line reference | [CLI Documentation](./docs/cli/README.md) |
| **MCP** | MCP Server tools | [MCP Documentation](./docs/mcp/server/README.md) |
| **Plugins** | Claude Code plugins | [Plugin Documentation](./docs/plugins/README.md) |

### Guides

- [Configuration Guide](./docs/guides/configuration.md) - Unified `.fractary/config.yaml` reference
- [Integration Guide](./docs/guides/integration.md) - How to integrate into your projects
- [Troubleshooting](./docs/guides/troubleshooting.md) - Common issues and solutions

## Development

### JavaScript SDK

```bash
cd sdk/js
npm install
npm run build
npm test
```

### CLI

```bash
cd cli
npm install
npm run build
npm test
```

### MCP Server

```bash
cd mcp/server
npm install
npm run build
npm test
```

## Toolsets

Fractary Core is organized into 6 **toolsets** - functional areas that each contain related tools and operations:

| Toolset | Description | Platforms |
|---------|-------------|-----------|
| **Work** | Work item and issue tracking | GitHub Issues, Jira, Linear |
| **Repo** | Repository and Git operations | GitHub, GitLab, Bitbucket |
| **Spec** | Technical specification management | Local storage |
| **Logs** | Session and operational logging | Local storage |
| **File** | File storage operations | Local, S3 |
| **Docs** | Documentation management | Local storage |

### Work Toolset

Manage work items across GitHub Issues, Jira, and Linear:

- Create, update, and fetch issues
- Manage comments, labels, and milestones
- Search and filter issues
- Track issue state and assignments

### Repo Toolset

Git and platform operations:

- Branch management (create, delete, list)
- Commit operations with semantic versioning
- Pull request workflows
- Tag management
- Worktree support
- Multi-platform support (GitHub, GitLab, Bitbucket)

### Spec Toolset

Technical specification workflows:

- Create and validate specifications
- Template-based generation
- Refinement and versioning
- Specification search and indexing

### Logs Toolset

Session and operation logging:

- Capture session logs
- Search and filter logs
- Archive and export
- Log type classification

### File Toolset

File operations with validation:

- Read, write, list, delete operations
- Pattern matching and filtering
- Local and remote storage
- File validation and safety checks

### Docs Toolset

Documentation workflows:

- Create and update documentation
- Search and indexing
- Export to multiple formats
- Version tracking

## License

MIT © Fractary

## Contributing

For issues or contributions, please visit the [GitHub repository](https://github.com/fractary/core).

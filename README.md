# Fractary Codex

Knowledge infrastructure for AI agents.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

Fractary Codex provides infrastructure for managing organizational knowledge across AI agents and projects. It implements a universal reference system (`codex://` URIs), multi-provider storage, intelligent caching, and file synchronization.

## Packages

| Package | Description | Install |
|---------|-------------|---------|
| [`@fractary/codex`](./sdk/js/) | JavaScript/TypeScript SDK | `npm install @fractary/codex` |
| [`@fractary/codex-cli`](./cli/) | Command-line interface | `npm install -g @fractary/codex-cli` |
| [`@fractary/codex-mcp`](./mcp/server/) | MCP server for AI agents | `npx @fractary/codex-mcp` |
| [Claude Code Plugin](./plugins/codex/) | Claude Code integration | Install via plugin system |

## Quick Start

### 1. Install and initialize

```bash
npm install -g @fractary/codex-cli

# Initialize codex config (requires .fractary/config.yaml from @fractary/core)
fractary-codex config-init --org myorg --codex-repo codex.myorg.com
```

### 2. Fetch documents

```bash
fractary-codex document-fetch codex://myorg/project/docs/api.md
```

### 3. Sync with codex repository

```bash
fractary-codex sync --dry-run
fractary-codex sync
```

### 4. Manage cache

```bash
fractary-codex cache-list --verbose
fractary-codex cache-stats
fractary-codex cache-clear --all
fractary-codex cache-health
```

### 5. Use programmatically

```typescript
import { CodexClient } from '@fractary/codex'

const client = await CodexClient.create({ organizationSlug: 'myorg' })
const result = await client.fetch('codex://myorg/project/docs/api.md')
console.log(result.content.toString())
```

## MCP Server

Add to `.mcp.json` for AI agent integration:

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

## Claude Code Plugin

The plugin provides slash commands for Claude Code:

| Command | Description |
|---------|-------------|
| `/fractary-codex:config-init` | Initialize codex configuration |
| `/fractary-codex:config-update` | Update configuration fields |
| `/fractary-codex:config-validate` | Validate configuration (read-only) |
| `/fractary-codex:sync` | Sync project with codex repository |

## URI Format

```
codex://org/project/path/to/file.md
       └─┬─┘└──┬──┘└──────┬───────┘
         │     │          └─ File path within project
         │     └─ Project/repository name
         └─ Organization name
```

## Project Structure

```
codex/
├── sdk/js/             # @fractary/codex - TypeScript SDK
├── cli/                # @fractary/codex-cli - CLI tool
├── mcp/server/         # @fractary/codex-mcp - MCP server
├── plugins/codex/      # Claude Code plugin
│   ├── agents/         # Plugin agents
│   ├── commands/       # Plugin commands
│   └── skills/         # Plugin skills
├── docs/               # Documentation
└── specs/              # Technical specifications
```

## Documentation

- [CLI Command Reference](./cli/README.md) - All commands with options and flags
- [SDK API Reference](./sdk/js/README.md) - TypeScript/JavaScript SDK
- [MCP Server Reference](./mcp/server/README.md) - AI agent integration
- [Plugin Reference](./plugins/codex/README.md) - Claude Code plugin
- [Configuration Guide](./docs/configuration.md) - Configuration reference
- [Full Documentation Index](./docs/README.md) - All documentation

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run all tests
npm test

# Type check
npm run typecheck
```

## License

MIT

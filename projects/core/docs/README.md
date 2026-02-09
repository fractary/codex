# Fractary Core Documentation

Complete documentation for Fractary Core - the foundational infrastructure for managing software development workflows.

## What is Fractary Core?

Fractary Core provides primitive operations for work tracking, repository management, specifications, logging, file storage, and documentation across multiple platforms. It offers four interfaces (SDK, CLI, MCP Server, and Plugins) to access these capabilities.

## The 6 Toolsets

Fractary Core is organized around six **toolsets** - functional areas that each contain related tools and operations:

| Toolset | Description | Platforms |
|---------|-------------|-----------|
| **[Work](/docs/sdk/js/work.md)** | Work item and issue tracking | GitHub Issues, Jira, Linear |
| **[Repo](/docs/sdk/js/repo.md)** | Repository and Git operations | GitHub, GitLab, Bitbucket |
| **[Spec](/docs/sdk/js/spec.md)** | Technical specification management | Local storage |
| **[Logs](/docs/sdk/js/logs.md)** | Session and operational logging | Local storage |
| **[File](/docs/sdk/js/file.md)** | File storage operations | Local, S3 |
| **[Docs](/docs/sdk/js/docs.md)** | Documentation management | Local storage |

## The 4 Interfaces

Each toolset is accessible through four interfaces, allowing you to choose the right approach for your workflow:

### 1. SDK (TypeScript)

The SDK provides programmatic access to all toolsets through Manager classes.

```typescript
import { WorkManager } from '@fractary/core/work';

const workManager = new WorkManager({
  provider: 'github',
  config: { owner: 'myorg', repo: 'myrepo', token: process.env.GITHUB_TOKEN }
});

const issue = await workManager.fetchIssue(123);
```

**[SDK Documentation](/docs/sdk/js/README.md)** - Installation, quick start, and API reference

### 2. CLI

The CLI provides command-line access to all operations.

```bash
# Fetch an issue
fractary-core work issue-fetch 123

# Create a branch
fractary-core repo branch-create feature/my-feature

# Validate a specification
fractary-core spec spec-validate-check SPEC-20240101
```

**[CLI Documentation](/docs/cli/README.md)** - Command structure and reference

### 3. MCP Server

The MCP (Model Context Protocol) Server exposes 80 tools for AI agent integration.

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

**[MCP Documentation](/docs/mcp/server/README.md)** - Setup and tool reference

### 4. Claude Plugins

Claude Code plugins provide agents, slash commands, and tools for enhanced workflow integration.

| Plugin | Commands | Description |
|--------|----------|-------------|
| `fractary-work` | `/issue-create`, `/issue-fetch` | Work tracking integration |
| `fractary-repo` | `/commit`, `/pr-create` | Repository operations |
| `fractary-spec` | `/spec-create`, `/spec-validate` | Specification management |
| `fractary-logs` | `/capture`, `/search` | Log management |
| `fractary-file` | `/upload`, `/download` | File operations |
| `fractary-docs` | `/write`, `/validate` | Documentation management |

**[Plugins Documentation](/docs/plugins/README.md)** - Installation and commands

## Quick Navigation

### By Toolset

| Toolset | SDK | CLI | MCP | Plugin |
|---------|-----|-----|-----|--------|
| Work | [API](/docs/sdk/js/work.md) | [Commands](/docs/cli/work.md) | [Tools](/docs/mcp/server/work.md) | [Plugin](/docs/plugins/work.md) |
| Repo | [API](/docs/sdk/js/repo.md) | [Commands](/docs/cli/repo.md) | [Tools](/docs/mcp/server/repo.md) | [Plugin](/docs/plugins/repo.md) |
| Spec | [API](/docs/sdk/js/spec.md) | [Commands](/docs/cli/spec.md) | [Tools](/docs/mcp/server/spec.md) | [Plugin](/docs/plugins/spec.md) |
| Logs | [API](/docs/sdk/js/logs.md) | [Commands](/docs/cli/logs.md) | [Tools](/docs/mcp/server/logs.md) | [Plugin](/docs/plugins/logs.md) |
| File | [API](/docs/sdk/js/file.md) | [Commands](/docs/cli/file.md) | [Tools](/docs/mcp/server/file.md) | [Plugin](/docs/plugins/file.md) |
| Docs | [API](/docs/sdk/js/docs.md) | [Commands](/docs/cli/docs.md) | [Tools](/docs/mcp/server/docs.md) | [Plugin](/docs/plugins/docs.md) |

### Supporting Documentation

- **[Configuration Guide](/docs/guides/configuration.md)** - Unified `.fractary/config.yaml` reference
- **[Integration Guide](/docs/guides/integration.md)** - Integration patterns and best practices
- **[Troubleshooting](/docs/guides/troubleshooting.md)** - Common issues and solutions

### For Contributors

- **[Development Standards](/docs/standards/config-management-standards.md)** - Configuration management standards
- **[Plugin Development](/docs/guides/new-claude-plugin-framework.md)** - Creating new plugins

## Getting Started

### 1. Choose Your Interface

| Use Case | Recommended Interface |
|----------|----------------------|
| Building applications | SDK |
| Scripting and automation | CLI |
| AI agent integration | MCP Server |
| Claude Code workflows | Plugins |

### 2. Install

```bash
# SDK
npm install @fractary/core

# CLI
npm install -g @fractary/core-cli

# MCP Server
npx @fractary/core-mcp

# Plugins (in Claude Code)
# Add to .claude/settings.json:
# "plugins": ["fractary-work", "fractary-repo", ...]
```

### 3. Configure

Create `.fractary/config.yaml`:

```yaml
version: "2.0"

work:
  active_handler: github
  handlers:
    github:
      owner: myorg
      repo: myrepo
      token: ${GITHUB_TOKEN}

repo:
  active_handler: github
  handlers:
    github:
      token: ${GITHUB_TOKEN}
```

See the [Configuration Guide](/docs/guides/configuration.md) for complete options.

## Terminology Reference

| Term | Context | Example |
|------|---------|---------|
| **Toolset** | Conceptual grouping | "The Work toolset handles issue tracking" |
| **Module** | SDK | `import { WorkManager } from '@fractary/core/work'` |
| **Command group** | CLI | `fractary-core work issue-create` |
| **Tool** | MCP Server | `fractary_work_issue_create` |
| **Plugin** | Claude Code | `fractary-work` plugin |

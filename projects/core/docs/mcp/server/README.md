# Fractary Core MCP Server

Model Context Protocol (MCP) server providing 80 tools for AI agent integration.

## What is MCP?

The Model Context Protocol (MCP) is a standard for AI systems to interact with external tools and services. The Fractary Core MCP Server exposes all toolset operations as MCP tools that AI agents can invoke.

## Installation

```bash
# Run directly with npx
npx @fractary/core-mcp

# Or install globally
npm install -g @fractary/core-mcp
fractary-core-mcp
```

## Quick Start

### Claude Code Integration

Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "fractary-core": {
      "command": "npx",
      "args": ["-y", "@fractary/core-mcp"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

### With Custom Configuration

```json
{
  "mcpServers": {
    "fractary-core": {
      "command": "npx",
      "args": [
        "-y",
        "@fractary/core-mcp",
        "--config",
        ".fractary/config.yaml"
      ],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here",
        "JIRA_TOKEN": "your_jira_token"
      }
    }
  }
}
```

## Tool Naming Convention

MCP tools follow a consistent naming pattern:

```
fractary_{toolset}_{resource}_{action}
```

### Examples

| Tool Name | Toolset | Resource | Action |
|-----------|---------|----------|--------|
| `fractary_work_issue_create` | Work | Issue | Create |
| `fractary_work_issue_fetch` | Work | Issue | Fetch |
| `fractary_repo_branch_create` | Repo | Branch | Create |
| `fractary_repo_pr_merge` | Repo | PR | Merge |
| `fractary_spec_validate` | Spec | - | Validate |
| `fractary_logs_capture` | Logs | - | Capture |

## Tool Categories by Toolset

| Toolset | Tool Count | Documentation |
|---------|------------|---------------|
| **Work** | 19 tools | [Work Tools](/docs/mcp/server/work.md) |
| **Repo** | 37 tools | [Repo Tools](/docs/mcp/server/repo.md) |
| **Spec** | 5 tools | [Spec Tools](/docs/mcp/server/spec.md) |
| **Logs** | 5 tools | [Logs Tools](/docs/mcp/server/logs.md) |
| **File** | 7 tools | [File Tools](/docs/mcp/server/file.md) |
| **Docs** | 7 tools | [Docs Tools](/docs/mcp/server/docs.md) |

## Configuration

### Configuration File

Create `.fractary/config.yaml`:

```yaml
server:
  name: fractary-core
  version: 0.1.0

work:
  provider: github
  config:
    owner: myorg
    repo: myrepo
    token: ${GITHUB_TOKEN}

repo:
  provider: github
  config:
    owner: myorg
    repo: myrepo
    token: ${GITHUB_TOKEN}

spec:
  directory: ./specs

logs:
  directory: ./logs

file:
  baseDirectory: ./data

docs:
  directory: ./docs
```

### Environment Variables

```bash
# Provider credentials
export GITHUB_TOKEN=ghp_your_token
export JIRA_TOKEN=your_jira_token
export LINEAR_API_KEY=your_linear_key

# Server settings
export FRACTARY_MCP_CONFIG=.fractary/config.yaml
export FRACTARY_MCP_LOG_LEVEL=info
```

## Tool Response Format

All tools return responses in a consistent format:

### Success Response

```json
{
  "success": true,
  "data": {
    "number": 123,
    "title": "Issue title",
    "state": "open"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Issue #999 not found"
  }
}
```

## Example Tool Invocations

### Work Tools

```json
// fractary_work_issue_create
{
  "title": "Add user authentication",
  "body": "Implement JWT-based auth",
  "labels": ["enhancement"]
}

// fractary_work_issue_fetch
{
  "issue_number": "123"
}

// fractary_work_comment_create
{
  "issue_number": "123",
  "body": "Investigation complete"
}
```

### Repo Tools

```json
// fractary_repo_branch_create
{
  "name": "feature/auth",
  "base_branch": "main"
}

// fractary_repo_commit
{
  "message": "Add auth middleware",
  "type": "feat",
  "scope": "auth"
}

// fractary_repo_pr_create
{
  "title": "Add authentication",
  "base": "main",
  "draft": false
}
```

### Spec Tools

```json
// fractary_spec_create
{
  "title": "API Design",
  "template": "api"
}

// fractary_spec_validate
{
  "spec_id": "SPEC-20240101"
}
```

## Transport Options

The MCP server supports multiple transport options:

### stdio (default)

```bash
npx @fractary/core-mcp
```

### HTTP/SSE

```bash
npx @fractary/core-mcp --transport http --port 3000
```

## Debugging

Enable debug logging:

```bash
FRACTARY_MCP_LOG_LEVEL=debug npx @fractary/core-mcp
```

View tool execution logs:

```bash
# Tools log to stderr
npx @fractary/core-mcp 2>mcp-debug.log
```

## Other Interfaces

- **SDK:** [API Reference](/docs/sdk/js/README.md)
- **CLI:** [Command Reference](/docs/cli/README.md)
- **Plugins:** [Plugin Reference](/docs/plugins/README.md)

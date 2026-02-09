# Fractary Plugins for Claude Code

Claude Code plugins providing agents, slash commands, and tools for enhanced workflow integration.

## What are Fractary Plugins?

Fractary plugins extend Claude Code with specialized capabilities for software development workflows. Each plugin corresponds to a toolset and provides:

- **Slash Commands** - Quick actions invoked with `/command-name`
- **Agents** - Autonomous task handlers for complex operations
- **Tools** - Low-level operations available to Claude

## Available Plugins

| Plugin | Toolset | Description |
|--------|---------|-------------|
| [`fractary-work`](/docs/plugins/work.md) | Work | Work item and issue tracking |
| [`fractary-repo`](/docs/plugins/repo.md) | Repo | Repository and Git operations |
| [`fractary-spec`](/docs/plugins/spec.md) | Spec | Technical specification management |
| [`fractary-logs`](/docs/plugins/logs.md) | Logs | Session and operational logging |
| [`fractary-file`](/docs/plugins/file.md) | File | File storage operations |
| [`fractary-docs`](/docs/plugins/docs.md) | Docs | Documentation management |

## Installation

### In Claude Code

Add plugins to your settings:

1. Open Claude Code settings
2. Add plugins to the `plugins` array in `.claude/settings.json`:

```json
{
  "plugins": [
    "fractary-work",
    "fractary-repo",
    "fractary-spec",
    "fractary-logs",
    "fractary-file",
    "fractary-docs"
  ]
}
```

### Configuration

Plugins read configuration from `.fractary/config.yaml`. Initialize with:

```bash
fractary-core:config-init
```

Or configure specific plugins:

```bash
fractary-core:config-init --plugins work,repo
```

See the [Configuration Guide](/docs/guides/configuration.md) for complete options.

## Commands vs Agents

### Slash Commands

Slash commands are quick actions you invoke directly:

```
/issue-create "Add user authentication" --type feature
/commit --message "Add auth middleware" --type feat
/spec-validate SPEC-20240101
```

### Agents

Agents handle complex, multi-step tasks autonomously:

| Agent | Plugin | Description |
|-------|--------|-------------|
| `fractary-work:issue-refine-agent` | Work | Reviews issues and asks clarifying questions |
| `fractary-work:issue-bulk-creator` | Work | Creates multiple related issues at once |
| `fractary-repo:pr-review-agent` | Repo | Analyzes PRs with comments, reviews, CI status |
| `fractary-spec:spec-create` | Spec | Creates specifications from context |
| `fractary-spec:spec-refine` | Spec | Improves specifications through review |
| `fractary-logs:logs-analyze` | Logs | Analyzes logs for patterns and errors |
| `fractary-docs:docs-write` | Docs | Creates documentation |
| `fractary-docs:docs-audit` | Docs | Audits documentation quality |

## Quick Reference

### Work Plugin Commands

| Command | Description |
|---------|-------------|
| `/issue-create` | Create a new issue |
| `/issue-fetch` | Fetch issue details |
| `/issue-list` | List issues |
| `/issue-search` | Search issues |
| `/issue-update` | Update an issue |
| `/issue-comment` | Post a comment |
| `/issue-refine` | Refine issue requirements |
| `/issue-create-bulk` | Create multiple issues |

### Repo Plugin Commands

| Command | Description |
|---------|-------------|
| `/branch-create` | Create a new branch |
| `/commit` | Create a commit |
| `/commit-push` | Commit and push |
| `/commit-push-pr` | Commit, push, and create PR |
| `/commit-push-pr-merge` | Full workflow: commit, push, PR, merge |
| `/pr-create` | Create a pull request |
| `/pr-merge` | Merge a pull request |
| `/pr-review` | Review a pull request |
| `/pull` | Pull from remote |
| `/worktree-create` | Create a git worktree |
| `/worktree-list` | List worktrees |
| `/worktree-remove` | Remove a git worktree |
| `/worktree-prune` | Clean up stale worktrees |

### Spec Plugin Commands

| Command | Description |
|---------|-------------|
| `/spec-create` | Create a specification |
| `/spec-refine` | Refine a specification |
| `/spec-validate` | Validate against implementation |
| `/spec-archive` | Archive completed spec |

### Logs Plugin Commands

| Command | Description |
|---------|-------------|
| `/logs-capture` | Start session capture |
| `/logs-stop` | Stop active capture |
| `/logs-read` | Read log files |
| `/logs-search` | Search across logs |
| `/logs-analyze` | Analyze logs |
| `/logs-archive` | Archive logs |
| `/logs-cleanup` | Clean up old logs |

### File Plugin Commands

| Command | Description |
|---------|-------------|
| `/file-upload` | Upload a file |
| `/file-download` | Download a file |
| `/file-list` | List files |
| `/file-delete` | Delete a file |
| `/file-show-config` | Show configuration |
| `/file-test-connection` | Test storage connection |

### Docs Plugin Commands

| Command | Description |
|---------|-------------|
| `/docs-write` | Write documentation |
| `/docs-list` | List documentation |
| `/docs-validate` | Validate documentation |
| `/docs-audit` | Audit documentation |
| `/docs-check-consistency` | Check code consistency |

## Usage Examples

### Work Tracking Workflow

```
User: Create an issue for implementing user authentication

Claude: /issue-create "Implement user authentication" --type feature --labels "enhancement,security"

User: The requirements are unclear, can you refine them?

Claude: [Uses fractary-work:issue-refine-agent to ask clarifying questions]
```

### Repository Workflow

```
User: Commit my changes and create a PR

Claude: /commit-push-pr --message "Add authentication system" --type feat --title "Feature: User Authentication"
```

### Specification Workflow

```
User: Create a spec for the API design

Claude: [Uses fractary-spec:spec-create agent to create specification from conversation context]

User: Can you validate this against the implementation?

Claude: /spec-validate SPEC-20240101
```

## Plugin Development

For creating new plugins, see the [Plugin Development Guide](/docs/guides/new-claude-plugin-framework.md).

## Other Interfaces

- **SDK:** [API Reference](/docs/sdk/js/README.md)
- **CLI:** [Command Reference](/docs/cli/README.md)
- **MCP:** [Tool Reference](/docs/mcp/server/README.md)

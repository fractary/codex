# Fractary Core CLI

Command-line interface for all Fractary Core modules.

## Installation

```bash
npm install -g @fractary/core-cli
```

## Command Structure

```bash
fractary-core <module> <command> [arguments] [options]
```

Commands use **dash-separated names** (e.g., `issue-fetch`, `branch-create`, `doc-search`).

### Examples

```bash
# Work module
fractary-core work issue-fetch 123
fractary-core work issue-create --title "Bug: Login fails"
fractary-core work issue-comment 123 --body "Investigation complete"
fractary-core work issue-search --query "authentication"
fractary-core work label-add 123 --labels "bug,priority:high"
fractary-core work configure --platform github

# Repo module
fractary-core repo branch-create feature/my-feature --checkout
fractary-core repo commit --message "Add feature" --type feat
fractary-core repo pr-create --title "Feature PR"
fractary-core repo pr-merge 42 --strategy squash --delete-branch
fractary-core repo tag-create v1.0.0 --message "Release 1.0.0"
fractary-core repo worktree-create feature/parallel --base main
fractary-core repo status
fractary-core repo push --set-upstream

# Spec module
fractary-core spec spec-create-file "API Design" --template feature
fractary-core spec spec-validate-check SPEC-00123
fractary-core spec spec-refine-scan SPEC-00123
fractary-core spec spec-archive 123
fractary-core spec template-list

# Logs module
fractary-core logs types
fractary-core logs type-info session
fractary-core logs validate ./my-log.md
fractary-core logs capture 123 --model claude-3
fractary-core logs stop
fractary-core logs write --type session --title "Dev Session" --content "..."
fractary-core logs search --query "error" --type session
fractary-core logs list --type build --limit 10

# File module
fractary-core file upload ./data.csv --remote-path exports/data.csv
fractary-core file download exports/data.csv --local-path ./data.csv
fractary-core file write config.json --content '{"key":"value"}'
fractary-core file list --prefix data/
fractary-core file copy config.json config.backup.json
fractary-core file show-config
fractary-core file test-connection

# Docs module
fractary-core docs doc-create guide-001 --title "User Guide" --content "..."
fractary-core docs doc-search --text "authentication"
fractary-core docs doc-refine-scan guide-001
fractary-core docs doc-validate-fulfillment feature-spec-001
fractary-core docs type-list
fractary-core docs type-info adr --template
```

## Global Options

All commands support `--json` for structured JSON output.

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |
| `--help` | Show help for command |
| `--version` | Show version |

## Configuration

The CLI reads configuration from `.fractary/config.yaml` by default.

See the [Configuration Guide](/docs/guides/configuration.md) for complete options.

## Module Reference

| Module | Command Group | Description | Documentation |
|--------|---------------|-------------|---------------|
| **Work** | `fractary-core work` | Work item tracking (issues, comments, labels) | [Work Commands](/docs/cli/work.md) |
| **Repo** | `fractary-core repo` | Repository operations (branches, commits, PRs, tags, worktrees) | [Repo Commands](/docs/cli/repo.md) |
| **Spec** | `fractary-core spec` | Specification management (create, validate, refine, archive) | [Spec Commands](/docs/cli/spec.md) |
| **Logs** | `fractary-core logs` | Log management (types, capture, CRUD, search, archive) | [Logs Commands](/docs/cli/logs.md) |
| **File** | `fractary-core file` | File storage operations (upload, download, CRUD, copy, move) | [File Commands](/docs/cli/file.md) |
| **Docs** | `fractary-core docs` | Documentation management (CRUD, search, archive, validate) | [Docs Commands](/docs/cli/docs.md) |

## Command Summary by Module

### Work Commands

| Command | Description |
|---------|-------------|
| `work issue-fetch <number>` | Fetch a work item by ID |
| `work issue-create` | Create a new work item |
| `work issue-update <number>` | Update a work item |
| `work issue-close <number>` | Close a work item |
| `work issue-reopen <number>` | Reopen a closed work item |
| `work issue-assign <number>` | Assign or unassign a work item |
| `work issue-classify <number>` | Classify work item type |
| `work issue-search` | Search work items |
| `work issue-comment <number>` | Add a comment to a work item |
| `work issue-comment-list <number>` | List comments on a work item |
| `work label-add <number>` | Add labels to a work item |
| `work label-remove <number>` | Remove labels from a work item |
| `work label-list` | List available or issue labels |
| `work configure` | Configure work tracking settings |

### Repo Commands

| Command | Description |
|---------|-------------|
| `repo branch-create <name>` | Create a new branch |
| `repo branch-delete <name>` | Delete a branch |
| `repo branch-list` | List branches |
| `repo commit` | Create a commit |
| `repo pr-create` | Create a pull request |
| `repo pr-list` | List pull requests |
| `repo pr-merge <number>` | Merge a pull request |
| `repo pr-review <number>` | Review a pull request |
| `repo tag-create <name>` | Create a tag |
| `repo tag-push <name>` | Push tag(s) to remote |
| `repo tag-list` | List tags |
| `repo worktree-create <branch>` | Create a worktree |
| `repo worktree-list` | List worktrees |
| `repo worktree-remove <path>` | Remove a worktree |
| `repo worktree-cleanup` | Clean up stale worktrees |
| `repo status` | Show repository status |
| `repo push` | Push commits to remote |
| `repo pull` | Pull changes from remote |

### Spec Commands

| Command | Description |
|---------|-------------|
| `spec spec-create-file <title>` | Create a new specification file |
| `spec spec-get <id>` | Get a specification |
| `spec spec-list` | List specifications |
| `spec spec-update <id>` | Update a specification |
| `spec spec-delete <id>` | Delete a specification |
| `spec spec-validate-check <id>` | Run structural validation checks |
| `spec spec-refine-scan <id>` | Scan for gaps and refinement areas |
| `spec spec-archive <issue_number>` | Archive specs for a completed issue |
| `spec template-list` | List available templates |

### Logs Commands

| Command | Description |
|---------|-------------|
| `logs types` | List available log types |
| `logs type-info <type>` | Get log type definition |
| `logs validate <file>` | Validate a log file against its type |
| `logs capture <issue_number>` | Start session capture |
| `logs stop` | Stop session capture |
| `logs write` | Write a log entry |
| `logs read <id>` | Read a log entry |
| `logs search` | Search logs |
| `logs list` | List logs |
| `logs archive` | Archive old logs |
| `logs delete <id>` | Delete a log entry |

### File Commands

| Command | Description |
|---------|-------------|
| `file upload <local-path>` | Upload a local file to storage |
| `file download <remote-path>` | Download a file from storage |
| `file write <path>` | Write content to storage |
| `file read <path>` | Read content from storage |
| `file list` | List files in storage |
| `file delete <path>` | Delete a file from storage |
| `file exists <path>` | Check if a file exists |
| `file copy <src> <dest>` | Copy a file within storage |
| `file move <src> <dest>` | Move a file within storage |
| `file get-url <path>` | Get a URL for a file |
| `file show-config` | Show file plugin configuration |
| `file test-connection` | Test storage connection |

### Docs Commands

| Command | Description |
|---------|-------------|
| `docs doc-create <id>` | Create a new document |
| `docs doc-get <id>` | Get a document |
| `docs doc-list` | List documents |
| `docs doc-update <id>` | Update a document |
| `docs doc-delete <id>` | Delete a document |
| `docs doc-search` | Search documents |
| `docs doc-archive <id>` | Archive a document |
| `docs doc-refine-scan <id>` | Scan for gaps and refinement questions |
| `docs doc-validate-fulfillment <id>` | Validate implementation fulfillment |
| `docs type-list` | List available document types |
| `docs type-info <type>` | Get document type information |

## JSON Output Format

All commands support `--json` for structured output following a consistent envelope:

```json
{
  "status": "success",
  "data": { ... }
}
```

Error responses:

```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error |
| `3` | Resource not found / validation failure |

## Environment Variables

The CLI respects these environment variables:

```bash
# Platform credentials
export GITHUB_TOKEN=ghp_your_token
export GITLAB_TOKEN=glpat_your_token
export BITBUCKET_TOKEN=your_token
export JIRA_TOKEN=your_jira_token
export LINEAR_API_KEY=lin_api_your_key
```

## Other Interfaces

- **SDK:** [API Reference](/docs/sdk/js/README.md)
- **MCP:** [Tool Reference](/docs/mcp/server/README.md)
- **Plugins:** [Plugin Reference](/docs/plugins/README.md)

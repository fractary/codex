# Work Module - CLI Reference

Command-line reference for the Work module. Work item tracking across GitHub Issues, Jira, and Linear.

## Command Structure

```bash
fractary-core work <command> [arguments] [options]
```

All commands use dash-separated names (e.g., `issue-fetch`, `label-add`).

## Issue Commands

### work issue-fetch

Fetch a work item by ID.

```bash
fractary-core work issue-fetch <number> [options]
```

**Arguments:**
- `number` - Issue number

**Options:**
- `--json` - Output as JSON
- `--verbose` - Show additional details (labels, assignees)

**Examples:**
```bash
# Fetch issue #123
fractary-core work issue-fetch 123

# Output as JSON
fractary-core work issue-fetch 123 --json

# Show full details
fractary-core work issue-fetch 123 --verbose
```

### work issue-create

Create a new work item.

```bash
fractary-core work issue-create [options]
```

**Options:**
- `--title <title>` - Issue title (required)
- `--body <body>` - Issue body
- `--labels <labels>` - Comma-separated labels
- `--assignees <assignees>` - Comma-separated assignees
- `--json` - Output as JSON

**Examples:**
```bash
# Create a bug report
fractary-core work issue-create \
  --title "Login fails on mobile" \
  --labels "bug,priority:high" \
  --assignees "developer1"

# Create a feature request
fractary-core work issue-create \
  --title "Add dark mode" \
  --body "Implement dark mode toggle in settings"
```

### work issue-update

Update a work item.

```bash
fractary-core work issue-update <number> [options]
```

**Arguments:**
- `number` - Issue number

**Options:**
- `--title <title>` - New title
- `--body <body>` - New body
- `--state <state>` - New state (`open`, `closed`)
- `--json` - Output as JSON

**Examples:**
```bash
# Update title
fractary-core work issue-update 123 --title "Updated title"

# Change state
fractary-core work issue-update 123 --state closed
```

### work issue-close

Close a work item.

```bash
fractary-core work issue-close <number> [options]
```

**Arguments:**
- `number` - Issue number

**Options:**
- `--comment <text>` - Add closing comment
- `--json` - Output as JSON

**Examples:**
```bash
# Close issue
fractary-core work issue-close 123

# Close with comment
fractary-core work issue-close 123 --comment "Fixed in PR #456"
```

### work issue-reopen

Reopen a closed work item.

```bash
fractary-core work issue-reopen <number> [options]
```

**Arguments:**
- `number` - Issue number

**Options:**
- `--comment <text>` - Add comment when reopening
- `--json` - Output as JSON

**Examples:**
```bash
# Reopen issue
fractary-core work issue-reopen 123

# Reopen with comment
fractary-core work issue-reopen 123 --comment "Regression found, reopening"
```

### work issue-assign

Assign or unassign a work item.

```bash
fractary-core work issue-assign <number> [options]
```

**Arguments:**
- `number` - Issue number

**Options:**
- `--user <username>` - User to assign (use `@me` for self; omit to unassign)
- `--json` - Output as JSON

**Examples:**
```bash
# Assign to user
fractary-core work issue-assign 123 --user developer1

# Assign to self
fractary-core work issue-assign 123 --user @me

# Unassign
fractary-core work issue-assign 123
```

### work issue-classify

Classify work item type (feature, bug, chore, patch).

```bash
fractary-core work issue-classify <number> [options]
```

**Arguments:**
- `number` - Issue number

**Options:**
- `--json` - Output as JSON

**Examples:**
```bash
# Classify issue
fractary-core work issue-classify 123

# Get classification as JSON
fractary-core work issue-classify 123 --json
```

**Output:**
```
feature
(confidence: 85%)
```

### work issue-search

Search work items.

```bash
fractary-core work issue-search [options]
```

**Options:**
- `--query <query>` - Search query (required)
- `--state <state>` - Filter by state: `open`, `closed`, `all` (default: `open`)
- `--labels <labels>` - Filter by labels (comma-separated)
- `--limit <n>` - Max results (default: `10`)
- `--json` - Output as JSON

**Examples:**
```bash
# Search for authentication issues
fractary-core work issue-search --query "authentication"

# Search closed bugs
fractary-core work issue-search --query "login" --state closed --labels "bug"

# Limit results
fractary-core work issue-search --query "API" --limit 5 --json
```

## Comment Commands

### work issue-comment

Add a comment to a work item.

```bash
fractary-core work issue-comment <number> [options]
```

**Arguments:**
- `number` - Issue number

**Options:**
- `--body <text>` - Comment body (required)
- `--json` - Output as JSON

**Examples:**
```bash
# Add a comment
fractary-core work issue-comment 123 --body "Investigation complete, root cause identified"
```

### work issue-comment-list

List comments on a work item.

```bash
fractary-core work issue-comment-list <number> [options]
```

**Arguments:**
- `number` - Issue number

**Options:**
- `--limit <n>` - Max comments to show
- `--json` - Output as JSON

**Examples:**
```bash
# List comments
fractary-core work issue-comment-list 123

# Limit to 5 comments
fractary-core work issue-comment-list 123 --limit 5
```

## Label Commands

### work label-add

Add labels to a work item.

```bash
fractary-core work label-add <number> [options]
```

**Arguments:**
- `number` - Issue number

**Options:**
- `--labels <labels>` - Comma-separated labels to add (required)
- `--json` - Output as JSON

**Example:**
```bash
fractary-core work label-add 123 --labels "bug,priority:high"
```

### work label-remove

Remove labels from a work item.

```bash
fractary-core work label-remove <number> [options]
```

**Arguments:**
- `number` - Issue number

**Options:**
- `--labels <labels>` - Comma-separated labels to remove (required)
- `--json` - Output as JSON

**Example:**
```bash
fractary-core work label-remove 123 --labels "wontfix"
```

### work label-list

List all available labels or labels on an issue.

```bash
fractary-core work label-list [options]
```

**Options:**
- `--issue <number>` - Show labels for specific issue
- `--json` - Output as JSON

**Examples:**
```bash
# List all repo labels
fractary-core work label-list

# List labels on a specific issue
fractary-core work label-list --issue 123
```

## Configuration Command

### work configure

Configure work tracking settings.

```bash
fractary-core work configure [options]
```

**Options:**
- `--platform <name>` - Platform: `github`, `gitlab`, `bitbucket`, `jira`, `linear`
- `--project <name>` - Project name (for Jira/Linear)
- `--yes` - Skip confirmation prompts
- `--json` - Output as JSON

**Examples:**
```bash
# Auto-detect platform from git remote
fractary-core work configure

# Explicitly set platform
fractary-core work configure --platform github

# Configure Jira project
fractary-core work configure --platform jira --project MYPROJ
```

## JSON Output

All commands support `--json` for structured output:

```bash
fractary-core work issue-fetch 123 --json
```

```json
{
  "status": "success",
  "data": {
    "number": 123,
    "title": "Bug: Login fails on mobile",
    "state": "open",
    "body": "...",
    "labels": ["bug", "priority:high"],
    "assignees": ["developer1"]
  }
}
```

## Environment Variables

```bash
# GitHub credentials
export GITHUB_TOKEN=ghp_your_token

# GitLab credentials
export GITLAB_TOKEN=glpat_your_token

# Bitbucket credentials
export BITBUCKET_TOKEN=your_token

# Jira credentials
export JIRA_TOKEN=your_jira_token

# Linear credentials
export LINEAR_API_KEY=lin_api_your_key
```

## Other Interfaces

- **SDK:** [Work API](/docs/sdk/js/work.md)
- **MCP:** [Work Tools](/docs/mcp/server/work.md)
- **Plugin:** [Work Plugin](/docs/plugins/work.md)
- **Configuration:** [Work Config](/docs/guides/configuration.md#work-toolset)

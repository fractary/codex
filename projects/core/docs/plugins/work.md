# Work Plugin - Claude Code Reference

Claude Code plugin reference for the Work toolset (`fractary-work`). Work tracking across GitHub Issues, Jira, and Linear.

## Overview

The Work plugin provides slash commands and agents for managing work items, issues, comments, labels, and milestones directly from Claude Code.

## Installation

Add to your Claude Code settings:

```json
{
  "plugins": ["fractary-work"]
}
```

## Configuration

The plugin uses configuration from `.fractary/config.yaml`:

```yaml
work:
  active_handler: github
  handlers:
    github:
      owner: myorg
      repo: myrepo
      token: ${GITHUB_TOKEN}
```

Initialize with:

```bash
fractary-core:config-init --plugins work
```

## Slash Commands

### /issue-create

Create a new issue.

**Usage:**
```
/issue-create "Issue title" [options]
```

**Options:**
- `--type <type>` - Work type: feature, bug, chore, etc.
- `--labels <labels>` - Comma-separated labels
- `--assignees <users>` - Comma-separated usernames
- `--body <text>` - Issue description

**Examples:**
```
/issue-create "Add user authentication" --type feature --labels "enhancement"
/issue-create "Login fails on mobile" --type bug --labels "bug,priority:high"
```

### /issue-fetch

Fetch an issue by number.

**Usage:**
```
/issue-fetch <issue-number>
```

**Example:**
```
/issue-fetch 123
```

### /issue-list

List issues.

**Usage:**
```
/issue-list [options]
```

**Options:**
- `--state <state>` - Filter: open, closed, all
- `--labels <labels>` - Filter by labels
- `--assignee <user>` - Filter by assignee

**Example:**
```
/issue-list --state open --labels bug
```

### /issue-search

Search issues.

**Usage:**
```
/issue-search "<query>" [options]
```

**Example:**
```
/issue-search "authentication" --state open
```

### /issue-update

Update an issue.

**Usage:**
```
/issue-update <issue-number> [options]
```

**Options:**
- `--title <text>` - New title
- `--body <text>` - New description
- `--state <state>` - open or closed

**Example:**
```
/issue-update 123 --state closed
```

### /issue-comment

Post a comment on an issue.

**Usage:**
```
/issue-comment <issue-number> "<comment>"
```

**Example:**
```
/issue-comment 123 "Investigation complete, root cause identified"
```

### /issue-refine

Refine issue requirements through clarifying questions.

**Usage:**
```
/issue-refine <issue-number>
```

This command delegates to the `fractary-work:issue-refine-agent` for interactive refinement.

### /issue-create-bulk

Create multiple related issues.

**Usage:**
```
/issue-create-bulk [context]
```

This command delegates to the `fractary-work:issue-bulk-creator` agent to analyze context and create multiple issues.

## Agents

### fractary-work:issue-refine-agent

Reviews GitHub issues and asks clarifying questions to ensure requirement clarity. Focuses on WHAT (requirements, goals, scope, acceptance criteria), not HOW (implementation).

**Triggered by:**
- `/issue-refine` command
- Proactively when user mentions refining requirements

**Capabilities:**
- Analyzes existing issue content
- Identifies ambiguous requirements
- Asks targeted clarifying questions
- Updates issue with refined requirements

### fractary-work:issue-bulk-creator

Autonomous agent for creating multiple related issues at once. Analyzes project structure and conversation context to intelligently determine what issues to create.

**Triggered by:**
- `/issue-create-bulk` command
- When user requests creating multiple issues

**Capabilities:**
- Analyzes project structure
- Presents creation plan for confirmation
- Creates multiple issues with proper labels
- Links related issues

## Usage Examples

### Creating a Feature Issue

```
User: I need to implement user authentication for the app

Claude: I'll create an issue for this feature.

/issue-create "Implement user authentication" --type feature --labels "enhancement,auth" --body "Add user authentication with login/logout functionality"

Issue #45 created: https://github.com/myorg/myrepo/issues/45
```

### Refining Requirements

```
User: Can you refine issue #45 to make the requirements clearer?

Claude: [Uses fractary-work:issue-refine-agent]

I've analyzed issue #45 and have some clarifying questions:

1. What authentication method should be used? (JWT, session-based, OAuth)
2. Should there be a "remember me" option?
3. What are the password requirements?
4. Is two-factor authentication required?

Please provide answers so I can update the issue with clearer requirements.
```

### Bulk Issue Creation

```
User: I need to break down the auth feature into smaller issues

Claude: [Uses fractary-work:issue-bulk-creator]

Based on the auth feature, here's my plan for creating issues:

1. "Add user registration endpoint" - API endpoint for new users
2. "Add login/logout endpoints" - Authentication endpoints
3. "Implement JWT token handling" - Token generation and validation
4. "Add password reset flow" - Password recovery feature
5. "Create auth middleware" - Route protection

Should I proceed with creating these issues?
```

## Integration with FABER Workflow

The Work plugin integrates with FABER workflow phases:

- **Frame phase**: Use `/issue-fetch` to retrieve work item details
- **Architect phase**: Use `/issue-comment` with `--faber-context architect` to document design decisions
- **Build phase**: Use `/issue-comment` to log progress
- **Evaluate phase**: Use `/issue-comment` to document testing results
- **Release phase**: Use `/issue-update` to close issues

## Other Interfaces

- **SDK:** [Work API](/docs/sdk/js/work.md)
- **CLI:** [Work Commands](/docs/cli/work.md)
- **MCP:** [Work Tools](/docs/mcp/server/work.md)
- **Configuration:** [Work Config](/docs/guides/configuration.md#work-toolset)

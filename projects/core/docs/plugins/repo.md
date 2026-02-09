# Repo Plugin - Claude Code Reference

Claude Code plugin reference for the Repo toolset (`fractary-repo`). Repository and Git operations.

## Overview

The Repo plugin provides slash commands and agents for Git operations, branch management, commits, pull requests, and worktrees directly from Claude Code.

## Installation

Add to your Claude Code settings:

```json
{
  "plugins": ["fractary-repo"]
}
```

## Configuration

The plugin uses configuration from `.fractary/config.yaml`:

```yaml
repo:
  active_handler: github
  handlers:
    github:
      token: ${GITHUB_TOKEN}
  defaults:
    default_branch: main
```

## Slash Commands

### /branch-create

Create a new git branch.

**Usage:**
```
/branch-create <name> [options]
```

**Options:**
- `--base <branch>` - Base branch (default: main)
- `--checkout` - Checkout after creation

**Example:**
```
/branch-create feature/auth --base develop --checkout
```

### /commit

Create a commit with conventional commit format.

**Usage:**
```
/commit [options]
```

**Options:**
- `--message <text>` - Commit message
- `--type <type>` - Conventional type: feat, fix, chore, etc.
- `--scope <scope>` - Commit scope
- `--breaking` - Breaking change flag

**Example:**
```
/commit --message "Add authentication middleware" --type feat --scope auth
```

### /commit-push

Commit and push in one command.

**Usage:**
```
/commit-push [options]
```

Uses same options as `/commit`.

**Example:**
```
/commit-push --message "Fix login bug" --type fix
```

### /commit-push-pr

Commit, push, and create a pull request.

**Usage:**
```
/commit-push-pr [options]
```

**Options:**
- Commit options: `--message`, `--type`, `--scope`
- PR options: `--title`, `--body`, `--base`, `--draft`

**Example:**
```
/commit-push-pr --message "Add auth" --type feat --title "Feature: Authentication" --body "Implements JWT auth"
```

### /commit-push-pr-merge

Full workflow: commit, push, create PR, and merge.

**Usage:**
```
/commit-push-pr-merge [options]
```

**Options:**
- All options from `/commit-push-pr`
- `--merge-method <method>` - merge, squash, rebase
- `--delete-branch` - Delete branch after merge

### /pr-create

Create a pull request.

**Usage:**
```
/pr-create [options]
```

**Options:**
- `--title <text>` - PR title
- `--body <text>` - PR description
- `--base <branch>` - Target branch
- `--draft` - Create as draft

**Example:**
```
/pr-create --title "Add authentication" --base main
```

### /pr-merge

Merge a pull request.

**Usage:**
```
/pr-merge <pr-number> [options]
```

**Options:**
- `--method <method>` - merge, squash, rebase
- `--delete-branch` - Delete branch after merge

**Example:**
```
/pr-merge 42 --method squash --delete-branch
```

### /pr-review

Review a pull request.

**Usage:**
```
/pr-review <pr-number>
```

This command delegates to the `fractary-repo:pr-review-agent` for comprehensive analysis.

### /pull

Pull from remote.

**Usage:**
```
/pull [options]
```

**Options:**
- `--rebase` - Rebase instead of merge

### /worktree-create

Create a git worktree for parallel work.

**Usage:**
```
/worktree-create [options]
```

**Options:**
- `--path <path>` - Worktree path
- `--branch <name>` - Branch to checkout
- `--create-branch` - Create branch if doesn't exist

### /worktree-list

List all git worktrees.

**Usage:**
```
/worktree-list
```

### /worktree-prune

Clean up stale worktrees.

**Usage:**
```
/worktree-prune [--dry-run]
```

### /worktree-remove

Remove a git worktree.

**Usage:**
```
/worktree-remove <path> [--force]
```

## Agents

### fractary-repo:pr-review-agent

Analyzes pull requests comprehensively including comments, reviews, CI status, and merge conflicts. Provides intelligent recommendations on whether to approve.

**Triggered by:**
- `/pr-review` command
- Proactively when user requests PR analysis

**Capabilities:**
- Reviews code changes
- Checks CI/CD status
- Analyzes review comments
- Detects merge conflicts
- Provides approval recommendations

## Usage Examples

### Feature Development Workflow

```
User: Create a branch for the auth feature

Claude: /branch-create feature/auth --checkout

Created and checked out branch: feature/auth

User: [Makes code changes]

User: Commit and create a PR

Claude: /commit-push-pr --message "Add authentication system" --type feat --title "Feature: User Authentication" --body "Implements JWT-based authentication"

Committed: feat: Add authentication system
Pushed to origin/feature/auth
PR #42 created: https://github.com/myorg/myrepo/pull/42
```

### PR Review

```
User: Review PR #42

Claude: [Uses fractary-repo:pr-review-agent]

## PR Review: #42 - Feature: User Authentication

### Summary
This PR adds JWT-based authentication with login/logout endpoints.

### Code Analysis
- **Changes**: 8 files, +342/-12 lines
- **Tests**: Added 15 new tests, all passing
- **Coverage**: 85% (meets threshold)

### CI Status
- ✅ Build: Passed
- ✅ Tests: Passed
- ✅ Lint: Passed

### Review Comments
- 2 comments resolved
- No blocking issues

### Recommendation
✅ **Approve** - Code looks good, all checks passing

Would you like me to approve and merge this PR?
```

### Parallel Development with Worktrees

```
User: I need to work on a hotfix while keeping my current changes

Claude: /worktree-create --path ../myrepo-hotfix --branch hotfix/urgent-fix --create-branch

Created worktree at ../myrepo-hotfix on branch hotfix/urgent-fix

You can now work on the hotfix in ../myrepo-hotfix without affecting your current work.

User: [Makes hotfix]

User: Commit and merge the hotfix

Claude: (from hotfix worktree)
/commit-push-pr-merge --message "Fix critical security issue" --type fix --title "Hotfix: Security patch" --merge-method squash

Committed, pushed, PR created and merged.
```

## Other Interfaces

- **SDK:** [Repo API](/docs/sdk/js/repo.md)
- **CLI:** [Repo Commands](/docs/cli/repo.md)
- **MCP:** [Repo Tools](/docs/mcp/server/repo.md)
- **Configuration:** [Repo Config](/docs/guides/configuration.md#repo-toolset)

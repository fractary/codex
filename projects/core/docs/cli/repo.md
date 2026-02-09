# Repo Module - CLI Reference

Command-line reference for the Repo module. Repository and Git operations.

## Command Structure

```bash
fractary-core repo <command> [arguments] [options]
```

All commands use dash-separated names (e.g., `branch-create`, `pr-merge`).

## Branch Commands

### repo branch-create

Create a new branch.

```bash
fractary-core repo branch-create <name> [options]
```

**Arguments:**
- `name` - Branch name

**Options:**
- `--base <branch>` - Base branch
- `--checkout` - Checkout after creation
- `--json` - Output as JSON

**Examples:**
```bash
# Create feature branch
fractary-core repo branch-create feature/auth

# Create from develop branch and checkout
fractary-core repo branch-create feature/auth --base develop --checkout
```

### repo branch-delete

Delete a branch.

```bash
fractary-core repo branch-delete <name> [options]
```

**Arguments:**
- `name` - Branch name

**Options:**
- `--location <where>` - Delete location: `local`, `remote`, `both` (default: `local`)
- `--force` - Force delete even if not merged
- `--json` - Output as JSON

**Examples:**
```bash
# Delete local branch
fractary-core repo branch-delete feature/old-feature

# Delete both local and remote
fractary-core repo branch-delete feature/old-feature --location both

# Force delete unmerged branch
fractary-core repo branch-delete feature/experiment --force
```

### repo branch-list

List branches.

```bash
fractary-core repo branch-list [options]
```

**Options:**
- `--merged` - Show only merged branches
- `--stale` - Show only stale branches
- `--pattern <pattern>` - Filter by pattern
- `--limit <n>` - Limit results (default: `20`)
- `--json` - Output as JSON

**Examples:**
```bash
# List all branches
fractary-core repo branch-list

# List merged branches
fractary-core repo branch-list --merged

# Filter by pattern
fractary-core repo branch-list --pattern "feature/*"
```

## Commit Command

### repo commit

Create a commit with conventional commit format.

```bash
fractary-core repo commit [options]
```

**Options:**
- `--message <msg>` - Commit message (required)
- `--type <type>` - Commit type: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`, `build`
- `--scope <scope>` - Commit scope
- `--work-id <id>` - Work item ID
- `--breaking` - Mark as breaking change
- `--all` - Stage all changes before committing
- `--json` - Output as JSON

**Examples:**
```bash
# Simple commit
fractary-core repo commit --message "Add login form"

# Conventional commit
fractary-core repo commit \
  --message "Add JWT authentication" \
  --type feat \
  --scope auth

# Breaking change with all staged
fractary-core repo commit \
  --message "Change API response format" \
  --type feat \
  --breaking \
  --all

# Link to work item
fractary-core repo commit \
  --message "Fix login bug" \
  --type fix \
  --work-id 123
```

## Pull Request Commands

### repo pr-create

Create a new pull request.

```bash
fractary-core repo pr-create [options]
```

**Options:**
- `--title <title>` - PR title (required)
- `--body <body>` - PR body/description
- `--base <branch>` - Base branch (default: main/master)
- `--head <branch>` - Head branch (default: current branch)
- `--draft` - Create as draft PR
- `--json` - Output as JSON

**Examples:**
```bash
# Create PR
fractary-core repo pr-create \
  --title "Add authentication system" \
  --body "Implements JWT authentication"

# Create draft PR
fractary-core repo pr-create \
  --title "WIP: New feature" \
  --draft
```

### repo pr-list

List pull requests.

```bash
fractary-core repo pr-list [options]
```

**Options:**
- `--state <state>` - Filter by state: `open`, `closed`, `all` (default: `open`)
- `--author <username>` - Filter by author
- `--limit <n>` - Limit results (default: `10`)
- `--json` - Output as JSON

**Examples:**
```bash
# List open PRs
fractary-core repo pr-list

# List my PRs
fractary-core repo pr-list --author myusername

# List all PRs as JSON
fractary-core repo pr-list --state all --json
```

### repo pr-merge

Merge a pull request.

```bash
fractary-core repo pr-merge <number> [options]
```

**Arguments:**
- `number` - PR number

**Options:**
- `--strategy <strategy>` - Merge strategy: `merge`, `squash`, `rebase` (default: `merge`)
- `--delete-branch` - Delete branch after merge
- `--json` - Output as JSON

**Examples:**
```bash
# Merge PR
fractary-core repo pr-merge 42

# Squash merge and delete branch
fractary-core repo pr-merge 42 --strategy squash --delete-branch
```

### repo pr-review

Review a pull request.

```bash
fractary-core repo pr-review <number> [options]
```

**Arguments:**
- `number` - PR number

**Options:**
- `--approve` - Approve the PR
- `--request-changes` - Request changes
- `--comment <text>` - Add review comment
- `--json` - Output as JSON

**Examples:**
```bash
# Approve PR
fractary-core repo pr-review 42 --approve

# Request changes with comment
fractary-core repo pr-review 42 --request-changes --comment "Please add tests"

# Comment only
fractary-core repo pr-review 42 --comment "Looks good overall"
```

## Tag Commands

### repo tag-create

Create a new tag.

```bash
fractary-core repo tag-create <name> [options]
```

**Arguments:**
- `name` - Tag name

**Options:**
- `--message <msg>` - Tag message (creates annotated tag)
- `--sign` - Create a GPG-signed tag
- `--force` - Replace existing tag
- `--json` - Output as JSON

**Examples:**
```bash
# Create lightweight tag
fractary-core repo tag-create v1.0.0

# Create annotated tag
fractary-core repo tag-create v1.0.0 --message "Release version 1.0.0"

# Create signed tag
fractary-core repo tag-create v1.0.0 --message "Release 1.0.0" --sign
```

### repo tag-push

Push tag(s) to remote.

```bash
fractary-core repo tag-push <name> [options]
```

**Arguments:**
- `name` - Tag name or `all` for all tags

**Options:**
- `--remote <name>` - Remote name (default: `origin`)
- `--json` - Output as JSON

**Examples:**
```bash
# Push single tag
fractary-core repo tag-push v1.0.0

# Push all tags
fractary-core repo tag-push all

# Push to specific remote
fractary-core repo tag-push v1.0.0 --remote upstream
```

### repo tag-list

List tags.

```bash
fractary-core repo tag-list [options]
```

**Options:**
- `--pattern <pattern>` - Filter by pattern
- `--latest <n>` - Show only latest N tags
- `--json` - Output as JSON

**Examples:**
```bash
# List all tags
fractary-core repo tag-list

# List release tags
fractary-core repo tag-list --pattern "v*"

# Show latest 5 tags
fractary-core repo tag-list --latest 5
```

## Worktree Commands

### repo worktree-create

Create a new worktree.

```bash
fractary-core repo worktree-create <branch> [options]
```

**Arguments:**
- `branch` - Branch name

**Options:**
- `--path <path>` - Worktree path (default: `.worktrees/<branch>`)
- `--work-id <id>` - Work item ID
- `--base <branch>` - Base branch to create from
- `--no-checkout` - Skip checking out files
- `--json` - Output as JSON

**Examples:**
```bash
# Create worktree for feature branch
fractary-core repo worktree-create feature/parallel-work

# Create with custom path and base
fractary-core repo worktree-create feature/auth \
  --path ../myrepo-auth \
  --base develop

# Link to work item
fractary-core repo worktree-create feature/fix-123 --work-id 123
```

### repo worktree-list

List worktrees.

```bash
fractary-core repo worktree-list [options]
```

**Options:**
- `--json` - Output as JSON

**Example:**
```bash
fractary-core repo worktree-list
```

### repo worktree-remove

Remove a worktree.

```bash
fractary-core repo worktree-remove <path> [options]
```

**Arguments:**
- `path` - Worktree path

**Options:**
- `--force` - Force removal even with uncommitted changes
- `--json` - Output as JSON

**Example:**
```bash
fractary-core repo worktree-remove .worktrees/feature/old-feature --force
```

### repo worktree-cleanup

Clean up stale worktrees.

```bash
fractary-core repo worktree-cleanup [options]
```

**Options:**
- `--merged` - Remove only merged worktrees
- `--stale` - Remove only stale worktrees
- `--dry-run` - Show what would be removed without removing
- `--json` - Output as JSON

**Examples:**
```bash
# Preview cleanup
fractary-core repo worktree-cleanup --dry-run

# Clean up merged worktrees
fractary-core repo worktree-cleanup --merged

# Clean up stale worktrees
fractary-core repo worktree-cleanup --stale
```

## Status and Sync Commands

### repo status

Show repository status.

```bash
fractary-core repo status [options]
```

**Options:**
- `--json` - Output as JSON

**Example:**
```bash
fractary-core repo status
```

**Output:**
```
Repository Status
Branch: feature/auth

Staged changes:
  + src/auth.ts

Modified changes:
  M src/config.ts

Untracked files:
  ? src/new-file.ts
```

### repo push

Push commits to remote.

```bash
fractary-core repo push [options]
```

**Options:**
- `--remote <name>` - Remote name (default: `origin`)
- `--set-upstream` - Set upstream branch
- `--force` - Force push (use with caution)
- `--json` - Output as JSON

**Examples:**
```bash
# Push to origin
fractary-core repo push

# Set upstream on first push
fractary-core repo push --set-upstream

# Push to different remote
fractary-core repo push --remote upstream
```

### repo pull

Pull changes from remote.

```bash
fractary-core repo pull [options]
```

**Options:**
- `--remote <name>` - Remote name (default: `origin`)
- `--rebase` - Rebase instead of merge
- `--json` - Output as JSON

**Examples:**
```bash
# Pull from origin
fractary-core repo pull

# Pull with rebase
fractary-core repo pull --rebase
```

## JSON Output

All commands support `--json` for structured output:

```bash
fractary-core repo status --json
```

```json
{
  "status": "success",
  "data": {
    "branch": "feature/auth",
    "staged": ["src/auth.ts"],
    "modified": ["src/config.ts"],
    "untracked": ["src/new-file.ts"]
  }
}
```

## Other Interfaces

- **SDK:** [Repo API](/docs/sdk/js/repo.md)
- **MCP:** [Repo Tools](/docs/mcp/server/repo.md)
- **Plugin:** [Repo Plugin](/docs/plugins/repo.md)
- **Configuration:** [Repo Config](/docs/guides/configuration.md#repo-toolset)

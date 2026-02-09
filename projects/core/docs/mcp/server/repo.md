# Repo Toolset - MCP Tools Reference

MCP tools reference for the Repo toolset. 37 tools for repository and Git operations.

## Tool Naming Convention

```
fractary_repo_{resource}_{action}
```

## Status Tools

### fractary_repo_status

Get repository status.

**Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "branch": "feature/auth",
    "ahead": 2,
    "behind": 0,
    "staged": ["src/auth.ts"],
    "modified": ["README.md"],
    "untracked": ["temp.txt"]
  }
}
```

### fractary_repo_branch_current

Get current branch name.

**Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "feature/auth"
  }
}
```

### fractary_repo_is_dirty

Check if repository has uncommitted changes.

**Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "dirty": true
  }
}
```

### fractary_repo_diff

Get diff of changes.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `staged` | boolean | No | Show only staged changes |
| `base` | string | No | Base branch/commit for comparison |
| `head` | string | No | Head branch/commit for comparison |

**Example:**
```json
{
  "staged": true
}
```

## Branch Tools

### fractary_repo_branch_create

Create a new branch.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Branch name |
| `base_branch` | string | No | Base branch to create from |
| `from_protected` | boolean | No | Allow creating from protected branch |

**Example:**
```json
{
  "name": "feature/auth",
  "base_branch": "develop"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "feature/auth",
    "sha": "abc123...",
    "isDefault": false
  }
}
```

### fractary_repo_branch_delete

Delete a branch.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Branch name to delete |
| `force` | boolean | No | Force delete unmerged branch |
| `location` | string | No | Where to delete the branch: `local`, `remote`, `both` |

**Example:**
```json
{
  "name": "feature/old-branch",
  "location": "both"
}
```

### fractary_repo_branch_list

List branches.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pattern` | string | No | Pattern to filter branches |
| `merged` | boolean | No | Only show merged branches |
| `limit` | number | No | Maximum number of branches |

**Example:**
```json
{
  "pattern": "feature/*",
  "merged": false
}
```

### fractary_repo_branch_get

Get branch details.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Branch name |

**Example:**
```json
{
  "name": "feature/auth"
}
```

### fractary_repo_checkout

Checkout a branch.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `branch` | string | Yes | Branch name to checkout |

**Example:**
```json
{
  "branch": "feature/auth"
}
```

### fractary_repo_branch_name_generate

Generate a semantic branch name.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | Branch type: `feature`, `fix`, `chore`, `docs` |
| `description` | string | Yes | Brief description |
| `work_id` | string | No | Work item ID |

**Example:**
```json
{
  "type": "feature",
  "description": "user authentication",
  "work_id": "123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "feature/123-user-authentication"
  }
}
```

## Staging Tools

### fractary_repo_stage

Stage files for commit.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patterns` | string[] | Yes | File patterns to stage |

**Example:**
```json
{
  "patterns": ["src/auth.ts", "tests/auth.test.ts"]
}
```

### fractary_repo_stage_all

Stage all changes.

**Parameters:** None

### fractary_repo_unstage

Unstage files.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patterns` | string[] | Yes | File patterns to unstage |

**Example:**
```json
{
  "patterns": ["src/temp.ts"]
}
```

## Commit Tools

### fractary_repo_commit

Create a commit.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | Yes | Commit message |
| `type` | string | No | Conventional commit type: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore` |
| `scope` | string | No | Commit scope |
| `body` | string | No | Commit body/description |
| `breaking` | boolean | No | Mark as breaking change |
| `work_id` | string | No | Work item ID to link |

**Example:**
```json
{
  "message": "Add JWT authentication",
  "type": "feat",
  "scope": "auth",
  "work_id": "123"
}
```

### fractary_repo_commit_get

Get commit details.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ref` | string | Yes | Commit ref (SHA, HEAD, etc.) |

**Example:**
```json
{
  "ref": "HEAD"
}
```

### fractary_repo_commit_list

List commits.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | Maximum number of commits |
| `branch` | string | No | Branch to list commits from |
| `since` | string | No | Only commits after this date |
| `until` | string | No | Only commits before this date |
| `author` | string | No | Filter by commit author |

**Example:**
```json
{
  "limit": 10,
  "branch": "main"
}
```

## Push/Pull/Fetch Tools

### fractary_repo_push

Push to remote.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `branch` | string | No | Branch to push |
| `remote` | string | No | Remote name |
| `force` | boolean | No | Force push |
| `set_upstream` | boolean | No | Set upstream tracking |

**Example:**
```json
{
  "branch": "feature/auth",
  "set_upstream": true
}
```

### fractary_repo_pull

Pull from remote.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `branch` | string | No | Branch to pull |
| `remote` | string | No | Remote name |
| `rebase` | boolean | No | Use rebase instead of merge |

**Example:**
```json
{
  "rebase": true
}
```

### fractary_repo_fetch

Fetch from remote.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `remote` | string | No | Remote name |

**Example:**
```json
{
  "remote": "origin"
}
```

## Pull Request Tools

### fractary_repo_pr_create

Create a pull request.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | PR title |
| `body` | string | No | PR description |
| `base` | string | No | Base branch |
| `head` | string | No | Head branch |
| `draft` | boolean | No | Create as draft |

**Example:**
```json
{
  "title": "Add authentication system",
  "body": "Implements JWT authentication\n\n## Changes\n- Add auth middleware\n- Add login endpoint",
  "base": "main",
  "draft": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "number": 42,
    "title": "Add authentication system",
    "state": "open",
    "url": "https://github.com/myorg/myrepo/pull/42"
  }
}
```

### fractary_repo_pr_get

Get PR details.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number` | number | Yes | PR number |

**Example:**
```json
{
  "number": 42
}
```

### fractary_repo_pr_update

Update a pull request.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number` | number | Yes | PR number |
| `title` | string | No | New title |
| `body` | string | No | New description |
| `state` | string | No | New state: `open`, `closed` |

**Example:**
```json
{
  "number": 42,
  "title": "Add authentication system (v2)"
}
```

### fractary_repo_pr_comment

Comment on a pull request.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number` | number | Yes | PR number |
| `body` | string | Yes | Comment text |

**Example:**
```json
{
  "number": 42,
  "body": "LGTM, just one minor suggestion on the error handling."
}
```

### fractary_repo_pr_review

Review a pull request.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number` | number | Yes | PR number |
| `action` | string | Yes | Review action to perform: `approve`, `request_changes`, `comment` |
| `comment` | string | No | Review comment |

**Example:**
```json
{
  "number": 42,
  "action": "request_changes",
  "comment": "Please add error handling for invalid tokens"
}
```

### fractary_repo_pr_request_review

Request reviewers for a PR.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number` | number | Yes | PR number |
| `reviewers` | string[] | Yes | Usernames of reviewers |

**Example:**
```json
{
  "number": 42,
  "reviewers": ["reviewer1", "reviewer2"]
}
```

### fractary_repo_pr_approve

Approve a pull request.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number` | number | Yes | PR number |
| `comment` | string | No | Approval comment |

**Example:**
```json
{
  "number": 42,
  "comment": "Looks good to me!"
}
```

### fractary_repo_pr_merge

Merge a pull request.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number` | number | Yes | PR number |
| `strategy` | string | No | Merge strategy: `merge`, `squash`, `rebase` |
| `delete_branch` | boolean | No | Delete branch after merge |

**Example:**
```json
{
  "number": 42,
  "strategy": "squash",
  "delete_branch": true
}
```

### fractary_repo_pr_list

List pull requests.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `state` | string | No | Filter by state: `open`, `closed`, `all` |
| `author` | string | No | Filter by author |
| `limit` | number | No | Maximum number of PRs |

**Example:**
```json
{
  "state": "open",
  "limit": 20
}
```

## Tag Tools

### fractary_repo_tag_create

Create a Git tag.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Tag name |
| `message` | string | No | Tag message (annotated tag) |
| `commit` | string | No | Commit to tag (default: HEAD) |

**Example:**
```json
{
  "name": "v1.0.0",
  "message": "Release v1.0.0",
  "commit": "HEAD"
}
```

### fractary_repo_tag_delete

Delete a Git tag.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Tag name |

**Example:**
```json
{
  "name": "v0.9.0-beta"
}
```

### fractary_repo_tag_push

Push a tag to remote.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Tag name |
| `remote` | string | No | Remote name |

**Example:**
```json
{
  "name": "v1.0.0",
  "remote": "origin"
}
```

### fractary_repo_tag_list

List Git tags.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pattern` | string | No | Pattern to filter tags |
| `latest` | number | No | Get only the latest N tags |

**Example:**
```json
{
  "pattern": "v1.*",
  "latest": 5
}
```

## Worktree Tools

### fractary_repo_worktree_create

Create a Git worktree.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Worktree path |
| `branch` | string | Yes | Branch name |
| `base_branch` | string | No | Base branch to create from |

**Example:**
```json
{
  "path": "../myrepo-feature",
  "branch": "feature/auth",
  "base_branch": "main"
}
```

### fractary_repo_worktree_list

List Git worktrees.

**Parameters:** None

### fractary_repo_worktree_remove

Remove a Git worktree.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Worktree path |
| `force` | boolean | No | Force removal |

**Example:**
```json
{
  "path": "../myrepo-feature",
  "force": false
}
```

### fractary_repo_worktree_prune

Prune stale worktrees.

**Parameters:** None

### fractary_repo_worktree_cleanup

Cleanup worktrees.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `merged` | boolean | No | Only clean merged worktrees |
| `force` | boolean | No | Force cleanup |
| `delete_branch` | boolean | No | Delete associated branches |

**Example:**
```json
{
  "merged": true,
  "delete_branch": true
}
```

## Tool Summary

| Tool | Description |
|------|-------------|
| `fractary_repo_status` | Get repository status |
| `fractary_repo_branch_current` | Get current branch name |
| `fractary_repo_is_dirty` | Check for uncommitted changes |
| `fractary_repo_diff` | Get diff of changes |
| `fractary_repo_branch_create` | Create a new branch |
| `fractary_repo_branch_delete` | Delete a branch |
| `fractary_repo_branch_list` | List branches |
| `fractary_repo_branch_get` | Get branch details |
| `fractary_repo_checkout` | Checkout a branch |
| `fractary_repo_branch_name_generate` | Generate a semantic branch name |
| `fractary_repo_stage` | Stage files for commit |
| `fractary_repo_stage_all` | Stage all changes |
| `fractary_repo_unstage` | Unstage files |
| `fractary_repo_commit` | Create a commit |
| `fractary_repo_commit_get` | Get commit details |
| `fractary_repo_commit_list` | List commits |
| `fractary_repo_push` | Push to remote |
| `fractary_repo_pull` | Pull from remote |
| `fractary_repo_fetch` | Fetch from remote |
| `fractary_repo_pr_create` | Create a pull request |
| `fractary_repo_pr_get` | Get PR details |
| `fractary_repo_pr_update` | Update a pull request |
| `fractary_repo_pr_comment` | Comment on a pull request |
| `fractary_repo_pr_review` | Review a pull request |
| `fractary_repo_pr_request_review` | Request reviewers for a PR |
| `fractary_repo_pr_approve` | Approve a pull request |
| `fractary_repo_pr_merge` | Merge a pull request |
| `fractary_repo_pr_list` | List pull requests |
| `fractary_repo_tag_create` | Create a Git tag |
| `fractary_repo_tag_delete` | Delete a Git tag |
| `fractary_repo_tag_push` | Push a tag to remote |
| `fractary_repo_tag_list` | List Git tags |
| `fractary_repo_worktree_create` | Create a Git worktree |
| `fractary_repo_worktree_list` | List Git worktrees |
| `fractary_repo_worktree_remove` | Remove a Git worktree |
| `fractary_repo_worktree_prune` | Prune stale worktrees |
| `fractary_repo_worktree_cleanup` | Cleanup worktrees |

## Other Interfaces

- **SDK:** [Repo API](/docs/sdk/js/repo.md)
- **CLI:** [Repo Commands](/docs/cli/repo.md)
- **Plugin:** [Repo Plugin](/docs/plugins/repo.md)

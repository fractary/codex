# Repo Toolset - SDK Reference

TypeScript API reference for the Repo toolset. Repository management with Git and platform integration.

## RepoManager

```typescript
import { RepoManager } from '@fractary/core/repo';

const repoManager = new RepoManager({
  provider: 'github',
  config: {
    owner: 'myorg',
    repo: 'myrepo',
    token: process.env.GITHUB_TOKEN
  }
});
```

### Configuration

```typescript
interface RepoConfig {
  provider: 'github' | 'gitlab' | 'bitbucket';
  config: GitHubRepoConfig | GitLabConfig | BitbucketConfig;
}

interface GitHubRepoConfig {
  owner: string;
  repo: string;
  token: string;
  baseUrl?: string;
}

interface GitLabConfig {
  projectId: string | number;
  token: string;
  baseUrl?: string;
}

interface BitbucketConfig {
  workspace: string;
  repo: string;
  username: string;
  appPassword: string;
}
```

## Branch Operations

### createBranch()

Create a new branch.

```typescript
createBranch(name: string, options?: BranchCreateOptions): Promise<Branch>
```

**Parameters:**
- `name` - Branch name
- `options.base` (string, optional) - Base branch (default: main)
- `options.checkout` (boolean, optional) - Checkout after creation

**Example:**
```typescript
const branch = await repoManager.createBranch('feature/auth', {
  base: 'develop',
  checkout: true
});
```

### deleteBranch()

Delete a branch.

```typescript
deleteBranch(name: string, options?: BranchDeleteOptions): Promise<void>
```

**Parameters:**
- `name` - Branch name to delete
- `options.force` (boolean, optional) - Force delete unmerged branch
- `options.remote` (boolean, optional) - Delete remote branch

### listBranches()

List branches.

```typescript
listBranches(options?: BranchListOptions): Promise<Branch[]>
```

**Parameters:**
- `options.remote` (boolean, optional) - Include remote branches
- `options.merged` (boolean, optional) - Only merged branches

**Example:**
```typescript
const branches = await repoManager.listBranches({ remote: true });
```

### generateBranchName()

Generate a semantic branch name.

```typescript
generateBranchName(options: { type: string; description: string; workId?: string }): string
```

**Example:**
```typescript
const name = repoManager.generateBranchName({
  type: 'feature',
  description: 'user authentication',
  workId: '123'
});
// Returns: 'feature/123-user-authentication'
```

## Commit Operations

### commit()

Create a commit with conventional commit format.

```typescript
commit(options: CommitOptions): Commit
```

**Parameters:**
- `options.message` (string, required) - Commit message
- `options.type` (CommitType, optional) - Conventional commit type
- `options.scope` (string, optional) - Commit scope
- `options.breaking` (boolean, optional) - Breaking change flag
- `options.body` (string, optional) - Extended description
- `options.files` (string[], optional) - Files to stage

**Example:**
```typescript
const commit = repoManager.commit({
  message: 'Add JWT middleware',
  type: 'feat',
  scope: 'auth',
  breaking: false
});
```

### stage()

Stage files for commit.

```typescript
stage(patterns: string[]): void
stageAll(): void
```

**Example:**
```typescript
// Stage specific files
repoManager.stage(['src/auth.ts', 'tests/auth.test.ts']);

// Stage all changes
repoManager.stageAll();
```

### push() / pull()

Push and pull operations.

```typescript
push(options?: PushOptions): void
pull(options?: PullOptions): void
```

**Parameters:**
- `options.remote` (string, optional) - Remote name
- `options.branch` (string, optional) - Branch name
- `options.force` (boolean, optional) - Force push (push only)

## Pull Request Operations

### createPR()

Create a pull request.

```typescript
createPR(options: PRCreateOptions): Promise<PullRequest>
```

**Parameters:**
- `options.title` (string, required)
- `options.body` (string, optional)
- `options.base` (string, optional) - Target branch
- `options.head` (string, optional) - Source branch
- `options.draft` (boolean, optional)

**Example:**
```typescript
const pr = await repoManager.createPR({
  title: 'Add authentication system',
  body: 'Implements JWT authentication',
  base: 'main',
  draft: false
});
```

### mergePR()

Merge a pull request.

```typescript
mergePR(number: number, options?: PRMergeOptions): Promise<PullRequest>
```

**Parameters:**
- `number` - PR number
- `options.method` ('merge' | 'squash' | 'rebase', optional)

**Example:**
```typescript
const merged = await repoManager.mergePR(42, { method: 'squash' });
```

### listPRs()

List pull requests.

```typescript
listPRs(options?: PRListOptions): Promise<PullRequest[]>
```

### getPR()

Get a specific pull request.

```typescript
getPR(number: number): Promise<PullRequest>
```

## Tag Operations

```typescript
// Create a tag
createTag(name: string, options?: TagCreateOptions): void

// Delete a tag
deleteTag(name: string): void

// Push a tag to remote
pushTag(name: string, remote?: string): void

// List tags
listTags(options?: TagListOptions): Tag[]
```

**Example:**
```typescript
// Create annotated tag
repoManager.createTag('v1.0.0', {
  message: 'Release version 1.0.0',
  annotate: true
});

// Push tag
repoManager.pushTag('v1.0.0');
```

## Worktree Operations

```typescript
// Create a worktree
createWorktree(options: WorktreeCreateOptions): Worktree

// List all worktrees
listWorktrees(): Worktree[]

// Remove a worktree
removeWorktree(path: string, force?: boolean): void

// Cleanup stale worktrees
cleanupWorktrees(options?: WorktreeCleanupOptions): Promise<WorktreeCleanupResult>
```

**Example:**
```typescript
// Create worktree for parallel development
const worktree = repoManager.createWorktree({
  path: '../myrepo-feature',
  branch: 'feature/parallel-work',
  createBranch: true
});

// List worktrees
const worktrees = repoManager.listWorktrees();

// Cleanup stale worktrees
const result = await repoManager.cleanupWorktrees({ dryRun: false });
```

## Types

### Branch

```typescript
interface Branch {
  name: string;
  sha: string;
  isDefault: boolean;
  isProtected: boolean;
  upstream?: string;
}
```

### Commit

```typescript
interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  parents: string[];
}
```

### CommitType

```typescript
type CommitType = 'feat' | 'fix' | 'chore' | 'docs' | 'style' | 'refactor' | 'perf' | 'test';
```

### PullRequest

```typescript
interface PullRequest {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  head: string;
  base: string;
  author: string;
  url: string;
  draft: boolean;
  mergeable?: boolean;
}
```

### Tag

```typescript
interface Tag {
  name: string;
  sha: string;
  message?: string;
  tagger?: string;
  date?: string;
}
```

### Worktree

```typescript
interface Worktree {
  path: string;
  branch: string;
  sha: string;
  locked: boolean;
  prunable: boolean;
}
```

## Error Handling

```typescript
import { RepoError } from '@fractary/core';

try {
  await repoManager.createBranch('feature/test');
} catch (error) {
  if (error instanceof RepoError) {
    console.error('Repository error:', error.message);
  }
}
```

## Other Interfaces

- **CLI:** [Repo Commands](/docs/cli/repo.md)
- **MCP:** [Repo Tools](/docs/mcp/server/repo.md)
- **Plugin:** [Repo Plugin](/docs/plugins/repo.md)
- **Configuration:** [Repo Config](/docs/guides/configuration.md#repo-toolset)

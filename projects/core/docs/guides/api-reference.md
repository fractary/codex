# Fractary Core API Reference

Complete API documentation for the Fractary Core SDK.

## Table of Contents

- [Work Module](#work-module)
- [Repo Module](#repo-module)
- [Spec Module](#spec-module)
- [Logs Module](#logs-module)
- [File Module](#file-module)
- [Docs Module](#docs-module)
- [Common Types](#common-types)

## Work Module

Work tracking across GitHub Issues, Jira, and Linear.

### WorkManager

```typescript
import { WorkManager } from '@fractary/core/work';

const workManager = new WorkManager({
  provider: 'github',
  config: {
    owner: 'myorg',
    repo: 'myrepo',
    token: process.env.GITHUB_TOKEN
  }
});
```

#### Configuration

```typescript
interface WorkConfig {
  provider: 'github' | 'jira' | 'linear';
  config: GitHubConfig | JiraConfig | LinearConfig;
}

interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
}
```

### Issue Operations

#### createIssue()

Create a new issue.

```typescript
createIssue(options: IssueCreateOptions): Promise<Issue>
```

**Parameters:**
- `options.title` (string, required) - Issue title
- `options.body` (string, optional) - Issue description
- `options.workType` (WorkType, optional) - Type of work
- `options.labels` (string[], optional) - Labels to apply
- `options.assignees` (string[], optional) - Users to assign
- `options.milestone` (string, optional) - Milestone to assign

**Returns:** Promise<Issue>

**Example:**
```typescript
const issue = await workManager.createIssue({
  title: 'Add user authentication',
  body: 'Implement JWT-based authentication',
  workType: 'feature',
  labels: ['enhancement', 'priority:high'],
  assignees: ['developer1']
});
```

#### fetchIssue()

Fetch an issue by ID or number.

```typescript
fetchIssue(issueId: string | number): Promise<Issue>
```

**Parameters:**
- `issueId` - Issue number or ID

**Returns:** Promise<Issue>

**Example:**
```typescript
const issue = await workManager.fetchIssue(123);
console.log(issue.title, issue.state);
```

#### updateIssue()

Update an existing issue.

```typescript
updateIssue(issueId: string | number, options: IssueUpdateOptions): Promise<Issue>
```

**Parameters:**
- `issueId` - Issue number or ID
- `options.title` (string, optional) - New title
- `options.body` (string, optional) - New description
- `options.state` ('open' | 'closed', optional) - New state

**Returns:** Promise<Issue>

#### searchIssues()

Search for issues.

```typescript
searchIssues(query: string, filters?: IssueFilters): Promise<Issue[]>
```

**Parameters:**
- `query` - Search query string
- `filters.state` ('open' | 'closed' | 'all', optional)
- `filters.labels` (string[], optional)
- `filters.assignee` (string, optional)

**Returns:** Promise<Issue[]>

### Comment Operations

#### createComment()

Add a comment to an issue.

```typescript
createComment(issueId: string | number, body: string, faberContext?: FaberContext): Promise<Comment>
```

#### listComments()

List all comments on an issue.

```typescript
listComments(issueId: string | number, options?: ListCommentsOptions): Promise<Comment[]>
```

### Label Operations

```typescript
addLabels(issueId: string | number, labels: string[]): Promise<Label[]>
removeLabels(issueId: string | number, labels: string[]): Promise<void>
setLabels(issueId: string | number, labels: string[]): Promise<Label[]>
listLabels(issueId?: string | number): Promise<Label[]>
```

### Milestone Operations

```typescript
createMilestone(options: MilestoneCreateOptions): Promise<Milestone>
setMilestone(issueId: string | number, milestone: string): Promise<Issue>
removeMilestone(issueId: string | number): Promise<Issue>
listMilestones(state?: 'open' | 'closed' | 'all'): Promise<Milestone[]>
```

### Types

```typescript
interface Issue {
  id: string;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: Label[];
  assignees: string[];
  milestone?: Milestone;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  url: string;
}

type WorkType = 'feature' | 'bug' | 'chore' | 'patch' | 'infrastructure' | 'api';
type FaberContext = 'frame' | 'architect' | 'build' | 'evaluate' | 'release' | 'ops';
```

## Repo Module

Repository management with Git and platform integration.

### RepoManager

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

### Branch Operations

#### createBranch()

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

#### deleteBranch()

Delete a branch.

```typescript
deleteBranch(name: string, options?: BranchDeleteOptions): Promise<void>
```

#### listBranches()

List branches.

```typescript
listBranches(options?: BranchListOptions): Promise<Branch[]>
```

**Parameters:**
- `options.remote` (boolean, optional) - Include remote branches
- `options.merged` (boolean, optional) - Only merged branches

#### generateBranchName()

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

### Commit Operations

#### commit()

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

#### stage()

Stage files for commit.

```typescript
stage(patterns: string[]): void
stageAll(): void
```

#### push() / pull()

Push and pull operations.

```typescript
push(options?: PushOptions): void
pull(options?: PullOptions): void
```

### Pull Request Operations

#### createPR()

Create a pull request.

```typescript
createPR(options: PRCreateOptions): Promise<PullRequest>
```

**Parameters:**
- `options.title` (string, required)
- `options.body` (string, optional)
- `options.base` (string, optional)
- `options.head` (string, optional)
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

#### mergePR()

Merge a pull request.

```typescript
mergePR(number: number, options?: PRMergeOptions): Promise<PullRequest>
```

**Parameters:**
- `number` - PR number
- `options.method` ('merge' | 'squash' | 'rebase', optional)

### Tag Operations

```typescript
createTag(name: string, options?: TagCreateOptions): void
deleteTag(name: string): void
pushTag(name: string, remote?: string): void
listTags(options?: TagListOptions): Tag[]
```

### Worktree Operations

```typescript
createWorktree(options: WorktreeCreateOptions): Worktree
listWorktrees(): Worktree[]
removeWorktree(path: string, force?: boolean): void
cleanupWorktrees(options?: WorktreeCleanupOptions): Promise<WorktreeCleanupResult>
```

### Types

```typescript
interface Branch {
  name: string;
  sha: string;
  isDefault: boolean;
  isProtected: boolean;
  upstream?: string;
}

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  parents: string[];
}

interface PullRequest {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  head: string;
  base: string;
  author: string;
  url: string;
}

type CommitType = 'feat' | 'fix' | 'chore' | 'docs' | 'style' | 'refactor' | 'perf' | 'test';
```

## Spec Module

Specification management for FABER workflows.

### SpecManager

```typescript
import { SpecManager } from '@fractary/core/spec';

const specManager = new SpecManager({
  specDirectory: './specs'
});
```

### CRUD Operations

#### createSpec()

Create a new specification.

```typescript
createSpec(title: string, options?: SpecCreateOptions): Specification
```

**Parameters:**
- `title` - Specification title
- `options.workId` (string, optional)
- `options.workType` (string, optional)
- `options.template` (SpecTemplateType, optional)

**Example:**
```typescript
const spec = specManager.createSpec('API Authentication', {
  workType: 'feature',
  template: 'api'
});
```

#### getSpec()

Get a specification.

```typescript
getSpec(idOrPath: string): Specification | null
```

#### updateSpec()

Update a specification.

```typescript
updateSpec(idOrPath: string, updates: SpecUpdateOptions): Specification
```

#### listSpecs()

List specifications.

```typescript
listSpecs(options?: SpecListOptions): Specification[]
```

**Parameters:**
- `options.workType` (string, optional)
- `options.validationStatus` (string, optional)

### Validation

#### validateSpec()

Validate specification completeness.

```typescript
validateSpec(specIdOrPath: string): SpecValidateResult
```

**Returns:**
```typescript
interface SpecValidateResult {
  status: 'pass' | 'partial' | 'fail';
  score: number;
  checks: Array<{ name: string; passed: boolean; message: string }>;
  suggestions?: string[];
}
```

#### generateRefinementQuestions()

Generate refinement questions.

```typescript
generateRefinementQuestions(specIdOrPath: string): RefinementQuestion[]
```

### Types

```typescript
interface Specification {
  id: string;
  path: string;
  title: string;
  workId?: string;
  workType: string;
  template: SpecTemplateType;
  content: string;
  metadata: SpecMetadata;
  phases?: SpecPhase[];
}

type SpecTemplateType = 'basic' | 'feature' | 'bug' | 'infrastructure' | 'api';
```

## Logs Module

Session and operational logging.

### LogManager

```typescript
import { LogManager } from '@fractary/core/logs';

const logManager = new LogManager({
  logsDirectory: './logs'
});
```

### Log Operations

#### writeLog()

Write a new log.

```typescript
writeLog(options: LogWriteOptions): LogEntry
```

**Parameters:**
- `options.type` (LogType, required)
- `options.title` (string, required)
- `options.content` (string, required)
- `options.issueNumber` (number, optional)

**Example:**
```typescript
const log = logManager.writeLog({
  type: 'session',
  title: 'Feature Development Session',
  content: 'Session transcript...',
  issueNumber: 123
});
```

#### readLog()

Read a log entry.

```typescript
readLog(idOrPath: string): LogEntry | null
```

#### searchLogs()

Search logs.

```typescript
searchLogs(options: LogSearchOptions): LogSearchResult[]
```

**Parameters:**
- `options.query` (string, required)
- `options.type` (LogType, optional)
- `options.issueNumber` (number, optional)
- `options.since` (Date, optional)
- `options.until` (Date, optional)

### Session Capture

#### startCapture()

Start session capture.

```typescript
startCapture(options: CaptureStartOptions): CaptureResult
```

**Example:**
```typescript
const capture = logManager.startCapture({
  issueNumber: 123,
  redactSensitive: true,
  model: 'claude-3.5-sonnet'
});
```

#### stopCapture()

Stop active session capture.

```typescript
stopCapture(): CaptureResult | null
```

### Types

```typescript
type LogType = 'session' | 'build' | 'deployment' | 'test' | 'debug' | 'audit' | 'operational' | 'workflow';
type LogStatus = 'active' | 'completed' | 'stopped' | 'success' | 'failure' | 'error';

interface LogEntry {
  id: string;
  type: LogType;
  path: string;
  title: string;
  content: string;
  metadata: LogMetadata;
}
```

## File Module

File storage operations.

### FileManager

```typescript
import { FileManager } from '@fractary/core/file';

const fileManager = new FileManager({
  basePath: './data'
});
```

### Operations

```typescript
write(path: string, content: string): Promise<string>
read(path: string): Promise<string | null>
exists(path: string): Promise<boolean>
list(prefix?: string): Promise<string[]>
delete(path: string): Promise<void>
copy(sourcePath: string, destPath: string): Promise<string>
move(sourcePath: string, destPath: string): Promise<string>
```

**Examples:**
```typescript
// Write file
await fileManager.write('config.json', JSON.stringify({ key: 'value' }));

// Read file
const content = await fileManager.read('config.json');

// Check existence
const exists = await fileManager.exists('config.json');

// List files
const files = await fileManager.list('data/');
```

## Docs Module

Documentation management.

### DocsManager

```typescript
import { DocsManager } from '@fractary/core/docs';

const docsManager = new DocsManager({
  docsDir: './docs',
  defaultFormat: 'markdown'
});
```

### Operations

#### createDoc()

Create a document.

```typescript
createDoc(id: string, content: string, metadata: DocMetadata, format?: DocFormat): Promise<Doc>
```

**Example:**
```typescript
const doc = await docsManager.createDoc(
  'user-guide',
  '# User Guide\\n\\nWelcome...',
  {
    title: 'User Guide',
    authors: ['author1'],
    tags: ['guide', 'user']
  },
  'markdown'
);
```

#### searchDocs()

Search documents.

```typescript
searchDocs(query: DocSearchQuery): Promise<Doc[]>
```

**Parameters:**
- `query.text` (string, optional)
- `query.tags` (string[], optional)
- `query.author` (string, optional)

### Types

```typescript
type DocFormat = 'markdown' | 'html' | 'pdf' | 'text';

interface Doc {
  id: string;
  content: string;
  format: DocFormat;
  metadata: DocMetadata;
}

interface DocMetadata {
  title: string;
  description?: string;
  authors?: string[];
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}
```

## Common Types

### Error Types

```typescript
class WorkError extends Error {}
class RepoError extends Error {}
class SpecError extends Error {}
class LogError extends Error {}
class FileError extends Error {}
class DocsError extends Error {}
```

### Result Type

```typescript
type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };
```

### Pagination

```typescript
interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}
```

## Platform Support

### Work Tracking
- **GitHub Issues** - Full support
- **Jira Cloud** - Full support
- **Linear** - Full support

### Repository Management
- **GitHub** - Full support
- **GitLab** - Full support
- **Bitbucket** - Full support

## Error Handling

All methods that can fail throw typed errors:

```typescript
try {
  const issue = await workManager.fetchIssue(123);
} catch (error) {
  if (error instanceof WorkError) {
    console.error('Work tracking error:', error.message);
  }
}
```

## Next Steps

- [Configuration Guide](./configuration.md) - Detailed configuration options
- [Integration Guide](./integration.md) - Integration patterns
- [Examples](../examples/) - Code examples and use cases

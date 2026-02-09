# Work Toolset - SDK Reference

TypeScript API reference for the Work toolset. Work tracking across GitHub Issues, Jira, and Linear.

## WorkManager

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

### Configuration

```typescript
interface WorkConfig {
  provider: 'github' | 'jira' | 'linear';
  config: GitHubConfig | JiraConfig | LinearConfig;
}

interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
  baseUrl?: string;  // For GitHub Enterprise
}

interface JiraConfig {
  host: string;
  email: string;
  token: string;
  project: string;
}

interface LinearConfig {
  apiKey: string;
  teamId: string;
}
```

## Issue Operations

### createIssue()

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

**Returns:** `Promise<Issue>`

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

### fetchIssue()

Fetch an issue by ID or number.

```typescript
fetchIssue(issueId: string | number): Promise<Issue>
```

**Parameters:**
- `issueId` - Issue number or ID

**Returns:** `Promise<Issue>`

**Example:**
```typescript
const issue = await workManager.fetchIssue(123);
console.log(issue.title, issue.state);
```

### updateIssue()

Update an existing issue.

```typescript
updateIssue(issueId: string | number, options: IssueUpdateOptions): Promise<Issue>
```

**Parameters:**
- `issueId` - Issue number or ID
- `options.title` (string, optional) - New title
- `options.body` (string, optional) - New description
- `options.state` ('open' | 'closed', optional) - New state

**Returns:** `Promise<Issue>`

**Example:**
```typescript
const updated = await workManager.updateIssue(123, {
  title: 'Updated title',
  state: 'closed'
});
```

### searchIssues()

Search for issues.

```typescript
searchIssues(query: string, filters?: IssueFilters): Promise<Issue[]>
```

**Parameters:**
- `query` - Search query string
- `filters.state` ('open' | 'closed' | 'all', optional)
- `filters.labels` (string[], optional)
- `filters.assignee` (string, optional)

**Returns:** `Promise<Issue[]>`

**Example:**
```typescript
const issues = await workManager.searchIssues('authentication', {
  state: 'open',
  labels: ['enhancement']
});
```

### listIssues()

List issues with optional filters.

```typescript
listIssues(filters?: IssueFilters): Promise<Issue[]>
```

## Comment Operations

### createComment()

Add a comment to an issue.

```typescript
createComment(issueId: string | number, body: string, faberContext?: FaberContext): Promise<Comment>
```

**Example:**
```typescript
const comment = await workManager.createComment(123, 'Investigation complete');
```

### listComments()

List all comments on an issue.

```typescript
listComments(issueId: string | number, options?: ListCommentsOptions): Promise<Comment[]>
```

## Label Operations

```typescript
// Add labels to an issue
addLabels(issueId: string | number, labels: string[]): Promise<Label[]>

// Remove labels from an issue
removeLabels(issueId: string | number, labels: string[]): Promise<void>

// Set labels (replaces all existing labels)
setLabels(issueId: string | number, labels: string[]): Promise<Label[]>

// List labels (on issue or all repo labels)
listLabels(issueId?: string | number): Promise<Label[]>
```

**Example:**
```typescript
// Add labels
await workManager.addLabels(123, ['bug', 'priority:high']);

// Remove labels
await workManager.removeLabels(123, ['wontfix']);

// Replace all labels
await workManager.setLabels(123, ['enhancement', 'in-progress']);

// List issue labels
const labels = await workManager.listLabels(123);

// List all repo labels
const allLabels = await workManager.listLabels();
```

## Milestone Operations

```typescript
// Create a milestone
createMilestone(options: MilestoneCreateOptions): Promise<Milestone>

// Set milestone on an issue
setMilestone(issueId: string | number, milestone: string): Promise<Issue>

// Remove milestone from an issue
removeMilestone(issueId: string | number): Promise<Issue>

// List milestones
listMilestones(state?: 'open' | 'closed' | 'all'): Promise<Milestone[]>
```

**Example:**
```typescript
// Create milestone
const milestone = await workManager.createMilestone({
  title: 'v1.0.0',
  description: 'Initial release',
  dueDate: '2024-03-01'
});

// Assign to issue
await workManager.setMilestone(123, 'v1.0.0');
```

## Types

### Issue

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
```

### WorkType

```typescript
type WorkType = 'feature' | 'bug' | 'chore' | 'patch' | 'infrastructure' | 'api';
```

### FaberContext

```typescript
type FaberContext = 'frame' | 'architect' | 'build' | 'evaluate' | 'release' | 'ops';
```

### Label

```typescript
interface Label {
  name: string;
  color: string;
  description?: string;
}
```

### Milestone

```typescript
interface Milestone {
  id: string;
  title: string;
  description?: string;
  state: 'open' | 'closed';
  dueDate?: string;
}
```

### Comment

```typescript
interface Comment {
  id: string;
  body: string;
  author: string;
  created_at: string;
  updated_at: string;
}
```

## Error Handling

```typescript
import { WorkError } from '@fractary/core';

try {
  const issue = await workManager.fetchIssue(999);
} catch (error) {
  if (error instanceof WorkError) {
    console.error('Work tracking error:', error.message);
    // error.code contains specific error code
  }
}
```

## Other Interfaces

- **CLI:** [Work Commands](/docs/cli/work.md)
- **MCP:** [Work Tools](/docs/mcp/server/work.md)
- **Plugin:** [Work Plugin](/docs/plugins/work.md)
- **Configuration:** [Work Config](/docs/guides/configuration.md#work-toolset)

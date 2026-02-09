# Fractary Core SDK

TypeScript SDK for programmatic access to all Fractary Core toolsets.

## Installation

```bash
npm install @fractary/core
```

## Quick Start

```typescript
import { WorkManager } from '@fractary/core/work';
import { RepoManager } from '@fractary/core/repo';
import { SpecManager } from '@fractary/core/spec';
import { LogManager } from '@fractary/core/logs';
import { FileManager } from '@fractary/core/file';
import { DocsManager } from '@fractary/core/docs';

// Initialize with configuration
const workManager = new WorkManager({
  provider: 'github',
  config: {
    owner: 'myorg',
    repo: 'myrepo',
    token: process.env.GITHUB_TOKEN
  }
});

// Fetch an issue
const issue = await workManager.fetchIssue(123);
console.log(issue.title, issue.state);

// Create a new issue
const newIssue = await workManager.createIssue({
  title: 'Add user authentication',
  body: 'Implement JWT-based authentication',
  workType: 'feature',
  labels: ['enhancement']
});
```

## Import Patterns

Each toolset is available as a separate module:

```typescript
// Individual imports (recommended for tree-shaking)
import { WorkManager } from '@fractary/core/work';
import { RepoManager } from '@fractary/core/repo';
import { SpecManager } from '@fractary/core/spec';
import { LogManager } from '@fractary/core/logs';
import { FileManager } from '@fractary/core/file';
import { DocsManager } from '@fractary/core/docs';

// Unified import
import {
  WorkManager,
  RepoManager,
  SpecManager,
  LogManager,
  FileManager,
  DocsManager
} from '@fractary/core';
```

## Configuration

### From Configuration File

```typescript
import { loadConfig } from '@fractary/core';

const config = await loadConfig('.fractary/config.yaml');
const workManager = new WorkManager(config.work);
```

### Programmatic Configuration

```typescript
const workManager = new WorkManager({
  provider: 'github',
  config: {
    owner: 'myorg',
    repo: 'myrepo',
    token: process.env.GITHUB_TOKEN
  }
});
```

See the [Configuration Guide](/docs/guides/configuration.md) for complete options.

## Toolset Documentation

| Toolset | Manager Class | Documentation |
|---------|---------------|---------------|
| **Work** | `WorkManager` | [Work API Reference](/docs/sdk/js/work.md) |
| **Repo** | `RepoManager` | [Repo API Reference](/docs/sdk/js/repo.md) |
| **Spec** | `SpecManager` | [Spec API Reference](/docs/sdk/js/spec.md) |
| **Logs** | `LogManager` | [Logs API Reference](/docs/sdk/js/logs.md) |
| **File** | `FileManager` | [File API Reference](/docs/sdk/js/file.md) |
| **Docs** | `DocsManager` | [Docs API Reference](/docs/sdk/js/docs.md) |

## Platform Support

### Work Tracking Platforms

| Platform | Provider Value | Status |
|----------|---------------|--------|
| GitHub Issues | `github` | Full support |
| Jira Cloud | `jira` | Full support |
| Linear | `linear` | Full support |

### Repository Platforms

| Platform | Provider Value | Status |
|----------|---------------|--------|
| GitHub | `github` | Full support |
| GitLab | `gitlab` | Full support |
| Bitbucket | `bitbucket` | Full support |

## Error Handling

All SDK methods throw typed errors:

```typescript
import { WorkError, RepoError, SpecError } from '@fractary/core';

try {
  const issue = await workManager.fetchIssue(123);
} catch (error) {
  if (error instanceof WorkError) {
    console.error('Work tracking error:', error.message);
  }
}
```

### Error Types

| Error Class | Toolset | Description |
|-------------|---------|-------------|
| `WorkError` | Work | Work tracking operation failed |
| `RepoError` | Repo | Repository operation failed |
| `SpecError` | Spec | Specification operation failed |
| `LogError` | Logs | Log operation failed |
| `FileError` | File | File operation failed |
| `DocsError` | Docs | Documentation operation failed |

## Common Types

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

## Other Interfaces

- **CLI:** [Command Reference](/docs/cli/README.md)
- **MCP:** [Tool Reference](/docs/mcp/server/README.md)
- **Plugins:** [Plugin Reference](/docs/plugins/README.md)

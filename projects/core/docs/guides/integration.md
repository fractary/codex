# Integration Guide

Complete guide to integrating Fractary Core into your projects.

## Table of Contents

- [Getting Started](#getting-started)
- [SDK Integration](#sdk-integration)
- [CLI Integration](#cli-integration)
- [MCP Server Integration](#mcp-server-integration)
- [Plugin Integration](#plugin-integration)
- [CI/CD Integration](#cicd-integration)
- [Framework Integration](#framework-integration)

## Getting Started

Fractary Core provides multiple integration points:

- **SDK** - Direct TypeScript/JavaScript integration
- **CLI** - Command-line scripting and automation
- **MCP Server** - AI agent integration via Model Context Protocol
- **Plugins** - Claude Code workflow integration

Choose the integration method that best fits your use case.

## SDK Integration

### Installation

```bash
npm install @fractary/core
```

### Basic Usage

```typescript
import { WorkManager, RepoManager, SpecManager } from '@fractary/core';

// Initialize managers
const workManager = new WorkManager({
  provider: 'github',
  config: {
    owner: 'myorg',
    repo: 'myrepo',
    token: process.env.GITHUB_TOKEN
  }
});

const repoManager = new RepoManager({
  provider: 'github',
  config: {
    owner: 'myorg',
    repo: 'myrepo',
    token: process.env.GITHUB_TOKEN
  }
});

// Use in your application
async function createFeature() {
  // Create issue
  const issue = await workManager.createIssue({
    title: 'Add new feature',
    workType: 'feature'
  });

  // Create branch
  const branch = await repoManager.createBranch(
    `feature/${issue.number}-new-feature`,
    { base: 'main' }
  );

  return { issue, branch };
}
```

### Module-by-Module Integration

#### Work Tracking Only

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

// Use for issue management
const issues = await workManager.searchIssues('is:open label:bug');
```

#### Repository Only

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

// Use for Git operations
await repoManager.commit({
  message: 'Add feature',
  type: 'feat'
});
```

## CLI Integration

### Installation

```bash
npm install -g @fractary/core-cli
```

### Shell Scripts

```bash
#!/bin/bash
# create-feature.sh

# Create issue
ISSUE_JSON=$(fractary-core work issue create "Add feature" --type feature --json)
ISSUE_NUM=$(echo $ISSUE_JSON | jq -r '.data.number')

# Create branch
fractary-core repo branch create "feature/$ISSUE_NUM-add-feature"

# Create specification
fractary-core spec create "Feature Spec" --work-id "$ISSUE_NUM"

echo "Created feature: Issue #$ISSUE_NUM"
```

### NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "issue:create": "fractary-core work issue create",
    "branch:create": "fractary-core repo branch create",
    "spec:validate": "fractary-core spec validate",
    "logs:archive": "fractary-core logs archive --max-age 90",
    "release:prepare": "node scripts/prepare-release.js"
  }
}
```

### Programmatic CLI Usage

```typescript
import { createWorkCommand } from '@fractary/core-cli';
import { Command } from 'commander';

const program = new Command();
program.addCommand(createWorkCommand());

// Add custom commands
program
  .command('release')
  .description('Create release')
  .action(async () => {
    // Use CLI components
  });

program.parse();
```

## MCP Server Integration

### Installation

```bash
npm install @fractary/core-mcp
```

### Claude Code Integration

Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "fractary-core": {
      "command": "npx",
      "args": ["-y", "@fractary/core-mcp"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

### Standalone MCP Server

```bash
# Run MCP server
npx @fractary/core-mcp --config .fractary/core-mcp.yaml

# With custom port (HTTP transport)
npx @fractary/core-mcp --port 3000 --config .fractary/core-mcp.yaml
```

### Custom MCP Integration

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { allTools } from '@fractary/core-mcp';

const server = new Server(
  { name: 'my-custom-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools
}));

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Plugin Integration

### Claude Code Plugins

The Fractary Core plugins integrate seamlessly with Claude Code.

#### Install Plugins

```bash
# Plugins are auto-discovered from the plugins/ directory
# Or install from registry
claude-code plugin install fractary-work
claude-code plugin install fractary-repo
```

#### Use Plugin Commands

```bash
# Work plugin
/fractary-work:issue-create "Add feature" --type feature

# Repo plugin
/fractary-repo:branch-create "feature/new-ui"
/fractary-repo:commit "Add login" --type feat

# Spec plugin
/fractary-spec:create "API Design" --type feature
```

#### Plugin Configuration

**v2.0+**: Plugins use the unified configuration at `.fractary/core/config.yaml`:

```yaml
version: "2.0"

work:
  active_handler: github
  handlers:
    github:
      owner: myorg
      repo: myrepo
      token: ${GITHUB_TOKEN}
```

Initialize with: `fractary-core:config-init`

## CI/CD Integration

### GitHub Actions

```yaml
name: Fractary Workflow
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install Fractary CLI
        run: npm install -g @fractary/core-cli

      - name: Validate Specifications
        run: fractary-core spec validate --all
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Archive Logs
        run: fractary-core logs archive --max-age 30
        if: github.ref == 'refs/heads/main'
```

### GitLab CI

```yaml
stages:
  - validate
  - release

validate-specs:
  stage: validate
  image: node:18
  script:
    - npm install -g @fractary/core-cli
    - fractary-core spec validate --all
  variables:
    GITLAB_TOKEN: $CI_JOB_TOKEN

create-release:
  stage: release
  image: node:18
  script:
    - npm install -g @fractary/core-cli
    - fractary-core repo tag create v1.0.0
    - fractary-core work issue create "Release v1.0.0" --type task
  only:
    - main
```

### Jenkins

```groovy
pipeline {
    agent any

    environment {
        GITHUB_TOKEN = credentials('github-token')
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm install -g @fractary/core-cli'
            }
        }

        stage('Validate') {
            steps {
                sh 'fractary-core spec validate --all'
            }
        }

        stage('Create Release') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    VERSION=$(npm version patch --no-git-tag-version | tail -1)
                    fractary-core repo tag create $VERSION
                    fractary-core work issue create "Release $VERSION" --type task
                '''
            }
        }
    }
}
```

## Framework Integration

### Express.js

```typescript
import express from 'express';
import { WorkManager, RepoManager } from '@fractary/core';

const app = express();

const workManager = new WorkManager({
  provider: 'github',
  config: {
    owner: process.env.GITHUB_OWNER!,
    repo: process.env.GITHUB_REPO!,
    token: process.env.GITHUB_TOKEN!
  }
});

// API endpoint to create issue
app.post('/api/issues', async (req, res) => {
  try {
    const issue = await workManager.createIssue({
      title: req.body.title,
      body: req.body.description,
      workType: req.body.type
    });
    res.json({ success: true, issue });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3000);
```

### Next.js

```typescript
// app/api/issues/route.ts
import { NextResponse } from 'next/server';
import { WorkManager } from '@fractary/core/work';

const workManager = new WorkManager({
  provider: 'github',
  config: {
    owner: process.env.GITHUB_OWNER!,
    repo: process.env.GITHUB_REPO!,
    token: process.env.GITHUB_TOKEN!
  }
});

export async function POST(request: Request) {
  const data = await request.json();

  const issue = await workManager.createIssue({
    title: data.title,
    body: data.description,
    workType: data.type
  });

  return NextResponse.json({ issue });
}

export async function GET() {
  const issues = await workManager.searchIssues('is:open');
  return NextResponse.json({ issues });
}
```

### NestJS

```typescript
import { Injectable } from '@nestjs/common';
import { WorkManager } from '@fractary/core/work';

@Injectable()
export class IssuesService {
  private workManager: WorkManager;

  constructor() {
    this.workManager = new WorkManager({
      provider: 'github',
      config: {
        owner: process.env.GITHUB_OWNER!,
        repo: process.env.GITHUB_REPO!,
        token: process.env.GITHUB_TOKEN!
      }
    });
  }

  async createIssue(title: string, body: string) {
    return this.workManager.createIssue({ title, body });
  }

  async getIssues() {
    return this.workManager.searchIssues('is:open');
  }
}
```

## Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install Fractary CLI
RUN npm install -g @fractary/core-cli

# Copy configuration
COPY .fractary/ .fractary/

# Copy application
COPY . .

CMD ["fractary-core", "logs", "capture"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  fractary-mcp:
    image: node:18-alpine
    command: npx @fractary/core-mcp
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - JIRA_TOKEN=${JIRA_TOKEN}
    volumes:
      - ./.fractary:/app/.fractary
      - ./specs:/app/specs
      - ./logs:/app/logs
    ports:
      - "3000:3000"
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fractary-mcp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: fractary-mcp
  template:
    metadata:
      labels:
        app: fractary-mcp
    spec:
      containers:
      - name: mcp-server
        image: node:18-alpine
        command: ["npx", "@fractary/core-mcp"]
        env:
        - name: GITHUB_TOKEN
          valueFrom:
            secretKeyRef:
              name: fractary-secrets
              key: github-token
        volumeMounts:
        - name: config
          mountPath: /app/.fractary
      volumes:
      - name: config
        configMap:
          name: fractary-config
```

## Testing Integration

### Jest

```typescript
import { WorkManager } from '@fractary/core/work';

describe('Issue Management', () => {
  let workManager: WorkManager;

  beforeEach(() => {
    workManager = new WorkManager({
      provider: 'github',
      config: {
        owner: 'myorg',
        repo: 'myrepo',
        token: process.env.GITHUB_TOKEN || 'test-token'
      }
    });
  });

  it('should create an issue', async () => {
    const issue = await workManager.createIssue({
      title: 'Test Issue',
      workType: 'feature'
    });

    expect(issue).toBeDefined();
    expect(issue.title).toBe('Test Issue');
  });
});
```

### Mocking

```typescript
import { jest } from '@jest/globals';
import { WorkManager } from '@fractary/core/work';

// Mock the WorkManager
jest.mock('@fractary/core/work', () => ({
  WorkManager: jest.fn().mockImplementation(() => ({
    createIssue: jest.fn().mockResolvedValue({
      id: '1',
      number: 123,
      title: 'Test Issue'
    }),
    fetchIssue: jest.fn().mockResolvedValue({
      id: '1',
      number: 123,
      title: 'Test Issue'
    })
  }))
}));

// Use in tests
const workManager = new WorkManager({ /* config */ });
const issue = await workManager.createIssue({ title: 'Test' });
expect(issue.number).toBe(123);
```

## Best Practices

1. **Use configuration files** - Store settings in `.fractary/core/config.yaml`
2. **Environment variables for secrets** - Never commit tokens
3. **Error handling** - Always handle errors from SDK methods
4. **Logging** - Use the logs module for audit trails
5. **Validation** - Validate specs before deployment
6. **Testing** - Mock SDK methods in tests
7. **Documentation** - Document integration points

## Troubleshooting

### SDK Integration Issues

```typescript
// Enable debug logging
import { setLogLevel } from '@fractary/core';
setLogLevel('debug');

// Catch and log errors
try {
  const issue = await workManager.createIssue({ title: 'Test' });
} catch (error) {
  console.error('Failed to create issue:', error);
  throw error;
}
```

### CLI Integration Issues

```bash
# Verify CLI installation
which fractary-core

# Check version
fractary-core --version

# Validate configuration
fractary-core config validate

# Enable verbose output
fractary-core --verbose work issue list
```

### MCP Server Issues

```bash
# Test MCP server locally
npx @fractary/core-mcp --config .fractary/core-mcp.yaml

# Check logs
tail -f ~/.claude/logs/mcp.log

# Validate configuration
fractary-core config validate
```

## Next Steps

- [API Reference](./api-reference.md) - Complete API documentation
- [Configuration Guide](./configuration.md) - Configuration options
- [Examples](../examples/) - Integration examples

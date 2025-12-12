---
title: Codex SDK Examples
description: Real-world examples and use cases for the Codex SDK including routing, configuration, and integration patterns
visibility: public
codex_sync_include: []
codex_sync_exclude: []
codex_sync_custom: [developers.fractary.com:src/content/docs/codex/]
tags: [codex, sdk, examples, tutorial, use-cases]
---

# Examples

Real-world examples demonstrating how to use the Codex SDK in various scenarios.

## Example 1: Basic File Routing

Route a documentation file to appropriate repositories based on frontmatter.

### Scenario

You have a file `docs/api-standards.md` that should sync to all API repositories except test environments.

### Frontmatter

```markdown
---
title: API Design Standards
codex_sync_include: ['api-*', 'core-*']
codex_sync_exclude: ['*-test', '*-sandbox']
visibility: internal
---

# API Design Standards

All API services must follow these standards...
```

### Code

```typescript
import { parseMetadata, shouldSyncToRepo, loadConfig } from '@fractary/codex'
import { readFile } from 'fs/promises'

async function routeFile() {
  // Load configuration
  const config = loadConfig({
    organizationSlug: 'myorg'
  })

  // Read and parse file
  const content = await readFile('docs/api-standards.md', 'utf-8')
  const { metadata } = parseMetadata(content)

  // Check routing for specific repositories
  const repos = [
    'api-gateway',
    'api-auth',
    'api-test',
    'web-app',
    'core-db'
  ]

  for (const repo of repos) {
    const shouldSync = shouldSyncToRepo({
      filePath: 'docs/api-standards.md',
      fileMetadata: metadata,
      targetRepo: repo,
      sourceRepo: 'codex.myorg.com',
      rules: config.rules
    })

    console.log(`${repo}: ${shouldSync ? '✓' : '✗'}`)
  }
}

routeFile()
```

### Output

```
api-gateway: ✓
api-auth: ✓
api-test: ✗
web-app: ✗
core-db: ✓
```

### CLI Equivalent

```bash
# Check individual repo
fractary codex should-sync docs/api-standards.md api-gateway

# Get all target repos
fractary codex targets docs/api-standards.md --repos repos.txt
```

---

## Example 2: Custom Sync Destinations

Publish documentation to external sites with custom paths using `codex_sync_custom`.

### Scenario

You want to publish your project's API documentation to your public documentation site (`developers.fractary.com`) while also syncing to internal repositories.

### Frontmatter

```markdown
---
title: API Reference
codex_sync_include: ['api-*']
codex_sync_custom: ['developers.fractary.com:src/content/docs/api/']
visibility: public
---

# API Reference

Complete API documentation...
```

### Code

```typescript
import {
  parseMetadata,
  getCustomSyncDestinations,
  shouldSyncToRepo
} from '@fractary/codex'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

async function syncWithCustomDestinations() {
  const filePath = 'docs/api-reference.md'
  const content = await readFile(filePath, 'utf-8')
  const { metadata, content: docContent } = parseMetadata(content)

  // 1. Handle normal repository sync
  const internalRepos = ['api-gateway', 'api-auth', 'web-app']

  for (const repo of internalRepos) {
    const shouldSync = shouldSyncToRepo({
      filePath,
      fileMetadata: metadata,
      targetRepo: repo,
      sourceRepo: 'codex.myorg.com'
    })

    if (shouldSync) {
      console.log(`✓ Syncing to ${repo}`)
      // Sync to repository...
    }
  }

  // 2. Handle custom sync destinations
  const customDestinations = getCustomSyncDestinations(metadata)

  for (const dest of customDestinations) {
    console.log(`✓ Publishing to ${dest.repo} at ${dest.path}`)

    // Clone or checkout the target repo
    const targetPath = join('/tmp', dest.repo, dest.path, 'api-reference.md')
    await mkdir(join('/tmp', dest.repo, dest.path), { recursive: true })
    await writeFile(targetPath, docContent, 'utf-8')

    // Commit and push changes...
  }
}

syncWithCustomDestinations()
```

### Output

```
✓ Syncing to api-gateway
✓ Syncing to api-auth
✓ Publishing to developers.fractary.com at src/content/docs/api/
```

### Multiple Custom Destinations

You can specify multiple destinations:

```yaml
---
codex_sync_custom:
  - developers.fractary.com:src/content/docs/api/
  - docs.example.com:reference/api/
  - internal-wiki.com:engineering/api/
---
```

```typescript
const destinations = getCustomSyncDestinations(metadata)
// [
//   { repo: 'developers.fractary.com', path: 'src/content/docs/api/' },
//   { repo: 'docs.example.com', path: 'reference/api/' },
//   { repo: 'internal-wiki.com', path: 'engineering/api/' }
// ]
```

---

## Example 3: Auto-Sync Patterns

Automatically sync files based on directory structure without requiring frontmatter.

### Scenario

You want all files in the `global/` directory to sync everywhere, and files in `systems/api/` to sync only to API repositories.

### Configuration

```typescript
import { loadConfig } from '@fractary/codex'

const config = loadConfig({
  organizationSlug: 'myorg',
  rules: {
    autoSyncPatterns: [
      {
        pattern: 'global/**',
        include: ['*'],
        exclude: ['*-test', '*-sandbox']
      },
      {
        pattern: 'systems/api/**',
        include: ['api-*']
      },
      {
        pattern: 'systems/web/**',
        include: ['web-*', 'frontend-*']
      }
    ]
  }
})
```

### Usage

```typescript
import { shouldSyncToRepo } from '@fractary/codex'

// Global file - syncs everywhere
shouldSyncToRepo({
  filePath: 'global/CODE_OF_CONDUCT.md',
  fileMetadata: {},  // No frontmatter needed!
  targetRepo: 'api-gateway',
  sourceRepo: 'codex.myorg.com',
  rules: config.rules
})
// Returns: true

// System-specific file
shouldSyncToRepo({
  filePath: 'systems/api/architecture.md',
  fileMetadata: {},
  targetRepo: 'api-gateway',
  sourceRepo: 'codex.myorg.com',
  rules: config.rules
})
// Returns: true

shouldSyncToRepo({
  filePath: 'systems/api/architecture.md',
  fileMetadata: {},
  targetRepo: 'web-app',
  sourceRepo: 'codex.myorg.com',
  rules: config.rules
})
// Returns: false
```

---

## Example 3: Multi-Organization Setup

Support multiple organizations in a single application.

### Scenario

You're building a SaaS platform that hosts Codex for multiple organizations.

### Code

```typescript
import { loadConfig, shouldSyncToRepo, parseMetadata } from '@fractary/codex'
import { readFile } from 'fs/promises'

class CodexService {
  private configs: Map<string, any> = new Map()

  // Load configuration for an organization
  loadOrgConfig(orgSlug: string) {
    if (!this.configs.has(orgSlug)) {
      const config = loadConfig({ organizationSlug: orgSlug })
      this.configs.set(orgSlug, config)
    }
    return this.configs.get(orgSlug)
  }

  // Route file for specific organization
  async shouldSyncFile(
    orgSlug: string,
    filePath: string,
    targetRepo: string
  ): Promise<boolean> {
    const config = this.loadOrgConfig(orgSlug)

    // Read and parse file from org-specific directory
    const fullPath = `.${orgSlug}/${filePath}`
    const content = await readFile(fullPath, 'utf-8')
    const { metadata } = parseMetadata(content)

    return shouldSyncToRepo({
      filePath,
      fileMetadata: metadata,
      targetRepo,
      sourceRepo: `codex.${orgSlug}.com`,
      rules: config.rules
    })
  }

  // Get all target repos for a file
  async getTargets(
    orgSlug: string,
    filePath: string,
    allRepos: string[]
  ): Promise<string[]> {
    const targets: string[] = []

    for (const repo of allRepos) {
      const shouldSync = await this.shouldSyncFile(orgSlug, filePath, repo)
      if (shouldSync) {
        targets.push(repo)
      }
    }

    return targets
  }
}

// Usage
const codex = new CodexService()

// Organization A
const orgA = 'acme'
const shouldSync = await codex.shouldSyncFile(
  orgA,
  'docs/api-guide.md',
  'api-gateway'
)

// Organization B
const orgB = 'widgets'
const targets = await codex.getTargets(
  orgB,
  'docs/standards.md',
  ['api-*', 'web-*']
)
```

---

## Example 4: GitHub Actions Integration

Sync documentation automatically when changes are pushed to the codex repository.

### Workflow File

`.github/workflows/sync-codex.yml`:

```yaml
name: Sync Codex Documentation

on:
  push:
    branches: [main]
    paths:
      - '.myorg/**'

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout codex repo
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install @fractary/codex

      - name: Get changed files
        id: changed-files
        uses: tj-actions/changed-files@v41
        with:
          files: .myorg/**

      - name: Determine target repositories
        id: targets
        run: |
          node scripts/get-targets.js "${{ steps.changed-files.outputs.all_changed_files }}"

      - name: Trigger sync workflows
        run: |
          for repo in ${{ steps.targets.outputs.repos }}; do
            gh workflow run sync-from-codex.yml \
              --repo myorg/$repo \
              --field files="${{ steps.changed-files.outputs.all_changed_files }}"
          done
        env:
          GH_TOKEN: ${{ secrets.ORG_TOKEN }}
```

### Target Detection Script

`scripts/get-targets.js`:

```javascript
import { parseMetadata, getTargetRepos, loadConfig } from '@fractary/codex'
import { readFile } from 'fs/promises'
import { parseArgs } from 'util'

async function main() {
  const { values } = parseArgs({
    options: {
      files: { type: 'string', multiple: true }
    }
  })

  const config = loadConfig({
    organizationSlug: process.env.ORGANIZATION_SLUG
  })

  // Get all org repositories
  const allRepos = await getAllRepos()

  // Track which repos need updates
  const targetRepos = new Set()

  // Process each changed file
  for (const file of values.files) {
    if (!file.endsWith('.md')) continue

    const content = await readFile(file, 'utf-8')
    const { metadata } = parseMetadata(content)

    const targets = getTargetRepos({
      filePath: file,
      fileMetadata: metadata,
      sourceRepo: 'codex.myorg.com',
      allRepos,
      rules: config.rules
    })

    targets.forEach(repo => targetRepos.add(repo))
  }

  // Output for GitHub Actions
  console.log(`repos=${Array.from(targetRepos).join(' ')}`)
}

async function getAllRepos() {
  // Fetch from GitHub API, read from file, etc.
  return ['api-gateway', 'api-auth', 'web-app', 'core-db']
}

main()
```

---

## Example 5: Validation in Pre-Commit Hook

Validate frontmatter before committing changes.

### Git Hook

`.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Get staged markdown files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '.md$')

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

echo "Validating Codex frontmatter..."

# Validate each file
HAS_ERRORS=0
for file in $STAGED_FILES; do
  if [[ $file == .myorg/* ]]; then
    if ! npx fractary codex parse "$file" --quiet; then
      echo "✗ Invalid frontmatter in $file"
      HAS_ERRORS=1
    fi
  fi
done

if [ $HAS_ERRORS -eq 1 ]; then
  echo ""
  echo "Frontmatter validation failed. Please fix errors before committing."
  exit 1
fi

echo "✓ All frontmatter is valid"
exit 0
```

### Node.js Version

`scripts/validate-frontmatter.js`:

```javascript
import { parseMetadata } from '@fractary/codex'
import { readFile } from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function validateStagedFiles() {
  // Get staged markdown files
  const { stdout } = await execAsync(
    'git diff --cached --name-only --diff-filter=ACM'
  )
  const files = stdout
    .split('\n')
    .filter(f => f.endsWith('.md') && f.startsWith('.myorg/'))

  if (files.length === 0) {
    return true
  }

  console.log('Validating Codex frontmatter...')

  let hasErrors = false

  for (const file of files) {
    try {
      const content = await readFile(file, 'utf-8')
      parseMetadata(content, { strict: true })
    } catch (error) {
      console.error(`✗ Invalid frontmatter in ${file}`)
      console.error(`  ${error.message}`)
      hasErrors = true
    }
  }

  if (hasErrors) {
    console.error('\nFrontmatter validation failed.')
    return false
  }

  console.log('✓ All frontmatter is valid')
  return true
}

validateStagedFiles().then(valid => {
  process.exit(valid ? 0 : 1)
})
```

---

## Example 6: Pattern Filtering

Filter repositories or files using glob patterns.

### Use Case: Find All API Repositories

```typescript
import { filterByPatterns } from '@fractary/codex'

const allRepos = [
  'api-gateway',
  'api-auth',
  'api-payments',
  'api-test',
  'web-app',
  'web-admin',
  'core-db',
  'core-cache'
]

// Get all API repos
const apiRepos = filterByPatterns(['api-*'], allRepos)
console.log(apiRepos)
// ['api-gateway', 'api-auth', 'api-payments', 'api-test']

// Get API repos excluding test
const productionApiRepos = apiRepos.filter(
  repo => !filterByPatterns(['*-test'], [repo]).length
)
console.log(productionApiRepos)
// ['api-gateway', 'api-auth', 'api-payments']
```

### Use Case: Match Repository Against Multiple Patterns

```typescript
import { matchAnyPattern } from '@fractary/codex'

const repo = 'api-gateway'

// Check if repo matches any pattern
const isApi = matchAnyPattern(['api-*', 'core-*'], repo)
console.log(isApi) // true

const isWeb = matchAnyPattern(['web-*', 'frontend-*'], repo)
console.log(isWeb) // false
```

### CLI Equivalent

```bash
# Filter repos by pattern
fractary codex filter "api-*" -- api-gateway api-auth web-app
# Output: api-gateway, api-auth

# Check if repo matches pattern
fractary codex match "api-*" api-gateway
# Output: ✓ Match
```

---

## Example 7: Dynamic Configuration

Load configuration from multiple sources with fallbacks.

### Code

```typescript
import { loadConfig, resolveOrganization } from '@fractary/codex'

function loadDynamicConfig() {
  try {
    // Try to auto-detect organization from repo name
    const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]

    if (repoName) {
      const orgSlug = resolveOrganization({
        repoName,
        autoDetect: true
      })

      return loadConfig({
        organizationSlug: orgSlug
      })
    }
  } catch (error) {
    console.warn('Could not auto-detect organization, using env var')
  }

  // Fallback to environment variable
  if (process.env.ORGANIZATION_SLUG) {
    return loadConfig({
      organizationSlug: process.env.ORGANIZATION_SLUG
    })
  }

  // Fallback to default
  return loadConfig({
    organizationSlug: 'default'
  })
}

// Usage
const config = loadDynamicConfig()
console.log(`Using organization: ${config.organizationSlug}`)
```

---

## Example 8: Batch Processing

Process multiple files in parallel.

### Code

```typescript
import { parseMetadata, shouldSyncToRepo, loadConfig } from '@fractary/codex'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'

async function batchProcess(targetRepo: string) {
  const config = loadConfig({ organizationSlug: 'myorg' })
  const docsDir = '.myorg/docs'

  // Read all markdown files
  const files = await readdir(docsDir, { recursive: true })
  const markdownFiles = files.filter(f => f.endsWith('.md'))

  // Process in parallel
  const results = await Promise.all(
    markdownFiles.map(async file => {
      const filePath = join(docsDir, file)
      const content = await readFile(filePath, 'utf-8')
      const { metadata } = parseMetadata(content)

      const shouldSync = shouldSyncToRepo({
        filePath: file,
        fileMetadata: metadata,
        targetRepo,
        sourceRepo: 'codex.myorg.com',
        rules: config.rules
      })

      return { file, shouldSync }
    })
  )

  // Filter files that should sync
  const filesToSync = results
    .filter(r => r.shouldSync)
    .map(r => r.file)

  return filesToSync
}

// Usage
const files = await batchProcess('api-gateway')
console.log(`${files.length} files to sync:`)
files.forEach(f => console.log(`  - ${f}`))
```

---

## Example 9: Custom Routing Rules

Implement custom routing logic on top of the SDK.

### Scenario

Add additional routing logic: files tagged with `security` must also go to the security team's repository.

### Code

```typescript
import { shouldSyncToRepo, parseMetadata, loadConfig } from '@fractary/codex'
import type { Metadata, SyncRules } from '@fractary/codex'

interface CustomShouldSyncOptions {
  filePath: string
  fileMetadata: Metadata
  targetRepo: string
  sourceRepo: string
  rules?: SyncRules
}

function customShouldSync(options: CustomShouldSyncOptions): boolean {
  // Check standard rules first
  const standardResult = shouldSyncToRepo(options)

  // Add custom rule: security-tagged files → security repo
  if (options.fileMetadata.tags?.includes('security')) {
    if (options.targetRepo === 'security-team') {
      return true
    }
  }

  // Add custom rule: all API docs → documentation repo
  if (options.filePath.startsWith('api/')) {
    if (options.targetRepo === 'documentation') {
      return true
    }
  }

  return standardResult
}

// Usage
const config = loadConfig({ organizationSlug: 'myorg' })
const content = await readFile('docs/api-security.md', 'utf-8')
const { metadata } = parseMetadata(content)

customShouldSync({
  filePath: 'docs/api-security.md',
  fileMetadata: metadata,
  targetRepo: 'security-team',
  sourceRepo: 'codex.myorg.com',
  rules: config.rules
})
// Returns: true (because of security tag)
```

---

## Example 10: MCP Server Integration

Use the SDK in a Model Context Protocol server for AI agents.

### Server Implementation

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  loadConfig,
  parseMetadata,
  shouldSyncToRepo,
  getTargetRepos
} from '@fractary/codex'
import { readFile } from 'fs/promises'

const server = new Server(
  {
    name: 'codex-mcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
)

// Load config once
const config = loadConfig({
  organizationSlug: process.env.ORGANIZATION_SLUG
})

// Tool: Get target repositories for a file
server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'get_targets') {
    const { filePath, allRepos } = request.params.arguments

    const content = await readFile(filePath, 'utf-8')
    const { metadata } = parseMetadata(content)

    const targets = getTargetRepos({
      filePath,
      fileMetadata: metadata,
      sourceRepo: 'codex.myorg.com',
      allRepos: allRepos || [],
      rules: config.rules
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ targets })
        }
      ]
    }
  }

  if (request.params.name === 'should_sync') {
    const { filePath, targetRepo } = request.params.arguments

    const content = await readFile(filePath, 'utf-8')
    const { metadata } = parseMetadata(content)

    const shouldSync = shouldSyncToRepo({
      filePath,
      fileMetadata: metadata,
      targetRepo,
      sourceRepo: 'codex.myorg.com',
      rules: config.rules
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ shouldSync })
        }
      ]
    }
  }
})

// Start server
const transport = new StdioServerTransport()
await server.connect(transport)
```

---

## Next Steps

- **[API Reference](./api-reference.md)** - Complete API documentation
- **[Configuration](./configuration.md)** - Advanced configuration options
- **[CLI Usage](./cli-usage.md)** - Command-line interface
- **[Getting Started](./getting-started.md)** - Quick start guide

## Contributing Examples

Have a useful example to share? [Submit a pull request](https://github.com/fractary/codex/pulls) or [open an issue](https://github.com/fractary/codex/issues) with your example.

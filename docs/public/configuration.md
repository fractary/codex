---
title: Codex SDK Configuration Guide
description: Complete guide to configuring the Codex SDK including environment variables, config files, and organization resolution
visibility: public
codex_sync_include: []
codex_sync_exclude: []
codex_sync_custom: [developers.fractary.com:src/content/docs/codex/]
tags: [codex, sdk, configuration, environment, setup]
---

# Configuration Guide

The Codex SDK provides a flexible, multi-source configuration system that allows you to customize behavior for your organization and environment.

## Configuration Hierarchy

Configuration is loaded from multiple sources with the following precedence (highest to lowest):

1. **Programmatic Configuration** - Values passed directly to SDK functions
2. **Environment Variables** - Process environment variables
3. **Auto-Detection** - Automatic detection from repository names
4. **Default Values** - SDK default configuration

## Organization Slug

The organization slug is the most fundamental configuration value. It determines:
- Default directory paths (`.{org-slug}/`)
- Organization-specific behavior
- Multi-tenant isolation

### Setting Organization Slug

#### Method 1: Explicit Configuration

```typescript
import { loadConfig } from '@fractary/codex'

const config = loadConfig({
  organizationSlug: 'myorg'
})
```

**CLI Equivalent:**

```bash
export ORGANIZATION_SLUG=myorg
fractary codex config show
```

#### Method 2: Auto-Detection from Repository Name

The SDK can automatically extract the organization slug from repository names following the pattern `codex.{org}.{tld}`:

```typescript
import { loadConfig, extractOrgFromRepoName } from '@fractary/codex'

// Auto-detect from repo name
const config = loadConfig({
  repoName: 'codex.myorg.com'
})

// Or manually extract
const org = extractOrgFromRepoName('codex.fractary.com')
console.log(org) // 'fractary'
```

**Supported Patterns:**

| Repository Name | Extracted Org |
|----------------|---------------|
| `codex.fractary.com` | `fractary` |
| `codex.acme.ai` | `acme` |
| `codex.example.org` | `example` |
| `not-a-codex-repo` | `null` |

#### Method 3: Environment Variables

Set the organization slug via environment variables:

```bash
# Primary variable
export ORGANIZATION_SLUG=myorg

# Alternative variable
export CODEX_ORG_SLUG=myorg
```

```typescript
import { loadConfig } from '@fractary/codex'

// Auto-loads from environment
const config = loadConfig()
```

**Priority:** `ORGANIZATION_SLUG` takes precedence over `CODEX_ORG_SLUG`.

## Directory Configuration

Configure where the SDK looks for and places Codex files.

### Default Directory Structure

By default, directories are scoped to your organization:

```
.myorg/               # Source directory (where codex reads from)
  ├── docs/
  ├── systems/        # Systems directory
  └── ...
```

### Customizing Directories

#### Programmatic Configuration

```typescript
import { loadConfig } from '@fractary/codex'

const config = loadConfig({
  organizationSlug: 'myorg',
  directories: {
    source: '.codex',        // Custom source directory
    target: '.codex',        // Custom target directory
    systems: '.codex/sys'    // Custom systems directory
  }
})
```

#### Environment Variables

```bash
export ORGANIZATION_SLUG=myorg
export CODEX_SOURCE_DIR=.codex
export CODEX_TARGET_DIR=.codex
export CODEX_SYSTEMS_DIR=.codex/sys
```

```typescript
const config = loadConfig() // Loads from environment
```

### Directory Options

| Option | Default | Description |
|--------|---------|-------------|
| `source` | `.{org-slug}` | Directory to read Codex files from |
| `target` | `.{org-slug}` | Directory to write synced files to |
| `systems` | `.{org-slug}/systems` | Directory for system-specific docs |

## Sync Rules Configuration

Control how files are routed to repositories with sync rules.

### Default Sync Rules

```typescript
const defaultRules = {
  preventSelfSync: true,      // Don't sync files back to source repo
  preventCodexSync: true,     // Don't sync to codex.{org}.{tld} repos
  allowProjectOverrides: true // Allow per-file frontmatter overrides
}
```

### Customizing Sync Rules

```typescript
import { loadConfig } from '@fractary/codex'

const config = loadConfig({
  organizationSlug: 'myorg',
  rules: {
    preventSelfSync: false,      // Allow self-sync
    preventCodexSync: false,     // Allow codex sync
    allowProjectOverrides: true,
    defaultInclude: ['*'],       // Default include patterns
    defaultExclude: ['*-test']   // Default exclude patterns
  }
})
```

### Available Rules

#### `preventSelfSync`

**Default:** `true`

Prevents files from syncing back to their source repository.

```typescript
// With preventSelfSync: true
shouldSyncToRepo({
  sourceRepo: 'api-gateway',
  targetRepo: 'api-gateway',  // ❌ Will return false
  // ...
})
```

**Use Case:** Avoid circular syncs and redundant copies.

#### `preventCodexSync`

**Default:** `true`

Prevents files from syncing to other codex repositories (matching `codex.{org}.{tld}`).

```typescript
// With preventCodexSync: true
shouldSyncToRepo({
  sourceRepo: 'codex.myorg.com',
  targetRepo: 'codex.myorg.dev',  // ❌ Will return false
  // ...
})
```

**Use Case:** Keep codex repos as source-only repositories.

#### `allowProjectOverrides`

**Default:** `true`

Allows files to override rules with frontmatter metadata.

```yaml
---
codex_sync_include: ['api-*']  # Overrides default includes
---
```

**Use Case:** Per-file control over distribution.

#### `defaultInclude` / `defaultExclude`

Default include/exclude patterns applied when files don't specify their own.

```typescript
const config = loadConfig({
  organizationSlug: 'myorg',
  rules: {
    defaultInclude: ['*'],           // Include all by default
    defaultExclude: ['*-test', '*-sandbox']  // Except test repos
  }
})
```

## Auto-Sync Patterns

Define automatic sync rules based on file paths, independent of frontmatter.

### Configuration

```typescript
import { loadConfig } from '@fractary/codex'

const config = loadConfig({
  organizationSlug: 'myorg',
  rules: {
    autoSyncPatterns: [
      {
        pattern: 'global/**',     // Files matching this path
        include: ['*'],           // Sync to all repos
        exclude: ['*-test']       // Except test repos
      },
      {
        pattern: 'api/**',
        include: ['api-*'],       // Only to api-* repos
        exclude: ['api-sandbox']
      },
      {
        pattern: 'systems/payments/**',
        include: ['*-payments', '*-billing']
      }
    ]
  }
})
```

### Auto-Sync Pattern Structure

```typescript
interface AutoSyncPattern {
  pattern: string      // File path glob pattern
  include: string[]    // Repository patterns to include
  exclude?: string[]   // Repository patterns to exclude
}
```

### Behavior

Auto-sync patterns are evaluated **before** frontmatter rules:

1. Check if file path matches any auto-sync pattern
2. If match found, use auto-sync include/exclude rules
3. If no match, use frontmatter rules
4. If no frontmatter, use default rules

### Example Use Cases

#### Global Documentation

Sync certain files to all repositories:

```typescript
autoSyncPatterns: [
  {
    pattern: 'global/CODE_OF_CONDUCT.md',
    include: ['*']
  },
  {
    pattern: 'global/SECURITY.md',
    include: ['*'],
    exclude: ['*-demo', '*-sandbox']
  }
]
```

#### System-Specific Docs

Route docs based on system boundaries:

```typescript
autoSyncPatterns: [
  {
    pattern: 'systems/api/**',
    include: ['api-*']
  },
  {
    pattern: 'systems/web/**',
    include: ['web-*', 'frontend-*']
  },
  {
    pattern: 'systems/data/**',
    include: ['*-db', '*-etl', 'data-*']
  }
]
```

## Complete Configuration Example

Here's a complete configuration example with all options:

```typescript
import { loadConfig } from '@fractary/codex'

const config = loadConfig({
  organizationSlug: 'myorg',

  directories: {
    source: '.myorg',
    target: '.myorg',
    systems: '.myorg/systems'
  },

  rules: {
    preventSelfSync: true,
    preventCodexSync: true,
    allowProjectOverrides: true,

    defaultInclude: ['*'],
    defaultExclude: ['*-test', '*-sandbox'],

    autoSyncPatterns: [
      {
        pattern: 'global/**',
        include: ['*'],
        exclude: ['*-test']
      },
      {
        pattern: 'api/**',
        include: ['api-*']
      },
      {
        pattern: 'systems/*/README.md',
        include: ['*'],
        exclude: ['codex.*']
      }
    ]
  }
})
```

## Environment Variable Reference

Complete list of supported environment variables:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ORGANIZATION_SLUG` | string | (required) | Organization identifier |
| `CODEX_ORG_SLUG` | string | (required) | Alternative org slug variable |
| `CODEX_SOURCE_DIR` | string | `.{org-slug}` | Source directory path |
| `CODEX_TARGET_DIR` | string | `.{org-slug}` | Target directory path |
| `CODEX_SYSTEMS_DIR` | string | `.{org-slug}/systems` | Systems directory path |

### Environment Variable Example

```bash
# Required
export ORGANIZATION_SLUG=fractary

# Optional - customize directories
export CODEX_SOURCE_DIR=.codex
export CODEX_TARGET_DIR=.codex
export CODEX_SYSTEMS_DIR=.codex/systems

# Use in application
node app.js
```

## CLI Configuration Commands

The `fractary` CLI provides commands for working with configuration:

### Show Current Configuration

```bash
fractary codex config show
```

Output:
```json
{
  "organizationSlug": "myorg",
  "directories": {
    "source": ".myorg",
    "target": ".myorg",
    "systems": ".myorg/systems"
  },
  "rules": {
    "preventSelfSync": true,
    "preventCodexSync": true,
    "allowProjectOverrides": true
  }
}
```

### Validate Configuration

```bash
fractary codex config validate
```

Output:
```
✓ Configuration is valid
✓ Organization slug: myorg
✓ Source directory exists: .myorg/
✓ All rules are valid
```

### Show Organization

```bash
fractary codex config org
```

Output:
```
myorg
```

## Configuration Validation

Validate configuration programmatically:

```typescript
import { loadConfig, ConfigurationError } from '@fractary/codex'

try {
  const config = loadConfig({
    organizationSlug: 'myorg'
  })

  console.log('✓ Configuration loaded successfully')
  console.log(`Organization: ${config.organizationSlug}`)

} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error('Configuration error:', error.message)
    // Handle configuration errors
  }
}
```

## Best Practices

### 1. Use Environment Variables in CI/CD

```yaml
# GitHub Actions example
env:
  ORGANIZATION_SLUG: ${{ secrets.ORG_SLUG }}
  CODEX_SOURCE_DIR: .codex
```

### 2. Auto-Detect in Development

```typescript
// Automatically extract from repository name
const config = loadConfig({
  repoName: process.env.GITHUB_REPOSITORY?.split('/')[1]
})
```

### 3. Validate Early

```typescript
// Validate configuration at startup
function initializeApp() {
  try {
    const config = loadConfig()
    return config
  } catch (error) {
    console.error('Failed to load configuration:', error)
    process.exit(1)
  }
}
```

### 4. Use Auto-Sync for Common Patterns

Instead of adding frontmatter to every file:

```typescript
// Define once in config
autoSyncPatterns: [
  {
    pattern: 'global/**',
    include: ['*']
  }
]
```

### 5. Keep Codex Repos Source-Only

```typescript
// Default behavior - prevents codex-to-codex sync
rules: {
  preventCodexSync: true
}
```

## Troubleshooting

### Organization Slug Not Found

**Error:** `ConfigurationError: Organization slug could not be determined`

**Solutions:**
1. Set `ORGANIZATION_SLUG` environment variable
2. Pass `organizationSlug` explicitly to `loadConfig()`
3. Pass `repoName` that matches `codex.{org}.{tld}` pattern

### Directory Not Found

**Error:** Directory `.myorg` does not exist

**Solutions:**
1. Create the directory: `mkdir .myorg`
2. Customize directory path via `directories.source`
3. Check environment variables are set correctly

### Auto-Detection Not Working

**Problem:** Organization not detected from repo name

**Check:**
1. Repository name follows pattern: `codex.{org}.{tld}`
2. Auto-detection is enabled (default)
3. Repo name is passed correctly: `repoName: 'codex.myorg.com'`

## Next Steps

- **[API Reference](./api-reference.md)** - Complete API documentation
- **[CLI Usage](./cli-usage.md)** - Using configuration via CLI
- **[Examples](./examples.md)** - Real-world configuration examples
- **[Getting Started](./getting-started.md)** - Quick start guide

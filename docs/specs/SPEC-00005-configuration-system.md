# SPEC-00005: Configuration System

**Status**: Draft
**Created**: 2025-10-06
**Author**: Fractary Engineering
**Related Specs**: SPEC-00001 (Overview), SPEC-00004 (Routing)

## Overview

This specification defines how the Codex SDK loads, validates, and resolves configuration from multiple sources. The configuration system supports organization-wide defaults, project-specific overrides, environment variables, and programmatic configuration.

## Goals

1. **Multi-source configuration** - Environment variables, config files, programmatic
2. **Layered defaults** - Org-wide defaults with project overrides
3. **Organization discovery** - Auto-detect from context or explicit configuration
4. **Validation** - Type-safe configuration with Zod schemas
5. **Flexibility** - Works in CI/CD, local dev, and CLI environments

## Configuration Hierarchy

Configuration is resolved in this order (later sources override earlier):

1. **SDK defaults** - Built-in sensible defaults
2. **Organization config file** - `.codex/config.json` in codex repo
3. **Project config file** - `.codex/config.json` in project repo
4. **Environment variables** - `CODEX_*` or `ORGANIZATION_*` vars
5. **Programmatic config** - Passed to SDK functions

## Configuration Schema

### CodexConfig

```typescript
import { z } from 'zod'

export const CodexConfigSchema = z.object({
  // Organization identity
  organizationSlug: z.string(),

  // Directory structure
  directories: z.object({
    source: z.string().optional(),      // Default: `.${organizationSlug}`
    target: z.string().optional(),      // Default: `.${organizationSlug}`
    systems: z.string().optional(),     // Default: `.${organizationSlug}/systems`
  }).optional(),

  // Sync rules (see SPEC-00004)
  rules: z.object({
    autoSyncPatterns: z.array(z.object({
      pattern: z.string(),
      include: z.array(z.string()),
      exclude: z.array(z.string()).optional()
    })).optional(),

    preventSelfSync: z.boolean().optional(),
    preventCodexSync: z.boolean().optional(),
    allowProjectOverrides: z.boolean().optional(),

    defaultInclude: z.array(z.string()).optional(),
    defaultExclude: z.array(z.string()).optional()
  }).optional()
}).strict()

export type CodexConfig = z.infer<typeof CodexConfigSchema>
```

### Example Configuration

```json
{
  "organizationSlug": "fractary",
  "directories": {
    "source": ".fractary",
    "target": ".fractary",
    "systems": ".fractary/systems"
  },
  "rules": {
    "autoSyncPatterns": [
      {
        "pattern": "*/docs/schema/*.json",
        "include": ["*"],
        "exclude": []
      }
    ],
    "preventSelfSync": true,
    "preventCodexSync": true,
    "allowProjectOverrides": true
  }
}
```

## Organization Discovery

### Resolve Organization Slug

```typescript
export interface ResolveOrgOptions {
  orgSlug?: string           // Explicit org slug
  repoName?: string          // Repo name for auto-detection
  autoDetect?: boolean       // Enable auto-detection (default: true)
}

/**
 * Resolve organization slug from multiple sources
 *
 * Priority:
 * 1. Explicit orgSlug parameter
 * 2. Auto-detect from repoName (if enabled)
 * 3. Environment variable (ORGANIZATION_SLUG or CODEX_ORG_SLUG)
 * 4. Throw ConfigurationError if none found
 */
export function resolveOrganization(
  options: ResolveOrgOptions = {}
): string {
  const { orgSlug, repoName, autoDetect = true } = options

  // 1. Explicit parameter
  if (orgSlug) {
    return orgSlug
  }

  // 2. Auto-detect from repo name
  if (autoDetect && repoName) {
    const detected = extractOrgFromRepoName(repoName)
    if (detected) {
      return detected
    }
  }

  // 3. Environment variables
  const envOrg = process.env.ORGANIZATION_SLUG ||
                 process.env.CODEX_ORG_SLUG

  if (envOrg) {
    return envOrg
  }

  // 4. Fail - required parameter missing
  throw new ConfigurationError(
    'Organization slug could not be determined. ' +
    'Set ORGANIZATION_SLUG environment variable or pass orgSlug option.'
  )
}

/**
 * Extract org slug from repo name pattern
 *
 * Patterns:
 * - codex.fractary.com → "fractary"
 * - codex.acme.ai → "acme"
 * - codex.my-org.io → "my-org"
 */
export function extractOrgFromRepoName(repoName: string): string | null {
  // Pattern: codex.{org}.{tld}
  const match = repoName.match(/^codex\.([^.]+)\.[^.]+$/)

  if (match) {
    return match[1]
  }

  return null
}
```

## Configuration Loading

### Load Configuration

```typescript
export interface LoadConfigOptions {
  organizationSlug?: string
  repoName?: string
  configPath?: string       // Path to config file (optional)
  env?: Record<string, string>  // Environment variables (default: process.env)
}

/**
 * Load and resolve configuration from all sources
 */
export async function loadConfig(
  options: LoadConfigOptions = {}
): Promise<CodexConfig> {
  // 1. Resolve organization slug
  const orgSlug = resolveOrganization({
    orgSlug: options.organizationSlug,
    repoName: options.repoName
  })

  // 2. Build base config with defaults
  let config: Partial<CodexConfig> = {
    organizationSlug: orgSlug,
    directories: getDefaultDirectories(orgSlug),
    rules: getDefaultRules()
  }

  // 3. Load from config file (if exists)
  if (options.configPath) {
    const fileConfig = await loadConfigFile(options.configPath)
    config = mergeConfigs(config, fileConfig)
  }

  // 4. Apply environment variable overrides
  const envConfig = loadConfigFromEnv(options.env || process.env)
  config = mergeConfigs(config, envConfig)

  // 5. Validate final configuration
  return CodexConfigSchema.parse(config)
}
```

### Default Values

```typescript
/**
 * Get default directory structure
 */
function getDefaultDirectories(orgSlug: string) {
  return {
    source: `.${orgSlug}`,
    target: `.${orgSlug}`,
    systems: `.${orgSlug}/systems`
  }
}

/**
 * Get default sync rules
 */
function getDefaultRules(): SyncRules {
  return {
    autoSyncPatterns: [],
    preventSelfSync: true,
    preventCodexSync: true,
    allowProjectOverrides: true,
    defaultInclude: [],
    defaultExclude: []
  }
}
```

## Configuration File Format

### .codex/config.json

```json
{
  "organizationSlug": "fractary",
  "directories": {
    "source": ".fractary",
    "target": ".fractary"
  },
  "rules": {
    "autoSyncPatterns": [
      {
        "pattern": "*/docs/schema/*.json",
        "include": ["*"]
      },
      {
        "pattern": "*/security/**/*.md",
        "include": ["*"],
        "exclude": ["*-public"]
      }
    ],
    "preventSelfSync": true,
    "allowProjectOverrides": true
  }
}
```

### Loading Config Files

```typescript
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

async function loadConfigFile(
  configPath: string
): Promise<Partial<CodexConfig>> {
  if (!existsSync(configPath)) {
    return {}
  }

  try {
    const content = await readFile(configPath, 'utf-8')
    const parsed = JSON.parse(content)

    // Validate partial config (allow missing fields)
    const result = CodexConfigSchema.partial().safeParse(parsed)

    if (result.success) {
      return result.data
    } else {
      throw new ConfigurationError(
        `Invalid config file: ${configPath}`,
        { cause: result.error }
      )
    }
  } catch (error) {
    if (error instanceof ConfigurationError) throw error

    throw new ConfigurationError(
      `Failed to load config file: ${configPath}`,
      { cause: error }
    )
  }
}
```

## Environment Variables

### Supported Variables

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `ORGANIZATION_SLUG` | string | Organization identifier | `fractary` |
| `CODEX_ORG_SLUG` | string | Alternative org slug | `fractary` |
| `CODEX_SOURCE_DIR` | string | Source directory | `.fractary` |
| `CODEX_TARGET_DIR` | string | Target directory | `.fractary` |
| `CODEX_PREVENT_SELF_SYNC` | boolean | Prevent self-sync | `true` |
| `CODEX_ALLOW_PROJECT_OVERRIDES` | boolean | Allow overrides | `true` |

### Loading from Environment

```typescript
function loadConfigFromEnv(
  env: Record<string, string | undefined>
): Partial<CodexConfig> {
  const config: Partial<CodexConfig> = {}

  // Organization
  if (env.ORGANIZATION_SLUG || env.CODEX_ORG_SLUG) {
    config.organizationSlug = env.ORGANIZATION_SLUG || env.CODEX_ORG_SLUG
  }

  // Directories
  if (env.CODEX_SOURCE_DIR || env.CODEX_TARGET_DIR) {
    config.directories = {
      source: env.CODEX_SOURCE_DIR,
      target: env.CODEX_TARGET_DIR
    }
  }

  // Rules
  const rules: Partial<SyncRules> = {}

  if (env.CODEX_PREVENT_SELF_SYNC !== undefined) {
    rules.preventSelfSync = env.CODEX_PREVENT_SELF_SYNC === 'true'
  }

  if (env.CODEX_ALLOW_PROJECT_OVERRIDES !== undefined) {
    rules.allowProjectOverrides = env.CODEX_ALLOW_PROJECT_OVERRIDES === 'true'
  }

  if (Object.keys(rules).length > 0) {
    config.rules = rules
  }

  return config
}
```

## Configuration Merging

```typescript
/**
 * Deep merge two configuration objects
 * Later config overrides earlier config
 */
function mergeConfigs(
  base: Partial<CodexConfig>,
  override: Partial<CodexConfig>
): Partial<CodexConfig> {
  return {
    organizationSlug: override.organizationSlug ?? base.organizationSlug,

    directories: {
      ...base.directories,
      ...override.directories
    },

    rules: {
      ...base.rules,
      ...override.rules,

      // Arrays are replaced, not merged
      autoSyncPatterns: override.rules?.autoSyncPatterns ??
                        base.rules?.autoSyncPatterns,
      defaultInclude: override.rules?.defaultInclude ??
                      base.rules?.defaultInclude,
      defaultExclude: override.rules?.defaultExclude ??
                      base.rules?.defaultExclude
    }
  }
}
```

## Repository Discovery

### Discover Codex Repository

```typescript
export interface DiscoverRepoOptions {
  org?: string              // Organization to search (optional)
  githubToken?: string      // GitHub token (optional)
}

/**
 * Discover codex repository for organization
 *
 * This is a helper for CLI/workflows, not core SDK logic
 */
export async function discoverCodexRepo(
  options: DiscoverRepoOptions = {}
): Promise<string | null> {
  // This function would use GitHub API or git commands
  // Not part of core SDK - delegated to CLI/bundles

  throw new Error(
    'discoverCodexRepo requires GitHub API access - ' +
    'use fractary-cli or provide explicit repo name'
  )
}
```

## Use Cases

### Use Case 1: Auto-Detect Organization

```typescript
import { loadConfig } from '@fractary/codex'

// Running in codex.fractary.com repo
const config = await loadConfig({
  repoName: 'codex.fractary.com'
})

console.log(config.organizationSlug)  // "fractary"
console.log(config.directories.source)  // ".fractary"
```

### Use Case 2: Explicit Configuration

```typescript
const config = await loadConfig({
  organizationSlug: 'acme',
  configPath: '.codex/config.json'
})
```

### Use Case 3: Environment Variables

```bash
export ORGANIZATION_SLUG=fractary
export CODEX_PREVENT_SELF_SYNC=true
```

```typescript
const config = await loadConfig()
// Loads from environment variables
```

### Use Case 4: Programmatic Override

```typescript
const config = await loadConfig({
  organizationSlug: 'fractary'
})

// Override specific rules
const customConfig = {
  ...config,
  rules: {
    ...config.rules,
    preventSelfSync: false
  }
}
```

## Testing Requirements

### Unit Tests

1. **Organization resolution**
   - Explicit parameter
   - Auto-detect from repo name
   - Environment variables
   - Error on missing config

2. **Config loading**
   - Default values
   - File loading
   - Environment variables
   - Merging priorities

3. **Config merging**
   - Deep merge behavior
   - Array replacement
   - Partial configs

4. **Validation**
   - Valid configs pass
   - Invalid configs fail
   - Missing required fields

### Test Cases

```typescript
describe('resolveOrganization', () => {
  test('uses explicit parameter', () => {
    const org = resolveOrganization({ orgSlug: 'acme' })
    expect(org).toBe('acme')
  })

  test('auto-detects from repo name', () => {
    const org = resolveOrganization({
      repoName: 'codex.fractary.com',
      autoDetect: true
    })
    expect(org).toBe('fractary')
  })

  test('throws on missing config', () => {
    expect(() => resolveOrganization()).toThrow(ConfigurationError)
  })
})

describe('loadConfig', () => {
  test('loads defaults', async () => {
    const config = await loadConfig({
      organizationSlug: 'fractary'
    })

    expect(config.organizationSlug).toBe('fractary')
    expect(config.directories.source).toBe('.fractary')
    expect(config.rules.preventSelfSync).toBe(true)
  })

  test('merges file config', async () => {
    const config = await loadConfig({
      organizationSlug: 'fractary',
      configPath: 'fixtures/custom-config.json'
    })

    expect(config.rules.autoSyncPatterns).toHaveLength(1)
  })
})
```

## API Surface

### Public Exports

```typescript
// Configuration loading
export function loadConfig(options?: LoadConfigOptions): Promise<CodexConfig>
export function loadConfigSync(options?: LoadConfigOptions): CodexConfig

// Organization resolution
export function resolveOrganization(options?: ResolveOrgOptions): string
export function extractOrgFromRepoName(repoName: string): string | null

// Default values
export function getDefaultConfig(orgSlug: string): CodexConfig

// Schema and types
export { CodexConfigSchema }
export type { CodexConfig, LoadConfigOptions, ResolveOrgOptions }
```

## Success Criteria

- [ ] Auto-detects organization from repo name
- [ ] Loads config from multiple sources
- [ ] Merges configs with correct priority
- [ ] Validates all config values
- [ ] Environment variables work
- [ ] Throws clear errors on missing config
- [ ] 90%+ test coverage

## Examples

### Example 1: Simple Load

```typescript
import { loadConfig } from '@fractary/codex'

const config = await loadConfig({
  organizationSlug: 'fractary'
})

console.log(config)
/*
{
  organizationSlug: 'fractary',
  directories: {
    source: '.fractary',
    target: '.fractary',
    systems: '.fractary/systems'
  },
  rules: {
    preventSelfSync: true,
    preventCodexSync: true,
    allowProjectOverrides: true,
    autoSyncPatterns: []
  }
}
*/
```

### Example 2: Custom Config

```typescript
// .codex/config.json
{
  "organizationSlug": "fractary",
  "rules": {
    "autoSyncPatterns": [
      {
        "pattern": "*/docs/schema/*.json",
        "include": ["*"]
      }
    ]
  }
}

// Load config
const config = await loadConfig({
  configPath: '.codex/config.json'
})

console.log(config.rules.autoSyncPatterns.length)  // 1
```

## Changelog

- 2025-10-06: Initial draft

---
title: Codex SDK API Reference
description: Complete API documentation for all Codex SDK functions and types
visibility: public
codex_sync_include: []
codex_sync_exclude: []
codex_sync_custom: [developers.fractary.com:src/content/docs/codex/]
tags: [codex, sdk, api, reference, documentation]
---

# API Reference

Complete API documentation for the Codex SDK.

## Metadata Parsing

Functions for parsing and validating YAML frontmatter from markdown files.

### `parseMetadata()`

Parse YAML frontmatter from markdown content.

```typescript
function parseMetadata(
  content: string,
  options?: ParseMetadataOptions
): ParseResult
```

**Parameters:**

- `content` (string): Markdown file content with optional frontmatter
- `options` (ParseMetadataOptions, optional):
  - `strict` (boolean): Throw on validation errors (default: `true`)
  - `normalize` (boolean): Normalize line endings (default: `true`)

**Returns:** `ParseResult` object containing:
- `metadata` (Metadata): Parsed and validated metadata object
- `content` (string): Document content without frontmatter
- `raw` (string): Raw frontmatter string

**Throws:** `ValidationError` if frontmatter is invalid (in strict mode)

**Example:**

```typescript
import { parseMetadata } from '@fractary/codex'

const markdown = `---
codex_sync_include: ['api-*']
tags: [api, docs]
---

# Documentation
`

const result = parseMetadata(markdown)
console.log(result.metadata.codex_sync_include) // ['api-*']
console.log(result.content) // '# Documentation\n'
```

**CLI Equivalent:**

```bash
fractary codex parse docs/file.md
```

---

### `hasFrontmatter()`

Check if content contains YAML frontmatter.

```typescript
function hasFrontmatter(content: string): boolean
```

**Parameters:**

- `content` (string): Content to check

**Returns:** `true` if content has frontmatter, `false` otherwise

**Example:**

```typescript
import { hasFrontmatter } from '@fractary/codex'

hasFrontmatter('---\ntitle: Test\n---\n# Content') // true
hasFrontmatter('# Just content') // false
```

---

### `validateMetadata()`

Validate metadata object against schema.

```typescript
function validateMetadata(
  metadata: unknown
): { valid: boolean; errors?: string[] }
```

**Parameters:**

- `metadata` (unknown): Metadata object to validate

**Returns:** Validation result with `valid` boolean and optional `errors` array

**Example:**

```typescript
import { validateMetadata } from '@fractary/codex'

const metadata = {
  codex_sync_include: ['api-*'],
  visibility: 'internal'
}

const result = validateMetadata(metadata)
if (!result.valid) {
  console.error('Validation errors:', result.errors)
}
```

---

### `extractRawFrontmatter()`

Extract raw frontmatter string without parsing or validation.

```typescript
function extractRawFrontmatter(content: string): string | null
```

**Parameters:**

- `content` (string): Content to extract from

**Returns:** Raw frontmatter string or `null` if no frontmatter found

**Example:**

```typescript
import { extractRawFrontmatter } from '@fractary/codex'

const raw = extractRawFrontmatter(markdown)
console.log(raw) // 'codex_sync_include: [\'api-*\']\ntags: [api, docs]'
```

---

## Pattern Matching

Functions for matching glob patterns against strings.

### `matchPattern()`

Match a single glob pattern against a value.

```typescript
function matchPattern(pattern: string, value: string): boolean
```

**Parameters:**

- `pattern` (string): Glob pattern (e.g., `'api-*'`, `'core-*'`)
- `value` (string): Value to test (e.g., `'api-gateway'`)

**Returns:** `true` if pattern matches value

**Example:**

```typescript
import { matchPattern } from '@fractary/codex'

matchPattern('api-*', 'api-gateway')  // true
matchPattern('api-*', 'web-app')      // false
matchPattern('*-test', 'api-test')    // true
```

---

### `matchAnyPattern()`

Check if value matches any pattern in an array.

```typescript
function matchAnyPattern(patterns: string[], value: string): boolean
```

**Parameters:**

- `patterns` (string[]): Array of glob patterns
- `value` (string): Value to test

**Returns:** `true` if value matches any pattern

**Special Cases:**
- `['*']` matches everything
- `[]` matches nothing

**Example:**

```typescript
import { matchAnyPattern } from '@fractary/codex'

matchAnyPattern(['api-*', 'core-*'], 'api-gateway')  // true
matchAnyPattern(['api-*', 'core-*'], 'web-app')      // false
matchAnyPattern(['*'], 'anything')                    // true
```

---

### `filterByPatterns()`

Filter an array of values by glob patterns.

```typescript
function filterByPatterns(
  patterns: string[],
  values: string[]
): string[]
```

**Parameters:**

- `patterns` (string[]): Array of glob patterns
- `values` (string[]): Array of values to filter

**Returns:** Array of values matching any pattern

**Example:**

```typescript
import { filterByPatterns } from '@fractary/codex'

const repos = ['api-gateway', 'api-auth', 'web-app', 'core-db']
const apiRepos = filterByPatterns(['api-*'], repos)
// ['api-gateway', 'api-auth']
```

---

### `evaluatePatterns()`

Evaluate include/exclude pattern rules.

```typescript
function evaluatePatterns(options: {
  value: string
  include?: string[]
  exclude?: string[]
}): boolean
```

**Parameters:**

- `options.value` (string): Value to evaluate
- `options.include` (string[], optional): Include patterns
- `options.exclude` (string[], optional): Exclude patterns

**Returns:** `true` if value should be included

**Behavior:**
- Exclusions take priority over inclusions
- No include patterns = include by default
- Empty arrays = use default behavior

**Example:**

```typescript
import { evaluatePatterns } from '@fractary/codex'

evaluatePatterns({
  value: 'api-gateway',
  include: ['api-*'],
  exclude: ['*-test']
}) // true

evaluatePatterns({
  value: 'api-test',
  include: ['api-*'],
  exclude: ['*-test']
}) // false (excluded)
```

---

## Configuration

Functions for loading and managing configuration.

### `loadConfig()`

Load configuration from all sources (env vars, auto-detection, etc.).

```typescript
function loadConfig(options?: LoadConfigOptions): CodexConfig
```

**Parameters:**

- `options` (LoadConfigOptions, optional):
  - `organizationSlug` (string): Explicit organization identifier
  - `repoName` (string): Repository name for auto-detection
  - `env` (Record<string, string>): Custom environment variables

**Returns:** `CodexConfig` object with:
- `organizationSlug` (string): Organization identifier
- `directories` (object): Directory configuration
  - `source` (string): Source directory
  - `target` (string): Target directory
  - `systems` (string): Systems directory
- `rules` (SyncRules): Sync rules configuration

**Throws:** `ConfigurationError` if organization slug cannot be determined

**Example:**

```typescript
import { loadConfig } from '@fractary/codex'

const config = loadConfig({
  organizationSlug: 'myorg'
})

console.log(config.directories.source) // '.myorg'
```

**CLI Equivalent:**

```bash
fractary codex config show
```

---

### `resolveOrganization()`

Resolve organization slug from multiple sources.

```typescript
function resolveOrganization(
  options?: ResolveOrgOptions
): string
```

**Parameters:**

- `options` (ResolveOrgOptions, optional):
  - `orgSlug` (string): Explicit organization slug
  - `repoName` (string): Repository name for auto-detection
  - `autoDetect` (boolean): Enable auto-detection (default: `true`)

**Returns:** Organization slug string

**Throws:** `ConfigurationError` if slug cannot be determined

**Priority:**
1. Explicit `orgSlug` parameter
2. Auto-detect from `repoName` (if enabled)
3. Environment variables (`ORGANIZATION_SLUG`, `CODEX_ORG_SLUG`)
4. Throw error

**Example:**

```typescript
import { resolveOrganization } from '@fractary/codex'

// Explicit
const org1 = resolveOrganization({ orgSlug: 'myorg' })

// Auto-detect from repo name
const org2 = resolveOrganization({ repoName: 'codex.myorg.com' })
// Returns: 'myorg'

// From environment
process.env.ORGANIZATION_SLUG = 'myorg'
const org3 = resolveOrganization()
```

---

### `extractOrgFromRepoName()`

Extract organization slug from repository name pattern.

```typescript
function extractOrgFromRepoName(repoName: string): string | null
```

**Parameters:**

- `repoName` (string): Repository name

**Returns:** Organization slug or `null` if pattern doesn't match

**Pattern:** `codex.{org}.{tld}`

**Example:**

```typescript
import { extractOrgFromRepoName } from '@fractary/codex'

extractOrgFromRepoName('codex.fractary.com')  // 'fractary'
extractOrgFromRepoName('codex.acme.ai')       // 'acme'
extractOrgFromRepoName('not-a-codex-repo')    // null
```

---

### `getDefaultConfig()`

Get default configuration for an organization.

```typescript
function getDefaultConfig(orgSlug: string): CodexConfig
```

**Parameters:**

- `orgSlug` (string): Organization identifier

**Returns:** Default `CodexConfig` object

**Example:**

```typescript
import { getDefaultConfig } from '@fractary/codex'

const config = getDefaultConfig('myorg')
console.log(config)
// {
//   organizationSlug: 'myorg',
//   directories: { source: '.myorg', target: '.myorg', ... },
//   rules: { preventSelfSync: true, ... }
// }
```

---

## Routing

Functions for determining file distribution.

### `shouldSyncToRepo()`

Determine if a file should sync to a target repository.

```typescript
function shouldSyncToRepo(options: ShouldSyncOptions): boolean
```

**Parameters:**

- `options.filePath` (string): Path to file being evaluated
- `options.fileMetadata` (Metadata): Parsed frontmatter metadata
- `options.targetRepo` (string): Repository to sync to
- `options.sourceRepo` (string): Repository file is from
- `options.rules` (SyncRules, optional): Routing rules

**Returns:** `true` if file should sync to target repository

**Example:**

```typescript
import { shouldSyncToRepo } from '@fractary/codex'

const shouldSync = shouldSyncToRepo({
  filePath: 'docs/api-guide.md',
  fileMetadata: {
    codex_sync_include: ['api-*'],
    codex_sync_exclude: ['*-test']
  },
  targetRepo: 'api-gateway',
  sourceRepo: 'codex.myorg.com'
})

console.log(shouldSync) // true
```

**CLI Equivalent:**

```bash
fractary codex should-sync docs/api-guide.md api-gateway
```

---

### `getTargetRepos()`

Get all repositories that should receive a file.

```typescript
function getTargetRepos(options: {
  filePath: string
  fileMetadata: Metadata
  sourceRepo: string
  allRepos: string[]
  rules?: SyncRules
}): string[]
```

**Parameters:**

- `options.filePath` (string): Path to file
- `options.fileMetadata` (Metadata): File metadata
- `options.sourceRepo` (string): Source repository
- `options.allRepos` (string[]): All available repositories
- `options.rules` (SyncRules, optional): Routing rules

**Returns:** Array of repository names that should receive the file

**Example:**

```typescript
import { getTargetRepos } from '@fractary/codex'

const targets = getTargetRepos({
  filePath: 'docs/api-guide.md',
  fileMetadata: { codex_sync_include: ['api-*'] },
  sourceRepo: 'codex.myorg.com',
  allRepos: [
    'api-gateway',
    'api-auth',
    'api-test',
    'web-app'
  ]
})

console.log(targets) // ['api-gateway', 'api-auth']
```

**CLI Equivalent:**

```bash
fractary codex targets docs/api-guide.md
```

---

## Custom Sync Destinations

Functions for working with custom sync destinations that specify external repositories and paths.

### `parseCustomDestination()`

Parse a custom sync destination string in the format `repo:path`.

```typescript
function parseCustomDestination(value: string): CustomSyncDestination
```

**Parameters:**

- `value` (string): Destination string in format `repo:path`

**Returns:** `CustomSyncDestination` object with:
- `repo` (string): Repository identifier
- `path` (string): Target path within repository

**Throws:** `ValidationError` if format is invalid

**Example:**

```typescript
import { parseCustomDestination } from '@fractary/codex'

const dest = parseCustomDestination('developers.fractary.com:src/content/docs/api/')

console.log(dest.repo) // 'developers.fractary.com'
console.log(dest.path) // 'src/content/docs/api/'
```

---

### `getCustomSyncDestinations()`

Extract all custom sync destinations from file metadata.

```typescript
function getCustomSyncDestinations(
  metadata: Metadata
): CustomSyncDestination[]
```

**Parameters:**

- `metadata` (Metadata): Parsed frontmatter metadata

**Returns:** Array of `CustomSyncDestination` objects

**Behavior:**
- Returns empty array if `codex_sync_custom` is not defined
- Skips invalid destination formats silently
- Parses all valid destinations

**Example:**

```typescript
import { parseMetadata, getCustomSyncDestinations } from '@fractary/codex'

const markdown = `---
codex_sync_custom:
  - developers.fractary.com:src/content/docs/api/
  - docs.example.com:reference/
---

# Documentation
`

const { metadata } = parseMetadata(markdown)
const destinations = getCustomSyncDestinations(metadata)

console.log(destinations)
// [
//   { repo: 'developers.fractary.com', path: 'src/content/docs/api/' },
//   { repo: 'docs.example.com', path: 'reference/' }
// ]
```

**Use Case:**

Custom sync destinations allow you to publish documentation to external sites like `developers.fractary.com` with specific target paths, separate from the normal repository sync process.

---

## Types

### `Metadata`

Frontmatter metadata object.

```typescript
interface Metadata {
  org?: string
  system?: string
  codex_sync_include?: string[]
  codex_sync_exclude?: string[]
  codex_sync_custom?: string[]
  title?: string
  description?: string
  visibility?: 'public' | 'internal' | 'private'
  audience?: string[]
  tags?: string[]
  created?: string
  updated?: string
  [key: string]: unknown  // Additional fields allowed
}
```

---

### `CodexConfig`

Complete configuration object.

```typescript
interface CodexConfig {
  organizationSlug: string
  directories?: {
    source?: string
    target?: string
    systems?: string
  }
  rules?: SyncRules
}
```

---

### `SyncRules`

Sync routing rules.

```typescript
interface SyncRules {
  autoSyncPatterns?: AutoSyncPattern[]
  preventSelfSync?: boolean
  preventCodexSync?: boolean
  allowProjectOverrides?: boolean
  defaultInclude?: string[]
  defaultExclude?: string[]
}
```

---

### `AutoSyncPattern`

Auto-sync pattern configuration.

```typescript
interface AutoSyncPattern {
  pattern: string      // File path pattern
  include: string[]    // Repo patterns to include
  exclude?: string[]   // Repo patterns to exclude
}
```

---

### `CustomSyncDestination`

Custom sync destination configuration.

```typescript
interface CustomSyncDestination {
  repo: string    // Repository identifier (e.g., "developers.fractary.com")
  path: string    // Target path within repository (e.g., "src/content/docs/api/")
}
```

---

## Errors

### `CodexError`

Base error class for all SDK errors.

```typescript
class CodexError extends Error {
  constructor(message: string, options?: ErrorOptions)
}
```

---

### `ConfigurationError`

Thrown when configuration is missing or invalid.

```typescript
class ConfigurationError extends CodexError {
  constructor(message: string, options?: ErrorOptions)
}
```

---

### `ValidationError`

Thrown when data validation fails.

```typescript
class ValidationError extends CodexError {
  constructor(message: string, options?: ErrorOptions)
}
```

---

## Next Steps

- **[Configuration Guide](./configuration.md)** - Detailed configuration options
- **[CLI Usage](./cli-usage.md)** - Command-line interface
- **[Examples](./examples.md)** - Practical examples

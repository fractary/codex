# SPEC-00002: Metadata Parsing

**Status**: Draft
**Created**: 2025-10-06
**Author**: Fractary Engineering
**Related Specs**: SPEC-00001 (Overview), SPEC-00004 (Routing)

## Overview

This specification defines how the Codex SDK parses and validates YAML frontmatter metadata from markdown files. Frontmatter contains critical information that drives sync routing decisions, including which repositories should receive specific documents.

## Goals

1. **Parse YAML frontmatter** from markdown files reliably
2. **Validate metadata** against defined schemas using Zod
3. **Handle multiple formats** for backwards compatibility
4. **Support standardized format** going forward
5. **Robust error handling** for malformed frontmatter

## Frontmatter Format

### Standard Format (Recommended)

```yaml
---
org: fractary
system: api-gateway
title: API Design Standards
description: Guidelines for designing RESTful APIs
codex_sync_include: [api-*, core-*]
codex_sync_exclude: [*-test, *-dev]
visibility: internal
audience: [developers, architects]
tags: [api, rest, standards]
created: 2025-10-06
updated: 2025-10-06
---

# Document Content Here
```

### Key Fields

#### Required Fields
- None (all fields are optional, but some combinations are recommended)

#### Common Fields

**Organizational**:
- `org`: Organization identifier (e.g., `fractary`, `acme`)
- `system`: System/project this document belongs to (e.g., `api-gateway`, `codex.fractary.com`)

**Sync Rules**:
- `codex_sync_include`: Array of glob patterns for repos that should receive this file
  - Example: `[api-*, core-*]` - sync to repos starting with `api-` or `core-`
  - Special: `[*]` - sync to all repositories
- `codex_sync_exclude`: Array of glob patterns for repos to exclude
  - Example: `[*-test, *-dev]` - exclude test and dev repos

**Metadata**:
- `title`: Document title
- `description`: Brief description
- `visibility`: `public`, `internal`, or `private`
- `audience`: Target audience (array)
- `tags`: Classification tags (array)
- `created`: Creation date (ISO 8601)
- `updated`: Last update date (ISO 8601)

## Zod Schema

```typescript
import { z } from 'zod'

export const MetadataSchema = z.object({
  // Organizational
  org: z.string().optional(),
  system: z.string().optional(),

  // Sync rules
  codex_sync_include: z.array(z.string()).optional(),
  codex_sync_exclude: z.array(z.string()).optional(),

  // Metadata
  title: z.string().optional(),
  description: z.string().optional(),
  visibility: z.enum(['public', 'internal', 'private']).optional(),
  audience: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),

  // Timestamps
  created: z.string().optional(),  // ISO 8601 date string
  updated: z.string().optional(),

  // Allow additional fields (for extensibility)
}).passthrough()

export type Metadata = z.infer<typeof MetadataSchema>
```

## Parser Implementation

### Core Function

```typescript
import yaml from 'js-yaml'

export interface ParseMetadataOptions {
  strict?: boolean  // Throw on validation errors (default: true)
  normalize?: boolean  // Normalize line endings (default: true)
}

export interface ParseResult {
  metadata: Metadata
  content: string  // Document content without frontmatter
  raw: string  // Raw frontmatter block
}

/**
 * Extracts and parses YAML frontmatter from markdown content
 *
 * @param content - Markdown file content
 * @param options - Parsing options
 * @returns Parsed metadata and content
 * @throws ConfigurationError if frontmatter is malformed
 */
export function parseMetadata(
  content: string,
  options: ParseMetadataOptions = {}
): ParseResult {
  const { strict = true, normalize = true } = options

  // Normalize line endings (CRLF → LF)
  const normalizedContent = normalize
    ? content.replace(/\r\n/g, '\n')
    : content

  // Extract frontmatter block
  const frontmatterMatch = normalizedContent.match(
    /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  )

  if (!frontmatterMatch) {
    // No frontmatter found
    return {
      metadata: {},
      content: normalizedContent,
      raw: ''
    }
  }

  const [, rawFrontmatter, documentContent] = frontmatterMatch

  try {
    // Parse YAML
    const parsed = yaml.load(rawFrontmatter) as Record<string, unknown>

    // Validate against schema
    const metadata = strict
      ? MetadataSchema.parse(parsed)
      : MetadataSchema.safeParse(parsed).data || {}

    return {
      metadata,
      content: documentContent,
      raw: rawFrontmatter
    }
  } catch (error) {
    if (strict) {
      throw new ValidationError(
        `Invalid frontmatter: ${error.message}`,
        { cause: error }
      )
    }

    // Non-strict mode: return empty metadata
    return {
      metadata: {},
      content: documentContent,
      raw: rawFrontmatter
    }
  }
}
```

### Helper Functions

```typescript
/**
 * Check if content has frontmatter
 */
export function hasFrontmatter(content: string): boolean {
  const normalized = content.replace(/\r\n/g, '\n')
  return /^---\n[\s\S]*?\n---\n/.test(normalized)
}

/**
 * Validate metadata without parsing content
 */
export function validateMetadata(
  metadata: unknown
): { valid: boolean; errors?: string[] } {
  const result = MetadataSchema.safeParse(metadata)

  if (result.success) {
    return { valid: true }
  }

  return {
    valid: false,
    errors: result.error.issues.map(issue => issue.message)
  }
}

/**
 * Extract only frontmatter (no validation)
 */
export function extractRawFrontmatter(content: string): string | null {
  const normalized = content.replace(/\r\n/g, '\n')
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n/)
  return match ? match[1] : null
}
```

## Backwards Compatibility

The SDK will **read** legacy formats but **recommend** migration to the standard format.

### Legacy Format Support

```yaml
---
# Legacy nested format (still supported for reading)
codex:
  includes: [api-*, core-*]
  excludes: [*-test]
---
```

```typescript
/**
 * Normalize legacy formats to standard format
 */
function normalizeLegacyMetadata(parsed: any): Metadata {
  const normalized: any = { ...parsed }

  // Handle nested codex.includes → codex_sync_include
  if (parsed.codex?.includes && !parsed.codex_sync_include) {
    normalized.codex_sync_include = parsed.codex.includes
  }

  // Handle nested codex.excludes → codex_sync_exclude
  if (parsed.codex?.excludes && !parsed.codex_sync_exclude) {
    normalized.codex_sync_exclude = parsed.codex.excludes
  }

  return normalized
}
```

## Line Ending Handling

The parser must handle both CRLF (Windows) and LF (Unix) line endings.

### Implementation

```typescript
/**
 * Normalize line endings before parsing
 */
function normalizeLineEndings(content: string): string {
  // Replace CRLF with LF
  return content.replace(/\r\n/g, '\n')
}
```

### Why This Matters

The existing bash script has explicit handling for carriage returns:

```bash
# From existing workflow
tr -d '\r' < "$file" | awk '...'
```

The TypeScript implementation must be equally robust.

## Array Format Support

The parser must handle both inline and list array formats:

### Inline Format (Recommended)
```yaml
codex_sync_include: [api-*, core-*]
tags: [api, rest, openapi]
```

### List Format (Also Supported)
```yaml
codex_sync_include:
  - api-*
  - core-*
tags:
  - api
  - rest
  - openapi
```

Both formats are equivalent and parsed identically by `js-yaml`.

## Error Handling

### Malformed YAML

```typescript
// Input with invalid YAML
const content = `---
codex_sync_include: [unclosed
---
# Content
`

// Strict mode (default)
parseMetadata(content)  // throws ValidationError

// Non-strict mode
parseMetadata(content, { strict: false })
// Returns: { metadata: {}, content: "# Content", raw: "..." }
```

### Invalid Metadata

```typescript
const content = `---
visibility: invalid_value
codex_sync_include: "not an array"
---
`

// Zod validation catches these issues
parseMetadata(content)  // throws ValidationError with details
```

### Missing Frontmatter

```typescript
const content = `# Document without frontmatter`

parseMetadata(content)
// Returns: { metadata: {}, content: "# Document without frontmatter", raw: "" }
```

## Testing Requirements

### Unit Tests

1. **Basic parsing**
   - Parse valid frontmatter
   - Extract document content correctly
   - Handle empty frontmatter

2. **Format support**
   - Inline arrays: `[val1, val2]`
   - List arrays with hyphens
   - Mixed formats

3. **Line ending handling**
   - CRLF input (Windows)
   - LF input (Unix)
   - Mixed line endings

4. **Error handling**
   - Malformed YAML
   - Invalid field types
   - Missing required fields (if any)

5. **Backwards compatibility**
   - Legacy nested format
   - Plural field names

### Test Fixtures

```typescript
// tests/fixtures/valid-frontmatter.md
---
org: fractary
codex_sync_include: [api-*, core-*]
tags: [test, example]
---
# Test Document

// tests/fixtures/legacy-format.md
---
codex:
  includes: [api-*]
---
# Legacy

// tests/fixtures/no-frontmatter.md
# Document without frontmatter

// tests/fixtures/malformed.md
---
invalid: [unclosed
---
```

## API Surface

### Public Exports

```typescript
// Main parsing function
export function parseMetadata(
  content: string,
  options?: ParseMetadataOptions
): ParseResult

// Validation
export function validateMetadata(
  metadata: unknown
): { valid: boolean; errors?: string[] }

// Utilities
export function hasFrontmatter(content: string): boolean
export function extractRawFrontmatter(content: string): string | null

// Schema
export { MetadataSchema }
export type { Metadata }

// Types
export type { ParseMetadataOptions, ParseResult }
```

## Performance Considerations

- Use regex for initial frontmatter detection (fast)
- Parse YAML only when frontmatter exists
- Cache validation results if needed
- Avoid excessive string allocations

## Success Criteria

- [ ] Parses all existing codex frontmatter correctly
- [ ] Handles CRLF and LF line endings
- [ ] Validates against Zod schema
- [ ] Supports both inline and list array formats
- [ ] Backwards compatible with legacy formats
- [ ] 90%+ test coverage
- [ ] Zero runtime errors on valid input
- [ ] Clear error messages on invalid input

## Examples

### Example 1: Parse Document

```typescript
import { parseMetadata } from '@fractary/codex'

const markdown = `---
org: fractary
codex_sync_include: [api-*]
tags: [api, rest]
---
# API Guide
`

const result = parseMetadata(markdown)

console.log(result.metadata)
// { org: 'fractary', codex_sync_include: ['api-*'], tags: ['api', 'rest'] }

console.log(result.content)
// "# API Guide\n"
```

### Example 2: Validation

```typescript
import { validateMetadata } from '@fractary/codex'

const metadata = {
  org: 'fractary',
  visibility: 'internal',
  codex_sync_include: ['api-*']
}

const result = validateMetadata(metadata)
console.log(result.valid)  // true
```

### Example 3: Handle Errors

```typescript
import { parseMetadata } from '@fractary/codex'

try {
  const result = parseMetadata(malformedContent)
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid frontmatter:', error.message)
  }
}
```

## Changelog

- 2025-10-06: Initial draft

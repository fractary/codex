import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  parseMetadata,
  hasFrontmatter,
  validateMetadata,
  extractRawFrontmatter,
} from '../../../src/core/metadata/parser.js'
import { ValidationError } from '../../../src/errors/index.js'

const fixturesDir = join(__dirname, '../../fixtures')

function readFixture(filename: string): string {
  return readFileSync(join(fixturesDir, filename), 'utf-8')
}

describe('parseMetadata', () => {
  test('parses valid frontmatter', () => {
    const content = readFixture('valid-frontmatter.md')
    const result = parseMetadata(content)

    expect(result.metadata.org).toBe('fractary')
    expect(result.metadata.system).toBe('api-gateway')
    expect(result.metadata.codex_sync_include).toEqual(['api-*', 'core-*'])
    expect(result.metadata.codex_sync_exclude).toEqual(['*-test', '*-dev'])
    expect(result.metadata.tags).toEqual(['api', 'rest'])
    expect(result.metadata.visibility).toBe('internal')
    expect(result.content).toContain('# API Gateway Documentation')
  })

  test('handles legacy nested format', () => {
    const content = readFixture('legacy-format.md')
    const result = parseMetadata(content)

    // Legacy format should be normalized
    expect(result.metadata.codex_sync_include).toEqual(['api-*'])
    expect(result.metadata.codex_sync_exclude).toEqual(['*-test'])
  })

  test('normalizes plural codex_sync_includes to singular', () => {
    const content = `---
codex_sync_includes: [lake.corthonomy.ai, api.*]
org: corthos
---
# Content`
    const result = parseMetadata(content)

    // Plural form should be normalized to singular
    expect(result.metadata.codex_sync_include).toEqual([
      'lake.corthonomy.ai',
      'api.*',
    ])
    expect(result.metadata.org).toBe('corthos')
  })

  test('normalizes plural codex_sync_excludes to singular', () => {
    const content = `---
codex_sync_excludes: ['*-test', '*-dev']
---
# Content`
    const result = parseMetadata(content)

    // Plural form should be normalized to singular
    expect(result.metadata.codex_sync_exclude).toEqual(['*-test', '*-dev'])
  })

  test('singular codex_sync_include takes precedence over plural', () => {
    const content = `---
codex_sync_include: [singular-value]
codex_sync_includes: [plural-value]
---
# Content`
    const result = parseMetadata(content)

    // Singular should win
    expect(result.metadata.codex_sync_include).toEqual(['singular-value'])
  })

  test('handles both plural includes and excludes', () => {
    const content = `---
codex_sync_includes: ['lake.*', 'api.*']
codex_sync_excludes: ['*-test']
org: corthos
---
# Content`
    const result = parseMetadata(content)

    expect(result.metadata.codex_sync_include).toEqual(['lake.*', 'api.*'])
    expect(result.metadata.codex_sync_exclude).toEqual(['*-test'])
    expect(result.metadata.org).toBe('corthos')
  })

  test('returns empty metadata for no frontmatter', () => {
    const content = readFixture('no-frontmatter.md')
    const result = parseMetadata(content)

    expect(result.metadata).toEqual({})
    expect(result.content).toContain('# Document Without Frontmatter')
    expect(result.raw).toBe('')
  })

  test('handles CRLF line endings', () => {
    const content = '---\r\norg: fractary\r\n---\r\n# Content'
    const result = parseMetadata(content)

    expect(result.metadata.org).toBe('fractary')
  })

  test('throws ValidationError on invalid frontmatter in strict mode', () => {
    const content = '---\ninvalid: [unclosed\n---\n# Content'

    expect(() => parseMetadata(content)).toThrow(ValidationError)
  })

  test('returns empty metadata on invalid frontmatter in non-strict mode', () => {
    const content = '---\ninvalid: [unclosed\n---\n# Content'
    const result = parseMetadata(content, { strict: false })

    expect(result.metadata).toEqual({})
  })

  test('preserves document content', () => {
    const content = '---\norg: fractary\n---\n# Test\n\nSome content.'
    const result = parseMetadata(content)

    expect(result.content).toBe('# Test\n\nSome content.')
  })

  test('extracts raw frontmatter', () => {
    const content = '---\norg: fractary\ntitle: Test\n---\n# Content'
    const result = parseMetadata(content)

    expect(result.raw).toContain('org: fractary')
    expect(result.raw).toContain('title: Test')
  })
})

describe('hasFrontmatter', () => {
  test('returns true for content with frontmatter', () => {
    const content = '---\norg: fractary\n---\n# Content'
    expect(hasFrontmatter(content)).toBe(true)
  })

  test('returns false for content without frontmatter', () => {
    const content = '# Just content'
    expect(hasFrontmatter(content)).toBe(false)
  })

  test('handles CRLF line endings', () => {
    const content = '---\r\norg: fractary\r\n---\r\n# Content'
    expect(hasFrontmatter(content)).toBe(true)
  })
})

describe('validateMetadata', () => {
  test('validates correct metadata', () => {
    const metadata = {
      org: 'fractary',
      codex_sync_include: ['api-*'],
      visibility: 'internal' as const,
    }

    const result = validateMetadata(metadata)
    expect(result.valid).toBe(true)
    expect(result.errors).toBeUndefined()
  })

  test('returns errors for invalid metadata', () => {
    const metadata = {
      visibility: 'invalid_value',
      codex_sync_include: 'not-an-array',
    }

    const result = validateMetadata(metadata)
    expect(result.valid).toBe(false)
    expect(result.errors).toBeDefined()
    expect(result.errors!.length).toBeGreaterThan(0)
  })
})

describe('extractRawFrontmatter', () => {
  test('extracts frontmatter string', () => {
    const content = '---\norg: fractary\ntitle: Test\n---\n# Content'
    const raw = extractRawFrontmatter(content)

    expect(raw).toContain('org: fractary')
    expect(raw).toContain('title: Test')
  })

  test('returns null for no frontmatter', () => {
    const content = '# Just content'
    const raw = extractRawFrontmatter(content)

    expect(raw).toBeNull()
  })
})

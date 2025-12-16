import { describe, it, expect } from 'vitest'
import {
  parseReference,
  buildUri,
  isValidUri,
  isLegacyReference,
  convertLegacyReference,
  getExtension,
  getFilename,
  getDirectory,
  CODEX_URI_PREFIX,
} from '../../../src/references/parser.js'

describe('parseReference', () => {
  it('parses a valid URI with path', () => {
    const result = parseReference('codex://fractary/auth-service/docs/oauth.md')
    expect(result).not.toBeNull()
    expect(result?.org).toBe('fractary')
    expect(result?.project).toBe('auth-service')
    expect(result?.path).toBe('docs/oauth.md')
    expect(result?.uri).toBe('codex://fractary/auth-service/docs/oauth.md')
  })

  it('parses a URI without path', () => {
    const result = parseReference('codex://fractary/auth-service')
    expect(result).not.toBeNull()
    expect(result?.org).toBe('fractary')
    expect(result?.project).toBe('auth-service')
    expect(result?.path).toBe('')
  })

  it('parses a URI with deep path', () => {
    const result = parseReference('codex://org/project/a/b/c/d/file.md')
    expect(result).not.toBeNull()
    expect(result?.path).toBe('a/b/c/d/file.md')
  })

  it('returns null for invalid prefix', () => {
    expect(parseReference('http://fractary/auth')).toBeNull()
    expect(parseReference('@codex/auth/file.md')).toBeNull()
    expect(parseReference('/absolute/path')).toBeNull()
  })

  it('returns null for missing components', () => {
    expect(parseReference('codex://')).toBeNull()
    expect(parseReference('codex://org')).toBeNull()
    expect(parseReference('codex://org/')).toBeNull()
  })

  it('rejects path traversal attempts', () => {
    expect(parseReference('codex://org/project/../../../etc/passwd')).toBeNull()
    expect(parseReference('codex://org/project/..%2F..%2Fetc')).toBeNull()
  })

  it('handles special characters in project names', () => {
    const result = parseReference('codex://org/my-project_v2.0/docs/file.md')
    expect(result).not.toBeNull()
    expect(result?.project).toBe('my-project_v2.0')
  })
})

describe('buildUri', () => {
  it('builds URI with path', () => {
    const uri = buildUri('fractary', 'auth-service', 'docs/oauth.md')
    expect(uri).toBe('codex://fractary/auth-service/docs/oauth.md')
  })

  it('builds URI without path', () => {
    const uri = buildUri('fractary', 'auth-service')
    expect(uri).toBe('codex://fractary/auth-service')
  })

  it('strips leading slash from path', () => {
    const uri = buildUri('org', 'project', '/docs/file.md')
    expect(uri).toBe('codex://org/project/docs/file.md')
  })
})

describe('isValidUri', () => {
  it('returns true for valid URIs', () => {
    expect(isValidUri('codex://org/project')).toBe(true)
    expect(isValidUri('codex://org/project/path')).toBe(true)
    expect(isValidUri('codex://fractary/auth-service/docs/oauth.md')).toBe(true)
  })

  it('returns false for invalid URIs', () => {
    expect(isValidUri('')).toBe(false)
    expect(isValidUri('http://example.com')).toBe(false)
    expect(isValidUri('codex://')).toBe(false)
    expect(isValidUri('codex://org')).toBe(false)
    expect(isValidUri('codex://org/project/../../../etc')).toBe(false)
  })
})

describe('isLegacyReference', () => {
  it('identifies legacy references', () => {
    expect(isLegacyReference('@codex/project/file.md')).toBe(true)
    expect(isLegacyReference('@codex/auth-service')).toBe(true)
  })

  it('rejects non-legacy references', () => {
    expect(isLegacyReference('codex://org/project')).toBe(false)
    expect(isLegacyReference('@other/project')).toBe(false)
  })
})

describe('convertLegacyReference', () => {
  it('converts legacy to new format', () => {
    const result = convertLegacyReference('@codex/auth-service/docs/oauth.md', 'fractary')
    expect(result).toBe('codex://fractary/auth-service/docs/oauth.md')
  })

  it('handles references without path', () => {
    const result = convertLegacyReference('@codex/auth-service', 'fractary')
    expect(result).toBe('codex://fractary/auth-service')
  })

  it('returns null for non-legacy references', () => {
    expect(convertLegacyReference('codex://org/project', 'fractary')).toBeNull()
  })
})

describe('getExtension', () => {
  it('extracts file extension', () => {
    expect(getExtension('codex://org/project/file.md')).toBe('md')
    expect(getExtension('codex://org/project/docs/api.json')).toBe('json')
    expect(getExtension('codex://org/project/Dockerfile')).toBe('')
  })

  it('returns empty for no extension', () => {
    expect(getExtension('codex://org/project/README')).toBe('')
    expect(getExtension('codex://org/project')).toBe('')
  })
})

describe('getFilename', () => {
  it('extracts filename', () => {
    expect(getFilename('codex://org/project/docs/oauth.md')).toBe('oauth.md')
    expect(getFilename('codex://org/project/README.md')).toBe('README.md')
  })

  it('returns empty for no path', () => {
    expect(getFilename('codex://org/project')).toBe('')
  })
})

describe('getDirectory', () => {
  it('extracts directory path', () => {
    expect(getDirectory('codex://org/project/docs/api/oauth.md')).toBe('docs/api')
    expect(getDirectory('codex://org/project/docs/file.md')).toBe('docs')
  })

  it('returns empty for root-level files', () => {
    expect(getDirectory('codex://org/project/README.md')).toBe('')
    expect(getDirectory('codex://org/project')).toBe('')
  })
})

describe('CODEX_URI_PREFIX', () => {
  it('exports the correct prefix', () => {
    expect(CODEX_URI_PREFIX).toBe('codex://')
  })
})

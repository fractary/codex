import { describe, it, expect } from 'vitest'
import {
  validatePath,
  sanitizePath,
  validateOrg,
  validateProject,
  validateUri,
} from '../../../src/references/validator.js'

describe('validatePath', () => {
  it('accepts valid paths', () => {
    expect(validatePath('docs/oauth.md')).toBe(true)
    expect(validatePath('README.md')).toBe(true)
    expect(validatePath('src/index.ts')).toBe(true)
    expect(validatePath('a/b/c/d/e.txt')).toBe(true)
  })

  it('rejects absolute paths', () => {
    expect(validatePath('/etc/passwd')).toBe(false)
    expect(validatePath('/absolute/path')).toBe(false)
  })

  it('rejects directory traversal', () => {
    expect(validatePath('../../../etc/passwd')).toBe(false)
    expect(validatePath('docs/../../../etc')).toBe(false)
    expect(validatePath('..\\..\\windows')).toBe(false)
  })

  it('rejects home directory expansion', () => {
    expect(validatePath('~/.ssh/id_rsa')).toBe(false)
  })

  it('rejects protocol prefixes', () => {
    expect(validatePath('file:///etc/passwd')).toBe(false)
    expect(validatePath('http://example.com')).toBe(false)
  })

  it('rejects empty paths', () => {
    expect(validatePath('')).toBe(false)
    expect(validatePath('   ')).toBe(false)
  })
})

describe('sanitizePath', () => {
  it('removes leading slashes', () => {
    expect(sanitizePath('/path/to/file')).toBe('path/to/file')
    expect(sanitizePath('///multiple/slashes')).toBe('multiple/slashes')
  })

  it('removes protocol prefixes', () => {
    expect(sanitizePath('file:///etc/passwd')).toBe('etc/passwd')
    expect(sanitizePath('http://example.com/path')).toBe('example.com/path')
  })

  it('removes home directory expansion', () => {
    expect(sanitizePath('~/.ssh/id_rsa')).toBe('.ssh/id_rsa')
  })

  it('removes directory traversal', () => {
    expect(sanitizePath('../../../etc/passwd')).toBe('etc/passwd')
    expect(sanitizePath('docs/../../etc')).toBe('etc')
  })

  it('handles empty input', () => {
    expect(sanitizePath('')).toBe('')
  })
})

describe('validateOrg', () => {
  it('accepts valid organization names', () => {
    expect(validateOrg('fractary')).toBe(true)
    expect(validateOrg('my-org')).toBe(true)
    expect(validateOrg('org123')).toBe(true)
    expect(validateOrg('a')).toBe(true)
  })

  it('rejects invalid organization names', () => {
    expect(validateOrg('')).toBe(false)
    expect(validateOrg('-invalid')).toBe(false)
    expect(validateOrg('invalid-')).toBe(false)
    expect(validateOrg('has spaces')).toBe(false)
    expect(validateOrg('has/slash')).toBe(false)
  })

  it('rejects names that are too long', () => {
    const longName = 'a'.repeat(40)
    expect(validateOrg(longName)).toBe(false)
  })
})

describe('validateProject', () => {
  it('accepts valid project names', () => {
    expect(validateProject('auth-service')).toBe(true)
    expect(validateProject('my_project')).toBe(true)
    expect(validateProject('project.v2')).toBe(true)
    expect(validateProject('a')).toBe(true)
  })

  it('rejects invalid project names', () => {
    expect(validateProject('')).toBe(false)
    expect(validateProject('has spaces')).toBe(false)
    expect(validateProject('has/slash')).toBe(false)
    expect(validateProject('has..dots')).toBe(false)
  })

  it('rejects names that are too long', () => {
    const longName = 'a'.repeat(101)
    expect(validateProject(longName)).toBe(false)
  })
})

describe('validateUri', () => {
  it('accepts valid URIs', () => {
    expect(validateUri('codex://fractary/auth-service')).toBe(true)
    expect(validateUri('codex://org/project/path/to/file.md')).toBe(true)
    expect(validateUri('codex://my-org/my-project')).toBe(true)
  })

  it('rejects URIs without codex:// prefix', () => {
    expect(validateUri('http://org/project')).toBe(false)
    expect(validateUri('file://org/project')).toBe(false)
    expect(validateUri('@codex/project')).toBe(false)
  })

  it('rejects URIs with invalid org', () => {
    expect(validateUri('codex://-invalid/project')).toBe(false)
    expect(validateUri('codex://has spaces/project')).toBe(false)
  })

  it('rejects URIs with invalid project', () => {
    expect(validateUri('codex://org/has spaces')).toBe(false)
    expect(validateUri('codex://org/has..dots')).toBe(false)
  })

  it('rejects URIs with path traversal', () => {
    expect(validateUri('codex://org/project/../../../etc')).toBe(false)
  })

  it('rejects incomplete URIs', () => {
    expect(validateUri('codex://')).toBe(false)
    expect(validateUri('codex://org')).toBe(false)
  })
})

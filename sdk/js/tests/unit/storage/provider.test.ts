import { describe, it, expect } from 'vitest'
import {
  DEFAULT_FETCH_OPTIONS,
  mergeFetchOptions,
  detectContentType,
} from '../../../src/storage/provider.js'

describe('storage/provider', () => {
  describe('DEFAULT_FETCH_OPTIONS', () => {
    it('should have default timeout of 30 seconds', () => {
      expect(DEFAULT_FETCH_OPTIONS.timeout).toBe(30000)
    })

    it('should have default max retries of 3', () => {
      expect(DEFAULT_FETCH_OPTIONS.maxRetries).toBe(3)
    })

    it('should have default branch of main', () => {
      expect(DEFAULT_FETCH_OPTIONS.branch).toBe('main')
    })

    it('should have default max size of 10MB', () => {
      expect(DEFAULT_FETCH_OPTIONS.maxSize).toBe(10 * 1024 * 1024)
    })

    it('should follow redirects by default', () => {
      expect(DEFAULT_FETCH_OPTIONS.followRedirects).toBe(true)
    })
  })

  describe('mergeFetchOptions', () => {
    it('should return defaults when no options provided', () => {
      const result = mergeFetchOptions()
      expect(result).toEqual(DEFAULT_FETCH_OPTIONS)
    })

    it('should return defaults when undefined provided', () => {
      const result = mergeFetchOptions(undefined)
      expect(result).toEqual(DEFAULT_FETCH_OPTIONS)
    })

    it('should override timeout', () => {
      const result = mergeFetchOptions({ timeout: 5000 })
      expect(result.timeout).toBe(5000)
      expect(result.maxRetries).toBe(DEFAULT_FETCH_OPTIONS.maxRetries)
    })

    it('should override multiple options', () => {
      const result = mergeFetchOptions({
        timeout: 10000,
        maxRetries: 5,
        branch: 'develop',
      })
      expect(result.timeout).toBe(10000)
      expect(result.maxRetries).toBe(5)
      expect(result.branch).toBe('develop')
    })

    it('should override token', () => {
      const result = mergeFetchOptions({ token: 'test-token' })
      expect(result.token).toBe('test-token')
    })

    it('should preserve non-overridden defaults', () => {
      const result = mergeFetchOptions({ timeout: 5000 })
      expect(result.branch).toBe(DEFAULT_FETCH_OPTIONS.branch)
      expect(result.followRedirects).toBe(DEFAULT_FETCH_OPTIONS.followRedirects)
      expect(result.maxSize).toBe(DEFAULT_FETCH_OPTIONS.maxSize)
    })
  })

  describe('detectContentType', () => {
    it('should detect markdown files', () => {
      expect(detectContentType('file.md')).toBe('text/markdown')
      expect(detectContentType('file.markdown')).toBe('text/markdown')
    })

    it('should detect plain text files', () => {
      expect(detectContentType('file.txt')).toBe('text/plain')
    })

    it('should detect JSON files', () => {
      expect(detectContentType('file.json')).toBe('application/json')
    })

    it('should detect YAML files', () => {
      expect(detectContentType('file.yaml')).toBe('application/x-yaml')
      expect(detectContentType('file.yml')).toBe('application/x-yaml')
    })

    it('should detect JavaScript files', () => {
      expect(detectContentType('file.js')).toBe('application/javascript')
    })

    it('should detect TypeScript files', () => {
      expect(detectContentType('file.ts')).toBe('application/typescript')
    })

    it('should detect HTML files', () => {
      expect(detectContentType('file.html')).toBe('text/html')
      expect(detectContentType('file.htm')).toBe('text/html')
    })

    it('should detect CSS files', () => {
      expect(detectContentType('file.css')).toBe('text/css')
    })

    it('should detect Python files', () => {
      expect(detectContentType('file.py')).toBe('text/x-python')
    })

    it('should detect image files', () => {
      expect(detectContentType('file.png')).toBe('image/png')
      expect(detectContentType('file.jpg')).toBe('image/jpeg')
      expect(detectContentType('file.jpeg')).toBe('image/jpeg')
      expect(detectContentType('file.gif')).toBe('image/gif')
      expect(detectContentType('file.svg')).toBe('image/svg+xml')
      expect(detectContentType('file.webp')).toBe('image/webp')
    })

    it('should detect PDF files', () => {
      expect(detectContentType('file.pdf')).toBe('application/pdf')
    })

    it('should detect shell scripts', () => {
      expect(detectContentType('file.sh')).toBe('application/x-sh')
      expect(detectContentType('file.bash')).toBe('application/x-sh')
    })

    it('should return octet-stream for unknown extensions', () => {
      expect(detectContentType('file.unknown')).toBe('application/octet-stream')
      expect(detectContentType('file.xyz')).toBe('application/octet-stream')
    })

    it('should handle paths with directories', () => {
      expect(detectContentType('path/to/file.md')).toBe('text/markdown')
      expect(detectContentType('/absolute/path/file.json')).toBe('application/json')
    })

    it('should handle files without extension', () => {
      expect(detectContentType('Makefile')).toBe('application/octet-stream')
      expect(detectContentType('README')).toBe('application/octet-stream')
    })

    it('should be case insensitive', () => {
      expect(detectContentType('file.MD')).toBe('text/markdown')
      expect(detectContentType('file.JSON')).toBe('application/json')
      expect(detectContentType('file.Ts')).toBe('application/typescript')
    })
  })
})

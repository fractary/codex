/**
 * Tests for configuration schema validation
 */

import { describe, it, expect } from 'vitest'
import {
  FromCodexSyncConfigSchema,
  DirectionalSyncConfigSchema,
  DirectionalSyncSchema,
} from '../../../src/schemas/config.js'

describe('FromCodexSyncConfigSchema', () => {
  describe('valid patterns (codex:// URIs)', () => {
    it('should accept patterns starting with codex://', () => {
      const result = FromCodexSyncConfigSchema.safeParse({
        include: ['codex://org/repo/docs/**'],
      })
      expect(result.success).toBe(true)
    })

    it('should accept patterns with placeholders', () => {
      const result = FromCodexSyncConfigSchema.safeParse({
        include: [
          'codex://{org}/{codex_repo}/docs/**',
          'codex://{org}/{project}/README.md',
        ],
      })
      expect(result.success).toBe(true)
    })

    it('should accept multiple valid patterns', () => {
      const result = FromCodexSyncConfigSchema.safeParse({
        include: [
          'codex://fractary/codex.fractary.com/docs/**',
          'codex://fractary/codex.fractary.com/standards/**',
        ],
      })
      expect(result.success).toBe(true)
    })

    it('should accept patterns with exclude', () => {
      const result = FromCodexSyncConfigSchema.safeParse({
        include: ['codex://org/repo/docs/**'],
        exclude: ['codex://org/repo/docs/private/**'],
      })
      expect(result.success).toBe(true)
    })
  })

  describe('invalid patterns (plain paths)', () => {
    it('should reject plain paths without codex:// prefix', () => {
      const result = FromCodexSyncConfigSchema.safeParse({
        include: ['docs/**'],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('codex:// URI format')
      }
    })

    it('should reject patterns like standards/**', () => {
      const result = FromCodexSyncConfigSchema.safeParse({
        include: ['standards/**', 'guides/**'],
      })
      expect(result.success).toBe(false)
    })

    it('should reject mixed valid and invalid patterns', () => {
      const result = FromCodexSyncConfigSchema.safeParse({
        include: [
          'codex://org/repo/docs/**', // valid
          'standards/**', // invalid
        ],
      })
      expect(result.success).toBe(false)
    })

    it('should reject README.md without codex:// prefix', () => {
      const result = FromCodexSyncConfigSchema.safeParse({
        include: ['README.md'],
      })
      expect(result.success).toBe(false)
    })

    it('should reject relative paths', () => {
      const result = FromCodexSyncConfigSchema.safeParse({
        include: ['../docs/**'],
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('DirectionalSyncConfigSchema (to_codex)', () => {
  it('should accept plain paths for to_codex', () => {
    const result = DirectionalSyncConfigSchema.safeParse({
      include: ['docs/**', 'README.md', 'CLAUDE.md'],
    })
    expect(result.success).toBe(true)
  })

  it('should accept exclude patterns', () => {
    const result = DirectionalSyncConfigSchema.safeParse({
      include: ['docs/**'],
      exclude: ['docs/private/**', '*.tmp'],
    })
    expect(result.success).toBe(true)
  })
})

describe('DirectionalSyncSchema', () => {
  it('should validate complete sync config', () => {
    const result = DirectionalSyncSchema.safeParse({
      to_codex: {
        include: ['docs/**', 'README.md'],
        exclude: ['docs/private/**'],
      },
      from_codex: {
        include: ['codex://{org}/{codex_repo}/docs/**'],
      },
    })
    expect(result.success).toBe(true)
  })

  it('should reject from_codex with plain paths', () => {
    const result = DirectionalSyncSchema.safeParse({
      to_codex: {
        include: ['docs/**'],
      },
      from_codex: {
        include: ['docs/**'], // Should be codex:// URI
      },
    })
    expect(result.success).toBe(false)
  })

  it('should allow only to_codex', () => {
    const result = DirectionalSyncSchema.safeParse({
      to_codex: {
        include: ['docs/**'],
      },
    })
    expect(result.success).toBe(true)
  })

  it('should allow only from_codex with valid URIs', () => {
    const result = DirectionalSyncSchema.safeParse({
      from_codex: {
        include: ['codex://org/repo/docs/**'],
      },
    })
    expect(result.success).toBe(true)
  })
})

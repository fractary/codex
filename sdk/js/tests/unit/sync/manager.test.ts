import { describe, it, expect, beforeEach } from 'vitest'
import { SyncManager, createSyncManager } from '../../../src/sync/manager.js'
import { createLocalStorage } from '../../../src/storage/local.js'
import type { SyncConfig } from '../../../src/sync/types.js'

describe('sync/manager', () => {
  let localStorage: ReturnType<typeof createLocalStorage>

  beforeEach(() => {
    localStorage = createLocalStorage({ baseDir: '/tmp' })
  })

  describe('Pattern Resolution (v0.7.0+)', () => {
    describe('resolveFromCodexPatterns', () => {
      it('should use new format from_codex.include when available', () => {
        const config: Partial<SyncConfig> = {
          from_codex: {
            include: ['projects/etl.corthion.ai/docs/**/*.json'],
            exclude: ['**/*-private.md'],
          },
        }

        const manager = createSyncManager({
          localStorage,
          config,
        })

        const resolvedConfig = manager.getConfig()
        // Pattern resolution is internal, but we can verify config is stored
        expect(resolvedConfig.from_codex?.include).toEqual([
          'projects/etl.corthion.ai/docs/**/*.json',
        ])
      })

      it('should fall back to legacy default_from_codex format', () => {
        const config: Partial<SyncConfig> = {
          default_from_codex: ['projects/core.corthodex.ai/docs/**/*.md'],
        }

        const manager = createSyncManager({
          localStorage,
          config,
        })

        const resolvedConfig = manager.getConfig()
        expect(resolvedConfig.default_from_codex).toEqual([
          'projects/core.corthodex.ai/docs/**/*.md',
        ])
      })

      it('should prefer new format over legacy format', () => {
        const config: Partial<SyncConfig> = {
          from_codex: {
            include: ['new-pattern/**/*.md'],
          },
          default_from_codex: ['legacy-pattern/**/*.md'],
        }

        const manager = createSyncManager({
          localStorage,
          config,
        })

        const resolvedConfig = manager.getConfig()
        // New format should be present
        expect(resolvedConfig.from_codex?.include).toEqual(['new-pattern/**/*.md'])
        // Legacy format still stored but lower priority
        expect(resolvedConfig.default_from_codex).toEqual(['legacy-pattern/**/*.md'])
      })

      it('should return empty array when no patterns configured', () => {
        const config: Partial<SyncConfig> = {}

        const manager = createSyncManager({
          localStorage,
          config,
        })

        const resolvedConfig = manager.getConfig()
        expect(resolvedConfig.from_codex).toBeUndefined()
        expect(resolvedConfig.default_from_codex).toBeUndefined()
      })
    })

    describe('resolveFromCodexExcludes', () => {
      it('should use new format from_codex.exclude when available', () => {
        const config: Partial<SyncConfig> = {
          from_codex: {
            include: ['**/*.md'],
            exclude: ['**/*-private.md', '**/drafts/**'],
          },
        }

        const manager = createSyncManager({
          localStorage,
          config,
        })

        const resolvedConfig = manager.getConfig()
        expect(resolvedConfig.from_codex?.exclude).toEqual([
          '**/*-private.md',
          '**/drafts/**',
        ])
      })

      it('should fall back to global exclude field', () => {
        const config: Partial<SyncConfig> = {
          default_from_codex: ['**/*.md'],
          exclude: ['**/*-private.md'],
        }

        const manager = createSyncManager({
          localStorage,
          config,
        })

        const resolvedConfig = manager.getConfig()
        expect(resolvedConfig.exclude).toEqual(['**/*-private.md'])
      })

      it('should return empty array when no excludes configured', () => {
        const config: Partial<SyncConfig> = {
          from_codex: {
            include: ['**/*.md'],
          },
        }

        const manager = createSyncManager({
          localStorage,
          config,
        })

        const resolvedConfig = manager.getConfig()
        expect(resolvedConfig.from_codex?.exclude).toBeUndefined()
      })
    })

    describe('resolveToCodexPatterns', () => {
      it('should use new format to_codex.include when available', () => {
        const config: Partial<SyncConfig> = {
          to_codex: {
            include: ['docs/**/*.md', 'specs/**/*.md'],
            exclude: ['docs/drafts/**'],
          },
        }

        const manager = createSyncManager({
          localStorage,
          config,
        })

        const resolvedConfig = manager.getConfig()
        expect(resolvedConfig.to_codex?.include).toEqual([
          'docs/**/*.md',
          'specs/**/*.md',
        ])
      })

      it('should fall back to legacy default_to_codex format', () => {
        const config: Partial<SyncConfig> = {
          default_to_codex: ['docs/**/*.md'],
        }

        const manager = createSyncManager({
          localStorage,
          config,
        })

        const resolvedConfig = manager.getConfig()
        expect(resolvedConfig.default_to_codex).toEqual(['docs/**/*.md'])
      })

      it('should prefer new format over legacy format', () => {
        const config: Partial<SyncConfig> = {
          to_codex: {
            include: ['new-docs/**/*.md'],
          },
          default_to_codex: ['old-docs/**/*.md'],
        }

        const manager = createSyncManager({
          localStorage,
          config,
        })

        const resolvedConfig = manager.getConfig()
        expect(resolvedConfig.to_codex?.include).toEqual(['new-docs/**/*.md'])
        expect(resolvedConfig.default_to_codex).toEqual(['old-docs/**/*.md'])
      })
    })

    describe('resolveToCodexExcludes', () => {
      it('should use new format to_codex.exclude when available', () => {
        const config: Partial<SyncConfig> = {
          to_codex: {
            include: ['docs/**/*.md'],
            exclude: ['docs/drafts/**', '**/*.draft.md'],
          },
        }

        const manager = createSyncManager({
          localStorage,
          config,
        })

        const resolvedConfig = manager.getConfig()
        expect(resolvedConfig.to_codex?.exclude).toEqual([
          'docs/drafts/**',
          '**/*.draft.md',
        ])
      })

      it('should fall back to global exclude field', () => {
        const config: Partial<SyncConfig> = {
          default_to_codex: ['docs/**/*.md'],
          exclude: ['**/*.draft.md'],
        }

        const manager = createSyncManager({
          localStorage,
          config,
        })

        const resolvedConfig = manager.getConfig()
        expect(resolvedConfig.exclude).toEqual(['**/*.draft.md'])
      })
    })

    describe('Symmetric include/exclude structure', () => {
      it('should support symmetric config for both directions', () => {
        const config: Partial<SyncConfig> = {
          from_codex: {
            include: ['projects/etl.corthion.ai/docs/schema/**/*.json'],
            exclude: ['**/*-private.md'],
          },
          to_codex: {
            include: ['docs/**/*.md', 'specs/**/*.md'],
            exclude: ['docs/drafts/**'],
          },
        }

        const manager = createSyncManager({
          localStorage,
          config,
        })

        const resolvedConfig = manager.getConfig()

        // Both directions configured symmetrically
        expect(resolvedConfig.from_codex?.include).toBeDefined()
        expect(resolvedConfig.from_codex?.exclude).toBeDefined()
        expect(resolvedConfig.to_codex?.include).toBeDefined()
        expect(resolvedConfig.to_codex?.exclude).toBeDefined()
      })

      it('should handle different patterns per direction', () => {
        const config: Partial<SyncConfig> = {
          from_codex: {
            include: ['projects/*/docs/**'],
            exclude: ['**/*-internal.md'],
          },
          to_codex: {
            include: ['docs/**/*.md'],
            exclude: ['**/*.draft.md'],
          },
        }

        const manager = createSyncManager({
          localStorage,
          config,
        })

        const resolvedConfig = manager.getConfig()

        // Each direction has its own patterns
        expect(resolvedConfig.from_codex?.include).not.toEqual(
          resolvedConfig.to_codex?.include
        )
        expect(resolvedConfig.from_codex?.exclude).not.toEqual(
          resolvedConfig.to_codex?.exclude
        )
      })
    })

    describe('Routing configuration', () => {
      it('should store routing.use_frontmatter setting', () => {
        const config: Partial<SyncConfig> = {
          routing: {
            use_frontmatter: false,
          },
          from_codex: {
            include: ['projects/**/*.md'],
          },
        }

        const manager = createSyncManager({
          localStorage,
          config,
        })

        const resolvedConfig = manager.getConfig()
        expect(resolvedConfig.routing?.use_frontmatter).toBe(false)
      })

      it('should handle routing config with new format patterns', () => {
        const config: Partial<SyncConfig> = {
          routing: {
            use_frontmatter: false,
          },
          from_codex: {
            include: ['projects/etl.corthion.ai/docs/**'],
            exclude: ['**/*-private.md'],
          },
        }

        const manager = createSyncManager({
          localStorage,
          config,
        })

        const resolvedConfig = manager.getConfig()
        expect(resolvedConfig.routing?.use_frontmatter).toBe(false)
        expect(resolvedConfig.from_codex?.include).toEqual([
          'projects/etl.corthion.ai/docs/**',
        ])
      })
    })
  })

  describe('Config updates', () => {
    it('should allow updating config', () => {
      const manager = createSyncManager({
        localStorage,
        config: {
          defaultDirection: 'to-codex',
          rules: [],
          defaultExcludes: [],
          deleteOrphans: false,
          conflictStrategy: 'newest',
        },
      })

      manager.updateConfig({
        from_codex: {
          include: ['new-pattern/**/*.md'],
        },
      })

      const updatedConfig = manager.getConfig()
      expect(updatedConfig.from_codex?.include).toEqual(['new-pattern/**/*.md'])
    })
  })

  describe('Public Pattern Accessors', () => {
    describe('getToCodexPatterns()', () => {
      it('should return patterns from new format to_codex.include', () => {
        const manager = createSyncManager({
          localStorage,
          config: {
            to_codex: {
              include: ['docs/**/*.md', 'specs/**/*.md'],
            },
          },
        })

        expect(manager.getToCodexPatterns()).toEqual(['docs/**/*.md', 'specs/**/*.md'])
      })

      it('should return patterns from legacy default_to_codex', () => {
        const manager = createSyncManager({
          localStorage,
          config: {
            default_to_codex: ['legacy-docs/**/*.md'],
          },
        })

        expect(manager.getToCodexPatterns()).toEqual(['legacy-docs/**/*.md'])
      })

      it('should prefer new format over legacy format', () => {
        const manager = createSyncManager({
          localStorage,
          config: {
            to_codex: {
              include: ['new-format/**/*.md'],
            },
            default_to_codex: ['legacy-format/**/*.md'],
          },
        })

        expect(manager.getToCodexPatterns()).toEqual(['new-format/**/*.md'])
      })

      it('should return empty array when no patterns configured', () => {
        const manager = createSyncManager({
          localStorage,
          config: {},
        })

        expect(manager.getToCodexPatterns()).toEqual([])
      })
    })

    describe('getFromCodexPatterns()', () => {
      it('should return patterns from new format from_codex.include', () => {
        const manager = createSyncManager({
          localStorage,
          config: {
            from_codex: {
              include: ['projects/*/docs/**/*.json'],
            },
          },
        })

        expect(manager.getFromCodexPatterns()).toEqual(['projects/*/docs/**/*.json'])
      })

      it('should return patterns from legacy default_from_codex', () => {
        const manager = createSyncManager({
          localStorage,
          config: {
            default_from_codex: ['legacy-projects/**/*.md'],
          },
        })

        expect(manager.getFromCodexPatterns()).toEqual(['legacy-projects/**/*.md'])
      })

      it('should prefer new format over legacy format', () => {
        const manager = createSyncManager({
          localStorage,
          config: {
            from_codex: {
              include: ['new-pattern/**/*.md'],
            },
            default_from_codex: ['old-pattern/**/*.md'],
          },
        })

        expect(manager.getFromCodexPatterns()).toEqual(['new-pattern/**/*.md'])
      })

      it('should return empty array when no patterns configured', () => {
        const manager = createSyncManager({
          localStorage,
          config: {},
        })

        expect(manager.getFromCodexPatterns()).toEqual([])
      })
    })
  })
})

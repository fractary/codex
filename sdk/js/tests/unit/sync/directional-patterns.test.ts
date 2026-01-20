/**
 * Tests for directional sync pattern matching
 */

import { describe, it, expect } from 'vitest'
import {
  matchToCodexPattern,
  matchFromCodexPattern,
  extractProjectFromCodexPath,
  getRelativePath,
  expandPlaceholders,
  type FromCodexMatchOptions,
  type ExpandPlaceholderOptions,
} from '../../../src/sync/directional-patterns.js'

describe('matchToCodexPattern', () => {
  it('should match simple glob patterns', () => {
    expect(matchToCodexPattern('docs/api.md', ['docs/**/*.md'])).toBe(true)
    expect(matchToCodexPattern('specs/feature.md', ['specs/**/*.md'])).toBe(true)
  })

  it('should not match when pattern does not match', () => {
    expect(matchToCodexPattern('src/index.ts', ['docs/**/*.md'])).toBe(false)
    expect(matchToCodexPattern('test.txt', ['docs/**/*.md'])).toBe(false)
  })

  it('should match exact file names', () => {
    expect(matchToCodexPattern('README.md', ['README.md'])).toBe(true)
    expect(matchToCodexPattern('CLAUDE.md', ['CLAUDE.md'])).toBe(true)
  })

  it('should match wildcard patterns', () => {
    expect(matchToCodexPattern('any/path/file.md', ['**/*.md'])).toBe(true)
    expect(matchToCodexPattern('file.json', ['*.json'])).toBe(true)
  })

  it('should return false for empty patterns', () => {
    expect(matchToCodexPattern('docs/api.md', [])).toBe(false)
  })

  it('should match multiple extensions', () => {
    expect(matchToCodexPattern('schema.json', ['**/*.json'])).toBe(true)
    expect(matchToCodexPattern('schema.yaml', ['**/*.yaml'])).toBe(true)
  })

  it('should match nested directories', () => {
    expect(
      matchToCodexPattern('docs/deep/nested/file.md', ['docs/**/*.md'])
    ).toBe(true)
  })
})

describe('matchFromCodexPattern', () => {
  describe('explicit project patterns', () => {
    it('should match files with project prefix in pattern', () => {
      expect(
        matchFromCodexPattern(
          'etl.corthion.ai/docs/schema/data.json',
          ['etl.corthion.ai/docs/schema/**/*.json'],
          'lake.corthonomy.ai'
        )
      ).toBe(true)
    })

    it('should match wildcard patterns with project prefix', () => {
      expect(
        matchFromCodexPattern(
          'etl.corthion.ai/docs/any/file.md',
          ['etl.corthion.ai/docs/**/*.md'],
          'lake.corthonomy.ai'
        )
      ).toBe(true)
    })

    it('should not match different project', () => {
      expect(
        matchFromCodexPattern(
          'api.corthodex.ai/docs/schema/data.json',
          ['etl.corthion.ai/docs/schema/**/*.json'],
          'lake.corthonomy.ai'
        )
      ).toBe(false)
    })

    it('should match own project with explicit pattern', () => {
      expect(
        matchFromCodexPattern(
          'lake.corthonomy.ai/README.md',
          ['lake.corthonomy.ai/**'],
          'lake.corthonomy.ai'
        )
      ).toBe(true)
    })
  })

  describe('implicit project patterns (no prefix)', () => {
    it('should match files from target project when no prefix', () => {
      expect(
        matchFromCodexPattern(
          'lake.corthonomy.ai/README.md',
          ['README.md'],
          'lake.corthonomy.ai'
        )
      ).toBe(true)
    })

    it('should match nested paths from target project', () => {
      expect(
        matchFromCodexPattern(
          'lake.corthonomy.ai/docs/api.md',
          ['docs/**/*.md'],
          'lake.corthonomy.ai'
        )
      ).toBe(true)
    })

    it('should not match other projects with implicit pattern', () => {
      expect(
        matchFromCodexPattern(
          'etl.corthion.ai/docs/api.md',
          ['docs/**/*.md'],
          'lake.corthonomy.ai'
        )
      ).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should return false for empty patterns', () => {
      expect(
        matchFromCodexPattern(
          'etl.corthion.ai/docs/file.md',
          [],
          'lake.corthonomy.ai'
        )
      ).toBe(false)
    })

    it('should handle patterns with multiple wildcards', () => {
      expect(
        matchFromCodexPattern(
          'etl.corthion.ai/docs/deep/nested/schema/data.json',
          ['etl.corthion.ai/**/schema/**/*.json'],
          'lake.corthonomy.ai'
        )
      ).toBe(true)
    })

    it('should match any pattern in array', () => {
      expect(
        matchFromCodexPattern(
          'etl.corthion.ai/docs/schema/data.json',
          [
            'core.corthodex.ai/**',
            'etl.corthion.ai/docs/schema/**/*.json',
            'lake.corthonomy.ai/**',
          ],
          'lake.corthonomy.ai'
        )
      ).toBe(true)
    })
  })

  describe('projects/ subdirectory structure', () => {
    it('should match patterns starting with projects/', () => {
      expect(
        matchFromCodexPattern(
          'projects/etl.corthion.ai/docs/schema/data.json',
          ['projects/etl.corthion.ai/docs/schema/**/*.json'],
          'lake.corthonomy.ai'
        )
      ).toBe(true)
    })

    it('should match nested paths with projects/ prefix', () => {
      expect(
        matchFromCodexPattern(
          'projects/core.corthodex.ai/docs/standards/coding.md',
          ['projects/core.corthodex.ai/docs/standards/**/*.md'],
          'lake.corthonomy.ai'
        )
      ).toBe(true)
    })

    it('should not match different project in projects/ structure', () => {
      expect(
        matchFromCodexPattern(
          'projects/api.corthodex.ai/docs/schema/data.json',
          ['projects/etl.corthion.ai/docs/schema/**/*.json'],
          'lake.corthonomy.ai'
        )
      ).toBe(false)
    })

    it('should match wildcard patterns in projects/ structure', () => {
      expect(
        matchFromCodexPattern(
          'projects/etl.corthion.ai/docs/guides/tutorial.md',
          ['projects/etl.corthion.ai/docs/**/*.md'],
          'lake.corthonomy.ai'
        )
      ).toBe(true)
    })
  })

  describe('codex:// URI patterns', () => {
    it('should match explicit codex:// URI with org/project/path', () => {
      expect(
        matchFromCodexPattern(
          'projects/etl.corthion.ai/docs/schema/data.json',
          ['codex://fractary/etl.corthion.ai/docs/schema/**/*.json'],
          'lake.corthonomy.ai',
          { org: 'fractary' }
        )
      ).toBe(true)
    })

    it('should not match when project differs in codex:// URI', () => {
      expect(
        matchFromCodexPattern(
          'projects/api.corthodex.ai/docs/schema/data.json',
          ['codex://fractary/etl.corthion.ai/docs/schema/**/*.json'],
          'lake.corthonomy.ai',
          { org: 'fractary' }
        )
      ).toBe(false)
    })

    it('should match codex:// URI with {project} placeholder', () => {
      expect(
        matchFromCodexPattern(
          'projects/lake.corthonomy.ai/docs/api.md',
          ['codex://fractary/{project}/docs/**'],
          'lake.corthonomy.ai',
          { org: 'fractary' }
        )
      ).toBe(true)
    })

    it('should match codex:// URI with {codex_repo} placeholder', () => {
      expect(
        matchFromCodexPattern(
          'projects/codex.fractary.com/docs/standards/api.md',
          ['codex://fractary/{codex_repo}/docs/**'],
          'lake.corthonomy.ai',
          { org: 'fractary', codexRepo: 'codex.fractary.com' }
        )
      ).toBe(true)
    })

    it('should match codex:// URI with {org} placeholder', () => {
      expect(
        matchFromCodexPattern(
          'projects/etl.corthion.ai/docs/file.md',
          ['codex://{org}/etl.corthion.ai/docs/**'],
          'lake.corthonomy.ai',
          { org: 'fractary' }
        )
      ).toBe(true)
    })

    it('should match codex:// URI without path (matches all files in project)', () => {
      expect(
        matchFromCodexPattern(
          'projects/etl.corthion.ai/any/deep/path/file.md',
          ['codex://fractary/etl.corthion.ai'],
          'lake.corthonomy.ai',
          { org: 'fractary' }
        )
      ).toBe(true)
    })

    it('should handle multiple codex:// patterns', () => {
      const patterns = [
        'codex://fractary/etl.corthion.ai/docs/**',
        'codex://fractary/{codex_repo}/standards/**',
        'codex://fractary/{project}/**',
      ]

      // Matches first pattern
      expect(
        matchFromCodexPattern(
          'projects/etl.corthion.ai/docs/api.md',
          patterns,
          'lake.corthonomy.ai',
          { org: 'fractary', codexRepo: 'codex.fractary.com' }
        )
      ).toBe(true)

      // Matches second pattern
      expect(
        matchFromCodexPattern(
          'projects/codex.fractary.com/standards/coding.md',
          patterns,
          'lake.corthonomy.ai',
          { org: 'fractary', codexRepo: 'codex.fractary.com' }
        )
      ).toBe(true)

      // Matches third pattern (own project)
      expect(
        matchFromCodexPattern(
          'projects/lake.corthonomy.ai/README.md',
          patterns,
          'lake.corthonomy.ai',
          { org: 'fractary', codexRepo: 'codex.fractary.com' }
        )
      ).toBe(true)
    })

    it('should skip codex:// patterns with unexpanded placeholders', () => {
      // When codexRepo is not provided, {codex_repo} won't expand
      expect(
        matchFromCodexPattern(
          'projects/codex.fractary.com/docs/file.md',
          ['codex://fractary/{codex_repo}/docs/**'],
          'lake.corthonomy.ai',
          { org: 'fractary' } // No codexRepo provided
        )
      ).toBe(false)
    })

    it('should handle codex:// URI with incomplete path', () => {
      // URI with only org (no project) should not match
      expect(
        matchFromCodexPattern(
          'projects/etl.corthion.ai/docs/file.md',
          ['codex://fractary'],
          'lake.corthonomy.ai',
          { org: 'fractary' }
        )
      ).toBe(false)
    })
  })
})

describe('extractProjectFromCodexPath', () => {
  it('should extract project name from codex path', () => {
    expect(
      extractProjectFromCodexPath('etl.corthion.ai/docs/schema/data.json')
    ).toBe('etl.corthion.ai')
    expect(
      extractProjectFromCodexPath('lake.corthonomy.ai/README.md')
    ).toBe('lake.corthonomy.ai')
    expect(
      extractProjectFromCodexPath('core.corthodex.ai/docs/standards/api.md')
    ).toBe('core.corthodex.ai')
  })

  it('should return null for invalid paths', () => {
    expect(extractProjectFromCodexPath('invalid')).toBe(null)
    expect(extractProjectFromCodexPath('')).toBe(null)
  })

  it('should handle paths with multiple slashes', () => {
    expect(
      extractProjectFromCodexPath('project.name/deep/nested/path/file.md')
    ).toBe('project.name')
  })
})

describe('getRelativePath', () => {
  it('should extract relative path from codex path', () => {
    expect(
      getRelativePath('etl.corthion.ai/docs/schema/data.json')
    ).toBe('docs/schema/data.json')
    expect(
      getRelativePath('lake.corthonomy.ai/README.md')
    ).toBe('README.md')
    expect(
      getRelativePath('core.corthodex.ai/docs/standards/api.md')
    ).toBe('docs/standards/api.md')
  })

  it('should return null for invalid paths', () => {
    expect(getRelativePath('invalid')).toBe(null)
    expect(getRelativePath('')).toBe(null)
  })

  it('should handle nested paths', () => {
    expect(
      getRelativePath('project/deep/nested/path/file.md')
    ).toBe('deep/nested/path/file.md')
  })
})

describe('expandPlaceholders', () => {
  it('should expand {project} placeholder', () => {
    const result = expandPlaceholders(
      ['{project}/**', 'other/path'],
      'lake.corthonomy.ai'
    )
    expect(result).toEqual(['lake.corthonomy.ai/**', 'other/path'])
  })

  it('should expand multiple placeholders in same pattern', () => {
    const result = expandPlaceholders(
      ['{project}/docs/{project}.md'],
      'test.project'
    )
    expect(result).toEqual(['test.project/docs/test.project.md'])
  })

  it('should handle patterns without placeholders', () => {
    const result = expandPlaceholders(
      ['etl.corthion.ai/**', 'core.corthodex.ai/**'],
      'lake.corthonomy.ai'
    )
    expect(result).toEqual(['etl.corthion.ai/**', 'core.corthodex.ai/**'])
  })

  it('should return undefined for undefined patterns', () => {
    const result = expandPlaceholders(undefined, 'lake.corthonomy.ai')
    expect(result).toBeUndefined()
  })

  it('should handle empty arrays', () => {
    const result = expandPlaceholders([], 'lake.corthonomy.ai')
    expect(result).toEqual([])
  })

  it('should expand placeholder in multiple patterns', () => {
    const result = expandPlaceholders(
      ['{project}/**', '{project}/README.md', 'other/**'],
      'my.project'
    )
    expect(result).toEqual([
      'my.project/**',
      'my.project/README.md',
      'other/**',
    ])
  })

  describe('with org and codexRepo options', () => {
    it('should expand {org} placeholder', () => {
      const result = expandPlaceholders(
        ['codex://{org}/project/docs/**'],
        'my.project',
        { org: 'fractary' }
      )
      expect(result).toEqual(['codex://fractary/project/docs/**'])
    })

    it('should expand {codex_repo} placeholder', () => {
      const result = expandPlaceholders(
        ['codex://fractary/{codex_repo}/docs/**'],
        'my.project',
        { codexRepo: 'codex.fractary.com' }
      )
      expect(result).toEqual(['codex://fractary/codex.fractary.com/docs/**'])
    })

    it('should expand all placeholders together', () => {
      const result = expandPlaceholders(
        [
          'codex://{org}/{codex_repo}/docs/**',
          'codex://{org}/{project}/**',
          '{project}/local/**',
        ],
        'my.project',
        { org: 'fractary', codexRepo: 'codex.fractary.com' }
      )
      expect(result).toEqual([
        'codex://fractary/codex.fractary.com/docs/**',
        'codex://fractary/my.project/**',
        'my.project/local/**',
      ])
    })

    it('should leave unexpanded placeholders when options not provided', () => {
      const result = expandPlaceholders(
        ['codex://{org}/{codex_repo}/docs/**'],
        'my.project'
        // No options provided
      )
      // {org} and {codex_repo} remain unexpanded
      expect(result).toEqual(['codex://{org}/{codex_repo}/docs/**'])
    })

    it('should only expand provided placeholders', () => {
      const result = expandPlaceholders(
        ['codex://{org}/{codex_repo}/docs/**'],
        'my.project',
        { org: 'fractary' } // Only org, no codexRepo
      )
      // {codex_repo} remains unexpanded
      expect(result).toEqual(['codex://fractary/{codex_repo}/docs/**'])
    })
  })
})

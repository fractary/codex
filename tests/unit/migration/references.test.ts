import { describe, it, expect } from 'vitest'
import {
  convertLegacyReferences,
  convertToUri,
  findLegacyReferences,
  hasLegacyReferences,
  migrateFileReferences,
  generateReferenceMigrationSummary,
  LEGACY_PATTERNS,
} from '../../../src/migration/references.js'

describe('migration/references', () => {
  describe('LEGACY_PATTERNS', () => {
    it('should have expected patterns', () => {
      expect(LEGACY_PATTERNS.CODEX_TAG).toBeDefined()
      expect(LEGACY_PATTERNS.CODEX_BRACKET).toBeDefined()
      expect(LEGACY_PATTERNS.CODEX_MUSTACHE).toBeDefined()
      expect(LEGACY_PATTERNS.SIMPLE_PATH).toBeDefined()
    })
  })

  describe('convertLegacyReferences', () => {
    it('should convert @codex: references', () => {
      const text = 'See @codex: docs/api.md for more info'

      const result = convertLegacyReferences(text, {
        defaultOrg: 'myorg',
        defaultProject: 'myproject',
      })

      expect(result.modified).toBe(true)
      expect(result.converted).toContain('codex://myorg/myproject/docs/api.md')
      expect(result.references).toHaveLength(1)
      expect(result.references[0]?.format).toBe('codex-tag')
    })

    it('should convert [codex:...] references', () => {
      const text = 'Check [codex: specs/design.md] for details'

      const result = convertLegacyReferences(text, {
        defaultOrg: 'org',
        defaultProject: 'proj',
      })

      expect(result.modified).toBe(true)
      expect(result.converted).toContain('codex://org/proj/specs/design.md')
    })

    it('should convert {{codex:...}} references', () => {
      const text = 'Template: {{codex: templates/readme.md}}'

      const result = convertLegacyReferences(text, {
        defaultOrg: 'org',
        defaultProject: 'proj',
      })

      expect(result.modified).toBe(true)
      expect(result.converted).toContain('codex://org/proj/templates/readme.md')
    })

    it('should convert multiple references', () => {
      const text = `
See @codex: docs/api.md and [codex: docs/guide.md] for info.
Also check {{codex: specs/design.md}}.
`

      const result = convertLegacyReferences(text, {
        defaultOrg: 'org',
        defaultProject: 'proj',
      })

      expect(result.references).toHaveLength(3)
    })

    it('should not modify text without references', () => {
      const text = 'This is regular text without any references'

      const result = convertLegacyReferences(text)

      expect(result.modified).toBe(false)
      expect(result.converted).toBe(text)
      expect(result.references).toHaveLength(0)
    })

    it('should preserve existing codex:// URIs', () => {
      const text = 'Already using codex://org/proj/file.md'

      const result = convertLegacyReferences(text)

      expect(result.converted).toBe(text)
    })

    it('should preserve wrapper when option set', () => {
      const text = 'See @codex: docs/api.md'

      const result = convertLegacyReferences(text, {
        defaultOrg: 'org',
        defaultProject: 'proj',
        preserveWrapper: true,
      })

      expect(result.converted).toContain('@codex: codex://org/proj/docs/api.md')
    })
  })

  describe('convertToUri', () => {
    it('should return existing codex:// URIs unchanged', () => {
      const uri = 'codex://org/proj/file.md'

      expect(convertToUri(uri)).toBe(uri)
    })

    it('should convert org/project/path format', () => {
      const result = convertToUri('myorg/myproject/docs/file.md')

      expect(result).toBe('codex://myorg/myproject/docs/file.md')
    })

    it('should use defaults for simple paths', () => {
      const result = convertToUri('file.md', {
        defaultOrg: 'default-org',
        defaultProject: 'default-proj',
      })

      expect(result).toBe('codex://default-org/default-proj/file.md')
    })

    it('should use _ for missing org/project', () => {
      const result = convertToUri('file.md')

      expect(result).toBe('codex://_/_/file.md')
    })

    it('should handle relative paths', () => {
      const result = convertToUri('./relative/path.md', {
        defaultOrg: 'org',
        defaultProject: 'proj',
      })

      expect(result).toBe('codex://org/proj/./relative/path.md')
    })

    it('should handle org/project/path format', () => {
      const result = convertToUri('myorg/myproject/docs/file.md')

      // 3-part paths are treated as org/project/path
      expect(result).toBe('codex://myorg/myproject/docs/file.md')
    })
  })

  describe('findLegacyReferences', () => {
    it('should find all legacy references', () => {
      const text = `
@codex: file1.md
[codex: file2.md]
{{codex: file3.md}}
`

      const refs = findLegacyReferences(text)

      expect(refs.length).toBe(3)
    })

    it('should sort by position', () => {
      const text = '{{codex: first.md}} then @codex: second.md'

      const refs = findLegacyReferences(text)

      expect(refs[0]?.original).toContain('first')
      expect(refs[1]?.original).toContain('second')
    })

    it('should return empty array for no references', () => {
      const refs = findLegacyReferences('No references here')

      expect(refs).toEqual([])
    })
  })

  describe('hasLegacyReferences', () => {
    it('should return true for @codex:', () => {
      expect(hasLegacyReferences('@codex: file.md')).toBe(true)
    })

    it('should return true for [codex:]', () => {
      expect(hasLegacyReferences('[codex: file.md]')).toBe(true)
    })

    it('should return true for {{codex:}}', () => {
      expect(hasLegacyReferences('{{codex: file.md}}')).toBe(true)
    })

    it('should return false for modern URIs only', () => {
      expect(hasLegacyReferences('codex://org/proj/file.md')).toBe(false)
    })

    it('should return false for no references', () => {
      expect(hasLegacyReferences('Regular text')).toBe(false)
    })
  })

  describe('migrateFileReferences', () => {
    it('should migrate all references in file content', () => {
      const content = `
# Documentation

See @codex: docs/overview.md for an overview.
Reference the [codex: specs/api.md] spec.

## Examples

Check {{codex: examples/basic.md}} for examples.
`

      const result = migrateFileReferences(content, {
        defaultOrg: 'myorg',
        defaultProject: 'myproject',
      })

      expect(result.modified).toBe(true)
      expect(result.references).toHaveLength(3)
      expect(result.converted).toContain('codex://myorg/myproject/docs/overview.md')
      expect(result.converted).toContain('codex://myorg/myproject/specs/api.md')
      expect(result.converted).toContain('codex://myorg/myproject/examples/basic.md')
    })
  })

  describe('generateReferenceMigrationSummary', () => {
    it('should generate summary for multiple results', () => {
      const results = [
        convertLegacyReferences('@codex: file1.md', { defaultOrg: 'o', defaultProject: 'p' }),
        convertLegacyReferences('No refs'),
        convertLegacyReferences('[codex: file2.md] {{codex: file3.md}}', {
          defaultOrg: 'o',
          defaultProject: 'p',
        }),
      ]

      const summary = generateReferenceMigrationSummary(results)

      expect(summary).toContain('Total files processed: 3')
      expect(summary).toContain('Files with changes: 2')
      expect(summary).toContain('Total references converted: 3')
      expect(summary).toContain('References by Format')
    })

    it('should handle empty results', () => {
      const summary = generateReferenceMigrationSummary([])

      expect(summary).toContain('Total files processed: 0')
    })
  })
})

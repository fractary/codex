import { describe, test, expect } from 'vitest'
import {
  CONFIG_SCHEMA_VERSION,
  SYNC_PATTERN_PRESETS,
  DEFAULT_GLOBAL_EXCLUDES,
  getSyncPreset,
  getSyncPresetNames,
  substitutePatternPlaceholders,
  generateSyncConfigFromPreset,
} from '../../../src/core/config/sync-presets.js'
import { ValidationError } from '../../../src/errors/index.js'

describe('CONFIG_SCHEMA_VERSION', () => {
  test('is defined and is a string', () => {
    expect(CONFIG_SCHEMA_VERSION).toBe('2.0')
    expect(typeof CONFIG_SCHEMA_VERSION).toBe('string')
  })
})

describe('SYNC_PATTERN_PRESETS', () => {
  test('contains standard preset', () => {
    expect(SYNC_PATTERN_PRESETS.standard).toBeDefined()
    expect(SYNC_PATTERN_PRESETS.standard.name).toBe('standard')
    expect(SYNC_PATTERN_PRESETS.standard.config.to_codex.include).toContain('docs/**')
    expect(SYNC_PATTERN_PRESETS.standard.config.to_codex.include).toContain('README.md')
    expect(SYNC_PATTERN_PRESETS.standard.config.to_codex.include).toContain('CLAUDE.md')
    expect(SYNC_PATTERN_PRESETS.standard.config.to_codex.exclude).toContain('_archive/**')
    expect(SYNC_PATTERN_PRESETS.standard.config.from_codex.exclude).toContain('_archive/**')
  })

  test('contains minimal preset', () => {
    expect(SYNC_PATTERN_PRESETS.minimal).toBeDefined()
    expect(SYNC_PATTERN_PRESETS.minimal.name).toBe('minimal')
    expect(SYNC_PATTERN_PRESETS.minimal.config.to_codex.include).toContain('docs/**')
    expect(SYNC_PATTERN_PRESETS.minimal.config.to_codex.include).toContain('README.md')
    expect(SYNC_PATTERN_PRESETS.minimal.config.to_codex.include).not.toContain('CLAUDE.md')
  })

  test('presets have from_codex patterns with placeholders', () => {
    expect(SYNC_PATTERN_PRESETS.standard.config.from_codex.include[0]).toContain('{org}')
    expect(SYNC_PATTERN_PRESETS.standard.config.from_codex.include[0]).toContain('{codex_repo}')
  })
})

describe('DEFAULT_GLOBAL_EXCLUDES', () => {
  test('contains common exclude patterns', () => {
    expect(DEFAULT_GLOBAL_EXCLUDES).toContain('**/.git/**')
    expect(DEFAULT_GLOBAL_EXCLUDES).toContain('**/node_modules/**')
    expect(DEFAULT_GLOBAL_EXCLUDES).toContain('**/.env')
    expect(DEFAULT_GLOBAL_EXCLUDES).toContain('**/credentials.json')
  })

  test('is a non-empty array', () => {
    expect(Array.isArray(DEFAULT_GLOBAL_EXCLUDES)).toBe(true)
    expect(DEFAULT_GLOBAL_EXCLUDES.length).toBeGreaterThan(0)
  })
})

describe('getSyncPreset', () => {
  test('returns standard preset', () => {
    const preset = getSyncPreset('standard')
    expect(preset).toBeDefined()
    expect(preset?.name).toBe('standard')
  })

  test('returns minimal preset', () => {
    const preset = getSyncPreset('minimal')
    expect(preset).toBeDefined()
    expect(preset?.name).toBe('minimal')
  })

  test('returns undefined for unknown preset', () => {
    expect(getSyncPreset('unknown')).toBeUndefined()
    expect(getSyncPreset('')).toBeUndefined()
  })
})

describe('getSyncPresetNames', () => {
  test('returns array of preset names', () => {
    const names = getSyncPresetNames()
    expect(Array.isArray(names)).toBe(true)
    expect(names).toContain('standard')
    expect(names).toContain('minimal')
  })

  test('returns at least 2 presets', () => {
    expect(getSyncPresetNames().length).toBeGreaterThanOrEqual(2)
  })
})

describe('substitutePatternPlaceholders', () => {
  test('replaces {org} placeholder', () => {
    const result = substitutePatternPlaceholders(
      ['codex://{org}/repo/docs/**'],
      'myorg',
      'codex.myorg.com'
    )
    expect(result[0]).toBe('codex://myorg/repo/docs/**')
  })

  test('replaces {codex_repo} placeholder', () => {
    const result = substitutePatternPlaceholders(
      ['codex://org/{codex_repo}/docs/**'],
      'myorg',
      'codex.myorg.com'
    )
    expect(result[0]).toBe('codex://org/codex.myorg.com/docs/**')
  })

  test('replaces both placeholders', () => {
    const result = substitutePatternPlaceholders(
      ['codex://{org}/{codex_repo}/docs/**'],
      'acme',
      'codex.acme.ai'
    )
    expect(result[0]).toBe('codex://acme/codex.acme.ai/docs/**')
  })

  test('replaces multiple occurrences (global replace)', () => {
    const result = substitutePatternPlaceholders(
      ['{org}/{org}/{codex_repo}/{codex_repo}'],
      'test',
      'repo'
    )
    expect(result[0]).toBe('test/test/repo/repo')
  })

  test('handles patterns without placeholders', () => {
    const result = substitutePatternPlaceholders(
      ['docs/**', 'README.md'],
      'org',
      'repo'
    )
    expect(result).toEqual(['docs/**', 'README.md'])
  })

  test('handles empty pattern array', () => {
    const result = substitutePatternPlaceholders([], 'org', 'repo')
    expect(result).toEqual([])
  })

  test.each([
    ['empty org', '', 'repo'],
    ['whitespace-only org', '   ', 'repo'],
    ['null org', null, 'repo'],
    ['undefined org', undefined, 'repo'],
  ])('throws ValidationError for %s', (_, org, repo) => {
    expect(() =>
      substitutePatternPlaceholders(['pattern'], org as any, repo as string)
    ).toThrow(ValidationError)
  })

  test.each([
    ['empty codexRepo', 'org', ''],
    ['whitespace-only codexRepo', 'org', '  '],
    ['null codexRepo', 'org', null],
    ['undefined codexRepo', 'org', undefined],
  ])('throws ValidationError for %s', (_, org, repo) => {
    expect(() =>
      substitutePatternPlaceholders(['pattern'], org as string, repo as any)
    ).toThrow(ValidationError)
  })
})

describe('generateSyncConfigFromPreset', () => {
  test('generates config from standard preset', () => {
    const config = generateSyncConfigFromPreset('standard', 'myorg', 'codex.myorg.com')
    expect(config).toBeDefined()
    expect(config?.to_codex.include).toContain('docs/**')
    expect(config?.to_codex.include).toContain('README.md')
    expect(config?.to_codex.include).toContain('CLAUDE.md')
    expect(config?.to_codex.exclude).toContain('_archive/**')
    expect(config?.from_codex.include[0]).toBe('codex://myorg/codex.myorg.com/docs/**')
    expect(config?.from_codex.exclude).toContain('_archive/**')
  })

  test('generates config from minimal preset', () => {
    const config = generateSyncConfigFromPreset('minimal', 'acme', 'codex.acme.ai')
    expect(config).toBeDefined()
    expect(config?.to_codex.include).toContain('docs/**')
    expect(config?.to_codex.include).toContain('README.md')
    expect(config?.to_codex.include).not.toContain('CLAUDE.md')
    expect(config?.from_codex.include[0]).toBe('codex://acme/codex.acme.ai/docs/**')
  })

  test('returns undefined for unknown preset', () => {
    const config = generateSyncConfigFromPreset('nonexistent', 'org', 'repo')
    expect(config).toBeUndefined()
  })

  test('substitutes placeholders in from_codex patterns', () => {
    const config = generateSyncConfigFromPreset('standard', 'fractary', 'codex.fractary.com')
    expect(config?.from_codex.include[0]).not.toContain('{org}')
    expect(config?.from_codex.include[0]).not.toContain('{codex_repo}')
    expect(config?.from_codex.include[0]).toContain('fractary')
    expect(config?.from_codex.include[0]).toContain('codex.fractary.com')
  })

  test('does not include global excludes by default', () => {
    const config = generateSyncConfigFromPreset('standard', 'org', 'repo')
    expect(config?.to_codex.exclude).not.toContain('**/.git/**')
    expect(config?.to_codex.exclude).not.toContain('**/node_modules/**')
  })

  test('includes global excludes when option is set', () => {
    const config = generateSyncConfigFromPreset('standard', 'org', 'repo', {
      includeGlobalExcludes: true,
    })
    expect(config?.to_codex.exclude).toContain('**/.git/**')
    expect(config?.to_codex.exclude).toContain('**/node_modules/**')
    // Should also include preset-specific excludes
    expect(config?.to_codex.exclude).toContain('*.tmp')
  })

  test('preserves preset excludes when adding global excludes', () => {
    const config = generateSyncConfigFromPreset('standard', 'org', 'repo', {
      includeGlobalExcludes: true,
    })
    // Standard preset has '*.tmp' as exclude
    expect(config?.to_codex.exclude).toContain('*.tmp')
    // And also has global excludes
    expect(config?.to_codex.exclude).toContain('**/.git/**')
  })

  test('returns new array instances (not references)', () => {
    const config1 = generateSyncConfigFromPreset('standard', 'org1', 'repo1')
    const config2 = generateSyncConfigFromPreset('standard', 'org2', 'repo2')

    // Modify config1
    config1?.to_codex.include.push('extra/**')

    // config2 should not be affected
    expect(config2?.to_codex.include).not.toContain('extra/**')
  })
})

// Note: The sync-presets.json file has been removed as part of CLI/Plugin/SDK alignment.
// The TypeScript source in sync-presets.ts is now the SINGLE SOURCE OF TRUTH.
// The plugin's configurator agent delegates to the CLI, which uses the SDK's presets directly.

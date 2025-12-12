import { describe, test, expect } from 'vitest'
import {
  parseCustomDestination,
  getCustomSyncDestinations,
} from '../../../src/core/custom/destinations.js'
import { ValidationError } from '../../../src/errors/index.js'
import type { Metadata } from '../../../src/schemas/metadata.js'

describe('parseCustomDestination', () => {
  test('parses valid destination format', () => {
    const result = parseCustomDestination(
      'developers.fractary.com:src/content/docs/forge/'
    )

    expect(result).toEqual({
      repo: 'developers.fractary.com',
      path: 'src/content/docs/forge/',
    })
  })

  test('handles simple paths', () => {
    const result = parseCustomDestination('docs.example.com:api/')

    expect(result).toEqual({
      repo: 'docs.example.com',
      path: 'api/',
    })
  })

  test('handles deep paths', () => {
    const result = parseCustomDestination(
      'site.com:content/docs/v2/api/reference/'
    )

    expect(result).toEqual({
      repo: 'site.com',
      path: 'content/docs/v2/api/reference/',
    })
  })

  test('trims whitespace', () => {
    const result = parseCustomDestination(
      '  developers.fractary.com  :  src/content/docs/  '
    )

    expect(result).toEqual({
      repo: 'developers.fractary.com',
      path: 'src/content/docs/',
    })
  })

  test('handles repo with multiple colons in path', () => {
    const result = parseCustomDestination('example.com:path:with:colons/')

    expect(result).toEqual({
      repo: 'example.com',
      path: 'path:with:colons/',
    })
  })

  test('throws on missing colon', () => {
    expect(() =>
      parseCustomDestination('developers.fractary.com')
    ).toThrow(ValidationError)
    expect(() =>
      parseCustomDestination('developers.fractary.com')
    ).toThrow(/Expected format: "repo:path"/)
  })

  test('throws on empty repo', () => {
    expect(() => parseCustomDestination(':src/content/docs/')).toThrow(
      ValidationError
    )
    expect(() => parseCustomDestination(':src/content/docs/')).toThrow(
      /repository name cannot be empty/
    )
  })

  test('throws on empty path', () => {
    expect(() => parseCustomDestination('developers.fractary.com:')).toThrow(
      ValidationError
    )
    expect(() => parseCustomDestination('developers.fractary.com:')).toThrow(
      /path cannot be empty/
    )
  })

  test('throws on empty string', () => {
    expect(() => parseCustomDestination('')).toThrow(ValidationError)
    expect(() => parseCustomDestination('')).toThrow(
      /must be a non-empty string/
    )
  })

  test('throws on non-string input', () => {
    expect(() => parseCustomDestination(null as any)).toThrow(ValidationError)
    expect(() => parseCustomDestination(undefined as any)).toThrow(
      ValidationError
    )
    expect(() => parseCustomDestination(123 as any)).toThrow(ValidationError)
  })
})

describe('getCustomSyncDestinations', () => {
  test('extracts multiple destinations', () => {
    const metadata: Metadata = {
      codex_sync_custom: [
        'developers.fractary.com:src/content/docs/forge/',
        'docs.example.com:api/',
      ],
    }

    const result = getCustomSyncDestinations(metadata)

    expect(result).toEqual([
      {
        repo: 'developers.fractary.com',
        path: 'src/content/docs/forge/',
      },
      {
        repo: 'docs.example.com',
        path: 'api/',
      },
    ])
  })

  test('returns empty array when codex_sync_custom is undefined', () => {
    const metadata: Metadata = {}

    const result = getCustomSyncDestinations(metadata)

    expect(result).toEqual([])
  })

  test('returns empty array when codex_sync_custom is empty array', () => {
    const metadata: Metadata = {
      codex_sync_custom: [],
    }

    const result = getCustomSyncDestinations(metadata)

    expect(result).toEqual([])
  })

  test('returns empty array when codex_sync_custom is not an array', () => {
    const metadata: Metadata = {
      codex_sync_custom: 'not-an-array' as any,
    }

    const result = getCustomSyncDestinations(metadata)

    expect(result).toEqual([])
  })

  test('skips invalid destinations', () => {
    const metadata: Metadata = {
      codex_sync_custom: [
        'valid.com:path/',
        'invalid-no-colon',
        ':empty-repo',
        'another-valid.com:another/path/',
      ],
    }

    const result = getCustomSyncDestinations(metadata)

    // Only valid destinations should be returned
    expect(result).toEqual([
      {
        repo: 'valid.com',
        path: 'path/',
      },
      {
        repo: 'another-valid.com',
        path: 'another/path/',
      },
    ])
  })

  test('handles single destination', () => {
    const metadata: Metadata = {
      codex_sync_custom: ['developers.fractary.com:src/content/docs/'],
    }

    const result = getCustomSyncDestinations(metadata)

    expect(result).toEqual([
      {
        repo: 'developers.fractary.com',
        path: 'src/content/docs/',
      },
    ])
  })

  test('works with full metadata object', () => {
    const metadata: Metadata = {
      title: 'API Reference',
      codex_sync_include: ['api-*'],
      codex_sync_exclude: ['*-test'],
      codex_sync_custom: ['developers.fractary.com:src/content/docs/api/'],
      tags: ['api', 'documentation'],
    }

    const result = getCustomSyncDestinations(metadata)

    expect(result).toEqual([
      {
        repo: 'developers.fractary.com',
        path: 'src/content/docs/api/',
      },
    ])
  })
})

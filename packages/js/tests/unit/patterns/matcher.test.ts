import { describe, test, expect } from 'vitest'
import {
  matchPattern,
  matchAnyPattern,
  filterByPatterns,
  evaluatePatterns,
} from '../../../src/core/patterns/matcher.js'

describe('matchPattern', () => {
  test('exact match', () => {
    expect(matchPattern('api-gateway', 'api-gateway')).toBe(true)
    expect(matchPattern('api-gateway', 'api-auth')).toBe(false)
  })

  test('wildcard matching', () => {
    expect(matchPattern('api-*', 'api-gateway')).toBe(true)
    expect(matchPattern('api-*', 'api-auth')).toBe(true)
    expect(matchPattern('api-*', 'web-app')).toBe(false)
  })

  test('dots are literal', () => {
    expect(matchPattern('codex.*.com', 'codex.fractary.com')).toBe(true)
    expect(matchPattern('codex.fractary.com', 'codex.fractary.com')).toBe(true)
    expect(matchPattern('codex.fractary.com', 'codexXfractaryXcom')).toBe(false)
  })

  test('multiple wildcards', () => {
    expect(matchPattern('*-*-*', 'foo-bar-baz')).toBe(true)
    expect(matchPattern('*-gateway', 'api-gateway')).toBe(true)
    expect(matchPattern('*-gateway', 'auth-gateway')).toBe(true)
  })

  test('beginning and end wildcards', () => {
    expect(matchPattern('*-test', 'api-test')).toBe(true)
    expect(matchPattern('*-test', 'core-test')).toBe(true)
    expect(matchPattern('*-test', 'production')).toBe(false)
  })
})

describe('matchAnyPattern', () => {
  test('matches any pattern', () => {
    expect(matchAnyPattern(['api-*', 'core-*'], 'api-gateway')).toBe(true)
    expect(matchAnyPattern(['api-*', 'core-*'], 'core-auth')).toBe(true)
    expect(matchAnyPattern(['api-*', 'core-*'], 'web-app')).toBe(false)
  })

  test('special case [*]', () => {
    expect(matchAnyPattern(['*'], 'anything')).toBe(true)
    expect(matchAnyPattern(['*'], 'whatever')).toBe(true)
  })

  test('empty array', () => {
    expect(matchAnyPattern([], 'anything')).toBe(false)
  })

  test('exact matches in array', () => {
    expect(matchAnyPattern(['api-gateway', 'web-app'], 'api-gateway')).toBe(
      true
    )
    expect(matchAnyPattern(['api-gateway', 'web-app'], 'core-db')).toBe(false)
  })
})

describe('filterByPatterns', () => {
  test('filters matching values', () => {
    const repos = ['api-gateway', 'api-auth', 'api-test', 'web-app', 'core-db']
    const result = filterByPatterns(['api-*'], repos)

    expect(result).toEqual(['api-gateway', 'api-auth', 'api-test'])
  })

  test('filters with multiple patterns', () => {
    const repos = ['api-gateway', 'api-auth', 'web-app', 'core-db']
    const result = filterByPatterns(['api-*', 'core-*'], repos)

    expect(result).toEqual(['api-gateway', 'api-auth', 'core-db'])
  })

  test('returns all for [*]', () => {
    const repos = ['api-gateway', 'web-app', 'core-db']
    const result = filterByPatterns(['*'], repos)

    expect(result).toEqual(repos)
  })

  test('returns empty for no matches', () => {
    const repos = ['web-app', 'core-db']
    const result = filterByPatterns(['api-*'], repos)

    expect(result).toEqual([])
  })
})

describe('evaluatePatterns', () => {
  test('include and exclude', () => {
    expect(
      evaluatePatterns({
        value: 'api-gateway',
        include: ['api-*'],
        exclude: ['*-test'],
      })
    ).toBe(true)

    expect(
      evaluatePatterns({
        value: 'api-test',
        include: ['api-*'],
        exclude: ['*-test'],
      })
    ).toBe(false)
  })

  test('exclusions take priority', () => {
    expect(
      evaluatePatterns({
        value: 'api-test',
        include: ['*'],
        exclude: ['*-test'],
      })
    ).toBe(false)
  })

  test('no include patterns means include by default', () => {
    expect(
      evaluatePatterns({
        value: 'api-gateway',
        include: [],
        exclude: [],
      })
    ).toBe(true)
  })

  test('not included means exclude', () => {
    expect(
      evaluatePatterns({
        value: 'web-app',
        include: ['api-*'],
        exclude: [],
      })
    ).toBe(false)
  })
})

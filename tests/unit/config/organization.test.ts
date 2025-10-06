import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  resolveOrganization,
  extractOrgFromRepoName,
} from '../../../src/core/config/organization.js'
import { ConfigurationError } from '../../../src/errors/index.js'

describe('extractOrgFromRepoName', () => {
  test('extracts org from valid pattern', () => {
    expect(extractOrgFromRepoName('codex.fractary.com')).toBe('fractary')
    expect(extractOrgFromRepoName('codex.acme.ai')).toBe('acme')
    expect(extractOrgFromRepoName('codex.my-org.io')).toBe('my-org')
  })

  test('returns null for invalid pattern', () => {
    expect(extractOrgFromRepoName('not-a-codex-repo')).toBeNull()
    expect(extractOrgFromRepoName('codex')).toBeNull()
    expect(extractOrgFromRepoName('codex.com')).toBeNull()
  })
})

describe('resolveOrganization', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = process.env
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  test('uses explicit orgSlug parameter', () => {
    const org = resolveOrganization({ orgSlug: 'acme' })
    expect(org).toBe('acme')
  })

  test('auto-detects from repo name', () => {
    const org = resolveOrganization({
      repoName: 'codex.fractary.com',
      autoDetect: true,
    })
    expect(org).toBe('fractary')
  })

  test('uses environment variable ORGANIZATION_SLUG', () => {
    process.env['ORGANIZATION_SLUG'] = 'env-org'
    const org = resolveOrganization()
    expect(org).toBe('env-org')
  })

  test('uses environment variable CODEX_ORG_SLUG', () => {
    process.env['CODEX_ORG_SLUG'] = 'codex-env-org'
    const org = resolveOrganization()
    expect(org).toBe('codex-env-org')
  })

  test('ORGANIZATION_SLUG takes precedence over CODEX_ORG_SLUG', () => {
    process.env['ORGANIZATION_SLUG'] = 'org1'
    process.env['CODEX_ORG_SLUG'] = 'org2'
    const org = resolveOrganization()
    expect(org).toBe('org1')
  })

  test('explicit parameter takes precedence over auto-detect', () => {
    const org = resolveOrganization({
      orgSlug: 'explicit',
      repoName: 'codex.fractary.com',
      autoDetect: true,
    })
    expect(org).toBe('explicit')
  })

  test('throws ConfigurationError when slug cannot be determined', () => {
    delete process.env['ORGANIZATION_SLUG']
    delete process.env['CODEX_ORG_SLUG']

    expect(() => resolveOrganization()).toThrow(ConfigurationError)
  })

  test('auto-detect can be disabled', () => {
    delete process.env['ORGANIZATION_SLUG']
    delete process.env['CODEX_ORG_SLUG']

    expect(() =>
      resolveOrganization({
        repoName: 'codex.fractary.com',
        autoDetect: false,
      })
    ).toThrow(ConfigurationError)
  })
})

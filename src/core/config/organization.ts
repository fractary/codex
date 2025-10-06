import { ConfigurationError } from '../../errors/index.js'

export interface ResolveOrgOptions {
  orgSlug?: string // Explicit org slug
  repoName?: string // Repo name for auto-detection
  autoDetect?: boolean // Enable auto-detection (default: true)
}

/**
 * Resolve organization slug from multiple sources
 *
 * Based on SPEC-00005: Configuration System
 *
 * Priority:
 * 1. Explicit orgSlug parameter
 * 2. Auto-detect from repoName (if enabled)
 * 3. Environment variable (ORGANIZATION_SLUG or CODEX_ORG_SLUG)
 * 4. Throw ConfigurationError if none found
 *
 * @param options - Resolution options
 * @returns Organization slug
 * @throws ConfigurationError if slug cannot be determined
 */
export function resolveOrganization(
  options: ResolveOrgOptions = {}
): string {
  const { orgSlug, repoName, autoDetect = true } = options

  // 1. Explicit parameter
  if (orgSlug) {
    return orgSlug
  }

  // 2. Auto-detect from repo name
  if (autoDetect && repoName) {
    const detected = extractOrgFromRepoName(repoName)
    if (detected) {
      return detected
    }
  }

  // 3. Environment variables
  const envOrg =
    process.env['ORGANIZATION_SLUG'] || process.env['CODEX_ORG_SLUG']

  if (envOrg) {
    return envOrg
  }

  // 4. Fail - required parameter missing
  throw new ConfigurationError(
    'Organization slug could not be determined. ' +
      'Set ORGANIZATION_SLUG environment variable or pass orgSlug option.'
  )
}

/**
 * Extract org slug from repo name pattern
 *
 * Patterns:
 * - codex.fractary.com → "fractary"
 * - codex.acme.ai → "acme"
 * - codex.my-org.io → "my-org"
 *
 * @param repoName - Repository name
 * @returns Organization slug or null if pattern doesn't match
 */
export function extractOrgFromRepoName(repoName: string): string | null {
  // Pattern: codex.{org}.{tld}
  const match = repoName.match(/^codex\.([^.]+)\.[^.]+$/)

  if (match && match[1]) {
    return match[1]
  }

  return null
}

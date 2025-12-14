import type { Metadata } from '../../schemas/metadata.js'
import { ValidationError } from '../../errors/ValidationError.js'

/**
 * Represents a custom sync destination with repository and path
 */
export interface CustomSyncDestination {
  repo: string // Repository identifier (e.g., "developers.fractary.com")
  path: string // Target path within repository (e.g., "src/content/docs/forge/")
}

/**
 * Parse a custom destination string in format "repo:path"
 *
 * @param value - Custom destination string (e.g., "developers.fractary.com:src/content/docs/forge/")
 * @returns Parsed destination object
 * @throws ValidationError if format is invalid
 *
 * @example
 * ```typescript
 * const dest = parseCustomDestination('developers.fractary.com:src/content/docs/forge/')
 * // { repo: 'developers.fractary.com', path: 'src/content/docs/forge/' }
 * ```
 */
export function parseCustomDestination(value: string): CustomSyncDestination {
  if (typeof value !== 'string' || !value) {
    throw new ValidationError('Custom destination must be a non-empty string')
  }

  const colonIndex = value.indexOf(':')

  if (colonIndex === -1) {
    throw new ValidationError(
      `Invalid custom destination format: "${value}". Expected format: "repo:path"`
    )
  }

  const repo = value.substring(0, colonIndex).trim()
  const path = value.substring(colonIndex + 1).trim()

  if (!repo) {
    throw new ValidationError(
      `Invalid custom destination: repository name cannot be empty in "${value}"`
    )
  }

  if (!path) {
    throw new ValidationError(
      `Invalid custom destination: path cannot be empty in "${value}"`
    )
  }

  return { repo, path }
}

/**
 * Extract all custom sync destinations from metadata
 *
 * @param metadata - Parsed frontmatter metadata
 * @returns Array of custom sync destinations
 *
 * @example
 * ```typescript
 * const metadata = {
 *   codex_sync_custom: [
 *     'developers.fractary.com:src/content/docs/forge/',
 *     'docs.example.com:api/'
 *   ]
 * }
 *
 * const destinations = getCustomSyncDestinations(metadata)
 * // [
 * //   { repo: 'developers.fractary.com', path: 'src/content/docs/forge/' },
 * //   { repo: 'docs.example.com', path: 'api/' }
 * // ]
 * ```
 */
export function getCustomSyncDestinations(
  metadata: Metadata
): CustomSyncDestination[] {
  const customDestinations = metadata.codex_sync_custom

  if (!customDestinations || !Array.isArray(customDestinations)) {
    return []
  }

  const results: CustomSyncDestination[] = []

  for (const destination of customDestinations) {
    try {
      const parsed = parseCustomDestination(destination)
      results.push(parsed)
    } catch (_error) {
      // Skip invalid destinations but preserve valid ones
      // Consumers can validate metadata if they want strict validation
      continue
    }
  }

  return results
}

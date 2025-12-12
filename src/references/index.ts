/**
 * References module - Universal reference system for codex
 *
 * Provides parsing, validation, and resolution of codex:// URIs
 * for addressing artifacts across projects and organizations.
 *
 * URI Format: codex://org/project/path/to/file.md
 *
 * @example
 * ```typescript
 * import { parseReference, resolveReference, isValidUri } from '@fractary/codex/references'
 *
 * // Parse a URI
 * const parsed = parseReference('codex://fractary/auth-service/docs/oauth.md')
 * // { uri: '...', org: 'fractary', project: 'auth-service', path: 'docs/oauth.md' }
 *
 * // Resolve to filesystem paths
 * const resolved = resolveReference('codex://fractary/auth-service/docs/oauth.md')
 * // { ...parsed, cachePath: '.fractary/.../docs/oauth.md', isCurrentProject: false }
 *
 * // Validate
 * isValidUri('codex://fractary/auth-service/docs/oauth.md') // true
 * isValidUri('codex://invalid/../path') // false
 * ```
 */

// Parser exports
export {
  parseReference,
  buildUri,
  isValidUri,
  isLegacyReference,
  convertLegacyReference,
  getExtension,
  getFilename,
  getDirectory,
  CODEX_URI_PREFIX,
  LEGACY_REF_PREFIX,
  type ParsedReference,
  type ParseOptions,
} from './parser.js'

// Resolver exports
export {
  resolveReference,
  resolveReferences,
  detectCurrentProject,
  getCurrentContext,
  calculateCachePath,
  isCurrentProjectUri,
  getRelativeCachePath,
  DEFAULT_CACHE_DIR,
  type ResolvedReference,
  type ResolveOptions,
} from './resolver.js'

// Validator exports
export {
  validatePath,
  sanitizePath,
  validateOrg,
  validateProject,
  validateUri,
} from './validator.js'

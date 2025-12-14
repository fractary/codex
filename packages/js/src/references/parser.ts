/**
 * URI parsing for codex references
 *
 * Parses codex:// URIs into their component parts.
 * URI format: codex://org/project/path/to/file.md
 */

import { validateUri, validatePath, sanitizePath } from './validator.js'

/**
 * Parsed reference components
 */
export interface ParsedReference {
  /** Original URI string */
  uri: string
  /** Organization name */
  org: string
  /** Project/repository name */
  project: string
  /** File path within project (may be empty) */
  path: string
}

/**
 * Parse options
 */
export interface ParseOptions {
  /** Whether to sanitize the path (default: true) */
  sanitize?: boolean
  /** Whether to validate strictly (default: true) */
  strict?: boolean
}

/**
 * The codex URI prefix
 */
export const CODEX_URI_PREFIX = 'codex://'

/**
 * Legacy reference prefix (v2 format)
 */
export const LEGACY_REF_PREFIX = '@codex/'

/**
 * Check if a string is a valid codex URI
 *
 * @param uri - The string to check
 * @returns true if it's a valid codex:// URI
 */
export function isValidUri(uri: string): boolean {
  return validateUri(uri)
}

/**
 * Check if a string is a legacy reference format
 *
 * @param ref - The string to check
 * @returns true if it's a legacy @codex/ reference
 */
export function isLegacyReference(ref: string): boolean {
  return ref.startsWith(LEGACY_REF_PREFIX)
}

/**
 * Convert a legacy reference to the new URI format
 *
 * @param ref - Legacy reference (e.g., @codex/project/path)
 * @param defaultOrg - Default organization to use
 * @returns The converted URI or null if invalid
 */
export function convertLegacyReference(ref: string, defaultOrg: string): string | null {
  if (!isLegacyReference(ref)) {
    return null
  }

  // Remove @codex/ prefix
  const pathPart = ref.slice(LEGACY_REF_PREFIX.length)
  const parts = pathPart.split('/')

  if (parts.length < 1 || !parts[0]) {
    return null
  }

  // Legacy format: @codex/project/path -> codex://org/project/path
  const project = parts[0]
  const filePath = parts.slice(1).join('/')

  if (filePath) {
    return `${CODEX_URI_PREFIX}${defaultOrg}/${project}/${filePath}`
  }
  return `${CODEX_URI_PREFIX}${defaultOrg}/${project}`
}

/**
 * Parse a codex URI into its components
 *
 * @param uri - The URI to parse (e.g., codex://org/project/path/to/file.md)
 * @param options - Parse options
 * @returns The parsed reference or null if invalid
 */
export function parseReference(uri: string, options: ParseOptions = {}): ParsedReference | null {
  const { sanitize = true, strict = true } = options

  // Must start with codex://
  if (!uri.startsWith(CODEX_URI_PREFIX)) {
    return null
  }

  // Strict validation
  if (strict && !validateUri(uri)) {
    return null
  }

  // Extract the path after codex://
  const pathPart = uri.slice(CODEX_URI_PREFIX.length)
  const parts = pathPart.split('/')

  // Must have at least org and project
  if (parts.length < 2) {
    return null
  }

  const org = parts[0]
  const project = parts[1]
  let filePath = parts.slice(2).join('/')

  // Validate org and project are not empty
  if (!org || !project) {
    return null
  }

  // Sanitize path if requested
  if (sanitize && filePath) {
    if (!validatePath(filePath)) {
      filePath = sanitizePath(filePath)
    }
  }

  return {
    uri,
    org,
    project,
    path: filePath,
  }
}

/**
 * Build a codex URI from components
 *
 * @param org - Organization name
 * @param project - Project name
 * @param path - Optional file path
 * @returns The constructed URI
 */
export function buildUri(org: string, project: string, path?: string): string {
  const base = `${CODEX_URI_PREFIX}${org}/${project}`
  if (path) {
    // Ensure path doesn't start with /
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    return `${base}/${cleanPath}`
  }
  return base
}

/**
 * Extract the file extension from a URI
 *
 * @param uri - The URI to extract from
 * @returns The extension (without dot) or empty string
 */
export function getExtension(uri: string): string {
  const parsed = parseReference(uri, { strict: false })
  if (!parsed || !parsed.path) {
    return ''
  }

  const lastDot = parsed.path.lastIndexOf('.')
  if (lastDot === -1 || lastDot === parsed.path.length - 1) {
    return ''
  }

  return parsed.path.slice(lastDot + 1).toLowerCase()
}

/**
 * Get the filename from a URI
 *
 * @param uri - The URI to extract from
 * @returns The filename or empty string
 */
export function getFilename(uri: string): string {
  const parsed = parseReference(uri, { strict: false })
  if (!parsed || !parsed.path) {
    return ''
  }

  const lastSlash = parsed.path.lastIndexOf('/')
  if (lastSlash === -1) {
    return parsed.path
  }

  return parsed.path.slice(lastSlash + 1)
}

/**
 * Get the directory path from a URI
 *
 * @param uri - The URI to extract from
 * @returns The directory path or empty string
 */
export function getDirectory(uri: string): string {
  const parsed = parseReference(uri, { strict: false })
  if (!parsed || !parsed.path) {
    return ''
  }

  const lastSlash = parsed.path.lastIndexOf('/')
  if (lastSlash === -1) {
    return ''
  }

  return parsed.path.slice(0, lastSlash)
}

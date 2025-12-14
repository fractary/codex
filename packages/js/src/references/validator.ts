/**
 * Path validation utilities for codex references
 *
 * Provides security validation to prevent directory traversal attacks
 * and other path-based security issues.
 */

import path from 'path'

/**
 * Forbidden path patterns that could indicate security issues
 */
const FORBIDDEN_PATTERNS = [
  /^\//, // Absolute paths
  /\.\./, // Parent directory traversal
  /^~/, // Home directory expansion
  /\0/, // Null bytes
]

/**
 * Forbidden protocol prefixes
 */
const FORBIDDEN_PROTOCOLS = ['file:', 'http:', 'https:', 'ftp:', 'data:', 'javascript:']

/**
 * Validate a path component to ensure it's safe
 *
 * @param filePath - The path to validate
 * @returns true if the path is safe, false otherwise
 */
export function validatePath(filePath: string): boolean {
  // Empty paths are invalid
  if (!filePath || filePath.trim() === '') {
    return false
  }

  // Check for forbidden patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(filePath)) {
      return false
    }
  }

  // Check for protocol prefixes
  const lowerPath = filePath.toLowerCase()
  for (const protocol of FORBIDDEN_PROTOCOLS) {
    if (lowerPath.startsWith(protocol)) {
      return false
    }
  }

  // Normalize and check for traversal after normalization
  const normalized = path.normalize(filePath)
  if (normalized.startsWith('..') || normalized.includes('/../') || normalized.includes('\\..\\')) {
    return false
  }

  return true
}

/**
 * Sanitize a path by removing dangerous components
 *
 * @param filePath - The path to sanitize
 * @returns The sanitized path
 */
export function sanitizePath(filePath: string): string {
  if (!filePath) {
    return ''
  }

  // Remove protocol prefixes
  let sanitized = filePath
  for (const protocol of FORBIDDEN_PROTOCOLS) {
    if (sanitized.toLowerCase().startsWith(protocol)) {
      sanitized = sanitized.slice(protocol.length)
    }
  }

  // Remove leading slashes (absolute paths)
  sanitized = sanitized.replace(/^\/+/, '')

  // Remove home directory expansion
  sanitized = sanitized.replace(/^~\//, '')

  // Normalize the path
  sanitized = path.normalize(sanitized)

  // Remove any remaining parent directory references
  sanitized = sanitized.replace(/\.\.\//g, '').replace(/\.\./g, '')

  // Remove leading ./ if present
  sanitized = sanitized.replace(/^\.\//, '')

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  return sanitized
}

/**
 * Validate an organization name
 *
 * @param org - The organization name to validate
 * @returns true if valid, false otherwise
 */
export function validateOrg(org: string): boolean {
  if (!org || org.trim() === '') {
    return false
  }

  // Org names should be alphanumeric with hyphens/underscores
  // GitHub org names: 1-39 chars, alphanumeric or hyphen, cannot start/end with hyphen
  const orgPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/
  return orgPattern.test(org) && org.length <= 39
}

/**
 * Validate a project name
 *
 * @param project - The project name to validate
 * @returns true if valid, false otherwise
 */
export function validateProject(project: string): boolean {
  if (!project || project.trim() === '') {
    return false
  }

  // Project names should be alphanumeric with hyphens/underscores/dots
  // GitHub repo names: 1-100 chars, alphanumeric, hyphen, underscore, or period
  const projectPattern = /^[a-zA-Z0-9._-]+$/
  return projectPattern.test(project) && project.length <= 100 && !project.includes('..')
}

/**
 * Validate a complete URI
 *
 * @param uri - The URI to validate
 * @returns true if the URI format is valid
 */
export function validateUri(uri: string): boolean {
  if (!uri || !uri.startsWith('codex://')) {
    return false
  }

  const pathPart = uri.slice('codex://'.length)
  const parts = pathPart.split('/')

  // Must have at least org/project
  if (parts.length < 2) {
    return false
  }

  const [org, project, ...rest] = parts

  if (!org || !validateOrg(org)) {
    return false
  }

  if (!project || !validateProject(project)) {
    return false
  }

  // If there's a path, validate it
  if (rest.length > 0) {
    const filePath = rest.join('/')
    if (!validatePath(filePath)) {
      return false
    }
  }

  return true
}

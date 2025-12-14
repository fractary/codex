import yaml from 'js-yaml'
import { MetadataSchema, type Metadata } from '../../schemas/metadata.js'
import { ValidationError } from '../../errors/index.js'

export interface ParseMetadataOptions {
  strict?: boolean // Throw on validation errors (default: true)
  normalize?: boolean // Normalize line endings (default: true)
}

export interface ParseResult {
  metadata: Metadata
  content: string // Document content without frontmatter
  raw: string // Raw frontmatter block
}

/**
 * Extracts and parses YAML frontmatter from markdown content
 *
 * Based on SPEC-00002: Metadata Parsing
 *
 * @param content - Markdown file content
 * @param options - Parsing options
 * @returns Parsed metadata and content
 * @throws ValidationError if frontmatter is malformed (in strict mode)
 */
export function parseMetadata(
  content: string,
  options: ParseMetadataOptions = {}
): ParseResult {
  const { strict = true, normalize = true } = options

  // Normalize line endings (CRLF → LF)
  const normalizedContent = normalize
    ? content.replace(/\r\n/g, '\n')
    : content

  // Extract frontmatter block
  const frontmatterMatch = normalizedContent.match(
    /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  )

  if (!frontmatterMatch) {
    // No frontmatter found
    return {
      metadata: {},
      content: normalizedContent,
      raw: '',
    }
  }

  const rawFrontmatter = frontmatterMatch[1]!
  const documentContent = frontmatterMatch[2]!

  try {
    // Parse YAML
    const parsed = yaml.load(rawFrontmatter) as Record<string, unknown>

    // Normalize legacy formats
    const normalized = normalizeLegacyMetadata(parsed)

    // Validate against schema
    const metadata = strict
      ? MetadataSchema.parse(normalized)
      : MetadataSchema.safeParse(normalized).data || {}

    return {
      metadata,
      content: documentContent,
      raw: rawFrontmatter,
    }
  } catch (error) {
    if (strict) {
      throw new ValidationError(
        `Invalid frontmatter: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      )
    }

    // Non-strict mode: return empty metadata
    return {
      metadata: {},
      content: documentContent,
      raw: rawFrontmatter,
    }
  }
}

/**
 * Normalize legacy frontmatter formats to standard format
 *
 * Handles:
 * - Nested codex.includes → codex_sync_include
 * - Nested codex.excludes → codex_sync_exclude
 */
function normalizeLegacyMetadata(parsed: any): any {
  const normalized: any = { ...parsed }

  // Handle nested codex.includes → codex_sync_include
  if (parsed.codex?.includes && !parsed.codex_sync_include) {
    normalized.codex_sync_include = parsed.codex.includes
  }

  // Handle nested codex.excludes → codex_sync_exclude
  if (parsed.codex?.excludes && !parsed.codex_sync_exclude) {
    normalized.codex_sync_exclude = parsed.codex.excludes
  }

  return normalized
}

/**
 * Check if content has frontmatter
 */
export function hasFrontmatter(content: string): boolean {
  const normalized = content.replace(/\r\n/g, '\n')
  return /^---\n[\s\S]*?\n---\n/.test(normalized)
}

/**
 * Validate metadata without parsing content
 */
export function validateMetadata(
  metadata: unknown
): { valid: boolean; errors?: string[] } {
  const result = MetadataSchema.safeParse(metadata)

  if (result.success) {
    return { valid: true }
  }

  return {
    valid: false,
    errors: result.error.issues.map(issue => issue.message),
  }
}

/**
 * Extract only frontmatter (no validation)
 */
export function extractRawFrontmatter(content: string): string | null {
  const normalized = content.replace(/\r\n/g, '\n')
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n/)
  return match && match[1] ? match[1] : null
}

/**
 * Legacy reference migration
 *
 * Converts legacy reference formats to modern codex:// URIs.
 */

/**
 * Legacy reference patterns
 */
export const LEGACY_PATTERNS = {
  /** @codex: style references */
  CODEX_TAG: /@codex:\s*([^\s\]]+)/g,
  /** [codex:...] style references */
  CODEX_BRACKET: /\[codex:\s*([^\]]+)\]/g,
  /** {{codex:...}} style references */
  CODEX_MUSTACHE: /\{\{codex:\s*([^}]+)\}\}/g,
  /** Simple path references in specific contexts */
  SIMPLE_PATH: /codex\/([a-zA-Z0-9_-]+\/[a-zA-Z0-9_\-/.]+)/g,
}

/**
 * Reference conversion result
 */
export interface ReferenceConversionResult {
  /** Original text */
  original: string
  /** Converted text */
  converted: string
  /** References found and converted */
  references: ConvertedReference[]
  /** Whether any changes were made */
  modified: boolean
}

/**
 * Converted reference
 */
export interface ConvertedReference {
  /** Original reference text */
  original: string
  /** Converted URI */
  uri: string
  /** Position in original text */
  position: number
  /** Format detected */
  format: 'codex-tag' | 'codex-bracket' | 'codex-mustache' | 'simple-path'
}

/**
 * Conversion options
 */
export interface ConversionOptions {
  /** Default organization */
  defaultOrg?: string
  /** Default project */
  defaultProject?: string
  /** Whether to preserve original format wrapper */
  preserveWrapper?: boolean
}

/**
 * Convert legacy references in text
 */
export function convertLegacyReferences(
  text: string,
  options: ConversionOptions = {}
): ReferenceConversionResult {
  const result: ReferenceConversionResult = {
    original: text,
    converted: text,
    references: [],
    modified: false,
  }

  // Process each pattern type
  result.converted = processPattern(
    result.converted,
    LEGACY_PATTERNS.CODEX_TAG,
    'codex-tag',
    options,
    result.references
  )

  result.converted = processPattern(
    result.converted,
    LEGACY_PATTERNS.CODEX_BRACKET,
    'codex-bracket',
    options,
    result.references
  )

  result.converted = processPattern(
    result.converted,
    LEGACY_PATTERNS.CODEX_MUSTACHE,
    'codex-mustache',
    options,
    result.references
  )

  result.converted = processPattern(
    result.converted,
    LEGACY_PATTERNS.SIMPLE_PATH,
    'simple-path',
    options,
    result.references
  )

  result.modified = result.original !== result.converted

  return result
}

/**
 * Process a single pattern type
 */
function processPattern(
  text: string,
  pattern: RegExp,
  format: ConvertedReference['format'],
  options: ConversionOptions,
  references: ConvertedReference[]
): string {
  // Reset pattern lastIndex
  pattern.lastIndex = 0

  return text.replace(pattern, (match, captured: string, offset: number) => {
    const uri = convertToUri(captured.trim(), options)

    references.push({
      original: match,
      uri,
      position: offset,
      format,
    })

    // Return the appropriate format
    if (options.preserveWrapper) {
      switch (format) {
        case 'codex-tag':
          return `@codex: ${uri}`
        case 'codex-bracket':
          return `[${uri}]`
        case 'codex-mustache':
          return `{{${uri}}}`
        case 'simple-path':
          return uri
      }
    }

    return uri
  })
}

/**
 * Convert a path/reference to codex:// URI
 */
export function convertToUri(reference: string, options: ConversionOptions = {}): string {
  const trimmed = reference.trim()

  // Already a codex:// URI
  if (trimmed.startsWith('codex://')) {
    return trimmed
  }

  // Parse the reference to extract components
  const parts = parseReference(trimmed)

  // Build URI
  const org = parts.org || options.defaultOrg || '_'
  const project = parts.project || options.defaultProject || '_'
  const path = parts.path

  return `codex://${org}/${project}/${path}`
}

/**
 * Parse reference components
 */
interface ParsedReferenceComponents {
  org?: string
  project?: string
  path: string
}

function parseReference(reference: string): ParsedReferenceComponents {
  // Handle various formats:
  // - org/project/path
  // - project/path (org inferred)
  // - path (org and project inferred)
  // - ./path (relative)
  // - ../path (relative)

  const trimmed = reference.trim()

  // Handle relative paths
  if (trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return { path: trimmed }
  }

  // Split by /
  const parts = trimmed.split('/')

  if (parts.length >= 3) {
    // Assume org/project/path format
    const [org, project, ...rest] = parts
    return {
      org: org || undefined,
      project: project || undefined,
      path: rest.join('/'),
    }
  }

  if (parts.length === 2) {
    // For legacy reference migration, treat 2-part paths as file paths
    // Common directory names like docs, src, specs should not be inferred as projects
    // Only explicit org/project/path format (3+ parts) will extract org/project

    return { path: trimmed }
  }

  // Single part - just the path
  return { path: trimmed }
}

/**
 * Find all legacy references in text (without converting)
 */
export function findLegacyReferences(text: string): ConvertedReference[] {
  const references: ConvertedReference[] = []

  for (const [name, pattern] of Object.entries(LEGACY_PATTERNS)) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = pattern.exec(text)) !== null) {
      const format = name
        .toLowerCase()
        .replace('_', '-') as ConvertedReference['format']

      references.push({
        original: match[0],
        uri: match[1] || '',
        position: match.index,
        format,
      })
    }
  }

  // Sort by position
  references.sort((a, b) => a.position - b.position)

  return references
}

/**
 * Check if text contains legacy references
 */
export function hasLegacyReferences(text: string): boolean {
  for (const pattern of Object.values(LEGACY_PATTERNS)) {
    pattern.lastIndex = 0
    if (pattern.test(text)) {
      return true
    }
  }
  return false
}

/**
 * Migrate all references in a file content
 */
export function migrateFileReferences(
  content: string,
  options: ConversionOptions = {}
): ReferenceConversionResult {
  return convertLegacyReferences(content, options)
}

/**
 * Generate reference migration summary
 */
export function generateReferenceMigrationSummary(
  results: ReferenceConversionResult[]
): string {
  const lines: string[] = ['# Reference Migration Summary', '']

  let totalRefs = 0
  let modifiedFiles = 0

  for (const result of results) {
    if (result.modified) {
      modifiedFiles++
    }
    totalRefs += result.references.length
  }

  lines.push(`- Total files processed: ${results.length}`)
  lines.push(`- Files with changes: ${modifiedFiles}`)
  lines.push(`- Total references converted: ${totalRefs}`)
  lines.push('')

  // Group by format
  const byFormat = new Map<string, number>()

  for (const result of results) {
    for (const ref of result.references) {
      byFormat.set(ref.format, (byFormat.get(ref.format) || 0) + 1)
    }
  }

  if (byFormat.size > 0) {
    lines.push('## References by Format', '')

    for (const [format, count] of byFormat.entries()) {
      lines.push(`- ${format}: ${count}`)
    }
  }

  return lines.join('\n')
}

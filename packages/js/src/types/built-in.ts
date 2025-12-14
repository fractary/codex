/**
 * Built-in artifact types for the Codex SDK
 *
 * These types define common artifact categories with default TTLs,
 * archival policies, and pattern matching rules.
 */

/**
 * Artifact type definition
 */
export interface ArtifactType {
  /** Unique type name */
  name: string
  /** Human-readable description */
  description: string
  /** Glob patterns to match files of this type */
  patterns: string[]
  /** Default TTL in seconds for cached content */
  defaultTtl: number
  /** Days after which to archive (null = never) */
  archiveAfterDays: number | null
  /** Where to archive (null = don't archive) */
  archiveStorage: 'local' | 'cloud' | 'drive' | null
  /** Patterns for sync operations (optional override) */
  syncPatterns?: string[]
  /** Patterns to exclude from sync */
  excludePatterns?: string[]
  /** Default permissions (optional) */
  permissions?: {
    include: string[]
    exclude: string[]
  }
}

/**
 * TTL constants in seconds
 */
export const TTL = {
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
  ONE_WEEK: 604800,
  TWO_WEEKS: 1209600,
  ONE_MONTH: 2592000,
  ONE_YEAR: 31536000,
} as const

/**
 * Built-in artifact types
 *
 * These cover common use cases and serve as defaults.
 * Users can override or extend these via configuration.
 */
export const BUILT_IN_TYPES: Record<string, ArtifactType> = {
  docs: {
    name: 'docs',
    description: 'Documentation files',
    patterns: ['docs/**', 'README.md', 'CLAUDE.md', '*.md'],
    defaultTtl: TTL.ONE_WEEK,
    archiveAfterDays: 365,
    archiveStorage: 'cloud',
  },

  specs: {
    name: 'specs',
    description: 'Technical specifications',
    patterns: ['specs/**', 'SPEC-*.md', '**/specs/**'],
    defaultTtl: TTL.TWO_WEEKS,
    archiveAfterDays: null, // Never auto-archive specs
    archiveStorage: null,
  },

  logs: {
    name: 'logs',
    description: 'Session and workflow logs',
    patterns: ['.fractary/**/logs/**', 'logs/**', '*.log'],
    defaultTtl: TTL.ONE_DAY,
    archiveAfterDays: 30,
    archiveStorage: 'cloud',
  },

  standards: {
    name: 'standards',
    description: 'Organization standards and guides',
    patterns: ['standards/**', 'guides/**', '.fractary/standards/**'],
    defaultTtl: TTL.ONE_MONTH,
    archiveAfterDays: null, // Never auto-archive standards
    archiveStorage: null,
  },

  templates: {
    name: 'templates',
    description: 'Reusable templates',
    patterns: ['templates/**', '.templates/**', '.fractary/templates/**'],
    defaultTtl: TTL.TWO_WEEKS,
    archiveAfterDays: 180,
    archiveStorage: 'cloud',
  },

  state: {
    name: 'state',
    description: 'Workflow state files',
    patterns: ['.fractary/**/state.json', '.fractary/**/state/**', '**/state.json'],
    defaultTtl: TTL.ONE_HOUR,
    archiveAfterDays: 7,
    archiveStorage: 'local',
  },

  config: {
    name: 'config',
    description: 'Configuration files',
    patterns: [
      '.fractary/**/*.json',
      '*.config.js',
      '*.config.ts',
      'tsconfig.json',
      'package.json',
    ],
    defaultTtl: TTL.ONE_DAY,
    archiveAfterDays: null,
    archiveStorage: null,
  },

  systems: {
    name: 'systems',
    description: 'System definitions',
    patterns: ['.fractary/systems/**', 'systems/**'],
    defaultTtl: TTL.TWO_WEEKS,
    archiveAfterDays: null,
    archiveStorage: null,
  },
}

/**
 * Default type to use when no pattern matches
 */
export const DEFAULT_TYPE: ArtifactType = {
  name: 'default',
  description: 'Default type for unmatched files',
  patterns: ['**/*'],
  defaultTtl: TTL.ONE_WEEK,
  archiveAfterDays: 90,
  archiveStorage: 'cloud',
}

/**
 * Get a built-in type by name
 *
 * @param name - Type name
 * @returns The type or undefined
 */
export function getBuiltInType(name: string): ArtifactType | undefined {
  return BUILT_IN_TYPES[name]
}

/**
 * Get all built-in type names
 *
 * @returns Array of type names
 */
export function getBuiltInTypeNames(): string[] {
  return Object.keys(BUILT_IN_TYPES)
}

/**
 * Check if a name is a built-in type
 *
 * @param name - Type name to check
 * @returns true if it's a built-in type
 */
export function isBuiltInType(name: string): boolean {
  return name in BUILT_IN_TYPES
}

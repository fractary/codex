/**
 * Migration types
 *
 * Type definitions for configuration migration.
 */

/**
 * Legacy v2.x codex configuration format
 */
export interface LegacyCodexConfig {
  /** Organization name */
  org?: string
  /** Default org */
  defaultOrg?: string
  /** Codex repository name */
  codexRepo?: string
  /** Codex repository path */
  codexPath?: string
  /** Auto-sync patterns */
  autoSync?: LegacyAutoSyncPattern[]
  /** Sync rules */
  syncRules?: {
    include?: string[]
    exclude?: string[]
  }
  /** Environment overrides */
  environments?: Record<string, Partial<LegacyCodexConfig>>
}

/**
 * Legacy auto-sync pattern
 */
export interface LegacyAutoSyncPattern {
  /** Source pattern */
  pattern: string
  /** Destination path */
  destination?: string
  /** Target repos */
  targets?: string[]
  /** Whether to sync bidirectionally */
  bidirectional?: boolean
}

/**
 * Modern v3.x codex configuration format
 */
export interface ModernCodexConfig {
  /** Schema version */
  version: '3.0'
  /** Organization configuration */
  organization: {
    /** Default org name */
    name: string
    /** Codex repository */
    codexRepo: string
  }
  /** Sync configuration */
  sync: {
    /** Auto-sync patterns */
    patterns: ModernSyncPattern[]
    /** Global include patterns */
    include: string[]
    /** Global exclude patterns */
    exclude: string[]
    /** Default sync direction */
    defaultDirection: 'to-codex' | 'from-codex' | 'bidirectional'
  }
  /** Cache configuration */
  cache?: {
    /** Cache directory */
    directory?: string
    /** Default TTL in seconds */
    defaultTtl?: number
    /** Max cache size in bytes */
    maxSize?: number
  }
  /** Environment overrides */
  environments?: Record<string, Partial<Omit<ModernCodexConfig, 'version'>>>
}

/**
 * Modern sync pattern
 */
export interface ModernSyncPattern {
  /** Glob pattern */
  pattern: string
  /** Target path or project */
  target?: string
  /** Direction */
  direction?: 'to-codex' | 'from-codex' | 'bidirectional'
  /** Priority */
  priority?: number
}

/**
 * Migration result
 */
export interface MigrationResult {
  /** Whether migration succeeded */
  success: boolean
  /** Migrated configuration */
  config?: ModernCodexConfig
  /** Migration warnings */
  warnings: string[]
  /** Migration errors */
  errors: string[]
  /** Changes made during migration */
  changes: MigrationChange[]
}

/**
 * Migration change
 */
export interface MigrationChange {
  /** Type of change */
  type: 'renamed' | 'converted' | 'removed' | 'added' | 'transformed'
  /** Path to the changed field */
  path: string
  /** Old value (if applicable) */
  oldValue?: unknown
  /** New value (if applicable) */
  newValue?: unknown
  /** Description of the change */
  description: string
}

/**
 * Migration options
 */
export interface MigrationOptions {
  /** Whether to preserve unknown fields */
  preserveUnknown?: boolean
  /** Whether to apply strict validation */
  strict?: boolean
  /** Default org to use if not specified */
  defaultOrg?: string
  /** Default codex repo to use if not specified */
  defaultCodexRepo?: string
}

/**
 * Config version detection result
 */
export interface VersionDetectionResult {
  /** Detected version */
  version: '2.x' | '3.0' | 'unknown'
  /** Confidence level */
  confidence: 'high' | 'medium' | 'low'
  /** Reason for detection */
  reason: string
}

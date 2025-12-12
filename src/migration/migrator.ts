/**
 * Configuration migrator
 *
 * Migrates v2.x configurations to v3.0 format.
 */

import type {
  LegacyCodexConfig,
  LegacyAutoSyncPattern,
  ModernCodexConfig,
  ModernSyncPattern,
  MigrationResult,
  MigrationOptions,
} from './types.js'
import { detectVersion, isLegacyConfig, isModernConfig } from './detector.js'

/**
 * Default migration options
 */
export const DEFAULT_MIGRATION_OPTIONS: MigrationOptions = {
  preserveUnknown: false,
  strict: false,
  defaultOrg: 'organization',
  defaultCodexRepo: 'codex',
}

/**
 * Migrate configuration from v2.x to v3.0
 */
export function migrateConfig(
  config: unknown,
  options: MigrationOptions = {}
): MigrationResult {
  const mergedOptions = { ...DEFAULT_MIGRATION_OPTIONS, ...options }
  const result: MigrationResult = {
    success: false,
    warnings: [],
    errors: [],
    changes: [],
  }

  // Detect version
  const detection = detectVersion(config)

  if (detection.version === '3.0') {
    if (isModernConfig(config)) {
      result.success = true
      result.config = config
      result.warnings.push('Configuration is already v3.0, no migration needed')
      return result
    }
  }

  if (detection.version === 'unknown') {
    result.errors.push(`Cannot migrate: ${detection.reason}`)
    return result
  }

  if (!isLegacyConfig(config)) {
    result.errors.push('Configuration does not match expected v2.x format')
    return result
  }

  try {
    const migrated = performMigration(config, mergedOptions, result)
    result.config = migrated
    result.success = true
  } catch (error) {
    result.errors.push(
      `Migration failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  return result
}

/**
 * Perform the actual migration
 */
function performMigration(
  legacy: LegacyCodexConfig,
  options: MigrationOptions,
  result: MigrationResult
): ModernCodexConfig {
  // Extract org name
  const orgName = legacy.org || legacy.defaultOrg || options.defaultOrg!

  if (legacy.org && legacy.defaultOrg && legacy.org !== legacy.defaultOrg) {
    result.warnings.push(
      `Both 'org' and 'defaultOrg' specified with different values. Using 'org': ${legacy.org}`
    )
  }

  if (!legacy.org && !legacy.defaultOrg) {
    result.changes.push({
      type: 'added',
      path: 'organization.name',
      newValue: orgName,
      description: `Added default organization name: ${orgName}`,
    })
  } else {
    const fieldUsed = legacy.org ? 'org' : 'defaultOrg'
    result.changes.push({
      type: 'renamed',
      path: 'organization.name',
      oldValue: fieldUsed,
      newValue: 'organization.name',
      description: `Renamed '${fieldUsed}' to 'organization.name'`,
    })
  }

  // Extract codex repo
  const codexRepo = legacy.codexRepo || legacy.codexPath || options.defaultCodexRepo!

  if (legacy.codexRepo && legacy.codexPath && legacy.codexRepo !== legacy.codexPath) {
    result.warnings.push(
      `Both 'codexRepo' and 'codexPath' specified with different values. Using 'codexRepo': ${legacy.codexRepo}`
    )
  }

  if (!legacy.codexRepo && !legacy.codexPath) {
    result.changes.push({
      type: 'added',
      path: 'organization.codexRepo',
      newValue: codexRepo,
      description: `Added default codex repository: ${codexRepo}`,
    })
  } else {
    const fieldUsed = legacy.codexRepo ? 'codexRepo' : 'codexPath'
    result.changes.push({
      type: 'renamed',
      path: 'organization.codexRepo',
      oldValue: fieldUsed,
      newValue: 'organization.codexRepo',
      description: `Renamed '${fieldUsed}' to 'organization.codexRepo'`,
    })
  }

  // Migrate auto-sync patterns
  const patterns: ModernSyncPattern[] = []

  if (legacy.autoSync && legacy.autoSync.length > 0) {
    for (const legacyPattern of legacy.autoSync) {
      const modernPattern = migrateSyncPattern(legacyPattern, result)
      patterns.push(modernPattern)
    }

    result.changes.push({
      type: 'transformed',
      path: 'sync.patterns',
      oldValue: 'autoSync',
      newValue: 'sync.patterns',
      description: `Converted ${legacy.autoSync.length} auto-sync pattern(s) to modern format`,
    })
  }

  // Migrate sync rules
  const include: string[] = []
  const exclude: string[] = []

  if (legacy.syncRules) {
    if (legacy.syncRules.include) {
      include.push(...legacy.syncRules.include)
      result.changes.push({
        type: 'renamed',
        path: 'sync.include',
        oldValue: 'syncRules.include',
        newValue: 'sync.include',
        description: 'Moved syncRules.include to sync.include',
      })
    }

    if (legacy.syncRules.exclude) {
      exclude.push(...legacy.syncRules.exclude)
      result.changes.push({
        type: 'renamed',
        path: 'sync.exclude',
        oldValue: 'syncRules.exclude',
        newValue: 'sync.exclude',
        description: 'Moved syncRules.exclude to sync.exclude',
      })
    }
  }

  // Build modern config
  const modern: ModernCodexConfig = {
    version: '3.0',
    organization: {
      name: orgName,
      codexRepo,
    },
    sync: {
      patterns,
      include,
      exclude,
      defaultDirection: 'to-codex',
    },
  }

  // Migrate environments
  if (legacy.environments) {
    modern.environments = {}

    for (const [envName, envConfig] of Object.entries(legacy.environments)) {
      const envResult: MigrationResult = {
        success: false,
        warnings: [],
        errors: [],
        changes: [],
      }

      try {
        const migratedEnv = performMigration(
          { ...legacy, ...envConfig } as LegacyCodexConfig,
          { ...options },
          envResult
        )

        // Extract only the overrides
        modern.environments[envName] = {
          organization: migratedEnv.organization,
          sync: migratedEnv.sync,
        }

        result.changes.push({
          type: 'transformed',
          path: `environments.${envName}`,
          description: `Migrated environment '${envName}'`,
        })

        result.warnings.push(...envResult.warnings.map((w) => `[${envName}] ${w}`))
      } catch {
        result.warnings.push(`Failed to migrate environment '${envName}', skipping`)
      }
    }
  }

  result.changes.push({
    type: 'added',
    path: 'version',
    newValue: '3.0',
    description: 'Added version field',
  })

  return modern
}

/**
 * Migrate a single sync pattern
 */
function migrateSyncPattern(
  legacy: LegacyAutoSyncPattern,
  result: MigrationResult
): ModernSyncPattern {
  const modern: ModernSyncPattern = {
    pattern: legacy.pattern,
  }

  if (legacy.destination) {
    modern.target = legacy.destination
  }

  if (legacy.bidirectional) {
    modern.direction = 'bidirectional'
  }

  if (legacy.targets && legacy.targets.length > 0) {
    result.warnings.push(
      `Pattern '${legacy.pattern}' had multiple targets (${legacy.targets.join(', ')}). ` +
        'In v3.0, each target should be a separate pattern.'
    )

    // Use first target
    if (!modern.target && legacy.targets[0]) {
      modern.target = legacy.targets[0]
    }
  }

  return modern
}

/**
 * Validate migrated configuration
 */
export function validateMigratedConfig(config: ModernCodexConfig): string[] {
  const errors: string[] = []

  if (config.version !== '3.0') {
    errors.push(`Invalid version: ${config.version}, expected '3.0'`)
  }

  if (!config.organization) {
    errors.push('Missing organization configuration')
  } else {
    if (!config.organization.name) {
      errors.push('Missing organization.name')
    }
    if (!config.organization.codexRepo) {
      errors.push('Missing organization.codexRepo')
    }
  }

  if (!config.sync) {
    errors.push('Missing sync configuration')
  } else {
    if (!Array.isArray(config.sync.patterns)) {
      errors.push('sync.patterns must be an array')
    }
    if (!Array.isArray(config.sync.include)) {
      errors.push('sync.include must be an array')
    }
    if (!Array.isArray(config.sync.exclude)) {
      errors.push('sync.exclude must be an array')
    }
  }

  return errors
}

/**
 * Generate migration report
 */
export function generateMigrationReport(result: MigrationResult): string {
  const lines: string[] = ['# Migration Report', '']

  if (result.success) {
    lines.push('Status: SUCCESS')
  } else {
    lines.push('Status: FAILED')
  }

  lines.push('')

  if (result.changes.length > 0) {
    lines.push('## Changes', '')

    for (const change of result.changes) {
      lines.push(`- [${change.type.toUpperCase()}] ${change.path}: ${change.description}`)
    }

    lines.push('')
  }

  if (result.warnings.length > 0) {
    lines.push('## Warnings', '')

    for (const warning of result.warnings) {
      lines.push(`- ${warning}`)
    }

    lines.push('')
  }

  if (result.errors.length > 0) {
    lines.push('## Errors', '')

    for (const error of result.errors) {
      lines.push(`- ${error}`)
    }

    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Create empty modern config
 */
export function createEmptyModernConfig(
  org: string,
  codexRepo: string
): ModernCodexConfig {
  return {
    version: '3.0',
    organization: {
      name: org,
      codexRepo,
    },
    sync: {
      patterns: [],
      include: ['**/*.md', 'CLAUDE.md'],
      exclude: ['**/node_modules/**', '**/.git/**'],
      defaultDirection: 'to-codex',
    },
  }
}

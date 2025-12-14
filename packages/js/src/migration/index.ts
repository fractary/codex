/**
 * Migration module
 *
 * Provides tools for migrating from v2.x to v3.0 configuration format.
 */

// Types
export type {
  LegacyCodexConfig,
  LegacyAutoSyncPattern,
  ModernCodexConfig,
  ModernSyncPattern,
  MigrationResult,
  MigrationChange,
  MigrationOptions,
  VersionDetectionResult,
} from './types.js'

// Detector
export {
  detectVersion,
  isModernConfig,
  isLegacyConfig,
  needsMigration,
  getMigrationRequirements,
} from './detector.js'

// Migrator
export {
  DEFAULT_MIGRATION_OPTIONS,
  migrateConfig,
  validateMigratedConfig,
  generateMigrationReport,
  createEmptyModernConfig,
} from './migrator.js'

// References
export type {
  ReferenceConversionResult,
  ConvertedReference,
  ConversionOptions,
} from './references.js'

export {
  LEGACY_PATTERNS,
  convertLegacyReferences,
  convertToUri,
  findLegacyReferences,
  hasLegacyReferences,
  migrateFileReferences,
  generateReferenceMigrationSummary,
} from './references.js'

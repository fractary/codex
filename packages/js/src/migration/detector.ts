/**
 * Version detection
 *
 * Detects configuration version for migration.
 */

import type {
  LegacyCodexConfig,
  ModernCodexConfig,
  VersionDetectionResult,
} from './types.js'

/**
 * Detect configuration version
 */
export function detectVersion(config: unknown): VersionDetectionResult {
  if (!config || typeof config !== 'object') {
    return {
      version: 'unknown',
      confidence: 'high',
      reason: 'Invalid configuration object',
    }
  }

  const obj = config as Record<string, unknown>

  // Check for explicit version field (v3.0)
  if (obj.version === '3.0') {
    return {
      version: '3.0',
      confidence: 'high',
      reason: 'Explicit version field found',
    }
  }

  // Check for v3.0 structure markers
  if (isModernConfig(config)) {
    return {
      version: '3.0',
      confidence: 'medium',
      reason: 'Modern structure detected (organization object, sync.patterns)',
    }
  }

  // Check for v2.x markers
  if (isLegacyConfig(config)) {
    return {
      version: '2.x',
      confidence: 'high',
      reason: 'Legacy structure detected (org/defaultOrg/codexRepo at top level)',
    }
  }

  // Ambiguous - check for any recognizable fields
  const knownFields = [
    'org',
    'defaultOrg',
    'codexRepo',
    'autoSync',
    'syncRules',
    'organization',
    'sync',
    'cache',
  ]

  const hasKnownFields = knownFields.some((field) => field in obj)

  if (hasKnownFields) {
    return {
      version: '2.x',
      confidence: 'low',
      reason: 'Some known fields found, assuming v2.x',
    }
  }

  return {
    version: 'unknown',
    confidence: 'high',
    reason: 'No recognizable configuration structure',
  }
}

/**
 * Check if config matches modern v3.0 structure
 */
export function isModernConfig(config: unknown): config is ModernCodexConfig {
  if (!config || typeof config !== 'object') {
    return false
  }

  const obj = config as Record<string, unknown>

  // Must have organization object with name and codexRepo
  if (!obj.organization || typeof obj.organization !== 'object') {
    return false
  }

  const org = obj.organization as Record<string, unknown>
  if (typeof org.name !== 'string' || typeof org.codexRepo !== 'string') {
    return false
  }

  // Must have sync object with patterns array
  if (!obj.sync || typeof obj.sync !== 'object') {
    return false
  }

  const sync = obj.sync as Record<string, unknown>
  if (!Array.isArray(sync.patterns)) {
    return false
  }

  return true
}

/**
 * Check if config matches legacy v2.x structure
 */
export function isLegacyConfig(config: unknown): config is LegacyCodexConfig {
  if (!config || typeof config !== 'object') {
    return false
  }

  const obj = config as Record<string, unknown>

  // Look for v2.x markers
  const legacyMarkers = ['org', 'defaultOrg', 'codexRepo', 'codexPath']
  const hasLegacyMarker = legacyMarkers.some(
    (marker) => marker in obj && typeof obj[marker] === 'string'
  )

  if (hasLegacyMarker) {
    return true
  }

  // Check for legacy autoSync array
  if (Array.isArray(obj.autoSync)) {
    return true
  }

  // Check for legacy syncRules object
  if (obj.syncRules && typeof obj.syncRules === 'object') {
    const syncRules = obj.syncRules as Record<string, unknown>
    if (Array.isArray(syncRules.include) || Array.isArray(syncRules.exclude)) {
      return true
    }
  }

  return false
}

/**
 * Check if migration is needed
 */
export function needsMigration(config: unknown): boolean {
  const detection = detectVersion(config)
  return detection.version === '2.x'
}

/**
 * Get migration requirements
 */
export function getMigrationRequirements(config: unknown): string[] {
  const requirements: string[] = []

  if (!config || typeof config !== 'object') {
    requirements.push('Valid configuration object required')
    return requirements
  }

  const obj = config as Record<string, unknown>

  // Check org
  if (!obj.org && !obj.defaultOrg) {
    requirements.push('Organization name is required (org or defaultOrg)')
  }

  // Check codex repo
  if (!obj.codexRepo && !obj.codexPath) {
    requirements.push('Codex repository name is required (codexRepo or codexPath)')
  }

  return requirements
}

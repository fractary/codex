/**
 * Sync configuration presets
 *
 * Centralized source of truth for sync pattern presets used across:
 * - SDK (programmatic configuration)
 * - CLI (config init command)
 * - MCP Plugin (configurator agent)
 *
 * IMPORTANT: When updating presets here, also update the corresponding
 * JSON file at plugins/codex/config/sync-presets.json to keep them in sync.
 */

import { ValidationError } from '../../errors/index.js'

/**
 * Configuration schema version
 */
export const CONFIG_SCHEMA_VERSION = '2.0' as const

/**
 * Directional sync configuration (mutable version for generated configs)
 */
export interface SyncPresetConfig {
  to_codex: {
    include: string[]
    exclude?: string[]
  }
  from_codex: {
    include: string[]
    exclude?: string[]
  }
}

/**
 * Sync preset definition (readonly for preset definitions)
 */
export interface SyncPreset {
  /** Preset identifier */
  readonly name: string
  /** Human-readable description */
  readonly description: string
  /** Sync configuration */
  readonly config: {
    readonly to_codex: {
      readonly include: readonly string[]
      readonly exclude?: readonly string[]
    }
    readonly from_codex: {
      readonly include: readonly string[]
      readonly exclude?: readonly string[]
    }
  }
}

/**
 * Sync pattern presets
 *
 * Available presets for common sync configurations.
 * The `from_codex` patterns use `{org}` and `{codex_repo}` placeholders
 * that must be substituted with actual values when generating config.
 */
export const SYNC_PATTERN_PRESETS: Record<string, SyncPreset> = {
  standard: {
    name: 'standard',
    description: 'Standard configuration with docs, README, and CLAUDE.md',
    config: {
      to_codex: {
        include: ['docs/**', 'README.md', 'CLAUDE.md'],
        exclude: ['*.tmp'],
      },
      from_codex: {
        include: ['codex://{org}/{codex_repo}/docs/**'],
      },
    },
  },
  minimal: {
    name: 'minimal',
    description: 'Minimal configuration with just docs and README',
    config: {
      to_codex: {
        include: ['docs/**', 'README.md'],
      },
      from_codex: {
        include: ['codex://{org}/{codex_repo}/docs/**'],
      },
    },
  },
}

/**
 * Default global exclude patterns
 *
 * Applied to all sync operations regardless of preset.
 * These patterns exclude common files that should never be synced.
 */
export const DEFAULT_GLOBAL_EXCLUDES = [
  '**/.git/**',
  '**/node_modules/**',
  '**/.env',
  '**/.env.*',
  '**/*.log',
  '**/dist/**',
  '**/build/**',
  '**/.DS_Store',
  '**/credentials.json',
  '**/*secret*',
  '**/*password*',
] as const

/**
 * Get a sync preset by name
 *
 * @param name - Preset name ('standard' or 'minimal')
 * @returns The preset or undefined if not found
 */
export function getSyncPreset(name: string): SyncPreset | undefined {
  return SYNC_PATTERN_PRESETS[name]
}

/**
 * Get all available preset names
 *
 * @returns Array of preset names
 */
export function getSyncPresetNames(): string[] {
  return Object.keys(SYNC_PATTERN_PRESETS)
}

/**
 * Substitute placeholders in sync patterns
 *
 * Replaces all occurrences of `{org}` and `{codex_repo}` with actual values.
 *
 * @param patterns - Patterns with placeholders
 * @param org - Organization name (must be non-empty)
 * @param codexRepo - Codex repository name (must be non-empty)
 * @returns Patterns with placeholders replaced
 * @throws ValidationError if org or codexRepo is empty
 */
export function substitutePatternPlaceholders(
  patterns: readonly string[],
  org: string,
  codexRepo: string
): string[] {
  if (!org || typeof org !== 'string' || org.trim() === '') {
    throw new ValidationError('org must be a non-empty string')
  }
  if (!codexRepo || typeof codexRepo !== 'string' || codexRepo.trim() === '') {
    throw new ValidationError('codexRepo must be a non-empty string')
  }

  return patterns.map((pattern) =>
    pattern.replace(/\{org\}/g, org).replace(/\{codex_repo\}/g, codexRepo)
  )
}

/**
 * Options for generating sync config from preset
 */
export interface GenerateSyncConfigOptions {
  /**
   * Whether to include DEFAULT_GLOBAL_EXCLUDES in the generated config.
   * When true, global excludes are merged into to_codex.exclude.
   * @default false
   */
  includeGlobalExcludes?: boolean
}

/**
 * Generate a sync config from a preset with actual values
 *
 * @param presetName - Preset name
 * @param org - Organization name
 * @param codexRepo - Codex repository name
 * @param options - Generation options
 * @returns Sync config with placeholders substituted, or undefined if preset not found
 */
export function generateSyncConfigFromPreset(
  presetName: string,
  org: string,
  codexRepo: string,
  options?: GenerateSyncConfigOptions
): SyncPresetConfig | undefined {
  const preset = getSyncPreset(presetName)
  if (!preset) {
    return undefined
  }

  // Build exclude list, optionally including global excludes
  let toCodexExclude: string[] | undefined
  if (options?.includeGlobalExcludes) {
    toCodexExclude = [
      ...(preset.config.to_codex.exclude || []),
      ...DEFAULT_GLOBAL_EXCLUDES,
    ]
  } else if (preset.config.to_codex.exclude) {
    toCodexExclude = [...preset.config.to_codex.exclude]
  }

  return {
    to_codex: {
      include: [...preset.config.to_codex.include],
      exclude: toCodexExclude,
    },
    from_codex: {
      include: substitutePatternPlaceholders(
        preset.config.from_codex.include,
        org,
        codexRepo
      ),
      exclude: preset.config.from_codex.exclude
        ? substitutePatternPlaceholders(
            preset.config.from_codex.exclude,
            org,
            codexRepo
          )
        : undefined,
    },
  }
}

/**
 * Sync configuration presets
 *
 * Centralized source of truth for sync pattern presets used across:
 * - SDK (programmatic configuration)
 * - CLI (config init command)
 * - MCP Plugin (configurator agent)
 *
 * When updating presets, regenerate the plugin's sync-presets.json:
 *   npx ts-node scripts/generate-sync-presets.ts
 */

/**
 * Configuration schema version
 */
export const CONFIG_SCHEMA_VERSION = '2.0' as const

/**
 * Directional sync configuration for a preset
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
 * Sync preset definition
 */
export interface SyncPreset {
  /** Preset identifier */
  name: string
  /** Human-readable description */
  description: string
  /** Sync configuration */
  config: SyncPresetConfig
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
 * Replaces `{org}` and `{codex_repo}` with actual values.
 *
 * @param patterns - Patterns with placeholders
 * @param org - Organization name
 * @param codexRepo - Codex repository name
 * @returns Patterns with placeholders replaced
 */
export function substitutePatternPlaceholders(
  patterns: string[],
  org: string,
  codexRepo: string
): string[] {
  return patterns.map((pattern) =>
    pattern.replace('{org}', org).replace('{codex_repo}', codexRepo)
  )
}

/**
 * Generate a sync config from a preset with actual values
 *
 * @param presetName - Preset name
 * @param org - Organization name
 * @param codexRepo - Codex repository name
 * @returns Sync config with placeholders substituted, or undefined if preset not found
 */
export function generateSyncConfigFromPreset(
  presetName: string,
  org: string,
  codexRepo: string
): SyncPresetConfig | undefined {
  const preset = getSyncPreset(presetName)
  if (!preset) {
    return undefined
  }

  return {
    to_codex: {
      include: [...preset.config.to_codex.include],
      exclude: preset.config.to_codex.exclude
        ? [...preset.config.to_codex.exclude]
        : undefined,
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

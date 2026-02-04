import { z } from 'zod'

/**
 * Schema for auto-sync patterns
 *
 * Based on SPEC-00004: Routing & Distribution
 */
export const AutoSyncPatternSchema = z.object({
  pattern: z.string(),
  include: z.array(z.string()),
  exclude: z.array(z.string()).optional(),
})

export type AutoSyncPattern = z.infer<typeof AutoSyncPatternSchema>

/**
 * Schema for sync rules configuration
 *
 * Based on SPEC-00004: Routing & Distribution
 */
export const SyncRulesSchema = z.object({
  autoSyncPatterns: z.array(AutoSyncPatternSchema).optional(),
  preventSelfSync: z.boolean().optional(),
  preventCodexSync: z.boolean().optional(),
  allowProjectOverrides: z.boolean().optional(),
  defaultInclude: z.array(z.string()).optional(),
  defaultExclude: z.array(z.string()).optional(),
})

export type SyncRules = z.infer<typeof SyncRulesSchema>

/**
 * Schema for directional sync config (v0.7.0+)
 *
 * Defines include/exclude patterns for a sync direction
 */
export const DirectionalSyncConfigSchema = z.object({
  /** Patterns to include (required) */
  include: z.array(z.string()),
  /** Patterns to exclude (optional) */
  exclude: z.array(z.string()).optional(),
})

export type DirectionalSyncConfig = z.infer<typeof DirectionalSyncConfigSchema>

/**
 * Schema for from_codex sync config with URI validation
 *
 * from_codex patterns MUST use codex:// URIs to specify which files
 * to pull from the codex repository. Plain paths are not valid.
 *
 * Valid patterns:
 * - "codex://org/repo/docs/**"
 * - "codex://{org}/{codex_repo}/docs/**" (with placeholders)
 *
 * Invalid patterns:
 * - "docs/**" (plain path - won't work)
 * - "standards/**" (plain path - won't work)
 */
export const FromCodexSyncConfigSchema = DirectionalSyncConfigSchema.refine(
  (config) => {
    // Validate that all include patterns use codex:// URI format
    const includeValid = config.include.every((pattern) =>
      pattern.startsWith('codex://')
    )
    // Validate exclude patterns too (if present)
    const excludeValid =
      !config.exclude ||
      config.exclude.every((pattern) => pattern.startsWith('codex://'))
    return includeValid && excludeValid
  },
  {
    message:
      'from_codex patterns must use codex:// URI format (e.g., "codex://{org}/{codex_repo}/docs/**"). Plain paths like "docs/**" are not valid for from_codex.',
  }
)

export type FromCodexSyncConfig = z.infer<typeof FromCodexSyncConfigSchema>

/**
 * Schema for directional sync configuration
 *
 * Defines what files sync TO codex (push) and FROM codex (pull)
 */
export const DirectionalSyncSchema = z.object({
  // New format (v0.7.0+) - Recommended
  // Patterns for files to push from this project to codex (plain paths)
  to_codex: DirectionalSyncConfigSchema.optional(),

  // Patterns for files to pull from codex to this project (codex:// URIs required)
  from_codex: FromCodexSyncConfigSchema.optional(),

  // Global exclude patterns (applied to both directions)
  exclude: z.array(z.string()).optional(),

  // Legacy format (deprecated, backward compatible)
  // Org-level defaults (only in codex repository config)
  default_to_codex: z.array(z.string()).optional(),
  default_from_codex: z.array(z.string()).optional(),
})

export type DirectionalSync = z.infer<typeof DirectionalSyncSchema>

/**
 * Schema for archive configuration per project
 *
 * Based on SPEC-20260111: Codex Archive Awareness
 */
export const ArchiveProjectConfigSchema = z.object({
  enabled: z.boolean(),
  handler: z.enum(['s3', 'r2', 'gcs', 'local']),
  bucket: z.string().optional(),
  prefix: z.string().optional(),
  patterns: z.array(z.string()).optional(),
})

export type ArchiveProjectConfig = z.infer<typeof ArchiveProjectConfigSchema>

/**
 * Schema for archive configuration
 *
 * Maps project identifiers (org/project) to their archive config
 */
export const ArchiveConfigSchema = z.object({
  projects: z.record(ArchiveProjectConfigSchema),
})

export type ArchiveConfig = z.infer<typeof ArchiveConfigSchema>

/**
 * Schema for GitHub authentication configuration
 */
export const GitHubAuthConfigSchema = z.object({
  /** Default token environment variable name (default: GITHUB_TOKEN) */
  default_token_env: z.string().optional(),
  /** Fallback to public access if authentication fails */
  fallback_to_public: z.boolean().optional(),
})

export type GitHubAuthConfig = z.infer<typeof GitHubAuthConfigSchema>

/**
 * Schema for authentication configuration
 */
export const AuthConfigSchema = z.object({
  /** GitHub authentication configuration */
  github: GitHubAuthConfigSchema.optional(),
})

export type AuthConfig = z.infer<typeof AuthConfigSchema>

/**
 * Schema for remote repository configuration
 *
 * Configures authentication for external repositories referenced in from_codex patterns.
 * Token can be a direct value or an environment variable reference using ${VAR} syntax.
 *
 * Example:
 *   remotes:
 *     partner-org/their-docs:
 *       token: ${PARTNER_TOKEN}
 */
export const RemoteConfigSchema = z.object({
  /** Authentication token - can be direct value or ${ENV_VAR} reference */
  token: z.string().optional(),
})

export type RemoteConfig = z.infer<typeof RemoteConfigSchema>

/**
 * Schema for Codex configuration
 *
 * Based on SPEC-00005: Configuration System
 */
export const CodexConfigSchema = z
  .object({
    organizationSlug: z.string(),

    /** Project name (optional) */
    project: z.string().optional(),

    directories: z
      .object({
        source: z.string().optional(),
        target: z.string().optional(),
        systems: z.string().optional(),
      })
      .optional(),

    rules: SyncRulesSchema.optional(),

    // Directional sync configuration
    sync: DirectionalSyncSchema.optional(),

    // Archive configuration
    archive: ArchiveConfigSchema.optional(),

    // Authentication configuration
    auth: AuthConfigSchema.optional(),

    // Remote repositories configuration (external projects)
    // Keys are org/project identifiers, values configure authentication
    remotes: z.record(RemoteConfigSchema).optional(),
  })
  .strict()

export type CodexConfig = z.infer<typeof CodexConfigSchema>

/**
 * Schema for file plugin source configuration
 *
 * Based on SPEC-20260115: Codex-File Plugin Integration
 */
export const FileSourceSchema = z
  .object({
    type: z.enum(['s3', 'r2', 'gcs', 'local']),
    bucket: z.string().optional(),
    prefix: z.string().optional(),
    region: z.string().optional(),
    local: z.object({
      base_path: z.string(),
    }),
    push: z
      .object({
        compress: z.boolean().optional(),
        keep_local: z.boolean().optional(),
      })
      .optional(),
    auth: z
      .object({
        profile: z.string().optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      // Bucket is required for cloud storage types (s3, r2, gcs)
      if (data.type !== 'local' && !data.bucket) {
        return false
      }
      return true
    },
    {
      message: "Bucket is required for s3, r2, and gcs storage types",
      path: ['bucket'],
    }
  )

export type FileSource = z.infer<typeof FileSourceSchema>

/**
 * Schema for file plugin configuration
 *
 * Manages local project artifacts (specs, logs, assets) with push/pull to cloud storage
 */
export const FileConfigSchema = z.object({
  schema_version: z.string(),
  sources: z.record(FileSourceSchema),
})

export type FileConfig = z.infer<typeof FileConfigSchema>

/**
 * Schema for unified configuration
 *
 * Combines file plugin and codex plugin configuration in a single file
 * Location: .fractary/config.yaml
 */
export const UnifiedConfigSchema = z.object({
  file: FileConfigSchema.optional(),
  codex: CodexConfigSchema.optional(),
})

export type UnifiedConfig = z.infer<typeof UnifiedConfigSchema>

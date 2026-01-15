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
 * Schema for directional sync configuration
 *
 * Defines what files sync TO codex (push) and FROM codex (pull)
 */
export const DirectionalSyncSchema = z.object({
  // Patterns for files to push from this project to codex
  to_codex: z.array(z.string()).optional(),

  // Patterns for files to pull from codex to this project
  // Format: "project-name/path/pattern" or "project-name/**"
  from_codex: z.array(z.string()).optional(),

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
 * Schema for Codex configuration
 *
 * Based on SPEC-00005: Configuration System
 */
export const CodexConfigSchema = z
  .object({
    organizationSlug: z.string(),

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

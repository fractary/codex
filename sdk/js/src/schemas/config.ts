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
  })
  .strict()

export type CodexConfig = z.infer<typeof CodexConfigSchema>

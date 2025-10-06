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
  })
  .strict()

export type CodexConfig = z.infer<typeof CodexConfigSchema>

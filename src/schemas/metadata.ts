import { z } from 'zod'

/**
 * Schema for document frontmatter metadata
 *
 * Based on SPEC-00002: Metadata Parsing
 */
export const MetadataSchema = z
  .object({
    // Organizational
    org: z.string().optional(),
    system: z.string().optional(),

    // Sync rules
    codex_sync_include: z.array(z.string()).optional(),
    codex_sync_exclude: z.array(z.string()).optional(),

    // Metadata
    title: z.string().optional(),
    description: z.string().optional(),
    visibility: z.enum(['public', 'internal', 'private']).optional(),
    audience: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),

    // Timestamps
    created: z.string().optional(), // ISO 8601 date string
    updated: z.string().optional(),
  })
  .passthrough() // Allow additional fields for extensibility

export type Metadata = z.infer<typeof MetadataSchema>

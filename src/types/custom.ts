/**
 * Custom type loading from configuration
 *
 * Loads user-defined artifact types from configuration files
 * and validates them against the type schema.
 */

import { z } from 'zod'
import type { ArtifactType } from './built-in.js'
import { DEFAULT_TYPE, TTL } from './built-in.js'

/**
 * Schema for custom type definition in config
 */
export const CustomTypeSchema = z.object({
  description: z.string().optional(),
  patterns: z.array(z.string()).min(1),
  defaultTtl: z.number().positive().optional(),
  archiveAfterDays: z.number().positive().nullable().optional(),
  archiveStorage: z.enum(['local', 'cloud', 'drive']).nullable().optional(),
  syncPatterns: z.array(z.string()).optional(),
  excludePatterns: z.array(z.string()).optional(),
  permissions: z
    .object({
      include: z.array(z.string()),
      exclude: z.array(z.string()),
    })
    .optional(),
})

export type CustomTypeConfig = z.infer<typeof CustomTypeSchema>

/**
 * Schema for the types section of configuration
 */
export const TypesConfigSchema = z.object({
  custom: z.record(z.string(), CustomTypeSchema).optional(),
})

export type TypesConfig = z.infer<typeof TypesConfigSchema>

/**
 * Validation result for custom types
 */
export interface ValidationResult {
  valid: boolean
  errors: Array<{
    name: string
    field: string
    message: string
  }>
}

/**
 * Parse a TTL value from config (can be number or string like "7d", "1w")
 *
 * @param value - TTL value
 * @returns TTL in seconds
 */
export function parseTtl(value: string | number): number {
  if (typeof value === 'number') {
    return value
  }

  const match = value.match(/^(\d+)(s|m|h|d|w)$/)
  if (!match || !match[1] || !match[2]) {
    return TTL.ONE_WEEK // Default fallback
  }

  const num = parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case 's':
      return num
    case 'm':
      return num * 60
    case 'h':
      return num * 3600
    case 'd':
      return num * 86400
    case 'w':
      return num * 604800
    default:
      return TTL.ONE_WEEK
  }
}

/**
 * Validate custom types configuration
 *
 * @param config - Types configuration object
 * @returns Validation result
 */
export function validateCustomTypes(config: unknown): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
  }

  if (!config || typeof config !== 'object') {
    return result // Empty config is valid
  }

  const typesConfig = config as Record<string, unknown>
  const customTypes = typesConfig.custom as Record<string, unknown> | undefined

  if (!customTypes) {
    return result
  }

  for (const [name, typeConfig] of Object.entries(customTypes)) {
    // Validate name
    if (!/^[a-z][a-z0-9_-]*$/.test(name)) {
      result.valid = false
      result.errors.push({
        name,
        field: 'name',
        message: 'Type name must start with a letter and contain only lowercase letters, numbers, hyphens, and underscores',
      })
    }

    // Validate config against schema
    const parseResult = CustomTypeSchema.safeParse(typeConfig)
    if (!parseResult.success) {
      result.valid = false
      for (const issue of parseResult.error.issues) {
        result.errors.push({
          name,
          field: issue.path.join('.'),
          message: issue.message,
        })
      }
    }
  }

  return result
}

/**
 * Load custom types from configuration
 *
 * @param config - Types configuration
 * @returns Map of type name to ArtifactType
 */
export function loadCustomTypes(config: TypesConfig): Map<string, ArtifactType> {
  const types = new Map<string, ArtifactType>()

  if (!config.custom) {
    return types
  }

  for (const [name, typeConfig] of Object.entries(config.custom)) {
    const type: ArtifactType = {
      name,
      description: typeConfig.description || `Custom type: ${name}`,
      patterns: typeConfig.patterns,
      defaultTtl: typeConfig.defaultTtl ?? DEFAULT_TYPE.defaultTtl,
      archiveAfterDays: typeConfig.archiveAfterDays ?? DEFAULT_TYPE.archiveAfterDays,
      archiveStorage: typeConfig.archiveStorage ?? DEFAULT_TYPE.archiveStorage,
      syncPatterns: typeConfig.syncPatterns,
      excludePatterns: typeConfig.excludePatterns,
      permissions: typeConfig.permissions,
    }

    types.set(name, type)
  }

  return types
}

/**
 * Merge custom types with built-in types
 *
 * Custom types override built-in types with the same name.
 *
 * @param builtIn - Built-in types
 * @param custom - Custom types
 * @returns Merged types
 */
export function mergeTypes(
  builtIn: Record<string, ArtifactType>,
  custom: Map<string, ArtifactType>
): Map<string, ArtifactType> {
  const merged = new Map<string, ArtifactType>()

  // Add built-in types first
  for (const [name, type] of Object.entries(builtIn)) {
    merged.set(name, type)
  }

  // Override/add custom types
  for (const [name, type] of custom) {
    merged.set(name, type)
  }

  return merged
}

/**
 * Create a partial type definition for extending a built-in type
 *
 * @param baseName - Name of the built-in type to extend
 * @param overrides - Properties to override
 * @returns Partial type definition
 */
export function extendType(
  baseName: string,
  overrides: Partial<Omit<ArtifactType, 'name'>>
): Partial<ArtifactType> {
  return {
    ...overrides,
    name: baseName,
  }
}

/**
 * Types module - Extensible artifact type system
 *
 * Provides built-in artifact types (docs, specs, logs, etc.) and
 * support for user-defined custom types with TTL and archival policies.
 *
 * @example
 * ```typescript
 * import { TypeRegistry, BUILT_IN_TYPES } from '@fractary/codex/types'
 *
 * // Create a registry with built-in types
 * const registry = new TypeRegistry()
 *
 * // Detect type from file path
 * const type = registry.detectType('docs/oauth.md')  // 'docs'
 * const ttl = registry.getTtl('docs/oauth.md')       // 604800 (7 days)
 *
 * // Register a custom type
 * registry.register({
 *   name: 'research',
 *   description: 'Research notes',
 *   patterns: ['research/**'],
 *   defaultTtl: 604800,
 *   archiveAfterDays: 90,
 *   archiveStorage: 'cloud'
 * })
 * ```
 */

// Built-in types
export {
  type ArtifactType,
  BUILT_IN_TYPES,
  DEFAULT_TYPE,
  TTL,
  getBuiltInType,
  getBuiltInTypeNames,
  isBuiltInType,
} from './built-in.js'

// Registry
export {
  TypeRegistry,
  createDefaultRegistry,
  type TypeRegistryOptions,
} from './registry.js'

// Custom types
export {
  CustomTypeSchema,
  TypesConfigSchema,
  type CustomTypeConfig,
  type TypesConfig,
  type ValidationResult,
  parseTtl,
  validateCustomTypes,
  loadCustomTypes,
  mergeTypes,
  extendType,
} from './custom.js'

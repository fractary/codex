/**
 * Type registry for artifact types
 *
 * Manages both built-in and custom artifact types, providing
 * type detection, TTL lookup, and registration functionality.
 */

import micromatch from 'micromatch'
import {
  type ArtifactType,
  BUILT_IN_TYPES,
  DEFAULT_TYPE,
  isBuiltInType,
} from './built-in.js'

/**
 * Options for creating a TypeRegistry
 */
export interface TypeRegistryOptions {
  /** Whether to include built-in types (default: true) */
  includeBuiltIn?: boolean
  /** Custom types to register */
  customTypes?: Record<string, Partial<ArtifactType>>
}

/**
 * Type registry for managing artifact types
 */
export class TypeRegistry {
  private types: Map<string, ArtifactType> = new Map()
  private patternCache: Map<string, string> = new Map()

  constructor(options: TypeRegistryOptions = {}) {
    const { includeBuiltIn = true, customTypes = {} } = options

    // Load built-in types
    if (includeBuiltIn) {
      for (const [name, type] of Object.entries(BUILT_IN_TYPES)) {
        this.types.set(name, type)
      }
    }

    // Load custom types
    for (const [name, partialType] of Object.entries(customTypes)) {
      this.register({
        ...DEFAULT_TYPE,
        ...partialType,
        name,
      })
    }
  }

  /**
   * Get a type by name
   *
   * Custom types take precedence over built-in types with the same name.
   *
   * @param name - Type name
   * @returns The type or undefined
   */
  get(name: string): ArtifactType | undefined {
    return this.types.get(name)
  }

  /**
   * Register a custom type
   *
   * @param type - The type to register
   */
  register(type: ArtifactType): void {
    this.types.set(type.name, type)
    // Clear pattern cache when types change
    this.patternCache.clear()
  }

  /**
   * Unregister a type
   *
   * Note: Built-in types can be unregistered but this is not recommended.
   *
   * @param name - Type name to unregister
   * @returns true if the type was removed
   */
  unregister(name: string): boolean {
    const result = this.types.delete(name)
    if (result) {
      this.patternCache.clear()
    }
    return result
  }

  /**
   * Check if a type exists
   *
   * @param name - Type name
   * @returns true if the type exists
   */
  has(name: string): boolean {
    return this.types.has(name)
  }

  /**
   * List all registered types
   *
   * @returns Array of all types
   */
  list(): ArtifactType[] {
    return Array.from(this.types.values())
  }

  /**
   * List all type names
   *
   * @returns Array of type names
   */
  listNames(): string[] {
    return Array.from(this.types.keys())
  }

  /**
   * Detect the type of a file based on its path
   *
   * Types are checked in order of specificity (most specific patterns first).
   * Returns 'default' if no type matches.
   *
   * @param filePath - File path to check
   * @returns The detected type name
   */
  detectType(filePath: string): string {
    // Check cache first
    const cached = this.patternCache.get(filePath)
    if (cached) {
      return cached
    }

    // Normalize path separators
    const normalizedPath = filePath.replace(/\\/g, '/')

    // Check each type's patterns
    // Sort by pattern specificity (longer patterns first)
    const sortedTypes = this.list().sort((a, b) => {
      const aMaxLen = Math.max(...a.patterns.map((p) => p.length))
      const bMaxLen = Math.max(...b.patterns.map((p) => p.length))
      return bMaxLen - aMaxLen
    })

    for (const type of sortedTypes) {
      if (type.name === 'default') continue

      for (const pattern of type.patterns) {
        if (micromatch.isMatch(normalizedPath, pattern)) {
          this.patternCache.set(filePath, type.name)
          return type.name
        }
      }
    }

    // No match, return default
    this.patternCache.set(filePath, 'default')
    return 'default'
  }

  /**
   * Get the TTL for a file based on its type
   *
   * @param filePath - File path
   * @param override - Optional TTL override
   * @returns TTL in seconds
   */
  getTtl(filePath: string, override?: number): number {
    if (override !== undefined) {
      return override
    }

    const typeName = this.detectType(filePath)
    const type = this.get(typeName) || DEFAULT_TYPE
    return type.defaultTtl
  }

  /**
   * Get archive configuration for a file
   *
   * @param filePath - File path
   * @returns Archive configuration or null if archiving is disabled
   */
  getArchiveConfig(filePath: string): {
    afterDays: number
    storage: 'local' | 'cloud' | 'drive'
  } | null {
    const typeName = this.detectType(filePath)
    const type = this.get(typeName) || DEFAULT_TYPE

    if (type.archiveAfterDays === null || type.archiveStorage === null) {
      return null
    }

    return {
      afterDays: type.archiveAfterDays,
      storage: type.archiveStorage,
    }
  }

  /**
   * Get all files that match a type's patterns
   *
   * @param typeName - Type name
   * @param files - Array of file paths to filter
   * @returns Filtered file paths
   */
  filterByType(typeName: string, files: string[]): string[] {
    const type = this.get(typeName)
    if (!type) {
      return []
    }

    return files.filter((file) => {
      const normalized = file.replace(/\\/g, '/')
      return type.patterns.some((pattern) => micromatch.isMatch(normalized, pattern))
    })
  }

  /**
   * Check if a type is a built-in type
   *
   * @param name - Type name
   * @returns true if it's a built-in type
   */
  isBuiltIn(name: string): boolean {
    return isBuiltInType(name)
  }

  /**
   * Get the number of registered types
   */
  get size(): number {
    return this.types.size
  }

  /**
   * Clear pattern cache
   *
   * Call this if you need to force re-detection of types.
   */
  clearCache(): void {
    this.patternCache.clear()
  }
}

/**
 * Create a default TypeRegistry with built-in types
 *
 * @returns A new TypeRegistry instance
 */
export function createDefaultRegistry(): TypeRegistry {
  return new TypeRegistry()
}

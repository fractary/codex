/**
 * Permission manager
 *
 * Manages permission rules and provides a high-level API
 * for permission checks.
 */

import type {
  PermissionRule,
  PermissionContext,
  PermissionResult,
  PermissionConfig,
  PermissionLevel,
  PermissionAction,
} from './types.js'
import { DEFAULT_PERMISSION_CONFIG, levelGrants } from './types.js'
import { evaluatePermission, validateRules, filterByPermission } from './evaluator.js'

/**
 * Permission manager configuration
 */
export interface PermissionManagerConfig {
  /** Initial configuration */
  config?: Partial<PermissionConfig>
  /** Default context */
  defaultContext?: PermissionContext
}

/**
 * Permission manager
 *
 * Provides a centralized API for managing and checking permissions.
 */
export class PermissionManager {
  private config: PermissionConfig
  private defaultContext: PermissionContext

  constructor(options: PermissionManagerConfig = {}) {
    this.config = {
      ...DEFAULT_PERMISSION_CONFIG,
      ...options.config,
      // Create a new rules array to avoid shared state
      rules: options.config?.rules ? [...options.config.rules] : [],
    }
    this.defaultContext = options.defaultContext ?? {}
  }

  /**
   * Check if an action is allowed for a path
   */
  isAllowed(
    path: string,
    action: PermissionAction,
    context?: PermissionContext
  ): boolean {
    const result = this.evaluate(path, action, context)
    return result.allowed
  }

  /**
   * Check if a permission level is granted
   */
  hasPermission(
    path: string,
    action: PermissionAction,
    requiredLevel: PermissionLevel,
    context?: PermissionContext
  ): boolean {
    const result = this.evaluate(path, action, context)
    return levelGrants(result.level, requiredLevel)
  }

  /**
   * Evaluate permission for a path and action
   */
  evaluate(
    path: string,
    action: PermissionAction,
    context?: PermissionContext
  ): PermissionResult {
    const mergedContext = { ...this.defaultContext, ...context }

    // If permissions are not enforced, allow everything
    if (!this.config.enforced) {
      return {
        allowed: true,
        level: 'admin',
        reason: 'Permissions not enforced',
      }
    }

    return evaluatePermission(path, action, mergedContext, this.config)
  }

  /**
   * Filter paths by permission
   */
  filterAllowed(
    paths: string[],
    action: PermissionAction,
    context?: PermissionContext,
    requiredLevel: PermissionLevel = 'read'
  ): string[] {
    const mergedContext = { ...this.defaultContext, ...context }

    if (!this.config.enforced) {
      return paths
    }

    return filterByPermission(paths, action, mergedContext, this.config, requiredLevel)
  }

  /**
   * Add a permission rule
   */
  addRule(rule: PermissionRule): void {
    const errors = validateRules([rule])
    if (errors.length > 0) {
      throw new Error(`Invalid rule: ${errors.join(', ')}`)
    }

    this.config.rules.push(rule)
  }

  /**
   * Remove a permission rule by ID
   */
  removeRule(id: string): boolean {
    const index = this.config.rules.findIndex((r) => r.id === id)
    if (index === -1) {
      return false
    }

    this.config.rules.splice(index, 1)
    return true
  }

  /**
   * Get all rules
   */
  getRules(): PermissionRule[] {
    return [...this.config.rules]
  }

  /**
   * Clear all rules
   */
  clearRules(): void {
    this.config.rules = []
  }

  /**
   * Set rules (replace all)
   */
  setRules(rules: PermissionRule[]): void {
    const errors = validateRules(rules)
    if (errors.length > 0) {
      throw new Error(`Invalid rules: ${errors.join(', ')}`)
    }

    this.config.rules = [...rules]
  }

  /**
   * Get configuration
   */
  getConfig(): PermissionConfig {
    return { ...this.config, rules: [...this.config.rules] }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<Omit<PermissionConfig, 'rules'>>): void {
    this.config = {
      ...this.config,
      ...updates,
    }
  }

  /**
   * Set default context
   */
  setDefaultContext(context: PermissionContext): void {
    this.defaultContext = { ...context }
  }

  /**
   * Get default context
   */
  getDefaultContext(): PermissionContext {
    return { ...this.defaultContext }
  }

  /**
   * Enable permission enforcement
   */
  enable(): void {
    this.config.enforced = true
  }

  /**
   * Disable permission enforcement
   */
  disable(): void {
    this.config.enforced = false
  }

  /**
   * Check if permissions are enforced
   */
  isEnforced(): boolean {
    return this.config.enforced
  }

  /**
   * Assert permission (throws if denied)
   */
  assertPermission(
    path: string,
    action: PermissionAction,
    requiredLevel: PermissionLevel = 'read',
    context?: PermissionContext
  ): void {
    const result = this.evaluate(path, action, context)

    if (!levelGrants(result.level, requiredLevel)) {
      throw new PermissionDeniedError(
        `Permission denied for ${action} on ${path}: ${result.reason}`,
        path,
        action,
        result
      )
    }
  }
}

/**
 * Permission denied error
 */
export class PermissionDeniedError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly action: PermissionAction,
    public readonly result: PermissionResult
  ) {
    super(message)
    this.name = 'PermissionDeniedError'
  }
}

/**
 * Create a permission manager
 */
export function createPermissionManager(config?: PermissionManagerConfig): PermissionManager {
  return new PermissionManager(config)
}

/**
 * Default permission manager instance
 */
let defaultManager: PermissionManager | null = null

/**
 * Get the default permission manager
 */
export function getDefaultPermissionManager(): PermissionManager {
  if (!defaultManager) {
    defaultManager = createPermissionManager()
  }
  return defaultManager
}

/**
 * Set the default permission manager
 */
export function setDefaultPermissionManager(manager: PermissionManager): void {
  defaultManager = manager
}

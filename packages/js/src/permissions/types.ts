/**
 * Permission types
 *
 * Type definitions for the permissions system.
 */

/**
 * Permission levels
 */
export type PermissionLevel = 'none' | 'read' | 'write' | 'admin'

/**
 * Permission scope
 */
export type PermissionScope = 'global' | 'org' | 'project' | 'path'

/**
 * Permission action
 */
export type PermissionAction = 'fetch' | 'cache' | 'sync' | 'invalidate' | 'manage'

/**
 * Permission rule
 */
export interface PermissionRule {
  /** Rule ID */
  id?: string
  /** Pattern to match (glob) */
  pattern: string
  /** Actions this rule applies to */
  actions: PermissionAction[]
  /** Permission level granted */
  level: PermissionLevel
  /** Scope of the rule */
  scope: PermissionScope
  /** Organization filter (for org scope) */
  org?: string
  /** Project filter (for project scope) */
  project?: string
  /** Priority (higher = evaluated first) */
  priority?: number
  /** Description of the rule */
  description?: string
  /** Whether rule is active */
  enabled?: boolean
}

/**
 * Permission context
 *
 * Context for evaluating permissions.
 */
export interface PermissionContext {
  /** Current organization */
  org?: string
  /** Current project */
  project?: string
  /** Current environment */
  environment?: string
  /** User/agent identity */
  identity?: string
  /** Additional context data */
  metadata?: Record<string, unknown>
}

/**
 * Permission check result
 */
export interface PermissionResult {
  /** Whether the action is allowed */
  allowed: boolean
  /** Permission level granted */
  level: PermissionLevel
  /** Matching rule (if any) */
  matchedRule?: PermissionRule
  /** Reason for the decision */
  reason: string
}

/**
 * Permission configuration
 */
export interface PermissionConfig {
  /** Default permission level */
  defaultLevel: PermissionLevel
  /** Whether to allow by default when no rules match */
  defaultAllow: boolean
  /** Global permission rules */
  rules: PermissionRule[]
  /** Whether permissions are enforced */
  enforced: boolean
}

/**
 * Default permission configuration
 */
export const DEFAULT_PERMISSION_CONFIG: PermissionConfig = {
  defaultLevel: 'read',
  defaultAllow: true,
  rules: [],
  enforced: false,
}

/**
 * Permission levels ordered by access
 */
export const PERMISSION_LEVEL_ORDER: PermissionLevel[] = ['none', 'read', 'write', 'admin']

/**
 * Check if a level grants another level
 */
export function levelGrants(granted: PermissionLevel, required: PermissionLevel): boolean {
  const grantedIndex = PERMISSION_LEVEL_ORDER.indexOf(granted)
  const requiredIndex = PERMISSION_LEVEL_ORDER.indexOf(required)
  return grantedIndex >= requiredIndex
}

/**
 * Get the higher of two permission levels
 */
export function maxLevel(a: PermissionLevel, b: PermissionLevel): PermissionLevel {
  const aIndex = PERMISSION_LEVEL_ORDER.indexOf(a)
  const bIndex = PERMISSION_LEVEL_ORDER.indexOf(b)
  return PERMISSION_LEVEL_ORDER[Math.max(aIndex, bIndex)] ?? 'none'
}

/**
 * Get the lower of two permission levels
 */
export function minLevel(a: PermissionLevel, b: PermissionLevel): PermissionLevel {
  const aIndex = PERMISSION_LEVEL_ORDER.indexOf(a)
  const bIndex = PERMISSION_LEVEL_ORDER.indexOf(b)
  return PERMISSION_LEVEL_ORDER[Math.min(aIndex, bIndex)] ?? 'none'
}

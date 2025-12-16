/**
 * Permissions module
 *
 * Provides permission management for codex operations.
 */

// Types
export type {
  PermissionLevel,
  PermissionScope,
  PermissionAction,
  PermissionRule,
  PermissionContext,
  PermissionResult,
  PermissionConfig,
} from './types.js'

export {
  DEFAULT_PERMISSION_CONFIG,
  PERMISSION_LEVEL_ORDER,
  levelGrants,
  maxLevel,
  minLevel,
} from './types.js'

// Evaluator
export {
  ruleMatchesContext,
  ruleMatchesPath,
  ruleMatchesAction,
  evaluatePermission,
  isAllowed,
  hasPermission,
  evaluatePermissions,
  filterByPermission,
  validateRules,
  createRule,
  CommonRules,
} from './evaluator.js'

// Manager
export type { PermissionManagerConfig } from './manager.js'

export {
  PermissionManager,
  PermissionDeniedError,
  createPermissionManager,
  getDefaultPermissionManager,
  setDefaultPermissionManager,
} from './manager.js'

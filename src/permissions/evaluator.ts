/**
 * Permission evaluator
 *
 * Evaluates permission rules to determine access levels.
 */

import micromatch from 'micromatch'
import type {
  PermissionRule,
  PermissionContext,
  PermissionResult,
  PermissionConfig,
  PermissionLevel,
  PermissionAction,
} from './types.js'
import { levelGrants } from './types.js'

/**
 * Check if a rule matches the given context
 */
export function ruleMatchesContext(rule: PermissionRule, context: PermissionContext): boolean {
  // Check if rule is enabled
  if (rule.enabled === false) {
    return false
  }

  // Check scope constraints
  switch (rule.scope) {
    case 'org':
      if (rule.org && context.org !== rule.org) {
        return false
      }
      break
    case 'project':
      if (rule.org && context.org !== rule.org) {
        return false
      }
      if (rule.project && context.project !== rule.project) {
        return false
      }
      break
  }

  return true
}

/**
 * Check if a rule matches a path
 */
export function ruleMatchesPath(rule: PermissionRule, path: string): boolean {
  return micromatch.isMatch(path, rule.pattern)
}

/**
 * Check if a rule matches an action
 */
export function ruleMatchesAction(rule: PermissionRule, action: PermissionAction): boolean {
  return rule.actions.includes(action)
}

/**
 * Evaluate permission for a path and action
 */
export function evaluatePermission(
  path: string,
  action: PermissionAction,
  context: PermissionContext,
  config: PermissionConfig
): PermissionResult {
  // Sort rules by priority (higher first)
  const sortedRules = [...config.rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

  // Find first matching rule
  for (const rule of sortedRules) {
    if (!ruleMatchesContext(rule, context)) {
      continue
    }

    if (!ruleMatchesPath(rule, path)) {
      continue
    }

    if (!ruleMatchesAction(rule, action)) {
      continue
    }

    // Rule matches
    return {
      allowed: rule.level !== 'none',
      level: rule.level,
      matchedRule: rule,
      reason: `Matched rule: ${rule.description ?? rule.pattern}`,
    }
  }

  // No rule matched - use default
  return {
    allowed: config.defaultAllow,
    level: config.defaultLevel,
    reason: config.defaultAllow ? 'Allowed by default' : 'Denied by default',
  }
}

/**
 * Check if an action is allowed for a path
 */
export function isAllowed(
  path: string,
  action: PermissionAction,
  context: PermissionContext,
  config: PermissionConfig
): boolean {
  const result = evaluatePermission(path, action, context, config)
  return result.allowed
}

/**
 * Check if a specific permission level is granted
 */
export function hasPermission(
  path: string,
  action: PermissionAction,
  requiredLevel: PermissionLevel,
  context: PermissionContext,
  config: PermissionConfig
): boolean {
  const result = evaluatePermission(path, action, context, config)
  return levelGrants(result.level, requiredLevel)
}

/**
 * Evaluate permissions for multiple paths
 */
export function evaluatePermissions(
  paths: string[],
  action: PermissionAction,
  context: PermissionContext,
  config: PermissionConfig
): Map<string, PermissionResult> {
  const results = new Map<string, PermissionResult>()

  for (const path of paths) {
    results.set(path, evaluatePermission(path, action, context, config))
  }

  return results
}

/**
 * Filter paths by permission
 */
export function filterByPermission(
  paths: string[],
  action: PermissionAction,
  context: PermissionContext,
  config: PermissionConfig,
  requiredLevel: PermissionLevel = 'read'
): string[] {
  return paths.filter((path) => {
    const result = evaluatePermission(path, action, context, config)
    return levelGrants(result.level, requiredLevel)
  })
}

/**
 * Validate permission rules
 */
export function validateRules(rules: PermissionRule[]): string[] {
  const errors: string[] = []

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i]
    if (!rule) continue

    // Check pattern
    if (!rule.pattern || rule.pattern.trim() === '') {
      errors.push(`Rule ${i}: pattern is empty`)
      continue
    }

    // Validate pattern
    try {
      micromatch.isMatch('test', rule.pattern)
    } catch {
      errors.push(`Rule ${i}: invalid pattern "${rule.pattern}"`)
    }

    // Check actions
    if (!rule.actions || rule.actions.length === 0) {
      errors.push(`Rule ${i}: actions are empty`)
    }

    // Validate scope constraints
    if (rule.scope === 'org' && !rule.org) {
      errors.push(`Rule ${i}: org scope requires org field`)
    }

    if (rule.scope === 'project' && !rule.project) {
      errors.push(`Rule ${i}: project scope requires project field`)
    }
  }

  return errors
}

/**
 * Create a permission rule
 */
export function createRule(options: {
  pattern: string
  actions: PermissionAction[]
  level: PermissionLevel
  scope?: PermissionRule['scope']
  org?: string
  project?: string
  priority?: number
  description?: string
}): PermissionRule {
  return {
    pattern: options.pattern,
    actions: options.actions,
    level: options.level,
    scope: options.scope ?? 'global',
    org: options.org,
    project: options.project,
    priority: options.priority ?? 0,
    description: options.description,
    enabled: true,
  }
}

/**
 * Create common permission rules
 */
export const CommonRules = {
  /** Allow all actions for docs */
  allowDocs: (): PermissionRule =>
    createRule({
      pattern: 'docs/**',
      actions: ['fetch', 'cache', 'sync'],
      level: 'read',
      description: 'Allow read access to docs',
    }),

  /** Deny access to private files */
  denyPrivate: (): PermissionRule =>
    createRule({
      pattern: '**/.private/**',
      actions: ['fetch', 'cache', 'sync'],
      level: 'none',
      priority: 100,
      description: 'Deny access to private files',
    }),

  /** Read-only access to specs */
  readOnlySpecs: (): PermissionRule =>
    createRule({
      pattern: 'specs/**',
      actions: ['fetch', 'cache'],
      level: 'read',
      description: 'Read-only access to specs',
    }),

  /** Admin access for management */
  adminManage: (): PermissionRule =>
    createRule({
      pattern: '**',
      actions: ['manage', 'invalidate'],
      level: 'admin',
      description: 'Admin access for management operations',
    }),
}

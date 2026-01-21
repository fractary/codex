/**
 * Environment Variable Utilities
 *
 * Provides functions for expanding environment variables in configuration values.
 * Supports ${VAR_NAME} syntax.
 */

/**
 * Options for environment variable expansion
 */
export interface ExpandEnvOptions {
  /**
   * Environment variables to use (default: process.env)
   */
  env?: Record<string, string | undefined>

  /**
   * Whether to warn about missing variables (default: false)
   */
  warnOnMissing?: boolean

  /**
   * Callback for missing variables
   */
  onMissing?: (varName: string) => void
}

/**
 * Expand environment variables in a string value
 *
 * Supports ${VAR_NAME} syntax. If a variable is not found,
 * the original placeholder is preserved.
 *
 * @example
 * ```typescript
 * expandEnvVars('Hello ${USER}')
 * // => 'Hello alice' (if USER=alice)
 *
 * expandEnvVars('Token: ${GITHUB_TOKEN}')
 * // => 'Token: ${GITHUB_TOKEN}' (if GITHUB_TOKEN not set)
 * ```
 */
export function expandEnvVars(
  value: string,
  options: ExpandEnvOptions = {}
): string {
  const env = options.env ?? process.env

  return value.replace(/\$\{([^}]+)\}/g, (match, varName: string) => {
    const envValue = env[varName]

    if (envValue === undefined) {
      if (options.warnOnMissing) {
        console.warn(`Warning: Environment variable ${varName} is not set`)
      }
      if (options.onMissing) {
        options.onMissing(varName)
      }
      // Keep original if not found
      return match
    }

    return envValue
  })
}

/**
 * Recursively expand environment variables in a configuration object
 *
 * Walks through all string values in the object and expands ${VAR_NAME}
 * placeholders using environment variables.
 *
 * @example
 * ```typescript
 * const config = {
 *   token: '${GITHUB_TOKEN}',
 *   nested: {
 *     url: '${API_URL}/v1'
 *   },
 *   items: ['${ITEM_1}', '${ITEM_2}']
 * }
 *
 * expandEnvVarsInConfig(config)
 * // Expands all ${...} placeholders in string values
 * ```
 */
export function expandEnvVarsInConfig<T>(
  config: T,
  options: ExpandEnvOptions = {}
): T {
  if (typeof config === 'string') {
    return expandEnvVars(config, options) as T
  }

  if (Array.isArray(config)) {
    return config.map((item) => expandEnvVarsInConfig(item, options)) as T
  }

  if (config !== null && typeof config === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(config)) {
      result[key] = expandEnvVarsInConfig(value, options)
    }
    return result as T
  }

  return config
}

/**
 * Check if a string contains environment variable placeholders
 */
export function hasEnvVars(value: string): boolean {
  return /\$\{[^}]+\}/.test(value)
}

/**
 * Extract environment variable names from a string
 *
 * @example
 * ```typescript
 * extractEnvVarNames('${USER}@${HOST}:${PORT}')
 * // => ['USER', 'HOST', 'PORT']
 * ```
 */
export function extractEnvVarNames(value: string): string[] {
  const matches = value.matchAll(/\$\{([^}]+)\}/g)
  const names: string[] = []
  for (const match of matches) {
    if (match[1]) {
      names.push(match[1])
    }
  }
  return names
}

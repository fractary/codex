import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  expandEnvVars,
  expandEnvVarsInConfig,
  hasEnvVars,
  extractEnvVarNames,
} from '../../../../src/core/env/index.js'

describe('Environment Variable Utilities', () => {
  // Store original env vars to restore later
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Set up test environment variables
    process.env.TEST_VAR = 'test_value'
    process.env.ANOTHER_VAR = 'another_value'
    process.env.EMPTY_VAR = ''
  })

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv }
  })

  describe('expandEnvVars', () => {
    it('should expand a single environment variable', () => {
      expect(expandEnvVars('${TEST_VAR}')).toBe('test_value')
    })

    it('should expand multiple environment variables', () => {
      expect(expandEnvVars('${TEST_VAR}:${ANOTHER_VAR}')).toBe('test_value:another_value')
    })

    it('should preserve text around variables', () => {
      expect(expandEnvVars('prefix_${TEST_VAR}_suffix')).toBe('prefix_test_value_suffix')
    })

    it('should preserve undefined variables as-is', () => {
      expect(expandEnvVars('${UNDEFINED_VAR}')).toBe('${UNDEFINED_VAR}')
    })

    it('should handle mixed defined and undefined variables', () => {
      expect(expandEnvVars('${TEST_VAR}:${UNDEFINED_VAR}')).toBe('test_value:${UNDEFINED_VAR}')
    })

    it('should handle empty environment variables', () => {
      expect(expandEnvVars('${EMPTY_VAR}')).toBe('')
    })

    it('should return string unchanged if no variables present', () => {
      expect(expandEnvVars('no variables here')).toBe('no variables here')
    })

    it('should handle empty string input', () => {
      expect(expandEnvVars('')).toBe('')
    })

    it('should use custom env object when provided', () => {
      const customEnv = { CUSTOM_VAR: 'custom_value' }
      expect(expandEnvVars('${CUSTOM_VAR}', { env: customEnv })).toBe('custom_value')
    })

    it('should call onMissing callback for undefined variables', () => {
      const missingVars: string[] = []
      expandEnvVars('${MISSING_1}:${MISSING_2}', {
        onMissing: (varName) => missingVars.push(varName),
      })
      expect(missingVars).toEqual(['MISSING_1', 'MISSING_2'])
    })

    it('should handle variables with numbers in name', () => {
      process.env.VAR_123 = 'numbered'
      expect(expandEnvVars('${VAR_123}')).toBe('numbered')
    })

    it('should handle variables with underscores', () => {
      process.env.MY_LONG_VAR_NAME = 'long_name'
      expect(expandEnvVars('${MY_LONG_VAR_NAME}')).toBe('long_name')
    })

    it('should not expand malformed variable syntax', () => {
      expect(expandEnvVars('$TEST_VAR')).toBe('$TEST_VAR')
      expect(expandEnvVars('${TEST_VAR')).toBe('${TEST_VAR')
      expect(expandEnvVars('${ TEST_VAR }')).toBe('${ TEST_VAR }')
    })
  })

  describe('expandEnvVarsInConfig', () => {
    it('should expand variables in a simple object', () => {
      const config = {
        token: '${TEST_VAR}',
        url: 'https://example.com',
      }
      const result = expandEnvVarsInConfig(config)
      expect(result).toEqual({
        token: 'test_value',
        url: 'https://example.com',
      })
    })

    it('should expand variables in nested objects', () => {
      const config = {
        level1: {
          level2: {
            value: '${TEST_VAR}',
          },
        },
      }
      const result = expandEnvVarsInConfig(config)
      expect(result.level1.level2.value).toBe('test_value')
    })

    it('should expand variables in arrays', () => {
      const config = {
        items: ['${TEST_VAR}', '${ANOTHER_VAR}', 'static'],
      }
      const result = expandEnvVarsInConfig(config)
      expect(result.items).toEqual(['test_value', 'another_value', 'static'])
    })

    it('should expand variables in arrays within nested objects', () => {
      const config = {
        nested: {
          items: ['${TEST_VAR}'],
        },
      }
      const result = expandEnvVarsInConfig(config)
      expect(result.nested.items[0]).toBe('test_value')
    })

    it('should preserve non-string values', () => {
      const config = {
        number: 42,
        boolean: true,
        nullValue: null,
        string: '${TEST_VAR}',
      }
      const result = expandEnvVarsInConfig(config)
      expect(result).toEqual({
        number: 42,
        boolean: true,
        nullValue: null,
        string: 'test_value',
      })
    })

    it('should handle empty object', () => {
      expect(expandEnvVarsInConfig({})).toEqual({})
    })

    it('should handle empty array', () => {
      expect(expandEnvVarsInConfig([])).toEqual([])
    })

    it('should return primitive values unchanged', () => {
      expect(expandEnvVarsInConfig(42)).toBe(42)
      expect(expandEnvVarsInConfig(true)).toBe(true)
      expect(expandEnvVarsInConfig(null)).toBe(null)
    })

    it('should handle string directly', () => {
      expect(expandEnvVarsInConfig('${TEST_VAR}')).toBe('test_value')
    })
  })

  describe('hasEnvVars', () => {
    it('should return true for string with env vars', () => {
      expect(hasEnvVars('${VAR}')).toBe(true)
    })

    it('should return false for string without env vars', () => {
      expect(hasEnvVars('no variables')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(hasEnvVars('')).toBe(false)
    })

    it('should return true for multiple env vars', () => {
      expect(hasEnvVars('${A}${B}${C}')).toBe(true)
    })

    it('should return false for malformed syntax', () => {
      expect(hasEnvVars('$VAR')).toBe(false)
      expect(hasEnvVars('${VAR')).toBe(false)
    })
  })

  describe('extractEnvVarNames', () => {
    it('should extract single variable name', () => {
      expect(extractEnvVarNames('${VAR}')).toEqual(['VAR'])
    })

    it('should extract multiple variable names', () => {
      expect(extractEnvVarNames('${A}${B}${C}')).toEqual(['A', 'B', 'C'])
    })

    it('should extract names with surrounding text', () => {
      expect(extractEnvVarNames('prefix_${VAR}_suffix')).toEqual(['VAR'])
    })

    it('should return empty array for no variables', () => {
      expect(extractEnvVarNames('no variables')).toEqual([])
    })

    it('should return empty array for empty string', () => {
      expect(extractEnvVarNames('')).toEqual([])
    })

    it('should handle complex variable names', () => {
      expect(extractEnvVarNames('${MY_LONG_VAR_123}')).toEqual(['MY_LONG_VAR_123'])
    })

    it('should extract multiple occurrences of same variable', () => {
      expect(extractEnvVarNames('${VAR}:${VAR}')).toEqual(['VAR', 'VAR'])
    })
  })
})

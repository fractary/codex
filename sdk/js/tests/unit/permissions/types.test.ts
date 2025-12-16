import { describe, it, expect } from 'vitest'
import {
  levelGrants,
  maxLevel,
  minLevel,
  DEFAULT_PERMISSION_CONFIG,
  PERMISSION_LEVEL_ORDER,
} from '../../../src/permissions/types.js'

describe('permissions/types', () => {
  describe('PERMISSION_LEVEL_ORDER', () => {
    it('should have correct order', () => {
      expect(PERMISSION_LEVEL_ORDER).toEqual(['none', 'read', 'write', 'admin'])
    })
  })

  describe('DEFAULT_PERMISSION_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_PERMISSION_CONFIG.defaultLevel).toBe('read')
      expect(DEFAULT_PERMISSION_CONFIG.defaultAllow).toBe(true)
      expect(DEFAULT_PERMISSION_CONFIG.rules).toEqual([])
      expect(DEFAULT_PERMISSION_CONFIG.enforced).toBe(false)
    })
  })

  describe('levelGrants', () => {
    it('should grant same level', () => {
      expect(levelGrants('read', 'read')).toBe(true)
      expect(levelGrants('write', 'write')).toBe(true)
      expect(levelGrants('admin', 'admin')).toBe(true)
      expect(levelGrants('none', 'none')).toBe(true)
    })

    it('should grant higher level access to lower', () => {
      expect(levelGrants('admin', 'read')).toBe(true)
      expect(levelGrants('admin', 'write')).toBe(true)
      expect(levelGrants('write', 'read')).toBe(true)
      expect(levelGrants('read', 'none')).toBe(true)
    })

    it('should not grant lower level to higher required', () => {
      expect(levelGrants('read', 'write')).toBe(false)
      expect(levelGrants('read', 'admin')).toBe(false)
      expect(levelGrants('write', 'admin')).toBe(false)
      expect(levelGrants('none', 'read')).toBe(false)
    })

    it('should handle none level correctly', () => {
      expect(levelGrants('none', 'none')).toBe(true)
      expect(levelGrants('none', 'read')).toBe(false)
      expect(levelGrants('read', 'none')).toBe(true)
    })
  })

  describe('maxLevel', () => {
    it('should return the higher of two levels', () => {
      expect(maxLevel('read', 'write')).toBe('write')
      expect(maxLevel('write', 'read')).toBe('write')
      expect(maxLevel('admin', 'read')).toBe('admin')
      expect(maxLevel('none', 'read')).toBe('read')
    })

    it('should return same level when equal', () => {
      expect(maxLevel('read', 'read')).toBe('read')
      expect(maxLevel('admin', 'admin')).toBe('admin')
    })
  })

  describe('minLevel', () => {
    it('should return the lower of two levels', () => {
      expect(minLevel('read', 'write')).toBe('read')
      expect(minLevel('write', 'read')).toBe('read')
      expect(minLevel('admin', 'read')).toBe('read')
      expect(minLevel('none', 'read')).toBe('none')
    })

    it('should return same level when equal', () => {
      expect(minLevel('read', 'read')).toBe('read')
      expect(minLevel('admin', 'admin')).toBe('admin')
    })
  })
})

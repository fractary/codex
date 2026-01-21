import { describe, it, expect } from 'vitest'
import {
  parseDuration,
  parseSize,
  formatBytes,
  formatDuration,
  formatSeconds,
  isValidDuration,
  isValidSize,
} from '../../../../src/core/utils/index.js'

describe('Core Utilities', () => {
  describe('parseDuration', () => {
    it('should pass through numeric values', () => {
      expect(parseDuration(3600)).toBe(3600)
      expect(parseDuration(0)).toBe(0)
    })

    it('should parse seconds', () => {
      expect(parseDuration('30s')).toBe(30)
      expect(parseDuration('1s')).toBe(1)
    })

    it('should parse minutes', () => {
      expect(parseDuration('5m')).toBe(300)
      expect(parseDuration('1m')).toBe(60)
    })

    it('should parse hours', () => {
      expect(parseDuration('2h')).toBe(7200)
      expect(parseDuration('1h')).toBe(3600)
      expect(parseDuration('24h')).toBe(86400)
    })

    it('should parse days', () => {
      expect(parseDuration('1d')).toBe(86400)
      expect(parseDuration('7d')).toBe(604800)
    })

    it('should parse weeks', () => {
      expect(parseDuration('1w')).toBe(604800)
      expect(parseDuration('2w')).toBe(1209600)
    })

    it('should parse months (30 days)', () => {
      expect(parseDuration('1M')).toBe(2592000)
    })

    it('should parse years (365 days)', () => {
      expect(parseDuration('1y')).toBe(31536000)
    })

    it('should handle decimal values', () => {
      expect(parseDuration('1.5h')).toBe(5400)
      expect(parseDuration('0.5d')).toBe(43200)
    })

    it('should handle whitespace between number and unit', () => {
      expect(parseDuration('1 h')).toBe(3600)
      expect(parseDuration('30  s')).toBe(30)
    })

    it('should throw error for invalid format', () => {
      expect(() => parseDuration('invalid')).toThrow('Invalid duration format')
      expect(() => parseDuration('1x')).toThrow('Invalid duration format')
      expect(() => parseDuration('abc')).toThrow('Invalid duration format')
      expect(() => parseDuration('')).toThrow('Invalid duration format')
    })

    it('should throw error for missing unit', () => {
      expect(() => parseDuration('123')).toThrow('Invalid duration format')
    })
  })

  describe('parseSize', () => {
    it('should pass through numeric values', () => {
      expect(parseSize(1024)).toBe(1024)
      expect(parseSize(0)).toBe(0)
    })

    it('should parse bytes', () => {
      expect(parseSize('100B')).toBe(100)
      expect(parseSize('1B')).toBe(1)
    })

    it('should parse kilobytes', () => {
      expect(parseSize('1KB')).toBe(1024)
      expect(parseSize('50KB')).toBe(51200)
    })

    it('should parse megabytes', () => {
      expect(parseSize('1MB')).toBe(1048576)
      expect(parseSize('100MB')).toBe(104857600)
    })

    it('should parse gigabytes', () => {
      expect(parseSize('1GB')).toBe(1073741824)
    })

    it('should parse terabytes', () => {
      expect(parseSize('1TB')).toBe(1099511627776)
    })

    it('should handle decimal values', () => {
      expect(parseSize('1.5MB')).toBe(1572864)
      expect(parseSize('0.5GB')).toBe(536870912)
    })

    it('should be case insensitive for units', () => {
      expect(parseSize('100mb')).toBe(104857600)
      expect(parseSize('100Mb')).toBe(104857600)
      expect(parseSize('1gb')).toBe(1073741824)
    })

    it('should handle whitespace between number and unit', () => {
      expect(parseSize('100 MB')).toBe(104857600)
      expect(parseSize('1  GB')).toBe(1073741824)
    })

    it('should throw error for invalid format', () => {
      expect(() => parseSize('invalid')).toThrow('Invalid size format')
      expect(() => parseSize('100')).toThrow('Invalid size format')
      expect(() => parseSize('')).toThrow('Invalid size format')
    })

    it('should throw error for unknown units', () => {
      expect(() => parseSize('100PB')).toThrow('Invalid size format')
      expect(() => parseSize('100XB')).toThrow('Invalid size format')
    })
  })

  describe('formatBytes', () => {
    it('should format bytes', () => {
      expect(formatBytes(100)).toBe('100 B')
      expect(formatBytes(0)).toBe('0 B')
      expect(formatBytes(1023)).toBe('1023 B')
    })

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1.0 KB')
      expect(formatBytes(1536)).toBe('1.5 KB')
      expect(formatBytes(10240)).toBe('10.0 KB')
    })

    it('should format megabytes', () => {
      expect(formatBytes(1048576)).toBe('1.0 MB')
      expect(formatBytes(1572864)).toBe('1.5 MB')
    })

    it('should format gigabytes', () => {
      expect(formatBytes(1073741824)).toBe('1.0 GB')
      expect(formatBytes(1610612736)).toBe('1.5 GB')
    })
  })

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms')
      expect(formatDuration(0)).toBe('0ms')
      expect(formatDuration(999)).toBe('999ms')
    })

    it('should format seconds', () => {
      expect(formatDuration(1000)).toBe('1.0s')
      expect(formatDuration(1500)).toBe('1.5s')
      expect(formatDuration(30000)).toBe('30.0s')
    })

    it('should format minutes', () => {
      expect(formatDuration(60000)).toBe('1.0m')
      expect(formatDuration(90000)).toBe('1.5m')
    })

    it('should format hours', () => {
      expect(formatDuration(3600000)).toBe('1.0h')
      expect(formatDuration(5400000)).toBe('1.5h')
    })
  })

  describe('formatSeconds', () => {
    it('should format seconds', () => {
      expect(formatSeconds(30)).toBe('30s')
      expect(formatSeconds(0)).toBe('0s')
      expect(formatSeconds(59)).toBe('59s')
    })

    it('should format minutes', () => {
      expect(formatSeconds(60)).toBe('1.0m')
      expect(formatSeconds(90)).toBe('1.5m')
    })

    it('should format hours', () => {
      expect(formatSeconds(3600)).toBe('1.0h')
      expect(formatSeconds(5400)).toBe('1.5h')
    })

    it('should format days', () => {
      expect(formatSeconds(86400)).toBe('1.0d')
      expect(formatSeconds(129600)).toBe('1.5d')
    })
  })

  describe('isValidDuration', () => {
    it('should return true for valid duration strings', () => {
      expect(isValidDuration('1s')).toBe(true)
      expect(isValidDuration('5m')).toBe(true)
      expect(isValidDuration('24h')).toBe(true)
      expect(isValidDuration('7d')).toBe(true)
      expect(isValidDuration('1w')).toBe(true)
      expect(isValidDuration('1M')).toBe(true)
      expect(isValidDuration('1y')).toBe(true)
    })

    it('should return true for decimal durations', () => {
      expect(isValidDuration('1.5h')).toBe(true)
    })

    it('should return false for invalid duration strings', () => {
      expect(isValidDuration('invalid')).toBe(false)
      expect(isValidDuration('100')).toBe(false)
      expect(isValidDuration('')).toBe(false)
      expect(isValidDuration('1x')).toBe(false)
    })
  })

  describe('isValidSize', () => {
    it('should return true for valid size strings', () => {
      expect(isValidSize('100B')).toBe(true)
      expect(isValidSize('50KB')).toBe(true)
      expect(isValidSize('100MB')).toBe(true)
      expect(isValidSize('1GB')).toBe(true)
      expect(isValidSize('1TB')).toBe(true)
    })

    it('should return true for decimal sizes', () => {
      expect(isValidSize('1.5MB')).toBe(true)
    })

    it('should be case insensitive', () => {
      expect(isValidSize('100mb')).toBe(true)
      expect(isValidSize('100Mb')).toBe(true)
    })

    it('should return false for invalid size strings', () => {
      expect(isValidSize('invalid')).toBe(false)
      expect(isValidSize('100')).toBe(false)
      expect(isValidSize('')).toBe(false)
      expect(isValidSize('100PB')).toBe(false)
    })
  })
})

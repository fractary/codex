/**
 * Core Utilities
 *
 * Common utility functions for parsing durations, sizes, and other values.
 */

/**
 * Duration unit multipliers in seconds
 */
const DURATION_MULTIPLIERS: Record<string, number> = {
  s: 1, // seconds
  m: 60, // minutes
  h: 3600, // hours
  d: 86400, // days
  w: 604800, // weeks (7 days)
  M: 2592000, // months (30 days)
  y: 31536000, // years (365 days)
}

/**
 * Size unit multipliers in bytes
 */
const SIZE_MULTIPLIERS: Record<string, number> = {
  B: 1,
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
  TB: 1024 * 1024 * 1024 * 1024,
}

/**
 * Parse a duration string to seconds
 *
 * Supports formats like: "1h", "24h", "7d", "1w", "1M", "1y"
 *
 * @example
 * ```typescript
 * parseDuration('30s')  // => 30
 * parseDuration('5m')   // => 300
 * parseDuration('2h')   // => 7200
 * parseDuration('7d')   // => 604800
 * parseDuration('1w')   // => 604800
 * parseDuration('1M')   // => 2592000
 * parseDuration('1y')   // => 31536000
 * parseDuration(3600)   // => 3600 (pass-through)
 * ```
 *
 * @param duration - Duration string or number
 * @returns Duration in seconds
 * @throws Error if the format is invalid
 */
export function parseDuration(duration: string | number): number {
  if (typeof duration === 'number') {
    return duration
  }

  const match = duration.match(/^(\d+(?:\.\d+)?)\s*([smhdwMy])$/)
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid duration format: ${duration}. Use format like "1h", "7d", "1M"`)
  }

  const valueStr = match[1]
  const unit = match[2]
  const value = parseFloat(valueStr)
  const multiplier = DURATION_MULTIPLIERS[unit]

  if (multiplier === undefined) {
    throw new Error(`Unknown duration unit: ${unit}`)
  }

  return Math.round(value * multiplier)
}

/**
 * Parse a size string to bytes
 *
 * Supports formats like: "100B", "50KB", "100MB", "1GB", "1TB"
 *
 * @example
 * ```typescript
 * parseSize('100B')   // => 100
 * parseSize('50KB')   // => 51200
 * parseSize('100MB')  // => 104857600
 * parseSize('1GB')    // => 1073741824
 * parseSize(1024)     // => 1024 (pass-through)
 * ```
 *
 * @param size - Size string or number
 * @returns Size in bytes
 * @throws Error if the format is invalid
 */
export function parseSize(size: string | number): number {
  if (typeof size === 'number') {
    return size
  }

  const match = size.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)$/i)
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid size format: ${size}. Use format like "100MB", "1GB"`)
  }

  const valueStr = match[1]
  const unit = match[2]
  const value = parseFloat(valueStr)
  const multiplier = SIZE_MULTIPLIERS[unit.toUpperCase()]

  if (multiplier === undefined) {
    throw new Error(`Unknown size unit: ${unit}`)
  }

  return Math.round(value * multiplier)
}

/**
 * Format bytes to human-readable size
 *
 * @example
 * ```typescript
 * formatBytes(100)        // => '100 B'
 * formatBytes(1024)       // => '1.0 KB'
 * formatBytes(1536)       // => '1.5 KB'
 * formatBytes(1048576)    // => '1.0 MB'
 * formatBytes(1073741824) // => '1.0 GB'
 * ```
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/**
 * Format duration in milliseconds to human-readable string
 *
 * @example
 * ```typescript
 * formatDuration(500)    // => '500ms'
 * formatDuration(1500)   // => '1.5s'
 * formatDuration(60000)  // => '1.0m'
 * formatDuration(3600000) // => '1.0h'
 * ```
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`
  return `${(ms / 3600000).toFixed(1)}h`
}

/**
 * Format seconds to human-readable duration string
 *
 * @example
 * ```typescript
 * formatSeconds(30)     // => '30s'
 * formatSeconds(90)     // => '1.5m'
 * formatSeconds(3600)   // => '1.0h'
 * formatSeconds(86400)  // => '1.0d'
 * ```
 */
export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`
  return `${(seconds / 86400).toFixed(1)}d`
}

/**
 * Check if a value is a valid duration string
 */
export function isValidDuration(value: string): boolean {
  return /^\d+(?:\.\d+)?\s*[smhdwMy]$/.test(value)
}

/**
 * Check if a value is a valid size string
 */
export function isValidSize(value: string): boolean {
  return /^\d+(?:\.\d+)?\s*(B|KB|MB|GB|TB)$/i.test(value)
}

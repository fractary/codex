/**
 * Cache commands
 *
 * Top-level commands for managing the codex document cache:
 * - cache-list: View cached entries
 * - cache-clear: Remove cache entries
 * - cache-stats: Display cache statistics
 * - cache-health: Diagnostics and auto-repair
 */

// Re-export cache commands
export { cacheListCommand } from './list.js';
export { cacheClearCommand } from './clear.js';
export { cacheStatsCommand } from './stats.js';
export { cacheHealthCommand } from './health.js';

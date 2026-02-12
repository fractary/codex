/**
 * Memory module - Institutional memory for Codex
 *
 * Provides memory search, creation, and management capabilities
 * for cross-project knowledge sharing.
 *
 * @example
 * ```typescript
 * import { MemorySearcher, MemoryWriter } from '@fractary/codex/memory'
 *
 * // Search for relevant memories
 * const searcher = new MemorySearcher('/path/to/project')
 * const results = searcher.search({
 *   memory_type: 'troubleshooting',
 *   phase: 'build',
 *   text: 'Cannot find module',
 * })
 *
 * // Create a new memory
 * const writer = new MemoryWriter('/path/to/project')
 * const result = writer.write({
 *   memory_type: 'troubleshooting',
 *   title: 'ESM import extension required',
 *   description: 'Node.js ESM requires .js extensions on imports',
 *   body: '# ESM Import Extension\n\n...',
 *   frontmatter: { severity: 'medium', tags: ['esm', 'imports'] },
 * })
 * ```
 */

// Types
export {
  type MemoryType,
  type MemoryStatus,
  type MemoryFrontmatter,
  type MemoryIndex,
  type MemoryIndexEntry,
  type MemorySearchQuery,
  type MemorySearchResult,
  type MemoryWriteOptions,
  type MemoryWriteResult,
  type MemoryConfig,
  MEMORY_TYPE_PREFIXES,
  DEFAULT_MEMORY_CONFIG,
} from './types.js'

// Searcher
export { MemorySearcher } from './searcher.js'

// Writer
export { MemoryWriter } from './writer.js'

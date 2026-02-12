/**
 * Memory module types
 *
 * TypeScript interfaces for the Codex Memory System (institutional memory).
 * Based on SPEC-00034: Codex Memory System.
 */

/**
 * Supported memory types
 */
export type MemoryType =
  | 'troubleshooting'
  | 'architectural-decision'
  | 'performance'
  | 'pattern'
  | 'integration'
  | 'convention'

/**
 * Memory lifecycle status
 */
export type MemoryStatus = 'draft' | 'unverified' | 'verified' | 'deprecated'

/**
 * Memory type prefix mapping for ID generation
 */
export const MEMORY_TYPE_PREFIXES: Record<MemoryType, string> = {
  'troubleshooting': 'TS',
  'architectural-decision': 'AD',
  'performance': 'PF',
  'pattern': 'PT',
  'integration': 'IN',
  'convention': 'CV',
}

/**
 * Frontmatter schema for memory files
 */
export interface MemoryFrontmatter {
  // Standard codex fields
  title: string
  description: string
  tags?: string[]
  visibility?: 'public' | 'internal' | 'private'
  created: string
  updated?: string
  codex_sync_include?: string[]
  codex_sync_exclude?: string[]

  // Memory-specific fields
  memory_type: MemoryType
  memory_id: string
  category?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  status: MemoryStatus

  // Search hints
  symptoms?: string[]
  keywords?: string[]

  // Applicability
  agents?: string[]
  phases?: string[]
  languages?: string[]
  frameworks?: string[]

  // Metrics
  success_count?: number
  last_used?: string
  usage_count?: number
  confidence?: number

  // Audit
  last_audited?: string
  deprecated_reason?: string
  superseded_by?: string

  // Legacy compatibility
  id?: string
  verified?: boolean
  phase?: string
  agent?: string
}

/**
 * Entry in the frontmatter index cache
 */
export interface MemoryIndexEntry {
  file_path: string
  mtime: string
  source: 'local' | string
  frontmatter: MemoryFrontmatter
}

/**
 * Frontmatter index cache structure
 */
export interface MemoryIndex {
  version: number
  built_at: string
  entries: MemoryIndexEntry[]
}

/**
 * Search query parameters
 */
export interface MemorySearchQuery {
  /** Free-text search against symptoms/keywords/description */
  text?: string
  /** Filter by memory type */
  memory_type?: MemoryType
  /** Filter by problem category */
  category?: string
  /** Filter by workflow phase */
  phase?: string
  /** Filter by agent name */
  agent?: string
  /** Filter by tags */
  tags?: string[]
  /** Filter by status */
  status?: MemoryStatus
  /** Maximum results to return (default: 20) */
  limit?: number
}

/**
 * Search result with scoring and source attribution
 */
export interface MemorySearchResult {
  entry: MemoryIndexEntry
  score: number
  source: 'local' | string
  filePath: string
}

/**
 * Options for writing a memory
 */
export interface MemoryWriteOptions {
  memory_type: MemoryType
  title: string
  description: string
  body: string
  frontmatter: Partial<MemoryFrontmatter>
  template?: string
}

/**
 * Result of writing a memory
 */
export interface MemoryWriteResult {
  memory_id: string
  file_path: string
  deduplicated: boolean
  existing_id?: string
}

/**
 * Configuration for memory operations
 */
export interface MemoryConfig {
  /** Root directory for project memories */
  memoryDir: string
  /** Cache directory for index and synced memories */
  cacheDir: string
  /** Glob patterns for synced memory locations */
  syncedMemoryPatterns: string[]
}

/**
 * Default memory configuration
 */
export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  memoryDir: '.fractary/codex/memory',
  cacheDir: '.fractary/codex/cache',
  syncedMemoryPatterns: [
    '.fractary/codex/cache/projects/*/*/.fractary/codex/memory/**/*.md',
  ],
}

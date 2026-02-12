/**
 * MemorySearcher - Cascading search across memory sources
 *
 * Searches project memories first, then expands to synced memories
 * from other projects in the codex cache. Uses a frontmatter index
 * cache for performance.
 *
 * Based on SPEC-00034: Codex Memory System.
 */

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname, resolve, relative } from 'path'
import {
  type MemoryConfig,
  type MemoryIndex,
  type MemoryIndexEntry,
  type MemorySearchQuery,
  type MemorySearchResult,
  type MemoryFrontmatter,
  DEFAULT_MEMORY_CONFIG,
} from './types.js'

/**
 * Parse YAML frontmatter from a markdown file's content
 *
 * Extracts the YAML block between --- delimiters without
 * requiring a full YAML parser (simple key-value extraction).
 */
function parseFrontmatter(content: string): MemoryFrontmatter | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return null

  const yaml = match[1]
  const frontmatter: Record<string, unknown> = {}

  let currentKey = ''
  let inArray = false
  let arrayValues: string[] = []

  for (const line of yaml.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    // Array item
    if (trimmed.startsWith('- ') && inArray) {
      let value = trimmed.slice(2).trim()
      // Strip quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      arrayValues.push(value)
      continue
    }

    // If we were collecting an array, save it
    if (inArray && currentKey) {
      frontmatter[currentKey] = arrayValues
      inArray = false
      arrayValues = []
      currentKey = ''
    }

    // Key-value pair
    const kvMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/)
    if (kvMatch) {
      const key = kvMatch[1]
      let value = kvMatch[2].trim()

      if (value === '' || value === '[]') {
        // Could be start of array block or empty value
        // Peek: if next meaningful line starts with -, it's an array
        currentKey = key
        inArray = true
        arrayValues = []
        if (value === '[]') {
          frontmatter[key] = []
          inArray = false
          currentKey = ''
        }
        continue
      }

      // Strip quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      // Parse booleans and numbers
      if (value === 'true') frontmatter[key] = true
      else if (value === 'false') frontmatter[key] = false
      else if (value === 'null') frontmatter[key] = null
      else if (/^-?\d+$/.test(value)) frontmatter[key] = parseInt(value, 10)
      else if (/^-?\d+\.\d+$/.test(value)) frontmatter[key] = parseFloat(value)
      else frontmatter[key] = value
    }
  }

  // Final array flush
  if (inArray && currentKey) {
    frontmatter[currentKey] = arrayValues
  }

  if (!frontmatter.title && !frontmatter.memory_id && !frontmatter.id) {
    return null
  }

  return frontmatter as unknown as MemoryFrontmatter
}

/**
 * Recursively find all .md files in a directory
 */
function findMarkdownFiles(dir: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results

  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...findMarkdownFiles(fullPath))
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(fullPath)
      }
    }
  } catch {
    // Permission errors or missing dirs
  }

  return results
}

/**
 * Find synced memory files using configured patterns
 */
function findSyncedMemoryFiles(cacheDir: string): Array<{ path: string; source: string }> {
  const results: Array<{ path: string; source: string }> = []
  const projectsDir = join(cacheDir, 'projects')

  if (!existsSync(projectsDir)) return results

  try {
    // Traverse: projects/{org}/{project}/.fractary/codex/memory/
    const orgs = readdirSync(projectsDir, { withFileTypes: true })
    for (const org of orgs) {
      if (!org.isDirectory()) continue
      const orgDir = join(projectsDir, org.name)
      const projects = readdirSync(orgDir, { withFileTypes: true })
      for (const project of projects) {
        if (!project.isDirectory()) continue
        const memoryDir = join(orgDir, project.name, '.fractary', 'codex', 'memory')
        if (!existsSync(memoryDir)) continue
        const files = findMarkdownFiles(memoryDir)
        const source = `${org.name}/${project.name}`
        for (const file of files) {
          results.push({ path: file, source })
        }
      }
    }
  } catch {
    // Permission errors
  }

  return results
}

/**
 * MemorySearcher provides cascading search across memory sources
 */
export class MemorySearcher {
  private config: MemoryConfig
  private projectRoot: string

  constructor(projectRoot: string, config?: Partial<MemoryConfig>) {
    this.projectRoot = projectRoot
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config }
  }

  /**
   * Search memories with cascading scope
   *
   * 1. Project memories (highest priority)
   * 2. Synced memories from other projects
   */
  search(query: MemorySearchQuery): MemorySearchResult[] {
    const index = this.loadOrRebuildIndex()

    // Filter by explicit criteria
    let candidates = index.entries.filter(entry => {
      const fm = entry.frontmatter
      if (query.memory_type && fm.memory_type !== query.memory_type) return false
      if (query.category && fm.category !== query.category) return false
      if (query.phase) {
        const phases = fm.phases || (fm.phase ? [fm.phase] : [])
        if (!phases.includes(query.phase)) return false
      }
      if (query.agent) {
        const agents = fm.agents || (fm.agent ? [fm.agent] : [])
        if (!agents.includes(query.agent)) return false
      }
      if (query.tags && query.tags.length > 0) {
        if (!fm.tags || !query.tags.some(t => fm.tags!.includes(t))) return false
      }
      if (query.status && fm.status !== query.status) return false
      return true
    })

    // Score candidates
    const scored: MemorySearchResult[] = candidates.map(entry => ({
      entry,
      score: this.calculateRelevanceScore(entry, query),
      source: entry.source,
      filePath: entry.file_path,
    }))

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score)

    // Return top N
    const limit = query.limit || 20
    return scored.slice(0, limit)
  }

  /**
   * Calculate relevance score for a memory entry
   */
  private calculateRelevanceScore(entry: MemoryIndexEntry, query: MemorySearchQuery): number {
    const fm = entry.frontmatter
    let score = 0

    // Base score from success count (0-40 points)
    score += Math.min((fm.success_count || 0) * 2, 40)

    // Verified status bonus (10 points)
    if (fm.status === 'verified' || fm.verified === true) {
      score += 10
    }

    // Agent match boost (20 points)
    if (query.agent) {
      const agents = fm.agents || (fm.agent ? [fm.agent] : [])
      if (agents.includes(query.agent)) {
        score += 20
      }
    }

    // Phase match boost (10 points)
    if (query.phase) {
      const phases = fm.phases || (fm.phase ? [fm.phase] : [])
      if (phases.includes(query.phase)) {
        score += 10
      }
    }

    // Source priority (local = 10, synced = 5)
    score += entry.source === 'local' ? 10 : 5

    // Text-based matching against symptoms and keywords
    if (query.text) {
      const queryLower = query.text.toLowerCase()

      // Symptom match (15 points)
      if (fm.symptoms && fm.symptoms.some(s => s.toLowerCase().includes(queryLower) || queryLower.includes(s.toLowerCase()))) {
        score += 15
      }

      // Keyword match (5 points)
      if (fm.keywords && fm.keywords.some(k => queryLower.includes(k.toLowerCase()))) {
        score += 5
      }

      // Description match (8 points)
      if (fm.description && fm.description.toLowerCase().includes(queryLower)) {
        score += 8
      }

      // Title match (5 points)
      if (fm.title && fm.title.toLowerCase().includes(queryLower)) {
        score += 5
      }
    }

    return score
  }

  /**
   * Load the frontmatter index from cache, or rebuild if stale
   */
  private loadOrRebuildIndex(): MemoryIndex {
    const indexPath = join(this.projectRoot, this.config.cacheDir, 'memory-index.json')

    // Try to load existing index
    let existingIndex: MemoryIndex | null = null
    if (existsSync(indexPath)) {
      try {
        const raw = readFileSync(indexPath, 'utf-8')
        existingIndex = JSON.parse(raw) as MemoryIndex
      } catch {
        existingIndex = null
      }
    }

    // Check if any memory file is newer than the index
    const memoryDir = join(this.projectRoot, this.config.memoryDir)
    const localFiles = findMarkdownFiles(memoryDir)
    const syncedFiles = findSyncedMemoryFiles(join(this.projectRoot, this.config.cacheDir))

    const needsRebuild = !existingIndex || this.isIndexStale(existingIndex, localFiles, syncedFiles.map(f => f.path))

    if (!needsRebuild && existingIndex) {
      return existingIndex
    }

    // Rebuild index
    return this.rebuildIndex(localFiles, syncedFiles, indexPath)
  }

  /**
   * Check if the index is stale (any source file newer than index)
   */
  private isIndexStale(index: MemoryIndex, localFiles: string[], syncedFilePaths: string[]): boolean {
    const indexTime = new Date(index.built_at).getTime()
    const allFiles = [...localFiles, ...syncedFilePaths]

    for (const file of allFiles) {
      try {
        const stat = statSync(file)
        if (stat.mtimeMs > indexTime) return true
      } catch {
        // File may have been removed
      }
    }

    // Also check if files were added or removed
    const indexedPaths = new Set(index.entries.map(e => e.file_path))
    for (const file of allFiles) {
      if (!indexedPaths.has(file)) return true
    }

    return false
  }

  /**
   * Rebuild the frontmatter index from all memory sources
   */
  private rebuildIndex(
    localFiles: string[],
    syncedFiles: Array<{ path: string; source: string }>,
    indexPath: string,
  ): MemoryIndex {
    const entries: MemoryIndexEntry[] = []

    // Index local memories
    for (const file of localFiles) {
      const entry = this.indexFile(file, 'local')
      if (entry) entries.push(entry)
    }

    // Index synced memories
    for (const { path, source } of syncedFiles) {
      const entry = this.indexFile(path, source)
      if (entry) entries.push(entry)
    }

    const index: MemoryIndex = {
      version: 1,
      built_at: new Date().toISOString(),
      entries,
    }

    // Persist to cache
    try {
      const dir = dirname(indexPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8')
    } catch {
      // Cache write failure is non-fatal
    }

    return index
  }

  /**
   * Index a single memory file by parsing its frontmatter
   */
  private indexFile(filePath: string, source: string): MemoryIndexEntry | null {
    try {
      const content = readFileSync(filePath, 'utf-8')
      const frontmatter = parseFrontmatter(content)
      if (!frontmatter) return null

      const stat = statSync(filePath)

      return {
        file_path: filePath,
        mtime: stat.mtime.toISOString(),
        source,
        frontmatter,
      }
    } catch {
      return null
    }
  }

  /**
   * Invalidate the index cache (call after writing memories)
   */
  invalidateIndex(): void {
    const indexPath = join(this.projectRoot, this.config.cacheDir, 'memory-index.json')
    try {
      if (existsSync(indexPath)) {
        const { unlinkSync } = require('fs')
        unlinkSync(indexPath)
      }
    } catch {
      // Non-fatal
    }
  }
}

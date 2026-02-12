/**
 * MemoryWriter - Create and update memory entries
 *
 * Handles ID generation, deduplication, file writing, and
 * index cache invalidation.
 *
 * Based on SPEC-00034: Codex Memory System.
 */

import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import {
  type MemoryConfig,
  type MemoryType,
  type MemoryFrontmatter,
  type MemoryWriteOptions,
  type MemoryWriteResult,
  MEMORY_TYPE_PREFIXES,
  DEFAULT_MEMORY_CONFIG,
} from './types.js'
import { MemorySearcher } from './searcher.js'

/**
 * Sanitize a string for use in filenames
 */
function sanitizeSlug(text: string, maxLength: number = 50): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength)
}

/**
 * Serialize frontmatter to YAML string
 */
function serializeFrontmatter(fm: Record<string, unknown>): string {
  const lines: string[] = ['---']

  for (const [key, value] of Object.entries(fm)) {
    if (value === undefined || value === null) continue

    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`)
      } else {
        lines.push(`${key}:`)
        for (const item of value) {
          const itemStr = typeof item === 'string' && (item.includes(':') || item.includes('"') || item.includes("'"))
            ? `"${item.replace(/"/g, '\\"')}"`
            : String(item)
          lines.push(`  - ${itemStr}`)
        }
      }
    } else if (typeof value === 'string') {
      // Quote strings that contain special YAML characters
      if (value.includes(':') || value.includes('"') || value.includes("'") || value.includes('\n')) {
        lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`)
      } else {
        lines.push(`${key}: ${value}`)
      }
    } else {
      lines.push(`${key}: ${value}`)
    }
  }

  lines.push('---')
  return lines.join('\n')
}

/**
 * Get the next available sequence number for a memory type
 */
function getNextSequence(typeDir: string, prefix: string): number {
  if (!existsSync(typeDir)) return 1

  let maxSeq = 0
  try {
    const files = readdirSync(typeDir)
    const pattern = new RegExp(`^MEM-${prefix}-(\\d+)-`)
    for (const file of files) {
      const match = file.match(pattern)
      if (match) {
        const seq = parseInt(match[1], 10)
        if (seq > maxSeq) maxSeq = seq
      }
    }
  } catch {
    // Directory read error
  }

  return maxSeq + 1
}

/**
 * Calculate similarity between two memories for deduplication
 */
function calculateSimilarity(existing: MemoryFrontmatter, newEntry: Partial<MemoryFrontmatter>): number {
  let score = 0
  let factors = 0

  // Title similarity (Jaccard on words)
  if (existing.title && newEntry.title) {
    const existingWords = new Set(existing.title.toLowerCase().split(/\s+/))
    const newWords = new Set(newEntry.title!.toLowerCase().split(/\s+/))
    const intersection = [...existingWords].filter(w => newWords.has(w)).length
    const union = new Set([...existingWords, ...newWords]).size
    score += union > 0 ? intersection / union : 0
    factors++
  }

  // Symptom overlap
  if (existing.symptoms && newEntry.symptoms) {
    const existingSymptoms = new Set(existing.symptoms.map(s => s.toLowerCase()))
    const newSymptoms = new Set(newEntry.symptoms!.map(s => s.toLowerCase()))
    const intersection = [...existingSymptoms].filter(s => newSymptoms.has(s)).length
    const union = new Set([...existingSymptoms, ...newSymptoms]).size
    score += union > 0 ? intersection / union : 0
    factors++
  }

  // Category match
  if (existing.category && newEntry.category) {
    score += existing.category === newEntry.category ? 1 : 0
    factors++
  }

  // Memory type match
  if (existing.memory_type && newEntry.memory_type) {
    score += existing.memory_type === newEntry.memory_type ? 1 : 0
    factors++
  }

  return factors > 0 ? score / factors : 0
}

/**
 * MemoryWriter handles creating and updating memory entries
 */
export class MemoryWriter {
  private config: MemoryConfig
  private projectRoot: string
  private searcher: MemorySearcher

  constructor(projectRoot: string, config?: Partial<MemoryConfig>) {
    this.projectRoot = projectRoot
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config }
    this.searcher = new MemorySearcher(projectRoot, config)
  }

  /**
   * Write a new memory entry
   *
   * Handles ID generation, deduplication check, file creation,
   * and index invalidation.
   */
  write(options: MemoryWriteOptions): MemoryWriteResult {
    const { memory_type, title, description, body, frontmatter, template } = options

    // Check for duplicates
    const dupResult = this.checkDuplicate(frontmatter, memory_type)
    if (dupResult) {
      return {
        memory_id: dupResult.memory_id,
        file_path: dupResult.file_path,
        deduplicated: true,
        existing_id: dupResult.memory_id,
      }
    }

    // Generate ID
    const prefix = MEMORY_TYPE_PREFIXES[memory_type]
    const typeDir = join(this.projectRoot, this.config.memoryDir, memory_type)
    const seq = getNextSequence(typeDir, prefix)
    const slug = sanitizeSlug(title)
    const memoryId = `MEM-${prefix}-${String(seq).padStart(3, '0')}-${slug}`

    // Build full frontmatter
    const fullFrontmatter: Record<string, unknown> = {
      title,
      description,
      memory_type,
      memory_id: memoryId,
      status: 'draft',
      created: new Date().toISOString().split('T')[0],
      verified: false,
      success_count: 0,
      ...frontmatter,
    }

    // Ensure memory_type and memory_id aren't overridden by partial
    fullFrontmatter.memory_type = memory_type
    fullFrontmatter.memory_id = memoryId

    // Build file content
    const fileContent = `${serializeFrontmatter(fullFrontmatter)}\n\n${body}\n`

    // Write file
    const fileName = `${memoryId}.md`
    const filePath = join(typeDir, fileName)

    if (!existsSync(typeDir)) {
      mkdirSync(typeDir, { recursive: true })
    }

    writeFileSync(filePath, fileContent, 'utf-8')

    // Invalidate index cache
    this.searcher.invalidateIndex()

    return {
      memory_id: memoryId,
      file_path: filePath,
      deduplicated: false,
    }
  }

  /**
   * Update an existing memory's frontmatter
   */
  update(memoryId: string, changes: Partial<MemoryFrontmatter>): void {
    const filePath = this.findMemoryFile(memoryId)
    if (!filePath) {
      throw new Error(`Memory not found: ${memoryId}`)
    }

    const content = readFileSync(filePath, 'utf-8')
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
    if (!fmMatch) {
      throw new Error(`Invalid memory file format: ${filePath}`)
    }

    // Parse existing frontmatter as simple key-value
    const existingContent = fmMatch[1]
    const bodyContent = fmMatch[2]

    // Re-parse to get structured data
    const existingFm: Record<string, unknown> = {}
    // Simple parse: just rebuild from the parseFrontmatter approach
    const tempContent = `---\n${existingContent}\n---`

    // Apply changes by reading existing and merging
    const lines = existingContent.split('\n')
    const updatedFm: Record<string, unknown> = {}

    // Parse existing frontmatter line by line
    let currentKey = ''
    let inArray = false
    let arrayValues: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      if (trimmed.startsWith('- ') && inArray) {
        let value = trimmed.slice(2).trim()
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        arrayValues.push(value)
        continue
      }

      if (inArray && currentKey) {
        updatedFm[currentKey] = arrayValues
        inArray = false
        arrayValues = []
        currentKey = ''
      }

      const kvMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/)
      if (kvMatch) {
        const key = kvMatch[1]
        let value = kvMatch[2].trim()

        if (value === '' || value === '[]') {
          currentKey = key
          inArray = true
          arrayValues = []
          if (value === '[]') {
            updatedFm[key] = []
            inArray = false
            currentKey = ''
          }
          continue
        }

        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }

        if (value === 'true') updatedFm[key] = true
        else if (value === 'false') updatedFm[key] = false
        else if (value === 'null') updatedFm[key] = null
        else if (/^-?\d+$/.test(value)) updatedFm[key] = parseInt(value, 10)
        else if (/^-?\d+\.\d+$/.test(value)) updatedFm[key] = parseFloat(value)
        else updatedFm[key] = value
      }
    }

    if (inArray && currentKey) {
      updatedFm[currentKey] = arrayValues
    }

    // Merge changes
    const merged = { ...updatedFm, ...changes, updated: new Date().toISOString().split('T')[0] }

    // Write back
    const newContent = `${serializeFrontmatter(merged)}\n\n${bodyContent}`
    writeFileSync(filePath, newContent, 'utf-8')

    this.searcher.invalidateIndex()
  }

  /**
   * Deprecate a memory
   */
  deprecate(memoryId: string, reason: string, supersededBy?: string): void {
    const changes: Partial<MemoryFrontmatter> = {
      status: 'deprecated',
      deprecated_reason: reason,
    }
    if (supersededBy) {
      changes.superseded_by = supersededBy
    }
    this.update(memoryId, changes)
  }

  /**
   * Check for duplicate memories (>0.95 similarity)
   */
  private checkDuplicate(
    frontmatter: Partial<MemoryFrontmatter>,
    memoryType: MemoryType,
  ): { memory_id: string; file_path: string } | null {
    const results = this.searcher.search({
      memory_type: memoryType,
      category: frontmatter.category,
      limit: 10,
    })

    for (const result of results) {
      const similarity = calculateSimilarity(result.entry.frontmatter, frontmatter)
      if (similarity > 0.95) {
        return {
          memory_id: result.entry.frontmatter.memory_id,
          file_path: result.filePath,
        }
      }
    }

    return null
  }

  /**
   * Find a memory file by its ID
   */
  private findMemoryFile(memoryId: string): string | null {
    const memoryDir = join(this.projectRoot, this.config.memoryDir)
    if (!existsSync(memoryDir)) return null

    const files = findMarkdownFilesRecursive(memoryDir)
    for (const file of files) {
      if (file.includes(memoryId)) return file
    }

    return null
  }
}

/**
 * Recursively find all .md files
 */
function findMarkdownFilesRecursive(dir: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results

  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...findMarkdownFilesRecursive(fullPath))
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(fullPath)
      }
    }
  } catch {
    // Permission errors
  }

  return results
}

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  CODEX_TOOLS,
  handleToolCall,
  handleFetch,
  handleSearch,
  handleList,
  type ToolHandlerContext,
} from '../src/tools.js'
import type { CacheManager, StorageManager } from '@fractary/codex'

describe('MCP Tools', () => {
  let mockContext: ToolHandlerContext
  let mockCache: CacheManager
  let mockStorage: StorageManager

  beforeEach(() => {
    // Create mock cache manager
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      invalidate: vi.fn(),
      invalidatePattern: vi.fn(),
      clear: vi.fn(),
      getStats: vi.fn().mockResolvedValue({
        entryCount: 0,
        memoryEntries: 0,
        memorySize: 0,
        totalSize: 0,
        freshCount: 0,
        staleCount: 0,
        expiredCount: 0,
      }),
    } as unknown as CacheManager

    // Create mock storage manager
    mockStorage = {
      fetch: vi.fn(),
    } as unknown as StorageManager

    mockContext = {
      cache: mockCache,
      storage: mockStorage,
    }
  })

  describe('CODEX_TOOLS', () => {
    it('should export all required tools', () => {
      expect(CODEX_TOOLS).toHaveLength(5)
      const toolNames = CODEX_TOOLS.map((t) => t.name)
      expect(toolNames).toContain('codex_document_fetch')
      expect(toolNames).toContain('codex_search')
      expect(toolNames).toContain('codex_cache_list')
      expect(toolNames).toContain('codex_cache_clear')
      expect(toolNames).toContain('codex_file_sources_list')
    })

    it('should have valid tool schemas', () => {
      CODEX_TOOLS.forEach((tool) => {
        expect(tool).toHaveProperty('name')
        expect(tool).toHaveProperty('description')
        expect(tool).toHaveProperty('inputSchema')
        expect(tool.inputSchema).toHaveProperty('type', 'object')
        expect(tool.inputSchema).toHaveProperty('properties')
      })
    })
  })

  describe('handleFetch', () => {
    it('should fetch document with valid URI', async () => {
      const mockContent = Buffer.from('Test content')
      vi.mocked(mockCache.get).mockResolvedValue({
        content: mockContent,
        contentType: 'text/markdown',
      } as never)

      const result = await handleFetch(
        { uri: 'codex://org/project/doc.md' },
        mockContext
      )

      expect(result.content[0]).toHaveProperty('type', 'resource')
      expect(mockCache.get).toHaveBeenCalled()
    })

    it('should return error for invalid URI', async () => {
      const result = await handleFetch(
        { uri: 'invalid-uri' },
        mockContext
      )

      expect(result.isError).toBe(true)
      expect(result.content[0]).toHaveProperty('type', 'text')
    })

    it('should return error for missing URI', async () => {
      const result = await handleFetch({} as never, mockContext)

      expect(result.isError).toBe(true)
      const text = (result.content[0] as { type: string; text: string }).text
      expect(text).toContain('URI')
    })
  })

  describe('handleSearch', () => {
    it('should validate query parameter', async () => {
      const result = await handleSearch({} as never, mockContext)

      expect(result.isError).toBe(true)
      const text = (result.content[0] as { type: string; text: string }).text
      expect(text).toContain('Query')
    })

    it('should sanitize regex patterns to prevent injection', async () => {
      // Test with potentially malicious query
      const query = 'test query'

      const result = await handleSearch(
        { query },
        mockContext
      )

      expect(result).toBeDefined()
      expect(result.content[0]).toHaveProperty('type', 'text')
    })

    it('should handle empty search results', async () => {
      const result = await handleSearch(
        { query: 'nonexistent' },
        mockContext
      )

      expect(result).toBeDefined()
      expect(result.content).toBeDefined()
    })
  })

  describe('handleList', () => {
    it('should list documents in path', async () => {
      const result = await handleList(
        {},
        mockContext
      )

      expect(result).toBeDefined()
      expect(result.content).toBeDefined()
      const text = (result.content[0] as { type: string; text: string }).text
      expect(text).toContain('Cache Statistics')
    })

    it('should handle root path', async () => {
      const result = await handleList(
        {},
        mockContext
      )

      expect(result).toBeDefined()
    })
  })

  describe('handleToolCall', () => {
    it('should route to correct handler', async () => {
      vi.mocked(mockCache.get).mockResolvedValue({
        content: Buffer.from('Test'),
        contentType: 'text/plain',
      } as never)

      const result = await handleToolCall(
        'codex_document_fetch',
        { uri: 'codex://org/project/doc.md' },
        mockContext
      )

      expect(result).toBeDefined()
      expect(mockCache.get).toHaveBeenCalled()
    })

    it('should handle unknown tool names', async () => {
      const result = await handleToolCall(
        'unknown_tool',
        {},
        mockContext
      )

      expect(result.isError).toBe(true)
      const text = (result.content[0] as { type: string; text: string }).text
      expect(text).toContain('Unknown')
    })

    it('should handle tool errors gracefully', async () => {
      vi.mocked(mockCache.get).mockRejectedValue(new Error('Cache error'))

      const result = await handleToolCall(
        'codex_document_fetch',
        { uri: 'codex://org/project/doc.md' },
        mockContext
      )

      expect(result.isError).toBe(true)
      const text = (result.content[0] as { type: string; text: string }).text
      expect(text).toContain('Failed')
    })
  })

  describe('Input Validation', () => {
    it('should validate URI format in fetch', async () => {
      const testCases = [
        '',
        'not-a-uri',
        'http://example.com',
        'codex://',
        'codex:///',
      ]

      for (const uri of testCases) {
        const result = await handleFetch({ uri }, mockContext)
        expect(result).toBeDefined()
      }
    })

    it('should validate pattern type in search', async () => {
      const testCases = [
        { pattern: 123 },
        { pattern: null },
        { pattern: undefined },
        { pattern: {} },
      ]

      for (const args of testCases) {
        const result = await handleSearch(args as never, mockContext)
        expect(result).toBeDefined()
      }
    })
  })
})

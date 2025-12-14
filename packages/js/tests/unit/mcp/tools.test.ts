import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  CODEX_TOOLS,
  handleFetch,
  handleSearch,
  handleList,
  handleInvalidate,
  handleToolCall,
  type ToolHandlerContext,
} from '../../../src/mcp/tools.js'
import type { CacheManager } from '../../../src/cache/manager.js'
import type { StorageManager } from '../../../src/storage/manager.js'
import type { FetchResult } from '../../../src/storage/provider.js'

describe('mcp/tools', () => {
  let mockCache: CacheManager
  let mockStorage: StorageManager
  let ctx: ToolHandlerContext

  beforeEach(() => {
    mockCache = {
      get: vi.fn().mockResolvedValue({
        content: Buffer.from('# Test\n\nContent'),
        contentType: 'text/markdown',
        size: 18,
        source: 'github',
      } as FetchResult),
      set: vi.fn().mockResolvedValue({}),
      getStats: vi.fn().mockResolvedValue({
        entryCount: 5,
        memoryEntries: 3,
        memorySize: 1024,
        totalSize: 2048,
        freshCount: 4,
        staleCount: 1,
        expiredCount: 0,
      }),
      invalidatePattern: vi.fn().mockResolvedValue(2),
    } as unknown as CacheManager

    mockStorage = {
      fetch: vi.fn().mockResolvedValue({
        content: Buffer.from('Fresh content'),
        contentType: 'text/markdown',
        size: 13,
        source: 'github',
      }),
    } as unknown as StorageManager

    ctx = { cache: mockCache, storage: mockStorage }
  })

  describe('CODEX_TOOLS', () => {
    it('should have codex_fetch tool', () => {
      const fetch = CODEX_TOOLS.find((t) => t.name === 'codex_fetch')
      expect(fetch).toBeDefined()
      expect(fetch?.inputSchema.required).toContain('uri')
    })

    it('should have codex_search tool', () => {
      const search = CODEX_TOOLS.find((t) => t.name === 'codex_search')
      expect(search).toBeDefined()
      expect(search?.inputSchema.required).toContain('query')
    })

    it('should have codex_list tool', () => {
      const list = CODEX_TOOLS.find((t) => t.name === 'codex_list')
      expect(list).toBeDefined()
    })

    it('should have codex_invalidate tool', () => {
      const invalidate = CODEX_TOOLS.find((t) => t.name === 'codex_invalidate')
      expect(invalidate).toBeDefined()
      expect(invalidate?.inputSchema.required).toContain('pattern')
    })

    it('should have 4 tools total', () => {
      expect(CODEX_TOOLS).toHaveLength(4)
    })
  })

  describe('handleFetch', () => {
    it('should fetch document using cache', async () => {
      const result = await handleFetch({ uri: 'codex://org/project/docs/file.md' }, ctx)

      expect(result.isError).toBeFalsy()
      expect(result.content[0]?.type).toBe('resource')
      expect(result.content[0]?.resource?.text).toBe('# Test\n\nContent')
      expect(mockCache.get).toHaveBeenCalled()
    })

    it('should bypass cache when noCache is true', async () => {
      const result = await handleFetch(
        { uri: 'codex://org/project/docs/file.md', noCache: true },
        ctx
      )

      expect(result.isError).toBeFalsy()
      expect(mockStorage.fetch).toHaveBeenCalled()
      expect(mockCache.set).toHaveBeenCalled()
    })

    it('should pass branch option', async () => {
      await handleFetch(
        { uri: 'codex://org/project/docs/file.md', branch: 'develop' },
        ctx
      )

      expect(mockCache.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ branch: 'develop' })
      )
    })

    it('should return error for invalid URI', async () => {
      const result = await handleFetch({ uri: 'invalid://uri' }, ctx)

      expect(result.isError).toBe(true)
      expect(result.content[0]?.text).toContain('Invalid codex URI')
    })

    it('should return error on fetch failure', async () => {
      mockCache.get = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await handleFetch({ uri: 'codex://org/project/docs/file.md' }, ctx)

      expect(result.isError).toBe(true)
      expect(result.content[0]?.text).toContain('Failed to fetch')
    })
  })

  describe('handleSearch', () => {
    it('should return message about search index', async () => {
      const result = await handleSearch({ query: 'test' }, ctx)

      expect(result.isError).toBeFalsy()
      expect(result.content[0]?.text).toContain('Search functionality')
      expect(result.content[0]?.text).toContain('test')
    })

    it('should include filters in message', async () => {
      const result = await handleSearch({ query: 'api', org: 'myorg', project: 'myproject' }, ctx)

      expect(result.content[0]?.text).toContain('myorg')
      expect(result.content[0]?.text).toContain('myproject')
    })

    it('should return message if cache is empty', async () => {
      mockCache.getStats = vi.fn().mockResolvedValue({ entryCount: 0 })

      const result = await handleSearch({ query: 'test' }, ctx)

      expect(result.content[0]?.text).toContain('No documents in cache')
    })
  })

  describe('handleList', () => {
    it('should return cache statistics', async () => {
      const result = await handleList({}, ctx)

      expect(result.isError).toBeFalsy()
      expect(result.content[0]?.text).toContain('Cache Statistics')
      expect(result.content[0]?.text).toContain('Total entries: 5')
      expect(result.content[0]?.text).toContain('Memory entries: 3')
    })

    it('should include filter info', async () => {
      const result = await handleList({ org: 'myorg', project: 'myproject' }, ctx)

      expect(result.content[0]?.text).toContain('myorg')
      expect(result.content[0]?.text).toContain('myproject')
    })

    it('should note when includeExpired is set', async () => {
      const result = await handleList({ includeExpired: true }, ctx)

      expect(result.content[0]?.text).toContain('expired entries')
    })
  })

  describe('handleInvalidate', () => {
    it('should invalidate matching entries', async () => {
      const result = await handleInvalidate({ pattern: 'docs' }, ctx)

      expect(result.isError).toBeFalsy()
      expect(result.content[0]?.text).toContain('Invalidated 2')
      expect(mockCache.invalidatePattern).toHaveBeenCalledWith(/docs/)
    })

    it('should return error for invalid regex', async () => {
      const result = await handleInvalidate({ pattern: '[invalid' }, ctx)

      expect(result.isError).toBe(true)
      expect(result.content[0]?.text).toContain('Invalid pattern')
    })
  })

  describe('handleToolCall', () => {
    it('should route to correct handler', async () => {
      const result = await handleToolCall(
        'codex_fetch',
        { uri: 'codex://org/project/file.md' },
        ctx
      )

      expect(result.content[0]?.type).toBe('resource')
    })

    it('should return error for unknown tool', async () => {
      const result = await handleToolCall('unknown_tool', {}, ctx)

      expect(result.isError).toBe(true)
      expect(result.content[0]?.text).toContain('Unknown tool')
    })

    it('should handle all tools', async () => {
      // Provide minimal valid args for each tool
      const toolArgs: Record<string, Record<string, unknown>> = {
        codex_fetch: { uri: 'codex://org/project/file.md' },
        codex_search: { query: 'test' },
        codex_list: {},
        codex_invalidate: { pattern: 'docs' },
      }

      for (const tool of CODEX_TOOLS) {
        const args = toolArgs[tool.name] || {}
        const result = await handleToolCall(tool.name, args, ctx)
        // Should not return "Unknown tool"
        if (result.isError) {
          expect(result.content[0]?.text).not.toContain('Unknown tool')
        }
      }
    })
  })
})

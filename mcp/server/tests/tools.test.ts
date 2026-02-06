import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  CODEX_TOOLS,
  handleToolCall,
  handleFetch,
  handleList,
  handleCacheClear,
  handleCacheStats,
  handleCacheHealth,
  handleFileSourcesList,
  type ToolHandlerContext,
} from '../src/tools.js'
import type { CodexClient } from '@fractary/codex'

describe('MCP Tools', () => {
  let mockContext: ToolHandlerContext
  let mockClient: CodexClient

  beforeEach(() => {
    mockClient = {
      fetch: vi.fn(),
      getCacheStats: vi.fn().mockResolvedValue({
        entryCount: 0,
        memoryEntries: 0,
        memorySize: 0,
        totalSize: 0,
        freshCount: 0,
        staleCount: 0,
        expiredCount: 0,
      }),
      invalidateCache: vi.fn(),
      invalidateCachePattern: vi.fn().mockResolvedValue(0),
      getHealthChecks: vi.fn().mockResolvedValue([]),
      getTypeRegistry: vi.fn(),
      getCacheManager: vi.fn(),
      getStorageManager: vi.fn(),
      getOrganization: vi.fn().mockReturnValue('test-org'),
      getUnifiedConfig: vi.fn().mockReturnValue(null),
    } as unknown as CodexClient

    mockContext = {
      client: mockClient,
    }
  })

  describe('CODEX_TOOLS', () => {
    it('should export all required tools', () => {
      expect(CODEX_TOOLS).toHaveLength(6)
      const toolNames = CODEX_TOOLS.map((t) => t.name)
      expect(toolNames).toContain('codex_document_fetch')
      expect(toolNames).toContain('codex_cache_list')
      expect(toolNames).toContain('codex_cache_clear')
      expect(toolNames).toContain('codex_cache_stats')
      expect(toolNames).toContain('codex_cache_health')
      expect(toolNames).toContain('codex_file_sources_list')
    })

    it('should not contain search tool', () => {
      const toolNames = CODEX_TOOLS.map((t) => t.name)
      expect(toolNames).not.toContain('codex_search')
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
      vi.mocked(mockClient.fetch).mockResolvedValue({
        content: Buffer.from('Test content'),
        fromCache: true,
        contentType: 'text/markdown',
      })

      const result = await handleFetch(
        { uri: 'codex://org/project/doc.md' },
        mockContext
      )

      expect(result.content[0]).toHaveProperty('type', 'resource')
      expect(mockClient.fetch).toHaveBeenCalledWith('codex://org/project/doc.md', {
        bypassCache: undefined,
        branch: undefined,
      })
    })

    it('should pass noCache and branch to client.fetch', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValue({
        content: Buffer.from('Test content'),
        fromCache: false,
        contentType: 'text/markdown',
      })

      await handleFetch(
        { uri: 'codex://org/project/doc.md', noCache: true, branch: 'dev' },
        mockContext
      )

      expect(mockClient.fetch).toHaveBeenCalledWith('codex://org/project/doc.md', {
        bypassCache: true,
        branch: 'dev',
      })
    })

    it('should return error for missing URI', async () => {
      const result = await handleFetch({} as never, mockContext)

      expect(result.isError).toBe(true)
      const text = (result.content[0] as { type: string; text: string }).text
      expect(text).toContain('URI')
    })

    it('should return error when fetch fails', async () => {
      vi.mocked(mockClient.fetch).mockRejectedValue(new Error('Not found'))

      const result = await handleFetch(
        { uri: 'codex://org/project/doc.md' },
        mockContext
      )

      expect(result.isError).toBe(true)
      const text = (result.content[0] as { type: string; text: string }).text
      expect(text).toContain('Failed')
    })
  })

  describe('handleList', () => {
    it('should list cache statistics', async () => {
      const result = await handleList({}, mockContext)

      expect(result).toBeDefined()
      expect(result.content).toBeDefined()
      const text = (result.content[0] as { type: string; text: string }).text
      expect(text).toContain('Cache Statistics')
    })
  })

  describe('handleCacheClear', () => {
    it('should clear cache entries matching pattern', async () => {
      vi.mocked(mockClient.invalidateCachePattern).mockResolvedValue(3)

      const result = await handleCacheClear({ pattern: 'codex://org/.*' }, mockContext)

      const text = (result.content[0] as { type: string; text: string }).text
      expect(text).toContain('Cleared 3')
      expect(mockClient.invalidateCachePattern).toHaveBeenCalled()
    })

    it('should return error for missing pattern', async () => {
      const result = await handleCacheClear({} as never, mockContext)

      expect(result.isError).toBe(true)
    })

    it('should reject dangerous regex patterns', async () => {
      const result = await handleCacheClear({ pattern: '(a++b)' }, mockContext)

      expect(result.isError).toBe(true)
      const text = (result.content[0] as { type: string; text: string }).text
      expect(text).toContain('Invalid pattern')
    })
  })

  describe('handleCacheStats', () => {
    it('should return formatted stats', async () => {
      vi.mocked(mockClient.getCacheStats).mockResolvedValue({
        entryCount: 10,
        memoryEntries: 5,
        memorySize: 1024,
        totalSize: 2048,
        freshCount: 8,
        staleCount: 1,
        expiredCount: 1,
      })

      const result = await handleCacheStats({}, mockContext)

      const text = (result.content[0] as { type: string; text: string }).text
      expect(text).toContain('Cache Statistics')
      expect(text).toContain('10')
      expect(text).toContain('80% fresh')
    })

    it('should return JSON when requested', async () => {
      vi.mocked(mockClient.getCacheStats).mockResolvedValue({
        entryCount: 5,
        memoryEntries: 3,
        memorySize: 512,
        totalSize: 1024,
        freshCount: 5,
        staleCount: 0,
        expiredCount: 0,
      })

      const result = await handleCacheStats({ json: true }, mockContext)

      const text = (result.content[0] as { type: string; text: string }).text
      const parsed = JSON.parse(text)
      expect(parsed.entryCount).toBe(5)
    })
  })

  describe('handleCacheHealth', () => {
    it('should return health check results', async () => {
      vi.mocked(mockClient.getHealthChecks).mockResolvedValue([
        { name: 'Cache', status: 'pass', message: '10 entries' },
        { name: 'Storage', status: 'pass', message: '3 providers' },
      ])

      const result = await handleCacheHealth({}, mockContext)

      const text = (result.content[0] as { type: string; text: string }).text
      expect(text).toContain('Health Check')
      expect(text).toContain('HEALTHY')
    })

    it('should report degraded status on warnings', async () => {
      vi.mocked(mockClient.getHealthChecks).mockResolvedValue([
        { name: 'Cache', status: 'warn', message: 'Cache is empty' },
      ])

      const result = await handleCacheHealth({}, mockContext)

      const text = (result.content[0] as { type: string; text: string }).text
      expect(text).toContain('DEGRADED')
    })

    it('should return JSON when requested', async () => {
      vi.mocked(mockClient.getHealthChecks).mockResolvedValue([
        { name: 'Cache', status: 'pass', message: 'OK' },
      ])

      const result = await handleCacheHealth({ json: true }, mockContext)

      const text = (result.content[0] as { type: string; text: string }).text
      const parsed = JSON.parse(text)
      expect(parsed.summary.healthy).toBe(true)
      expect(parsed.checks).toHaveLength(1)
    })
  })

  describe('handleFileSourcesList', () => {
    it('should report no sources when config is null', async () => {
      vi.mocked(mockClient.getUnifiedConfig).mockReturnValue(null)

      const result = await handleFileSourcesList(mockContext)

      const text = (result.content[0] as { type: string; text: string }).text
      expect(text).toContain('No file plugin sources')
    })

    it('should list configured sources', async () => {
      vi.mocked(mockClient.getUnifiedConfig).mockReturnValue({
        file: {
          sources: [
            { name: 'specs', path: '.fractary/specs' },
            { name: 'logs', path: '.fractary/logs', type: 'log' },
          ],
        },
      })

      const result = await handleFileSourcesList(mockContext)

      const text = (result.content[0] as { type: string; text: string }).text
      expect(text).toContain('File Plugin Sources (2)')
      expect(text).toContain('specs')
      expect(text).toContain('.fractary/specs')
      expect(text).toContain('logs')
      expect(text).toContain('Type: log')
    })
  })

  describe('handleToolCall', () => {
    it('should route to correct handler', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValue({
        content: Buffer.from('Test'),
        fromCache: true,
        contentType: 'text/plain',
      })

      const result = await handleToolCall(
        'codex_document_fetch',
        { uri: 'codex://org/project/doc.md' },
        mockContext
      )

      expect(result).toBeDefined()
      expect(mockClient.fetch).toHaveBeenCalled()
    })

    it('should route cache_stats to handler', async () => {
      const result = await handleToolCall(
        'codex_cache_stats',
        {},
        mockContext
      )

      expect(result).toBeDefined()
      expect(mockClient.getCacheStats).toHaveBeenCalled()
    })

    it('should route cache_health to handler', async () => {
      const result = await handleToolCall(
        'codex_cache_health',
        {},
        mockContext
      )

      expect(result).toBeDefined()
      expect(mockClient.getHealthChecks).toHaveBeenCalled()
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
      vi.mocked(mockClient.fetch).mockRejectedValue(new Error('Network error'))

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
      ]

      for (const uri of testCases) {
        const result = await handleFetch({ uri }, mockContext)
        expect(result).toBeDefined()
      }
    })
  })
})

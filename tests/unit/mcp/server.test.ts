import { describe, it, expect, vi, beforeEach } from 'vitest'
import { McpServer, createMcpServer } from '../../../src/mcp/server.js'
import { CODEX_TOOLS } from '../../../src/mcp/tools.js'
import type { CacheManager } from '../../../src/cache/manager.js'
import type { StorageManager } from '../../../src/storage/manager.js'
import type { FetchResult } from '../../../src/storage/provider.js'

describe('mcp/server', () => {
  let mockCache: CacheManager
  let mockStorage: StorageManager
  let server: McpServer

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

    server = new McpServer({
      cache: mockCache,
      storage: mockStorage,
    })
  })

  describe('constructor', () => {
    it('should create server with defaults', () => {
      const s = new McpServer({ cache: mockCache, storage: mockStorage })
      expect(s).toBeInstanceOf(McpServer)
    })

    it('should accept custom name and version', () => {
      const s = new McpServer({
        name: 'custom-codex',
        version: '2.0.0',
        cache: mockCache,
        storage: mockStorage,
      })

      const info = s.getServerInfo()
      expect(info.name).toBe('custom-codex')
      expect(info.version).toBe('2.0.0')
    })
  })

  describe('createMcpServer', () => {
    it('should create McpServer instance', () => {
      const s = createMcpServer({ cache: mockCache, storage: mockStorage })
      expect(s).toBeInstanceOf(McpServer)
    })
  })

  describe('getServerInfo', () => {
    it('should return server info', () => {
      const info = server.getServerInfo()

      expect(info.name).toBe('codex')
      expect(info.version).toBe('1.0.0')
      expect(info.capabilities).toBeDefined()
    })
  })

  describe('getCapabilities', () => {
    it('should return capabilities', () => {
      const caps = server.getCapabilities()

      expect(caps.tools).toBeDefined()
      expect(caps.resources).toBeDefined()
    })
  })

  describe('listTools', () => {
    it('should return tool definitions', () => {
      const tools = server.listTools()

      expect(tools).toEqual(CODEX_TOOLS)
      expect(tools).toHaveLength(4)
    })
  })

  describe('callTool', () => {
    it('should call codex_fetch', async () => {
      const result = await server.callTool('codex_fetch', {
        uri: 'codex://org/project/docs/file.md',
      })

      expect(result.content[0]?.type).toBe('resource')
    })

    it('should call codex_list', async () => {
      const result = await server.callTool('codex_list', {})

      expect(result.content[0]?.text).toContain('Cache Statistics')
    })

    it('should return error for unknown tool', async () => {
      const result = await server.callTool('unknown', {})

      expect(result.isError).toBe(true)
    })
  })

  describe('listResources', () => {
    it('should list cache summary resource', async () => {
      const resources = await server.listResources()

      expect(resources).toHaveLength(1)
      expect(resources[0]?.uri).toBe('codex://cache/summary')
      expect(resources[0]?.name).toBe('Cache Summary')
    })
  })

  describe('listResourceTemplates', () => {
    it('should return resource templates', () => {
      const templates = server.listResourceTemplates()

      expect(templates).toHaveLength(1)
      expect(templates[0]?.uriTemplate).toContain('{org}')
      expect(templates[0]?.uriTemplate).toContain('{project}')
    })
  })

  describe('readResource', () => {
    it('should read cache summary', async () => {
      const contents = await server.readResource('codex://cache/summary')

      expect(contents).toHaveLength(1)
      expect(contents[0]?.text).toContain('Cache Statistics')
    })

    it('should read codex document', async () => {
      const contents = await server.readResource('codex://org/project/docs/file.md')

      expect(contents).toHaveLength(1)
      expect(contents[0]?.text).toBe('# Test\n\nContent')
    })

    it('should throw for invalid URI', async () => {
      await expect(server.readResource('invalid://uri')).rejects.toThrow('Invalid codex URI')
    })
  })

  describe('handleRequest', () => {
    it('should handle initialize', async () => {
      const result = await server.handleRequest('initialize')

      expect(result).toHaveProperty('protocolVersion')
      expect(result).toHaveProperty('serverInfo')
      expect(result).toHaveProperty('capabilities')
    })

    it('should handle tools/list', async () => {
      const result = (await server.handleRequest('tools/list')) as { tools: unknown[] }

      expect(result.tools).toBeDefined()
      expect(result.tools).toHaveLength(4)
    })

    it('should handle tools/call', async () => {
      const result = await server.handleRequest('tools/call', {
        name: 'codex_list',
        arguments: {},
      })

      expect(result).toHaveProperty('content')
    })

    it('should handle resources/list', async () => {
      const result = (await server.handleRequest('resources/list')) as { resources: unknown[] }

      expect(result.resources).toBeDefined()
    })

    it('should handle resources/templates/list', async () => {
      const result = (await server.handleRequest('resources/templates/list')) as {
        resourceTemplates: unknown[]
      }

      expect(result.resourceTemplates).toBeDefined()
    })

    it('should handle resources/read', async () => {
      const result = await server.handleRequest('resources/read', {
        uri: 'codex://cache/summary',
      })

      expect(result).toHaveProperty('contents')
    })

    it('should handle prompts/list', async () => {
      const result = (await server.handleRequest('prompts/list')) as { prompts: unknown[] }

      expect(result.prompts).toEqual([])
    })

    it('should throw for unknown method', async () => {
      await expect(server.handleRequest('unknown/method')).rejects.toThrow('Unknown method')
    })
  })

  describe('processMessage', () => {
    it('should process JSON-RPC request', async () => {
      const request = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      })

      const response = await server.processMessage(request)
      const parsed = JSON.parse(response)

      expect(parsed.jsonrpc).toBe('2.0')
      expect(parsed.id).toBe(1)
      expect(parsed.result).toHaveProperty('tools')
    })

    it('should return error for invalid JSON', async () => {
      const response = await server.processMessage('invalid json')
      const parsed = JSON.parse(response)

      expect(parsed.error).toBeDefined()
      expect(parsed.error.code).toBe(-32603)
    })

    it('should return error for unknown method', async () => {
      const request = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'unknown',
        params: {},
      })

      const response = await server.processMessage(request)
      const parsed = JSON.parse(response)

      expect(parsed.error).toBeDefined()
    })

    it('should preserve request id in response', async () => {
      const request = JSON.stringify({
        jsonrpc: '2.0',
        id: 'custom-id-123',
        method: 'tools/list',
      })

      const response = await server.processMessage(request)
      const parsed = JSON.parse(response)

      expect(parsed.id).toBe('custom-id-123')
    })
  })
})

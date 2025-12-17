/**
 * MCP Server implementation
 *
 * Implements a Model Context Protocol server for the Codex SDK.
 * This server can be used standalone or embedded in other applications.
 */

import type { CacheManager } from '@fractary/codex'
import type { StorageManager } from '@fractary/codex'
import { resolveReference } from '@fractary/codex'
import type {
  McpServerInfo,
  McpCapabilities,
  McpTool,
  McpResource,
  McpResourceTemplate,
  ResourceContent,
  ToolResult,
} from './types.js'
import { CODEX_TOOLS, handleToolCall, type ToolHandlerContext } from './tools.js'

/**
 * MCP Server configuration
 */
export interface McpServerConfig {
  /** Server name */
  name?: string
  /** Server version */
  version?: string
  /** Cache manager instance */
  cache: CacheManager
  /** Storage manager instance */
  storage: StorageManager
}

/**
 * MCP Server for Codex
 *
 * Provides a Model Context Protocol server implementation that exposes
 * Codex functionality as MCP tools and resources.
 */
export class McpServer {
  private config: Required<Omit<McpServerConfig, 'cache' | 'storage'>> & Pick<McpServerConfig, 'cache' | 'storage'>
  private toolContext: ToolHandlerContext

  constructor(config: McpServerConfig) {
    this.config = {
      name: config.name ?? 'codex',
      version: config.version ?? '1.0.0',
      cache: config.cache,
      storage: config.storage,
    }

    this.toolContext = {
      cache: config.cache,
      storage: config.storage,
    }
  }

  /**
   * Get server info
   */
  getServerInfo(): McpServerInfo {
    return {
      name: this.config.name,
      version: this.config.version,
      capabilities: this.getCapabilities(),
    }
  }

  /**
   * Get server capabilities
   */
  getCapabilities(): McpCapabilities {
    return {
      tools: {
        listChanged: false,
      },
      resources: {
        subscribe: false,
        listChanged: false,
      },
    }
  }

  /**
   * List available tools
   */
  listTools(): McpTool[] {
    return CODEX_TOOLS
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    return handleToolCall(name, args, this.toolContext)
  }

  /**
   * List available resources
   */
  async listResources(): Promise<McpResource[]> {
    // List cached documents as resources
    const resources: McpResource[] = []

    // Get cache stats for info
    const stats = await this.config.cache.getStats()

    // Add a summary resource
    resources.push({
      uri: 'codex://cache/summary',
      name: 'Cache Summary',
      description: `${stats.entryCount} cached documents`,
      mimeType: 'text/plain',
    })

    return resources
  }

  /**
   * List resource templates
   */
  listResourceTemplates(): McpResourceTemplate[] {
    return [
      {
        uriTemplate: 'codex://{org}/{project}/{path}',
        name: 'Codex Document',
        description: 'Fetch a document from the Codex knowledge base',
        mimeType: 'text/markdown',
      },
    ]
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<ResourceContent[]> {
    // Handle special URIs
    if (uri === 'codex://cache/summary') {
      const stats = await this.config.cache.getStats()
      return [
        {
          uri,
          mimeType: 'text/plain',
          text: `Cache Statistics:
- Total entries: ${stats.entryCount}
- Memory entries: ${stats.memoryEntries}
- Fresh: ${stats.freshCount}
- Stale: ${stats.staleCount}
- Expired: ${stats.expiredCount}`,
        },
      ]
    }

    // Resolve and fetch the reference
    const ref = resolveReference(uri)
    if (!ref) {
      throw new Error(`Invalid codex URI: ${uri}`)
    }

    const result = await this.config.cache.get(ref)
    return [
      {
        uri,
        mimeType: result.contentType,
        text: result.content.toString('utf-8'),
      },
    ]
  }

  /**
   * Handle JSON-RPC request
   *
   * This method handles the low-level MCP protocol messages.
   */
  async handleRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'initialize':
        return {
          protocolVersion: '2024-11-05',
          serverInfo: this.getServerInfo(),
          capabilities: this.getCapabilities(),
        }

      case 'tools/list':
        return { tools: this.listTools() }

      case 'tools/call': {
        const { name, arguments: args } = params as { name: string; arguments: Record<string, unknown> }
        return await this.callTool(name, args)
      }

      case 'resources/list':
        return { resources: await this.listResources() }

      case 'resources/templates/list':
        return { resourceTemplates: this.listResourceTemplates() }

      case 'resources/read': {
        const { uri } = params as { uri: string }
        return { contents: await this.readResource(uri) }
      }

      case 'prompts/list':
        return { prompts: [] }

      default:
        throw new Error(`Unknown method: ${method}`)
    }
  }

  /**
   * Process a JSON-RPC message
   */
  async processMessage(message: string): Promise<string> {
    let id: unknown = null

    try {
      const request = JSON.parse(message)
      id = request.id
      const { method, params } = request

      const result = await this.handleRequest(method, params)

      return JSON.stringify({
        jsonrpc: '2.0',
        id,
        result,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      return JSON.stringify({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: errorMessage,
        },
      })
    }
  }
}

/**
 * Create an MCP server
 */
export function createMcpServer(config: McpServerConfig): McpServer {
  return new McpServer(config)
}

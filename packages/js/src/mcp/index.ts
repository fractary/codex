/**
 * MCP module
 *
 * Provides Model Context Protocol (MCP) server implementation for
 * exposing Codex functionality to AI agents and tools.
 *
 * @example
 * ```typescript
 * import {
 *   createMcpServer,
 *   createCacheManager,
 *   createStorageManager
 * } from '@fractary/codex'
 *
 * const cache = createCacheManager({ cacheDir: '.fractary/cache' })
 * const storage = createStorageManager()
 * cache.setStorageManager(storage)
 *
 * const server = createMcpServer({
 *   name: 'my-codex-server',
 *   version: '1.0.0',
 *   cache,
 *   storage,
 * })
 *
 * // List available tools
 * const tools = server.listTools()
 *
 * // Call a tool
 * const result = await server.callTool('codex_fetch', {
 *   uri: 'codex://org/project/docs/api.md'
 * })
 * ```
 */

// Types
export type {
  McpTool,
  McpResource,
  McpResourceTemplate,
  McpCapabilities,
  McpServerInfo,
  FetchToolArgs,
  SearchToolArgs,
  ListToolArgs,
  InvalidateToolArgs,
  ToolResult,
  ResourceContent,
  SearchResult,
} from './types.js'

// Tools
export {
  CODEX_TOOLS,
  handleToolCall,
  handleFetch,
  handleSearch,
  handleList,
  handleInvalidate,
  type ToolHandlerContext,
} from './tools.js'

// Server
export { McpServer, createMcpServer, type McpServerConfig } from './server.js'

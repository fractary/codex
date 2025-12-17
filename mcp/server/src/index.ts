/**
 * @fractary/codex-mcp-server
 *
 * MCP server for Fractary Codex knowledge management.
 * Provides Model Context Protocol integration for AI agents and tools.
 */

// Export server
export { McpServer, createMcpServer, type McpServerConfig } from './server.js'

// Export tool registration bridge (for programmatic usage)
export {
  CODEX_TOOLS,
  handleToolCall,
  handleFetch,
  handleSearch,
  handleList,
  handleCacheClear,
  type ToolHandlerContext,
} from './tools.js'

// Export types
export type {
  McpTool,
  McpResource,
  McpResourceTemplate,
  McpCapabilities,
  McpServerInfo,
  FetchToolArgs,
  SearchToolArgs,
  ListToolArgs,
  CacheClearToolArgs,
  ToolResult,
  ResourceContent,
  SearchResult,
} from './types.js'

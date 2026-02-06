/**
 * MCP type definitions
 *
 * Type definitions for the Model Context Protocol integration.
 * These types align with the MCP specification.
 */

/**
 * MCP Tool definition
 */
export interface McpTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

/**
 * MCP Resource definition
 */
export interface McpResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

/**
 * MCP Resource template
 */
export interface McpResourceTemplate {
  uriTemplate: string
  name: string
  description?: string
  mimeType?: string
}

/**
 * Tool call arguments for fetch tool
 */
export interface FetchToolArgs {
  /** Codex URI to fetch */
  uri: string
  /** Branch to fetch from (optional) */
  branch?: string
  /** Whether to bypass cache */
  noCache?: boolean
}

/**
 * Tool call arguments for list tool
 */
export interface ListToolArgs {
  /** Organization filter */
  org?: string
  /** Project filter */
  project?: string
  /** Whether to include expired entries */
  includeExpired?: boolean
}

/**
 * Tool call arguments for cache clear tool
 */
export interface CacheClearToolArgs {
  /** URI pattern to clear from cache (regex) */
  pattern: string
}

/**
 * Tool call arguments for cache stats tool
 */
export interface CacheStatsToolArgs {
  /** Return raw JSON stats object */
  json?: boolean
}

/**
 * Tool call arguments for cache health tool
 */
export interface CacheHealthToolArgs {
  /** Return raw JSON health check results */
  json?: boolean
}

/**
 * Tool call result
 */
export interface ToolResult {
  content: Array<{
    type: 'text' | 'resource'
    text?: string
    resource?: {
      uri: string
      mimeType?: string
      text?: string
      blob?: string
    }
  }>
  isError?: boolean
}

/**
 * Resource read result
 */
export interface ResourceContent {
  uri: string
  mimeType?: string
  text?: string
  blob?: string
}

/**
 * MCP Server capabilities
 */
export interface McpCapabilities {
  tools?: {
    listChanged?: boolean
  }
  resources?: {
    subscribe?: boolean
    listChanged?: boolean
  }
  prompts?: {
    listChanged?: boolean
  }
}

/**
 * MCP Server info
 */
export interface McpServerInfo {
  name: string
  version: string
  capabilities: McpCapabilities
}

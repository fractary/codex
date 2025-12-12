/**
 * MCP Tool definitions and handlers
 *
 * Implements the tools exposed by the Codex MCP server.
 */

import type { CacheManager } from '../cache/manager.js'
import type { StorageManager } from '../storage/manager.js'
import { resolveReference } from '../references/index.js'
import type {
  McpTool,
  ToolResult,
  FetchToolArgs,
  SearchToolArgs,
  ListToolArgs,
  InvalidateToolArgs,
} from './types.js'

/**
 * Tool definitions for the MCP server
 */
export const CODEX_TOOLS: McpTool[] = [
  {
    name: 'codex_fetch',
    description: 'Fetch a document from the Codex knowledge base by URI. Returns the document content.',
    inputSchema: {
      type: 'object',
      properties: {
        uri: {
          type: 'string',
          description: 'Codex URI in format: codex://org/project/path/to/file.md',
        },
        branch: {
          type: 'string',
          description: 'Git branch to fetch from (default: main)',
        },
        noCache: {
          type: 'boolean',
          description: 'Bypass cache and fetch fresh content',
        },
      },
      required: ['uri'],
    },
  },
  {
    name: 'codex_search',
    description: 'Search for documents in the Codex knowledge base.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query string',
        },
        org: {
          type: 'string',
          description: 'Filter by organization',
        },
        project: {
          type: 'string',
          description: 'Filter by project',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 10)',
        },
        type: {
          type: 'string',
          description: 'Filter by artifact type (e.g., docs, specs, logs)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'codex_list',
    description: 'List documents in the Codex cache.',
    inputSchema: {
      type: 'object',
      properties: {
        org: {
          type: 'string',
          description: 'Filter by organization',
        },
        project: {
          type: 'string',
          description: 'Filter by project',
        },
        includeExpired: {
          type: 'boolean',
          description: 'Include expired cache entries',
        },
      },
    },
  },
  {
    name: 'codex_invalidate',
    description: 'Invalidate cached documents matching a pattern.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'URI pattern to invalidate (supports regex)',
        },
      },
      required: ['pattern'],
    },
  },
]

/**
 * Tool handler context
 */
export interface ToolHandlerContext {
  cache: CacheManager
  storage: StorageManager
}

/**
 * Create a text result
 */
function textResult(text: string, isError = false): ToolResult {
  return {
    content: [{ type: 'text', text }],
    isError,
  }
}

/**
 * Create a resource result
 */
function resourceResult(uri: string, content: string, mimeType?: string): ToolResult {
  return {
    content: [
      {
        type: 'resource',
        resource: {
          uri,
          mimeType,
          text: content,
        },
      },
    ],
  }
}

/**
 * Handle codex_fetch tool
 */
export async function handleFetch(args: FetchToolArgs, ctx: ToolHandlerContext): Promise<ToolResult> {
  const { uri, branch, noCache } = args

  // Resolve the reference
  const ref = resolveReference(uri)
  if (!ref) {
    return textResult(`Invalid codex URI: ${uri}`, true)
  }

  try {
    let result

    if (noCache) {
      // Bypass cache, fetch directly
      result = await ctx.storage.fetch(ref, { branch })
      // Still cache the result for next time
      await ctx.cache.set(uri, result)
    } else {
      // Use cache
      result = await ctx.cache.get(ref, { branch })
    }

    const content = result.content.toString('utf-8')
    return resourceResult(uri, content, result.contentType)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return textResult(`Failed to fetch ${uri}: ${message}`, true)
  }
}

/**
 * Handle codex_search tool
 *
 * Note: This is a basic implementation that searches cached entries.
 * A more sophisticated implementation might use a search index.
 */
export async function handleSearch(args: SearchToolArgs, ctx: ToolHandlerContext): Promise<ToolResult> {
  const { query, org, project, limit = 10 } = args

  // Get all cached entries
  const stats = await ctx.cache.getStats()
  if (stats.entryCount === 0) {
    return textResult('No documents in cache. Use codex_fetch to load documents first.')
  }

  // This is a simplified search - in a real implementation,
  // we would use a proper search index
  // For now, we search through the cached URIs and content

  // Note: This is a placeholder. The actual search implementation
  // would depend on having access to the cache persistence layer's
  // list of URIs and their content.

  const message = `Search functionality requires a search index.
Query: "${query}"
Filters: org=${org || 'any'}, project=${project || 'any'}
Limit: ${limit}

To fetch documents, use codex_fetch with a specific URI like:
codex://org/project/docs/file.md`

  return textResult(message)
}

/**
 * Handle codex_list tool
 */
export async function handleList(args: ListToolArgs, ctx: ToolHandlerContext): Promise<ToolResult> {
  const { org, project, includeExpired } = args

  // Get cache stats and any available info
  const stats = await ctx.cache.getStats()

  let message = `Cache Statistics:
- Total entries: ${stats.entryCount}
- Memory entries: ${stats.memoryEntries}
- Memory size: ${formatBytes(stats.memorySize)}
- Total size: ${formatBytes(stats.totalSize)}
- Fresh: ${stats.freshCount}
- Stale: ${stats.staleCount}
- Expired: ${stats.expiredCount}`

  if (org) {
    message += `\n\nFiltered by org: ${org}`
  }
  if (project) {
    message += `\nFiltered by project: ${project}`
  }
  if (includeExpired) {
    message += `\nIncluding expired entries`
  }

  return textResult(message)
}

/**
 * Handle codex_invalidate tool
 */
export async function handleInvalidate(args: InvalidateToolArgs, ctx: ToolHandlerContext): Promise<ToolResult> {
  const { pattern } = args

  try {
    const regex = new RegExp(pattern)
    const count = await ctx.cache.invalidatePattern(regex)

    return textResult(`Invalidated ${count} cache entries matching pattern: ${pattern}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return textResult(`Invalid pattern: ${message}`, true)
  }
}

/**
 * Route a tool call to its handler
 */
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolHandlerContext
): Promise<ToolResult> {
  switch (name) {
    case 'codex_fetch':
      return handleFetch(args as unknown as FetchToolArgs, ctx)
    case 'codex_search':
      return handleSearch(args as unknown as SearchToolArgs, ctx)
    case 'codex_list':
      return handleList(args as unknown as ListToolArgs, ctx)
    case 'codex_invalidate':
      return handleInvalidate(args as unknown as InvalidateToolArgs, ctx)
    default:
      return textResult(`Unknown tool: ${name}`, true)
  }
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

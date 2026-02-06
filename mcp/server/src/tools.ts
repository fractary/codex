/**
 * MCP Tool definitions and handlers
 *
 * Implements the tools exposed by the Codex MCP server.
 * Uses SDK's CodexClient for all operations.
 */

import type { CodexClient } from '@fractary/codex'
import { formatBytes } from '@fractary/codex'
import type {
  McpTool,
  ToolResult,
  FetchToolArgs,
  ListToolArgs,
  CacheClearToolArgs,
  CacheStatsToolArgs,
  CacheHealthToolArgs,
} from './types.js'

/**
 * Tool definitions for the MCP server
 */
export const CODEX_TOOLS: McpTool[] = [
  {
    name: 'codex_document_fetch',
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
    name: 'codex_cache_list',
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
    name: 'codex_cache_clear',
    description: 'Clear cached documents matching a pattern.',
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
  {
    name: 'codex_cache_stats',
    description: 'Display cache statistics including entry counts, sizes, and freshness.',
    inputSchema: {
      type: 'object',
      properties: {
        json: {
          type: 'boolean',
          description: 'Return raw JSON stats object',
        },
      },
    },
  },
  {
    name: 'codex_cache_health',
    description: 'Run health diagnostics on the codex setup including cache, storage, and type registry.',
    inputSchema: {
      type: 'object',
      properties: {
        json: {
          type: 'boolean',
          description: 'Return raw JSON health check results',
        },
      },
    },
  },
  {
    name: 'codex_file_sources_list',
    description: 'List file plugin sources available in the current project.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
]

/**
 * Tool handler context
 */
export interface ToolHandlerContext {
  client: CodexClient
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
 * Handle codex_document_fetch tool
 */
export async function handleFetch(args: FetchToolArgs, ctx: ToolHandlerContext): Promise<ToolResult> {
  const { uri, branch, noCache } = args

  if (!uri || typeof uri !== 'string') {
    return textResult('URI is required and must be a string', true)
  }

  if (branch && typeof branch !== 'string') {
    return textResult('Branch must be a string', true)
  }

  try {
    const result = await ctx.client.fetch(uri, {
      bypassCache: noCache,
      branch,
    })

    const content = result.content.toString('utf-8')
    return resourceResult(uri, content, result.contentType)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const errorName = error instanceof Error ? error.name : 'Error'

    if (errorName === 'FilePluginFileNotFoundError') {
      return textResult(message, true)
    }

    return textResult(`Failed to fetch ${uri}: ${message}`, true)
  }
}

/**
 * Handle codex_cache_list tool
 */
export async function handleList(args: ListToolArgs, ctx: ToolHandlerContext): Promise<ToolResult> {
  const { org, project, includeExpired } = args

  const stats = await ctx.client.getCacheStats()

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
 * Validate and sanitize regex pattern to prevent ReDoS attacks
 */
function validateRegexPattern(pattern: string): { valid: boolean; error?: string } {
  if (pattern.length > 1000) {
    return { valid: false, error: 'Pattern too long (max 1000 characters)' }
  }

  const redosPatterns = [
    /(\.\*){3,}/,           // Multiple consecutive .*
    /(\+\+|\*\*|\?\?)/,     // Nested quantifiers
    /(\([^)]*){10,}/,       // Too many groups
    /(\[[^\]]{100,})/,      // Very long character classes
  ]

  for (const redos of redosPatterns) {
    if (redos.test(pattern)) {
      return { valid: false, error: 'Pattern contains potentially dangerous constructs' }
    }
  }

  try {
    new RegExp(pattern)
    return { valid: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid regex'
    return { valid: false, error: message }
  }
}

/**
 * Handle codex_cache_clear tool
 */
export async function handleCacheClear(args: CacheClearToolArgs, ctx: ToolHandlerContext): Promise<ToolResult> {
  const { pattern } = args

  if (!pattern || typeof pattern !== 'string') {
    return textResult('Pattern is required and must be a string', true)
  }

  const validation = validateRegexPattern(pattern)
  if (!validation.valid) {
    return textResult(`Invalid pattern: ${validation.error}`, true)
  }

  try {
    const regex = new RegExp(pattern)
    const count = await ctx.client.invalidateCachePattern(regex)

    return textResult(`Cleared ${count} cache entries matching pattern: ${pattern}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return textResult(`Failed to clear cache: ${message}`, true)
  }
}

/**
 * Handle codex_cache_stats tool
 */
export async function handleCacheStats(args: CacheStatsToolArgs, ctx: ToolHandlerContext): Promise<ToolResult> {
  const stats = await ctx.client.getCacheStats()

  if (args.json) {
    return textResult(JSON.stringify(stats, null, 2))
  }

  const healthPercent = stats.entryCount > 0 ? (stats.freshCount / stats.entryCount) * 100 : 100

  const message = `Cache Statistics

Overview:
  Total entries:   ${stats.entryCount}
  Total size:      ${formatBytes(stats.totalSize)}
  Memory entries:  ${stats.memoryEntries}
  Memory size:     ${formatBytes(stats.memorySize)}

Freshness:
  Fresh:           ${stats.freshCount}
  Stale:           ${stats.staleCount}
  Expired:         ${stats.expiredCount}

Cache health: ${healthPercent.toFixed(0)}% fresh`

  return textResult(message)
}

/**
 * Handle codex_cache_health tool
 */
export async function handleCacheHealth(args: CacheHealthToolArgs, ctx: ToolHandlerContext): Promise<ToolResult> {
  const checks = await ctx.client.getHealthChecks()

  const passed = checks.filter(c => c.status === 'pass').length
  const warned = checks.filter(c => c.status === 'warn').length
  const failed = checks.filter(c => c.status === 'fail').length

  if (args.json) {
    return textResult(JSON.stringify({
      summary: {
        total: checks.length,
        passed,
        warned,
        failed,
        healthy: failed === 0,
      },
      checks,
    }, null, 2))
  }

  let message = 'Codex Health Check\n'

  for (const check of checks) {
    const icon = check.status === 'pass' ? '[OK]' :
                 check.status === 'warn' ? '[WARN]' :
                 '[FAIL]'

    message += `\n${icon} ${check.name}\n`
    message += `  ${check.message}\n`
    if (check.details) {
      message += `  ${check.details}\n`
    }
  }

  const overallStatus = failed > 0 ? 'UNHEALTHY' :
                        warned > 0 ? 'DEGRADED' :
                        'HEALTHY'

  message += `\nStatus: ${overallStatus}`
  message += `\n${passed} passed, ${warned} warnings, ${failed} failed`

  return textResult(message)
}

/**
 * Handle codex_file_sources_list tool
 */
export async function handleFileSourcesList(ctx: ToolHandlerContext): Promise<ToolResult> {
  try {
    const unifiedConfig = ctx.client.getUnifiedConfig()

    if (!unifiedConfig?.file?.sources || unifiedConfig.file.sources.length === 0) {
      return textResult(`No file plugin sources configured.

To enable file plugin integration, add a 'file.sources' section to .fractary/config.yaml.`)
    }

    const sources = unifiedConfig.file.sources
    let message = `File Plugin Sources (${sources.length}):\n`

    for (const source of sources) {
      message += `\n- ${source.name}`
      message += `\n  Path: ${source.path}`
      if (source.type) {
        message += `\n  Type: ${source.type}`
      }
    }

    message += '\n\nSources are read directly from local filesystem without caching.'

    return textResult(message)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return textResult(`Failed to list file sources: ${message}`, true)
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
    case 'codex_document_fetch':
      return handleFetch(args as unknown as FetchToolArgs, ctx)
    case 'codex_cache_list':
      return handleList(args as unknown as ListToolArgs, ctx)
    case 'codex_cache_clear':
      return handleCacheClear(args as unknown as CacheClearToolArgs, ctx)
    case 'codex_cache_stats':
      return handleCacheStats(args as unknown as CacheStatsToolArgs, ctx)
    case 'codex_cache_health':
      return handleCacheHealth(args as unknown as CacheHealthToolArgs, ctx)
    case 'codex_file_sources_list':
      return handleFileSourcesList(ctx)
    default:
      return textResult(`Unknown tool: ${name}`, true)
  }
}

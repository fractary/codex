#!/usr/bin/env node
/**
 * CLI entry point for @fractary/codex-mcp-server
 *
 * Provides MCP server with stdio transport.
 * Uses SDK utilities for configuration handling to avoid duplication.
 */

import { Command } from 'commander'
import {
  createCacheManager,
  createStorageManager,
  readUnifiedConfig,
  type UnifiedConfig,
  type CodexYamlConfig,
} from '@fractary/codex'
import { McpServer } from './server.js'

const program = new Command()

program
  .name('fractary-codex-mcp')
  .description('MCP server for Fractary Codex knowledge management')
  .version('0.8.0')
  .option('--config <path>', 'Path to config file', '.fractary/config.yaml')
  .action(async (options) => {
    // Load configuration using SDK utilities
    let codexConfig: CodexYamlConfig | undefined = undefined
    let fileConfig: unknown = undefined

    try {
      // Use SDK's readUnifiedConfig which handles unified format and env var expansion
      const unifiedConfig: UnifiedConfig = await readUnifiedConfig(options.config, {
        expandEnv: true,
      })

      // Extract codex section (SDK already expanded env vars)
      codexConfig = unifiedConfig.codex

      // Preserve file section if present (for file plugin integration)
      fileConfig = unifiedConfig.file
    } catch (error) {
      // Config file is optional - continue with defaults
      if (options.config !== '.fractary/config.yaml') {
        console.error(`Warning: Could not load config file: ${options.config}`)
      }
    }

    // Initialize storage and cache managers
    const storageConfig: Record<string, unknown> = {}

    // Add storage configuration if present
    if (codexConfig?.storage) {
      Object.assign(storageConfig, { providers: codexConfig.storage })
    }

    // Add archive config if present
    if (codexConfig?.archive) {
      storageConfig.s3Archive = {
        projects: codexConfig.archive.projects || {},
        fractaryCli: process.env.FRACTARY_CLI || 'fractary',
      }
    }

    // Add file plugin config if present
    if (fileConfig) {
      storageConfig.file = fileConfig
    }

    const storage = createStorageManager(storageConfig)
    const cache = createCacheManager({
      cacheDir: codexConfig?.cacheDir || codexConfig?.cache?.cacheDir || '.fractary/codex/cache',
      ...(codexConfig?.cache || {}),
    })

    // Set storage manager on cache
    if (storage) {
      cache.setStorageManager(storage)
    }

    // Create MCP server
    const server = new McpServer({
      name: 'fractary-codex',
      version: '0.8.0',
      cache,
      storage,
    })

    // Stdio mode
    process.stdin.setEncoding('utf-8')

    let buffer = ''
    process.stdin.on('data', async (chunk) => {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line)
            const response = await handleMessage(server, message)
            process.stdout.write(JSON.stringify(response) + '\n')
          } catch (error) {
            const errorResponse = {
              jsonrpc: '2.0',
              error: {
                code: -32700,
                message: 'Parse error',
                data: error instanceof Error ? error.message : 'Unknown error',
              },
              id: null,
            }
            process.stdout.write(JSON.stringify(errorResponse) + '\n')
          }
        }
      }
    })

    process.stdin.on('end', () => {
      process.exit(0)
    })

    console.error('MCP server running in stdio mode')
  })

/**
 * Handle a JSON-RPC message
 */
async function handleMessage(
  server: McpServer,
  message: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const method = message.method as string
  const params = (message.params as Record<string, unknown>) || {}
  const id = message.id

  try {
    let result: unknown

    switch (method) {
      case 'initialize':
        const serverInfo = server.getServerInfo()
        result = {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: serverInfo.name,
            version: serverInfo.version,
          },
          capabilities: serverInfo.capabilities,
        }
        break

      case 'tools/list':
        result = { tools: server.listTools() }
        break

      case 'tools/call': {
        const toolName = params.name as string
        const toolArgs = params.arguments as Record<string, unknown>
        result = await server.callTool(toolName, toolArgs)
        break
      }

      case 'resources/list':
        result = { resources: [] }
        break

      default:
        return {
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
          id,
        }
    }

    return {
      jsonrpc: '2.0',
      result,
      id,
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error',
      },
      id,
    }
  }
}

// Run the program
program.parse(process.argv)

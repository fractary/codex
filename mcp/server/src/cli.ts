#!/usr/bin/env node
/**
 * CLI entry point for @fractary/codex-mcp-server
 *
 * Provides MCP server with stdio transport.
 */

import { Command } from 'commander'
import { createCacheManager, createStorageManager } from '@fractary/codex'
import { readFileSync } from 'fs'
import * as yaml from 'js-yaml'
import { McpServer } from './server.js'

/**
 * Recursively expand environment variables in config object
 * Supports ${VAR_NAME} syntax
 */
function expandEnvVars(obj: any): any {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{([^}]+)\}/g, (_, varName) => {
      return process.env[varName] || `\${${varName}}`
    })
  }
  if (Array.isArray(obj)) {
    return obj.map(item => expandEnvVars(item))
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = expandEnvVars(value)
    }
    return result
  }
  return obj
}

const program = new Command()

program
  .name('fractary-codex-mcp')
  .description('MCP server for Fractary Codex knowledge management')
  .version('0.4.0')
  .option('--config <path>', 'Path to config file', '.fractary/codex/config.yaml')
  .action(async (options) => {
    // Load configuration
    let config: Record<string, unknown> = {}
    try {
      const configFile = readFileSync(options.config, 'utf-8')
      config = yaml.load(configFile) as Record<string, unknown>

      // Expand environment variables in config (${VAR_NAME} syntax)
      config = expandEnvVars(config)
    } catch (error) {
      // Config file is optional - continue with defaults
      if (options.config !== '.fractary/codex/config.yaml') {
        console.error(`Warning: Could not load config file: ${options.config}`)
      }
    }

    // Initialize storage and cache managers
    const storageConfig: Record<string, unknown> = {
      ...((config.storage as Record<string, unknown>) || {}),
    }

    // Add archive config if present
    if (config.archive) {
      storageConfig.s3Archive = {
        projects: (config.archive as Record<string, unknown>).projects || {},
        fractaryCli: process.env.FRACTARY_CLI || 'fractary',
      }
    }

    const storage = createStorageManager(storageConfig)
    const cache = createCacheManager({
      cacheDir: (config.cache as Record<string, unknown>)?.cacheDir as string || '.fractary/codex/cache',
      ...(config.cache as Record<string, unknown>),
    })

    // Set storage manager on cache
    if (storage) {
      cache.setStorageManager(storage)
    }

    // Create MCP server
    const server = new McpServer({
      name: 'fractary-codex',
      version: '0.4.0',
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

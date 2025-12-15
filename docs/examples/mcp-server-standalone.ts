/**
 * MCP Server Standalone Example
 *
 * Demonstrates running a standalone MCP server for AI agent integration.
 */

import { createMcpServer, CacheManager, StorageManager } from '@fractary/codex'

async function main() {
  // Create storage manager
  const storage = StorageManager.create({
    providers: [
      { type: 'local', basePath: './knowledge' },
      { type: 'github', token: process.env.GITHUB_TOKEN }
    ]
  })

  // Create cache manager
  const cache = CacheManager.create({
    cacheDir: '.codex-cache',
    maxMemorySize: 100 * 1024 * 1024, // 100 MB
    defaultTtl: 3600
  })
  cache.setStorageManager(storage)

  // Create MCP server
  const server = createMcpServer({
    name: 'fractary-codex',
    version: '1.0.0',
    cache,
    storage
  })

  // Get server info
  const info = server.getServerInfo()
  console.log('MCP Server Info:')
  console.log(`  Name: ${info.name}`)
  console.log(`  Version: ${info.version}`)

  // List available tools
  const tools = server.listTools()
  console.log('\nAvailable Tools:')
  tools.forEach(tool => {
    console.log(`  - ${tool.name}: ${tool.description}`)
  })

  // Start server
  const host = process.env.MCP_HOST || 'localhost'
  const port = parseInt(process.env.MCP_PORT || '3000')

  await server.start({ host, port })
  console.log(`\n✓ MCP server listening on ${host}:${port}`)
  console.log('\nExample requests:')
  console.log('  codex_fetch:      {"uri": "codex://org/project/file.md"}')
  console.log('  codex_search:     {"query": "authentication", "type": "docs"}')
  console.log('  codex_list:       {"prefix": "docs/"}')
  console.log('  codex_invalidate: {"pattern": "docs/**"}')

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\nShutting down...')
    await server.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('\n\nShutting down...')
    await server.stop()
    process.exit(0)
  })

  // Example: Call tools programmatically
  if (process.argv.includes('--demo')) {
    console.log('\nRunning demo...')

    try {
      // Fetch a document
      const fetchResult = await server.callTool('codex_fetch', {
        uri: 'codex://fractary/codex/README.md'
      })
      console.log(`\nFetch result:`)
      console.log(`  Content length: ${fetchResult.content?.length || 0}`)

      // Search for documents
      const searchResult = await server.callTool('codex_search', {
        query: 'codex',
        limit: 5
      })
      console.log(`\nSearch result:`)
      console.log(`  Found: ${searchResult.results?.length || 0} documents`)

      // List documents
      const listResult = await server.callTool('codex_list', {
        prefix: 'docs/'
      })
      console.log(`\nList result:`)
      console.log(`  Documents: ${listResult.documents?.length || 0}`)

    } catch (error) {
      console.error(`\nDemo error: ${error instanceof Error ? error.message : error}`)
    }
  }
}

main().catch(error => {
  console.error(`Fatal error: ${error instanceof Error ? error.message : error}`)
  process.exit(1)
})

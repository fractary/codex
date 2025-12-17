---
spec_id: SPEC-20251217064942-mcp-server-extraction
title: Extract MCP Server to Standalone Package
type: infrastructure
status: draft
created: 2025-12-17
author: Claude (with human direction)
validated: false
related_specs:
  - SPEC-00026-distributed-plugin-architecture
changelog:
  - date: 2025-12-17
    type: refined
    changes:
      - Clarified stdio transport to use MCP SDK's StdioServerTransport
      - Confirmed version strategy (0.2.0 minor bump with migration docs)
      - Added HTTP mode requirement to initial release
      - Confirmed pnpm workspace membership for monorepo management
---

# Infrastructure Specification: Extract MCP Server to Standalone Package

**Type**: Infrastructure / Package Architecture
**Status**: Draft
**Created**: 2025-12-17
**Related**: [SPEC-00026-distributed-plugin-architecture](./SPEC-00026-distributed-plugin-architecture.md)

## Summary

This specification details the extraction of the MCP (Model Context Protocol) server from the embedded SDK implementation (`@fractary/codex` at `/sdk/js/src/mcp/`) to a standalone package (`@fractary/codex-mcp-server` at `/mcp/server/`) to align with the distributed plugin architecture defined in SPEC-00026.

## Objectives

- Align codex repository structure with SPEC-00026 architecture
- Create standalone MCP server package at `/mcp/server/`
- Publish `@fractary/codex-mcp-server` as independent npm package
- Remove MCP server from SDK package to achieve clean separation of concerns
- Enable standalone MCP server operation with dedicated CLI entry point
- Reduce SDK dependency footprint for library-only users

## Current State

### Package Structure

```
fractary/codex/
├── sdk/js/                     # @fractary/codex v0.1.3
│   ├── src/
│   │   ├── cache/
│   │   ├── storage/
│   │   ├── references/
│   │   └── mcp/               # ❌ EMBEDDED - Should be separate
│   │       ├── server.ts
│   │       ├── tools.ts
│   │       ├── types.ts
│   │       └── index.ts
│   └── package.json
├── cli/                        # @fractary/codex-cli v0.1.0
│   ├── src/commands/
│   └── package.json
└── plugins/codex/
    └── scripts/
        └── install-mcp.sh     # References SDK for MCP
```

### Current MCP Implementation

- **Location**: `/sdk/js/src/mcp/`
- **Package**: `@fractary/codex` (bundled with SDK)
- **Export**: `import { createMcpServer } from '@fractary/codex'`
- **Installation**: `npx @fractary/codex mcp`
- **Dependencies**: Tightly coupled with SDK modules (CacheManager, StorageManager)

### Gap Analysis

| Aspect | Current | SPEC-00026 Target | Status |
|--------|---------|-------------------|--------|
| Location | `/sdk/js/src/mcp/` | `/mcp/server/` | ❌ |
| Package | `@fractary/codex` | `@fractary/codex-mcp-server` | ❌ |
| Dependencies | Embedded in SDK | Separate, depends on SDK | ❌ |
| Standalone | No | Yes | ❌ |
| CLI Entry | Via SDK | Dedicated binary | ❌ |

## Target State

### Package Structure

```
fractary/codex/
├── sdk/
│   ├── js/                              # @fractary/codex v0.2.0
│   │   ├── src/
│   │   │   ├── cache/
│   │   │   ├── storage/
│   │   │   ├── references/
│   │   │   └── index.ts                 # ✅ NO mcp/ exports
│   │   └── package.json
│   └── py/                              # fractary-codex (future)
│
├── mcp/
│   └── server/                          # @fractary/codex-mcp-server v0.1.0
│       ├── src/
│       │   ├── server.ts                # ✅ Moved from SDK
│       │   ├── tools.ts                 # ✅ Moved from SDK
│       │   ├── types.ts                 # ✅ Moved from SDK
│       │   ├── cli.ts                   # ✅ NEW: CLI entry point
│       │   └── index.ts                 # ✅ Server exports
│       ├── bin/
│       │   └── fractary-codex-mcp       # ✅ NEW: Executable
│       ├── package.json                 # ✅ NEW: Depends on @fractary/codex
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       └── README.md
│
├── cli/                                 # @fractary/codex-cli v0.2.0
│   ├── src/
│   │   └── commands/
│   │       └── mcp.ts                   # ✅ UPDATED: Delegate to MCP server package
│   └── package.json
│
└── plugins/codex/
    └── scripts/
        └── install-mcp.sh               # ✅ UPDATED: Reference new package
```

## Architecture

### Components

- **@fractary/codex (SDK)**:
  - Type: npm package (library)
  - Purpose: Core SDK functionality - caching, storage, references
  - Changes: Remove MCP exports, bump to v0.2.0

- **@fractary/codex-mcp-server**:
  - Type: npm package (server/CLI)
  - Purpose: MCP protocol server exposing SDK tools
  - Dependencies: `@fractary/codex`, `@modelcontextprotocol/sdk`

- **@fractary/codex-cli**:
  - Type: npm package (CLI)
  - Purpose: Command-line interface
  - Changes: Update MCP command to delegate to server package

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      MCP Client (Claude Code)                    │
└─────────────────────────┬───────────────────────────────────────┘
                          │ JSON-RPC over stdio
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│             @fractary/codex-mcp-server                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  cli.ts (entry point)                                     │  │
│  │    └─► server.ts (MCP protocol)                          │  │
│  │          └─► tools.ts (tool handlers)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │ imports
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   @fractary/codex (SDK)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │CacheManager │  │StorageManager│  │ References  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Resources Required

### Compute

- No additional compute resources required
- Runs as local process (npx or global install)

### Storage

- Package artifacts in npm registry
- No runtime storage changes

### Third-Party Services

- npm registry: Package publication
- GitHub: Source control, CI/CD

## Configuration

### Environment Variables

- `FRACTARY_CONFIG`: Path to codex configuration file
- `MCP_PORT`: Server port (for HTTP mode, optional)
- `MCP_HOST`: Server host (for HTTP mode, optional)

### Configuration Files

- `.fractary/codex.yaml`: Codex configuration (unchanged)
- `.claude/settings.json`: MCP server configuration (updated)

### MCP Server Configuration (Updated)

**Before:**
```json
{
  "mcpServers": {
    "fractary-codex": {
      "command": "npx",
      "args": ["@fractary/codex", "mcp", "--config", ".fractary/codex.yaml"]
    }
  }
}
```

**After:**
```json
{
  "mcpServers": {
    "fractary-codex": {
      "command": "npx",
      "args": ["-y", "@fractary/codex-mcp-server", "--config", ".fractary/codex.yaml"]
    }
  }
}
```

## Implementation Plan

### Phase 1: Create MCP Server Package Structure

**Status**: ⬜ Not Started

**Objective**: Set up the new package directory and configuration files

**Tasks**:
- [ ] Create `/mcp/server/` directory structure
- [ ] Create `mcp/server/package.json` with dependencies
- [ ] Create `mcp/server/tsconfig.json` extending root config
- [ ] Create `mcp/server/tsup.config.ts` for build configuration
- [ ] Create `mcp/server/README.md` with usage documentation

**Estimated Scope**: Small

### Phase 2: Move MCP Code from SDK

**Status**: ⬜ Not Started

**Objective**: Extract MCP implementation to new package

**Tasks**:
- [ ] Copy `sdk/js/src/mcp/server.ts` → `mcp/server/src/server.ts`
- [ ] Copy `sdk/js/src/mcp/tools.ts` → `mcp/server/src/tools.ts`
- [ ] Copy `sdk/js/src/mcp/types.ts` → `mcp/server/src/types.ts`
- [ ] Create `mcp/server/src/index.ts` with public exports
- [ ] Update imports to reference `@fractary/codex` package
- [ ] Add MCP SDK dependency (`@modelcontextprotocol/sdk`)

**Estimated Scope**: Medium

### Phase 3: Create CLI Entry Point

**Status**: ⬜ Not Started

**Objective**: Add standalone executable for MCP server with both stdio and HTTP transports

**Tasks**:
- [ ] Create `mcp/server/src/cli.ts` with commander-based CLI
- [ ] Configure `bin` entry in package.json (`fractary-codex-mcp`)
- [ ] Implement `--config` option for configuration file
- [ ] Implement `--stdio` mode using MCP SDK's `StdioServerTransport`
- [ ] Implement `--port` and `--host` options for HTTP/SSE mode
- [ ] Create `registerCodexTools()` function to bridge existing handlers to MCP SDK
- [ ] Add shebang and make executable
- [ ] Add to pnpm workspace in root `pnpm-workspace.yaml`

**Estimated Scope**: Medium

**Technical Decision**: Use `@modelcontextprotocol/sdk`'s built-in `StdioServerTransport` for standard MCP compliance rather than custom stdio handling.

### Phase 4: Update SDK Package

**Status**: ⬜ Not Started

**Objective**: Remove MCP exports from SDK

**Tasks**:
- [ ] Remove MCP exports from `sdk/js/src/index.ts`
- [ ] Delete `sdk/js/src/mcp/` directory
- [ ] Update SDK tests to remove MCP-specific tests
- [ ] Bump SDK version to 0.2.0
- [ ] Add migration notes to CHANGELOG.md

**Estimated Scope**: Small

### Phase 5: Update CLI Package

**Status**: ⬜ Not Started

**Objective**: Update CLI to delegate to MCP server package

**Tasks**:
- [ ] Update `cli/src/commands/mcp.ts` to spawn MCP server
- [ ] Add `@fractary/codex-mcp-server` as dependency
- [ ] Update CLI documentation
- [ ] Bump CLI version to 0.2.0

**Estimated Scope**: Small

### Phase 6: Update Plugin Scripts

**Status**: ⬜ Not Started

**Objective**: Update installation scripts to reference new package

**Tasks**:
- [ ] Update `plugins/codex/scripts/install-mcp.sh`
- [ ] Update `plugins/codex/scripts/uninstall-mcp.sh`
- [ ] Update `plugins/codex/examples/mcp-config.json`
- [ ] Update plugin documentation

**Estimated Scope**: Small

### Phase 7: Testing and Validation

**Status**: ⬜ Not Started

**Objective**: Ensure all packages work correctly together

**Tasks**:
- [ ] Add unit tests for MCP server package
- [ ] Add integration tests for MCP ↔ SDK communication
- [ ] Test Claude Code integration with new package
- [ ] Test `npx @fractary/codex-mcp-server` standalone execution
- [ ] Test backward compatibility (if applicable)

**Estimated Scope**: Medium

### Phase 8: Documentation and Release

**Status**: ⬜ Not Started

**Objective**: Publish packages and update documentation

**Tasks**:
- [ ] Update root README.md with new package structure
- [ ] Create MCP server README.md
- [ ] Update docs/examples/mcp-server-standalone.ts
- [ ] Create migration guide for existing users
- [ ] Publish `@fractary/codex-mcp-server@0.1.0` to npm
- [ ] Publish `@fractary/codex@0.2.0` to npm
- [ ] Publish `@fractary/codex-cli@0.2.0` to npm

**Estimated Scope**: Small

## Package Definitions

### @fractary/codex-mcp-server/package.json

```json
{
  "name": "@fractary/codex-mcp-server",
  "version": "0.1.0",
  "description": "MCP server for Fractary Codex knowledge management",
  "keywords": ["codex", "mcp", "model-context-protocol", "fractary"],
  "type": "module",
  "bin": {
    "fractary-codex-mcp": "./dist/cli.js"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@fractary/codex": "^0.2.0",
    "@modelcontextprotocol/sdk": "^0.5.0",
    "commander": "^11.1.0",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^20.17.9",
    "tsup": "^8.3.5",
    "typescript": "^5.7.2",
    "vitest": "^3.2.4"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

### CLI Entry Point (mcp/server/src/cli.ts)

```typescript
#!/usr/bin/env node
import { Command } from 'commander'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CacheManager, StorageManager } from '@fractary/codex'
import { registerCodexTools } from './tools.js'
import { readFileSync } from 'fs'
import { createServer } from 'http'
import yaml from 'js-yaml'

const program = new Command()

program
  .name('fractary-codex-mcp')
  .description('MCP server for Fractary Codex knowledge management')
  .version('0.1.0')
  .option('--config <path>', 'Path to config file', '.fractary/codex.yaml')
  .option('--stdio', 'Use stdio transport (default)')
  .option('--port <number>', 'HTTP server port (alternative to stdio)')
  .option('--host <string>', 'HTTP server host', 'localhost')
  .action(async (options) => {
    // Load configuration
    let config: Record<string, unknown> = {}
    try {
      const configFile = readFileSync(options.config, 'utf-8')
      config = yaml.load(configFile) as Record<string, unknown>
    } catch {
      // Use defaults if no config file
    }

    // Initialize SDK managers
    const storage = StorageManager.create(config.storage)
    const cache = CacheManager.create({
      cacheDir: (config.cache as Record<string, unknown>)?.dir as string ?? '.codex-cache',
      ...config.cache as Record<string, unknown>
    })
    cache.setStorageManager(storage)

    // Create MCP server using official SDK
    const server = new Server(
      { name: 'fractary-codex', version: '0.1.0' },
      { capabilities: { tools: {}, resources: {} } }
    )

    // Register Codex tools with the MCP server
    registerCodexTools(server, { cache, storage })

    if (options.port) {
      // HTTP mode - SSE transport
      const port = parseInt(options.port)
      const host = options.host

      const httpServer = createServer(async (req, res) => {
        // Handle SSE connection for MCP over HTTP
        if (req.url === '/sse') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          })
          // SSE transport implementation would go here
          // This is a simplified placeholder
        } else {
          res.writeHead(404)
          res.end('Not found')
        }
      })

      httpServer.listen(port, host, () => {
        console.error(`MCP server listening on http://${host}:${port}`)
      })
    } else {
      // stdio mode - use MCP SDK's StdioServerTransport (default)
      const transport = new StdioServerTransport()
      await server.connect(transport)
      console.error('MCP server running on stdio')
    }
  })

program.parse()
```

**Key Implementation Notes:**

1. **StdioServerTransport**: Uses `@modelcontextprotocol/sdk`'s built-in transport for standard MCP compliance
2. **HTTP Mode**: Included in initial release using SSE (Server-Sent Events) for HTTP transport
3. **Tool Registration**: New `registerCodexTools()` function wraps existing tool handlers for MCP SDK integration

### Tool Registration Bridge (mcp/server/src/tools.ts)

The existing tool handlers need to be bridged to the MCP SDK's server interface:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import type { CacheManager } from '@fractary/codex'
import type { StorageManager } from '@fractary/codex'

export interface ToolContext {
  cache: CacheManager
  storage: StorageManager
}

export function registerCodexTools(server: Server, context: ToolContext): void {
  // Register tools with MCP SDK server
  server.setRequestHandler('tools/list', async () => ({
    tools: [
      {
        name: 'codex_fetch',
        description: 'Fetch a document from the Codex knowledge base by URI',
        inputSchema: {
          type: 'object',
          properties: {
            uri: { type: 'string', description: 'Codex URI' },
            branch: { type: 'string', description: 'Git branch' },
            noCache: { type: 'boolean', description: 'Bypass cache' },
          },
          required: ['uri'],
        },
      },
      {
        name: 'codex_search',
        description: 'Search for documents in the Codex knowledge base',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Max results' },
          },
          required: ['query'],
        },
      },
      {
        name: 'codex_list',
        description: 'List cached documents',
        inputSchema: {
          type: 'object',
          properties: {
            org: { type: 'string' },
            project: { type: 'string' },
          },
        },
      },
      {
        name: 'codex_invalidate',
        description: 'Invalidate cached documents by pattern',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'URI pattern (regex)' },
          },
          required: ['pattern'],
        },
      },
    ],
  }))

  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params

    // Delegate to existing tool handlers
    switch (name) {
      case 'codex_fetch':
        return handleFetch(args, context)
      case 'codex_search':
        return handleSearch(args, context)
      case 'codex_list':
        return handleList(args, context)
      case 'codex_invalidate':
        return handleInvalidate(args, context)
      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  })
}
```

This pattern:
- Preserves existing tool handler logic
- Adapts to MCP SDK's request/response model
- Maintains type safety through shared interfaces

## Deployment Strategy

### Monorepo Configuration

The MCP server package will be added to the pnpm workspace for consistent dependency management and local development linking.

**pnpm-workspace.yaml** (updated):
```yaml
packages:
  - 'sdk/js'
  - 'cli'
  - 'mcp/server'  # NEW: MCP server package
```

This enables:
- Local package linking during development (`pnpm install` links workspace packages)
- Coordinated version bumps across packages
- Shared devDependencies in root
- Consistent build and test workflows

### Versioning Strategy

| Package | Current | After Migration | Notes |
|---------|---------|-----------------|-------|
| `@fractary/codex` | 0.1.3 | 0.2.0 | Minor bump acceptable pre-1.0, clear migration docs |
| `@fractary/codex-cli` | 0.1.0 | 0.2.0 | Updated MCP handling |
| `@fractary/codex-mcp-server` | - | 0.1.0 | New package |

**Versioning Rationale**: Although removing MCP exports is technically breaking, semver allows breaking changes in 0.x versions. We'll include comprehensive migration documentation in the CHANGELOG.md and README.md to ensure smooth upgrades.

### Rollback Plan

1. Keep v0.1.x SDK branch available
2. Document rollback steps in migration guide
3. Can revert to SDK-embedded MCP if issues arise
4. Both packages published independently

## Dependencies

- SPEC-00026-distributed-plugin-architecture (architectural alignment)
- `@fractary/codex` SDK package (dependency for MCP server)
- `@modelcontextprotocol/sdk` (MCP protocol implementation)
- npm registry access for publication

## Risks and Mitigations

- **Risk**: Breaking change for existing users
  - **Impact**: Medium - users must update configuration
  - **Mitigation**: Clear migration guide, version bump signals breaking change

- **Risk**: Increased complexity with multiple packages
  - **Impact**: Low - follows industry patterns
  - **Mitigation**: Monorepo management, coordinated versioning

- **Risk**: CI/CD pipeline updates needed
  - **Impact**: Low - additional build target
  - **Mitigation**: Add MCP server to existing build matrix

## Testing Strategy

### Unit Tests

- MCP server initialization
- Tool handler functionality
- Configuration loading
- CLI argument parsing

### Integration Tests

- MCP server ↔ SDK communication
- Tool execution with real CacheManager/StorageManager
- Configuration file handling

### End-to-End Tests

- Claude Code MCP integration
- `npx @fractary/codex-mcp-server` execution
- Plugin installation scripts

## Documentation Requirements

- `mcp/server/README.md`: Installation, usage, configuration
- Migration guide: Steps to update from SDK-embedded to standalone
- Updated root README.md: New package structure
- Updated example files: New import paths

## Acceptance Criteria

- [ ] MCP server package exists at `/mcp/server/`
- [ ] `@fractary/codex-mcp-server` published to npm
- [ ] SDK no longer exports MCP functionality
- [ ] `npx @fractary/codex-mcp-server` works standalone
- [ ] Claude Code integration works with new package
- [ ] All existing MCP functionality preserved
- [ ] Plugin scripts updated to reference new package
- [ ] Documentation updated with migration guide
- [ ] Unit and integration tests pass
- [ ] Aligns with SPEC-00026 architecture

## Implementation Notes

### Backward Compatibility Option

If needed, the SDK could temporarily re-export MCP server for a deprecation period:

```typescript
// sdk/js/src/index.ts (temporary, deprecated)
/** @deprecated Import from @fractary/codex-mcp-server instead */
export * from '@fractary/codex-mcp-server'
```

This is NOT recommended for a clean break, but available if migration timeline needs to be extended.

### Installation Comparison

**Library-only users (improved):**
```bash
# Before: Gets MCP code even if not needed
npm install @fractary/codex

# After: Only SDK library code
npm install @fractary/codex
```

**MCP server users:**
```bash
# Before: Implicit with SDK
npm install @fractary/codex

# After: Explicit, pulls SDK as dependency
npm install @fractary/codex-mcp-server
# or for Claude Code:
npx -y @fractary/codex-mcp-server
```

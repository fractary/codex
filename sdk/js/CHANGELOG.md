# Changelog

All notable changes to @fractary/codex will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.12.3] - 2026-01-22

### Changed

- **BREAKING: `from_codex` patterns now require `codex://` URI format**
  - Both `include` and `exclude` patterns in `from_codex` must use `codex://` URIs
  - Plain paths like `docs/**` are no longer valid for `from_codex`
  - This validation was previously only documented in the plugin configurator; now enforced at schema level
  - Affects: CLI, MCP server, SDK consumers, and direct YAML configuration

  **Before (now invalid):**
  ```yaml
  sync:
    from_codex:
      include:
        - docs/**
        - standards/**
  ```

  **After (valid):**
  ```yaml
  sync:
    from_codex:
      include:
        - "codex://{org}/{codex_repo}/docs/**"
      exclude:
        - "codex://{org}/{codex_repo}/docs/private/**"
  ```

### Added

- `FromCodexSyncConfigSchema` - New Zod schema that validates `from_codex` patterns
- Schema validation tests for `codex://` URI requirement (17 new tests)

### Fixed

- Plugin version bump to 5.8.2 (was missing for configurator changes)
- Marketplace manifest version synced to 5.8.2 (was at 5.7.2)

## [0.8.0] - 2026-01-12

### Added

- **Archive Awareness**: Transparent access to archived documents from S3/R2/GCS storage
  - New `S3ArchiveStorage` provider enables read-only access to archived content
  - Per-project archive configuration with pattern matching support
  - Automatic storage fallback chain: local → archive → GitHub → HTTP
  - Support for multiple cloud storage handlers: S3, R2, GCS, and local
  - Archive path structure: `{prefix}/{type}/{org}/{project}/{original-path}`
  - Glob pattern matching to selectively enable archive access per file type
  - Integration with fractary CLI for cloud storage operations
  - See [SPEC-20260111-codex-archive-awareness.md](../../specs/SPEC-20260111-codex-archive-awareness.md)

### Changed

- Storage manager now prioritizes archive provider (priority 20) between local and GitHub
- MCP server automatically registers archive provider when configuration is present

### Documentation

- Added comprehensive Archive Configuration section to configuration guide
- Added S3ArchiveStorage API reference with TypeScript and Python examples
- Added 8 archive-specific troubleshooting scenarios:
  - fractary CLI not found
  - AWS credentials configuration
  - File not found in archive
  - Wrong storage handler selection
  - Slow archive performance
  - Pattern matching issues
  - Empty/invalid prefix handling

### Implementation Details

- New files:
  - `sdk/js/src/storage/s3-archive.ts` - Archive storage provider
  - `sdk/js/src/utils/execFileNoThrow.ts` - Safe CLI execution utility
  - `sdk/js/tests/unit/storage/s3-archive.test.ts` - 21 comprehensive tests
  - `specs/SPEC-20260111-codex-archive-awareness.md` - Complete specification
- Modified files:
  - `sdk/js/src/storage/manager.ts` - Archive provider registration
  - `sdk/js/src/schemas/config.ts` - Archive configuration schema
  - `sdk/js/src/core/config/defaults.ts` - Default archive config
  - `mcp/server/src/cli.ts` - Archive config loading
  - `mcp/server/README.md` - Archive setup documentation

## [0.2.0] - 2025-12-17

### Breaking Changes

- **MCP server moved to standalone package**: The MCP (Model Context Protocol) server has been extracted to a separate package `@fractary/codex-mcp-server`. If you were using the MCP server from this package, you need to update your imports and configuration.

### Migration Guide

#### If you were using MCP server functionality:

**Before (v0.1.x):**
```typescript
import { createMcpServer } from '@fractary/codex'
```

**After (v0.2.0):**
```typescript
import { createMcpServer } from '@fractary/codex-mcp-server'
```

**Claude Code configuration update:**

Before:
```json
{
  "mcpServers": {
    "fractary-codex": {
      "command": "npx",
      "args": ["@fractary/codex", "mcp", "--config", ".fractary/codex/config.yaml"]
    }
  }
}
```

After:
```json
{
  "mcpServers": {
    "fractary-codex": {
      "command": "npx",
      "args": ["-y", "@fractary/codex-mcp-server", "--config", ".fractary/codex/config.yaml"]
    }
  }
}
```

### Removed

- MCP server exports (`McpServer`, `createMcpServer`, `McpServerConfig`)
- MCP tool exports (`CODEX_TOOLS`, `handleToolCall`, `handleFetch`, `handleSearch`, `handleList`, `handleInvalidate`, `ToolHandlerContext`)
- MCP type exports (`McpTool`, `McpResource`, `McpResourceTemplate`, `McpCapabilities`, `McpServerInfo`, `FetchToolArgs`, `SearchToolArgs`, `ListToolArgs`, `InvalidateToolArgs`, `ToolResult`, `ResourceContent`, `SearchResult`)

### Why This Change?

This change aligns with the distributed plugin architecture (SPEC-00026) and provides:

- **Better separation of concerns**: SDK library vs. server runtime
- **Smaller bundle size**: Users who only need the SDK don't install server dependencies
- **Independent versioning**: MCP server can evolve independently
- **Clearer architecture**: Follows industry patterns (SDK + separate server)

All MCP functionality remains available in the new `@fractary/codex-mcp-server` package with identical APIs.

## [0.1.3] - 2025-12-16

### Added

- Initial release with MCP server integration (now moved to separate package in v0.2.0)

[0.2.0]: https://github.com/fractary/codex/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/fractary/codex/releases/tag/v0.1.3

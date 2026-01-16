# Migration Guide: v4.3.3 → v5.0.0

## Overview

Version 5.0.0 changes how the MCP server is installed and configured. The bundled MCP server approach has been replaced with per-project installation via npx.

## What Changed

### Before (v4.3.3): Plugin-Bundled Server

- MCP server bundled in plugin directory (467KB)
- Configuration in plugin's `.mcp.json`
- Used `${CLAUDE_PLUGIN_ROOT}` variable (didn't work)
- Server couldn't access project files

### After (v5.0.0): Per-Project Installation

- MCP server installed per-project via npx
- Configuration in project's `.claude/settings.json`
- Uses `@fractary/codex-mcp` from npm registry
- Server runs from project directory (can access config and cache)

## Why This Change?

The bundled approach had fundamental issues:

1. **Working Directory Conflict**: Server binary in plugin directory but needed to access project files
2. **Environment Variable Failure**: `${CLAUDE_PLUGIN_ROOT}` didn't expand in Claude Code
3. **Size Overhead**: 467KB bundled server in every plugin installation
4. **Version Lock**: Users stuck with bundled version until plugin update

## Migration Steps

### For Existing Users

If you're upgrading from v4.3.3 or earlier:

1. **Update Plugin**

   The plugin will auto-update via Claude Code marketplace to v5.0.0

2. **Re-run Init Command**

   In your project directory:
   ```
   /fractary-codex:configure
   ```

   The script will:
   - Detect your existing configuration
   - Automatically migrate to the new format
   - Update `.claude/settings.json` with npx-based MCP configuration
   - Preserve your existing config at `.fractary/codex/config.yaml`

3. **Restart Claude Code**

   Required for the new MCP server configuration to take effect.

4. **Verify Installation**

   Test that the MCP server is working:
   ```
   # Try a codex:// URI
   "Show me codex://your-org/your-project/README.md"
   ```

### For New Users

No migration needed! Just run:

```
/fractary-codex:configure --org <your-org> --codex <your-codex-repo>
```

Then restart Claude Code.

## Configuration Comparison

### Old Configuration (v4.3.3)

**Location**: Plugin's `.mcp.json`

```json
{
  "mcpServers": {
    "fractary-codex": {
      "type": "stdio",
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/mcp-server/dist/cli.js"]
    }
  }
}
```

**Problems**:
- `${CLAUDE_PLUGIN_ROOT}` variable didn't expand
- Server couldn't access project files
- Large bundled server file in plugin

### New Configuration (v5.0.0)

**Location**: Project's `.claude/settings.json`

```json
{
  "mcpServers": {
    "fractary-codex": {
      "command": "npx",
      "args": ["-y", "@fractary/codex-mcp", "--config", ".fractary/codex/config.yaml"]
    }
  }
}
```

**Benefits**:
- Runs from project directory (correct working directory)
- Can access `.fractary/codex/config.yaml`
- Can write to `.fractary/codex/cache/`
- Uses latest version from npm registry
- No bundled server in plugin

## Troubleshooting

### MCP Server Not Connecting

**Symptoms**:
- MCP tools not available
- Can't use `codex://` URIs
- "Failed to reconnect" error

**Solution**:
1. Check `.claude/settings.json` exists and has correct configuration
2. Verify config file exists: `cat .fractary/codex/config.yaml`
3. Restart Claude Code
4. Check for MCP errors in Claude Code logs

### Old Configuration Still Present

**Symptoms**:
- Error about missing `mcp-server/dist/cli.js`
- Old plugin path in error messages

**Solution**:
1. Edit `.claude/settings.json`
2. Remove old `fractary-codex` MCP server entry
3. Run `/fractary-codex:configure` to recreate with new format
4. Restart Claude Code

### npx Can't Find Package

**Symptoms**:
- Error: `npx: could not find @fractary/codex-mcp`
- MCP server fails to start

**Solution**:

**Option 1**: Check internet connection (npx downloads from npm)

**Option 2**: Manual install
```bash
npm install -g @fractary/codex-mcp
```

Then update `.claude/settings.json`:
```json
{
  "mcpServers": {
    "fractary-codex": {
      "command": "fractary-codex-mcp",
      "args": ["--config", ".fractary/codex/config.yaml"]
    }
  }
}
```

**Option 3**: Corporate firewall/proxy
- Configure npm proxy: `npm config set proxy http://your-proxy:port`
- Or use manual install method above

### Config File Path Wrong

**Symptoms**:
- Warning: "Could not load config file"
- MCP server starts but features don't work

**Solution**:
1. Verify config file location: `.fractary/codex/config.yaml` (not `.fractary/codex.yaml`)
2. Check file exists: `ls -la .fractary/codex/config.yaml`
3. If wrong location, re-run: `/fractary-codex:configure`

### Cache Directory Issues

**Symptoms**:
- Errors about cache directory not found
- Cache operations fail

**Solution**:
1. Verify cache directory: `.fractary/codex/cache/` (not `.fractary/plugins/codex/cache/`)
2. Create if missing: `mkdir -p .fractary/codex/cache`
3. Check permissions: `ls -ld .fractary/codex/cache`

## Rollback (Not Recommended)

If you need to rollback to v4.3.3 (not recommended due to bugs):

1. **Downgrade Plugin**

   In Claude Code plugin manager, select version 4.3.3

2. **Remove New Configuration**

   Edit `.claude/settings.json`, remove the npx-based `fractary-codex` entry

3. **Restart Claude Code**

**Note**: v4.3.3 has the working directory bug that prevents MCP server from working. We strongly recommend staying on v5.0.0.

## Benefits of v5.0.0

✅ **Working MCP Server**: Resolves critical working directory conflict
✅ **Smaller Plugin**: No 467KB bundled server
✅ **Always Up-to-Date**: npx fetches latest from npm registry
✅ **Cleaner Architecture**: Clear separation between plugin and MCP server
✅ **Standard Pattern**: Follows MCP specification best practices

## Need Help?

- **Issues**: https://github.com/fractary/codex/issues
- **Documentation**: https://github.com/fractary/codex/tree/main/plugins/codex
- **Spec**: See `specs/SPEC-20260107-mcp-per-project-migration.md`

## Version History

- **v5.0.0** (2026-01-07): Per-project MCP installation
- **v4.3.3** (2026-01-07): Attempted bundled server fixes (failed)
- **v4.3.2** (2026-01-07): Added stdio type to config
- **v4.3.1** (2026-01-07): Changed to relative paths
- **v4.3.0** (2026-01-07): First bundled server attempt

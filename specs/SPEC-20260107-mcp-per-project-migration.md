# SPEC-20260107: MCP Server Per-Project Installation Migration

**Status:** Draft
**Created:** 2026-01-07
**Author:** Claude Code
**Version:** 1.0

## Executive Summary

Transition the Fractary Codex plugin from bundled MCP server to per-project installation via npx. This resolves critical working directory conflicts that prevent the bundled server from accessing project files and configuration.

## Problem Statement

### Current State (v4.3.3)

The plugin bundles an MCP server at `plugins/codex/mcp-server/dist/cli.js` (467KB) and configures it via `.mcp.json`:

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

### Critical Issues

1. **Environment Variable Failure**
   - `${CLAUDE_PLUGIN_ROOT}` does not expand in Claude Code's MCP server launch context
   - Server fails to start with "Cannot find module" error
   - No error logs captured because process fails before stdio initialization

2. **Working Directory Conflict**
   - MCP server binary located in plugin directory (`~/.claude/plugins/marketplaces/fractary-codex/`)
   - Server expects to run from project directory to access:
     - `.fractary/config.yaml` (relative path)
     - `.fractary/codex/cache/` (relative path)
     - Project files via `process.cwd()` (storage manager default)
   - Cannot satisfy both requirements simultaneously

3. **Architecture Violation**
   - Plugin-level binary attempting project-level operations
   - Mixed responsibilities: plugin provides binary + project provides data
   - Fragile dependency on working directory management

### Impact

- MCP server fails with "Failed to reconnect" error
- Users cannot use `codex://` URIs for document references
- Cache and storage operations unavailable
- Plugin effectively non-functional for MCP features

## Proposed Solution

### Architecture: Per-Project Installation

**Principle:** MCP server installed and configured per-project, not bundled with plugin.

**Mechanism:** Use `npx @fractary/codex-mcp` to run server from npm registry without local installation.

**Configuration Location:** Project's `.mcp.json` (per-project MCP configuration)

### New MCP Configuration Format

```json
{
  "mcpServers": {
    "fractary-codex": {
      "command": "npx",
      "args": ["-y", "@fractary/codex-mcp", "--config", ".fractary/config.yaml"],
      "env": {}
    }
  }
}
```

### Benefits

| Aspect | Before (Bundled) | After (Per-Project) |
|--------|------------------|---------------------|
| **Working Directory** | Plugin dir (wrong) | Project dir (correct) |
| **Config Access** | Fails (wrong cwd) | Success (correct cwd) |
| **Cache Access** | Fails (wrong cwd) | Success (correct cwd) |
| **Plugin Size** | 467KB | ~0KB (no bundled server) |
| **Version Management** | Manual plugin update | Automatic via npm/npx |
| **Installation** | Automatic (but broken) | One command per project |

## Implementation Plan

### Phase 1: Fix Existing Bugs

These bugs exist regardless of architecture choice:

#### File: `plugins/codex/scripts/install-mcp.sh`

**Line 13:** Comment incorrect
```bash
# Before
# Uses standalone MCP server from @fractary/codex-mcp-server package
# After
# Uses standalone MCP server from @fractary/codex-mcp package
```

**Line 79:** Package detection wrong
```bash
# Before
elif [[ "$existing_args" == "@fractary/codex-mcp-server" ]]; then
# After
elif [[ "$existing_args" == "@fractary/codex-mcp" ]]; then
```

**Line 101:** Package name and config path wrong
```bash
# Before
args: ["-y", "@fractary/codex-mcp-server", "--config", ".fractary/codex.yaml"],
# After
args: ["-y", "@fractary/codex-mcp", "--config", ".fractary/config.yaml"],
```

**Line 126-127:** Output metadata wrong
```bash
# Before
mcp_package: "@fractary/codex-mcp-server",
config_path: ".fractary/codex.yaml",
# After
mcp_package: "@fractary/codex-mcp",
config_path: ".fractary/config.yaml",
```

#### File: `plugins/codex/scripts/setup-cache-dir.sh`

**Line 17:** Cache path inconsistent with config
```bash
# Before
cache_path="${CODEX_CACHE_PATH:-.fractary/plugins/codex/cache}"
# After
cache_path="${CODEX_CACHE_PATH:-.fractary/codex/cache}"
```

### Phase 2: Remove Bundled Server

#### Delete Files

1. **Delete directory:** `plugins/codex/mcp-server/`
   - Contains 467KB bundled server
   - No longer needed with per-project installation

2. **Delete file:** `plugins/codex/.mcp.json`
   - Plugin-level MCP configuration
   - Replaced by project-level configuration

#### Update Plugin Manifest

**File: `plugins/codex/.claude-plugin/plugin.json`**

**Before:**
```json
{
  "name": "fractary-codex",
  "version": "4.3.3",
  "description": "...",
  "commands": "./commands/",
  "agents": [...],
  "skills": "./skills/",
  "mcpServers": "./.mcp.json"
}
```

**After:**
```json
{
  "name": "fractary-codex",
  "version": "5.0.0",
  "description": "...",
  "commands": "./commands/",
  "agents": [...],
  "skills": "./skills/"
}
```

**Changes:**
- Remove line 11: `"mcpServers": "./.mcp.json"`
- Bump version: `4.3.3` → `5.0.0` (major version for breaking change)

### Phase 3: Update Config Manager Agent

**File: `plugins/codex/agents/config-manager.md`**

**Location:** After line 224 in success message

**Add:**
```markdown
MCP Server:
  Package: @fractary/codex-mcp@0.3.3 (npm registry)
  Method: npx (no local installation required)
  Config: .fractary/config.yaml
```

**Purpose:** Inform users how MCP server is installed and configured

### Phase 4: Update Marketplace Manifest

**File: `.claude-plugin/marketplace.json`**

**Changes:**
- Line with `"version": "2.2.3"` → `"version": "3.0.0"` (marketplace version)
- In plugins array, `"version": "4.3.3"` → `"version": "5.0.0"` (plugin version)

**Rationale:** Major version bump signals breaking architectural change

### Phase 5: Create Migration Documentation

**New file: `plugins/codex/docs/MIGRATION-v5.md`**

**Sections:**
1. **What Changed:** Bundled → per-project architecture
2. **Why:** Working directory conflict resolution, size reduction
3. **Breaking Changes:** List of incompatibilities with v4.x
4. **Migration Steps:** Automated and manual procedures
5. **Troubleshooting:** Common issues and resolutions
6. **Rollback:** How to revert if needed (not recommended)

**Key Message:** Existing users must re-run `/fractary-codex:init` after plugin update

## User Experience

### Fresh Installation (New Users)

```bash
# 1. Install plugin from marketplace
# (automatic via Claude Code plugin manager)

# 2. Initialize in project
/fractary-codex:init --org fractary --codex codex.fractary.com

# 3. Restart Claude Code
# (required to load new MCP server config)

# 4. Verify
# Try: "Show me codex://fractary/project/README.md"
```

**Result:** MCP server runs from project directory, all features work

### Migration (Existing Users)

```bash
# 1. Plugin auto-updates to v5.0.0
# (automatic via Claude Code marketplace)

# 2. Old bundled server removed automatically
# (happens during plugin update)

# 3. Re-run init command
/fractary-codex:init

# Output:
# ✓ Detected old MCP configuration
# ✓ Migrated to standalone MCP server
# ✓ MCP server configured successfully

# 4. Restart Claude Code
# (required to load new MCP server config)

# 5. Verify
# Try: "Show me codex://fractary/project/README.md"
```

**Result:** Seamless migration, existing config preserved, MCP server now works

## Testing Requirements

### Functional Tests

- [ ] **Fresh installation:** Project with no existing config
- [ ] **Fresh installation:** Project with empty `.claude/` directory
- [ ] **Migration:** v4.3.3 with old bundled MCP config
- [ ] **Merge:** Existing `.mcp.json` with other MCP servers
- [ ] **Preserve config:** User chooses to keep existing `config.yaml`
- [ ] **Overwrite config:** User chooses to overwrite existing `config.yaml`
- [ ] **Legacy format:** JSON config exists, prompts for migration
- [ ] **Auto-detect:** Git repository with discoverable codex repo
- [ ] **Manual config:** No git or auto-detect fails, user provides flags

### MCP Server Tests

- [ ] **Connection:** MCP server connects after init + restart
- [ ] **URI resolution:** `codex://` URIs resolve correctly
- [ ] **Document fetch:** Can fetch documents from codex
- [ ] **Cache operations:** Can list, clear, check cache
- [ ] **Search:** Can search codex documents
- [ ] **Config access:** Server reads `.fractary/config.yaml`
- [ ] **Cache access:** Server writes to `.fractary/codex/cache/`

### Edge Cases

- [ ] **No npm:** npx not available (fallback to global install instructions)
- [ ] **No internet:** npx offline mode (uses cached package if available)
- [ ] **Permissions:** `.claude/` directory not writable
- [ ] **Malformed settings:** Existing `settings.json` has syntax errors
- [ ] **Invalid config:** `config.yaml` exists but invalid YAML
- [ ] **Read-only cache:** Cache directory exists but not writable

### Performance Tests

- [ ] **First install:** Time to complete `/fractary-codex:init`
- [ ] **Migration:** Time to migrate from v4.3.3
- [ ] **MCP startup:** Time for server to connect after restart
- [ ] **npx download:** Time for npx to download package (first time)
- [ ] **npx cached:** Time for npx to run (cached package)

### Documentation Tests

- [ ] **Migration guide:** All commands work as documented
- [ ] **Troubleshooting:** Steps resolve listed issues
- [ ] **Error messages:** Clear and actionable
- [ ] **Success messages:** Accurate and helpful

## Rollout Strategy

### Week 1: Internal Testing

**Participants:** Development team (3-5 people)

**Focus:**
- Install plugin v5.0.0-alpha.1 from local build
- Test on 3-5 different projects
- Verify all checklist items
- Document any unexpected issues

**Deliverable:** Test report with issues and resolutions

### Week 2: Beta Release

**Participants:** Trusted external users (5-10 people)

**Process:**
- Release v5.0.0-beta.1 to private marketplace
- Provide migration guide
- Gather feedback via GitHub issues
- Fix critical bugs

**Deliverable:** Beta feedback summary and bug fixes

### Week 3: Release Candidate

**Participants:** Public beta testers (opt-in)

**Process:**
- Release v5.0.0-rc.1 to public marketplace
- Publish migration guide in repository
- Monitor GitHub issues and support channels
- Prepare final release notes

**Deliverable:** Release candidate with documented known issues

### Week 4: General Release

**Participants:** All users

**Process:**
- Release v5.0.0 to public marketplace
- Announce in changelog and release notes
- Update documentation
- Monitor support channels for issues
- Prepare hotfix release if critical bugs found

**Deliverable:** Stable v5.0.0 release

## Risk Assessment

### Risk 1: npx Package Not Found

**Probability:** Low
**Impact:** High (blocks installation)

**Mitigation:**
- Verify package published to npm registry before release
- Document offline scenarios in migration guide
- Provide fallback: `npm install -g @fractary/codex-mcp`
- Test in environments with restricted internet access

### Risk 2: Migration Fails for Existing Users

**Probability:** Medium
**Impact:** High (users left with broken config)

**Mitigation:**
- Comprehensive migration detection in `install-mcp.sh`
- Automatic backup of existing settings before modification
- Clear error messages with resolution steps
- Rollback instructions in migration guide
- Thorough testing of migration paths

### Risk 3: Working Directory Still Wrong

**Probability:** Low
**Impact:** High (same problem persists)

**Mitigation:**
- Verify Claude Code sets cwd to project directory for MCP servers
- Manual testing of MCP server startup with various cwd scenarios
- Fallback: explicit `cwd` field in MCP config if needed
- Document how to verify working directory

### Risk 4: Breaking Changes Impact Users

**Probability:** High (by design)
**Impact:** Medium (requires user action)

**Mitigation:**
- Major version bump (4.x → 5.0) signals breaking change
- Comprehensive migration guide
- Automatic migration where possible
- Clear communication in changelog
- Grace period: maintain v4.3.3 availability for rollback

### Risk 5: npm Registry Unavailable

**Probability:** Low
**Impact:** Medium (installations fail temporarily)

**Mitigation:**
- npx caches packages after first download
- Document how to pre-cache: `npx -y @fractary/codex-mcp --version`
- Provide alternative: manual npm install
- Monitor npm registry status before major releases

## Success Criteria

### Technical Success

- [ ] All bundled MCP server files removed from plugin
- [ ] Plugin size reduced by ~450KB
- [ ] MCP server runs from project directory with correct cwd
- [ ] Config file `.fractary/config.yaml` accessible to server
- [ ] Cache directory `.fractary/codex/cache/` writable by server
- [ ] All existing MCP server functionality preserved
- [ ] No regressions in plugin commands or agents

### User Success

- [ ] Fresh installation completes in < 2 minutes
- [ ] Migration from v4.3.3 is automatic or < 5 minutes
- [ ] Error messages are clear and actionable
- [ ] Documentation answers common questions
- [ ] < 5 support tickets for basic installation/migration
- [ ] User feedback predominantly positive

### Business Success

- [ ] Plugin maintenance simplified (no bundled server updates)
- [ ] Users always get latest MCP server (via npx)
- [ ] Reduced plugin download size and storage
- [ ] Clearer separation of concerns (plugin vs. MCP server)
- [ ] Easier to debug (separate package versions)

## Implementation Timeline

### Week 1: Code Changes
- Day 1-2: Fix bugs (Phase 1)
- Day 3-4: Remove bundled server (Phase 2)
- Day 5: Update manifests and documentation (Phases 3-5)

### Week 2: Testing
- Day 1-2: Internal testing
- Day 3-4: Fix issues found in testing
- Day 5: Beta release preparation

### Week 3: Beta Testing
- Day 1: Release v5.0.0-beta.1
- Day 2-4: Gather feedback, fix bugs
- Day 5: Release candidate preparation

### Week 4: Release
- Day 1: Release v5.0.0-rc.1
- Day 2-3: Monitor for issues
- Day 4: Final release v5.0.0
- Day 5: Post-release monitoring

## Post-Release

### Week 1 Post-Release

**Activities:**
- Monitor GitHub issues for installation problems
- Track support requests related to migration
- Analyze error logs and failure patterns
- Quick fixes for critical issues (v5.0.1)

**Metrics:**
- Number of installations
- Number of migrations
- Number of support tickets
- Error rates from telemetry

### Weeks 2-4 Post-Release

**Activities:**
- Analyze common support issues
- Update documentation based on feedback
- Plan minor version releases for bug fixes
- Collect feature requests for v5.1.0

**Metrics:**
- Installation success rate
- Migration success rate
- User satisfaction scores
- Feature adoption rates

### Ongoing Maintenance

**Activities:**
- Keep `@fractary/codex-mcp` package updated on npm
- Ensure compatibility with new Claude Code versions
- Monitor MCP protocol changes
- Regular testing of installation flow

**Schedule:**
- Monthly: Review metrics and issues
- Quarterly: Plan minor version releases
- Annually: Consider major architectural changes

## Appendix A: File Changes Summary

### Modified Files

| File | Changes | Lines |
|------|---------|-------|
| `plugins/codex/scripts/install-mcp.sh` | Fix package name and config path | 13, 79, 101, 126 |
| `plugins/codex/scripts/setup-cache-dir.sh` | Fix cache path | 17, 76, 96 |
| `plugins/codex/.claude-plugin/plugin.json` | Remove mcpServers, bump version | 3, 11 |
| `plugins/codex/agents/config-manager.md` | Add MCP server details to success message | 224+ |
| `.claude-plugin/marketplace.json` | Bump marketplace and plugin versions | Multiple |

### Deleted Files

- `plugins/codex/mcp-server/` (entire directory, ~467KB)
- `plugins/codex/.mcp.json` (plugin-level MCP config)

### New Files

- `plugins/codex/docs/MIGRATION-v5.md` (migration guide)
- `specs/SPEC-20260107-mcp-per-project-migration.md` (this document)

## Appendix B: Package Information

### MCP Server Package

**Name:** `@fractary/codex-mcp`
**Version:** 0.3.3
**Registry:** npm (https://www.npmjs.com/package/@fractary/codex-mcp)
**Source:** `/mnt/c/GitHub/fractary/codex/mcp/server/`
**Bundle Size:** ~456KB (CommonJS format)
**Dependencies:** commander, js-yaml, micromatch, zod, @fractary/codex

### Plugin Package

**Name:** `fractary-codex`
**Current Version:** 4.3.3
**New Version:** 5.0.0
**Marketplace Version:** 2.2.3 → 3.0.0
**Source:** `/mnt/c/GitHub/fractary/codex/plugins/codex/`
**Size Reduction:** ~467KB (removal of bundled server)

## Appendix C: Configuration Examples

### Before (v4.3.3)

**Plugin-level:** `plugins/codex/.mcp.json`
```json
{
  "$schema": "https://claude.ai/schemas/mcp-config.json",
  "mcpServers": {
    "fractary-codex": {
      "type": "stdio",
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/mcp-server/dist/cli.js"]
    }
  }
}
```

**Issues:**
- `${CLAUDE_PLUGIN_ROOT}` doesn't expand
- Server can't access project files
- 467KB bundled server in plugin

### After (v5.0.0+)

**Project-level:** `.mcp.json`
```json
{
  "mcpServers": {
    "fractary-codex": {
      "command": "npx",
      "args": ["-y", "@fractary/codex-mcp", "--config", ".fractary/config.yaml"]
    }
  }
}
```

**Benefits:**
- Runs from project directory
- Accesses config and cache correctly
- No bundled server needed
- Always uses latest version from npm

## Conclusion

This migration resolves fundamental architectural issues with the bundled MCP server approach while providing a cleaner, more maintainable solution. The per-project installation pattern follows MCP best practices and eliminates working directory conflicts that prevented the server from functioning correctly.

**Recommendation:** Proceed with implementation as specified in this document.

# Versioning Guide

This document defines the versioning requirements for the fractary/codex monorepo. **All version updates must follow these rules.**

## Version Files Summary

| Component | Version File | Dependency References |
|-----------|--------------|----------------------|
| SDK | `sdk/js/package.json` | - |
| CLI | `cli/package.json` | SDK: `@fractary/codex` |
| MCP Server | `mcp/server/package.json` | SDK: `@fractary/codex` |
| Plugin | `plugins/codex/plugin.json` | - |
| Marketplace | `.claude-plugin/marketplace.json` | Plugin version |

## When to Bump Versions

### SDK (`sdk/js/package.json`)
Bump when changing ANY file in `sdk/js/src/`:
- **Patch** (0.12.0 → 0.12.1): Bug fixes, internal changes
- **Minor** (0.12.0 → 0.13.0): New features, non-breaking changes
- **Major** (0.12.0 → 1.0.0): Breaking API changes

### CLI (`cli/package.json`)
Bump when changing ANY file in `cli/src/`:
- Follow same semver rules as SDK
- **CRITICAL**: Also update the `@fractary/codex` dependency version if SDK was bumped

### MCP Server (`mcp/server/package.json`)
Bump when changing ANY file in `mcp/server/src/`:
- Follow same semver rules as SDK
- **CRITICAL**: Also update the `@fractary/codex` dependency version if SDK was bumped

### Plugin (`plugins/codex/plugin.json`)
Bump when changing ANY file in `plugins/codex/`:
- Includes: agents, commands, skills, config examples, documentation

### Marketplace Manifest (`.claude-plugin/marketplace.json`)
**ALWAYS** bump when plugin version changes:
1. Update `plugins[].version` to match `plugins/codex/plugin.json` version
2. Update `metadata.version` (marketplace version) - increment patch for any change

## Dependency Version Ranges

When updating SDK version, check and update these dependency references:

```json
// cli/package.json - MUST match or exceed SDK version
"@fractary/codex": "^0.12.0"  // Update this when SDK bumps minor/major

// mcp/server/package.json - MUST match or exceed SDK version
"@fractary/codex": "^0.12.0"  // Update this when SDK bumps minor/major
```

**IMPORTANT**: The caret (`^`) range for `0.x.y` versions is restrictive:
- `^0.11.0` means `>=0.11.0 <0.12.0` (excludes 0.12.0!)
- `^0.12.0` means `>=0.12.0 <0.13.0`

So when bumping SDK from 0.11.x to 0.12.0, you MUST update CLI and MCP dependencies to `^0.12.0`.

## Checklist for Any Change

Before committing, verify:

- [ ] **SDK changed?** → Bump `sdk/js/package.json` version
- [ ] **SDK version bumped?** → Update CLI dependency: `cli/package.json` → `@fractary/codex`
- [ ] **SDK version bumped?** → Update MCP dependency: `mcp/server/package.json` → `@fractary/codex`
- [ ] **CLI changed?** → Bump `cli/package.json` version
- [ ] **MCP changed?** → Bump `mcp/server/package.json` version
- [ ] **Plugin changed?** → Bump `plugins/codex/plugin.json` version
- [ ] **Plugin version bumped?** → Update `.claude-plugin/marketplace.json`:
  - Update `plugins[0].version` to match plugin.json
  - Increment `metadata.version`
- [ ] **Run `npm install`** to update `package-lock.json`

## Publishing Order

When publishing updates:

1. **SDK first**: `cd sdk/js && npm publish`
2. **CLI second**: `cd cli && npm publish` (depends on SDK)
3. **MCP third**: `cd mcp/server && npm publish` (depends on SDK)
4. **Reinstall globally**: `npm install -g @fractary/codex-cli@latest`

## Example: Full Version Bump Flow

If you change `sdk/js/src/sync/manager.ts`:

```bash
# 1. Bump SDK version
# sdk/js/package.json: "version": "0.12.0" → "0.12.1"

# 2. If minor/major bump, update CLI dependency
# cli/package.json: "@fractary/codex": "^0.11.0" → "^0.12.0"

# 3. If minor/major bump, update MCP dependency
# mcp/server/package.json: "@fractary/codex": "^0.11.0" → "^0.12.0"

# 4. Update package-lock.json
npm install

# 5. Commit all changes together
git add sdk/js/package.json cli/package.json mcp/server/package.json package-lock.json
git commit -m "feat: Add new sync feature

Bump SDK 0.12.0 → 0.12.1, update CLI/MCP dependencies"
```

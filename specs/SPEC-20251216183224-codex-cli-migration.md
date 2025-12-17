---
title: "Codex CLI Migration"
slug: codex-cli-migration
type: infrastructure
status: draft
created: 2025-12-16
source: conversation
template: infrastructure
---

# SPEC-20251216183224: Codex CLI Migration

## Summary

Migrate the codex-related CLI commands from the `fractary/cli` project into the `fractary/codex` repository as a standalone `fractary-codex` CLI package. This scopes the CLI specifically to codex functionality and packages it alongside the SDK it depends on.

## Background

### Current State

The Fractary organization has a unified CLI at `fractary/cli` that consolidates multiple tools:
- **Faber**: FABER workflow orchestration
- **Codex**: Knowledge management and document retrieval
- **Forge**: Asset/plugin management

### Decision

The decision was made to scope the forge-related commands into a dedicated CLI package within this codex repository. The new CLI will be:
- **Package name**: `fractary-codex`
- **Location**: `/mnt/c/GitHub/fractary/codex/cli/`
- **Scope**: Only codex-related commands (not Faber or Forge)

## Requirements

### Functional Requirements

1. **Commands to Migrate** (7 total):
   - `init` - Initialize Codex v3.0 with YAML configuration
   - `fetch` - Fetch documents by `codex://` URI reference
   - `cache` - Cache management with subcommands:
     - `list` - View cached entries
     - `clear` - Remove cache entries
     - `stats` - Display cache statistics
   - `sync` - Bidirectional synchronization with subcommands:
     - `project` - Sync single project
     - `org` - Sync all projects in organization
   - `types` - Type registry management with subcommands:
     - `list` - List registered types
     - `show` - Show type details
     - `add` - Add custom type
     - `remove` - Remove custom type
   - `health` - Diagnostics and auto-repair
   - `migrate` - v2.0 to v3.0 configuration migration

2. **Binary**: `fractary-codex` command accessible from PATH

3. **SDK Integration**: Use `@fractary/codex` SDK via workspace reference

### Non-Functional Requirements

1. **Node.js Compatibility**: Support Node.js 18, 20, 22
2. **Build Performance**: Fast cold-start via dynamic imports
3. **Standalone Installation**: Must work when installed globally via npm
4. **Workspace Integration**: Must work as part of monorepo

## Technical Design

### Package Structure

```
cli/
├── src/
│   ├── cli.ts                      # Main CLI entry point
│   ├── index.ts                    # Module exports
│   ├── commands/                   # Command implementations
│   │   ├── init.ts
│   │   ├── fetch.ts
│   │   ├── health.ts
│   │   ├── migrate.ts
│   │   ├── cache/
│   │   │   ├── index.ts
│   │   │   ├── list.ts
│   │   │   ├── clear.ts
│   │   │   └── stats.ts
│   │   ├── sync/
│   │   │   ├── index.ts
│   │   │   ├── project.ts
│   │   │   └── org.ts
│   │   └── types/
│   │       ├── index.ts
│   │       ├── list.ts
│   │       ├── show.ts
│   │       ├── add.ts
│   │       └── remove.ts
│   ├── client/                     # SDK client wrapper
│   │   ├── codex-client.ts
│   │   └── get-client.ts
│   ├── config/                     # Configuration utilities
│   │   ├── config-types.ts
│   │   └── migrate-config.ts
│   └── utils/                      # Shared utilities
│       ├── file-scanner.ts
│       ├── output-formatter.ts
│       └── validation-reporter.ts
├── tests/                          # Test files
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

### Dependencies

#### Production
- `@fractary/codex`: `workspace:*` (monorepo workspace reference)
- `commander`: ^11.1.0 (CLI framework)
- `chalk`: ^5.3.0 (Terminal colors)
- `js-yaml`: ^4.1.0 (YAML parsing)
- `inquirer`: ^13.1.0 (Interactive prompts)

#### Development
- `typescript`: ^5.7.2
- `tsup`: ^8.x (Build tool)
- `vitest`: ^2.x (Test framework)
- `@types/node`: ^20.x
- `@types/js-yaml`: ^4.x

### Build Configuration

**tsup.config.ts**:
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm', 'cjs'],
  dts: false,
  sourcemap: true,
  clean: true,
  shims: true,
  target: 'node18',
  minify: false,
  splitting: false,
  treeshake: true,
  banner: {
    js: '#!/usr/bin/env node'
  }
});
```

### Source Files to Migrate

| Source (fractary/cli) | Target (codex/cli) | Changes Required |
|----------------------|-------------------|------------------|
| `src/tools/codex/index.ts` | `src/cli.ts` | Restructure as main entry |
| `src/tools/codex/client.ts` | `src/client/codex-client.ts` | Update imports |
| `src/tools/codex/get-client.ts` | `src/client/get-client.ts` | Update imports |
| `src/tools/codex/config-types.ts` | `src/config/config-types.ts` | Direct copy |
| `src/tools/codex/migrate-config.ts` | `src/config/migrate-config.ts` | Update imports |
| `src/tools/codex/commands/*.ts` | `src/commands/*.ts` | Update imports |
| `src/tools/codex/utils/*.ts` | `src/utils/*.ts` | Direct copy |

### Import Path Updates

| Original | New |
|----------|-----|
| `../get-client` | `../client/get-client` |
| `../migrate-config` | `../config/migrate-config` |
| `../config-types` | `../config/config-types` |

## Implementation Plan

### Phase 1: Package Setup
1. Create `/cli/` directory structure
2. Create `package.json` with dependencies
3. Create `tsconfig.json` extending SDK patterns
4. Create `tsup.config.ts` for building

### Phase 2: Core Migration
1. Migrate client wrapper files
2. Migrate configuration utilities
3. Migrate utility files
4. Create main CLI entry point

### Phase 3: Command Migration
1. Migrate simple commands (init, fetch, health, migrate)
2. Migrate cache command group
3. Migrate sync command group
4. Migrate types command group

### Phase 4: Integration
1. Update root workspace configuration
2. Verify workspace reference to SDK
3. Test build process

### Phase 5: Testing & Documentation
1. Create test structure
2. Write critical path tests
3. Create README with usage examples
4. Add CI workflow

### Phase 6: Validation
1. Build verification
2. Command functionality tests
3. Global installation test
4. Workspace integration test

## Acceptance Criteria

- [ ] CLI builds successfully with `npm run build`
- [ ] All 7 commands accessible via `fractary-codex <command>`
- [ ] `fractary-codex --help` displays all commands
- [ ] `fractary-codex init` creates `.fractary/codex.yaml`
- [ ] `fractary-codex fetch` retrieves documents via SDK
- [ ] `fractary-codex cache list/clear/stats` manage cache
- [ ] `fractary-codex sync project/org` synchronize files
- [ ] `fractary-codex types list/show/add/remove` manage types
- [ ] `fractary-codex health` runs diagnostics
- [ ] `fractary-codex migrate` converts legacy config
- [ ] Tests pass with `npm test`
- [ ] Type checking passes with `npm run typecheck`
- [ ] CLI installable globally: `npm install -g .`
- [ ] Workspace reference to `@fractary/codex` resolves

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Import path issues with workspace references | Build failures | Test thoroughly with `npm install` in monorepo root |
| Dynamic imports behave differently | Runtime errors | Preserve exact import patterns from source |
| CLI fails when installed globally | Poor user experience | Test global installation with `npm link` |
| Missing dependencies in package.json | Runtime failures | Copy exact dependency versions from source |

## Post-Migration Tasks

1. **Documentation Updates**:
   - Add CLI usage to main README
   - Create CLI-specific guide in `docs/guides/`

2. **Deprecation Notice**:
   - Add notice in `fractary/cli` README that codex commands moved
   - Point users to new `fractary-codex` package

3. **Publishing** (when ready):
   - Publish to npm as `fractary-codex`
   - Update installation instructions

## References

- Source: `/mnt/c/GitHub/fractary/cli/src/tools/codex/`
- Target: `/mnt/c/GitHub/fractary/codex/cli/`
- SDK: `/mnt/c/GitHub/fractary/codex/sdk/js/`
- Plan file: `/home/jmcwilliam/.claude/plans/frolicking-weaving-turing.md`

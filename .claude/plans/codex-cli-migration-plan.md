# Implementation Plan: Codex CLI Migration

**Branch**: `feat/4-migrate-codex-cli-commands-to-standalone-package`
**Issue**: #4
**Spec**: `/specs/SPEC-20251216183224-codex-cli-migration.md`
**Created**: 2025-12-16

---

## Executive Summary

**Objective**: Migrate 7 codex commands from `fractary/cli` to a standalone `fractary-codex` CLI package in this repository.

**Scope**: ~3,000 lines of code across 25 files, organized into a new `/cli/` package with workspace integration.

**Key Decision**: Add npm workspaces to enable proper monorepo dependency management.

---

## Part 1: Architectural Decisions

### Decision 1: Workspace Configuration ✅
**Issue**: Current repo has no workspace setup (SDK packages are independent)

**Decision**: Add npm workspaces to enable `workspace:*` dependency references
- Create root `package.json` with workspaces: `["sdk/js", "cli"]`
- Enables CLI to reference `@fractary/codex` as `workspace:*`
- Matches spec requirements and modern monorepo best practices

**Rationale**:
- Spec explicitly requires "workspace reference"
- Development efficiency (SDK changes immediately available)
- Proper monorepo tooling support

### Decision 2: Package Structure ✅
**Package Location**: `/cli/` (at repository root, peer to `sdk/`)

**Package Name**: `@fractary/codex-cli` (scoped npm package)

**Binary Name**: `fractary-codex` (as per spec)

**Rationale**:
- Follows established pattern (`sdk/js`, `sdk/py`, now `cli/`)
- Scoped package follows npm best practices
- Binary name matches spec requirements

### Decision 3: Build System ✅
**Build Tool**: `tsup` (matching SDK pattern)

**Target**: Node.js 18+ (matching SDK)

**Output Formats**: ESM + CJS (dual format for compatibility)

**Entry Point**: `src/cli.ts` with `#!/usr/bin/env node` shebang

**Rationale**:
- Consistency with existing SDK build system
- Fast builds and optimal bundle size
- Proven working configuration

### Decision 4: Import Strategy ✅
**Keep Dynamic Imports**: Preserve the lazy-loading pattern from source

**Why**: Critical for CLI performance
- Prevents SDK loading for simple commands like `--help`
- Reduces cold-start time
- Source architecture specifically optimized for this

---

## Part 2: Implementation Phases

### Phase 1: Workspace & Package Setup
**Files to Create**:
1. `/package.json` (root workspace config)
2. `/cli/package.json`
3. `/cli/tsconfig.json`
4. `/cli/tsup.config.ts`
5. `/cli/.gitignore`
6. `/cli/README.md`

**Dependencies** (from source analysis):
```json
{
  "dependencies": {
    "@fractary/codex": "workspace:*",
    "chalk": "^5.3.0",
    "commander": "^11.1.0",
    "glob": "^10.3.10",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^20.17.9",
    "tsup": "^8.3.5",
    "typescript": "^5.7.2",
    "vitest": "^3.2.4"
  }
}
```

### Phase 2: Directory Structure
**Create all directories**:
```
cli/
├── src/
│   ├── commands/
│   │   ├── cache/
│   │   ├── sync/
│   │   └── types/
│   ├── client/
│   ├── config/
│   └── utils/
└── tests/
    └── unit/
```

### Phase 3: Core Infrastructure Migration
**Order matters - migrate dependencies first**:

1. **Config Types** → `src/config/config-types.ts`
   - Source: `/mnt/c/GitHub/fractary/cli/src/tools/codex/config-types.ts`
   - Changes: None (direct copy)

2. **Config Migration** → `src/config/migrate-config.ts`
   - Source: `/mnt/c/GitHub/fractary/cli/src/tools/codex/migrate-config.ts`
   - Changes: Update imports (`../config-types` → `./config-types`)

3. **Utilities** (parallel - no interdependencies):
   - `src/utils/output-formatter.ts` (direct copy)
   - `src/utils/file-scanner.ts` (direct copy)
   - `src/utils/validation-reporter.ts` (direct copy)

4. **Client Wrapper** → `src/client/codex-client.ts`
   - Source: `/mnt/c/GitHub/fractary/cli/src/tools/codex/client.ts`
   - Changes: Update imports to point to new paths

5. **Client Getter** → `src/client/get-client.ts`
   - Source: `/mnt/c/GitHub/fractary/cli/src/tools/codex/get-client.ts`
   - Changes: Update import (`../client` → `./codex-client`)

### Phase 4: Command Migration
**Simple Commands First** (no command groups):

1. `src/commands/init.ts` - Update imports
2. `src/commands/fetch.ts` - Update imports
3. `src/commands/health.ts` - Update imports
4. `src/commands/migrate.ts` - Update imports

**Command Groups** (index.ts + subcommands):

5. **Cache Group**:
   - `src/commands/cache/index.ts`
   - `src/commands/cache/list.ts`
   - `src/commands/cache/clear.ts`
   - `src/commands/cache/stats.ts`

6. **Sync Group**:
   - `src/commands/sync/index.ts`
   - `src/commands/sync/project.ts`
   - `src/commands/sync/org.ts`

7. **Types Group**:
   - `src/commands/types/index.ts`
   - `src/commands/types/list.ts`
   - `src/commands/types/show.ts`
   - `src/commands/types/add.ts`
   - `src/commands/types/remove.ts`

**Import Path Updates** (consistent across all commands):
| Original | New |
|----------|-----|
| `../client` | `../client/codex-client` |
| `../get-client` | `../client/get-client` |
| `../config-types` | `../config/config-types` |
| `../migrate-config` | `../config/migrate-config` |
| `../utils/*` | `../utils/*` (unchanged) |

### Phase 5: CLI Entry Point
**Create** `src/cli.ts`:
- Source: `/mnt/c/GitHub/fractary/cli/src/tools/codex/index.ts` (command factory)
- Changes:
  - Restructure as main executable entry point
  - Register all command groups
  - Add proper error handling
  - Ensure dynamic imports preserved

**Create** `src/index.ts`:
- Export public API (if needed for programmatic usage)
- Optional: May just export types

### Phase 6: Build & Integration
**Tasks**:
1. Verify all tsconfig/tsup configurations
2. Run `npm install` from root (installs all workspaces)
3. Build the CLI: `cd cli && npm run build`
4. Test workspace reference resolution

### Phase 7: Testing Infrastructure
**Create test structure**:
1. `tests/unit/` directory
2. Critical path tests:
   - `tests/unit/commands/init.test.ts`
   - `tests/unit/commands/fetch.test.ts`
   - `tests/unit/client/codex-client.test.ts`

**Test Strategy**: Focus on integration tests over unit tests

### Phase 8: Documentation
**Create**:
1. `/cli/README.md` - Full usage guide with all 7 commands
2. Update root `/README.md` - Add CLI package reference

### Phase 9: Validation
**Run through complete acceptance criteria** (see Part 6 below)

---

## Part 3: Detailed File Migration Map

| # | Source | Destination | Changes | Dependencies |
|---|--------|-------------|---------|--------------|
| 1 | `config-types.ts` | `src/config/config-types.ts` | None | None |
| 2 | `migrate-config.ts` | `src/config/migrate-config.ts` | Import paths | #1 |
| 3 | `utils/output-formatter.ts` | `src/utils/output-formatter.ts` | None | None |
| 4 | `utils/file-scanner.ts` | `src/utils/file-scanner.ts` | None | None |
| 5 | `utils/validation-reporter.ts` | `src/utils/validation-reporter.ts` | None | None |
| 6 | `client.ts` | `src/client/codex-client.ts` | Import paths | #1, #2 |
| 7 | `get-client.ts` | `src/client/get-client.ts` | Import paths | #6 |
| 8 | `commands/init.ts` | `src/commands/init.ts` | Import paths | #6, #7 |
| 9 | `commands/fetch.ts` | `src/commands/fetch.ts` | Import paths | #7 |
| 10 | `commands/health.ts` | `src/commands/health.ts` | Import paths | #7 |
| 11 | `commands/migrate.ts` | `src/commands/migrate.ts` | Import paths | #2 |
| 12 | `commands/cache/index.ts` | `src/commands/cache/index.ts` | None | #13-15 |
| 13 | `commands/cache/list.ts` | `src/commands/cache/list.ts` | Import paths | #7 |
| 14 | `commands/cache/clear.ts` | `src/commands/cache/clear.ts` | Import paths | #7 |
| 15 | `commands/cache/stats.ts` | `src/commands/cache/stats.ts` | Import paths | #7 |
| 16 | `commands/sync/index.ts` | `src/commands/sync/index.ts` | None | #17-18 |
| 17 | `commands/sync/project.ts` | `src/commands/sync/project.ts` | Import paths | #3 |
| 18 | `commands/sync/org.ts` | `src/commands/sync/org.ts` | Import paths | #3 |
| 19 | `commands/types/index.ts` | `src/commands/types/index.ts` | None | #20-23 |
| 20 | `commands/types/list.ts` | `src/commands/types/list.ts` | Import paths | #7 |
| 21 | `commands/types/show.ts` | `src/commands/types/show.ts` | Import paths | #7 |
| 22 | `commands/types/add.ts` | `src/commands/types/add.ts` | Import paths | #7, #1 |
| 23 | `commands/types/remove.ts` | `src/commands/types/remove.ts` | Import paths | #7, #1 |
| 24 | `index.ts` | `src/cli.ts` | Major restructure | All commands |
| 25 | N/A | `src/index.ts` | New file | Optional exports |

---

## Part 4: Risk Mitigation

### Risk 1: Workspace Reference Issues
**Impact**: Build failures, import resolution errors

**Mitigation**:
1. Test workspace setup immediately after Phase 1
2. Run `npm install` from both root and `/cli/`
3. Verify `node_modules/@fractary/codex` is symlink to `../sdk/js`

### Risk 2: Dynamic Import Path Issues
**Impact**: Runtime errors when SDK fails to load

**Mitigation**:
1. Keep exact import patterns from source
2. Test each command after migration
3. Verify with both ESM and CJS builds

### Risk 3: Missing Dependencies
**Impact**: Runtime failures

**Mitigation**:
1. Copy exact versions from source `package.json`
2. Test global installation (`npm link`)
3. Verify in clean environment

### Risk 4: Shebang Not Working
**Impact**: CLI not executable

**Mitigation**:
1. Verify tsup banner configuration
2. Test with `chmod +x dist/cli.js`
3. Check file permissions after build

---

## Part 5: Post-Migration Tasks

### Immediate (Part of this work):
- [ ] Add CI workflow for CLI package (`.github/workflows/cli-ci.yml`)
- [ ] Update root README with CLI package info
- [ ] Create CLI-specific documentation

### Future (Separate work items):
- [ ] Add to npm publishing workflow
- [ ] Create deprecation notice in `fractary/cli` repository
- [ ] Add usage examples to main docs
- [ ] Consider integration tests with actual codex repository

---

## Part 6: Validation Checklist (Acceptance Criteria from Spec)

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

---

## Part 7: Implementation Decisions

### Testing Approach
- Focus on critical path tests (init, fetch, health)
- Integration tests preferred over unit tests
- Defer comprehensive test coverage to follow-up work

### CI/CD
- Create GitHub Actions workflow as part of this migration
- Match existing SDK CI patterns (test, lint, typecheck)
- Matrix testing across Node 18, 20, 22

### Documentation
- CLI README includes full command reference
- Root README updated to reference CLI package
- Examples included for each major command

---

## Summary

This plan provides a systematic approach to migrating 25 source files into a new CLI package with proper workspace integration, build configuration, testing, and documentation. The phased approach ensures dependencies are migrated in the correct order and risks are mitigated through incremental validation.

**Total Files to Create**: 33 (25 source + 8 config/docs)
**Estimated Lines of Code**: ~3,500
**Source Location**: `/mnt/c/GitHub/fractary/cli/src/tools/codex/`
**Target Location**: `/mnt/c/GitHub/fractary/codex/cli/`

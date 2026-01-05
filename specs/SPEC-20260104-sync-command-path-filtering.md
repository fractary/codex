# SPEC-20260104: Add Path Filtering to Sync Command

**Status**: Implementation
**Created**: 2026-01-04
**Author**: Claude Code
**Related**: Plugin v3.0.4

## Overview

Add `--include` and `--exclude` flags to the `/fractary-codex:sync` command to allow users to narrow the scope of what gets synced. This enables syncing specific documents rather than syncing hundreds of documents every time.

## Problem Statement

Currently, the sync command syncs all files matching the configured patterns (e.g., `docs/**`, `specs/**`). When a user wants to sync a single document or specific subset of files, they must sync everything, which:

- Takes longer than necessary
- Syncs unrelated files
- Makes it harder to review changes
- Wastes bandwidth and time

**User Request**: "It would be nice to be able to narrow the scope of what is synced somehow, like by a path wildcard or comma separated list of path wildcards. This way, when I am just syncing a document for a specific update, I can focus just on that rather than having to sync hundreds and hundreds of documents every time."

## Technical Analysis

### Current Architecture

The sync command operates through 5 layers:

1. **Command** (`plugins/codex/commands/sync-project.md`) - Parses arguments, delegates to agent
2. **Agent** (`plugins/codex/agents/codex-manager.md`) - Validates and coordinates operations
3. **Skill** (`plugins/codex/skills/project-syncer/SKILL.md`) - Builds CLI arguments
4. **CLI** (`cli/src/commands/sync.ts`) - Executes sync via SDK
5. **SDK** (`sdk/js/src/sync/planner.ts`) - Pattern matching and file filtering

### Key Discovery

The infrastructure already exists:

**CLI Layer** (`cli/src/commands/sync.ts` lines 62-63):
```typescript
.option('--include <pattern>', 'Include files matching pattern (can be used multiple times)', ...)
.option('--exclude <pattern>', 'Exclude files matching pattern (can be used multiple times)', ...)
```

**SDK Layer** (`sdk/js/src/sync/planner.ts` lines 50-54):
```typescript
const rules = [
  ...config.rules,
  ...(options.include ?? []).map((p) => ({ pattern: p, include: true, priority: 200 })),
  ...(options.exclude ?? []).map((p) => ({ pattern: p, include: false, priority: 200 })),
]
```

The CLI and SDK already support filtering - we just need to expose it through the plugin layers!

### Filter Semantics

**AND Logic** (narrows config patterns):
- Config defines: "what CAN be synced" (e.g., `docs/**`, `specs/**`)
- CLI patterns define: "what I WANT to sync NOW" (e.g., `docs/api/**`)
- Files must match BOTH config patterns AND CLI patterns to sync
- CLI patterns have priority 200 (higher than config)
- This is safer and more intuitive than OR logic

**OR Logic within patterns**:
- Multiple patterns in `--include` use OR logic
- Example: `--include "docs/**,specs/**"` matches docs OR specs
- Then AND with config patterns

## Solution

### Approach: Expose Existing Flags Through Plugin Layers

Simply wire through the existing CLI flags to the plugin layers (command → agent → skill).

### Implementation

#### 1. Update Command Layer

**File**: `/mnt/c/GitHub/fractary/codex/plugins/codex/commands/sync-project.md`

**Changes**:

a. Update `argument-hint` (line 5):
```markdown
argument-hint: [project-name] [--env <env>] [--to-codex|--from-codex|--bidirectional] [--dry-run] [--include <patterns>] [--exclude <patterns>]
```

b. Add to Options section (after line 72):
```markdown
- `--include <patterns>`: Include only files matching glob patterns. Narrows the configured sync patterns. Use comma-separated list for multiple patterns. Example: `--include "docs/api/**"` or `--include "docs/**,specs/**"`
- `--exclude <patterns>`: Exclude files matching glob patterns. Use comma-separated list for multiple patterns. Example: `--exclude "docs/private/**,**/*.draft.md"`
```

c. Add to Examples section (after line 98):
```markdown
# Sync only API documentation
/fractary-codex:sync --include "docs/api/**"

# Multiple include patterns (comma-separated)
/fractary-codex:sync --include "docs/**,specs/**"

# Combine include with exclude
/fractary-codex:sync --include "docs/**" --exclude "docs/private/**"

# Sync specific files (comma-separated)
/fractary-codex:sync --include "README.md,CLAUDE.md"

# Multiple excludes
/fractary-codex:sync --exclude "**/*.draft.md,docs/private/**"

# Dry-run to preview
/fractary-codex:sync --include "docs/api/**" --dry-run
```

d. Add Step 2.5: Parse Include/Exclude Options (after Step 2, before Step 3):
```markdown
## Step 2.5: Parse Include/Exclude Options

Extract include and exclude patterns from command arguments:

**Parse `--include` flag:**
- Single argument with comma-separated values
- Examples: `--include "docs/**"` or `--include "docs/**,specs/**"`

**Parse `--exclude` flag:**
- Single argument with comma-separated values
- Examples: `--exclude "docs/private/**"` or `--exclude "**/*.draft.md,docs/private/**"`

**Processing:**
1. Take the `--include` value (if provided)
2. Split by comma to create array
3. Trim whitespace from each pattern
4. Remove empty patterns
5. Repeat for `--exclude` value
6. Validate glob syntax (basic check)

**Example parsing:**
```
--include "docs/**,specs/**"
  → include: ["docs/**", "specs/**"]

--exclude "**/*.draft.md"
  → exclude: ["**/*.draft.md"]

--include "docs/**" --exclude "docs/private/**,**/*.draft.md"
  → include: ["docs/**"], exclude: ["docs/private/**", "**/*.draft.md"]
```
```

e. Update Step 8: Invoke Codex-Manager Agent (line 261) - Add parameters:
```markdown
"include_patterns": <array-from-include-flag>,
"exclude_patterns": <array-from-exclude-flag>,
```

#### 2. Update Agent Layer

**File**: `/mnt/c/GitHub/fractary/codex/plugins/codex/agents/codex-manager.md`

**Changes**:

a. Add to sync-project parameters (after line 169):
```markdown
- `include_patterns`: Optional array of glob patterns to narrow sync scope
  - Files must match BOTH config patterns AND these patterns (AND logic)
  - Example: ["docs/api/**"], ["docs/**", "specs/**"]
- `exclude_patterns`: Optional array of glob patterns to exclude from sync
  - Added to config excludes
  - Example: ["docs/private/**"], ["**/*.draft.md"]
```

b. Update delegation to project-syncer skill (line 188):
```markdown
Arguments: {
  project: <project-name>,
  codex_repo: <from-config>,
  organization: <from-config>,
  environment: <environment-name>,
  target_branch: <target-branch-from-environment>,
  direction: <to-codex|from-codex|bidirectional>,
  patterns: <from-config-or-parameter>,
  include_patterns: <from-parameter>,     # NEW
  exclude_patterns: <from-parameter>,     # NEW
  dry_run: <true|false>,
  config: <full-config-object>
}
```

#### 3. Update Skill Layer

**File**: `/mnt/c/GitHub/fractary/codex/plugins/codex/skills/project-syncer/SKILL.md`

**Changes**:

a. Add to INPUTS section (after line 47):
```markdown
- **include_patterns**: array - Include patterns to narrow sync scope (optional)
  - Only files matching BOTH config patterns AND these patterns will sync
  - Uses AND logic (intersection)
  - Higher priority than config patterns (priority 200)
  - Examples: ["docs/api/**"], ["docs/**", "specs/**"]

- **exclude_patterns**: array - Exclude patterns to filter out files (optional)
  - Added to config excludes
  - Examples: ["docs/private/**"], ["**/*.draft.md"]
```

b. Update Step 2: Build CLI Arguments (line 84) - Add after building base arguments:
```javascript
// Add include patterns if provided
if (include_patterns && include_patterns.length > 0) {
  include_patterns.forEach(pattern => args.push("--include", pattern))
}

// Add exclude patterns if provided
if (exclude_patterns && exclude_patterns.length > 0) {
  exclude_patterns.forEach(pattern => args.push("--exclude", pattern))
}
```

## Verification

### Manual Tests

1. Test single include pattern:
   ```bash
   /fractary-codex:sync --include "docs/api/**" --dry-run
   ```

2. Test multiple include patterns (comma-separated):
   ```bash
   /fractary-codex:sync --include "docs/**,specs/**" --dry-run
   ```

3. Test include with exclude:
   ```bash
   /fractary-codex:sync --include "docs/**" --exclude "docs/private/**" --dry-run
   ```

4. Test multiple excludes (comma-separated):
   ```bash
   /fractary-codex:sync --exclude "**/*.draft.md,docs/private/**" --dry-run
   ```

5. Test pattern that matches nothing:
   ```bash
   /fractary-codex:sync --include "nonexistent/**" --dry-run
   ```

6. Test without filter (baseline - should work as before):
   ```bash
   /fractary-codex:sync --dry-run
   ```

### Expected Results

- ✅ Patterns correctly filter files
- ✅ Dry-run shows filtered file list
- ✅ Multiple patterns work with OR logic
- ✅ Include + exclude work together
- ✅ Invalid patterns show clear error
- ✅ Backward compatible (no filters = current behavior)

## Expected Outcomes

1. **User Experience**: Can sync specific documents without syncing everything
2. **Performance**: Reduced sync time for focused updates
3. **Safety**: Dry-run shows exactly what will sync
4. **Flexibility**: Comma-separated lists for multiple patterns
5. **Backward Compatible**: No breaking changes, purely additive
6. **Reuses Infrastructure**: Leverages existing CLI and SDK pattern matching

## Edge Cases

### 1. Include Matches Nothing
- **Scenario**: `--include "nonexistent/**"`
- **Result**: Sync plan shows 0 files
- **Handling**: User sees "No files to sync" in dry-run

### 2. Include vs Config Conflict
- **Scenario**: Config includes `docs/**`, user includes `specs/**`
- **Result**: 0 files (AND logic means no intersection)
- **Handling**: Dry-run shows empty result, user can adjust include pattern

### 3. Multiple Include Patterns
- **Scenario**: `--include "docs/**,specs/**"`
- **Result**: Files matching docs/** OR specs/** (that also match config)
- **Logic**: OR within comma-separated patterns, AND with config

### 4. Invalid Glob Pattern
- **Scenario**: `--include "[invalid"`
- **Result**: Error during pattern validation
- **Handling**: Show clear error message with correct syntax

### 5. Only Exclude, No Include
- **Scenario**: `--exclude "**/*.draft.md"` (no include)
- **Result**: Uses config include patterns, excludes draft files
- **Logic**: Exclude narrows the config patterns

## Risks

**Low Risk**: Comma parsing edge cases
- Mitigation: Split by comma, trim whitespace, remove empty patterns
- Users can test with dry-run before executing

**Low Risk**: Pattern validation
- Mitigation: Basic glob syntax check, rely on CLI/SDK validation
- Clear error messages guide users to correct syntax

**None**: Breaking changes
- Mitigation: Purely additive feature, backward compatible
- Without flags, behavior is unchanged

## Alternatives Considered

### Alternative 1: Add `--filter` Flag
- **Rejected**: Adds unnecessary complexity when `--include` is clear
- User feedback: "Why not just expose --include and --exclude as they seem pretty clear to me"

### Alternative 2: Override Config Patterns (OR Logic)
- **Rejected**: Less safe, could sync files not in config
- AND logic is more intuitive for "narrowing scope"

### Alternative 3: Repeated Flags
- **Example**: `--include "docs/**" --include "specs/**"`
- **Rejected**: User prefers comma-separated in single argument
- Simpler syntax, cleaner command line

## Files Modified

1. `/mnt/c/GitHub/fractary/codex/plugins/codex/commands/sync-project.md`
   - Add `--include`, `--exclude` to argument-hint
   - Add options documentation
   - Add examples
   - Add include/exclude parsing step (Step 2.5)
   - Pass patterns to agent in Step 8

2. `/mnt/c/GitHub/fractary/codex/plugins/codex/agents/codex-manager.md`
   - Add `include_patterns`, `exclude_patterns` to sync-project parameters
   - Pass to project-syncer skill

3. `/mnt/c/GitHub/fractary/codex/plugins/codex/skills/project-syncer/SKILL.md`
   - Add `include_patterns`, `exclude_patterns` to INPUTS
   - Build CLI arguments with `--include` and `--exclude` flags

## No Changes Needed

- `/mnt/c/GitHub/fractary/codex/cli/src/commands/sync.ts` - Already has `--include` and `--exclude`
- `/mnt/c/GitHub/fractary/codex/sdk/js/src/sync/planner.ts` - Already has priority-based rules

## Example Usage

```bash
# Sync only API documentation
/fractary-codex:sync --include "docs/api/**" --dry-run

# Sync docs and specs, but not private docs
/fractary-codex:sync --include "docs/**,specs/**" --exclude "docs/private/**"

# Sync just the README and CLAUDE.md
/fractary-codex:sync --include "README.md,CLAUDE.md"

# Multiple specific directories
/fractary-codex:sync --include "docs/guides/**,docs/tutorials/**"

# Exclude draft files and private docs from normal sync
/fractary-codex:sync --exclude "**/*.draft.md,docs/private/**"
```

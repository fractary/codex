# SPEC-20260103225936: Fix Skill Directory Naming and Remove Deprecated References

**Status**: Implementation
**Created**: 2026-01-03
**Author**: Claude Code
**Related**: Plugin v3.0.3

## Overview

Fix the `fractary-codex:sync` command failure caused by mismatched skill directory names and deprecated org-syncer references.

## Problem Statement

The `/fractary-codex:sync --from-codex --environment production` command fails with:
```
Error: Unknown skill: fractary-codex:project-syncer
```

### Root Causes

1. **Skill Name Mismatches**: 5 skill directories don't match their registered names in SKILL.md
2. **Deprecated References**: Agent references `org-syncer` skill that was deprecated

## Technical Analysis

### Skill Registration Mechanism

Skills are auto-discovered from `./skills/` via `.claude-plugin/plugin.json`:
- Plugin scans each subdirectory
- Reads `SKILL.md` frontmatter `name:` field
- Registers as `/fractary-codex:{skill-name}`
- Directory name is NOT used for registration

###Mismatched Skills

| Directory | Registered Name | Impact |
|-----------|----------------|--------|
| `sync/` | `project-syncer` | Cannot find project-syncer |
| `cache-stats/` | `cache-metrics` | Cannot find cache-metrics |
| `config-init/` | `config-helper` | Cannot find config-helper |
| `config-migrate/` | `config-migrator` | Cannot find config-migrator |
| `document-fetch/` | `document-fetcher` | Cannot find document-fetcher |

### Deprecated org-syncer

Agent `codex-manager.md` references `org-syncer` at:
- Line 23: Available skills list
- Line 239: Workflow delegation
- Line 464: Success messages
- Line 563: Handler notes

Status: Deprecated - single-project sync only

## Solution

### Approach: Align Directory Names with Skill Names

Rename directories to match registered skill names for:
- Better discoverability
- Intuitive structure
- Easier maintenance
- Principle of least surprise

### Implementation

#### 1. Rename Skill Directories

```bash
cd /mnt/c/GitHub/fractary/codex/plugins/codex/skills
mv sync project-syncer
mv cache-stats cache-metrics
mv config-init config-helper
mv config-migrate config-migrator
mv document-fetch document-fetcher
```

#### 2. Remove org-syncer References

Edit `/plugins/codex/agents/codex-manager.md`:
- Remove line 23: `- **org-syncer**: Sync all projects in an organization`
- Remove lines ~235-250: sync-org operation workflow
- Remove line 464: org-syncer success references
- Remove line 563: org-syncer handler notes

#### 3. Bump Versions

- `.claude-plugin/plugin.json`: `3.0.2` → `3.0.3`
- `plugin.json`: `3.0.1` → `3.0.2`

## Verification

```bash
# Check renamed directories
ls -la skills/
# Should show: project-syncer, cache-metrics, config-helper, config-migrator, document-fetcher

# Verify SKILL.md names match directories
grep "^name:" skills/*/SKILL.md

# Verify no org-syncer references
grep -r "org-syncer" agents/

# Test sync command
/fractary-codex:sync --from-codex --dry-run
```

## Expected Outcomes

- ✅ `/fractary-codex:sync` commands work correctly
- ✅ All skills discoverable by agent
- ✅ Directory names match skill names
- ✅ Deprecated references removed
- ✅ No breaking changes to functionality

## Risks

**Low Risk**: External directory path references
- Mitigation: Skills referenced by name, not path

**Medium Risk**: In-progress work in other branches
- Mitigation: Coordinate before merging

**Low Risk**: Cached plugin state
- Mitigation: Users restart Claude Code

## Alternative Considered

**Change skill names to match directories**: Rejected because:
- More complex (requires editing SKILL.md files)
- Less intuitive names (e.g., "sync" vs "project-syncer")
- Affects skill functionality
- Breaks semantic naming

## Files Modified

- `/plugins/codex/skills/sync/` → `/plugins/codex/skills/project-syncer/`
- `/plugins/codex/skills/cache-stats/` → `/plugins/codex/skills/cache-metrics/`
- `/plugins/codex/skills/config-init/` → `/plugins/codex/skills/config-helper/`
- `/plugins/codex/skills/config-migrate/` → `/plugins/codex/skills/config-migrator/`
- `/plugins/codex/skills/document-fetch/` → `/plugins/codex/skills/document-fetcher/`
- `/plugins/codex/agents/codex-manager.md` (remove org-syncer)
- `/plugins/codex/.claude-plugin/plugin.json` (version bump)
- `/plugins/codex/plugin.json` (version bump)

# Refactor: Simplify to Init + Sync Only Architecture

## Overview
Radical simplification of the codex plugin:
- **Remove** ALL cache management commands (cache-list, cache-clear, cache-stats, cache-health)
- **Remove** ALL config management commands (config-migrate, config-validate, config-validate-refs)
- **Remove** document-fetch command
- **Keep** only 2 commands: init + sync
- **Deprecate** codex-manager monolithic agent
- **Create** 2 focused agents (one per command)
- **Clean up** all duplicate/unnecessary skills

## Philosophy

**Codex manages itself:**
- Users reference docs via `codex://` URIs through MCP server
- MCP auto-fetches missing docs
- Cache is transparent to users
- Want to force refresh? Use sync
- No manual cache management needed

## Current vs. Proposed

### Current (Complex)
- 10 commands
- 1 monolithic agent (642 lines)
- 12 skills (mix of helpers and duplicates)
- Users manage cache manually

### Proposed (Simple)
- **2 commands only**: init, sync
- **2 focused agents**: config-manager, sync-manager
- **6 helper skills**: cli-helper, config-helper, sync-manager (skill), handler-sync-github, handler-http, repo-discoverer
- Cache auto-managed by MCP

## Final Inventory

### Commands to KEEP (2)
1. **init** (renamed from config-init)
   - Command: `fractary-codex:init`
   - Agent: `config-manager` (or `config-config-manager`)
   - Purpose: One-time setup of .fractary/codex/config.yaml

2. **sync** (kept as-is)
   - Command: `fractary-codex:sync`
   - Agent: `sync-manager` (or `syncer` or `sync-manager`)
   - Purpose: Bidirectional sync between project and codex repo

### Commands to REMOVE (8)
1. `config-migrate` - No migration support
2. `config-validate` - Not needed
3. `config-validate-refs` - Not needed
4. `document-fetch` - Use MCP auto-fetch
5. `cache-list` - Codex self-manages
6. `cache-clear` - Codex self-manages
7. `cache-stats` - Codex self-manages
8. `cache-health` - Codex self-manages

### Agents to CREATE (2)

**Agent naming convention:** Use nouns, not "-agent" suffix

1. **config-manager** (or alternatives: `config-config-manager`, `setup-manager`)
   - File: `plugins/codex/agents/config-manager.md`
   - Purpose: Initialize codex config
   - Model: opus-4-6

2. **sync-manager** (or alternatives: `syncer`, `sync-manager`, `bidirectional-syncer`)
   - File: `plugins/codex/agents/sync-manager.md`
   - Purpose: Sync project with codex
   - Model: opus-4-6

### Agents to REMOVE (1)
1. `codex-manager` - Deprecated monolithic agent

### Skills to KEEP (6 - helpers only)
1. **cli-helper** - Invoke fractary CLI commands
2. **config-helper** - Config file detection/validation
3. **sync-manager** (skill) - Sync logic (used by sync-manager agent)
4. **handler-sync-github** - Git operations for sync
5. **handler-http** - HTTP operations for sync
6. **repo-discoverer** - Find codex repository

### Skills to REMOVE (6 - duplicates/unused)
1. `cache-list` - No cache commands
2. `cache-clear` - No cache commands
3. `cache-health` - No cache commands
4. `cache-metrics` - No cache commands
5. `document-fetcher` - No document-fetch command
6. `config-migrator` - No migration support

## Detailed Implementation Plan

### Phase 1: Create 2 New Agents

#### Agent 1: config-manager
**File:** `plugins/codex/agents/config-manager.md`

**Frontmatter:**
```yaml
---
name: config-manager
model: claude-opus-4-6
description: Initialize codex plugin configuration
tools: Bash, Skill
color: blue
---
```

**Purpose:** Initialize `.fractary/codex/config.yaml` for the project

**Responsibilities:**
1. Auto-detect organization from git remote
2. Discover codex repository (via repo-discoverer skill)
3. Check if config already exists
4. Detect existing legacy JSON configs (inform user to manually migrate if found)
5. Create `.fractary/codex/config.yaml` (v4.0 YAML format):
   - If CLI available: Use cli-helper skill → `fractary codex init`
   - If CLI unavailable: Create from template using Write tool
6. Setup cache directory: Run `scripts/setup-cache-dir.sh`
7. Install MCP server: Run `scripts/install-mcp.sh`
8. Report success with next steps

**Delegates to:**
- `repo-discoverer` skill (find codex repo)
- `cli-helper` skill (create config via CLI if available)
- `config-helper` skill (detect existing configs)
- Bash scripts (cache/MCP setup)

**Does NOT support:**
- Config migration (user must manually migrate)
- Validation (happens via CLI if installed)

#### Agent 2: sync-manager
**File:** `plugins/codex/agents/sync-manager.md`

**Frontmatter:**
```yaml
---
name: sync-manager
model: claude-opus-4-6
description: Sync project bidirectionally with codex repository
tools: Bash, Skill
color: green
---
```

**Purpose:** Bidirectional sync between current project and codex repo

**Responsibilities:**
1. Parse sync parameters:
   - direction: to-codex | from-codex | bidirectional
   - environment: dev, test, staging, prod (or custom)
   - patterns: include/exclude patterns
   - dry-run: preview mode
2. Validate config exists at `.fractary/codex/config.yaml`
3. Read config to get org, codex repo, sync patterns
4. Resolve environment to target branch
5. Invoke sync-manager skill with parameters
6. Report sync results (files synced, commits created, etc.)

**Delegates to:**
- `sync-manager` skill (actual sync implementation)
- `handler-sync-github` skill (git operations via sync-manager skill)

**Note:** The agent and skill have same name. This is okay - agent orchestrates, skill implements.

### Phase 2: Create 2 Bare-Bones Commands

**Command Template:**
```markdown
---
name: fractary-codex:<command>
description: <one-line description>
model: claude-haiku-4-5
argument-hint: [options]
---

<CONTEXT>
You are the <command> command for the codex plugin.

Your ONLY job is to:
1. Parse command arguments
2. Launch the <agent-name> agent using the Task tool
3. Pass arguments to the agent

DO NOT do any work yourself. ALL work is delegated to the agent.
</CONTEXT>

<CRITICAL_RULES>
- Parse arguments only
- Launch agent via Task tool
- Display agent results
- NEVER implement logic yourself
</CRITICAL_RULES>

<WORKFLOW>
1. Parse arguments from user input
2. Validate required arguments (show usage if missing)
3. Use Task tool to launch agent:
   - subagent_type: "fractary-codex:<agent-name>"
   - prompt: "<formatted request with parsed arguments>"
   - description: "<command> operation"
4. Display agent results verbatim to user
</WORKFLOW>

<EXAMPLES>
[Show 2-3 example invocations with different argument combinations]
</EXAMPLES>
```

#### Command 1: init
**File:** `plugins/codex/commands/init.md` (rename from config-init.md)

**Changes:**
- Rename file: `config-init.md` → `init.md`
- Command name: `fractary-codex:config-init` → `fractary-codex:init`
- Reduce from ~500 lines to ~50 lines
- Parse args: `--org <name>`, `--codex <repo>`, `--yes`
- Launch `config-manager` agent
- No implementation logic

#### Command 2: sync
**File:** `plugins/codex/commands/sync.md`

**Changes:**
- Reduce from ~600 lines to ~50 lines
- Parse args: direction, environment, patterns, dry-run
- Launch `sync-manager` agent
- No implementation logic

### Phase 3: Clean Up Files

#### Delete Commands (8 files)
```bash
rm plugins/codex/commands/config-migrate.md
rm plugins/codex/commands/config-validate.md
rm plugins/codex/commands/config-validate-refs.md
rm plugins/codex/commands/document-fetch.md
rm plugins/codex/commands/cache-list.md
rm plugins/codex/commands/cache-clear.md
rm plugins/codex/commands/cache-stats.md
rm plugins/codex/commands/cache-health.md
```

#### Delete Agents (1 file)
```bash
rm plugins/codex/agents/codex-manager.md
```

#### Delete Skills (6 directories)
```bash
rm -rf plugins/codex/skills/cache-list/
rm -rf plugins/codex/skills/cache-clear/
rm -rf plugins/codex/skills/cache-health/
rm -rf plugins/codex/skills/cache-metrics/
rm -rf plugins/codex/skills/document-fetcher/
rm -rf plugins/codex/skills/config-migrator/
```

#### Keep Skills (6 directories)
```bash
plugins/codex/skills/cli-helper/       ✓ (CLI invocation)
plugins/codex/skills/config-helper/    ✓ (Config detection)
plugins/codex/skills/sync-manager/   ✓ (Sync implementation)
plugins/codex/skills/handler-sync-github/  ✓ (Git operations)
plugins/codex/skills/handler-http/     ✓ (HTTP operations)
plugins/codex/skills/repo-discoverer/  ✓ (Repo discovery)
```

### Phase 4: Update Marketplace Manifest

**File:** `plugins/codex/.claude-plugin/plugin.json`

```json
{
  "name": "fractary-codex",
  "version": "4.0.0",
  "description": "Knowledge retrieval and documentation sync - auto-managed memory fabric with MCP integration",
  "commands": "./commands/",
  "agents": [
    "./agents/config-manager.md",
    "./agents/sync-manager.md"
  ],
  "skills": "./skills/"
}
```

### Phase 5: Update Documentation

**Files to update:**
1. `plugins/codex/README.md`
   - Document new simplified architecture
   - Explain MCP auto-management philosophy
   - Update command examples

2. `plugins/codex/QUICK-START.md`
   - Update to only show init + sync commands
   - Remove cache management sections
   - Emphasize MCP auto-fetch

3. `plugins/codex/docs/` (any relevant docs)
   - Remove cache command documentation
   - Update architecture diagrams
   - Clarify self-managing nature

## Final File Structure

```
plugins/codex/
├── .claude-plugin/
│   └── plugin.json (updated: 2 agents)
├── commands/
│   ├── init.md (simplified, renamed)
│   └── sync.md (simplified)
├── agents/
│   ├── config-manager.md (NEW)
│   └── sync-manager.md (NEW)
├── skills/
│   ├── cli-helper/ (keep)
│   ├── config-helper/ (keep)
│   ├── sync-manager/ (keep)
│   ├── handler-sync-github/ (keep)
│   ├── handler-http/ (keep)
│   └── repo-discoverer/ (keep)
├── scripts/
│   ├── setup-cache-dir.sh
│   └── install-mcp.sh
├── config/
│   └── config.example.yaml
├── README.md (updated)
└── QUICK-START.md (updated)
```

## File Changes Summary

### NEW (2 agents)
1. `plugins/codex/agents/config-manager.md`
2. `plugins/codex/agents/sync-manager.md`

### MODIFIED (3 files)
1. `plugins/codex/commands/config-init.md` → `plugins/codex/commands/init.md` (rename + simplify)
2. `plugins/codex/commands/sync.md` (simplify)
3. `plugins/codex/.claude-plugin/plugin.json` (update manifest)

### DELETED (15 files/directories)
**Commands (8):**
1. `plugins/codex/commands/config-migrate.md`
2. `plugins/codex/commands/config-validate.md`
3. `plugins/codex/commands/config-validate-refs.md`
4. `plugins/codex/commands/document-fetch.md`
5. `plugins/codex/commands/cache-list.md`
6. `plugins/codex/commands/cache-clear.md`
7. `plugins/codex/commands/cache-stats.md`
8. `plugins/codex/commands/cache-health.md`

**Agents (1):**
9. `plugins/codex/agents/codex-manager.md`

**Skills (6):**
10. `plugins/codex/skills/cache-list/`
11. `plugins/codex/skills/cache-clear/`
12. `plugins/codex/skills/cache-health/`
13. `plugins/codex/skills/cache-metrics/`
14. `plugins/codex/skills/document-fetcher/`
15. `plugins/codex/skills/config-migrator/`

## Breaking Changes

**For users upgrading from 3.x to 4.0:**

1. **Command renames:**
   - `/fractary-codex:config-init` → `/fractary-codex:init`

2. **Removed commands** (now handled automatically):
   - `/fractary-codex:document-fetch` → Use `codex://` URIs (MCP auto-fetches)
   - `/fractary-codex:cache-list` → Removed (cache self-manages)
   - `/fractary-codex:cache-clear` → Removed (cache self-manages)
   - `/fractary-codex:cache-stats` → Removed (cache self-manages)
   - `/fractary-codex:cache-health` → Removed (cache self-manages)
   - `/fractary-codex:config-migrate` → Manual migration required
   - `/fractary-codex:config-validate` → Removed (CLI validates if installed)
   - `/fractary-codex:validate-refs` → Removed

3. **Migration path:**
   - If you have old JSON config, manually convert to YAML before installing 4.0
   - Use `/fractary-codex:init` to create new config
   - Trust MCP to manage cache automatically
   - Use `/fractary-codex:sync` to force refreshes

## Benefits

1. **Radical Simplification**: 10 commands → 2 commands (80% reduction)
2. **Self-Managing**: Users don't think about cache
3. **Focused**: Each command has one job
4. **Reliable**: Command → Agent pattern is more reliable than Skills
5. **Maintainable**: 2 small agents vs 1 giant agent
6. **Clear Architecture**: Command (router) → Agent (worker) → Skills (helpers)
7. **Fixes Original Bug**: No more broken `@agent-` syntax

## Agent Naming Decision

Need to finalize agent names before implementation:

**Option 1: Simple nouns**
- `config-manager` + `syncer`

**Option 2: Manager suffix**
- `init-manager` + `sync-manager`

**Option 3: Specific nouns**
- `config-config-manager` + `sync-manager`

**Recommendation:** Option 3 (config-config-manager + sync-manager)
- Clear and specific
- Mirrors the skill name pattern we already have
- No confusion with other plugins

## Ready to Implement

All decisions confirmed:
- ✅ 2 commands only (init + sync)
- ✅ 2 agents only (TBD names)
- ✅ 6 helper skills only
- ✅ Remove all cache/config/document commands
- ✅ Remove codex-manager
- ✅ Version 4.0.0 (breaking changes)

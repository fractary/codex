# Cross-Platform Plugin Migration Guide

How to convert a Claude Code plugin project into a portable plugin that works across multiple AI agent platforms (Claude Code, OpenCode, Cursor, Codex, Gemini CLI, etc.).

---

## Changelog

### 2026-04-03
- Updated OpenCode plugin examples to use JavaScript (.js) instead of TypeScript
- Fixed skills discovery to use `config.skills.paths` array
- Updated npm package naming to `@fractary/opencode-core`
- Added `@opencode-ai/plugin` dependency information
- Documented dual-path resolution for local monorepo + marketplace installs

---

## Overview

The migration eliminates platform-specific constructs from plugin artifacts and consolidates everything into **skills** as the single portable unit. Commands are merged into skills. Platform adapters are thin discovery layers — they tell each platform where to find skills, but the skills themselves are identical everywhere.

**Before:** Commands (Claude-specific) + Skills (mixed portability)
**After:** Skills only (fully portable) + thin platform adapters

## Prerequisites

- A Claude Code plugin project with `.claude-plugin/` manifests
- Skills in `plugins/*/skills/*/SKILL.md`
- Optionally, commands in `plugins/*/commands/*.md`
- A CLI binary that skills delegate to (like `fractary-core`, `gh`, etc.)

---

## Phase 1: Audit Existing Artifacts

### 1.1 Inventory commands and skills

List everything:

```bash
# Commands
find plugins/*/commands -name '*.md' 2>/dev/null | sort

# Skills
find plugins/*/skills -name 'SKILL.md' | sort
```

### 1.2 Classify commands

Each command falls into one of two categories:

| Category | How to identify | Action |
|----------|----------------|--------|
| **CLI / Compound** | Body contains CLI calls (`your-cli <command>`) or orchestrates multiple steps | Convert to skill |
| **Skill-delegate** | Body contains `Skill("skill-name"` — just a wrapper that calls an existing skill | Archive without conversion (the skill already exists) |

### 1.3 Audit existing skills for platform-specific language

Search all skills for constructs that won't work on other platforms:

```bash
# Claude Code tool names
grep -rn 'AskUserQuestion\|Use the Bash tool\|Use the Edit tool\|Use the Read tool' plugins/*/skills/

# Claude Code skill invocations
grep -rn 'Skill("' plugins/*/skills/

# Claude Code agent references
grep -rn 'allowed-tools.*Agent\|MCP tools' plugins/*/skills/

# Claude Code model directives
grep -rn '^model:' plugins/*/skills/ plugins/*/commands/
```

---

## Phase 2: Make Existing Skills Portable

For each platform-specific reference found in Phase 1, apply these substitutions:

### Tool references

| Before (Claude-specific) | After (generic) |
|--------------------------|-----------------|
| `Use the Bash tool to run` | `Run` |
| `Use the Edit tool to modify` | `Edit` / `Modify` |
| `Use the Read tool to read` | `Read` |
| `Use AskUserQuestion to ask` | `Ask the user` / `Prompt the user` |
| `Use the Write tool to create` | `Create the file` / `Write` |

### Skill invocations

| Before | After |
|--------|-------|
| `Skill("workflow-event-emitter", {...})` | `Invoke the workflow-event-emitter skill with ...` |
| `Task(agent-name)` | `Delegate to the <agent-name> agent` |

### Agent / tool restriction language

| Before | After |
|--------|-------|
| `Commands restricted with allowed-tools: Agent` | `Commands delegate to agents for execution` |
| `Agents use MCP tools` | `Agents use structured tools` |

### Principle

Models on all platforms understand natural language instructions. Instead of naming a platform's tool explicitly, describe what to do. The platform's tool routing handles the rest.

---

## Phase 3: Convert Commands to Skills

### 3.1 Command anatomy (before)

A typical Claude Code command file:

```yaml
---
name: my-plugin-do-thing
allowed-tools: Bash(my-cli do-thing:*)    # Claude-specific
description: Do a thing
model: claude-haiku-4-5                    # Claude-specific
argument-hint: '<arg> [--flag <value>]'    # Claude-specific
---

## Context

- Current branch: !`git branch --show-current`    # Claude-specific injection

## Your task

Use the **Bash** tool for each step below. Do NOT use the Skill tool.   # Claude-specific

Do a thing using the CLI: `my-cli do-thing <arg> [--flag <value>]`

You MUST use the Bash tool. Execute all steps in a single message.       # Claude-specific
```

### 3.2 Skill anatomy (after)

The same logic as a portable skill:

```yaml
---
name: my-plugin-do-thing
description: Do a thing. Use when you need to do a thing.
---

# Do Thing

## Context

First gather current state:
- Run `git branch --show-current`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<arg>` | Yes | The argument |
| `--flag` | No | Optional flag value |

## Execution

Do a thing using the CLI: `my-cli do-thing <arg> [--flag <value>]`
```

### 3.3 Transformation rules

Apply these transformations when converting each command:

#### Frontmatter

| Command field | Skill field | Notes |
|---------------|-------------|-------|
| `name` | `name` | Keep as-is |
| `description` | `description` | Enhance with "Use when..." trigger phrase for auto-discovery |
| `allowed-tools` | _(remove)_ | Not portable |
| `model` | _(remove)_ | Not portable |
| `argument-hint` | _(remove)_ | Replaced by Arguments table in body |

#### Context injections

Command format uses `!`cmd`` for runtime context injection (a Claude Code feature). Convert to explicit instructions:

```
# Before (command)
- Current branch: !`git branch --show-current`

# After (skill)
## Context

First gather current state:
- Run `git branch --show-current`
```

#### Arguments

Parse the `argument-hint` field into a markdown table:

```
# Before (frontmatter)
argument-hint: '<local-path> [--source <name>] [--remote-path <path>] [--json]'

# After (body)
## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<local-path>` | Yes | Path to local file |
| `--source` | No | Named source from config |
| `--remote-path` | No | Remote storage path |
| `--json` | No | Output as JSON |
```

Positional args (no `--` prefix) are required. Bracketed args (`[--flag]`) are optional.

#### Body directives to strip

Remove these Claude Code-specific lines from the body:

- `Use the **Bash** tool for each step below.`
- `Do NOT use the Skill tool.`
- `You MUST use the Bash tool for all commands above.`
- `Execute all steps in a single message.`
- `Do not use any other tools.`
- `Do NOT call yourself recursively.`
- `Call \`...\` with Bash exactly once. Do not use any other tools.`
- `**IMPORTANT: The CLI binary is \`...\`, NOT \`...\`**`

#### Section headers

| Before | After |
|--------|-------|
| `## Your task` | `## Execution` (or just remove the header and let content flow) |
| `## Rules` (if only tool restrictions) | Remove entirely |
| `## Rules` (if has business logic) | Keep, but strip tool-restriction bullets |

#### Description enhancement

Add an auto-discovery trigger phrase if one isn't naturally present:

```
# Before
description: Upload a file to storage

# After
description: Upload a file to storage. Use when uploading files to remote storage.
```

Skip the trigger phrase if it would be tautological (i.e., the description already implies when to use it).

### 3.4 Archive originals

Move converted command files to an archive directory to preserve git history:

```bash
# Per plugin
mkdir -p plugins/<name>/commands-archived/
git mv plugins/<name>/commands/*.md plugins/<name>/commands-archived/
```

### 3.5 Skill-delegate commands

For commands whose body just calls `Skill("existing-skill")`, there's nothing to convert — the skill already exists. Just archive the command wrapper. Optionally enhance the existing skill's description for better auto-discovery.

---

## Phase 4: Update Manifests

### 4.1 Plugin manifests (`plugin.json`)

Remove the `commands` field. Keep only `skills`:

```json
{
    "name": "my-plugin",
    "version": "2.0.0",
    "description": "What this plugin does",
    "skills": "./skills/"
}
```

Before (remove these):
```json
{
    "commands": "./commands/",
    "commands": [
        "./commands/my-plugin-foo.md",
        "./commands/my-plugin-bar.md"
    ]
}
```

### 4.2 Marketplace manifest (`marketplace.json`)

Same treatment — remove all `commands` arrays from each plugin entry. The `skills` field is sufficient.

### 4.3 Root `package.json`

Remove any platform-specific prompt registrations (e.g., `pi.prompts` arrays). Add `main` pointing to the OpenCode plugin if applicable:

```json
{
    "main": ".opencode/plugins/your-plugin.js"
}
```

---

## Phase 5: Create Platform Adapters

Platform adapters are thin files that tell each platform where to find skills and that the CLI exists. They do NOT contain skill logic — that lives in the skill files.

### 5.1 OpenCode (`.opencode/plugins/<project-name>.js`)

OpenCode uses JavaScript plugins with hooks. Each plugin project gets its own adapter file named after the project (e.g., `fractary-core.js`, `fractary-faber.js`).

The adapter needs to find skills in two locations:
1. **Local monorepo** — when developing the plugin project itself
2. **Claude marketplace install** — when the plugin is installed in another project (`~/.claude/plugins/marketplaces/<project-name>/`)

```javascript
import fs from 'fs'
import path from 'path'
import os from 'os'

const PLUGIN_NAMES = ['core', 'repo', 'work'] // your plugin names
const MARKETPLACE_PATH = path.join(
  os.homedir(),
  '.claude',
  'plugins',
  'marketplaces',
  'your-project-name',
)

export const MyPlugin = async ({ directory }) => {
  const pluginRoot = findPluginRoot(directory)

  return {
    config: async (config) => {
      config.skills = config.skills || {}
      config.skills.paths = config.skills.paths || []

      for (const name of PLUGIN_NAMES) {
        const skillsDir = path.join(pluginRoot, 'plugins', name, 'skills')
        if (fs.existsSync(skillsDir)) {
          config.skills.paths.push(skillsDir)
        }
      }
    },

    'experimental.chat.system.transform': async (_input, output) => {
      output.system.push([
        'You have access to the `your-cli` CLI.',
        'Skills are loaded from `plugins/*/skills/`.',
        'Configuration is at `.your-config/config.yaml`.',
        '',
        'Key CLI commands:',
        '- `your-cli repo commit|push|branch-create`',
        '- `your-cli work issue-create|issue-list`',
        // ... list your CLI command groups
      ].join('\n'))
    },
  }
}

function findMonorepoRoot(dir) {
  let current = dir
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'plugins', 'core', '.claude-plugin'))) {
      return current
    }
    current = path.dirname(current)
  }
  return null
}

function findPluginRoot(directory) {
  const monorepo = findMonorepoRoot(directory)
  if (monorepo) return monorepo

  if (fs.existsSync(path.join(MARKETPLACE_PATH, 'plugins', 'core'))) {
    return MARKETPLACE_PATH
  }

  return directory
}
```

Also create `.opencode/package.json` for npm publishing:

```json
{
  "name": "@your-org/opencode-your-project",
  "version": "1.0.0",
  "type": "module",
  "main": "./plugins/your-project-name.js",
  "keywords": ["opencode-plugin"],
  "license": "Apache-2.0",
  "dependencies": {
    "@opencode-ai/plugin": "1.3.x"
  }
}
```

**Important:**
- **Use JavaScript (.js), not TypeScript (.ts)** — OpenCode plugins work best as JavaScript modules
- **Initialize `config.skills.paths` array** before pushing to it
- **The plugin name should match your plugin entry point filename** (e.g., `fractary-core.js` exports `FractaryCorePlugin`)
- **Dual-path resolution** discovers skills whether you're developing locally or installed via marketplace

### 5.2 Cursor (`.cursor/rules/<name>.mdc`)

Cursor uses MDC format rules files:

```markdown
---
description: Your plugin skills and CLI reference
globs:
alwaysApply: true
---

# Your Plugin

This project uses the `your-cli` CLI and skills for development operations.

## Skills

Skills are in `plugins/*/skills/*/SKILL.md`. Read the relevant skill for detailed guidance.

## CLI

Run `your-cli --help` for full usage. Key commands:
- `your-cli repo commit|push|branch-create`
- `your-cli work issue-create|issue-list`
```

### 5.3 Codex (`codex.md`)

Codex reads `codex.md` from the project root:

```markdown
# Your Plugin

This project uses the `your-cli` CLI for development operations.
Skills in `plugins/*/skills/` provide detailed guidance for each operation.
Run `your-cli --help` for full CLI usage.
```

### 5.4 Gemini CLI (`GEMINI.md`)

Gemini CLI reads `GEMINI.md` from the project root:

```markdown
# Your Plugin

This project uses the `your-cli` CLI for development operations.
Skills in `plugins/*/skills/` provide detailed guidance for each operation.
Run `your-cli --help` for full CLI usage.
```

### 5.5 Claude Code

No adapter needed — Claude Code discovers skills natively via `.claude-plugin/` manifests and `plugin.json` files.

---

## Phase 6: Validate

### 6.1 No platform-specific language remains

```bash
# Should return zero results
grep -rn 'allowed-tools\|AskUserQuestion\|Use the Bash tool\|Use the Edit tool' \
  plugins/*/skills/*/SKILL.md

# Check for Claude-specific frontmatter
grep -rn '^model:\|^allowed-tools:\|^argument-hint:' \
  plugins/*/skills/*/SKILL.md
```

### 6.2 All skills have required frontmatter

```bash
# Every SKILL.md should have name and description
for f in plugins/*/skills/*/SKILL.md; do
  if ! grep -q '^name:' "$f"; then echo "MISSING name: $f"; fi
  if ! grep -q '^description:' "$f"; then echo "MISSING description: $f"; fi
done
```

### 6.3 No commands remain in manifests

```bash
grep -rn '"commands"' plugins/*/.claude-plugin/plugin.json .claude-plugin/marketplace.json
# Should return zero results
```

### 6.4 Platform adapters reference correct paths

Verify each adapter points to your actual plugin directories and CLI binary name.

---

## Quick Reference: File Changes Summary

| What | Before | After |
|------|--------|-------|
| Commands | `plugins/*/commands/*.md` | Archived to `plugins/*/commands-archived/` |
| New skills | _(don't exist)_ | `plugins/*/skills/<name>/SKILL.md` |
| Existing skills | May have platform-specific refs | Generic tool references |
| `plugin.json` | Has `commands` field | Only `skills` field |
| `marketplace.json` | Has `commands` arrays | No `commands` arrays |
| `package.json` | May have `pi.prompts` | Removed; added `main` for OpenCode |
| OpenCode adapter | _(doesn't exist)_ | `.opencode/plugins/<name>.js` (JavaScript) |
| OpenCode package.json | _(doesn't exist)_ | `.opencode/package.json` with `@opencode-ai/plugin` dep |
| Cursor adapter | _(doesn't exist)_ | `.cursor/rules/<name>.mdc` |
| Codex adapter | _(doesn't exist)_ | `codex.md` |
| Gemini adapter | _(doesn't exist)_ | `GEMINI.md` |

## Automation

The conversion of commands to skills can be automated. See `scripts/convert-commands-to-skills.js` in the Fractary Core repo for a reference implementation that:

1. Parses YAML frontmatter from command files
2. Classifies commands as skill-delegate vs CLI/compound
3. Strips platform-specific directives from body text
4. Extracts `!`cmd`` context injections into Context sections
5. Parses `argument-hint` into Arguments tables
6. Enhances descriptions with auto-discovery trigger phrases
7. Generates portable SKILL.md files

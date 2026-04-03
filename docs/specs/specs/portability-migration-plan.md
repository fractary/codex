# Portability Migration Plan for Fractary Core

**Status:** Planning Phase
**Last Updated:** 2026-04-03
**Author:** AI Assistant
**Priority:** High

---

## Changelog

### 2026-04-03
- Updated OpenCode plugin to use `fractary-core.js` (JavaScript instead of TypeScript)
- Fixed skills discovery to use `config.skills.paths` array
- Updated npm package name to `@fractary/opencode-core`
- Documented dual-path resolution: local monorepo + Claude marketplace
- Added `@opencode-ai/plugin` dependency requirement

### 2026-04-02
- Initial draft of portability migration plan
- Defined generic tool reference guidelines
- Outlined multi-platform architecture

---

## Executive Summary

Transform Fractary Core from a **Claude Code-only plugin system** into a **multi-platform portable skills framework** that works across OpenCode, Cursor, Codex, Copilot CLI, Gemini CLI, and Pi—while maintaining SDK-first architecture and keeping all deterministic logic in the SDK.

**Core Principle:** Single source of truth for skills + generic tool references that models naturally map to platform-specific tools. No skill duplication across platforms.

**Phase 1 (Immediate)**: OpenCode support via plugin + skills discovery
**Phase 2**: Cursor support via marketplace plugin
**Phase 3**: Codex support via native skill discovery
**Phase 4**: Additional platforms (Copilot, Gemini, Pi)

---

## Architecture Overview

### Three-Layer Design (Maintain SDK-First)

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: Universal Skills (Portable, Platform-Independent)  │
│ - Markdown with YAML frontmatter                            │
│ - Instruction patterns, no execution logic                  │
│ - GENERIC tool references (not platform-specific)           │
│ - Single source of truth - no duplication                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: Platform Adapters (Platform-Specific)             │
│ - OpenCode: JavaScript plugin registers skills + maps tools  │
│ - Cursor: JSON plugin for marketplace                        │
│ - Codex: Symlink for native discovery                        │
│ - Gemini: Extension manifest                                 │
│ - Claude Code: Existing plugin.json (no changes needed)      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: Translation Layer (Automatic Tool Mapping)        │
│ - Models automatically map generic references to tools      │
│ - e.g., "use subagent" → Task() or @mention                 │
│ - e.g., "use todo tool" → TodoWrite or todowrite             │
│ - NO explicit mapping in skills - handled by models          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 4: SDK/CLI (Deterministic Logic - KEEP AS-IS)         │
│ - @fractary/core: TypeScript SDK                            │
│ - fractary-core-cli: Command-line interface                  │
│ - All actual execution logic lives here                      │
│ - Skills reference: "fractary-core work issue-fetch #123"     │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decision

**Generic Tool References Over Platform-Specific Mappings**

Instead of explicit tool mappings like:
- ❌ `TodoWrite` (Claude) vs `todowrite` (OpenCode) vs `TaskCreate` (Codex)
- ❌ `Task(subagent_type)` (Claude) vs `@agent` (OpenCode)

Use generic language that models naturally interpret:
- ✅ **"Use the todo tool to add a task"** → Model selects `TodoWrite`, `todowrite`, `TaskCreate`, etc.
- ✅ **"Dispatch a subagent to handle this"** → Model selects `Task()`, `@mention`, or multi-agent
- ✅ **"Ask the user a question"** → Model selects `AskUserQuestion` or `question` tool
- ✅ **"Read the file"** → Model selects `Read`, `ReadFile`, or equivalent

This approach:
- Eliminates need for platform-specific skill variations
- Leverages model's ability to understand intent and select appropriate tools
- Maintains single source of truth for all skills
- Reduces maintenance burden significantly

**Why This Works:**
- Modern AI models understand tool semantics from context
- Tool naming is converging across platforms (TodoWrite/todowrite, Read/write/edit, etc.)
- Description-driven tool selection is more robust than hardcoded mappings
- Follows the pattern used successfully by Superpowers

---

## Generic Tool Reference Guidelines

### Standard Patterns

| Generic Phrase | Expected Tool Behavior |
|----------------|----------------------|
| "use the todo tool to..." | Create/update/list tasks |
| "add a task to the todo list" | Create task item |
| "read the file at..." | Read file contents |
| "write/create this file" | Write file contents |
| "edit/update this file" | Modify file contents |
| "search for..." | Pattern/search in files |
| "execute this command" | Run bash/shell command |
| "dispatch a subagent to..." | Spawn subagent for work |
| "assign this to [subagent]" | Delegate to specific subagent type |
| "ask the user to confirm/choose..." | Interactive prompt |
| "ask a question with options" | Multi-choice prompt |

### Subagent Dispatch Patterns

✅ **Generic:**
- "Dispatch a subagent to handle this work"
- "Use the [specific-subagent] to complete this task"
- "Delegate this to a fresh agent with no context"
- "Spawn a helper to process this"

❌ **Platform-specific (avoid):**
- "Use the Task tool with subagent_type='xyz'"
- "@xyz-agent please do this"
- "Call Task(subagent_type='xyz')"

### User Interaction Patterns

✅ **Generic:**
- "Ask the user for confirmation"
- "Present options to the user"
- "Request user input for..."
- "Prompt the user to select from..."

❌ **Platform-specific (avoid):**
- "Use AskUserQuestion with these options..."
- "Call question tool with header..."
- "Use the prompt API with..."

### File Operation Patterns

✅ **Generic:**
- "Read the file at path/to/file.md"
- "Create a new file with these contents"
- "Update the file to include this change"
- "Search for all files matching pattern"
- "Find where this function is defined"

❌ **Platform-specific (avoid):**
- "Use Read tool to read the file"
- "Call Write with the following content"
- "Use Edit to replace this text"

### Task Tracking Patterns

✅ **Generic:**
- "Add this to the todo list"
- "Create a task for: [description]"
- "Mark the task as completed"
- "Update task status to in_progress"
- "List all current tasks"

❌ **Platform-specific (avoid):**
- "Use TodoWrite to create task"
- "Call todowrite with new todos"

---

## Phase 1: OpenCode Support (Priority #1)

### 1.1 Create OpenCode Plugin Structure

```bash
mkdir -p .opencode/plugins/
mkdir -p .opencode/skills/
```

### 1.2 Create OpenCode Plugin

**File:** `.opencode/plugins/fractary-core.js`

```javascript
import fs from 'fs'
import path from 'path'
import os from 'os'

/**
 * Fractary Core plugin for OpenCode.
 *
 * Registers skill directories so OpenCode discovers all Fractary skills,
 * and injects a system-level note about CLI availability.
 *
 * Skills are found in order of preference:
 *   1. Local monorepo (plugins/core/.claude-plugin exists in ancestor dir)
 *   2. Claude marketplace install (~/.claude/plugins/marketplaces/fractary-core)
 */

const PLUGIN_NAMES = ['core', 'repo', 'work', 'file', 'logs', 'docs']
const MARKETPLACE_PATH = path.join(
  os.homedir(),
  '.claude',
  'plugins',
  'marketplaces',
  'fractary-core',
)

export const FractaryCorePlugin = async ({ directory }) => {
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
      output.system.push(
        [
          'You have access to the `fractary-core` CLI for repository operations,',
          'work/issue tracking, documentation, logging, and file storage.',
          'Fractary skills are loaded and available for reference.',
          'Configuration is at `.fractary/config.yaml`.',
          '',
          'Key CLI commands:',
          '- `fractary-core repo commit|push|branch-create|pr-create|pr-merge|pull`',
          '- `fractary-core work issue-create|issue-fetch|issue-list|issue-update|issue-search`',
          '- `fractary-core docs doc-create|doc-list|doc-get|doc-update|doc-search`',
          '- `fractary-core logs write|list|read|search|archive|analyze`',
          '- `fractary-core file upload|download|list|copy|move|delete`',
          '- `fractary-core config show|validate`',
          '',
          'Run `fractary-core --help` or `fractary-core <plugin> --help` for full usage.',
        ].join('\n'),
      )
    },
  }
}

/** Walk up from the working directory looking for the monorepo marker. */
function findMonorepoRoot(dir) {
  let current = dir
  while (current !== path.dirname(current)) {
    if (
      fs.existsSync(path.join(current, 'plugins', 'core', '.claude-plugin'))
    ) {
      return current
    }
    current = path.dirname(current)
  }
  return null
}

/**
 * Resolve the root directory containing the plugins/ tree.
 *
 * Prefers the local monorepo (developer working in fractary-core itself),
 * falls back to the Claude marketplace install path.
 */
function findPluginRoot(directory) {
  const monorepo = findMonorepoRoot(directory)
  if (monorepo) return monorepo

  if (fs.existsSync(path.join(MARKETPLACE_PATH, 'plugins', 'core'))) {
    return MARKETPLACE_PATH
  }

  return directory
}
```

### 1.3 Create Skills Registry

**File:** `.opencode/skills/.registry.json`

```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-04-02",
  "plugins": {
    "core": {
      "path": "../plugins/core/skills",
      "description": "Configuration and environment management",
      "skills": []
    },
    "work": {
      "path": "../plugins/work/skills",
      "description": "GitHub Issues management",
      "skills": []
    },
    "repo": {
      "path": "../plugins/repo/skills",
      "description": "Source control operations",
      "skills": [
        "fractary-repo-commit-format",
        "fractary-repo-code-review-checklist",
        "fractary-repo-pr-template"
      ]
    },
    "logs": {
      "path": "../plugins/logs/skills",
      "description": "Operational log management",
      "skills": []
    },
    "file": {
      "path": "../plugins/file/skills",
      "description": "File storage (Local, S3, R2, GCS, Google Drive)",
      "skills": []
    },
    "docs": {
      "path": "../plugins/docs/skills",
      "description": "Documentation system",
      "skills": []
    },
    "status": {
      "path": "../plugins/status/skills",
      "description": "Status line customization",
      "skills": []
    }
  }
}
```

### 1.4 Standardize Skills with YAML Frontmatter

Create audit script: `.opencode/scripts/audit-skills.mjs`

```javascript
import fs from 'fs'
import path from 'path'

function auditSkills() {
  const registryPath = path.join(new URL('.', import.meta.url).pathname, '.opencode/skills/.registry.json')
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))

  for (const [pluginName, pluginData] of Object.entries(registry.plugins)) {
    const pluginPath = path.join(process.cwd(), pluginData.path)

    if (fs.existsSync(pluginPath)) {
      const skillFolders = fs.readdirSync(pluginPath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
      pluginData.skills = skillFolders
    }
  }

  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2))
  console.log('✅ Skills registry updated')
}

auditSkills()
```

**Required frontmatter for all SKILL.md files:**

```yaml
---
name: fractary-repo-commit-format
description: Use when creating commits, before writing commit message. Ensures conventional commit format with proper type and scope.
version: 3.1.0
plugin: fractary-repo
tags: [git, commits, version-control, best-practices]
---

# Commit Format
```

### 1.5 Create Installation Guide

**File:** `.opencode/INSTALL.md`

```markdown
# Installing Fractary Core for OpenCode

## Prerequisites

- OpenCode.ai installed
- Fractary Core SDK installed (optional)
  \`\`\`bash
  npm install -g @fractary/core-cli
  \`\`\`

## Installation

Add Fractary Core to the \`plugin\` array in your \`opencode.json\`:

**Git-based (Recommended for development):**
\`\`\`json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["git+https://github.com/fractary/core.git#.opencode"]
}
\`\`\`

**npm-based (Recommended for production):**
\`\`\`json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@fractary/opencode-core"]
}
\`\`\`

Restart OpenCode.

## Usage

Ask naturally:
- "Initialize Fractary configuration"
- "Create a GitHub issue for [feature]"
- "Help me commit and push these changes"
- "Write a log entry for this debugging session"

Skills will automatically be discovered and the model will use appropriate tools.

## Package Structure

The npm package \`@fractary/opencode-core\` provides:
- Plugin: \`./plugins/fractary-core.js\`
- Skills: Auto-discovered from \`plugins/*/skills/\`
- Dependencies: \`@opencode-ai/plugin\`
```

---

## Phase 2: Cursor Support

### 2.1 Create Cursor Plugin Generation Script

**File:** `.cursor-plugin/generate-plugins.mjs`

```javascript
import fs from 'fs'
import path from 'path'

const plugins = ['core', 'work', 'repo', 'logs', 'file', 'docs', 'status']

for (const plugin of plugins) {
  const sourcePluginJson = path.join(process.cwd(), 'plugins', plugin, '.claude-plugin', 'plugin.json')
  const targetDir = path.join(process.cwd(), 'plugins', plugin, '.cursor-plugin')

  if (fs.existsSync(sourcePluginJson)) {
    fs.mkdirSync(targetDir, { recursive: true })

    const pluginData = JSON.parse(fs.readFileSync(sourcePluginJson, 'utf-8'))
    const cursorData = {
      name: pluginData.name,
      displayName: pluginData.name.replace(/^fractary-/, '').toUpperCase(),
      description: pluginData.description,
      version: pluginData.version,
      author: pluginData.author,
      license: pluginData.license || 'MIT',
      skills: './skills',
      agents: './agents',
      commands: pluginData.commands,
      hooks: pluginData.hooks
    }

    fs.writeFileSync(
      path.join(targetDir, 'plugin.json'),
      JSON.stringify(cursorData, null, 2)
    )

    console.log(\`✅ Created Cursor plugin for: \${plugin}\`)
  }
}
```

### 2.2 Create Installation Guide

**File:** `.cursor-plugin/INSTALL.md`

```markdown
# Installing Fractary Core for Cursor

## Installation

1. Open Cursor Agent chat
2. Run: \`/add-plugin fractary-core\`

## Usage

Ask naturally for any Fractary capability. Skills work identically across all platforms.
```

---

## Phase 3: Codex Support

### 3.1 Installation Script

**File:** `.codex/install.sh`

```bash
#!/bin/bash

echo "Installing Fractary Core for Codex..."

# Clone repository
git clone https://github.com/fractary/core.git ~/.codex/fractary-core

# Create skills directory
mkdir -p ~/.agents/skills

# Symlink skills from all plugins
plugins=(core work repo logs file docs status)
for plugin in "${plugins[@]}"; do
  if [ -d "$HOME/.codex/fractary-core/plugins/$plugin/skills" ]; then
    ln -sf "$HOME/.codex/fractary-core/plugins/$plugin/skills" \
           "$HOME/.agents/skills/fractary-$plugin"
    echo "✅ Linked fractary-$plugin"
  fi
done

echo "Installation complete! Restart Codex to discover skills."
```

### 3.2 Installation Guide

**File:** `.codex/INSTALL.md`

```markdown
# Installing Fractary Core for Codex

## Installation

\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/fractary/core/main/.codex/install.sh | bash
\`\`\`

Or manually:
\`\`\`bash
git clone https://github.com/fractary/core.git ~/.codex/fractary-core
for plugin in core work repo logs file docs status; do
  ln -sf ~.codex/fractary-core/plugins/\$plugin/skills ~.agents/skills/fractary-\$plugin
done
\`\`\`

## Usage

Skills are automatically discovered. Ask naturally—no tool mapping required.
```

---

## Phase 4: Additional Platforms (Future)

### Copilot CLI

**File:** `.copilot-plugin/package.json`

```json
{
  "name": "fractary-core",
  "version": "3.6.0",
  "description": "Fractary Core plugins for GitHub Copilot CLI",
  "skills": "../plugins/*/skills"
}
```

### Gemini CLI

**File:** `gemini-extension.json`

```json
{
  "name": "fractary-core",
  "description": "Fractary Core plugins for Gemini CLI",
  "version": "3.6.0",
  "skills": ["./plugins/*/skills"]
}
```

---

## Implementation Roadmap

### Week 1: OpenCode Foundation

- [x] Create `.opencode/` directory structure
- [ ] Write OpenCode plugin (`.opencode/plugins/fractary-core.ts`)
- [ ] Create skills registry (`.opencode/skills/.registry.json`)
- [ ] Write audit script for skills frontmatter
- [ ] Add YAML frontmatter to all existing skills
- [ ] Create installation guide (`.opencode/INSTALL.md`)
- [ ] Test OpenCode plugin locally

### Week 2: OpenCode Polish + Documentation

- [ ] Create unified tool reference documentation
- [ ] Update root README.md with multi-platform badges
- [ ] Add platform badges to README
- [ ] Write skill authoring guide with generic tool references
- [ ] Create npm package for `@fractary/core`
- [ ] Test with real development workflow
- [ ] Write troubleshooting guide

### Week 3: Cursor Support

- [ ] Create `.cursor-plugin/` directory structure
- [ ] Write plugin generation script
- [ ] Generate Cursor manifests for all plugins
- [ ] Create installation guide (`.cursor-plugin/INSTALL.md`)
- [ ] Test with Cursor

### Week 4: Codex Support

- [ ] Create `.codex/` directory structure
- [ ] Write installation instructions (`.codex/INSTALL.md`)
- [ ] Create symlink setup scripts (macOS/Linux/Windows)
- [ ] Test Codex skill discovery
- [ ] Write troubleshooting guide

### Week 5: Documentation & Publishing

- [ ] Write comprehensive portability guide
- [ ] Update all plugin READMEs with multi-platform info
- [ ] Add platform badges to each plugin
- [ ] Create CHANGELOG entries
- [ ] Publish `@fractary/core` to npm
- [ ] Update GitHub repository with releases

---

## Generic Tool Reference Examples

### Example 1: Task Tracking

**Instead of:**
```markdown
Use TodoWrite to add these tasks to the todo list:
- Task 1
- Task 2
```

**Use:**
```markdown
Add these tasks to the todo list:
- Task 1
- Task 2
```

### Example 2: Subagent Dispatch

**Instead of:**
```markdown
Use Task with subagent_type="code-reviewer" to review the code
```

**Use:**
```markdown
Dispatch a subagent to review the code using the code reviewer persona
```

### Example 3: User Interaction

**Instead of:**
```markdown
Use AskUserQuestion with options: [Yes, No]
```

**Use:**
```markdown
Ask the user to confirm if they want to proceed (Yes/No)
```

### Example 4: File Operations

**Instead of:**
```markdown
Use Read to read the file at path/to/file.md
```

**Use:**
```markdown
Read the file at path/to/file.md
```

---

## Skill Authoring Guidelines

### 1. Use Generic Language

✅ DO:
- "Add a task to the todo list"
- "Dispatch a subagent to handle this work"
- "Read the file"
- "Ask the user for confirmation"

❌ DON'T:
- "Use TodoWrite to add..."
- "Use Task with subagent_type='xyz'"
- "Use Read tool to read..."
- "Use AskUserQuestion with options..."

### 2. Focus on Intent

Describe **what** you want done, not **how** to do it with specific tools.

✅ DO:
```markdown
When the user asks to create a documentation page:
1. Create a new markdown file in the docs directory
2. Add a header and template structure
3. Prompt the user for the content they want to document
```

❌ DON'T:
```markdown
When the user asks to create a documentation page:
1. Use Write tool to create docs/new-page.md
2. Use Edit tool to add header
3. Use AskUserQuestion to prompt for content
```

### 3. Leverage Context

Trust the model to understand context and select appropriate tools.

### 4. Model as the Translator

Model capabilities:
- Understand semantic intent
- Select appropriate tools for intent
- Handle platform differences automatically
- Adapt to available toolset

---

## Publishing Strategy

### npm Package

**Package Name:** `@fractary/opencode-core`

**Structure:**
```
.opencode/
├── package.json           # npm package manifest
├── plugins/
│   └── fractary-core.js   # OpenCode plugin entry point
└── bun.lock              # Bun lockfile for dependencies
```

**package.json:**
```json
{
  "name": "@fractary/opencode-core",
  "version": "1.0.2",
  "type": "module",
  "main": "./plugins/fractary-core.js",
  "keywords": ["opencode-plugin", "fractary"],
  "repository": {
    "type": "git",
    "url": "https://github.com/fractary/core",
    "directory": ".opencode"
  },
  "license": "Apache-2.0",
  "dependencies": {
    "@opencode-ai/plugin": "1.3.13"
  }
}
```

**opencode.json installation:**
```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@fractary/opencode-core"]
}
```

### GitHub Marketplace

- Update existing Claude Code marketplace entry
- Add multi-platform badge
- Link to platform-specific installation guides

### README Updates

```markdown
# Fractary Core

**Multi-Platform Plugins for AI Coding Agents**

| Platform | Status | Installation |
|----------|--------|--------------|
| Claude Code | ✅ Built-in | `/plugin marketplace add fractary/core-marketplace` |
| OpenCode | ✅ Available | `npm install -g @fractary/opencode-core` |
| Cursor | ✅ Available | `/add-plugin fractary-core` |
| Codex | ✅ Available | See [INSTALL.md](.codex/INSTALL.md) |
| Copilot CLI | 🚧 Planned | Coming Soon |
| Gemini CLI | 🚧 Planned | Coming Soon |

## OpenCode Installation

Add to \`opencode.json\`:
\`\`\`json
{
  "plugin": ["@fractary/opencode-core"]
}
\`\`\`

Or install from git:
\`\`\`json
{
  "plugin": ["git+https://github.com/fractary/core.git#.opencode"]
}
\`\`\`
```

---

## Testing Strategy

### Manual Testing Checklist

For each platform:
- [ ] Plugin/skills load successfully
- [ ] Skills are discoverable
- [ ] Basic skill invocation works
- [ ] CLI commands execute correctly
- [ ] Task tracking functions
- [ ] Subagent dispatch works
- [ ] File operations work
- [ ] User interactions work

### Automated Testing

- [ ] Skills frontmatter validation script
- [ ] Registry generation and validation
- [ ] Cross-platform skill execution tests
- [ ] CLI command integration tests

---

## Metrics for Success

- **Single source of truth**: No duplicate skills across platforms
- **Zero platform-specific code in skills**: Skills work everywhere
- **Model-driven translation**: No hardcoded tool mappings in skills
- **Maintenance efficiency**: Update skill once, works on all platforms
- **User experience**: Natural language prompts work regardless of platform

---

## Open Questions

1. Should we create a standard subagent naming convention (e.g., `code-reviewer`, `implementor`) that works across platforms?
2. Do we need to handle special cases where a platform lacks a tool type (e.g., no todo capability)?
3. Should we add platform-specific hints as comments in skills (e.g., `<!-- Tip: On OpenCode, this uses todowrite -->`)?

---

## References

- [Superpowers GitHub](https://github.com/obra/superpowers) - Inspiration for portable skills architecture
- [OpenCode Plugin Documentation](https://opencode.ai/docs/plugins/)
- [Claude Code Plugin Documentation](https://claude.com/docs/plugins)
- [Current Fractary Architecture](../README.md)

---

## Appendix: Current Skills Inventory

| Plugin | Skills Count | Status |
|--------|-------------|---------|
| core | 0 | Needs review |
| work | 0 | Needs review |
| repo | 3 | Ready (commit-format, code-review-checklist, pr-template) |
| logs | 0 | Needs review |
| file | 0 | Needs review |
| docs | 0 | Needs review |
| status | 0 | Needs review |

---

**Document Version:** 1.0
**Next Review:** After Phase 1 completion
**Owners:** The Fractary Team
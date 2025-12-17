# SPEC-00026: Distributed Plugin Architecture

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Created** | 2025-12-16 |
| **Author** | Claude (with human direction) |
| **Related** | SPEC-00016-sdk-architecture, SPEC-FORGE-005-registry-manifest-system |

## 1. Executive Summary

This specification defines the migration from a **centralized plugin repository** to a **distributed plugin architecture** where plugins live alongside the SDKs and services they wrap. This architectural change addresses scalability, versioning coherence, and establishes a clear third-party plugin development model.

### 1.1 Scope

This document covers:
- Migration from centralized `fractary/plugins` repository to distributed repositories
- Repository structure for domain-specific plugin hosting
- Plugin colocation patterns (plugins living with their SDKs)
- **Multi-language SDK support** (JavaScript and Python)
- **MCP server architecture** per SDK for universal tool access
- **CLI architecture** as separate package per SDK
- **Universal naming convention** with `fractary-` prefix
- Registry system for plugin discovery and distribution
- Versioning strategy for SDK-plugin coherence
- Third-party plugin development model
- Migration path from current architecture

### 1.2 Design Goals

1. **Colocation** - Plugins live with the code they wrap for easier synchronization
2. **Version Coherence** - Plugin versions track SDK versions naturally
3. **Multi-Language Support** - SDKs available in JavaScript and Python
4. **MCP-First Integration** - MCP servers provide universal tool access across frameworks
5. **Universal Naming** - Consistent `fractary-` prefix prevents conflicts
6. **Separation of Concerns** - CLI, SDK, and MCP server as separate packages
7. **Third-party Model** - Clear, replicable pattern for external plugin developers
8. **Ownership** - Each project owns its plugin definitions
9. **Discovery** - Central registry maintains discoverability
10. **Industry Alignment** - Follows npm/PyPI/crates.io distribution patterns
11. **Format Agnostic** - Plugins created in native framework format, no custom format required
12. **Universal Orchestration** - Faber orchestrates agents from any framework with any model

### 1.3 Key Changes

| Aspect | Current (Centralized) | Proposed (Distributed) |
|--------|----------------------|------------------------|
| **Plugin Location** | `fractary/plugins` (all plugins) | `fractary/core/plugins`, `fractary/faber/plugins`, `fractary/codex/plugins` |
| **SDK Languages** | JavaScript only | JavaScript + Python |
| **Integration Layer** | CLI only | MCP servers (primary) + CLI (fallback) |
| **Package Structure** | Monolithic | Separate packages (SDK, CLI, MCP server) |
| **Naming Convention** | Inconsistent | Universal `fractary-` prefix |
| **SDK-Plugin Sync** | Cross-repo coordination | Same PR updates both |
| **Versioning** | Independent versions | Plugin version tracks SDK version |
| **Discovery** | Directory listing | Registry manifest |
| **Third-party Pattern** | Unclear | "Create plugin in your SDK repo" |
| **Plugin Format** | Custom format attempts | Native framework formats (Claude Code, LangChain, etc.) |
| **Format Conversion** | CI/CD pipeline | Runtime adaptation by Faber when orchestrating |
| **Orchestration** | Framework-specific | Universal (Faber adapts any format to LangGraph) |

## 2. Background & Motivation

### 2.1 Current Architecture Limitations

The existing centralized `fractary/plugins` repository contains 11 plugins spanning multiple domains:

**Primitives (8):**
- work, repo, file, spec, docs, logs, status, codex

**Workflows (2):**
- faber, faber-cloud

**Meta-tooling (1):**
- faber-agent

**Problems with this approach:**

1. **Cross-repo coordination overhead**
   - SDK change in `fractary/core` requires separate PR in `fractary/plugins`
   - Version skew between SDK and plugin
   - Testing requires coordinating multiple repositories

2. **Unclear plugin ownership**
   - Who owns the `codex` plugin - the codex team or the plugins team?
   - Which repository should a contributor modify?

3. **No clear third-party model**
   - How should external developers create plugins?
   - Should they fork the centralized plugins repo?
   - How do they distribute their plugins?

4. **Versioning complexity**
   - Plugin version doesn't correspond to SDK version
   - Breaking SDK changes can silently break plugins
   - No automatic version tracking

5. **Repository sprawl**
   - Central repo grows unbounded as new plugins are added
   - Unrelated plugins share a repository
   - No clear organizational boundaries

### 2.2 Industry Patterns

Successful package ecosystems use distributed repositories with central registries:

| Ecosystem | Package Location | Discovery Mechanism |
|-----------|------------------|---------------------|
| **npm** | Distributed repos | Central registry (npmjs.com) |
| **PyPI** | Distributed repos | Central registry (pypi.org) |
| **crates.io** | Distributed repos | Central registry (crates.io) |
| **Docker Hub** | Distributed repos | Central registry (hub.docker.com) |
| **Helm Charts** | Distributed repos | Chart repositories |

**Common pattern:**
- Code lives in distributed repositories
- Registry provides discovery and metadata
- Versioning handled per package
- Clear ownership boundaries

### 2.3 Desired End State

**For Fractary developers:**
- SDK change → plugin update in same commit
- Single PR for breaking changes
- Clear ownership per domain

**For third-party developers:**
- "If you have an SDK, create a plugin in the same repo"
- Clear template to follow
- Submit registry entry to enable discovery

**For users:**
- Discover plugins via central registry
- Install from distributed repositories
- Automatic version compatibility

## 3. Proposed Architecture

### 3.1 Repository Structure

Plugins, SDKs, CLIs, and MCP servers will be colocated in domain-specific monorepos:

```
fractary/core/                   # Primitive operations
├── sdk/
│   ├── js/                      # JavaScript SDK → @fractary/core
│   │   ├── src/
│   │   │   ├── work/
│   │   │   ├── repo/
│   │   │   ├── file/
│   │   │   ├── spec/
│   │   │   ├── docs/
│   │   │   └── logs/
│   │   └── package.json
│   │
│   └── py/                      # Python SDK → fractary-core
│       ├── fractary_core/
│       │   ├── work/
│       │   ├── repo/
│       │   ├── file/
│       │   ├── spec/
│       │   ├── docs/
│       │   └── logs/
│       └── pyproject.toml
│
├── cli/                         # CLI → @fractary/core-cli (JavaScript)
│   ├── src/commands/
│   ├── bin/fractary-core
│   └── package.json
│
├── mcp/
│   └── server/                  # MCP Server → @fractary/core-mcp-server (JavaScript)
│       ├── src/tools/
│       ├── src/server.ts
│       └── package.json
│
├── plugins/                     # Plugin definitions (native formats)
│   ├── .claude-plugin/
│   │   └── marketplace.json     # Claude marketplace manifest
│   ├── work/                    # Native Claude Code format
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── agents/
│   │   │   └── work-manager.md
│   │   ├── skills/
│   │   │   └── issue-creator/
│   │   │       └── SKILL.md
│   │   └── commands/
│   │       └── issue-fetch.md
│   ├── repo/                    # Native Claude Code format
│   ├── file/                    # Native Claude Code format
│   ├── spec/                    # Native Claude Code format
│   ├── docs/                    # Native Claude Code format
│   ├── logs/                    # Native Claude Code format
│   └── status/                  # Native Claude Code format
│
├── package.json                 # Monorepo root
└── pnpm-workspace.yaml

fractary/faber/                  # Workflow orchestration
├── sdk/
│   ├── js/                      # @fractary/faber
│   │   └── src/adapters/        # Format adapters (Claude Code, LangChain, etc.)
│   └── py/                      # fractary-faber
├── cli/                         # @fractary/faber-cli
├── mcp/
│   ├── server/                  # @fractary/faber-mcp-server
│   │   └── package.json
│   └── client/                  # @fractary/faber-mcp-client (orchestrates, needs to consume tools)
│       └── package.json
├── plugins/                     # Native Claude Code format
│   ├── .claude-plugin/
│   │   └── marketplace.json
│   ├── faber/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── agents/
│   │   │   └── faber-manager.md
│   │   └── skills/
│   ├── faber-cloud/
│   └── faber-agent/
└── package.json

fractary/codex/                  # Knowledge management
├── sdk/
│   ├── js/                      # @fractary/codex
│   └── py/                      # fractary-codex
├── cli/                         # @fractary/codex-cli
├── mcp/
│   └── server/                  # @fractary/codex-mcp-server (exists)
│       └── package.json
├── plugins/                     # Native Claude Code format
│   ├── .claude-plugin/
│   │   └── marketplace.json
│   └── codex/
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── agents/
│       │   └── codex-manager.md
│       └── skills/
└── package.json
```

**Key architectural decisions:**

1. **Multi-language SDKs** - Both JavaScript and Python in each repo
2. **Separate packages** - SDK, CLI, MCP server are distinct npm packages
3. **Single CLI** - One CLI implementation (JavaScript) per SDK, no Python CLI
4. **MCP server organization** - Server under `/mcp/server/`, optional client under `/mcp/client/`
5. **MCP server (always)** - Every SDK exposes an MCP server for its functionality
6. **MCP client (conditional)** - Only included if SDK needs to consume other MCP servers (e.g., Faber orchestrates)
7. **Native framework formats** - Plugins created in native format (Claude Code, LangChain, etc.), no custom Fractary format
8. **Format adapters in Faber** - Faber SDK contains adapters to understand any framework format
9. **Runtime adaptation** - Translation happens at runtime when orchestrating, not build-time
10. **No unified CLI** - Each SDK has its own CLI binary (`fractary-core`, `fractary-faber`, etc.)
11. **Universal orchestration** - Faber can orchestrate agents from any framework with any model
12. **Optional translation** - Forge provides translation tools for explicit format conversion when desired

### 3.2 Colocation Rationale

**Why primitives (work, repo, file, etc.) share `fractary/core`:**

These plugins are **platform-agnostic primitives** that don't belong to any specific domain:

- Not Faber-specific (can be used without FABER workflows)
- Not Codex-specific (standalone functionality)
- Shared by multiple higher-level tools
- Natural grouping as "core operations"

**Alternative considered:** Separate repos per primitive (`fractary/work`, `fractary/repo`, etc.)

**Rejected because:**
- Excessive fragmentation (8+ repositories)
- Higher maintenance overhead
- Primitives are tightly coupled (work items → repos → specs)
- All share same SDK patterns and interfaces

**Why domain plugins (faber, codex) use separate repos:**

- Domain-specific functionality
- Independent release cycles
- Different teams/ownership
- Larger scope justifies dedicated repository

### 3.3 Plugin Format Organization

Plugins are maintained in their **native framework format** - no custom Fractary format required. Users create plugins in the framework they're familiar with.

```
plugins/
├── .claude-plugin/
│   └── marketplace.json         # Claude marketplace manifest
├── work/                        # Native Claude Code format
│   ├── .claude-plugin/
│   │   └── plugin.json          # Claude plugin manifest
│   ├── agents/
│   │   └── work-manager.md      # Native markdown format
│   ├── skills/
│   │   └── issue-creator/
│   │       └── SKILL.md
│   └── commands/
│       └── issue-fetch.md
├── repo/                        # Native Claude Code format
├── file/                        # Native Claude Code format
└── ...
```

**Organization principles:**

1. **Single native format** - Plugins created in the framework the author knows best
   - Fractary plugins currently use Claude Code format (markdown)
   - Third-party plugins can use any format (Claude Code, LangChain, CrewAI, etc.)
   - No custom "Fractary format" to learn

2. **Format detection** - Faber automatically detects format at runtime
   - `.md` files with `.claude-plugin/` → Claude Code
   - `.py` files with LangChain imports → LangChain
   - `.py` files with CrewAI imports → CrewAI
   - etc.

3. **Runtime adaptation** - Translation happens when orchestrating
   - Faber loads agent in native format
   - Adapts to LangGraph/LangChain if needed for orchestration
   - User never sees the translation

**Why native formats?**

- ✅ **Zero learning curve** - Use format you already know
- ✅ **No duplication** - Maintain one version (native)
- ✅ **Direct installation** - Users install from GitHub as-is
- ✅ **Easy testing** - No build step, no conversion
- ✅ **Better discoverability** - Browse native format on GitHub

### 3.4 Faber Format Adapters

Faber orchestration engine includes **format adapters** that understand agents from any mainstream framework. This enables universal orchestration without requiring format conversion.

**Adapter architecture:**

```typescript
// @fractary/faber/src/adapters/base.ts
interface FormatAdapter {
  name: string;
  detect(path: string): boolean;
  load(agentPath: string): Agent;
  toLangGraph?(agent: Agent): LangGraphAgent;  // Only needed for orchestration
}

// @fractary/faber/src/adapters/claude-code.ts
class ClaudeCodeAdapter implements FormatAdapter {
  name = 'claude-code';

  detect(path: string): boolean {
    // Check for .claude-plugin directory and .md files
    return fs.existsSync(join(path, '.claude-plugin/plugin.json')) &&
           fs.existsSync(join(path, 'agents/*.md'));
  }

  load(agentPath: string): Agent {
    // Parse Claude Code markdown format
    const content = fs.readFileSync(agentPath, 'utf-8');
    return parseClaudeAgent(content);
  }

  toLangGraph(agent: Agent): LangGraphAgent {
    // Convert Claude Code agent structure to LangGraph format
    // Only called when actually orchestrating in LangGraph
    return {
      name: agent.name,
      system: agent.context + agent.instructions,
      tools: agent.tools,
      // ... best-effort mapping
    };
  }
}
```

**Supported adapters:**

| Framework | Adapter | Detection | Status |
|-----------|---------|-----------|--------|
| Claude Code | `ClaudeCodeAdapter` | `.claude-plugin/` + `.md` files | ✅ Implemented |
| LangChain | `LangChainAdapter` | `langchain` imports | 🔄 Planned |
| CrewAI | `CrewAIAdapter` | `crewai` imports | 🔄 Planned |
| Autogen | `AutogenAdapter` | `autogen` imports | 🔄 Planned |

**Usage in Faber workflows:**

```toml
# .faber.config.toml
[workflow.build]
steps = [
  # Claude Code agent with Claude model
  { agent = "@claude:work-manager", model = "claude-sonnet-4" },

  # LangChain agent with GPT-4 (future)
  { agent = "@langchain:code-generator", model = "gpt-4" },

  # Back to Claude Code agent with different model
  { agent = "@claude:repo-manager", model = "gpt-4o" }
]
```

**Automatic detection and adaptation:**
1. User references agent: `@claude:work-manager`
2. Faber loads `plugins/work/agents/work-manager.md`
3. `ClaudeCodeAdapter.detect()` returns true
4. `ClaudeCodeAdapter.load()` parses the agent
5. If orchestrating in LangGraph: `ClaudeCodeAdapter.toLangGraph()` adapts
6. Workflow executes with specified model (any model, regardless of original format)

### 3.5 Translation Limitations and Strategies

Automatic format adaptation in Faber is **best-effort** and subject to framework capability differences.

**Translation Quality Matrix:**

| From → To | Quality | Notes |
|-----------|---------|-------|
| Claude Code → LangGraph | ✅ Good | Most features map well |
| LangChain → Claude Code | ⚠️ Lossy | Claude-specific features won't exist |
| Claude Code → Simple LangChain | ⚠️ Feature loss | Advanced Claude features dropped |
| Simple → Advanced | ℹ️ No-op | Nothing to translate "up" |

**Downscaling (high → low functionality):**
- Claude Code agents have rich features (hooks, status line, etc.)
- When adapted to simpler frameworks, these features are dropped
- User accepts this trade-off when choosing to run in simpler framework
- Example: Claude Code skill with status line → LangChain (no status line)

**Upscaling (low → high functionality):**
- Simple LangChain agent has basic functionality
- When run in Claude Code, there's nothing to "translate up"
- Original agent didn't define advanced features
- Example: Basic LangChain agent → Claude Code (still basic, no extra features)

**When to manually recreate:**
- If you want full features of a framework, manually create separate version
- Forge provides starter templates to jump-start conversion
- Two separate artifacts, maintained independently
- Example: Have both `@claude:work-manager` and `@langchain:work-manager` as separate plugins

**Faber's approach:**
- Transparent adaptation for orchestration (user doesn't see it)
- Best-effort feature mapping
- Preserves core functionality (system prompt, tools, basic workflow)
- Drops framework-specific features that don't translate

### 3.6 Optional Translation Tools (Forge)

For users who want to **explicitly convert** an agent to another framework format, Forge provides translation tools.

**Forge translation CLI:**

```bash
# Convert Claude Code agent to LangChain
fractary-forge convert \
  --from plugins/work/agents/work-manager.md \
  --to work_manager.py \
  --format langchain

# Output: work_manager.py (LangChain agent)
# Note: Feature loss warnings displayed
```

**When to use translation tools:**
- You want a permanent version in another framework
- You're migrating from one framework to another
- You want to distribute plugin in multiple formats
- You need to customize the translated version

**When NOT to use translation tools:**
- Just running agent with different model → Faber handles automatically
- Orchestrating mixed frameworks → Faber handles automatically
- Temporary experimentation → Runtime adaptation sufficient

**Translation tool output:**
```python
# Generated by fractary-forge convert from work-manager.md
# Original format: Claude Code
# Target format: LangChain
# Generated: 2025-12-16
# WARNING: Some Claude Code features dropped (status line, hooks)

from langchain.agents import Agent

class WorkManager(Agent):
    """Work item management agent"""

    def __init__(self):
        super().__init__(
            name="work-manager",
            system="You are a work item management assistant...",
            # ... translated configuration
        )
```

### 3.7 Installation Patterns

**Native format installation** - Users install plugins directly in their native format.

**Claude Code plugins:**

```bash
# Via Claude marketplace (looks for .claude-plugin/marketplace.json)
claude plugins add-marketplace fractary/core/plugins

# Direct plugin install (looks for .claude-plugin/plugin.json)
claude plugins install fractary/core/plugins/work
```

**LangChain plugins** (third-party example):

```bash
# Via pip package
pip install acme-langchain-agents

# Or direct from GitHub
git clone https://github.com/acme/agents plugins/acme-agents
```

**Any framework:**

```bash
# Faber can reference installed plugins from any location
# Configuration in .faber.config.toml specifies paths:

[workflow.build]
steps = [
  { agent = "~/.claude/plugins/work/agents/work-manager.md" },     # Claude Code
  { agent = "./plugins/acme-agents/code_generator.py" },           # LangChain
  { agent = "../other-project/plugins/reviewer.md" }               # Claude Code
]
```

**Standard locations by framework:**

| Framework | Standard Location | Detection Marker |
|-----------|------------------|------------------|
| Claude Code | `~/.claude/plugins/` | `.claude-plugin/plugin.json` |
| LangChain | Python site-packages | LangChain imports |
| CrewAI | Python site-packages | CrewAI imports |
| Custom | User-specified | Manual configuration |

### 3.8 Value Proposition: Universal Orchestration

**Tagline:** "Bring your agents. Use any model. Build workflows that work."

Fractary's key differentiation is **universal orchestration** - not creating yet another agent framework, but making all frameworks work together.

**The Problem Fractary Solves:**

**Before Fractary:**
- ❌ Locked into one framework (Claude Code, LangChain, CrewAI)
- ❌ Can't mix agents from different frameworks
- ❌ Locked into specific models (Claude for Claude Code agents, etc.)
- ❌ Have to rewrite agents to switch frameworks
- ❌ Can't orchestrate heterogeneous agents into workflows

**With Fractary:**
- ✅ Use agents from any framework without conversion
- ✅ Mix Claude Code + LangChain + CrewAI agents in one workflow
- ✅ Run any agent with any model (Claude Code agent with GPT-4, LangChain agent with Claude, etc.)
- ✅ No rewriting needed - Faber adapts transparently
- ✅ Orchestrate heterogeneous agents seamlessly

**Real-World Example:**

```toml
# .faber.config.toml - Mix frameworks and models freely

[workflow.build]
steps = [
  # Your Claude Code agent (proven, works well)
  { agent = "@claude:work-manager", model = "claude-sonnet-4" },

  # Teammate's LangChain agent (specialized for testing)
  { agent = "@langchain:pytest-runner", model = "gpt-4" },

  # Community CrewAI agent from GitHub (great at docs)
  { agent = "@crewai:doc-writer", model = "llama-3.1" },

  # Back to your Claude Code agent (but with different model for cost)
  { agent = "@claude:repo-manager", model = "gpt-4o-mini" }
]
```

**What Fractary Provides:**

1. **Faber** - Universal orchestrator with format adapters
2. **Forge** - Creation tools for any framework + optional translation
3. **Stockyard** - Distribution of native-format agents with metadata
4. **MCP Servers** - Universal primitives (work, repo, file) for all frameworks
5. **Format Adapters** - Transparent runtime adaptation

**What Fractary Is NOT:**
- ❌ Not another agent definition format to learn
- ❌ Not a framework replacement (use Claude Code, LangChain, etc. as-is)
- ❌ Not opinionated about which framework is "best"

**What Fractary IS:**
- ✅ The orchestration layer that makes all frameworks interoperable
- ✅ The model router that lets you use any model with any agent
- ✅ The workflow engine that strings heterogeneous agents together
- ✅ The toolkit that respects your framework choice

### 3.9 Version Coherence Strategy

**Plugin versions track SDK versions:**

```json
// fractary/core/package.json
{
  "name": "@fractary/core",
  "version": "1.2.0"
}

// fractary/core/plugins/work/plugin.yaml
name: fractary-work
version: 1.2.0
sdk_dependency:
  package: "@fractary/core"
  version: "^1.2.0"
```

**Versioning rules:**

1. **Major version bump** - Breaking SDK changes require major plugin version bump
2. **Minor version bump** - New SDK features can bump plugin minor version
3. **Patch version bump** - Bug fixes use patch version
4. **Single commit** - SDK and plugin changes happen in same PR

**Example workflow:**

```bash
# Developer adds new feature to work SDK
# 1. Update SDK code
git commit -m "feat(work): add bulk issue update"

# 2. Update plugin to expose new feature
git commit -m "feat(work-plugin): add bulk-update tool"

# 3. Bump versions together
npm version minor  # Updates both @fractary/core and plugins/work/plugin.yaml

# 4. Single PR includes both changes
```

### 3.9 Universal Naming Convention

All Fractary packages, tools, commands, and binaries use a **consistent `fractary-` prefix** to prevent naming conflicts.

#### Naming Matrix

| Interface | Pattern | Example | Separator |
|-----------|---------|---------|-----------|
| **npm package (SDK)** | `@fractary/{domain}` | `@fractary/core` | `/` (scope) |
| **pip package (SDK)** | `fractary-{domain}` | `fractary-core` | `-` (hyphen) |
| **npm package (CLI)** | `@fractary/{domain}-cli` | `@fractary/core-cli` | `-` (hyphen) |
| **npm package (MCP)** | `@fractary/{domain}-mcp-server` | `@fractary/core-mcp-server` | `-` (hyphen) |
| **CLI binary** | `fractary-{domain}` | `fractary-core` | `-` (hyphen) |
| **MCP server name** | `fractary-{domain}` | `fractary-core` | `-` (hyphen) |
| **MCP tool name** | `fractary_{domain}_{action}` | `fractary_work_issue_fetch` | `_` (underscore) |
| **CLI command** | `fractary-{domain} {action}` | `fractary-core work issue-fetch` | ` ` (space) |
| **Plugin name** | `fractary-{domain}` | `fractary-work` | `-` (hyphen) |
| **Plugin command** | `/fractary-{domain}:{action}` | `/fractary-work:issue-fetch` | `:` (colon) |
| **Agent reference** | `@agent-fractary-{domain}:{name}` | `@agent-fractary-work:manager` | `:` (colon) |

**Why different separators?**
- Each interface has established conventions (MCP uses `_`, CLI uses spaces, plugins use `:`)
- The **stem is always `fractary-{domain}`** providing consistency
- Predictable transformation between interfaces

#### Cross-Interface Examples

**Work issue fetch across all interfaces:**

```bash
# npm installation
npm install @fractary/core                    # JavaScript SDK
pip install fractary-core                     # Python SDK
npm install -g @fractary/core-cli             # CLI

# MCP server configuration
"fractary-core": {
  "command": "npx",
  "args": ["-y", "@fractary/core-mcp-server"]
}

# MCP tool invocation
fractary_work_issue_fetch(issue_number="123")

# CLI usage
fractary-core work issue-fetch 123

# Plugin command
/fractary-work:issue-fetch 123

# Agent reference (in plugin)
@agent-fractary-work:manager
```

**Benefits:**
1. ✅ **No conflicts** - `fractary` prefix prevents collision with existing tools
2. ✅ **Predictable** - Know one format, infer the others
3. ✅ **Self-documenting** - Name indicates domain and action
4. ✅ **Framework agnostic** - Works across all systems

### 3.10 Multi-Language SDK Support

Each SDK repository provides implementations in **both JavaScript and Python** with language-neutral package names.

#### Directory Structure

```
sdk/
├── js/                          # JavaScript/TypeScript SDK
│   ├── src/
│   │   ├── work/
│   │   ├── repo/
│   │   └── file/
│   ├── package.json             # @fractary/core
│   ├── tsconfig.json
│   └── README.md
│
└── py/                          # Python SDK
    ├── fractary_core/           # Package directory (underscore)
    │   ├── __init__.py
    │   ├── work/
    │   ├── repo/
    │   └── file/
    ├── tests/
    ├── pyproject.toml           # fractary-core (hyphen in pip)
    ├── setup.py
    └── README.md
```

#### Package Naming

| Language | Package Manager | Package Name | Import Statement |
|----------|----------------|--------------|------------------|
| **JavaScript** | npm | `@fractary/core` | `import { createWorkItem } from '@fractary/core/work'` |
| **Python** | pip | `fractary-core` | `from fractary_core.work import create_work_item` |

**Key points:**
- **Language-neutral names** - Not `core-sdk`, just `core`
- **Python conventions** - Underscore in code (`fractary_core/`), hyphen in pip (`fractary-core`)
- **Consistent API** - Both languages expose same functionality
- **Independent versioning** - Can have different versions if needed, but typically stay in sync

#### Installation & Usage

**JavaScript:**
```bash
npm install @fractary/core
```
```typescript
import { WorkProvider } from '@fractary/core/work';

const provider = new GitHubWorkProvider({
  token: process.env.GITHUB_TOKEN
});

const issue = await provider.getWorkItem('123');
```

**Python:**
```bash
pip install fractary-core
```
```python
from fractary_core.work import GitHubWorkProvider

provider = GitHubWorkProvider(
    token=os.getenv('GITHUB_TOKEN')
)

issue = provider.get_work_item('123')
```

### 3.11 MCP Architecture

#### MCP Server (Always) vs MCP Client (Conditional)

**Every SDK includes an MCP server** to expose its functionality as tools. **Some SDKs include an MCP client** to consume tools from other MCP servers.

| Component | When to Include | Purpose | Example |
|-----------|----------------|---------|---------|
| **MCP Server** | Always | Expose SDK functionality as tools | `@fractary/core-mcp-server` exposes work/repo/file operations |
| **MCP Client** | Only if SDK needs to call other tools | Consume tools from other MCP servers | `@fractary/faber-mcp-client` calls core/codex tools during orchestration |

**Directory structure:**
```
mcp/
├── server/                  # Always present - exposes this SDK's tools
│   └── package.json
└── client/                  # Only if needed - consumes other SDKs' tools
    └── package.json
```

**When to include MCP client:**
- ✅ **Orchestration SDKs** (Faber) - Coordinates multiple tools/agents
- ✅ **Integration SDKs** (Forge, Helm) - Combines functionality from multiple sources
- ❌ **Primitive SDKs** (Core, Codex) - Self-contained, no external dependencies
- ❌ **Standalone SDKs** - Only provides functionality, doesn't consume others

#### Why MCP Servers?

**MCP servers provide:**
1. **Universal tool access** - Works with Claude Code, LangChain, n8n, and any MCP client
2. **No framework lock-in** - Fractary YAML definitions don't need framework-specific ports
3. **Efficient integration** - Direct function calls, no subprocess overhead
4. **Streaming support** - Can stream large responses
5. **Stateful operations** - Server maintains context across calls

#### MCP vs Plugins vs CLI

| Feature | MCP Server | Claude Code Plugin | CLI |
|---------|------------|-------------------|-----|
| **Atomic operations** | ✅ Primary | ✅ Via MCP or CLI | ✅ Fallback |
| **Multi-step workflows** | ❌ | ✅ Agents | ❌ |
| **Natural language commands** | ❌ | ✅ `/fractary-work:start 123` | ❌ |
| **Event hooks** | ❌ | ✅ Auto-execution | ❌ |
| **Universal compatibility** | ✅ Any MCP client | ❌ Claude Code only | ✅ Any shell |
| **Performance** | ✅ Fast (direct calls) | ✅ Fast (via MCP) | ❌ Slow (subprocess) |
| **UI elements** | ❌ | ✅ Status line, prompts | ❌ |

**Conclusion:** All three are needed:
- **MCP** for efficient tool access
- **Plugins** for orchestration and UX
- **CLI** for human users and CI/CD

#### MCP Server Structure

```
mcp/
└── server/                      # @fractary/core-mcp-server
    ├── src/
    │   ├── tools/
    │   │   ├── work.ts          # Work tracking tools
    │   │   │   └── fractary_work_issue_fetch()
    │   │   │   └── fractary_work_issue_create()
    │   │   ├── repo.ts          # Repository tools
    │   │   │   └── fractary_repo_branch_create()
    │   │   │   └── fractary_repo_commit()
    │   │   └── file.ts          # File storage tools
    │   │       └── fractary_file_upload()
    │   │       └── fractary_file_download()
    │   ├── server.ts            # MCP server entry point
    │   └── index.ts
    ├── package.json
    ├── tsconfig.json
    └── README.md
```

#### Tool Definition Example

```typescript
// mcp/server/src/tools/work.ts
import { createWorkItem } from '@fractary/core/work';

export const fractary_work_issue_create = {
  name: 'fractary_work_issue_create',
  description: 'Create a new work item (issue, ticket, task)',
  inputSchema: {
    type: 'object',
    required: ['title'],
    properties: {
      title: {
        type: 'string',
        description: 'Issue title'
      },
      description: {
        type: 'string',
        description: 'Issue description'
      },
      type: {
        type: 'string',
        enum: ['feature', 'bug', 'chore', 'task'],
        description: 'Work item type'
      },
      labels: {
        type: 'array',
        items: { type: 'string' },
        description: 'Labels to apply'
      }
    }
  },
  handler: async (params) => {
    const issue = await createWorkItem(params);
    return { issue };
  }
};
```

#### MCP Server Configuration

Users configure MCP servers in `.claude/settings.json`:

```json
{
  "mcpServers": {
    "fractary-core": {
      "command": "npx",
      "args": ["-y", "@fractary/core-mcp-server"],
      "env": {
        "FRACTARY_CONFIG": ".fractary/plugins/core/config.json"
      }
    },
    "fractary-faber": {
      "command": "npx",
      "args": ["-y", "@fractary/faber-mcp-server"]
    },
    "fractary-codex": {
      "command": "npx",
      "args": ["-y", "@fractary/codex-mcp-server"]
    }
  }
}
```

#### Plugin Integration Strategy

Claude Code plugins use **MCP-first, CLI-fallback** approach:

```markdown
# plugins/work/tools/issue-fetcher/tool.yaml

# Try MCP first (efficient)
mcp:
  server: fractary-core
  tool: fractary_work_issue_fetch
  input_schema:
    type: object
    required: [issue_number]
    properties:
      issue_number: {type: string}

# Fallback to CLI if MCP unavailable
cli:
  command: fractary-core
  args: ["work", "issue", "fetch", "{issue_number}"]

# Execution logic:
# 1. If fractary-core MCP server configured → use MCP
# 2. Else → use CLI
# 3. Return structured result either way
```

**Performance comparison:**

| Operation | CLI Time | MCP Time | Speedup |
|-----------|----------|----------|---------|
| Single issue fetch | 800ms | 150ms | 5.3x faster |
| 10 operations | 8000ms | 1500ms | 5.3x faster |
| Branch + commit + PR | 2400ms | 450ms | 5.3x faster |
| Full FABER workflow | 30s | 8s | 3.75x faster |

### 3.12 Complete Package Matrix

| SDK | JavaScript (npm) | Python (pip) | CLI (npm) | MCP Server (npm) | MCP Client (npm) | Binary |
|-----|-----------------|--------------|-----------|------------------|------------------|--------|
| **core** | `@fractary/core` | `fractary-core` | `@fractary/core-cli` | `@fractary/core-mcp-server` | - | `fractary-core` |
| **faber** | `@fractary/faber` | `fractary-faber` | `@fractary/faber-cli` | `@fractary/faber-mcp-server` | `@fractary/faber-mcp-client`¹ | `fractary-faber` |
| **codex** | `@fractary/codex` | `fractary-codex` | `@fractary/codex-cli` | `@fractary/codex-mcp-server` | - | `fractary-codex` |
| **forge** | `@fractary/forge` | `fractary-forge` | `@fractary/forge-cli` | `@fractary/forge-mcp-server` | `@fractary/forge-mcp-client`¹ | `fractary-forge` |
| **helm** | `@fractary/helm` | `fractary-helm` | `@fractary/helm-cli` | `@fractary/helm-mcp-server` | `@fractary/helm-mcp-client`¹ | `fractary-helm` |

**Notes:**
1. MCP client only included for SDKs that need to consume tools from other MCP servers (orchestration/integration use cases)

**Installation patterns:**

```bash
# SDK (programmatic usage)
npm install @fractary/core          # JavaScript
pip install fractary-core           # Python

# CLI (command-line usage)
npm install -g @fractary/core-cli   # Installs fractary-core binary

# MCP server (tool integration)
npx @fractary/core-mcp-server       # Run directly via npx
```

## 4. Registry System

### 4.1 Registry Manifest Structure

**Central registry** (`fractary/cli/config/registry.json`):

```json
{
  "version": "1.0.0",
  "updated": "2025-12-16T00:00:00Z",
  "plugins": [
    {
      "name": "fractary-work",
      "displayName": "Work Item Management",
      "description": "Manage issues across GitHub, Jira, and Linear",
      "repository": "https://github.com/fractary/core",
      "path": "plugins/work",
      "version": "1.0.0",
      "sdk": "@fractary/core",
      "category": "primitives",
      "tags": ["work", "issues", "jira", "linear", "github"],
      "maintainers": ["fractary-team"],
      "verified": true
    },
    {
      "name": "fractary-faber",
      "displayName": "FABER Workflow",
      "description": "Frame → Architect → Build → Evaluate → Release workflow orchestration",
      "repository": "https://github.com/fractary/faber",
      "path": "plugins/faber",
      "version": "2.1.0",
      "sdk": "@fractary/faber",
      "category": "workflows",
      "dependencies": [
        "fractary-work",
        "fractary-repo",
        "fractary-spec"
      ],
      "tags": ["workflow", "faber", "orchestration"],
      "maintainers": ["fractary-team"],
      "verified": true
    },
    {
      "name": "acme-workflows",
      "displayName": "ACME Custom Workflows",
      "description": "ACME Corp internal workflows",
      "repository": "https://github.com/acme-corp/workflows",
      "path": "plugins/workflows",
      "version": "1.0.0",
      "sdk": "@acme/workflows-sdk",
      "category": "workflows",
      "tags": ["acme", "custom"],
      "maintainers": ["acme-team"],
      "verified": false
    }
  ],
  "registries": [
    {
      "name": "fractary-official",
      "url": "https://registry.fractary.com/plugins.json",
      "verified": true,
      "priority": 1
    },
    {
      "name": "acme-corp",
      "url": "https://raw.githubusercontent.com/acme-corp/registry/main/plugins.json",
      "verified": false,
      "priority": 2
    }
  ]
}
```

### 4.2 Plugin Installation Flow

```bash
# User installs plugin
claude plugins install fractary-work

# CLI resolution process:
# 1. Read registry.json
# 2. Find fractary-work entry
# 3. Fetch from repository: https://github.com/fractary/core/plugins/work
# 4. Check SDK dependency: @fractary/core ^1.0.0
# 5. Install to: ~/.claude/plugins/marketplaces/fractary/work
```

**Installation locations:**

```
~/.claude/plugins/
└── marketplaces/
    ├── fractary/
    │   ├── work/           # From fractary/core/plugins/work
    │   ├── repo/           # From fractary/core/plugins/repo
    │   └── faber/          # From fractary/faber/plugins/faber
    └── acme-corp/
        └── workflows/       # From acme-corp/workflows/plugins/workflows
```

### 4.3 Dependency Resolution

**Plugin dependencies** are declared in `plugin.yaml`:

```yaml
# plugins/faber/plugin.yaml
name: fractary-faber
version: 2.1.0
dependencies:
  - name: fractary-work
    version: "^1.0.0"
  - name: fractary-repo
    version: "^1.0.0"
  - name: fractary-spec
    version: "^1.0.0"
```

**CLI automatically installs dependencies:**

```bash
claude plugins install fractary-faber

# Output:
# Installing fractary-faber@2.1.0...
# Resolving dependencies:
#   - fractary-work@^1.0.0 → 1.2.0
#   - fractary-repo@^1.0.0 → 1.3.0
#   - fractary-spec@^1.0.0 → 1.1.0
# Installing 4 plugins...
# ✓ fractary-work@1.2.0
# ✓ fractary-repo@1.3.0
# ✓ fractary-spec@1.1.0
# ✓ fractary-faber@2.1.0
```

### 4.4 Multiple Registry Support

**Users can add custom registries:**

```bash
# Add ACME Corp registry
claude plugins add-registry https://raw.githubusercontent.com/acme-corp/registry/main/plugins.json

# List registries
claude plugins list-registries
# Output:
# - fractary-official (verified) [priority: 1]
# - acme-corp [priority: 2]

# Remove registry
claude plugins remove-registry acme-corp
```

**Registry priority** determines resolution order when plugins exist in multiple registries.

## 5. Third-Party Plugin Model

### 5.1 Plugin Development Template

**For third-party developers wrapping their own SDK:**

```
your-company/your-sdk/
├── packages/
│   └── your-sdk/            # Your SDK code
│       ├── src/
│       └── package.json
└── plugins/
    └── your-plugin/         # Plugin wrapping your SDK
        ├── plugin.yaml      # Plugin manifest
        ├── agents/
        │   └── your-manager/
        │       └── agent.yaml
        ├── tools/
        │   ├── operation-1/
        │   │   └── tool.yaml
        │   └── operation-2/
        │       └── tool.yaml
        └── config/
            ├── schema.json
            └── config.example.json
```

**Plugin manifest example:**

```yaml
# plugins/your-plugin/plugin.yaml
name: your-company-your-plugin
version: 1.0.0
description: Your plugin description
author: Your Company
license: MIT

sdk_dependency:
  package: "@your-company/your-sdk"
  version: "^1.0.0"

agents:
  - your-manager

tools:
  - operation-1
  - operation-2

configuration:
  schema: ./config/schema.json
  example: ./config/config.example.json
```

### 5.2 Registry Submission Process

**To make your plugin discoverable:**

1. **Develop plugin** following Fractary YAML format
2. **Test locally** using Claude Code
3. **Publish to GitHub** (or other Git hosting)
4. **Submit PR to registry** adding entry to `fractary/cli/config/registry.json`

**Registry PR example:**

```json
{
  "name": "your-company-your-plugin",
  "displayName": "Your Plugin Name",
  "description": "What your plugin does",
  "repository": "https://github.com/your-company/your-sdk",
  "path": "plugins/your-plugin",
  "version": "1.0.0",
  "sdk": "@your-company/your-sdk",
  "category": "custom",
  "tags": ["your", "tags"],
  "maintainers": ["your-team"],
  "verified": false
}
```

**Verification process:**
- Fractary team reviews PR
- Checks plugin manifest validity
- Verifies installation works
- Marks `verified: true` for trusted plugins

### 5.3 Plugin Documentation

**Required documentation for third-party plugins:**

```
plugins/your-plugin/
├── README.md               # Overview, installation, usage
├── CHANGELOG.md            # Version history
├── LICENSE                 # License file
└── docs/
    ├── getting-started.md  # Quick start guide
    ├── configuration.md    # Configuration reference
    └── api.md              # Tool/agent reference
```

## 6. Migration Plan

### 6.1 Phase 1: Create Core SDK Repository

**Objective:** Establish `fractary/core` with SDK and plugins

**Tasks:**
1. Create `fractary/core` repository
2. Set up monorepo structure (packages/ and plugins/)
3. Move primitive SDK logic from `fractary/faber-sdk` to `fractary/core/packages/`
4. Move primitive plugins from `fractary/plugins` to `fractary/core/plugins/`
5. Update plugin manifests to reference `@fractary/core`
6. Set up CI/CD for monorepo
7. Publish `@fractary/core@1.0.0` to npm

**Plugins migrated:**
- work, repo, file, spec, docs, logs, status (7 plugins)

**Estimated effort:** 2-3 weeks

### 6.2 Phase 2: Move Faber Plugins

**Objective:** Consolidate FABER plugins with FABER SDK

**Tasks:**
1. Move `fractary/plugins/faber` to `fractary/faber/plugins/faber`
2. Move `fractary/plugins/faber-cloud` to `fractary/faber/plugins/faber-cloud`
3. Move `fractary/plugins/faber-agent` to `fractary/faber/plugins/faber-agent`
4. Update plugin manifests to reference `@fractary/faber`
5. Update Faber SDK to depend on `@fractary/core`
6. Publish `@fractary/faber@2.1.0` with colocated plugins

**Plugins migrated:**
- faber, faber-cloud, faber-agent (3 plugins)

**Estimated effort:** 1 week

### 6.3 Phase 3: Move Codex Plugin

**Objective:** Colocate Codex plugin with Codex SDK

**Tasks:**
1. Move `fractary/plugins/codex` to `fractary/codex/plugins/codex`
2. Update plugin manifest to reference `@fractary/codex`
3. Publish `@fractary/codex@1.0.0` with colocated plugin

**Plugins migrated:**
- codex (1 plugin)

**Estimated effort:** 3 days

### 6.4 Phase 4: Create Registry System

**Objective:** Enable discovery of distributed plugins

**Tasks:**
1. Create `fractary/cli/config/registry.json`
2. Add entries for all Fractary plugins
3. Implement registry reading in CLI
4. Update `claude plugins install` to use registry
5. Implement dependency resolution
6. Add `claude plugins add-registry` command
7. Document registry submission process

**Estimated effort:** 1-2 weeks

### 6.5 Phase 5: Archive Central Repository

**Objective:** Clean up after migration

**Tasks:**
1. Verify all plugins migrated successfully
2. Update `fractary/plugins/README.md` with migration notice
3. Add redirect notices to all moved plugins
4. Archive `fractary/plugins` repository
5. Update all documentation references

**Estimated effort:** 3 days

### 6.6 Migration Timeline

```
Week 1-3:  Phase 1 - Create fractary/core
Week 4:    Phase 2 - Move FABER plugins
Week 5:    Phase 3 - Move Codex plugin
Week 6-7:  Phase 4 - Create registry system
Week 8:    Phase 5 - Archive central repo

Total: ~8 weeks
```

## 7. Benefits & Trade-offs

### 7.1 Benefits

**Development Efficiency:**
- ✅ SDK and plugin changes in single PR
- ✅ No cross-repo coordination overhead
- ✅ Easier testing (both change together)

**Version Management:**
- ✅ Plugin version naturally tracks SDK version
- ✅ Breaking changes visible in single release
- ✅ Dependency resolution automated

**Third-Party Development:**
- ✅ Clear, replicable pattern
- ✅ "Plugin in same repo as SDK" guideline
- ✅ Registry submission well-defined

**Ownership & Boundaries:**
- ✅ Clear ownership per domain
- ✅ Logical grouping (primitives vs. workflows)
- ✅ Repository scope matches team scope

**Industry Alignment:**
- ✅ Matches npm/PyPI/Docker Hub patterns
- ✅ Familiar to external developers
- ✅ Proven scalability

**Format Agnostic Architecture (NEW):**
- ✅ No custom format to learn - use Claude Code, LangChain, etc. directly
- ✅ Zero learning curve for plugin creation
- ✅ No duplication - single native version per plugin
- ✅ No build pipeline - no conversion CI/CD needed
- ✅ Direct installation - no build step for users
- ✅ Universal orchestration - Faber works with any framework
- ✅ Model flexibility - use any model with any agent
- ✅ True interoperability - mix frameworks in one workflow

### 7.2 Trade-offs

**Increased Repository Count:**
- ⚠️ More repositories to maintain
- Mitigation: Reasonable grouping (primitives share repo)

**Cross-Plugin Integration Testing:**
- ⚠️ Testing plugins together requires multi-repo setup
- Mitigation: E2E tests in Faber repository

**Discovery Complexity:**
- ⚠️ Users need registry to find plugins
- Mitigation: Central registry + CLI integration

**Migration Effort:**
- ⚠️ Non-trivial migration work (8 weeks estimated)
- Mitigation: Phased approach, backward compatibility

**Translation Quality:**
- ⚠️ Best-effort translation may lose framework-specific features
- Mitigation:
  - Transparent about limitations
  - User chooses which framework to use
  - Optional manual recreation via Forge tools for full features
  - Same limitation exists in all approaches (manual or automatic)

**Adapter Maintenance:**
- ⚠️ Faber must maintain adapters for each framework
- Mitigation:
  - Adapters are isolated, single-responsibility modules
  - Community can contribute adapters
  - Only need adapters for mainstream frameworks
  - Much simpler than maintaining conversions for all plugins

## 8. Architectural Decisions

### 8.1 RESOLVED Decisions

**Q1: Should status plugin live in fractary/core or elsewhere?** ✅ **RESOLVED**
- **Decision:** `fractary/core/plugins/status` (with other primitives)
- **Rationale:** Status is a primitive operation like work, repo, file

**Q2: Should we use monorepo or separate repos for primitives?** ✅ **RESOLVED**
- **Decision:** Monorepo `fractary/core` with all primitives
- **Rationale:** Reduces fragmentation, primitives are tightly coupled

**Q3: Where should registry.json live?** ✅ **RESOLVED**
- **Decision:** In each SDK's registry (no unified CLI needed)
- **Rationale:** No unified CLI repository, each SDK is independent
- **Note:** This question is now moot - registry distribution TBD

**Q4: Should plugin dependencies be loose or strict?** ✅ **RESOLVED**
- **Decision:** Loose (`"^1.0.0"` - allow minor updates)
- **Rationale:** More flexible, follows npm conventions

**Q5: How to handle plugin breaking changes?** ✅ **RESOLVED**
- **Decision:** Major version bump, deprecation notices
- **Rationale:** Standard semver approach

**Q6: Should CLI be separate package or bundled with SDK?** ✅ **RESOLVED**
- **Decision:** Separate package (`@fractary/{domain}-cli`)
- **Rationale:** Clean dependencies, optional installation, separation of concerns

**Q7: Should we support multiple languages for SDKs?** ✅ **RESOLVED**
- **Decision:** Yes - JavaScript and Python
- **Rationale:** Broaden adoption, industry standard (AWS, Stripe, Terraform all multi-language)

**Q8: Should we have separate CLIs for Python and JavaScript?** ✅ **RESOLVED**
- **Decision:** No - Single CLI in JavaScript only
- **Rationale:** Users don't care about implementation language, avoid duplication

**Q9: Should we have MCP servers per SDK?** ✅ **RESOLVED**
- **Decision:** Yes - Each SDK exposes MCP server
- **Rationale:** Universal tool access, no framework lock-in, efficient integration

**Q10: Should we have a unified CLI (fractary) or per-SDK CLIs?** ✅ **RESOLVED**
- **Decision:** Per-SDK CLIs only (`fractary-core`, `fractary-faber`, etc.)
- **Rationale:** Avoids naming conflicts, simpler architecture, no routing needed

**Q11: Universal naming convention?** ✅ **RESOLVED**
- **Decision:** All packages/tools prefixed with `fractary-`
- **Rationale:** Prevents naming conflicts (codex, helm, etc.), consistent, predictable

**Q12: Should we create a custom Fractary agent/tool format?** ✅ **RESOLVED**
- **Decision:** No - Use native framework formats (Claude Code, LangChain, etc.)
- **Rationale:**
  - Users already know their preferred framework
  - No learning curve for new format
  - No duplication (one version per plugin, in native format)
  - Faber can adapt any format at runtime
  - Reduces friction for adoption
- **Original justification for Fractary format:** "Needed for Faber/LangGraph orchestration"
- **Why that's wrong:** Faber can have format adapters instead of requiring canonical format

**Q13: Should plugins be converted to multiple formats at build time or runtime?** ✅ **RESOLVED**
- **Decision:** Runtime adaptation by Faber, not build-time conversion
- **Rationale:**
  - No CI/CD pipeline needed
  - No generated files to maintain
  - No duplication across framework directories
  - Translation happens transparently when orchestrating
  - Optional explicit conversion via Forge tools when desired
- **Implication:** Each plugin exists in ONE native format, Faber adapts as needed

**Q14: How to handle framework capability differences in translation?** ✅ **RESOLVED**
- **Decision:** Best-effort translation, user accepts trade-offs
- **Rationale:**
  - Downscaling (Claude Code → simple framework): Feature loss is expected
  - Upscaling (simple → Claude Code): Nothing to translate up
  - Manual recreation available via Forge tools for full features
  - This is the same outcome as all other approaches (manual or automatic)

### 8.2 Future Considerations

**Plugin Signing/Verification:**
- GPG signatures for official plugins
- Checksum verification
- Deferred to future phase

**Marketplace UI:**
- Web interface for plugin discovery
- Search, filtering, ratings
- Deferred to future phase

**Auto-update Mechanism:**
- Automatic plugin updates
- Update notifications
- Deferred to future phase

**Plugin Testing Framework:**
- Conformance tests for third-party plugins
- Automated validation
- Deferred to future phase

## 9. Success Metrics

### 9.1 Technical Metrics

- **Version coherence:** 100% of plugins match SDK major version
- **Installation success rate:** >95% successful plugin installs
- **Dependency resolution:** <1s to resolve plugin dependencies
- **Registry freshness:** Registry updated within 24h of plugin release

### 9.2 Developer Experience Metrics

- **PR coordination:** 0 cross-repo PRs needed for SDK + plugin changes
- **Time to release:** <30min from SDK release to plugin release
- **Third-party adoption:** >3 verified third-party plugins within 6 months

### 9.3 User Experience Metrics

- **Discovery time:** <2min to find relevant plugin via registry
- **Installation time:** <30s to install plugin with dependencies
- **Update frequency:** Monthly plugin updates without breaking changes

## 10. References

### 10.1 Related Specifications

- [SPEC-00016: SDK Architecture](./SPEC-00016-sdk-architecture.md) - Overall SDK architecture
- [SPEC-FORGE-005: Registry Manifest System](./SPEC-FORGE-005-REGISTRY-MANIFEST-SYSTEM.md) - Registry implementation details
- [SPEC-FORGE-007: Claude to Fractary Conversion](./SPEC-FORGE-007-CLAUDE-TO-FRACTARY-CONVERSION.md) - Format conversion

### 10.2 External References

- [npm Registry Architecture](https://docs.npmjs.com/cli/v10/using-npm/registry)
- [PyPI Simple Repository API](https://packaging.python.org/specifications/simple-repository-api/)
- [Cargo Registry Protocol](https://doc.rust-lang.org/cargo/reference/registry-index.html)
- [Helm Chart Repositories](https://helm.sh/docs/topics/chart_repository/)

### 10.3 Repository Links

- Current: [fractary/plugins](https://github.com/fractary/plugins)
- Proposed: [fractary/core](https://github.com/fractary/core) (to be created)
- Proposed: [fractary/faber](https://github.com/fractary/faber) (existing)
- Proposed: [fractary/codex](https://github.com/fractary/codex) (existing)
- Proposed: [fractary/cli](https://github.com/fractary/cli) (existing)

## Appendix A: Example Migration Commit Sequence

### A.1 Migrating Work Plugin to fractary/core

```bash
# In fractary/core repository

# Commit 1: Add work SDK
git commit -m "feat(work): add work tracking SDK with GitHub/Jira/Linear support"

# Commit 2: Add work plugin
git commit -m "feat(work-plugin): add work plugin wrapping work SDK"

# Commit 3: Version bump
npm version minor  # Bumps both SDK and plugin to 1.1.0

# Commit 4: Update registry
# (Separate PR to fractary/cli)
git commit -m "chore(registry): add fractary-work plugin"
```

### A.2 SDK Breaking Change Workflow

```bash
# In fractary/core repository

# Commit 1: Breaking SDK change
git commit -m "feat(work)!: rename getIssue to getWorkItem"

# Commit 2: Update plugin to match
git commit -m "feat(work-plugin)!: update for renamed SDK methods"

# Commit 3: Major version bump
npm version major  # Bumps both SDK and plugin to 2.0.0

# Commit 4: Update changelog
git commit -m "docs: add breaking change notes to CHANGELOG.md"
```

## Appendix B: Plugin Manifest Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "version", "description"],
  "properties": {
    "name": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$",
      "description": "Plugin identifier (kebab-case)"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Semantic version (semver)"
    },
    "description": {
      "type": "string",
      "description": "Brief description of plugin functionality"
    },
    "author": {
      "type": "string",
      "description": "Plugin author or organization"
    },
    "license": {
      "type": "string",
      "description": "SPDX license identifier"
    },
    "sdk_dependency": {
      "type": "object",
      "required": ["package", "version"],
      "properties": {
        "package": {
          "type": "string",
          "description": "npm package name of SDK"
        },
        "version": {
          "type": "string",
          "description": "Semver range for SDK version"
        }
      }
    },
    "dependencies": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "version"],
        "properties": {
          "name": {
            "type": "string",
            "description": "Dependent plugin name"
          },
          "version": {
            "type": "string",
            "description": "Semver range for plugin version"
          }
        }
      }
    },
    "agents": {
      "type": "array",
      "items": {"type": "string"},
      "description": "List of agent identifiers"
    },
    "tools": {
      "type": "array",
      "items": {"type": "string"},
      "description": "List of tool identifiers"
    },
    "configuration": {
      "type": "object",
      "properties": {
        "schema": {
          "type": "string",
          "description": "Path to configuration JSON schema"
        },
        "example": {
          "type": "string",
          "description": "Path to example configuration file"
        }
      }
    }
  }
}
```

## Appendix C: Registry Manifest Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["version", "plugins"],
  "properties": {
    "version": {
      "type": "string",
      "description": "Registry format version"
    },
    "updated": {
      "type": "string",
      "format": "date-time",
      "description": "Last update timestamp (ISO 8601)"
    },
    "plugins": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "repository", "path", "version"],
        "properties": {
          "name": {"type": "string"},
          "displayName": {"type": "string"},
          "description": {"type": "string"},
          "repository": {"type": "string", "format": "uri"},
          "path": {"type": "string"},
          "version": {"type": "string"},
          "sdk": {"type": "string"},
          "category": {
            "type": "string",
            "enum": ["primitives", "workflows", "custom"]
          },
          "dependencies": {
            "type": "array",
            "items": {"type": "string"}
          },
          "tags": {
            "type": "array",
            "items": {"type": "string"}
          },
          "maintainers": {
            "type": "array",
            "items": {"type": "string"}
          },
          "verified": {"type": "boolean"}
        }
      }
    },
    "registries": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "url"],
        "properties": {
          "name": {"type": "string"},
          "url": {"type": "string", "format": "uri"},
          "verified": {"type": "boolean"},
          "priority": {"type": "integer", "minimum": 1}
        }
      }
    }
  }
}
```

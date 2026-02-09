# Claude Plugin Framework v3.0

**A Lightweight, MCP-First Architecture for Claude Code Plugins**

Version: 3.0
Date: 2025-12-17
Status: Active

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Principles](#architecture-principles)
   - Principle 1: MCP-First Design
   - Principle 2: Dedicated Agents Over Manager Agents
   - Principle 3: Skills for Expertise, Not Execution
   - Principle 4: Platform Abstraction in SDK
   - Principle 5: Ultra-Lightweight Commands with Tool Restriction
   - Principle 6: Context Efficiency Through Isolation
   - Principle 7: Hybrid Preparation Pattern (Advanced)
   - Principle 8: Auto-Trigger Everything
3. [Layer Breakdown](#layer-breakdown)
4. [Technology Preference Order](#technology-preference-order)
5. [Component Design](#component-design)
6. [Migration Guide](#migration-guide)
7. [Best Practices](#best-practices)
8. [Anti-Patterns](#anti-patterns)
9. [Examples](#examples)
10. [FAQ](#faq)

---

## Overview

### The Problem With Previous Architectures

**v1.0 - Deep Hierarchy (5+ layers):**
```
Command → Manager Agent → Skill → Handler → Script → CLI
```

Problems:
- 4-5 LLM invocations per operation
- 8-15 seconds latency
- ~3000 tokens per operation
- $0.018-0.020 cost per operation
- Routing decisions at every layer (reliability issues)
- Context pollution in main conversation
- Maintenance nightmare (hundreds of files)

**v2.0 - Skill-Centric (attempted fix):**
```
Command → Agent → Skill → Script → CLI
```

Problems:
- Still 3-4 LLM invocations
- Still routing decisions ("which skill?")
- Skills needed conditional loading because scripts were heavy
- Handlers still needed for platform differences
- Better than v1.0, but still too complex

### The v3.0 Solution: MCP-First Architecture

```
Command (5-10 lines)
  → Dedicated Agent (60-100 lines)
    → MCP Tools / SDK / CLI
      → Business Logic
```

Benefits:
- ✅ 1 LLM invocation (just the agent)
- ✅ 1-2 seconds latency
- ✅ ~500 tokens per operation
- ✅ $0.0005-0.002 cost per operation
- ✅ No routing decisions (hardcoded flow)
- ✅ Isolated context (doesn't pollute main)
- ✅ Auto-triggerable (specific agent descriptions)
- ✅ ~85% less code to maintain

---

## Architecture Principles

### Principle 1: Extract Determinism from LLM Control

**Strategic Principle: Minimize what the LLM does to things that require free-form intelligence.**

The LLM should only handle:
- ✅ Reasoning and analysis
- ✅ Natural language interpretation
- ✅ Creative generation
- ✅ Pattern recognition
- ✅ Decision-making with context

**Everything deterministic and repeatable must be extracted to code.**

### Why Extract Determinism?

**Problems with LLM-controlled deterministic logic:**
- ❌ Consumes context/tokens unnecessarily
- ❌ Introduces inconsistency (LLM might do it differently each time)
- ❌ Creates opportunities for errors
- ❌ Slower (requires LLM invocation)
- ❌ More expensive (token costs)
- ❌ Not reusable outside LLM context

**Benefits of code-based determinism:**
- ✅ Zero context consumption
- ✅ Perfect consistency (same input → same output)
- ✅ Reduced error surface (LLM can't mess it up)
- ✅ Fast execution (no LLM overhead)
- ✅ Cheaper (no token costs)
- ✅ Reusable across systems

### The Extraction Hierarchy

**1. SDK (Preferred - Maximum Reusability)**
```typescript
// TypeScript SDK - reusable everywhere
class RepoManager {
  async createBranch(name: string, base?: string): Promise<Branch> {
    // Deterministic logic lives here
    // Validate, call Git, return structured result
  }
}
```

Benefits:
- ✅ Reusable in MCP, CLI, web apps, scripts, workflows
- ✅ Strongly typed, well-tested
- ✅ Platform abstraction built-in
- ✅ Single source of truth
- ✅ **Enables cross-framework workflows** (FABER, n8n, custom orchestrators)
- ✅ **Building blocks** that compose across different agentic systems

**Why SDK over plugin scripts:**

Instead of this (locked to plugin):
```python
# plugins/repo/scripts/create-branch.py
# Only usable within this plugin via Bash tool
```

Do this (reusable everywhere):
```typescript
// sdk/typescript/src/repo/manager.ts
class RepoManager {
  async createBranch(name: string): Promise<Branch> { }
}
```

Now accessible from:
- **Plugin** via MCP: `fractary_repo_branch_create` tool
- **CLI** directly: `fractary repo branch create`
- **FABER workflows**: Mix repo + work + spec building blocks
- **n8n workflows**: HTTP calls to SDK endpoints
- **Custom scripts**: Import and use SDK
- **Web apps**: Same SDK, different interface
- **CI/CD pipelines**: SDK as library

This **SDK-as-building-blocks approach** enables workflow systems that:
- Mix and match across plugins (repo + work + spec)
- Orchestrate across multiple agentic frameworks
- Compose deterministic operations reliably
- Reuse logic without duplicating code

**2. Local Scripts (Quick Prototyping)**
```python
# Python script for one-off operations
def process_data(input_file):
    # Deterministic logic
    return result
```

Benefits:
- ✅ Fast to implement
- ✅ Good for project-specific logic
- ✅ Easy to test locally

**3. Bash Scripts (Simple Operations)**
```bash
# Shell script for basic automation
git status --porcelain | awk '{print $2}'
```

Benefits:
- ✅ Minimal for simple operations
- ❌ Platform-dependent, harder to test

### Accessing Code: MCP-First Interface

Once deterministic logic is extracted to code (especially SDK), **access it via MCP tools** (preferred interface).

**Key Insight:** With SDK as the foundation, you can wrap it in multiple interfaces. MCP is just one wrapper - but it's the preferred one for Claude Code plugins because it provides universal access to any system that supports MCP.

**The Wrapper Pattern:**
```
SDK (deterministic logic)
  ├─ MCP wrapper → Claude Code, any MCP client
  ├─ CLI wrapper → Terminal, scripts, CI/CD
  ├─ HTTP wrapper → Web apps, n8n, webhooks
  ├─ Library import → Custom scripts, applications
  └─ ... any other interface
```

**MCP Tools wrap your SDK:**
```typescript
// MCP tool wraps SDK
server.tool({
  name: "fractary_repo_branch_create",
  description: "Create Git branch",
  parameters: { /* ... */ }
}, async ({ name, base }) => {
  const manager = new RepoManager();  // SDK
  const result = await manager.createBranch(name, base);
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
```

**Why MCP is preferred (when it fits):**
- ✅ No LLM invocation required (instant)
- ✅ Structured input/output
- ✅ Zero context cost
- ✅ Cacheable, fast
- ✅ Easy to test
- ✅ **Robust framework support** - Works in Claude Code, ChatGPT, Cursor, and most agentic frameworks
- ✅ **Consistent integration** - Same MCP interface across different frameworks
- ✅ **Minimal integration work** - Frameworks handle MCP natively
- ✅ **Beyond coding** - Works in chat interfaces and other non-coding contexts
- ✅ **Isolated context works well** - Most deterministic operations don't need conversation context

**When MCP is NOT preferred:**

MCP has limitations in specific scenarios. Use alternatives when:

**1. Local File Operations**
```
❌ MCP: May not have filesystem write/delete access
✅ Alternative: SDK via Python script with direct file access
```

MCP servers run in isolated environments and may not have permission to:
- Write files to local filesystem
- Delete local files
- Modify local project files

**Use case example:** Creating/deleting cache files, writing config files locally
**Solution:** SDK via Python script with direct filesystem access

**2. Requires Full Conversation Context**
```
❌ MCP: Runs in isolated context, no access to conversation history
✅ Alternative: Skill (runs in main context) or pass context explicitly
```

MCP tools don't see:
- Full conversation history
- Previous user messages
- Ongoing discussion context
- Decisions made earlier in conversation

**Use case example:** Drafting PR description based on conversation about the feature
**Solution:** Skill prepares context, or pass summary to MCP explicitly

**3. Parent Agent Needs Process Insight**
```
❌ MCP: Black box - just returns result
✅ Alternative: Skill (parent observes process) or detailed logging
```

If the calling agent needs to:
- Observe intermediate steps
- React to what's happening inside
- Monitor progress in real-time
- Make decisions based on internal state

**Use case example:** Complex multi-step analysis where parent might want to stop early
**Solution:** Use Skill so parent agent can observe, or return detailed progress info

**4. Deep Shared Context Required**
```
❌ MCP: Separate, isolated context
✅ Alternative: Skill (shared context) or explicit context passing
```

When operation needs:
- Access to variables/state from parent
- To modify parent agent's context
- Continuous back-and-forth with parent
- Deep integration with parent's reasoning

**Use case example:** Iterative refinement where operation and parent exchange info
**Solution:** Skill for shared context, or structure as conversation loop

### When to Use What

| Scenario | Use | Why |
|----------|-----|-----|
| Deterministic + isolated context OK | **MCP** | Fast, efficient, reusable |
| Deterministic + needs local file write | **SDK via Python** | Direct filesystem access |
| Deterministic + needs conversation context | **Skill** or pass context | Access to full history |
| Deterministic + parent needs insight | **Skill** or detailed results | Parent can observe process |
| Deterministic + deep shared context | **Skill** | Shared context/state |
| Non-deterministic reasoning | **Agent** | Requires LLM |

**The key question for MCP:** Is totally separate, isolated context acceptable?
- ✅ **YES (most cases)** → MCP is preferred
- ❌ **NO (needs context/insight)** → Use Skill or direct SDK

**Access Pattern Hierarchy:**
```
1. MCP Tool (wraps SDK)           ← Preferred for most deterministic ops
2. Skill (if context/insight needed) ← When isolation is a problem
3. SDK via Python script          ← For local file operations
4. Bash CLI                       ← Last resort, platform-dependent
```

### Strategic Decision Framework

**When deciding where to implement logic and how to access it:**

```
Is it deterministic (same input → same output)?
├─ YES → Extract to CODE
│   │
│   ├─ Reusable across systems? → SDK (preferred)
│   │   │
│   │   ├─ Isolated context OK? → MCP Tool (wraps SDK) ✅ Preferred
│   │   ├─ Needs conversation context? → Skill (or pass context)
│   │   ├─ Needs local file writes? → SDK via Python script
│   │   └─ Parent needs insight? → Skill (or detailed results)
│   │
│   ├─ Project-specific? → Local script
│   └─ Very simple? → Bash script
│
└─ NO → Keep in LLM (agent)
    └─ Requires reasoning/creativity/context
```

**The MCP Decision Point:**

Once you've decided to extract to SDK, ask:
```
Can this operation work in isolated context?
├─ YES (most cases) → MCP Tool ✅
│   - No conversation history needed
│   - No local file writes
│   - Parent only needs result
│   - Totally separate context OK
│
└─ NO (special cases) → Alternative
    ├─ Needs conversation → Skill or explicit context
    ├─ Needs file writes → SDK via Python
    └─ Parent needs insight → Skill or detailed results
```

**Examples:**

| Operation | Deterministic? | Where? | Why? |
|-----------|---------------|---------|------|
| Create Git branch | ✅ Yes | SDK + MCP | Same process every time, isolated OK |
| Parse JSON response | ✅ Yes | SDK + MCP | Structured transformation, isolated OK |
| Generate commit message | ❌ No | Agent | Requires analysis of changes |
| Validate branch name | ✅ Yes | SDK + MCP | Rule-based validation, isolated OK |
| Suggest architecture | ❌ No | Agent | Requires creative reasoning |
| Execute git commands | ✅ Yes | SDK + MCP | Deterministic operations, isolated OK |
| Write local cache file | ✅ Yes | SDK + Python | Deterministic BUT needs file write |
| Draft PR from conversation | ✅ Mostly | Skill + SDK | Deterministic format BUT needs conversation context |
| Multi-step analysis with early stopping | ❌ No | Agent | Parent needs to observe and decide |
| Delete local config files | ✅ Yes | SDK + Python | Deterministic BUT needs file delete access |

### Impact on Plugin Architecture: Where Logic Lives

This principle **informs where logic should live** - not whether to build a plugin.

**You always build plugins** - the question is: **what's inside them?**

### The Plugin Spectrum

Plugins exist on a spectrum from ultra-lightweight to reasoning-heavy:

**Pattern 1: Ultra-Lightweight Command → MCP**
```markdown
# Command file (5 lines)
---
name: fractary-repo:branch-create
allowed-tools: Task(fractary-repo:branch-create)
---

Invokes fractary-repo:branch-create agent.
```
- Plugin = minimal wrapper
- All logic in SDK via MCP
- Fast, deterministic, reusable

**Pattern 2: Agent Orchestrates SDK**
```markdown
# Agent orchestrates multiple deterministic operations
<WORKFLOW>
1. Call fractary_repo_branch_current (MCP → SDK)
2. Call fractary_work_issue_fetch (MCP → SDK)
3. Call fractary_repo_branch_create (MCP → SDK)
</WORKFLOW>
```
- Plugin = orchestration logic
- Deterministic operations in SDK
- Agent provides workflow intelligence

**Pattern 3: Hybrid (Reasoning + Deterministic)**
```markdown
# Agent: Analyze changes and draft commit message (LLM reasoning)
# Then: Pass to SDK to create commit (deterministic)
<WORKFLOW>
1. Call fractary_repo_diff (MCP → SDK) - get changes
2. Analyze diff and draft message (LLM reasoning)
3. Call fractary_repo_commit(message) (MCP → SDK) - create commit
</WORKFLOW>
```
- Plugin = reasoning + orchestration
- Reasoning in agent (LLM)
- Execution in SDK (deterministic)

### Where Logic Should Live

**Logic in SDK/Code (deterministic):**
- ✅ Data validation
- ✅ API calls with fixed parameters
- ✅ File transformations
- ✅ Parsing structured data
- ✅ Platform detection
- ✅ Configuration management
- ✅ Git operations
- ✅ CRUD operations

**Logic in Plugin Agent (requires LLM):**
- ✅ Analyzing code changes
- ✅ Interpreting user intent
- ✅ Suggesting improvements based on context
- ✅ Orchestrating multiple SDK operations
- ✅ Making decisions with complex criteria
- ✅ Generating content (commit messages, PR descriptions)
- ✅ Choosing between multiple strategies

**Logic in Plugin Command (minimal):**
- ✅ Argument hints
- ✅ Tool restrictions
- ✅ Agent invocation instructions

### Real-World Examples

**Example 1: Pure Deterministic (Pattern 1)**
```
User: /fractary-repo:branch-list --stale
  ↓
Command: 5 lines, invokes agent
  ↓
Agent: 60 lines, calls fractary_repo_branch_list
  ↓
SDK: Deterministic list operation
  ↓
Result: List of stale branches
```
- Plugin is thin wrapper
- All logic in SDK
- Fast, consistent, reusable

**Example 2: Orchestration (Pattern 2)**
```
User: /fractary-repo:branch-create --work-id 123
  ↓
Command: 5 lines, invokes agent
  ↓
Agent: 80 lines, orchestrates:
  1. fractary_work_issue_fetch(123) → SDK
  2. fractary_repo_branch_name_generate → SDK
  3. fractary_repo_branch_create → SDK
  ↓
Result: Branch created with semantic name
```
- Plugin provides workflow
- Each step deterministic (SDK)
- Orchestration in agent

**Example 3: Hybrid Reasoning (Pattern 3)**
```
User: /fractary-repo:commit (no message provided)
  ↓
Command: 5 lines, invokes agent
  ↓
Agent: 100 lines:
  1. fractary_repo_diff → SDK (deterministic)
  2. Analyze diff, draft message (LLM reasoning)
  3. fractary_repo_commit(message) → SDK (deterministic)
  ↓
Result: Semantic commit with generated message
```
- Plugin provides analysis (LLM)
- Operations are deterministic (SDK)
- Best of both worlds

### Design Principles

**The Rule:**
- **Deterministic logic** → SDK (code, tests, reusable)
- **Reasoning logic** → Agent (LLM, orchestration, analysis)
- **Interface** → Command (lightweight, restrictions)

**Benefits of this separation:**
- ✅ Faster operations (less LLM for deterministic parts)
- ✅ Lower costs (fewer tokens for routine operations)
- ✅ Better reliability (deterministic code doesn't vary)
- ✅ Easier testing (SDK has unit tests)
- ✅ Greater reusability (SDK works across frameworks)
- ✅ Clear boundaries (what needs LLM vs what doesn't)

**The plugin always exists** - it's the interface for users. The strategic question is: what logic lives where?

### Principle 2: Dedicated Agents Over Manager Agents

**Each command gets its own dedicated agent.**

This is about **correctness and effectiveness**, not just efficiency.

### Why Dedicated Agents Work Better

**1. Focus Improves Correctness**

The more limited and precise an agent's scope, the more likely it does its job **right**.

**Problem with broad agents:**
```markdown
# Manager agent handles: branches, commits, PRs, tags, worktrees
<WORKFLOW>
If operation is "branch" → do branch stuff
If operation is "commit" → do commit stuff
If operation is "pr" → do PR stuff
...
</WORKFLOW>
```

Issues:
- ❌ Agent loaded with unrelated context (branch logic when creating commits)
- ❌ Confusion from multiple responsibilities
- ❌ Harder to stay focused on specific task
- ❌ More opportunities for mistakes

**Solution with dedicated agents:**
```markdown
# branch-create agent (focused on ONE thing)
<WORKFLOW>
1. Parse branch creation arguments
2. Call fractary_repo_branch_create
3. Return result
</WORKFLOW>
```

Benefits:
- ✅ Agent only sees branch creation context
- ✅ No unrelated information to distract
- ✅ Clear, focused mission
- ✅ Higher success rate

**The focused agent does its job RIGHT because it's not confused by unrelated concerns.**

**2. Fine-Grained Tool Control**

Dedicated agents let you restrict tools to exactly what's needed:

**Manager agent (overly permissive):**
```yaml
# Must grant ALL tools for ALL operations
tools:
  - fractary_repo_branch_create
  - fractary_repo_branch_delete
  - fractary_repo_commit
  - fractary_repo_push
  - fractary_repo_pr_create
  - fractary_repo_tag_create
  # ... 20+ tools
```

Problems:
- ❌ Agent can accidentally call wrong tool
- ❌ Security: too many permissions
- ❌ Confusion: which tool for what?

**Dedicated agent (precise permissions):**
```yaml
# branch-create agent: ONLY what it needs
tools:
  - fractary_repo_branch_create
  - fractary_work_issue_fetch  # if using work items
```

Benefits:
- ✅ Can't accidentally call wrong tool
- ✅ Security: minimal permissions
- ✅ Clarity: obvious which tool to use
- ✅ Less confusion = higher correctness

**3. Model Selection Optimization**

Different operations need different model capabilities:

**Manager agent (highest common denominator):**
```yaml
# Must use most expensive model for ANY operation
model: claude-sonnet-4-5  # $15/million tokens
```

Why? Because:
- Some operations need complex reasoning
- Can't switch models mid-agent
- Must provision for worst case
- **Pay premium for simple operations**

**Dedicated agents (right model for job):**
```yaml
# branch-create agent (deterministic)
model: claude-haiku-4-5  # $1/million tokens

# pr-review agent (complex reasoning)
model: claude-sonnet-4-5  # $15/million tokens

# commit agent (simple)
model: claude-haiku-4-5  # $1/million tokens
```

Benefits:
- ✅ **15x cost savings** on simple operations
- ✅ Fast operations use fast model
- ✅ Complex operations get powerful model
- ✅ Right tool for right job

**Example cost comparison:**

| Operation | Manager (Sonnet) | Dedicated (Haiku) | Savings |
|-----------|-----------------|-------------------|---------|
| List branches | $0.015 | $0.001 | **93%** |
| Create branch | $0.015 | $0.001 | **93%** |
| Simple commit | $0.015 | $0.001 | **93%** |
| Review PR | $0.015 | $0.015 | 0% (needs Sonnet) |

**With dedicated agents:** 3 of 4 operations run 15x cheaper.

**4. Context and Token Optimization**

Smaller, focused agents = less context needed:

**Manager agent:**
```markdown
# Must include ALL operation contexts
- How to create branches
- How to delete branches
- How to create commits
- How to push commits
- How to create PRs
- How to review PRs
- How to create tags
# ... 20+ operation descriptions
```

Size: ~500 lines, ~2000 tokens per invocation

**Dedicated agent:**
```markdown
# Only branch creation context
- How to create branches
# That's it
```

Size: ~80 lines, ~300 tokens per invocation

**Token savings: 85%** per operation

**5. No Routing Decisions**

Manager agents must decide **which operation** to execute:

```markdown
# Manager agent workflow
1. Parse user request
2. Determine operation type (branch? commit? PR?)  ← Routing decision
3. Execute appropriate logic
```

Problems:
- ❌ Can misinterpret request
- ❌ Routing adds failure mode
- ❌ Extra LLM reasoning step
- ❌ Less reliable

Dedicated agents have **hardcoded flow**:

```markdown
# branch-create agent workflow
1. Parse branch creation arguments
2. Create branch
# No routing, no decisions, just execute
```

Benefits:
- ✅ No misinterpretation
- ✅ Deterministic path
- ✅ Fewer failure modes
- ✅ More reliable

**6. Specific Auto-Trigger Descriptions**

Dedicated agents enable **proactive auto-triggering** - Claude can invoke them automatically at any point, not just via manual commands.

**Why this matters:**

When you have focused agents with clear descriptions, Claude can identify and use them automatically during any conversation, without you explicitly running a command.

**Manager agent (too generic for auto-trigger):**
```markdown
description: Handles repository operations including branches, commits, PRs, and tags.
```

Problems:
- ❌ Too generic - when should this trigger?
- ❌ "Create branch" or "Create PR" both match
- ❌ LLM uncertain which to use
- ❌ Unlikely to auto-trigger (too vague)

**Dedicated agents (precise, auto-triggerable):**
```markdown
# branch-create agent
description: Create Git branches. MUST BE USED when user wants to create a new branch.

Examples:
- "Create a branch for issue 123"
- "Make a feature branch"
- "New branch from main"
```

Benefits:
- ✅ Precise matching
- ✅ Clear trigger conditions
- ✅ **Reliable auto-invocation**
- ✅ Claude proactively uses it when appropriate

**Skills vs Agents for Auto-Triggering:**

| Aspect | Skills | Agents |
|--------|--------|--------|
| **Description length** | ~100 characters (very limited) | No limit (can be extensive) |
| **Examples allowed** | Minimal | Robust examples encouraged |
| **Auto-trigger reliability** | Limited (short description) | Excellent (detailed description) |
| **Invocation control** | Optional (treated loosely) | Enforceable via `allowed-tools: Task` |

**Skills are severely limited** in description length (~100 characters), making them poor for auto-triggering. **Agents have no such limitation** - you can provide robust examples and detailed trigger conditions.

**Forced Invocation (Commands → Agents):**

The 1:1 command-agent relationship enables reliable forced invocation:

```yaml
# Command forces specific agent via Task tool restriction
allowed-tools: Task(fractary-repo:branch-create)
```

This ensures:
- ✅ Command always invokes correct agent
- ✅ No interpretation ambiguity
- ✅ Deterministic invocation path

**vs Manager agents:**
- ❌ Command must describe operation in text
- ❌ Manager interprets what to do
- ❌ Something can get lost in interpretation

**vs Skills:**
- ❌ Skills treated more optionally
- ❌ Harder to force specific skill use
- ❌ No `allowed-tools` enforcement for skills

**7. Isolated Failures**

When one operation breaks, it doesn't affect others:

**Manager agent:**
- Bug in PR logic → entire agent broken
- Can't create branches, commits, or anything
- Single point of failure

**Dedicated agents:**
- Bug in pr-create → only PR creation affected
- branch-create, commit, tag still work fine
- Isolated failures

**8. Parallel Development**

Teams can work on agents independently:

**Manager agent:**
- One developer at a time
- Conflicts when editing
- Must coordinate changes
- Bottleneck

**Dedicated agents:**
- Multiple developers simultaneously
- No conflicts (different files)
- Independent evolution
- Parallel progress

**9. Parallel Agent Execution (Limited)**

Dedicated agents enable concurrent operations - you can invoke multiple agent instances simultaneously:

**Use case:** Process multiple items concurrently
```typescript
// Invoke multiple agents in parallel (single message, multiple Task calls)
Task({ subagent_type: "fractary-repo:branch-create", prompt: "Create branch for issue 123" })
Task({ subagent_type: "fractary-repo:branch-create", prompt: "Create branch for issue 456" })
Task({ subagent_type: "fractary-repo:branch-create", prompt: "Create branch for issue 789" })
```

**Current limitations:**
- ⚠️ **Limited scale**: Unreliable with 4+ parallel agents
- ⚠️ **Lock file risks**: Can cause corruption at scale
- ⚠️ **No progress monitoring**: Must wait for all to complete
- ⚠️ **No termination control**: Can't interrupt running agents

**When parallel execution helps:**
- ✅ 2-3 independent operations
- ✅ Operations don't share resources
- ✅ Can tolerate potential failures

**When to avoid:**
- ❌ 4+ agents (unreliable)
- ❌ Shared resource access (lock conflicts)
- ❌ Critical operations (risk of corruption)

**Manager agents can't do this:**
- Manager = single instance handling all operations
- Must process sequentially
- No concurrency benefit

**Note:** This feature has limitations and is being improved. See [Issue #3013](https://github.com/anthropics/claude-code/issues/3013) for current status.

**10. Background Execution (Not Yet Available)**

**Requested feature** (not currently implemented): The ability to run agents in background while continuing main work.

**Example use case:**
```typescript
// PROPOSED (NOT CURRENTLY AVAILABLE)
Task({
  subagent_type: "fractary-repo:commit",
  prompt: "Create commit with changes",
  run_in_background: true  // Not yet supported
})
// Continue working while agent commits in background
```

**What this would enable:**
- ⚠️ Start long-running agent (e.g., commit, PR creation)
- ⚠️ Continue main conversation work
- ⚠️ Check results later when needed
- ⚠️ Don't block on agent completion

**Current reality:**
- ❌ All agents block until completion
- ❌ No background execution available
- ❌ Must wait for agent to finish

**Workarounds today:**
- Use Bash tool with `run_in_background: true` for shell commands
- Keep agent tasks small and fast
- Accept blocking behavior

**Feature status:**
- Highly requested: [Issue #9905](https://github.com/anthropics/claude-code/issues/9905), [Issue #5236](https://github.com/anthropics/claude-code/issues/5236)
- On roadmap but not implemented
- Bash tool already supports this pattern

**Why dedicated agents will benefit:**
Once background execution is available, dedicated agents will excel:
- Each agent is small, self-contained
- Easy to spawn in background
- Clear completion criteria
- Manager agents too large/complex for background

**11. Explicit Interfaces Enable Cross-Platform Composition**

Dedicated agents force you to define explicit inputs and outputs, making them composable across different agentic systems.

**Why this matters:**

When working within a single framework (like Claude Code), you might rely on implicit context and assumptions. But when building workflows that span multiple agentic systems, each agent must operate independently.

**Example cross-platform workflow:**
```
Step 1: Claude Code agent analyzes codebase
  ↓ (explicit output: analysis JSON)
Step 2: OpenAI Codex agent generates implementation
  ↓ (explicit output: code files)
Step 3: Google Gemini agent reviews changes
  ↓ (explicit output: review report)
```

**Dedicated agents enforce this:**
- ✅ **Clear inputs**: What does this agent need to start?
- ✅ **Clear outputs**: What does this agent produce when done?
- ✅ **No assumptions**: Can't rely on "master agent" context
- ✅ **Portable**: Works in Claude Code, FABER, n8n, custom orchestrators

**Manager agent (assumes context):**
```markdown
# Relies on shared state, implicit context
# Hard to use outside its original environment
# Tightly coupled to Claude Code specifics
```

**Dedicated agent (explicit interface):**
```markdown
# Input: work_id, branch_name (explicit)
# Output: branch_created, branch_url (explicit)
# No assumptions about environment
# Works anywhere that can call it
```

**Benefits:**
- ✅ Reusable across different agentic frameworks
- ✅ Composable in multi-platform workflows
- ✅ Testable in isolation
- ✅ Clear contracts and expectations

**The isolation isn't a limitation - it's a feature.** It forces good design that makes agents truly portable building blocks.

### Summary: Why Dedicated Agents Win

| Aspect | Manager Agent | Dedicated Agent |
|--------|---------------|-----------------|
| **1. Correctness** | Confused by unrelated context | Focused, does job right |
| **2. Tool Permissions** | Wide swath (20+ tools) | Minimal (2-3 tools) |
| **3. Model Cost** | Always expensive (Sonnet) | Right model for job (Haiku when possible) |
| **4. Context Size** | Large (~2000 tokens) | Small (~300 tokens) |
| **5. Routing** | Must decide operation | Hardcoded flow |
| **6. Auto-Trigger** | Generic description (~100 chars) | Detailed with examples (unlimited) |
| **7. Failure Scope** | Entire agent broken | Isolated to one operation |
| **8. Development** | Sequential, bottleneck | Parallel, independent |
| **9. Parallel Execution** | Single instance only | Multiple instances (2-3 reliable) |
| **10. Background Ready** | Too large/complex | Small, self-contained (when available) |
| **11. Cross-Platform** | Assumes shared context | Explicit inputs/outputs, portable |

**The primary benefit is correctness through focus.** Cost, efficiency, and flexibility are secondary bonuses.

**Dedicated agents do their jobs right because they're not distracted by unrelated concerns.**

**11 comprehensive benefits** demonstrate why dedicated agents are superior across every dimension - from correctness to cost to future-readiness.

### Principle 3: Skills for Expertise, Not Execution

**Skills have a new purpose in v3.0: providing organizational knowledge and expertise.**

**OLD use case (obsolete):** Skills for execution
- Orchestrating scripts → Now MCP tools handle this
- Conditional workflows → Now agents handle this
- Platform abstraction → Now SDK handles this

**NEW use case (recommended):** Skills for expertise
- ✅ Organizational standards (commit format, PR template)
- ✅ Best practices (code review checklist, security guidelines)
- ✅ Templates (documentation format, branch naming)
- ✅ Domain knowledge (architecture patterns, style guides)
- ✅ Brand voice (user-facing text tone, terminology)

**When to create skills:**
- Injecting organizational context agents should follow
- Providing templates agents should use
- Documenting standards agents should enforce

**Examples:**
- `commit-format` skill: Conventional commits + FABER metadata standards
- `pr-template` skill: Required PR description sections
- `code-review-checklist` skill: What to check during reviews
- `api-design-standards` skill: REST API conventions

**Agents read these skills** to get expertise, then execute operations following those standards.

### Principle 4: Platform Abstraction in SDK

**The SDK handles platform-specific logic, not plugins.**

Example: Creating a pull request works differently on GitHub, GitLab, and Bitbucket.

**Before (v2.0):**
```
Skill → Handler-GitHub → gh pr create
Skill → Handler-GitLab → glab mr create
Skill → Handler-Bitbucket → bb pr create
```

**Now (v3.0):**
```
Agent → MCP/SDK → SDK detects platform → Uses correct API
```

The SDK:
- Detects the current platform automatically
- Uses the appropriate API/CLI for that platform
- Provides a unified interface to agents
- Handles platform-specific quirks internally

**Don't create handlers. Extend the SDK.**

### Principle 5: Ultra-Lightweight Commands with Tool Restriction

**Commands are thin wrappers that delegate to agents using physical enforcement.**

Commands should:
- Be 8-18 lines of markdown
- Use `allowed-tools: Task` to enforce delegation
- Show explicit Task tool invocation with parameters
- Not contain logic, parsing, or orchestration

**Tool Restriction (Critical):**
```yaml
---
name: fractary-plugin:command
allowed-tools: Task  # Physical constraint - Claude cannot use other tools
---
```

This is a **physical enforcement mechanism** that prevents Claude from:
- Using Read/Write/Edit/Bash tools directly
- Solving the problem without delegating
- Bypassing the agent architecture

**Parameter-Based Restrictions:**

The `allowed-tools` field supports fine-grained restrictions using the syntax `ToolName(parameter:value)`:

```yaml
# Restrict to specific agent only
allowed-tools: Task(fractary-repo:commit)

# Restrict to specific skill only
allowed-tools: Skill(fractary-pr-context-preparer)

# Restrict to namespace with wildcard
allowed-tools: Task(fractary-repo:*)

# Multiple specific restrictions
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
```

This provides:
- ✅ Exact control over which agents/skills can be invoked
- ✅ Namespace isolation (e.g., only fractary-repo:* agents)
- ✅ Clear audit trail of permitted operations
- ✅ Security against unintended invocations

**Instructive Prompt Pattern:**
Commands should show the Task invocation explicitly:

```markdown
Create semantic commit using Task tool:

Task(
  subagent_type="fractary-repo:commit",
  description="Create semantic commit",
  prompt="Create semantic commit with arguments: $ARGUMENTS"
)
```

This teaches Claude:
- HOW to invoke the agent (Task tool)
- WHICH agent to use (fractary-repo:commit)
- WHAT parameters to pass
- HOW to format the prompt

**What NOT to include:**
- Don't restate what the agent will do (agent knows its job)
- Only mention configuration if the agent has CHOICES
- Don't add redundant skill references if agent always uses them

The agent handles everything. The command is an instructive manual trigger interface with physical enforcement.

### Principle 6: Context Efficiency Through Isolation

**Agents run in isolated context, keeping the main conversation clean.**

When an agent is invoked:
- It gets its own context (agent definition + prompt)
- It doesn't pollute the main conversation with intermediate steps
- It returns a clean result to the main context
- Long-running operations don't clutter the user's view

This is especially important for operations that:
- Make many MCP tool calls
- Have complex conditional logic
- Generate verbose output
- Need to track state across multiple steps

### Principle 7: Hybrid Preparation Pattern (Advanced)

**For context-dependent operations, use skills to prepare input from main conversation, then pass to agents.**

Most operations work with agent-only delegation:
```
Command (allowed-tools: Task)
  → Agent (isolated context, generates from git/API)
```

But some operations benefit from conversation context:
```
Command (allowed-tools: Skill, Task)
  → Preparation Skill (main context, reads conversation)
  → Execution Agent (isolated context, receives prepared input)
```

**When to use Hybrid Pattern:**
- PR descriptions that should reference conversation discussion
- Commit messages that need conversation context
- Issue descriptions drawing from brainstorming session
- Any output that improves with full conversation history

**Decision Criteria:**
- **Agent only**: Agent needs OUTPUT/result only
- **Hybrid pattern**: Main agent needs to observe PROCESS of preparation

**Tool Restriction with Skills (Parameter-Based Syntax):**
```yaml
# Allow specific skill only + any Task
allowed-tools: Skill(fractary-pr-context-preparer), Task

# Or restrict both skill and agent to namespace
allowed-tools: Skill(fractary-repo:*), Task(fractary-repo:*)

# Or allow specific skill + specific agent
allowed-tools: Skill(fractary-pr-context-preparer), Task(fractary-repo:pr-create)
```

**Syntax Pattern:** `ToolName(parameter:value)` where:
- `parameter` is the skill/agent name or namespace
- `:` separates parameter from value
- `*` is a wildcard for "any" within that namespace
- Multiple tools separated by commas

**Example Flow:**
1. Command restricted to `Skill, Task`
2. Invokes `pr-context-preparer` skill (main context)
   - Reads full conversation history
   - Identifies key decisions and changes discussed
   - Drafts PR summary incorporating conversation
3. Passes prepared summary to `pr-create` agent (isolated context)
   - Receives summary parameter
   - Creates PR with prepared content
   - Returns result

**Benefits:**
- ✅ Conversation context available where needed
- ✅ Still efficient (agent execution isolated)
- ✅ Best of both worlds

**Important:** Only use when conversation context truly adds value. Most operations work fine with agent-only delegation.

### Principle 8: Auto-Trigger Agents and Skills

**Only agents and skills can be auto-triggered. Commands require manual invocation.**

**Commands (Manual Invocation Only):**
- Require explicit `/command-name` invocation
- User must type the slash command
- Cannot be auto-triggered by Claude

**Agents (Auto-Triggerable):**
- Auto-trigger via description matching
- Claude invokes when user describes the task
- More natural, less friction
- No manual command needed
- Unlimited description length for detailed examples

**Skills (Auto-Triggerable):**
- Auto-trigger based on description
- Limited to ~100 character descriptions
- Less reliable than agents for auto-triggering

**Write detailed agent descriptions with examples** to make auto-triggering reliable. Agents have no description length limits, unlike skills.

**Agent Description Best Practices:**
- Include "MUST BE USED for all {operation} operations from {command} command"
- Add "Use PROACTIVELY when user requests {operation}"
- Provide concrete examples of user requests
- List common trigger phrases

---

## Layer Breakdown

### Layer 1: Commands

**Purpose:** Manual trigger interface with enforced delegation to agents

**File Location:** `plugins/{plugin}/commands/{command}.md`

**Size:** 8-18 lines

**Structure:**
```markdown
---
name: fractary-plugin:command-name
description: Brief description - delegates to agent
allowed-tools: Task
model: claude-haiku-4-5
argument-hint: '[arg1] [--flag] [--option <value>]'
---

Brief description of what this command does.

Task tool invocation pattern:

Task(
  subagent_type="fractary-plugin:command-name",
  description="Short description",
  prompt="Operation with arguments: $ARGUMENTS"
)
```

**Frontmatter Fields:**
- `name`: Namespaced command name (fractary-plugin:command-name)
- `description`: Brief description mentioning delegation
- `allowed-tools: Task`: **CRITICAL** - Physical enforcement of delegation
- `model`: Usually `claude-haiku-4-5` for efficiency
- `argument-hint`: Shows expected parameters to user

**Responsibilities:**
- Describe what the command does
- Show explicit Task tool invocation pattern
- Restrict to Task tool only (enforcement)
- Nothing else

**Passing Arguments to Agents:**

Commands must use `$ARGUMENTS` to pass user-provided arguments to agents:

```markdown
prompt="Operation with arguments: $ARGUMENTS"
```

**Why `$ARGUMENTS` is required:**
- `$ARGUMENTS` is a Claude Code variable that captures all arguments passed by the user
- Without it, the agent has no access to the user's actual input
- The agent's workflow handles parsing the arguments (see agent documentation)
- Alternative: Use `$1`, `$2`, etc. for positional arguments

**Example user invocation:**
```
/repo:commit "Fix bug" --type fix --work-id 123
```
The `$ARGUMENTS` value becomes: `"Fix bug" --type fix --work-id 123`

**Example (Standard Pattern):**
```markdown
---
name: fractary-repo:commit
description: Create semantic commits - delegates to fractary-repo:commit agent
allowed-tools: Task
model: claude-haiku-4-5
argument-hint: '["message"] [--type <type>] [--work-id <id>] [--scope <scope>]'
---

Create semantic commit using Task tool:

Task(
  subagent_type="fractary-repo:commit",
  description="Create semantic commit",
  prompt="Create semantic commit with arguments: $ARGUMENTS"
)
```

**Example (Hybrid Pattern with Skill):**
```markdown
---
name: fractary-repo:pr-create
description: Create pull request with conversation context
allowed-tools: Skill(fractary-pr-context-preparer), Task(fractary-repo:pr-create), TodoWrite
model: claude-sonnet-4-5
argument-hint: '["title"] [--body "<text>"] [--base <branch>]'
---

**IMPORTANT:** This is a two-step process. Follow in order:

1. Use **Skill** tool with `fractary-pr-context-preparer` to extract conversation context:

Skill(skill="fractary-pr-context-preparer")

2. Use **Task** tool with `fractary-repo:pr-create` subagent to create pull request:

Task(
  subagent_type="fractary-repo:pr-create",
  description="Create pull request",
  prompt="Create pull request with arguments: $ARGUMENTS. Use the prepared context from the previous skill call."
)
```

**Note:** This example uses parameter-based restrictions:
- `Skill(fractary-pr-context-preparer)` - Only this specific skill allowed
- `Task(fractary-repo:pr-create)` - Only this specific agent allowed
- `TodoWrite` - For tracking the two-step sequence

This prevents the command from invoking other skills or agents.

**TodoWrite for Two-Step Enforcement:**

For hybrid commands that require skill-then-agent execution, include `TodoWrite` in allowed-tools. Claude can use it to create a clear checklist:

```
[ ] Step 1: Extract context using fractary-pr-context-preparer skill
[ ] Step 2: Create PR using fractary-repo:pr-create agent
```

This ensures:
- ✅ Steps execute in correct order
- ✅ No step is skipped
- ✅ User can see progress
- ✅ Clear accountability for each phase

**When to use TodoWrite in commands:**
- Two-step processes (skill → agent)
- Multi-agent workflows requiring specific order
- When step sequence is critical to success

**When NOT needed:**
- Single-step commands (just agent invocation)
- Order doesn't matter

**What NOT to include:**
- ❌ Argument parsing logic
- ❌ Validation logic
- ❌ Workflow steps
- ❌ MCP tool calls
- ❌ Error handling
- ❌ Output formatting
- ❌ Restating what the agent will do (agent knows its job)
- ❌ Skill references if agent always uses them (redundant)

**Key Principle:** Only include information that helps Claude make CHOICES about configuration. Don't repeat what the agent already knows.

### Layer 2: Dedicated Agents

**Purpose:** Orchestrate operations using MCP/SDK/CLI

**File Location:** `plugins/{plugin}/agents/{command-name}.md`

**Size:** 60-100 lines

**Structure:**
```markdown
---
name: fractary-plugin:agent-name
description: What this agent does. MUST BE USED for all {operation} operations from fractary-plugin:command command. Use PROACTIVELY when user requests {operation}.
tools: fractary_plugin_tool_1, fractary_plugin_tool_2
model: claude-haiku-4-5
---

# {agent-name} Agent

## Description
Detailed description of what this agent does and when to use it.

## Use Cases
**Use this agent when:**
- User wants to [specific action]
- User mentions "[trigger phrase]"
- User needs to [specific goal]

**Examples:**
- "Example user request 1"
- "Example user request 2"
- "Example user request 3"

## Arguments
List of arguments this agent accepts (from command or natural language)

## Workflow

<WORKFLOW>
1. Read expertise skills if applicable (e.g., fractary-commit-format)

2. Parse/extract arguments from command invocation or natural language

3. Conditional logic based on arguments:

   If condition A:
     - Call fractary_plugin_tool_1
     - Process result
     - Call fractary_plugin_tool_2

   If condition B:
     - Call fractary_plugin_tool_3
     - Process result

   If condition C:
     - Call fractary_plugin_tool_4

4. Handle errors:
   - If MCP call fails, return error message
   - If validation fails, return helpful guidance

5. Format and return result following expertise skill standards
</WORKFLOW>

## Output
Description of what this agent returns
```

**Frontmatter Fields:**
- `name`: Namespaced agent name (fractary-plugin:agent-name)
- `description`: Include "MUST BE USED" and "Use PROACTIVELY" for auto-triggering
- `tools`: List of MCP tools this agent can use
- `model`: Usually `claude-haiku-4-5` for efficiency

**Key Principles:**

1. **Specific Auto-Trigger Description**
   - Include concrete examples of user requests
   - List trigger phrases
   - Be specific about when to use this agent

2. **Hardcoded Flow**
   - No routing decisions
   - Clear, deterministic logic
   - "If X, call tool A. If Y, call tool B."

3. **MCP-First**
   - Prefer MCP tools for all data operations
   - Fall back to SDK via Python only when needed
   - Use CLI only as last resort

4. **Error Handling**
   - Handle MCP tool failures gracefully
   - Provide helpful error messages
   - Don't expose internal errors to users

5. **Isolated Context**
   - Agent runs in its own context
   - Doesn't pollute main conversation
   - Returns clean result

**What NOT to include:**
- ❌ Logic that belongs in the SDK
- ❌ Platform-specific code (use SDK)
- ❌ Script execution (use MCP or SDK)
- ❌ Routing to other agents/skills

**Expertise Skills:**

Agents should reference expertise skills when organizational standards matter:

```markdown
<WORKFLOW>
1. Read fractary-commit-format skill for conventional commit standards

2. Parse arguments and generate commit message

3. Create commit following standards from skill
</WORKFLOW>
```

**Common expertise skills:**
- `fractary-commit-format`: Conventional commits + FABER metadata
- `fractary-pr-template`: Standard PR structure
- `fractary-code-review-checklist`: Review standards
- `fractary-branch-naming`: Branch naming conventions

Agents read these to get organizational knowledge, then apply it during execution.

### Layer 3: MCP Tools

**Purpose:** Deterministic operations without LLM invocation

**File Location:** `mcp/server/src/handlers/{plugin}.ts`

**Technology:** TypeScript (MCP server)

**Structure:**
```typescript
server.tool({
  name: "fractary_plugin_operation",
  description: "What this tool does",
  parameters: {
    type: "object",
    properties: {
      arg1: { type: "string", description: "..." },
      arg2: { type: "number", description: "..." }
    },
    required: ["arg1"]
  }
}, async ({ arg1, arg2 }) => {
  // Call SDK
  const result = await pluginManager.operation(arg1, arg2);

  // Return structured result
  return {
    content: [{
      type: "text",
      text: JSON.stringify(result, null, 2)
    }]
  };
});
```

**When to create MCP tools:**
- ✅ Deterministic operations (same input → same output)
- ✅ Data retrieval operations
- ✅ CRUD operations
- ✅ Status checks
- ✅ List/search operations

**When NOT to create MCP tools:**
- ❌ Operations requiring reasoning/analysis
- ❌ Operations that need to read user's mind
- ❌ Operations that benefit from LLM interpretation
- ❌ Complex decision-making

**Key Principles:**
1. Thin wrapper around SDK
2. Input validation
3. Structured output (JSON)
4. Clear error messages
5. No business logic (that's in SDK)

### Layer 4: SDK

**Purpose:** Business logic and platform abstraction

**File Location:** `sdk/{language}/src/{plugin}/manager.{ext}`

**Technology:** TypeScript, Python, or other supported language

**Structure:**
```typescript
export class PluginManager {
  private platform: Platform;

  constructor() {
    // Detect platform (GitHub, GitLab, Bitbucket, etc.)
    this.platform = detectPlatform();
  }

  async operation(arg1: string, arg2: number): Promise<Result> {
    // Validate inputs
    this.validate(arg1, arg2);

    // Platform-specific logic
    if (this.platform === 'github') {
      return this.githubOperation(arg1, arg2);
    } else if (this.platform === 'gitlab') {
      return this.gitlabOperation(arg1, arg2);
    }
    // ... etc
  }

  private async githubOperation(arg1: string, arg2: number): Promise<Result> {
    // GitHub-specific implementation
  }

  private async gitlabOperation(arg1: string, arg2: number): Promise<Result> {
    // GitLab-specific implementation
  }
}
```

**Responsibilities:**
- Core business logic
- Platform detection and abstraction
- Input validation
- Data persistence
- External API calls
- Git operations
- File system operations (when needed)

**Key Principles:**
1. Single source of truth for logic
2. Platform abstraction (one interface, multiple implementations)
3. Comprehensive error handling
4. Well-tested
5. Documented

---

## Technology Preference Order

When implementing operations, follow this preference order:

### 0. Skills (For Expertise Only)

**Use for:** Organizational knowledge and standards

**Why:**
- ✅ Provides expertise to agents
- ✅ Centralizes organizational knowledge
- ✅ Ensures consistency across operations
- ✅ Easy to update standards in one place

**Examples:**
- `fractary-commit-format`: How to format commits
- `fractary-pr-template`: What sections PRs need
- `fractary-code-review-checklist`: What to check during reviews
- `fractary-api-standards`: How to design APIs

**NOT for:**
- ❌ Execution/orchestration (use agents)
- ❌ Data operations (use MCP tools)
- ❌ Business logic (use SDK)

**Agents read skills to learn standards, then execute operations following those standards.**

### 1. MCP Tools (Highest Preference for Execution)

**Use for:** All deterministic operations

**Why:**
- ✅ No LLM invocation (instant, no cost)
- ✅ No context overhead
- ✅ Structured input/output
- ✅ Easy to test
- ✅ Fast

**Examples:**
- Data retrieval: `fractary_repo_branch_list`
- CRUD operations: `fractary_work_issue_create`
- Status checks: `fractary_repo_status_get`
- Git operations: `fractary_repo_commit`, `fractary_repo_push`

**When available, always use MCP.**

### 2. SDK via Python Script (Second Preference)

**Use for:** Operations MCP can't handle

**Why MCP can't handle:**
- Local file writing/deletion (MCP server might not have filesystem access in some configurations)
- Complex multi-step operations that benefit from local execution
- Operations requiring local state management

**How to use:**
```markdown
## In agent workflow:
1. Write Python script using SDK:
   ```python
   from fractary.sdk import PluginManager

   manager = PluginManager()
   result = manager.operation(args)
   print(result)
   ```

2. Execute via Bash tool:
   python3 script.py

3. Parse output
```

**Examples:**
- Writing local configuration files
- Deleting local cache directories
- Complex local transformations

**Key Principles:**
- Use SDK for business logic, not raw Python
- Keep scripts small and focused
- Clean up temporary scripts after use
- Handle errors gracefully

### 3. CLI via Bash (Lowest Preference)

**Use for:** Operations not available in MCP or SDK

**Why CLI is last resort:**
- ❌ Platform-dependent (sh vs bash vs zsh)
- ❌ Error handling is harder
- ❌ Output parsing is fragile
- ❌ Not cross-platform
- ❌ Harder to test

**When to use:**
- MCP tool doesn't exist yet
- SDK doesn't support the operation
- Need to call external CLI tools (git, gh, glab, etc.)
- Temporary solution while building MCP tool

**Examples:**
```bash
# Git operations not yet in MCP
git checkout -b feature-branch

# GitHub CLI when MCP doesn't cover the case
gh pr view 123 --json comments

# External tools
docker ps | grep my-container
```

**Key Principles:**
- Document why CLI is needed (vs MCP/SDK)
- Plan to migrate to MCP/SDK
- Handle errors explicitly
- Quote paths properly
- Test on multiple platforms

---

## Component Design

### Designing a New Operation

Follow this process when adding a new operation:

#### Step 1: Identify Operation Type

**Deterministic Operation (65% of operations)**
- Same input → same output
- No reasoning required
- Examples: create branch, push commit, list issues

**Path:** Command → Agent → MCP → SDK

**Reasoning Operation (35% of operations)**
- Requires analysis or generation
- Benefits from LLM interpretation
- Examples: generate commit message, review PR, suggest improvements

**Path:** Command → Agent (with reasoning) → MCP (for data) → SDK

#### Step 2: Design SDK Method

Start with the SDK. What should the interface be?

```typescript
// Example: Branch creation
class RepoManager {
  async createBranch(options: {
    name: string;
    base?: string;
    workItemId?: string;
  }): Promise<{
    branch: string;
    created: boolean;
    worktree?: string;
  }> {
    // Implementation
  }
}
```

**SDK Design Principles:**
- Clear, typed interfaces
- Platform-agnostic
- Comprehensive error handling
- Well-documented
- Testable

#### Step 3: Create MCP Tool

Wrap the SDK method in an MCP tool:

```typescript
server.tool({
  name: "fractary_repo_branch_create",
  description: "Create a new Git branch",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Branch name" },
      base: { type: "string", description: "Base branch (default: main)" },
      work_item_id: { type: "string", description: "Work item ID" }
    },
    required: ["name"]
  }
}, async ({ name, base, work_item_id }) => {
  const manager = new RepoManager();
  const result = await manager.createBranch({
    name,
    base,
    workItemId: work_item_id
  });

  return {
    content: [{
      type: "text",
      text: JSON.stringify(result, null, 2)
    }]
  };
});
```

#### Step 4: Create Dedicated Agent

```markdown
# branch-create Agent

Create Git branches from work items, descriptions, or direct names.

**Use this agent when:**
- User wants to create a new Git branch
- User mentions "create branch", "new branch", "make a branch"
- User references a work item and wants a branch for it

**Examples:**
- "Create a branch for issue 123"
- "Make a feature branch called dark-mode"
- "Create a branch for the authentication work"

## Workflow

<WORKFLOW>
1. Extract arguments:
   - name (direct branch name)
   - work_item_id (issue/ticket number)
   - description (semantic name from description)
   - base (base branch, default: main)
   - worktree (create worktree, default: false)

2. Determine branch creation path:

   If work_item_id provided:
     - Call: fractary_work_issue_fetch (get issue details)
     - Call: fractary_repo_branch_name_generate (generate semantic name)
     - Call: fractary_repo_branch_create (create branch)

   If description provided (no work_item_id):
     - Call: fractary_repo_branch_name_generate (generate semantic name)
     - Call: fractary_repo_branch_create (create branch)

   If name provided directly:
     - Call: fractary_repo_branch_create (create branch with exact name)

3. If worktree requested:
   - Call: fractary_repo_worktree_create (create worktree for branch)

4. Return result:
   - Branch name
   - Location (main repo or worktree path)
   - Success message
</WORKFLOW>
```

#### Step 5: Create Ultra-Lightweight Command

```markdown
# /repo:branch-create

Create a Git branch from work items, descriptions, or direct names.

Invokes the branch-create agent to handle branch creation.
```

### Operation Flow Summary

```
User: "/repo:branch-create --work-id 123"
  ↓
Command: Invoke branch-create agent
  ↓
Agent (isolated context):
  1. Extract work_item_id = 123
  2. Call fractary_work_issue_fetch(123)
     → Gets issue: "Add dark mode toggle"
  3. Call fractary_repo_branch_name_generate(work_id=123, title="Add dark mode toggle")
     → Gets name: "feature/123-add-dark-mode-toggle"
  4. Call fractary_repo_branch_create(name="feature/123-add-dark-mode-toggle")
     → Creates branch
  5. Return: "✅ Created branch 'feature/123-add-dark-mode-toggle'"
  ↓
Main Context: "✅ Created branch 'feature/123-add-dark-mode-toggle'"
```

**Key points:**
- Agent runs in isolated context
- Main context only sees the final result
- No context pollution from intermediate steps
- Fast (1-2 seconds for whole operation)

---

## Migration Guide

### Migrating from v2.0 (Skill-Based) to v3.0

#### Step 1: Audit Current Architecture

Identify what you have:
- [ ] Commands
- [ ] Manager agent(s)
- [ ] Skills
- [ ] Handlers
- [ ] Scripts

#### Step 2: Archive Old Components

Don't delete - archive for reference:

```bash
mkdir -p plugins/{plugin}/archived
mv plugins/{plugin}/skills plugins/{plugin}/archived/
mv plugins/{plugin}/scripts plugins/{plugin}/archived/
mv plugins/{plugin}/handlers plugins/{plugin}/archived/
```

Create `plugins/{plugin}/archived/README.md` explaining what was archived and why.

#### Step 3: Ensure MCP Tools Exist

For each operation, verify MCP tool exists in `mcp/server/src/handlers/{plugin}.ts`.

If not, create it:
1. Design SDK method first
2. Implement SDK method
3. Wrap in MCP tool
4. Test MCP tool

#### Step 4: Create Dedicated Agents

For each command, create a dedicated agent:

**Template:**
```markdown
# {operation-name} Agent

[Description of what this agent does]

**Use this agent when:**
- [Trigger pattern 1]
- [Trigger pattern 2]
- [Trigger pattern 3]

**Examples:**
- "[Example user request 1]"
- "[Example user request 2]"
- "[Example user request 3]"

## Workflow

<WORKFLOW>
1. Extract arguments from command or natural language

2. [Conditional logic]:

   If [condition A]:
     - Call: fractary_{plugin}_{tool_1}
     - Process result
     - Call: fractary_{plugin}_{tool_2}

   If [condition B]:
     - Call: fractary_{plugin}_{tool_3}

3. Handle errors and return result
</WORKFLOW>
```

**Migration checklist per agent:**
- [ ] Identify what the old skill did
- [ ] List all MCP tools needed
- [ ] Write conditional logic for different paths
- [ ] Add specific auto-trigger examples
- [ ] Test auto-triggering
- [ ] Test command invocation

#### Step 5: Simplify Commands

Replace complex commands with ultra-lightweight versions:

**Before (v2.0):**
```markdown
# /repo:branch-create

[100+ lines of argument parsing, validation, workflow logic, error handling, etc.]
```

**After (v3.0):**
```markdown
# /repo:branch-create

Create a Git branch from work items, descriptions, or direct names.

Invokes the branch-create agent to handle branch creation.
```

#### Step 6: Remove Manager Agent

If you have a manager agent that routes to skills:
1. Delete it
2. Each command now invokes its dedicated agent directly
3. No routing needed

#### Step 7: Update Documentation

- [ ] Update plugin README.md
- [ ] Document new architecture
- [ ] Update command documentation
- [ ] Add examples of auto-triggering

#### Step 8: Test

**Test each operation:**
1. **Command invocation:** `/plugin:command args`
2. **Auto-trigger:** Natural language request in main context
3. **Error handling:** Invalid inputs, MCP failures
4. **Edge cases:** Empty inputs, special characters, etc.

**Integration tests:**
1. Common workflows end-to-end
2. Cross-plugin operations
3. Platform-specific scenarios (GitHub, GitLab, etc.)

#### Step 9: Commit and Document

Commit in logical chunks:
1. Archive old components
2. Create MCP tools (if new)
3. Create dedicated agents (batch by similarity)
4. Simplify commands (batch by similarity)
5. Remove manager agent
6. Update documentation

Use conventional commits:
```bash
git commit -m "chore(plugin): archive skills and scripts (v3.0 migration)"
git commit -m "feat(plugin): add MCP tools for operations"
git commit -m "refactor(plugin): create dedicated agents (v3.0)"
git commit -m "refactor(plugin): simplify commands to invoke agents"
git commit -m "refactor(plugin): remove manager agent (routing obsolete)"
git commit -m "docs(plugin): update for v3.0 architecture"
```

---

## Best Practices

### 1. Agent Design

**DO:**
- ✅ Write specific, detailed descriptions with examples
- ✅ Include common trigger phrases users might say
- ✅ Use clear, deterministic conditional logic
- ✅ Call MCP tools for all data operations
- ✅ Handle errors gracefully with helpful messages
- ✅ Keep agents focused on one operation
- ✅ Return structured, user-friendly results

**DON'T:**
- ❌ Create manager agents that route to other components
- ❌ Put business logic in agents (that's SDK's job)
- ❌ Use vague descriptions like "handles repo operations"
- ❌ Make routing decisions ("which skill should I use?")
- ❌ Pollute main context with verbose output
- ❌ Handle platform differences (SDK does this)

### 2. MCP Tool Design

**DO:**
- ✅ Make tools focused and atomic
- ✅ Use clear, descriptive names: `fractary_plugin_operation`
- ✅ Validate inputs thoroughly
- ✅ Return structured JSON
- ✅ Provide helpful error messages
- ✅ Keep tools thin (wrapper around SDK)
- ✅ Document parameters clearly

**DON'T:**
- ❌ Put business logic in MCP tools
- ❌ Make tools do too much (one responsibility)
- ❌ Return unstructured text (use JSON)
- ❌ Expose internal errors to users
- ❌ Duplicate SDK code in tools

### 3. SDK Design

**DO:**
- ✅ Put all business logic here
- ✅ Abstract platform differences
- ✅ Provide typed interfaces
- ✅ Write comprehensive tests
- ✅ Document public APIs
- ✅ Handle edge cases
- ✅ Validate inputs

**DON'T:**
- ❌ Leak platform-specific details
- ❌ Assume a single platform
- ❌ Skip error handling
- ❌ Use unclear variable/method names
- ❌ Write untested code

### 4. Command Design

**DO:**
- ✅ Keep commands ultra-lightweight (8-18 lines)
- ✅ Use `allowed-tools: Task` to enforce delegation (CRITICAL)
- ✅ Show explicit Task tool invocation pattern
- ✅ Use clear, intuitive command names
- ✅ Document what the command does (briefly)
- ✅ Only mention configuration if agent has CHOICES
- ✅ For hybrid pattern: `allowed-tools: Skill(specific-skill), Task`

**DON'T:**
- ❌ Put any logic in commands
- ❌ Parse arguments in commands
- ❌ Validate inputs in commands
- ❌ Call MCP tools from commands
- ❌ Include workflows in commands
- ❌ Restate what the agent will do (agent knows its job)
- ❌ Add redundant skill references (if agent always uses them)

**Tool Restriction Examples (Parameter-Based Syntax):**
```yaml
# Standard delegation - any agent
allowed-tools: Task

# Restrict to specific agent only
allowed-tools: Task(fractary-repo:commit)

# Restrict to namespace (all agents in fractary-repo)
allowed-tools: Task(fractary-repo:*)

# Hybrid with specific skill + any agent
allowed-tools: Skill(fractary-pr-context-preparer), Task

# Hybrid with specific skill + specific agent
allowed-tools: Skill(fractary-pr-context-preparer), Task(fractary-repo:pr-create)

# Hybrid with namespace restrictions on both
allowed-tools: Skill(fractary-repo:*), Task(fractary-repo:*)

# Multiple bash commands only (example from official docs)
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
```

**Syntax Pattern:** `ToolName(parameter:value)` where parameter is the specific skill/agent/command to allow, and `*` is a wildcard.

### 5. Context Efficiency

**DO:**
- ✅ Use agents for isolation (keeps main context clean)
- ✅ Return concise results to main context
- ✅ Load only what's needed in each layer
- ✅ Use MCP tools (no context cost)

**DON'T:**
- ❌ Run operations in main context that could be isolated
- ❌ Return verbose MCP tool output to main context
- ❌ Load unnecessary files or data
- ❌ Create skills with conditional loading (obsolete pattern)

### 6. Auto-Triggering

**DO:**
- ✅ Write specific agent descriptions
- ✅ Include multiple trigger phrase examples
- ✅ Test auto-triggering with natural language
- ✅ Document common user requests
- ✅ Use action-oriented descriptions

**DON'T:**
- ❌ Write vague descriptions
- ❌ Assume users will use commands
- ❌ Skip testing auto-trigger scenarios
- ❌ Use technical jargon in descriptions

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Manager Agent with Routing

**What it looks like:**
```markdown
# plugin-manager Agent

Routes plugin operations to appropriate skills.

<WORKFLOW>
If operation === "branch-create":
  Invoke branch-create skill
If operation === "commit":
  Invoke commit skill
...
</WORKFLOW>
```

**Why it's bad:**
- Routing decision is unreliable ("which skill?")
- Generic description makes auto-triggering poor
- Single point of failure
- Large, complex agent file

**What to do instead:**
Create dedicated agents. Each command invokes its specific agent.

### ❌ Anti-Pattern 2: Skills for Orchestration

**What it looks like:**
```markdown
# branch-create Skill

Orchestrates branch creation using MCP tools.

<WORKFLOW>
1. Call MCP tool A
2. Call MCP tool B
3. Call MCP tool C
</WORKFLOW>
```

**Why it's bad:**
- Unnecessary layer (agent can call MCP directly)
- More files to maintain
- No context efficiency benefit with MCP
- Routing decision needed ("which skill?")

**What to do instead:**
Put orchestration logic in the dedicated agent.

### ❌ Anti-Pattern 3: Handlers for Platform Differences

**What it looks like:**
```
Skill → Handler-GitHub → GitHub-specific logic
Skill → Handler-GitLab → GitLab-specific logic
```

**Why it's bad:**
- Platform logic should be in SDK
- Creates maintenance burden
- Harder to test
- Not reusable outside plugin

**What to do instead:**
Put platform abstraction in SDK. Agent calls SDK, SDK handles platform.

### ❌ Anti-Pattern 4: Scripts Instead of SDK

**What it looks like:**
```bash
# scripts/create-branch.sh
#!/bin/bash
git checkout -b "$1"
```

**Why it's bad:**
- Not cross-platform
- Not testable
- Not reusable
- Error handling is harder
- Can't use in non-Bash contexts

**What to do instead:**
Implement in SDK, expose via MCP tool.

### ❌ Anti-Pattern 5: Business Logic in Agents

**What it looks like:**
```markdown
# Agent workflow
1. Extract work item ID
2. Parse work item type (bug, feature, chore)
3. Generate branch prefix based on type
4. Validate branch name against conventions
5. Check if branch already exists
6. Create branch with git checkout
```

**Why it's bad:**
- Agent has too much logic
- Logic not reusable
- Hard to test
- Harder to maintain

**What to do instead:**
Put logic in SDK. Agent just orchestrates MCP calls.

### ❌ Anti-Pattern 6: Complex Commands

**What it looks like:**
```markdown
# /plugin:command

[100+ lines of parsing, validation, workflow, error handling]

<WORKFLOW>
1. Parse these arguments...
2. Validate these rules...
3. Call this skill...
4. Handle these errors...
</WORKFLOW>
```

**Why it's bad:**
- Commands should be lightweight
- Logic belongs in agent
- Hard to maintain
- Not reusable

**What to do instead:**
```markdown
# /plugin:command

Brief description.

Invokes the {command} agent.
```

### ❌ Anti-Pattern 7: CLI as First Choice

**What it looks like:**
```markdown
# Agent workflow
1. Execute: git status --porcelain
2. Parse output
3. Execute: git add .
4. Execute: git commit -m "message"
5. Execute: git push origin branch
```

**Why it's bad:**
- CLI should be last resort
- MCP tools are faster and more reliable
- Output parsing is fragile
- Not cross-platform

**What to do instead:**
```markdown
# Agent workflow
1. Call: fractary_repo_status
2. Call: fractary_repo_commit
3. Call: fractary_repo_push
```

---

## Examples

### Example 1: Simple Deterministic Operation

**Operation:** List Git branches

**SDK:**
```typescript
class RepoManager {
  async listBranches(options?: {
    stale?: boolean;
    merged?: boolean;
    pattern?: string;
  }): Promise<Branch[]> {
    // Implementation
  }
}
```

**MCP Tool:**
```typescript
server.tool({
  name: "fractary_repo_branch_list",
  description: "List Git branches with optional filters",
  parameters: {
    type: "object",
    properties: {
      stale: { type: "boolean", description: "Show only stale branches" },
      merged: { type: "boolean", description: "Show only merged branches" },
      pattern: { type: "string", description: "Filter by pattern (glob)" }
    }
  }
}, async ({ stale, merged, pattern }) => {
  const manager = new RepoManager();
  const branches = await manager.listBranches({ stale, merged, pattern });

  return {
    content: [{
      type: "text",
      text: JSON.stringify(branches, null, 2)
    }]
  };
});
```

**Agent:**
```markdown
# branch-list Agent

List Git branches with optional filtering.

**Use this agent when:**
- User wants to see Git branches
- User asks "what branches exist?"
- User needs to find a specific branch

**Examples:**
- "Show me all branches"
- "List stale branches"
- "Find branches matching 'feature/*'"

## Workflow

<WORKFLOW>
1. Extract filter criteria:
   - stale (boolean)
   - merged (boolean)
   - pattern (string)

2. Call: fractary_repo_branch_list with filters

3. Format results:
   - List branch names
   - Show status (active/stale, merged/unmerged)
   - Highlight current branch

4. Return formatted list
</WORKFLOW>
```

**Command:**
```markdown
# /repo:branch-list

List Git branches with optional filters.

Invokes the branch-list agent.
```

### Example 2: Complex Orchestration Operation

**Operation:** Create branch from work item

**SDK:**
```typescript
class RepoManager {
  async createBranch(options: {
    name: string;
    base?: string;
  }): Promise<BranchResult> { /* ... */ }

  async generateBranchName(options: {
    workItemId?: string;
    description?: string;
    type?: string;
  }): Promise<string> { /* ... */ }
}

class WorkManager {
  async fetchIssue(id: string): Promise<Issue> { /* ... */ }
}
```

**MCP Tools:**
```typescript
// In work handler
server.tool({
  name: "fractary_work_issue_fetch",
  description: "Fetch issue/ticket details",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", description: "Issue ID" }
    },
    required: ["id"]
  }
}, async ({ id }) => {
  const manager = new WorkManager();
  const issue = await manager.fetchIssue(id);
  return {
    content: [{ type: "text", text: JSON.stringify(issue, null, 2) }]
  };
});

// In repo handler
server.tool({
  name: "fractary_repo_branch_name_generate",
  description: "Generate semantic branch name",
  parameters: {
    type: "object",
    properties: {
      work_item_id: { type: "string" },
      description: { type: "string" },
      type: { type: "string", enum: ["feature", "bugfix", "hotfix", "chore"] }
    }
  }
}, async ({ work_item_id, description, type }) => {
  const manager = new RepoManager();
  const name = await manager.generateBranchName({
    workItemId: work_item_id,
    description,
    type
  });
  return {
    content: [{ type: "text", text: name }]
  };
});

server.tool({
  name: "fractary_repo_branch_create",
  description: "Create a new Git branch",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Branch name" },
      base: { type: "string", description: "Base branch" }
    },
    required: ["name"]
  }
}, async ({ name, base }) => {
  const manager = new RepoManager();
  const result = await manager.createBranch({ name, base });
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
  };
});
```

**Agent:**
```markdown
# branch-create Agent

Create Git branches from work items, descriptions, or direct names.

**Use this agent when:**
- User wants to create a new Git branch
- User mentions "create branch", "new branch", "make a branch"
- User references a work item and wants a branch for it

**Examples:**
- "Create a branch for issue 123"
- "Make a feature branch called dark-mode"
- "Create a branch for the authentication work"
- "New branch from ticket ABC-456"

## Workflow

<WORKFLOW>
1. Extract arguments:
   - work_item_id (issue/ticket number)
   - name (direct branch name)
   - description (for semantic name generation)
   - base (base branch, default: main)
   - type (feature/bugfix/hotfix/chore)

2. Determine creation path:

   **Path A: From Work Item**
   If work_item_id provided:
     1. Call: fractary_work_issue_fetch(work_item_id)
        → Get issue details (title, type, labels)
     2. Call: fractary_repo_branch_name_generate(work_item_id, issue.title, issue.type)
        → Generate semantic name (e.g., "feature/123-add-dark-mode")
     3. Call: fractary_repo_branch_create(name, base)
        → Create branch

   **Path B: From Description**
   If description provided (no work_item_id):
     1. Call: fractary_repo_branch_name_generate(description, type)
        → Generate semantic name (e.g., "feature/add-dark-mode")
     2. Call: fractary_repo_branch_create(name, base)
        → Create branch

   **Path C: Direct Name**
   If name provided directly:
     1. Call: fractary_repo_branch_create(name, base)
        → Create branch with exact name

3. Handle errors:
   - If work item not found: "Issue {id} not found. Please check the ID."
   - If branch exists: "Branch '{name}' already exists. Use a different name."
   - If git error: "Failed to create branch: {error}"

4. Return result:
   "✅ Created branch '{name}' from '{base}'"

   Include:
   - Branch name
   - Base branch
   - Next steps (e.g., "Switch to it with: git checkout {name}")
</WORKFLOW>
```

**Command:**
```markdown
# /repo:branch-create

Create a Git branch from work items, descriptions, or direct names.

Invokes the branch-create agent to handle branch creation.
```

### Example 3: Reasoning Operation

**Operation:** Generate commit message from changes

**SDK:**
```typescript
class RepoManager {
  async getStatus(): Promise<Status> { /* ... */ }
  async getDiff(staged: boolean): Promise<string> { /* ... */ }
}
```

**MCP Tools:**
```typescript
server.tool({
  name: "fractary_repo_status",
  description: "Get Git repository status",
  parameters: { type: "object", properties: {} }
}, async () => {
  const manager = new RepoManager();
  const status = await manager.getStatus();
  return {
    content: [{ type: "text", text: JSON.stringify(status, null, 2) }]
  };
});

server.tool({
  name: "fractary_repo_diff",
  description: "Get Git diff",
  parameters: {
    type: "object",
    properties: {
      staged: { type: "boolean", description: "Show staged changes only" }
    }
  }
}, async ({ staged = true }) => {
  const manager = new RepoManager();
  const diff = await manager.getDiff(staged);
  return {
    content: [{ type: "text", text: diff }]
  };
});
```

**Agent:**
```markdown
# commit-message-generate Agent

Analyze staged changes and generate semantic commit messages following conventional commit format.

**Use this agent when:**
- User wants to commit but hasn't written a message
- User asks "generate a commit message"
- User invokes /repo:commit without a message

**Examples:**
- "Generate a commit message for my changes"
- "What should my commit message be?"
- "Create a commit with an appropriate message"

## Workflow

<WORKFLOW>
1. Fetch current changes:
   - Call: fractary_repo_status
     → Get list of changed files
   - Call: fractary_repo_diff(staged: true)
     → Get actual code changes

2. Analyze changes (AI reasoning):
   - Examine which files changed
   - Review the actual code diff
   - Identify patterns:
     - New files → "feat" or "chore"
     - Bug fixes → "fix"
     - Documentation → "docs"
     - Tests → "test"
     - Refactoring → "refactor"
   - Determine scope (which part of codebase)
   - Assess if breaking change

3. Generate commit message:
   Format: <type>(<scope>): <description>

   Example:
   ```
   feat(auth): add password reset functionality

   - Add reset password endpoint
   - Implement email token verification
   - Add rate limiting for reset requests
   ```

   Guidelines:
   - Type: feat, fix, docs, style, refactor, test, chore
   - Scope: part of codebase affected
   - Description: imperative mood, lowercase, no period
   - Body: bullet points for multiple changes

4. Return commit message:
   - Formatted according to conventional commits
   - Explains the "why" not just the "what"
   - Includes relevant context
   - Suggests whether to include breaking change marker
</WORKFLOW>

## Notes

This agent does NOT create the commit - it only generates the message.
The user or another agent will use this message with fractary_repo_commit.
```

**Command:**
```markdown
# /repo:commit-message-generate

Generate a semantic commit message from staged changes.

Invokes the commit-message-generate agent to analyze changes and create an appropriate message.
```

---

## FAQ

### Q: When should I use an agent vs direct MCP call?

**A:** Always use an agent from commands. Agents provide:
- Isolated context (no main pollution)
- Auto-trigger capability
- Error handling
- User-friendly output

Even if the agent just calls one MCP tool, wrap it in an agent for consistency and future extensibility.

### Q: Can agents call other agents?

**A:** Yes! Agents can invoke other agents using the Task tool. This is useful for:
- Reusing complex reasoning (e.g., commit-message-generate agent)
- Breaking down large operations
- Sharing functionality

Example:
```markdown
# pr-create Agent workflow

1. Call commit-message-generate agent
2. Use generated message for PR title/body
3. Call fractary_repo_pr_create
```

### Q: Should I ever create skills?

**A:** Yes, but for **expertise** not execution!

**Create expertise skills for:**
- ✅ Organizational standards (commit format, PR template)
- ✅ Best practices (code review checklist, security guidelines)
- ✅ Templates (documentation format, API design)
- ✅ Brand voice (user-facing text tone)
- ✅ Domain knowledge (architecture patterns)

**Don't create skills for:**
- ❌ Orchestration (use agents)
- ❌ Data operations (use MCP tools)
- ❌ Business logic (use SDK)
- ❌ Platform abstraction (use SDK)

**Pattern:** Agents read expertise skills to learn standards, then execute operations following those standards.

**Example:** `commit` agent reads `fractary-commit-format` skill to learn conventional commit format, then creates commits following that standard.

### Q: What if MCP doesn't support my operation?

**A:** Follow the preference order:

1. **Can it be added to MCP?** → Add it to MCP server
2. **Does it require local file access?** → Use SDK via Python script
3. **Is it a one-off CLI call?** → Use Bash tool (document as temporary)

Always prefer MCP. Fallbacks are temporary until MCP support is added.

### Q: How do I handle platform differences (GitHub/GitLab/Bitbucket)?

**A:** In the SDK! Not in agents, not in MCP tools.

```typescript
// SDK handles platform detection
class RepoManager {
  async createPR(options: PROptions): Promise<PR> {
    if (this.platform === 'github') {
      return this.createGitHubPR(options);
    } else if (this.platform === 'gitlab') {
      return this.createGitLabMR(options);
    }
    // etc.
  }
}
```

The agent just calls one MCP tool, the SDK figures out the platform.

### Q: How do I test agents?

**A:**

1. **Auto-trigger tests:** Try natural language requests
   ```
   User: "Create a branch for issue 123"
   Expected: Agent auto-triggers and creates branch
   ```

2. **Command tests:** Invoke via command
   ```
   User: /repo:branch-create --work-id 123
   Expected: Agent executes successfully
   ```

3. **Error handling tests:** Invalid inputs
   ```
   User: /repo:branch-create --work-id 999999
   Expected: Graceful error message
   ```

4. **Integration tests:** Full workflows
   ```
   User: "Create a branch for issue 123, commit my changes, and create a PR"
   Expected: Multiple agents coordinate successfully
   ```

### Q: Should agents have a claude.md file?

**A:** No, skip it. Be deliberate about what context each agent needs.

Instead of loading a generic claude.md for all agents:
- Keep agents self-contained (everything in the agent .md file)
- Pass specific context via the prompt parameter
- Use a "prime command" if you need to load project-specific context

### Q: How do I use parameter-based tool restrictions?

**A:** Use the syntax `ToolName(parameter:value)` to restrict which specific tools can be invoked.

**Syntax:**
```yaml
allowed-tools: ToolName(parameter:value)
```

Where:
- `ToolName` is Task, Skill, Bash, etc.
- `parameter` is the specific skill/agent/command name
- `:` separates parameter from value
- `*` is a wildcard for "any" within that scope
- Multiple tools separated by commas

**Examples:**

**Restrict to specific agent:**
```yaml
allowed-tools: Task(fractary-repo:commit)
# Can only invoke fractary-repo:commit agent
```

**Restrict to namespace:**
```yaml
allowed-tools: Task(fractary-repo:*)
# Can invoke any agent in fractary-repo namespace
```

**Hybrid with restrictions:**
```yaml
allowed-tools: Skill(fractary-pr-context-preparer), Task(fractary-repo:pr-create)
# Can only use that specific skill and that specific agent
```

**Restrict bash commands (from official docs):**
```yaml
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
# Can only run these specific git commands
```

**Benefits:**
- ✅ Exact control over permitted operations
- ✅ Clear audit trail
- ✅ Security against unintended invocations
- ✅ Namespace isolation
- ✅ Self-documenting permissions

**Best Practice:** Use the most restrictive permission that still allows the command to function. Start with specific restrictions, only broaden with wildcards if needed.

### Q: When should I use the Hybrid Preparation Pattern?

**A:** When conversation context significantly improves the output.

**Use agent-only delegation (most common):**
```
Command (allowed-tools: Task)
  → Agent generates from git/API data
```

**Use for:** Most operations where git history, API data, or user parameters are sufficient.

**Use hybrid pattern (advanced):**
```
Command (allowed-tools: Skill, Task)
  → Preparation Skill (reads conversation)
  → Execution Agent (receives prepared context)
```

**Use for:**
- PR descriptions that should reference conversation discussion
- Commit messages incorporating conversation decisions
- Issue descriptions drawing from brainstorming
- Any output improved by full conversation history

**Decision criteria:**
- **Agent only**: Main agent only needs OUTPUT/result
- **Hybrid**: Main agent benefits from observing PROCESS of preparation

**Trade-offs:**
- Hybrid uses more context (skill runs in main)
- But provides better results when conversation matters
- Only use when the benefit justifies the cost

### Q: How long should agent descriptions be?

**A:** As long as needed to make auto-triggering reliable!

Agent descriptions can be much longer than skill descriptions. Include:
- Detailed explanation of what it does
- Multiple trigger phrases
- Concrete examples of user requests
- Common variations

Example:
```markdown
# branch-create Agent

Create Git branches from work items, descriptions, or direct names.

This agent handles all branch creation scenarios:
- Creating from work item IDs (issues, tickets)
- Generating semantic names from descriptions
- Creating with direct branch names
- Optionally creating worktrees

**Use this agent when:**
- User wants to create a new Git branch
- User mentions "create branch", "new branch", "make a branch"
- User references a work item and wants a branch for it
- User wants a worktree for parallel development

**Examples:**
- "Create a branch for issue 123"
- "Make a feature branch called dark-mode"
- "Create a branch for the authentication work"
- "New branch from ticket ABC-456"
- "Create a branch with worktree for issue 789"
```

This helps Claude Code match user requests to the right agent.

### Q: What about backward compatibility?

**A:** v3.0 is a breaking change architecture. Don't maintain backward compatibility.

Instead:
- Archive old components (for reference)
- Migrate all at once (single release)
- Update documentation
- Provide migration guide for users

Trying to support both architectures creates complexity that defeats the purpose.

### Q: How do I organize files?

**A:** Recommended structure:

```
plugins/{plugin}/
├── commands/
│   ├── command-1.md
│   ├── command-2.md
│   └── ...
├── agents/
│   ├── command-1.md (same name as command)
│   ├── command-2.md
│   └── ...
├── archived/ (v2.0 components)
│   ├── README.md (explains what and why)
│   ├── skills/
│   ├── scripts/
│   └── handlers/
├── config/
├── docs/
└── README.md

mcp/server/src/handlers/
├── plugin-1.ts (all MCP tools for plugin-1)
├── plugin-2.ts (all MCP tools for plugin-2)
└── ...

sdk/{language}/src/
├── plugin-1/
│   ├── manager.ts (main SDK class)
│   ├── types.ts
│   └── utils.ts
├── plugin-2/
│   └── ...
└── ...
```

### Q: Can I use this architecture for non-plugin code?

**A:** Yes! This architecture works for any Claude Code project:

- Replace "command" with your entry point
- Create dedicated agents for each operation
- Use MCP tools for deterministic operations
- Put business logic in reusable SDK/library code
- Use CLI only as last resort

The principles apply broadly:
- Isolated context via agents
- MCP-first design
- Ultra-lightweight entry points
- Focused, auto-triggerable agents

---

## Conclusion

The v3.0 architecture prioritizes:

1. **Simplicity** - Fewer layers, less complexity
2. **Performance** - MCP tools are fast and free
3. **Reliability** - No routing decisions, deterministic flow
4. **Maintainability** - Small, focused files
5. **User Experience** - Auto-triggering, isolated context
6. **Cost Efficiency** - Minimal LLM invocations

By following this framework, you'll create Claude Code plugins that are:
- Fast (1-2 seconds vs 8-15 seconds)
- Cheap (~$0.001 vs ~$0.018 per operation)
- Reliable (no routing decisions)
- Maintainable (85% less code)
- User-friendly (auto-triggering, clean output)

**Start with MCP, use dedicated agents, keep it simple.**

---

## Additional Resources

- [MCP Server Development Guide](../mcp/README.md)
- [SDK Development Guide](../../sdk/README.md)
- [Plugin Development Guide](../plugins/README.md)
- [Architecture Decision Records](../architecture/)
- [Migration Examples](../examples/v3-migrations/)

---

**Questions or feedback?** Open an issue in the repository or consult the team.

**Ready to migrate?** Follow the [Migration Guide](#migration-guide) section above.

**Building something new?** Start with the [Component Design](#component-design) section.

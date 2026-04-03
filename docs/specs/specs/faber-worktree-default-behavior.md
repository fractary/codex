---
id: SPEC-0031
title: "FABER Worktree Default Behavior — Config-Driven, Off by Default"
status: proposed
type: bug-fix
project: fractary/faber
created: 2026-03-28
author: corthos-team
priority: medium
---

# SPEC-0031: FABER Worktree Default Behavior — Config-Driven, Off by Default

## Problem

When a FABER workflow is run via `/fractary-faber-workflow-run`, the `workflow-plan` CLI is invoked during auto-planning and **creates a git worktree unconditionally by default**. This behavior:

1. Surprises users who did not ask for a worktree (no `--worktree` flag passed to `workflow-run`)
2. Contradicts the `WorktreeConfig.enabled` type definition (comment says default is `false`, but the code never reads `enabled` at all)
3. Is inconsistent with the Claude CLI convention, where `--worktree` must be explicitly requested
4. Creates an execution environment mismatch: the plan lives in the worktree, but workflow steps may run against the main project directory, causing file placement bugs (as seen in WORK-422 where build files were written to the main CWD instead of the worktree)

### Root Cause

There are three separate gaps, each in a different file of `fractary/faber`:

#### Gap 1 — CLI default is wrong
**File:** `cli/src/commands/plan/index.ts`

The `--no-worktree` flag exists, but worktrees are created **unless** the flag is passed. The default should be inverted: do not create a worktree unless `--worktree` is explicitly passed (or config says to).

```typescript
// Current — worktree created unless opt-out flag present
if (!options.noWorktree) {
  // creates worktree
}

// Desired — worktree created only when opt-in flag (or config) present
if (options.worktree || configSaysWorktree) {
  // creates worktree
}
```

#### Gap 2 — `worktree.enabled` config field is defined but never read
**File:** `cli/src/types/config.ts` (lines 40-44) and `cli/src/lib/config.ts`

```typescript
export interface WorktreeConfig {
  enabled?: boolean;  // comment says "Default false" — but nothing reads this field
  location?: string;
  inherit_from_claude?: boolean;
}
```

`enabled` is declared and documented but the config loader and plan command never check it before creating a worktree.

#### Gap 3 — Planner agent never passes `--no-worktree` (or `--worktree`)
**File:** `plugins/faber/agents/workflow-planner.md` (lines 92-103, Step 2)

The Step 2 command template always builds:
```bash
fractary-faber workflow-plan {work_id} --skip-confirm --json
```
It conditionally appends `--workflow`, `--autonomy`, and `--force-new` but has no logic to pass `--worktree` based on the project config or the parent `workflow-run` invocation flags.

---

## Proposed Fix

### Principle
Align FABER with the Claude CLI convention: **no worktree by default, opt-in explicitly**.

The `worktree.enabled` config field should be the authoritative setting. The `--worktree` CLI flag and `workflow-run` `--worktree` flag should override it for one-off use.

---

### Change 1 — Invert the CLI default (`cli/src/commands/plan/index.ts`)

**Replace** the `--no-worktree` opt-out flag with a `--worktree` opt-in flag:

```typescript
// Remove:
.option('--no-worktree', 'Skip worktree creation')

// Add:
.option('--worktree', 'Create a git worktree for this workflow (overrides config)')
```

Update `PlanOptions` interface:
```typescript
// Remove:
noWorktree?: boolean;

// Add:
worktree?: boolean;
```

Update all three conditional checks that gate worktree creation. They currently read `!options.noWorktree`; replace with a helper that evaluates the opt-in:

```typescript
// New helper (add near top of planSingleIssue or in a utils module):
function shouldCreateWorktree(options: PlanOptions, config: LoadedFaberConfig): boolean {
  // Explicit CLI flag always wins
  if (options.worktree === true) return true;
  // Config setting is the default authority
  if (config.worktree?.enabled === true) return true;
  // Default: no worktree
  return false;
}
```

Replace the three `if (!options.noWorktree)` guards (lines ~453, ~497, ~541) with:

```typescript
const createWorktree = shouldCreateWorktree(options, config);

// line ~453:
if (createWorktree) { /* create worktree */ }

// line ~497:
if (!options.forceNew && createWorktree) { /* check existing plan in worktree */ }

// line ~541:
if (createWorktree) { /* write plan to worktree */ }
```

The `config` object must be threaded into `planSingleIssue`. It is already loaded in `executePlanCommand`; pass it as a parameter.

**Note on `PlanResult.worktree`:** When no worktree is created, `worktree` in the JSON output should be `""` (empty string) or the project root path, so callers can still use it as the base path for plan file reads.

---

### Change 2 — Wire `worktree.enabled` config into the plan command (`cli/src/commands/plan/index.ts` + `cli/src/lib/config.ts`)

No changes needed to the config loader itself — `faberConfig.worktree` is already passed through at `lib/config.ts:109`. The config is already loaded in `executePlanCommand` and available. The only missing piece is that `planSingleIssue` doesn't receive it; add it as a parameter and use `shouldCreateWorktree` (from Change 1) to gate creation.

---

### Change 3 — Planner agent reads config and conditionally passes `--worktree` (`plugins/faber/agents/workflow-planner.md`)

Update **Step 2: Build CLI Command** to:

1. Read the project config before building the command
2. Pass `--worktree` only when config or invoking flags indicate it

**Replace** the current Step 2 block:

```markdown
## Step 2: Build CLI Command

Construct the `fractary-faber workflow-plan` CLI command with all relevant flags:

```bash
fractary-faber workflow-plan {work_id} --skip-confirm --json
```

Add optional flags based on parsed input:
- If `workflow_override`: append `--workflow {workflow_override}`
- If `autonomy_override`: append `--autonomy {autonomy_override}`
- If `force_new`: append `--force-new`
```

**With:**

```markdown
## Step 2: Build CLI Command

Before building the command, read the project config to determine whether to create a worktree:

```bash
fractary-core config show --json 2>/dev/null | python3 -c "
import sys, json
c = json.load(sys.stdin)
enabled = c.get('faber', {}).get('worktree', {}).get('enabled', False)
print('true' if enabled else 'false')
" 2>/dev/null || echo 'false'
```

Store the result as `config_worktree_enabled` (true/false string).

Construct the base command:
```bash
fractary-faber workflow-plan {work_id} --skip-confirm --json
```

Add optional flags based on parsed input AND config:
- If `workflow_override`: append `--workflow {workflow_override}`
- If `autonomy_override`: append `--autonomy {autonomy_override}`
- If `force_new`: append `--force-new`
- If `worktree_flag` was passed to `workflow-run` OR `config_worktree_enabled` is `true`: append `--worktree`

**Default:** Do NOT append `--worktree` unless one of the above conditions is true.
```

---

### Change 4 — Update `workflow-run` skill to forward `--worktree` flag (`plugins/faber/commands/workflow-run.md`)

The `workflow-run` skill already accepts `--worktree` (line 215) and stores it as `auto_worktree`. This flag currently only affects the conflict-resolution prompt (Step 1.4). It should also be forwarded to the planner agent so the planner can conditionally pass `--worktree` to the CLI.

In the section that spawns the planner agent (around line 707), include `auto_worktree` in the prompt:

```javascript
// Current:
const plannerPrompt = `${work_id} --skip-confirm --json${workflow_override ? ` --workflow ${workflow_override}` : ''}${autonomy_override ? ` --autonomy ${autonomy_override}` : ''}${force_new ? ' --force-new' : ''}`;

// Updated:
const plannerPrompt = `${work_id} --skip-confirm --json${workflow_override ? ` --workflow ${workflow_override}` : ''}${autonomy_override ? ` --autonomy ${autonomy_override}` : ''}${force_new ? ' --force-new' : ''}${auto_worktree ? ' --worktree' : ''}`;
```

---

## Impact on Existing Projects

### `config.yaml` for projects that WANT worktrees

Add `enabled: true` under `faber.worktree`:

```yaml
faber:
  worktree:
    enabled: true
    location: .claude/worktrees   # optional, inherits from Claude Code if omitted
```

### Projects that do NOT want worktrees (default)

No change needed. The default behavior after this fix is no worktree, which is what the `WorktreeConfig.enabled` comment always promised.

### Existing installs where `worktree.location` is set but `enabled` is absent

`location` without `enabled` should NOT be interpreted as opt-in. `enabled` is the sole gate. `location` is only used when worktree creation is triggered.

---

## Files to Change (in `fractary/faber`)

| File | Change |
|------|--------|
| `cli/src/commands/plan/index.ts` | Replace `--no-worktree` with `--worktree`; add `shouldCreateWorktree()` helper; thread `config` into `planSingleIssue`; replace 3× `!options.noWorktree` guards |
| `cli/src/types/config.ts` | No type changes needed; add JSDoc clarifying `enabled` is the sole opt-in gate |
| `plugins/faber/agents/workflow-planner.md` | Update Step 2 to read config and conditionally append `--worktree` |
| `plugins/faber/commands/workflow-run.md` | Forward `auto_worktree` flag in planner prompt |

**Do NOT change** `cli/src/lib/config.ts` — the config loader already surfaces `worktree` correctly.

---

## Verification

1. **Default behavior:** Run `/fractary-faber-workflow-run <issue>` on a project with no `faber.worktree` config — no worktree should be created; plan.json should land in the main project's `.fractary/faber/runs/`.

2. **Config opt-in:** Set `faber.worktree.enabled: true` in `config.yaml`, run the same command — worktree should be created as before.

3. **Flag opt-in:** Run `/fractary-faber-workflow-run <issue> --worktree` with no config — worktree should be created.

4. **Flag overrides config:** Set `faber.worktree.enabled: false` explicitly, run with `--worktree` — worktree should still be created (flag wins).

5. **Backward compatibility:** Any project that previously ran without issues (worktrees were being created) must add `faber.worktree.enabled: true` to their `config.yaml` to preserve existing behavior.

---

## Related

- WORK-422 (etl.corthion.ai) — build files written to wrong directory because workflow ran in worktree CWD but engineer agent used main project CWD
- `WorktreeConfig.enabled` comment in `cli/src/types/config.ts:41` — this spec makes the implementation match the documented intent
- Claude CLI `--worktree` flag convention — same opt-in pattern this spec adopts

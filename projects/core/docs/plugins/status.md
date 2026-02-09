# Status Plugin - Claude Code Reference

Claude Code plugin reference for the Status toolset (`fractary-status`). Custom status line showing git status, issue numbers, PR numbers, and last user prompt.

## Overview

The Status plugin provides a custom Claude Code status line that displays real-time repository information including project name, branch, file changes, sync status, issue/PR numbers (with clickable links), and your most recent prompt. It uses a two-hook architecture: a UserPromptSubmit hook to capture prompts and a StatusLine hook to render the display.

## Installation

Add to your Claude Code settings:

```json
{
  "plugins": ["fractary-status"]
}
```

Then run the install command:

```
/fractary-status:install
```

Restart Claude Code to activate.

## Configuration

The plugin creates configuration at `.fractary/config.yaml` and stores runtime cache at `.fractary/status/last-prompt.json`. The StatusLine command is configured in `.claude/settings.json` using an absolute path to the status line script.

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/plugins/marketplaces/fractary/plugins/status/scripts/status-line.sh"
  }
}
```

## Status Line Format

```
[project] branch ±files [↑ahead ↓behind] [#issue | issue-url] [PR#pr | pr-url]
last: prompt...
```

**Display elements:**
- **Project Name** - Repository name in square brackets (cyan)
- **Branch Name** - Current git branch (cyan)
- **File Changes** - Uncommitted file count (±N), yellow if dirty, green if clean
- **Sync Status** - Commits ahead (↑N) in green, behind (↓N) in red
- **Issue Number** - Extracted from branch name (#N) in magenta, clickable
- **PR Number** - Current PR for branch (PR#N) in blue, clickable
- **Last Prompt** - Most recent command/question, truncated to 120 characters

## Slash Commands

### /install

Install the status line plugin in the current project. Delegates to the `fractary-status:status-install` agent.

**Usage:**
```
/fractary-status:install [options]
```

**Options:**
- `--context "<text>"` - Additional instructions for installation

**Example:**
```
/fractary-status:install
```

### /sync

Force refresh the status cache and display current repository status. Delegates to the `fractary-status:status-sync` agent.

**Usage:**
```
/fractary-status:sync [options]
```

**Options:**
- `--context "<text>"` - Additional instructions for sync behavior

**Example:**
```
/fractary-status:sync
```

## Agents

### fractary-status:status-install

Handles the complete installation workflow for the status line plugin, including script execution, verification, and configuration of `.claude/settings.json`.

**Triggered by:**
- `/install` command
- Proactively when user mentions "status line", "install status", or "set up status"

**Capabilities:**
- Executes the installation script
- Creates plugin configuration in `.fractary/status/`
- Configures statusLine in `.claude/settings.json` with absolute path
- Updates `.gitignore` to exclude cache files
- Verifies all files are created correctly

### fractary-status:status-sync

Forces a cache refresh and displays comprehensive repository status. Solves the "one step behind" problem by updating the cache and outputting status text that triggers a statusLine refresh.

**Triggered by:**
- `/sync` command
- Proactively when user mentions "refresh status", "sync status", or reports stale status information

**Capabilities:**
- Executes `update-status-cache.sh` from the repo plugin
- Reads and parses the updated cache
- Displays branch, issue, PR, changes, and ahead/behind counts
- Triggers statusLine refresh via conversation message update

## Usage Examples

### Installing the Status Line

```
User: Set up the status line for this project

Claude: /fractary-status:install

Running installation...
Created: .fractary/status/
Updated: .claude/settings.json (statusLine configured)
Updated: .gitignore

Installation complete. Status line format:
  [project] branch ±files [↑ahead ↓behind] [#issue] [PR#pr]
  last: prompt...

Restart Claude Code to activate the status line.
```

### Refreshing Stale Status

```
User: The status line looks out of date

Claude: /fractary-status:sync

Repository Status Synced
──────────────────────────────────────
Branch: feat/123-feature-name
Issue:  #123
PR:     PR#45

Git Status:
  Modified:  3 files
  Untracked: 1 files
  Ahead:     2 commits
  Behind:    0 commits

Cache:
  Updated:   2025-12-19T12:00:00Z
──────────────────────────────────────
Status line will refresh with next message.
```

### Typical Status Line Output

**Terminal (with OSC 8 clickable links):**
```
[claude-plugins] feat/99-new-feature ±4 ↑2 #99
last: update spec accordingly
```

**Web IDE (with plain URLs):**
```
[claude-plugins] feat/99-new-feature ±4 ↑2 #99 https://github.com/owner/repo/issues/99
last: update spec accordingly
```

## Requirements

- **Git repository** - Must be run inside a git repository
- **fractary-repo plugin** - Uses git status cache from the repo plugin
- **jq** - For JSON processing (usually pre-installed)
- **gh CLI** - Optional, for PR number detection

## Other Interfaces

- **Plugin README:** [Status README](/plugins/status/README.md)
- **Configuration:** [Config Guide](/docs/guides/configuration.md)

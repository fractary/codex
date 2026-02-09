# Core Plugin - Claude Code Reference

Claude Code plugin reference for the Core toolset (`fractary-core`). Unified configuration and environment management for all Fractary plugins.

## Overview

The Core plugin provides slash commands and agents for initializing, updating, validating, and displaying Fractary configuration, as well as switching between environments (test, staging, prod) mid-session. All configuration is stored in `.fractary/config.yaml` and covers the six core plugins: work, repo, logs, file, spec, and docs.

## Installation

Add to your Claude Code settings:

```json
{
  "plugins": ["fractary-core"]
}
```

## Configuration

The plugin manages `.fractary/config.yaml`. A typical configuration includes:

```yaml
work:
  active_handler: github
repo:
  active_handler: github
logs:
  archive_path: .fractary/logs/archive
file:
  active_handler: local
spec:
  archive_path: .fractary/specs/archive
docs: {}
```

Environment-specific credentials are loaded from `.env` files (`.env`, `.env.test`, `.env.prod`, etc.). Tokens and secrets must use `${ENV_VAR}` syntax rather than being stored directly in config.

## Slash Commands

### /config-init

Initialize Fractary Core configuration for all plugins.

**Usage:**
```
/fractary-core:config-init [options]
```

**Options:**
- `--plugins <list>` - Comma-separated plugins to configure (default: all). Options: work, repo, logs, file, spec, docs
- `--work-platform <name>` - Work tracking platform: github, jira, linear (auto-detected)
- `--repo-platform <name>` - Repository platform: github, gitlab, bitbucket (auto-detected)
- `--file-handler <name>` - File storage handler: local, s3 (default: local)
- `--yes` - Skip confirmation prompts
- `--force` - Overwrite existing configuration
- `--dry-run` - Preview changes without applying
- `--context "<text>"` - Additional instructions

**Example:**
```
/fractary-core:config-init --work-platform github --file-handler local
```

### /config-update

Incrementally update existing Fractary Core configuration using natural language descriptions.

**Usage:**
```
/fractary-core:config-update --context "<description>" [options]
```

**Options:**
- `--context "<text>"` (required) - Natural language description of desired changes
- `--plugins <list>` - Comma-separated plugins to modify
- `--dry-run` - Preview changes without applying
- `--yes` - Skip confirmation prompts

**Example:**
```
/fractary-core:config-update --context "switch to jira for work tracking"
```

### /config-validate

Validate the current Fractary Core configuration.

**Usage:**
```
/fractary-core:config-validate [options]
```

**Options:**
- `--verbose` - Show detailed output including redacted config
- `--json` - Output as JSON

**Example:**
```
/fractary-core:config-validate --verbose
```

### /config-show

Display the current Fractary Core configuration with sensitive values automatically redacted.

**Usage:**
```
/fractary-core:config-show [options]
```

**Options:**
- `--json` - Output as JSON

**Example:**
```
/fractary-core:config-show
```

### /env-switch

Switch to a different environment mid-session, loading credentials from the corresponding `.env` file.

**Usage:**
```
/fractary-core:env-switch <environment> [options]
```

**Options:**
- `--clear` - Clear credentials before switching (clean slate)
- `--context "<text>"` - Additional instructions

**Example:**
```
/fractary-core:env-switch test
/fractary-core:env-switch prod --clear
```

### /env-list

List all available environments detected from `.env` files in the project root.

**Usage:**
```
/fractary-core:env-list
```

### /env-show

Show the current environment status and credential availability (values masked).

**Usage:**
```
/fractary-core:env-show
```

## Agents

### fractary-core:config-initializer

Handles fresh setup and force-overwrite of Fractary Core configuration. Auto-detects platforms from git remote, generates configuration via the `fractary-core` CLI, creates supporting directories, and validates the result.

**Triggered by:**
- `/config-init` command
- Proactively when user mentions "setup fractary", "initialize project", or "configure plugins"

**Capabilities:**
- Auto-detects work and repo platforms from git remote
- Generates configuration via `fractary-core config configure` CLI
- Creates required directories (`.fractary/logs`, `.fractary/specs`, etc.)
- Sets up `.gitignore` rules for archive directories
- Validates configuration after creation

### fractary-core:config-updater

Incrementally updates existing `.fractary/config.yaml` based on natural language instructions. Modifies only the sections relevant to the requested change and preserves all unrelated sections.

**Triggered by:**
- `/config-update` command
- Proactively when user mentions "change config", "update config", "switch to jira", or "enable S3"

**Capabilities:**
- Reads and parses existing configuration
- Interprets natural language change descriptions
- Generates change previews (before/after)
- Applies targeted edits to specific config sections
- Validates configuration after updates

### fractary-core:env-switcher

Switches the active environment mid-session by loading credentials from environment-specific `.env` files. Essential for FABR workflows where different phases target different environments.

**Triggered by:**
- `/env-switch` command
- Proactively when user mentions "switch to prod", "use test environment", or "change to staging"

**Capabilities:**
- Lists available environments
- Switches credential context to target environment
- Optionally clears credentials before switching
- Verifies switch was successful

## Usage Examples

### Initial Project Setup

```
User: Set up Fractary for this project

Claude: /fractary-core:config-init

Detecting platforms from git remote...
Platform detected: GitHub (owner/repo)

=== CONFIGURATION COMPLETE ===

Configuration: .fractary/config.yaml
Plugins configured: work (github), repo (github), logs, file (local), spec, docs
Project: owner/repo

Next steps:
1. Review config: /fractary-core:config-show
2. Set credentials in .env file
3. Test: /fractary-work:issue-list
```

### Updating Configuration

```
User: Switch our work tracking to Jira

Claude: /fractary-core:config-update --context "switch to jira for work tracking"

Sections to MODIFY: work
Sections PRESERVED: repo, logs, file, spec, docs

BEFORE:
  work.active_handler: github

AFTER:
  work.active_handler: jira

Configuration updated and validated successfully.
```

### Environment Switching in FABR Workflow

```
User: I'm in the evaluate phase, switch to test

Claude: /fractary-core:env-switch test

Environment switched to: test
Credentials loaded from: .env -> .env.test -> .env.local

Commands will now use test credentials.
To switch back: /fractary-core:env-switch <name>
To view status: /fractary-core:env-show

User: Now release to production

Claude: /fractary-core:env-switch prod --clear

Environment switched to: prod
Credentials loaded from: .env -> .env.prod -> .env.local

Commands will now use prod credentials.
```

## Other Interfaces

- **SDK:** [Core API](/docs/sdk/js/core.md)
- **CLI:** [Core Commands](/docs/cli/core.md)
- **Configuration:** [Config Guide](/docs/guides/configuration.md)

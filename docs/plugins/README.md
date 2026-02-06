# Fractary Codex Plugin

Comprehensive documentation for the Fractary Codex Claude Code plugin - self-managing memory fabric with MCP integration.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Sync Configuration](#sync-configuration)
  - [Directional Sync](#directional-sync)
  - [Organization-Level Defaults](#organization-level-defaults)
- [MCP Integration](#mcp-integration)
- [Permissions](#permissions)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)

## Overview

The codex plugin provides intelligent knowledge retrieval and documentation synchronization across organization projects. It implements a cache-first retrieval architecture with support for multiple sources (GitHub, external URLs, MCP servers) and fine-grained permission control.

### The Problem

AI agents working across multiple projects need:
- **Fast access** to organizational knowledge (docs, standards, specs)
- **Consistent context** across project boundaries
- **Multi-source integration** (internal docs, external APIs, knowledge bases)
- **Permission control** to protect sensitive documentation
- **Offline access** to frequently used content

### The Solution

**Pull-based retrieval with intelligent caching:**

```
Request codex://org/project/docs/api.md
         ↓
  Check local cache (< 100ms)
         ↓ (if expired/missing)
  Fetch from source (< 2s)
         ↓
  Cache locally with TTL
         ↓
  Return content
```

**Key Benefits:**
- **Fast**: < 100ms cache hits, < 2s cache misses
- **Secure**: Frontmatter-based permission control
- **Multi-source**: GitHub, HTTP URLs, MCP servers
- **Dual-mode**: Plugin commands + MCP resources
- **Offline**: Cached content available without network

## Quick Start

### 1. Configure (One-Time Setup)

```bash
/fractary-codex:configure
```

Interactive configuration with auto-detection of organization and codex repository.

Or specify explicitly:

```bash
/fractary-codex:configure --org fractary --codex codex.fractary.com
```

This sets up:
- Configuration at `.fractary/config.yaml` (YAML format, v4.0)
- Cache directory at `.fractary/codex/cache/` (auto-managed)
- MCP server in `.mcp.json`

**Note:** Restart Claude Code after initialization to load the MCP server.

### 2. Sync Documentation

```bash
/fractary-codex:sync
```

Syncs project documentation bidirectionally with the codex repository.

Options:

```bash
/fractary-codex:sync --env test              # Explicit environment
/fractary-codex:sync --env prod --dry-run    # Preview changes
/fractary-codex:sync --to-codex              # One-way to codex
/fractary-codex:sync --from-codex            # One-way from codex
```

### 3. Reference Documentation

After initialization, reference docs via `codex://` URIs:

```
codex://fractary/auth-service/docs/oauth.md
```

The MCP server automatically:
- Checks local cache first (< 100ms)
- Fetches from codex if missing
- Caches locally with 7-day TTL
- Returns content

**No manual cache management needed** - the codex manages itself!

## Commands

### `/fractary-codex:configure`

Initialize or update codex configuration for your project.

```bash
/fractary-codex:configure

# Specify explicitly
/fractary-codex:configure --org fractary --codex codex.fractary.com

# Update existing config with context
/fractary-codex:configure --context "enable auto-sync"
```

### `/fractary-codex:sync`

Sync project documentation with the codex repository.

```bash
/fractary-codex:sync                         # Bidirectional sync
/fractary-codex:sync --to-codex              # One-way to codex
/fractary-codex:sync --from-codex            # One-way from codex
/fractary-codex:sync --dry-run               # Preview changes
/fractary-codex:sync --env test              # Explicit environment
/fractary-codex:sync --work-id 123           # Scope to GitHub issue
```

The following CLI commands are also available via the plugin tools or directly via the CLI (`fractary-codex <command>`):

### `document-fetch`

Fetch a document from codex by URI.

```bash
fractary-codex document-fetch codex://org/project/path

# Force refresh (bypass cache)
fractary-codex document-fetch codex://org/project/path --bypass-cache
```

### `cache-list`

List cached documents with status.

```bash
fractary-codex cache-list
fractary-codex cache-list --json
```

### `cache-clear`

Clear cache entries.

```bash
fractary-codex cache-clear --all             # Clear everything
fractary-codex cache-clear --pattern "**/*.md"
fractary-codex cache-clear --dry-run         # Preview first
```

### `cache-health`

Run comprehensive health checks.

```bash
fractary-codex cache-health
fractary-codex cache-health --json
```

## Sync Configuration

### Directional Sync

Directional sync provides a simple, intuitive way to control what files sync between your project and the codex repository using configuration instead of per-file frontmatter.

#### Configuration

Each project has a `.fractary/config.yaml` file:

```yaml
sync:
  # What I push to codex
  to_codex:
    - "docs/**/*.md"
    - "specs/**/*.md"
    - "CLAUDE.md"
    - "README.md"

  # What I pull from codex (use codex:// URIs)
  from_codex:
    - "codex://{org}/{codex_repo}/docs/**"      # Shared docs from codex repo
    - "codex://{org}/{project}/**"              # Own project files
    - "codex://{org}/other.project/specs/**"    # Other project's specs
```

#### Pattern Format

**to_codex patterns:**
- Relative paths from project root
- Support glob patterns (`**/*.json`, `docs/**`, etc.)
- Examples:
  - `"docs/**/*.md"` - All markdown files in docs/
  - `"schema/**/*"` - Everything in schema/
  - `"README.md"` - Specific file

**from_codex patterns:**
- Format: `codex://org/project/path/pattern`
- Supported placeholders:
  - `{org}` - Organization name (from config)
  - `{project}` - Current project name
  - `{codex_repo}` - Codex repository name (from config)
- Examples:
  - `"codex://{org}/{codex_repo}/docs/**"` - All docs from codex repo
  - `"codex://{org}/{project}/**"` - All my own project files from codex
  - `"codex://fractary/etl.corthion.ai/docs/schema/**/*.json"` - Explicit project reference

#### Example Use Cases

**Share Schemas Between Projects:**

```yaml
# etl.corthion.ai/.fractary/config.yaml
sync:
  to_codex:
    - "docs/schema/**/*.json"
    - "docs/schema/**/*.md"

# lake.corthonomy.ai/.fractary/config.yaml
sync:
  from_codex:
    - "codex://{org}/etl.corthion.ai/docs/schema/**/*.json"
    - "codex://{org}/{project}/**"  # Own files
```

**Share Standards Across All Projects:**

```yaml
# any-project/.fractary/config.yaml
sync:
  from_codex:
    - "codex://{org}/{codex_repo}/docs/**"   # Shared docs
    - "codex://{org}/{project}/**"           # Own files
```

### Organization-Level Defaults

Organization-level defaults allow you to define sync patterns once in the codex repository that apply to all projects in your organization.

#### Priority Order

1. **Project config** (highest priority) - Overrides everything
2. **Org defaults** - Applies when no project config exists
3. **SDK defaults** (lowest priority) - Fallback when neither exist

#### Org Config Format

```yaml
# codex.corthos.ai/.fractary/config.yaml

sync:
  # Default patterns for pushing to codex
  default_to_codex:
    - "README.md"
    - "CLAUDE.md"
    - "docs/**/*.md"
    - "specs/**/*.md"

  # Default patterns for pulling from codex
  default_from_codex:
    - "core.corthodex.ai/docs/standards/**/*.md"
    - "{project}/**"  # Special placeholder
```

#### Special Placeholders

The `{project}` placeholder automatically expands to the current project name:

```yaml
default_from_codex:
  - "{project}/**"  # Placeholder
```

Expands to for `lake.corthonomy.ai`:

```yaml
from_codex:
  - "lake.corthonomy.ai/**"
```

#### How Defaults Work

**Project Without Config:** Uses org defaults automatically.

**Project With Config:** Project config completely replaces org defaults.

**Partial Override:** If a project only configures one direction, org defaults apply to the other.

## MCP Integration

The codex plugin uses the standalone MCP server from `@fractary/codex-mcp-server` npm package.

### Setup

**Automatic (Recommended):**

```bash
/fractary-codex:configure --org fractary --codex codex.fractary.com
```

This automatically:
1. Creates YAML configuration at `.fractary/config.yaml`
2. Sets up cache directory
3. Registers SDK MCP server in `.mcp.json`
4. Detects and migrates legacy custom MCP server (if present)

**Verify:**

```bash
fractary-codex cache-health
```

### Usage

**In conversations:**

```
Explain the OAuth implementation in codex://fractary/auth-service/docs/oauth.md

Compare codex://fractary/shared/standards/api-design.md with React best practices
```

**MCP tools available:**
- `codex_fetch`: Fetch document by URI with on-demand fetching
- `codex_sync_status`: Check cache, config, and MCP status

## Permissions

Documents can declare access control in YAML frontmatter:

```yaml
---
codex_sync_include:
  - auth-service        # Exact project match
  - *-service           # Wildcard suffix
  - shared/team-*       # Directory pattern
  - "*"                 # Public (all projects)
codex_sync_exclude:
  - temp-*              # Exclusion (takes precedence)
  - project-sensitive
---

# Document content...
```

**Permission Rules:**
1. Check exclude list (deny if matched)
2. Check include list (allow if matched)
3. If include = `["*"]` → public access
4. Default: deny if not in include list

**Pattern Matching:**
- `*` - Wildcard matching
- `prefix-*` - Prefix matching
- `*-suffix` - Suffix matching
- Exclusions take precedence over inclusions

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Fractary Codex Architecture              │
├─────────────────────────────────────────────────┤
│                                                  │
│  Access Layer (Dual-Mode)                       │
│  ├─ Plugin Commands  (/fractary-codex:sync)     │
│  └─ MCP Resources    (codex://{project}/{path}) │
│                                                  │
│  Routing Layer                                  │
│  ├─ Reference Parser  (codex:// → components)   │
│  └─ Source Router     (determine handler)       │
│                                                  │
│  Source Handlers                                │
│  ├─ GitHub Handler    (sparse checkout)         │
│  ├─ HTTP Handler      (external URLs)           │
│  └─ MCP Handler       (future: Context7)        │
│                                                  │
│  Permission Layer                               │
│  └─ Frontmatter-based access control            │
│                                                  │
│  Cache Layer (< 100ms)                          │
│  ├─ Local filesystem  (codex/{project}/{path})  │
│  ├─ Cache index       (index.json)             │
│  └─ TTL management    (default: 7 days)         │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Cache Structure

```
.fractary/
├── config.yaml                # Unified configuration (YAML)
└── codex/
    └── cache/                 # Ephemeral cache (gitignored)
        ├── index.json         # Cache metadata index
        └── fractary/          # Organization
            ├── auth-service/
            │   └── docs/
            │       └── oauth.md   # Cached document
            └── shared/
                └── standards/
                    └── api-design.md
```

## Troubleshooting

### Cache Not Working

**Symptom:** Every fetch is slow.

**Check:**

```bash
fractary-codex cache-health
fractary-codex cache-list
ls -la .fractary/codex/cache/index.json
```

**Fix:** Run `/fractary-codex:configure` to set up the cache directory.

### Permission Denied

**Symptom:** "Access denied" errors.

**Check:** Document frontmatter permissions:

```yaml
---
codex_sync_include: ["your-project"]
---
```

**Fix:** Update frontmatter or disable permissions in config.

### MCP Resources Not Appearing

**Symptom:** No resources in Claude panel.

**Check:**

```bash
fractary-codex cache-health
npx -y @fractary/codex-mcp-server --help
```

**Fix:**
1. Run `/fractary-codex:configure` to configure MCP
2. Restart Claude Code
3. Fetch some documents to populate cache

### Slow Fetches

**Symptom:** Fetches take > 5 seconds.

**Possible Causes:**
- Large documents
- Slow network
- GitHub rate limiting

**Solutions:**
- Check document size
- Pre-cache during good network
- Increase timeout in configuration
- Ensure `GITHUB_TOKEN` is set (higher rate limits)

### No Files Syncing

**Problem:** Running sync but no files match.

**Solution:**
1. Check config patterns match actual file paths
2. Use `--dry-run` to see what would sync:
   ```bash
   /fractary-codex:sync --from-codex --dry-run
   ```
3. Verify config file location: `.fractary/config.yaml`

### Wrong Files Syncing

**Problem:** Files you don't want are syncing.

**Solution:**
1. Check if patterns are too broad (e.g., `**/*`)
2. Add exclude patterns
3. Make patterns more specific

### Org Defaults Not Applied

**Problem:** Project still using SDK defaults instead of org defaults.

**Possible causes:**
1. Org config file location wrong
2. Org config has syntax errors
3. Project has explicit config (overrides org defaults)

**Solution:**

```bash
# Check org config exists
ls codex.corthos.ai/.fractary/config.yaml

# Validate YAML syntax
yamllint codex.corthos.ai/.fractary/config.yaml

# Check if project has config (overrides org)
ls your-project/.fractary/config.yaml
```

## Configuration Reference

### Configuration File

**Location:** `.fractary/config.yaml`

**Schema:**

```yaml
codex:
  schema_version: "2.0"
  organization: fractary
  project: my-project
  codex_repo: codex.fractary.com
  remotes:
    fractary/codex.fractary.com:
      token: ${GITHUB_TOKEN}

sync:
  to_codex:
    - "docs/**/*.md"
    - "README.md"
  from_codex:
    - "codex://{org}/{codex_repo}/docs/**"
    - "codex://{org}/{project}/**"
```

See [Configuration Guide](../configuration.md) for the complete configuration reference.

## See Also

- [Configuration Guide](../configuration.md) - Complete configuration reference
- [JavaScript SDK](../sdk/js/) - SDK documentation
- [CLI Documentation](../cli/) - Command-line interface
- [MCP Server](../mcp-server/) - MCP server documentation

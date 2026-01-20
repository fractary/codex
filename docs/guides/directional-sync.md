# Directional Sync Guide

Directional sync provides a simple, intuitive way to control what files sync between your project and the codex repository using configuration instead of per-file frontmatter.

## Overview

Instead of adding YAML frontmatter to every file, you define sync patterns in your project's config file using two directions:

- **`to_codex`**: What files from THIS project get pushed TO codex
- **`from_codex`**: What files from codex get pulled TO this project

This approach:
- ✅ Works with any file type (JSON, MD, YAML, etc.)
- ✅ No per-file frontmatter needed
- ✅ Easy to understand and maintain
- ✅ Simple directional thinking (push vs pull)

## Configuration

### Project Config

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
    - "codex://{org}/{codex_repo}/standards/**" # Shared standards
    - "codex://{org}/{project}/**"              # Own project files
    - "codex://{org}/other.project/specs/**"    # Other project's specs
```

### Pattern Format

**to_codex patterns:**
- Relative paths from project root
- Support glob patterns (`**/*.json`, `docs/**`, etc.)
- Examples:
  - `"docs/**/*.md"` - All markdown files in docs/
  - `"schema/**/*"` - Everything in schema/
  - `"README.md"` - Specific file

**from_codex patterns:**
- Format: `codex://org/project/path/pattern` (recommended)
- Support glob patterns
- Supported placeholders:
  - `{org}` - Organization name (from config)
  - `{project}` - Current project name
  - `{codex_repo}` - Codex repository name (from config)
- Examples:
  - `"codex://{org}/{codex_repo}/docs/**"` - All docs from codex repo
  - `"codex://{org}/{codex_repo}/standards/**"` - All standards from codex repo
  - `"codex://{org}/{project}/**"` - All my own project files from codex
  - `"codex://fractary/etl.corthion.ai/docs/schema/**/*.json"` - Explicit project reference

## Usage

### Push to Codex (to-codex)

Push your project files to the codex repository:

```bash
cd /path/to/your-project
/fractary-codex:sync --to-codex
```

**What happens:**
1. Reads `sync.to_codex` patterns from config
2. Scans local project files
3. Filters files matching `to_codex` patterns
4. Pushes matched files to codex repository

### Pull from Codex (from-codex)

Pull files from codex to your project:

```bash
cd /path/to/your-project
/fractary-codex:sync --from-codex
```

**What happens:**
1. Reads `sync.from_codex` patterns from config
2. Scans entire codex repository
3. Filters files matching `from_codex` patterns
4. Pulls matched files to local project

## Example Use Cases

### Case 1: Share Schemas Between Projects

**Scenario:** ETL project has schemas that Lake project needs.

**etl.corthion.ai/.fractary/config.yaml:**
```yaml
sync:
  to_codex:
    - "docs/schema/**/*.json"
    - "docs/schema/**/*.md"
    - "docs/guides/**/*.md"
```

**lake.corthonomy.ai/.fractary/config.yaml:**
```yaml
sync:
  from_codex:
    - "codex://{org}/etl.corthion.ai/docs/schema/**/*.json"
    - "codex://{org}/etl.corthion.ai/docs/schema/**/*.md"
    - "codex://{org}/{project}/**"  # Own files
```

**Workflow:**
```bash
# In ETL project - push schemas to codex
cd /path/to/etl.corthion.ai
/fractary-codex:sync --to-codex

# In Lake project - pull schemas from codex
cd /path/to/lake.corthonomy.ai
/fractary-codex:sync --from-codex
```

### Case 2: Share Standards Across All Projects

**core.corthodex.ai/.fractary/config.yaml:**
```yaml
sync:
  to_codex:
    - "docs/standards/**/*.md"
    - "docs/templates/**/*"
```

**any-project/.fractary/config.yaml:**
```yaml
sync:
  from_codex:
    - "codex://{org}/{codex_repo}/standards/**"   # Shared standards from codex repo
    - "codex://{org}/{codex_repo}/templates/**"   # Shared templates
    - "codex://{org}/{project}/**"                # Own files
```

### Case 3: Selective File Sharing

**api.project/.fractary/config.yaml:**
```yaml
sync:
  to_codex:
    - "docs/api-spec.md"
    - "docs/schemas/**/*.json"
    # Not pushing: internal/, tests/, etc.

  from_codex:
    - "codex://{org}/{codex_repo}/standards/**"
    - "codex://{org}/{project}/**"
```

## Priority and Overrides

### Config Priority

1. **CLI options** (highest priority)
   - `--include` and `--exclude` flags override config

2. **Project config**
   - `sync.to_codex` and `sync.from_codex`

3. **SDK defaults** (lowest priority)
   - Used only if no config exists

### Directional Pattern Priority

When using `--from-codex`:
- If `from_codex` patterns are configured, they take precedence
- Otherwise, falls back to frontmatter-based routing (`codex_sync_include`)
- This allows gradual migration from frontmatter to config-based approach

## Migration from Frontmatter

If you're currently using frontmatter (`codex_sync_include`), you can migrate gradually:

### Before (frontmatter approach):

**File: etl.corthion.ai/docs/schema/users.json**
```yaml
---
codex_sync_include: ['lake.*', 'api.*']
---
{
  "schema": "..."
}
```

**Problems:**
- ❌ Doesn't work well with JSON files
- ❌ Need frontmatter in every file
- ❌ Hard to see what syncs where

### After (directional approach):

**File: etl.corthion.ai/.fractary/config.yaml**
```yaml
sync:
  to_codex:
    - "docs/schema/**/*"
```

**File: lake.corthonomy.ai/.fractary/config.yaml**
```yaml
sync:
  from_codex:
    - "codex://{org}/etl.corthion.ai/docs/schema/**/*"
```

**File: etl.corthion.ai/docs/schema/users.json** (no frontmatter needed!)
```json
{
  "schema": "..."
}
```

**Advantages:**
- ✅ Works with any file type
- ✅ One config per project
- ✅ Easy to see what syncs where
- ✅ No per-file maintenance

## Advanced Patterns

### Placeholder Usage

```yaml
sync:
  from_codex:
    # Pull from codex repository (shared org docs)
    - "codex://{org}/{codex_repo}/docs/**"

    # Pull own project's files
    - "codex://{org}/{project}/**"

    # Pull specific project's files
    - "codex://{org}/etl.corthion.ai/schemas/**"
```

### Specific File Types

```yaml
sync:
  to_codex:
    - "**/*.json"          # All JSON files
    - "**/*.{yaml,yml}"    # All YAML files
    - "docs/**/*.md"       # Only markdown in docs
```

### Exclusions

Use exclude patterns to filter out specific files:

```yaml
sync:
  to_codex:
    - "docs/**/*.md"

# In config root (applies to all syncs)
exclude:
  - "**/*-test.md"
  - "**/*.draft.md"
```

## Troubleshooting

### No files syncing

**Problem:** Running sync but no files match.

**Solution:**
1. Check config patterns match actual file paths
2. Use `--dry-run` to see what would sync:
   ```bash
   /fractary-codex:sync --from-codex --dry-run
   ```
3. Verify config file location: `.fractary/config.yaml`

### Wrong files syncing

**Problem:** Files you don't want are syncing.

**Solution:**
1. Check if patterns are too broad (e.g., `**/*`)
2. Add exclude patterns
3. Make patterns more specific

### Files still using frontmatter

**Problem:** Config patterns not working, still using frontmatter.

**Solution:**
- Directional patterns (`from_codex`) take precedence over frontmatter
- If no patterns configured, falls back to frontmatter routing
- Ensure config has `sync.from_codex` or `sync.to_codex` defined

## Best Practices

### 1. Start Specific, Expand as Needed

```yaml
# Good - specific
sync:
  to_codex:
    - "docs/api-spec.md"
    - "docs/schemas/**/*.json"

# Risky - too broad
sync:
  to_codex:
    - "**/*"  # Everything!
```

### 2. Always Pull Your Own Files

```yaml
sync:
  from_codex:
    - "codex://{org}/other-project/docs/**"
    - "codex://{org}/{project}/**"  # Don't forget this!
```

### 3. Group Related Patterns

```yaml
sync:
  to_codex:
    # Documentation
    - "README.md"
    - "CLAUDE.md"
    - "docs/**/*.md"

    # Schemas
    - "schema/**/*.json"
    - "schema/**/*.yaml"

    # Standards
    - ".fractary/standards/**"
```

### 4. Document Your Patterns

```yaml
sync:
  to_codex:
    # Public API documentation for consumers
    - "docs/api/**/*.md"

    # Internal schemas (not for external use)
    # - "internal/schema/**"  # Commented out
```

## See Also

- [Sync Command Reference](../cli/sync.md)
- [Configuration Schema](../reference/config-schema.md)
- [Pattern Matching Guide](./pattern-matching.md)

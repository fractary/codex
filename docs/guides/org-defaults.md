# Organization-Level Sync Defaults

Organization-level defaults allow you to define sync patterns once in the codex repository that apply to all projects in your organization, reducing configuration boilerplate.

## Overview

Instead of configuring the same patterns in every project, you can define organization-wide defaults that projects inherit automatically. Projects can still override these defaults with their own configuration when needed.

**Priority order:**
1. **Project config** (highest priority) - Overrides everything
2. **Org defaults** - Applies when no project config exists
3. **SDK defaults** (lowest priority) - Fallback when neither exist

## Configuration Location

Organization defaults are defined in the **codex repository's config**:

```
codex.corthos.ai/
└── .fractary/
    └── codex/
        └── config.yaml  # <-- Org-level config here
```

## Org Config Format

```yaml
# codex.corthos.ai/.fractary/codex/config.yaml

sync:
  # Default patterns for pushing to codex
  # Applied to ALL projects that don't have to_codex config
  default_to_codex:
    - "README.md"
    - "CLAUDE.md"
    - "docs/**/*.md"
    - "specs/**/*.md"
    - ".fractary/standards/**"
    - ".fractary/templates/**"

  # Default patterns for pulling from codex
  # Applied to ALL projects that don't have from_codex config
  default_from_codex:
    - "core.corthodex.ai/docs/standards/**/*.md"
    - "{project}/**"  # Special placeholder (see below)
```

## Special Placeholders

### {project} Placeholder

The `{project}` placeholder automatically expands to the current project name:

**In org config:**
```yaml
default_from_codex:
  - "{project}/**"  # Placeholder
```

**Expands to for lake.corthonomy.ai:**
```yaml
from_codex:
  - "lake.corthonomy.ai/**"  # Actual pattern used
```

**Expands to for etl.corthion.ai:**
```yaml
from_codex:
  - "etl.corthion.ai/**"  # Actual pattern used
```

This ensures every project pulls its own files from codex by default without explicit configuration.

## How Defaults Work

### Example Setup

**Org config (codex.corthos.ai/.fractary/codex/config.yaml):**
```yaml
sync:
  default_to_codex:
    - "README.md"
    - "CLAUDE.md"
    - "docs/**/*.md"

  default_from_codex:
    - "core.corthodex.ai/docs/standards/**"
    - "{project}/**"
```

### Project Without Config

**Project:** api.corthodex.ai (no `.fractary/codex/config.yaml`)

**Effective config:** Uses org defaults
```yaml
# Automatically applied from org config
sync:
  to_codex:
    - "README.md"
    - "CLAUDE.md"
    - "docs/**/*.md"

  from_codex:
    - "core.corthodex.ai/docs/standards/**"
    - "api.corthodex.ai/**"  # {project} expanded
```

### Project With Config

**Project:** etl.corthion.ai

**Project config (.fractary/codex/config.yaml):**
```yaml
sync:
  to_codex:
    - "docs/schema/**/*"
    - "docs/guides/**/*.md"

  from_codex:
    - "etl.corthion.ai/**"
```

**Effective config:** Uses project config (completely overrides org defaults)
```yaml
# Org defaults are NOT used - project config takes full precedence
sync:
  to_codex:
    - "docs/schema/**/*"
    - "docs/guides/**/*.md"

  from_codex:
    - "etl.corthion.ai/**"
```

**Important:** Project config **replaces** org defaults, it doesn't merge with them.

### Partial Override

If a project only configures one direction, org defaults apply to the other:

**Project config:**
```yaml
sync:
  to_codex:
    - "docs/**/*.md"
  # No from_codex configured
```

**Effective config:**
```yaml
sync:
  to_codex:
    - "docs/**/*.md"  # From project config

  from_codex:
    # From org defaults:
    - "core.corthodex.ai/docs/standards/**"
    - "lake.corthonomy.ai/**"
```

## Use Cases

### Case 1: Standardize Basic Files

**Goal:** All projects push README, CLAUDE.md, and docs to codex by default.

**Org config:**
```yaml
sync:
  default_to_codex:
    - "README.md"
    - "CLAUDE.md"
    - "docs/**/*.md"
    - "specs/**/*.md"
```

**Result:** All 50 projects automatically push these files without individual configuration.

### Case 2: Share Core Standards

**Goal:** All projects automatically pull standards from core.corthodex.ai.

**Org config:**
```yaml
sync:
  default_from_codex:
    - "core.corthodex.ai/docs/standards/**"
    - "core.corthodex.ai/docs/templates/**"
    - "{project}/**"
```

**Result:** Every project gets core standards plus its own files from codex.

### Case 3: Project-Type-Specific Defaults

**Problem:** Different project types need different defaults.

**Solution:** Use multiple codex repositories or rely on project config overrides.

**Option A - Multiple Codex Repos:**
```
codex-apis.corthos.ai/        # API projects
codex-services.corthos.ai/    # Service projects
codex-data.corthos.ai/        # Data projects
```

Each has its own default_to_codex/default_from_codex.

**Option B - Project Overrides:**
```yaml
# Most projects use org defaults

# But data projects override:
# etl.corthion.ai/.fractary/codex/config.yaml
sync:
  to_codex:
    - "docs/schema/**/*"  # Data-specific patterns
    - "docs/pipelines/**/*"
```

## Migration Strategy

### Step 1: Identify Common Patterns

Audit existing project configs to find common patterns:

```bash
# Find all project configs
find . -name "config.yaml" -path "*/.fractary/codex/*"

# Review patterns
grep -A 5 "to_codex:" $(find . -name "config.yaml")
```

### Step 2: Create Org Defaults

Move common patterns to org config:

**Before (in every project):**
```yaml
sync:
  to_codex:
    - "README.md"
    - "CLAUDE.md"
    - "docs/**/*.md"
```

**After (once in org config):**
```yaml
# codex.corthos.ai/.fractary/codex/config.yaml
sync:
  default_to_codex:
    - "README.md"
    - "CLAUDE.md"
    - "docs/**/*.md"
```

### Step 3: Remove Redundant Project Configs

For projects that match org defaults exactly, delete their project configs:

```bash
# Projects will automatically use org defaults
rm lake.corthonomy.ai/.fractary/codex/config.yaml
rm api.corthodex.ai/.fractary/codex/config.yaml
```

### Step 4: Keep Custom Project Configs

For projects with unique patterns, keep their project configs:

```yaml
# etl.corthion.ai/.fractary/codex/config.yaml (keep this!)
sync:
  to_codex:
    - "docs/schema/**/*"  # Unique to ETL projects
```

## Best Practices

### 1. Start Conservative

Begin with minimal defaults and expand gradually:

```yaml
# Good - conservative defaults
default_to_codex:
  - "README.md"
  - "CLAUDE.md"

# Risky - too aggressive
default_to_codex:
  - "**/*"  # Everything!
```

### 2. Always Include {project}

Always include `{project}/**` in default_from_codex so projects pull their own files:

```yaml
# Good
default_from_codex:
  - "core.*/docs/standards/**"
  - "{project}/**"  # Own files

# Bad - projects won't get their own files!
default_from_codex:
  - "core.*/docs/standards/**"
```

### 3. Document Your Defaults

Add comments explaining why patterns are included:

```yaml
sync:
  default_to_codex:
    # Core documentation all projects should maintain
    - "README.md"
    - "CLAUDE.md"

    # API documentation for consumers
    - "docs/api/**/*.md"

    # NOT included by default (too project-specific):
    # - "schema/**"  # Only data projects need this
```

### 4. Test Defaults Before Rolling Out

Create a test project to verify defaults work as expected:

```bash
# Create test project
mkdir test-project
cd test-project

# DON'T create project config - use defaults

# Test push
/fractary-codex:sync --to-codex --dry-run

# Test pull
/fractary-codex:sync --from-codex --dry-run
```

### 5. Communicate Changes

When updating org defaults, notify the team:

```markdown
# Announcement: Org Defaults Updated

We've added these patterns to org defaults:
- docs/standards/** (was: project-specific)
- .fractary/templates/** (new)

Impact:
- 45 projects will automatically start pushing these files
- No action needed for most projects
- Override in your project config if you want different behavior
```

## Troubleshooting

### Defaults Not Applied

**Problem:** Project still using SDK defaults instead of org defaults.

**Possible causes:**
1. Org config file location wrong
2. Org config has syntax errors
3. Project has explicit config (overrides org defaults)

**Solution:**
```bash
# Check org config exists
ls codex.corthos.ai/.fractary/codex/config.yaml

# Validate YAML syntax
yamllint codex.corthos.ai/.fractary/codex/config.yaml

# Check if project has config (overrides org)
ls lake.corthonomy.ai/.fractary/codex/config.yaml
```

### Too Many/Few Files Syncing

**Problem:** Org defaults are too broad or too narrow.

**Solution:**
1. Review actual file patterns in projects
2. Adjust org defaults to match common case
3. Add project overrides for exceptions

### Cannot Override Org Defaults

**Problem:** Want different patterns but org defaults still apply.

**Explanation:** Project config completely replaces org defaults.

**Solution:** Create project config with desired patterns:

```yaml
# my-project/.fractary/codex/config.yaml
sync:
  to_codex:
    - "my/custom/pattern/**"

  from_codex:
    - "my-project/**"  # Don't forget own files!
```

## See Also

- [Directional Sync Guide](./directional-sync.md)
- [Configuration Schema Reference](../reference/config-schema.md)
- [Pattern Matching Guide](./pattern-matching.md)

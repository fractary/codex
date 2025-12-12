---
title: Codex SDK CLI Usage Guide
description: Complete guide to using the Codex SDK via the fractary CLI including all commands, options, and examples
codex_sync_include: []
codex_sync_exclude: []
codex_sync_custom: [developers.fractary.com:src/content/docs/codex/]
visibility: public
tags: [codex, sdk, cli, commands, terminal]
---

# CLI Usage Guide

The Codex SDK can be used via the `fractary` unified CLI tool. This guide covers all available commands and usage patterns.

## Installation

The `fractary` CLI includes built-in support for Codex SDK commands:

```bash
npm install -g fractary
```

Or use it locally in your project:

```bash
npm install --save-dev fractary
```

## Command Structure

All Codex commands follow this structure:

```bash
fractary codex <command> [arguments] [options]
```

## Available Commands

### Metadata Commands

#### `parse` - Parse and Validate Frontmatter

Parse YAML frontmatter from a markdown file and display the results.

```bash
fractary codex parse <file>
```

**Arguments:**
- `<file>` - Path to markdown file to parse

**Options:**
- `--strict` - Throw error on validation failure (default: true)
- `--json` - Output as JSON

**Example:**

```bash
fractary codex parse docs/api-guide.md
```

**Output:**

```yaml
metadata:
  codex_sync_include:
    - api-*
    - core-*
  codex_sync_exclude:
    - *-test
  visibility: internal
  tags:
    - api
    - documentation

content: |
  # API Guide

  This guide explains...
```

**JSON Output:**

```bash
fractary codex parse docs/api-guide.md --json
```

```json
{
  "metadata": {
    "codex_sync_include": ["api-*", "core-*"],
    "codex_sync_exclude": ["*-test"],
    "visibility": "internal",
    "tags": ["api", "documentation"]
  },
  "content": "# API Guide\n\nThis guide explains..."
}
```

#### `validate` - Validate Frontmatter

Validate frontmatter in one or more files.

```bash
fractary codex validate <files...>
```

**Arguments:**
- `<files...>` - One or more markdown files to validate

**Options:**
- `--quiet` - Only show errors, no success messages

**Example:**

```bash
# Validate single file
fractary codex validate docs/api-guide.md

# Validate multiple files
fractary codex validate docs/*.md

# Quiet mode
fractary codex validate docs/*.md --quiet
```

**Output:**

```
✓ docs/api-guide.md - Valid
✓ docs/getting-started.md - Valid
✗ docs/broken.md - Invalid frontmatter: codex_sync_include must be an array

2 valid, 1 invalid
```

---

### Pattern Matching Commands

#### `match` - Test Pattern Match

Test if a pattern matches a value.

```bash
fractary codex match <pattern> <value>
```

**Arguments:**
- `<pattern>` - Glob pattern to test
- `<value>` - Value to match against

**Example:**

```bash
fractary codex match "api-*" "api-gateway"
# Output: ✓ Match

fractary codex match "api-*" "web-app"
# Output: ✗ No match
```

**Exit Codes:**
- `0` - Match found
- `1` - No match

**Use in Scripts:**

```bash
if fractary codex match "api-*" "$REPO_NAME"; then
  echo "This is an API repository"
fi
```

#### `filter` - Filter Values by Patterns

Filter a list of values using glob patterns.

```bash
fractary codex filter <patterns...> -- <values...>
```

**Arguments:**
- `<patterns...>` - One or more glob patterns
- `<values...>` - Values to filter (after `--`)

**Example:**

```bash
fractary codex filter "api-*" "core-*" -- \
  api-gateway \
  api-auth \
  web-app \
  core-db \
  api-test
```

**Output:**

```
api-gateway
api-auth
core-db
```

**Use in Scripts:**

```bash
# Get all API repos
API_REPOS=$(fractary codex filter "api-*" -- $(cat repos.txt))
echo "$API_REPOS"
```

---

### Routing Commands

#### `should-sync` - Check if File Should Sync

Determine if a file should sync to a target repository.

```bash
fractary codex should-sync <file> <target-repo>
```

**Arguments:**
- `<file>` - Path to markdown file
- `<target-repo>` - Target repository name

**Options:**
- `--source-repo <name>` - Source repository name (auto-detected if not provided)
- `--config <path>` - Path to config file

**Example:**

```bash
fractary codex should-sync docs/api-guide.md api-gateway
# Output: ✓ Should sync

fractary codex should-sync docs/api-guide.md web-app
# Output: ✗ Should not sync
```

**With Source Repo:**

```bash
fractary codex should-sync docs/api-guide.md api-gateway \
  --source-repo codex.myorg.com
```

**Exit Codes:**
- `0` - Should sync
- `1` - Should not sync

**Use in CI/CD:**

```bash
#!/bin/bash
for file in .myorg/docs/*.md; do
  if fractary codex should-sync "$file" "$TARGET_REPO"; then
    echo "Syncing $file to $TARGET_REPO"
    cp "$file" "target/$file"
  fi
done
```

#### `targets` - Get All Target Repositories

Get all repositories that should receive a file.

```bash
fractary codex targets <file>
```

**Arguments:**
- `<file>` - Path to markdown file

**Options:**
- `--repos <file>` - File containing list of all repositories (one per line)
- `--source-repo <name>` - Source repository name
- `--json` - Output as JSON array

**Example:**

```bash
fractary codex targets docs/api-guide.md --repos repos.txt
```

**Output:**

```
api-gateway
api-auth
api-payments
```

**JSON Output:**

```bash
fractary codex targets docs/api-guide.md --repos repos.txt --json
```

```json
["api-gateway", "api-auth", "api-payments"]
```

**With Inline Repos:**

```bash
fractary codex targets docs/api-guide.md \
  --repos <(echo -e "api-gateway\napi-auth\nweb-app")
```

---

### Configuration Commands

#### `config show` - Show Current Configuration

Display the current configuration.

```bash
fractary codex config show
```

**Options:**
- `--json` - Output as JSON
- `--org <slug>` - Specify organization slug

**Example:**

```bash
fractary codex config show
```

**Output:**

```yaml
organizationSlug: myorg
directories:
  source: .myorg
  target: .myorg
  systems: .myorg/systems
rules:
  preventSelfSync: true
  preventCodexSync: true
  allowProjectOverrides: true
```

**JSON Output:**

```bash
fractary codex config show --json
```

```json
{
  "organizationSlug": "myorg",
  "directories": {
    "source": ".myorg",
    "target": ".myorg",
    "systems": ".myorg/systems"
  },
  "rules": {
    "preventSelfSync": true,
    "preventCodexSync": true,
    "allowProjectOverrides": true
  }
}
```

#### `config validate` - Validate Configuration

Validate the current configuration and check for common issues.

```bash
fractary codex config validate
```

**Options:**
- `--org <slug>` - Specify organization slug
- `--verbose` - Show detailed validation info

**Example:**

```bash
fractary codex config validate
```

**Output (Success):**

```
✓ Configuration is valid
✓ Organization slug: myorg
✓ Source directory exists: .myorg/
✓ Target directory exists: .myorg/
✓ All rules are valid
```

**Output (Failure):**

```
✗ Configuration is invalid
✗ Organization slug not found
  Set ORGANIZATION_SLUG environment variable or use --org flag
✗ Source directory does not exist: .myorg/
  Create directory or set CODEX_SOURCE_DIR environment variable
```

#### `config org` - Show Organization Slug

Display the current organization slug.

```bash
fractary codex config org
```

**Options:**
- `--repo <name>` - Auto-detect from repository name
- `--auto-detect` - Enable auto-detection (default: true)

**Example:**

```bash
fractary codex config org
# Output: myorg

fractary codex config org --repo codex.fractary.com
# Output: fractary
```

**Use in Scripts:**

```bash
ORG=$(fractary codex config org)
echo "Organization: $ORG"
```

---

## Global Options

These options work with all commands:

- `--help`, `-h` - Show help for command
- `--version`, `-v` - Show version information
- `--verbose` - Enable verbose output
- `--quiet`, `-q` - Suppress non-error output
- `--no-color` - Disable colored output

**Examples:**

```bash
# Show help for parse command
fractary codex parse --help

# Show version
fractary codex --version

# Verbose output
fractary codex targets docs/api-guide.md --verbose

# Quiet mode
fractary codex validate docs/*.md --quiet
```

---

## Environment Variables

Configure behavior via environment variables:

```bash
# Organization configuration
export ORGANIZATION_SLUG=myorg
export CODEX_ORG_SLUG=myorg

# Directory configuration
export CODEX_SOURCE_DIR=.myorg
export CODEX_TARGET_DIR=.myorg
export CODEX_SYSTEMS_DIR=.myorg/systems

# Run commands
fractary codex config show
```

See [Configuration Guide](./configuration.md) for complete environment variable documentation.

---

## Common Workflows

### Workflow 1: Validate All Documentation

```bash
#!/bin/bash
# validate-docs.sh

echo "Validating all documentation..."
fractary codex validate .myorg/docs/**/*.md

if [ $? -eq 0 ]; then
  echo "✓ All documentation is valid"
  exit 0
else
  echo "✗ Some documentation has errors"
  exit 1
fi
```

### Workflow 2: List Sync Targets for All Files

```bash
#!/bin/bash
# list-targets.sh

REPOS_FILE="repos.txt"

for file in .myorg/docs/**/*.md; do
  echo "File: $file"
  fractary codex targets "$file" --repos "$REPOS_FILE"
  echo "---"
done
```

### Workflow 3: Sync Files to Target Repository

```bash
#!/bin/bash
# sync-to-repo.sh

TARGET_REPO="$1"
SOURCE_DIR=".myorg"
TARGET_DIR=".${TARGET_REPO}"

echo "Syncing to $TARGET_REPO..."

for file in "$SOURCE_DIR"/**/*.md; do
  if fractary codex should-sync "$file" "$TARGET_REPO"; then
    rel_path="${file#$SOURCE_DIR/}"
    target_file="$TARGET_DIR/$rel_path"

    mkdir -p "$(dirname "$target_file")"
    cp "$file" "$target_file"

    echo "✓ Synced: $rel_path"
  fi
done
```

### Workflow 4: Filter Repositories by Pattern

```bash
#!/bin/bash
# filter-repos.sh

PATTERN="$1"
ALL_REPOS=$(cat repos.txt)

echo "Repositories matching '$PATTERN':"
fractary codex filter "$PATTERN" -- $ALL_REPOS
```

### Workflow 5: Check Configuration Before Deploy

```bash
#!/bin/bash
# pre-deploy.sh

echo "Validating configuration..."
if ! fractary codex config validate --quiet; then
  echo "✗ Configuration is invalid"
  exit 1
fi

echo "Validating documentation..."
if ! fractary codex validate .myorg/docs/**/*.md --quiet; then
  echo "✗ Documentation has errors"
  exit 1
fi

echo "✓ All checks passed"
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Validate Codex Documentation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install fractary CLI
        run: npm install -g fractary

      - name: Validate configuration
        run: fractary codex config validate
        env:
          ORGANIZATION_SLUG: ${{ secrets.ORG_SLUG }}

      - name: Validate documentation
        run: fractary codex validate .myorg/docs/**/*.md
```

### GitLab CI

```yaml
validate-codex:
  stage: validate
  image: node:18
  script:
    - npm install -g fractary
    - fractary codex config validate
    - fractary codex validate .myorg/docs/**/*.md
  variables:
    ORGANIZATION_SLUG: $ORG_SLUG
```

---

## Exit Codes

All commands follow standard exit code conventions:

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error or negative result |
| `2` | Configuration error |
| `3` | Validation error |
| `4` | File not found |

**Use in Scripts:**

```bash
fractary codex should-sync docs/api.md api-gateway
EXIT_CODE=$?

case $EXIT_CODE in
  0) echo "Should sync" ;;
  1) echo "Should not sync" ;;
  2) echo "Configuration error" ;;
  *) echo "Unknown error" ;;
esac
```

---

## Output Formats

Commands support multiple output formats:

### Human-Readable (Default)

```bash
fractary codex targets docs/api-guide.md
# Output:
# api-gateway
# api-auth
# api-payments
```

### JSON

```bash
fractary codex targets docs/api-guide.md --json
# Output:
# ["api-gateway","api-auth","api-payments"]
```

### Quiet Mode

```bash
fractary codex validate docs/*.md --quiet
# Only shows errors, no success messages
```

---

## Tips and Best Practices

### 1. Use `--json` for Scripting

When using CLI commands in scripts, use `--json` for reliable parsing:

```bash
TARGETS=$(fractary codex targets docs/api.md --json | jq -r '.[]')
for repo in $TARGETS; do
  echo "Processing $repo"
done
```

### 2. Check Exit Codes

Always check exit codes in scripts:

```bash
if fractary codex should-sync "$FILE" "$TARGET"; then
  echo "Syncing..."
else
  echo "Skipping..."
fi
```

### 3. Use Environment Variables

Set environment variables once instead of passing options repeatedly:

```bash
export ORGANIZATION_SLUG=myorg
export CODEX_SOURCE_DIR=.codex

# No need to pass --org flag
fractary codex config show
fractary codex validate docs/*.md
```

### 4. Validate Before Syncing

Always validate configuration and documentation before syncing:

```bash
fractary codex config validate || exit 1
fractary codex validate .myorg/**/*.md || exit 1
# Now safe to sync
```

### 5. Use `--quiet` in CI/CD

Reduce noise in CI/CD logs:

```bash
fractary codex validate .myorg/**/*.md --quiet
```

---

## Troubleshooting

### Command Not Found

**Problem:** `fractary: command not found`

**Solution:**
```bash
# Install globally
npm install -g fractary

# Or use via npx
npx fractary codex config show
```

### Organization Slug Not Found

**Problem:** `Error: Organization slug could not be determined`

**Solution:**
```bash
# Set environment variable
export ORGANIZATION_SLUG=myorg

# Or pass explicitly
fractary codex config show --org myorg
```

### Invalid Frontmatter

**Problem:** `Error: Invalid frontmatter in docs/api.md`

**Solution:**
```bash
# Parse to see detailed error
fractary codex parse docs/api.md

# Common issues:
# - Missing quotes around patterns with asterisks
# - Invalid YAML syntax
# - Unsupported field types
```

### File Not Found

**Problem:** `Error: File not found: docs/api.md`

**Solution:**
```bash
# Check file exists
ls docs/api.md

# Use correct path relative to current directory
fractary codex parse ./docs/api.md
```

---

## Next Steps

- **[API Reference](./api-reference.md)** - Programmatic API documentation
- **[Configuration](./configuration.md)** - Advanced configuration options
- **[Examples](./examples.md)** - Real-world examples
- **[Getting Started](./getting-started.md)** - Quick start guide

## Need Help?

- **Command Help**: Run any command with `--help` flag
- **Issues**: [Report bugs or request features](https://github.com/fractary/codex/issues)
- **Documentation**: [Full documentation](https://developers.fractary.com/codex)

# Spec Module - CLI Reference

Command-line reference for the Spec module. Technical specification management.

## Command Structure

```bash
fractary-core spec <command> [arguments] [options]
```

All commands use dash-separated names (e.g., `spec-create-file`, `spec-validate-check`).

## Specification Commands

### spec spec-create-file

Create a new specification file.

```bash
fractary-core spec spec-create-file <title> [options]
```

**Arguments:**
- `title` - Specification title

**Options:**
- `--template <type>` - Specification template: `feature`, `bugfix`, `refactor` (default: `feature`)
- `--work-id <id>` - Associated work item ID
- `--json` - Output as JSON

**Examples:**
```bash
# Create feature spec
fractary-core spec spec-create-file "User Authentication" --template feature

# Create bugfix spec linked to issue
fractary-core spec spec-create-file "Fix Login Timeout" \
  --template bugfix \
  --work-id 123

# Create refactor spec with JSON output
fractary-core spec spec-create-file "Restructure API Layer" \
  --template refactor \
  --json
```

### spec spec-get

Get a specification by ID or path.

```bash
fractary-core spec spec-get <id> [options]
```

**Arguments:**
- `id` - Specification ID or path

**Options:**
- `--json` - Output as JSON

**Examples:**
```bash
# Get spec by ID
fractary-core spec spec-get SPEC-00123

# Get as JSON
fractary-core spec spec-get SPEC-00123 --json
```

### spec spec-list

List specifications.

```bash
fractary-core spec spec-list [options]
```

**Options:**
- `--status <status>` - Filter by status: `draft`, `validated`, `needs_revision`
- `--work-id <id>` - Filter by work item ID
- `--json` - Output as JSON

**Examples:**
```bash
# List all specs
fractary-core spec spec-list

# List draft specs
fractary-core spec spec-list --status draft

# List specs for a work item
fractary-core spec spec-list --work-id 123 --json
```

### spec spec-update

Update a specification.

```bash
fractary-core spec spec-update <id> [options]
```

**Arguments:**
- `id` - Specification ID or path

**Options:**
- `--title <title>` - New title
- `--content <content>` - New content
- `--work-id <id>` - Update work item ID
- `--status <status>` - Update status
- `--json` - Output as JSON

**Examples:**
```bash
# Update title
fractary-core spec spec-update SPEC-00123 --title "Updated Authentication Spec"

# Update status
fractary-core spec spec-update SPEC-00123 --status validated

# Update work item link
fractary-core spec spec-update SPEC-00123 --work-id 456
```

### spec spec-delete

Delete a specification.

```bash
fractary-core spec spec-delete <id> [options]
```

**Arguments:**
- `id` - Specification ID or path

**Options:**
- `--json` - Output as JSON

**Example:**
```bash
fractary-core spec spec-delete SPEC-00123
```

## Validation Commands

### spec spec-validate-check

Run structural validation checks on a specification.

```bash
fractary-core spec spec-validate-check <id> [options]
```

**Arguments:**
- `id` - Specification ID or path

**Options:**
- `--json` - Output as JSON

**Example:**
```bash
fractary-core spec spec-validate-check SPEC-00123
```

**Output:**
```
Validation Result: PARTIAL
Score: 75%

Requirements: 3/4 - partial
Acceptance Criteria: 2/5 - incomplete
```

## Refinement Commands

### spec spec-refine-scan

Scan a specification for structural gaps and refinement areas.

```bash
fractary-core spec spec-refine-scan <id> [options]
```

**Arguments:**
- `id` - Specification ID or path

**Options:**
- `--json` - Output as JSON

**Example:**
```bash
fractary-core spec spec-refine-scan SPEC-00123
```

**Output:**
```
Refinement Questions:

1. What are the specific acceptance criteria?
   Category: requirements

2. What error handling is required?
   Category: technical
```

## Archive Commands

### spec spec-archive

Archive specifications for a completed issue (copy to archive, verify, remove originals).

```bash
fractary-core spec spec-archive <issue_number> [options]
```

**Arguments:**
- `issue_number` - GitHub issue number

**Options:**
- `--local` - Force local archive mode (skip cloud storage)
- `--json` - Output as JSON

Specs are matched by filename pattern (e.g., `SPEC-00123` or `WORK-00123`). When cloud storage is configured, specs are archived to cloud and verified before removing originals. Otherwise, specs are copied to a local `archive/` directory with checksum verification.

**Examples:**
```bash
# Archive specs for issue #123
fractary-core spec spec-archive 123

# Force local archive
fractary-core spec spec-archive 123 --local

# Get detailed results as JSON
fractary-core spec spec-archive 123 --json
```

## Template Commands

### spec template-list

List available specification templates.

```bash
fractary-core spec template-list [options]
```

**Options:**
- `--json` - Output as JSON

**Example:**
```bash
fractary-core spec template-list
```

**Output:**
```
Available Templates:

feature
  Feature request specification template

bugfix
  Bug fix specification template

refactor
  Refactoring specification template
```

## JSON Output

All commands support `--json` for structured output:

```bash
fractary-core spec spec-get SPEC-00123 --json
```

```json
{
  "status": "success",
  "data": {
    "id": "SPEC-00123",
    "title": "User Authentication",
    "path": ".fractary/specs/SPEC-00123-user-authentication.md",
    "workId": "123",
    "content": "...",
    "metadata": {
      "validation_status": "draft"
    }
  }
}
```

## Other Interfaces

- **SDK:** [Spec API](/docs/sdk/js/spec.md)
- **MCP:** [Spec Tools](/docs/mcp/server/spec.md)
- **Plugin:** [Spec Plugin](/docs/plugins/spec.md)
- **Configuration:** [Spec Config](/docs/guides/configuration.md#spec-toolset)

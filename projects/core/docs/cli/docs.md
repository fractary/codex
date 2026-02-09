# Docs Module - CLI Reference

Command-line reference for the Docs module. Documentation management with type-aware creation, validation, and archival.

## Command Structure

```bash
fractary-core docs <command> [arguments] [options]
```

All commands use dash-separated names (e.g., `doc-create`, `doc-search`).

## Document Commands

### docs doc-create

Create a new document.

```bash
fractary-core docs doc-create <id> [options]
```

**Arguments:**
- `id` - Document ID

**Options:**
- `--title <title>` - Document title (required)
- `--content <text>` - Document content (required)
- `--format <format>` - Document format: `markdown`, `html`, `pdf`, `text` (default: `markdown`)
- `--doc-type <type>` - Document type (e.g., `adr`, `api`, `architecture`)
- `--tags <tags>` - Comma-separated tags
- `--category <category>` - Document category
- `--description <desc>` - Document description
- `--status <status>` - Document status
- `--json` - Output as JSON

**Examples:**
```bash
# Create markdown document
fractary-core docs doc-create user-guide \
  --title "User Guide" \
  --content "# User Guide\n\nWelcome..."

# Create ADR with type
fractary-core docs doc-create adr-001 \
  --title "Use PostgreSQL for primary database" \
  --content "## Context\n\n..." \
  --doc-type adr \
  --tags "architecture,database" \
  --category architecture
```

### docs doc-get

Get a document.

```bash
fractary-core docs doc-get <id> [options]
```

**Arguments:**
- `id` - Document ID

**Options:**
- `--json` - Output as JSON

**Examples:**
```bash
# Get document (prints content)
fractary-core docs doc-get user-guide

# Get as JSON
fractary-core docs doc-get user-guide --json
```

### docs doc-list

List documents.

```bash
fractary-core docs doc-list [options]
```

**Options:**
- `--category <category>` - Filter by category
- `--tags <tags>` - Filter by tags (comma-separated)
- `--format <format>` - Filter by format
- `--json` - Output as JSON

**Examples:**
```bash
# List all documents
fractary-core docs doc-list

# List API documentation
fractary-core docs doc-list --category api

# List by tags
fractary-core docs doc-list --tags "guide,user"

# List markdown docs as JSON
fractary-core docs doc-list --format markdown --json
```

### docs doc-update

Update a document.

```bash
fractary-core docs doc-update <id> [options]
```

**Arguments:**
- `id` - Document ID

**Options:**
- `--content <text>` - New content (required)
- `--title <title>` - New title
- `--tags <tags>` - New tags (comma-separated)
- `--category <category>` - New category
- `--description <desc>` - New description
- `--json` - Output as JSON

**Examples:**
```bash
# Update content
fractary-core docs doc-update user-guide \
  --content "# Updated User Guide\n\n..."

# Update with new title and tags
fractary-core docs doc-update user-guide \
  --content "..." \
  --title "User Guide v2" \
  --tags "guide,v2"
```

### docs doc-delete

Delete a document.

```bash
fractary-core docs doc-delete <id> [options]
```

**Arguments:**
- `id` - Document ID

**Options:**
- `--json` - Output as JSON

**Example:**
```bash
fractary-core docs doc-delete old-draft
```

### docs doc-search

Search documents.

```bash
fractary-core docs doc-search [options]
```

**Options:**
- `--text <query>` - Search text in content and title
- `--tags <tags>` - Filter by tags (comma-separated)
- `--author <author>` - Filter by author
- `--category <category>` - Filter by category
- `--doc-type <type>` - Filter by document type
- `--limit <n>` - Limit results (default: `10`)
- `--json` - Output as JSON

**Examples:**
```bash
# Search by text
fractary-core docs doc-search --text "authentication"

# Search by type and category
fractary-core docs doc-search --doc-type adr --category architecture

# Combined search
fractary-core docs doc-search --text "API" --tags "v2" --limit 5
```

## Archive and Validation Commands

### docs doc-archive

Archive a document using its type's configured archive source.

```bash
fractary-core docs doc-archive <id> [options]
```

**Arguments:**
- `id` - Document ID

**Options:**
- `--source <name>` - Override archive source (default: from type config)
- `--json` - Output as JSON

The document type must have archival enabled in its configuration. The command uploads the document to the configured archive source, verifies the checksum, and optionally deletes the original based on type settings.

**Examples:**
```bash
# Archive document using type defaults
fractary-core docs doc-archive adr-001

# Archive to specific source
fractary-core docs doc-archive adr-001 --source s3-archive
```

### docs doc-refine-scan

Scan a document for gaps and generate refinement questions.

```bash
fractary-core docs doc-refine-scan <id> [options]
```

**Arguments:**
- `id` - Document ID

**Options:**
- `--json` - Output as JSON

Checks for missing required sections, placeholder/vague content (TBD, TODO, FIXME), empty sections, and unchecked acceptance criteria.

**Examples:**
```bash
fractary-core docs doc-refine-scan user-guide
```

**Output:**
```
Found 3 potential gap(s):

  Q1 [high] Required section "Context" is missing. What content should it contain?
  Q2 [medium] Section "Implementation" contains placeholder text ("TBD"). What specific content should replace it?
  Q3 [high] Section "Testing" appears to be empty or very brief. What details should be added?
```

### docs doc-validate-fulfillment

Validate whether implementation fulfills the document's requirements.

```bash
fractary-core docs doc-validate-fulfillment <id> [options]
```

**Arguments:**
- `id` - Document ID

**Options:**
- `--json` - Output as JSON

The document type must have fulfillment validation enabled. Checks acceptance criteria completion, files modified section, testing section, and documentation update timestamps.

**Example:**
```bash
fractary-core docs doc-validate-fulfillment feature-spec-001
```

**Output:**
```
Fulfillment: PARTIAL (50%)

  ! acceptance_criteria: 3/5 criteria met (2 remaining)
  + files_modified: Files to Modify section has content
  ! tests_added: Testing section is missing or empty
  ! docs_updated: No updatedAt timestamp found
```

## Type Commands

### docs type-list

List available document types.

```bash
fractary-core docs type-list [options]
```

**Options:**
- `--json` - Output as JSON

**Example:**
```bash
fractary-core docs type-list
```

**Output:**
```
Available Document Types:

  adr
    Architecture Decision Record
    Records architectural decisions and their context
    Output: docs/decisions

  api
    API Documentation
    API endpoint and interface documentation
    Output: docs/api

  architecture
    Architecture Document
    System architecture documentation
    Output: docs/architecture

Total: 3 types
```

### docs type-info

Get detailed information about a document type.

```bash
fractary-core docs type-info <type> [options]
```

**Arguments:**
- `type` - Document type ID (e.g., `adr`, `api`, `architecture`)

**Options:**
- `--json` - Output as JSON
- `--template` - Show the document template
- `--standards` - Show the documentation standards

**Examples:**
```bash
# Show type info
fractary-core docs type-info adr

# Show template content
fractary-core docs type-info adr --template

# Show standards
fractary-core docs type-info adr --standards
```

**Output:**
```
Architecture Decision Record (adr)

Records architectural decisions and their context

File Naming:
  Pattern: {number}-{slug}.md
  Auto-number: ADR-NNNN

Output Path:
  docs/decisions

Frontmatter Fields:
  Required: title, date, status
  Optional: deciders, tags

Required Sections:
  - Context
  - Decision
  - Consequences

Status Values:
  proposed, accepted, deprecated, superseded (default: proposed)

Use --template to see the document template
Use --standards to see the documentation standards
```

## JSON Output

All commands support `--json` for structured output:

```bash
fractary-core docs doc-get user-guide --json
```

```json
{
  "status": "success",
  "data": {
    "id": "user-guide",
    "content": "# User Guide\n\nWelcome...",
    "format": "markdown",
    "metadata": {
      "title": "User Guide",
      "category": "guides",
      "tags": ["guide", "user"]
    },
    "path": "docs/guides/user-guide.md"
  }
}
```

## Other Interfaces

- **SDK:** [Docs API](/docs/sdk/js/docs.md)
- **MCP:** [Docs Tools](/docs/mcp/server/docs.md)
- **Plugin:** [Docs Plugin](/docs/plugins/docs.md)
- **Configuration:** [Docs Config](/docs/guides/configuration.md#docs-toolset)

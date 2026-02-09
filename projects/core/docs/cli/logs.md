# Logs Module - CLI Reference

Command-line reference for the Logs module. Log management including session capture, CRUD operations, and type-based validation.

## Command Structure

```bash
fractary-core logs <command> [arguments] [options]
```

## Type Management Commands

### logs types

List available log types.

```bash
fractary-core logs types [options]
```

**Options:**
- `--json` - Output as JSON

**Example:**
```bash
fractary-core logs types
```

**Output:**
```
Available log types:

  session     Session development logs
  build       Build output logs
  deployment  Deployment logs
  test        Test execution logs
  debug       Debug investigation logs
  audit       Audit trail logs
  operational Operational logs
  workflow    Workflow execution logs

Total: 8 types
```

### logs type-info

Get log type definition.

```bash
fractary-core logs type-info <type> [options]
```

**Arguments:**
- `type` - Log type ID

**Options:**
- `--json` - Output as JSON

**Example:**
```bash
fractary-core logs type-info session
```

**Output:**
```
Session Log (session)
Development session capture logs

Output Path: .fractary/logs/session
File Pattern: {date}-{slug}.md

Frontmatter:
  Required: title, date, log_type
  Optional: issue_number, model, status

Structure:
  Required sections: Summary, Details
  Optional sections: Decisions, Next Steps

Status: active | completed | abandoned (default: active)

Retention:
  Local: 90 days
  Cloud: 365 days
```

### logs validate

Validate a log file against its type schema.

```bash
fractary-core logs validate <file> [options]
```

**Arguments:**
- `file` - Path to log file

**Options:**
- `--log-type <type>` - Override log type (auto-detected from frontmatter)
- `--json` - Output as JSON

**Examples:**
```bash
# Validate with auto-detected type
fractary-core logs validate .fractary/logs/session/2024-01-15-auth-work.md

# Validate with explicit type
fractary-core logs validate my-log.md --log-type session
```

**Output (valid):**
```
Valid session log
```

**Output (invalid):**
```
Invalid session log

Errors:
  - Missing required field: title
  - Invalid status "unknown". Allowed: active, completed, abandoned

Warnings:
  - Missing recommended section: Summary
```

## Session Capture Commands

### logs capture

Start session capture.

```bash
fractary-core logs capture <issue_number> [options]
```

**Arguments:**
- `issue_number` - Issue number to associate with session

**Options:**
- `--model <model>` - Model being used
- `--json` - Output as JSON

**Example:**
```bash
fractary-core logs capture 123 --model claude-3
```

**Output:**
```
Started session capture for issue #123
  Session ID: SESSION-20240115-001
```

### logs stop

Stop session capture.

```bash
fractary-core logs stop [options]
```

**Options:**
- `--json` - Output as JSON

**Example:**
```bash
fractary-core logs stop
```

**Output:**
```
Stopped session capture
  Log saved to: .fractary/logs/session/2024-01-15-session.md
```

## CRUD Commands

### logs write

Write a log entry.

```bash
fractary-core logs write [options]
```

**Options:**
- `--type <type>` - Log type: `session`, `build`, `deployment`, `test`, `debug`, `audit`, `operational`, `workflow` (required)
- `--title <title>` - Log title (required)
- `--content <text>` - Log content (required)
- `--issue <number>` - Associated issue number
- `--json` - Output as JSON

**Examples:**
```bash
# Write session log
fractary-core logs write \
  --type session \
  --title "Development Session" \
  --content "Implemented auth module"

# Write build log linked to issue
fractary-core logs write \
  --type build \
  --title "Build Log" \
  --content "Build succeeded" \
  --issue 123
```

### logs read

Read a log entry.

```bash
fractary-core logs read <id> [options]
```

**Arguments:**
- `id` - Log ID

**Options:**
- `--json` - Output as JSON

**Example:**
```bash
fractary-core logs read LOG-20240101-001
```

### logs search

Search logs.

```bash
fractary-core logs search [options]
```

**Options:**
- `--query <text>` - Search query (required)
- `--type <type>` - Filter by type
- `--issue <number>` - Filter by issue number
- `--regex` - Use regex for search
- `--limit <n>` - Limit results (default: `10`)
- `--json` - Output as JSON

**Examples:**
```bash
# Search for errors
fractary-core logs search --query "error" --type session

# Regex search
fractary-core logs search --query "auth.*fail" --regex

# Search in specific issue
fractary-core logs search --query "timeout" --issue 123 --limit 5
```

### logs list

List logs.

```bash
fractary-core logs list [options]
```

**Options:**
- `--type <type>` - Filter by type
- `--status <status>` - Filter by status
- `--issue <number>` - Filter by issue number
- `--limit <n>` - Limit results (default: `20`)
- `--json` - Output as JSON

**Examples:**
```bash
# List recent logs
fractary-core logs list

# List session logs
fractary-core logs list --type session --limit 10

# List logs for issue #123
fractary-core logs list --issue 123
```

### logs archive

Archive old logs.

```bash
fractary-core logs archive [options]
```

**Options:**
- `--max-age <days>` - Archive logs older than N days (default: `90`)
- `--compress` - Compress archived logs
- `--json` - Output as JSON

**Examples:**
```bash
# Archive logs older than 90 days
fractary-core logs archive

# Archive older than 30 days with compression
fractary-core logs archive --max-age 30 --compress
```

### logs delete

Delete a log entry.

```bash
fractary-core logs delete <id> [options]
```

**Arguments:**
- `id` - Log ID

**Options:**
- `--json` - Output as JSON

**Example:**
```bash
fractary-core logs delete LOG-20240101-001
```

## JSON Output

All commands support `--json` for structured output:

```bash
fractary-core logs list --type session --json
```

```json
{
  "status": "success",
  "data": [
    {
      "id": "LOG-20240115-001",
      "type": "session",
      "title": "Development Session",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Other Interfaces

- **SDK:** [Logs API](/docs/sdk/js/logs.md)
- **MCP:** [Logs Tools](/docs/mcp/server/logs.md)
- **Plugin:** [Logs Plugin](/docs/plugins/logs.md)
- **Configuration:** [Logs Config](/docs/guides/configuration.md#logs-toolset)

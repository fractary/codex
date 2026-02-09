# Logs Plugin - Claude Code Reference

Claude Code plugin reference for the Logs toolset (`fractary-logs`). Session and operational logging.

## Overview

The Logs plugin provides slash commands and agents for capturing, searching, and analyzing development session logs directly from Claude Code.

## Installation

Add to your Claude Code settings:

```json
{
  "plugins": ["fractary-logs"]
}
```

## Configuration

The plugin uses configuration from `.fractary/config.yaml`:

```yaml
logs:
  schema_version: "2.0"
  storage:
    local_path: /logs
  session_logging:
    enabled: true
    redact_sensitive: true
```

## Slash Commands

### /logs-capture

Start capturing a conversation session for an issue.

**Usage:**
```
/logs-capture [options]
```

**Options:**
- `--issue <number>` - Associated issue number
- `--title <text>` - Session title
- `--redact` - Redact sensitive data

**Example:**
```
/logs-capture --issue 123 --title "Auth implementation session" --redact
```

This command delegates to the `fractary-logs:logs-capture` agent.

### /logs-stop

Stop active session capture.

**Usage:**
```
/logs-stop [options]
```

**Options:**
- `--summary <text>` - Add session summary

**Example:**
```
/logs-stop --summary "Completed auth middleware implementation"
```

### /logs-read

Read log files for an issue.

**Usage:**
```
/logs-read <log-id>
```

**Example:**
```
/logs-read LOG-20240115-001
```

### /logs-search

Search across logs.

**Usage:**
```
/logs-search "<query>" [options]
```

**Options:**
- `--type <type>` - Filter by log type
- `--issue <number>` - Filter by issue
- `--since <date>` - Start date

**Example:**
```
/logs-search "authentication error" --type session --issue 123
```

### /logs-analyze

Analyze logs for patterns, errors, or time spent.

**Usage:**
```
/logs-analyze [options]
```

**Options:**
- `--type <type>` - Log type to analyze
- `--issue <number>` - Analyze logs for issue
- `--report <type>` - Report: summary, errors, time

**Example:**
```
/logs-analyze --issue 123 --report time
```

This command delegates to the `fractary-logs:logs-analyze` agent.

### /logs-archive

Archive logs for a completed issue.

**Usage:**
```
/logs-archive [options]
```

**Options:**
- `--issue <number>` - Archive logs for issue
- `--older-than <days>` - Archive logs older than days

**Example:**
```
/logs-archive --issue 123
```

### /logs-cleanup

Clean up old logs based on age threshold.

**Usage:**
```
/logs-cleanup [options]
```

**Options:**
- `--older-than <days>` - Delete logs older than days
- `--dry-run` - Preview without deleting

**Example:**
```
/logs-cleanup --older-than 90 --dry-run
```

### /logs-log

Log a specific message or decision to an issue's log.

**Usage:**
```
/logs-log "<message>" [options]
```

**Options:**
- `--issue <number>` - Associated issue
- `--type <type>` - Log type

**Example:**
```
/logs-log "Decided to use Redis for token storage" --issue 123
```

## Agents

### fractary-logs:logs-capture

Starts capturing a conversation session for an issue.

**Triggered by:**
- `/logs-capture` command
- Proactively when user mentions starting logging or recording

### fractary-logs:logs-stop

Stops active session capture.

**Triggered by:**
- `/logs-stop` command
- Proactively when user mentions stopping or ending session

### fractary-logs:logs-analyze

Analyzes logs for patterns, errors, or time spent.

**Triggered by:**
- `/logs-analyze` command
- Proactively when user mentions analyzing logs or time analysis

**Capabilities:**
- Pattern detection
- Error aggregation
- Time tracking by phase
- Trend analysis

### fractary-logs:logs-read

Reads log files for an issue.

### fractary-logs:logs-search

Searches across logs.

### fractary-logs:logs-archive

Archives logs for completed issues.

### fractary-logs:logs-cleanup

Cleans up old logs.

### fractary-logs:logs-audit

Audits logs in project and generates management plan.

**Triggered by:**
- Proactively when user mentions audit, health check, or log compliance

### fractary-logs:logs-log

Logs a specific message or decision.

## Usage Examples

### Session Capture Workflow

```
User: Start capturing this session for issue #123

Claude: [Uses fractary-logs:logs-capture agent]

Session capture started:
- Session ID: SESSION-20240115-001
- Issue: #123
- Redaction: enabled

I'll capture our conversation. Use /logs-stop when done.

[Development session continues...]

User: We're done, stop the capture

Claude: [Uses fractary-logs:logs-stop agent]

Session capture stopped:
- Session ID: SESSION-20240115-001
- Duration: 2h 15m
- Messages: 45
- Saved to: .fractary/logs/session/SESSION-20240115-001.md
```

### Analyzing Time Spent

```
User: How much time have I spent on issue #123?

Claude: [Uses fractary-logs:logs-analyze agent]

## Time Analysis for Issue #123

**Total Time**: 8h 45m across 5 sessions

### By FABER Phase
| Phase | Duration | % |
|-------|----------|---|
| Frame | 45m | 9% |
| Architect | 1h 30m | 17% |
| Build | 5h 15m | 60% |
| Evaluate | 1h 15m | 14% |

### By Date
- Jan 10: 2h 30m
- Jan 11: 3h 45m
- Jan 12: 2h 30m

### Observations
- Most time spent in Build phase (typical for feature work)
- Evaluate phase took longer than average (complex testing)
```

### Searching for Errors

```
User: Find all errors in my recent sessions

Claude: /logs-search "error" --type session --since 2024-01-01

## Search Results for "error"

Found 3 matches in 2 logs:

**SESSION-20240115-001** (Issue #123)
- Line 45: "Encountered authentication error during login"
- Line 78: "Fixed error by updating token handling"

**SESSION-20240112-003** (Issue #120)
- Line 12: "Build error: missing dependency lodash"

Would you like me to analyze these errors for patterns?
```

### Log Cleanup

```
User: Clean up old logs

Claude: /logs-cleanup --older-than 90 --dry-run

## Cleanup Preview

Would delete **15 logs** (2.3 MB):
- 8 session logs
- 4 build logs
- 3 test logs

Oldest log: 2023-10-15

Run without --dry-run to execute deletion.

User: Go ahead and delete them

Claude: /logs-cleanup --older-than 90

Cleanup complete:
- Deleted: 15 logs
- Freed: 2.3 MB
```

## Other Interfaces

- **SDK:** [Logs API](/docs/sdk/js/logs.md)
- **CLI:** [Logs Commands](/docs/cli/logs.md)
- **MCP:** [Logs Tools](/docs/mcp/server/logs.md)
- **Configuration:** [Logs Config](/docs/guides/configuration.md#logs-toolset)

# Logs Toolset - MCP Tools Reference

MCP tools reference for the Logs toolset. 5 tools for session and operational logging.

## Tool Naming Convention

```
fractary_logs_{action}
```

## Log Tools

### fractary_logs_capture

Capture a log entry (session, build, deployment, etc.).

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | Log type: `session`, `build`, `deployment`, `test`, `debug`, `audit`, `operational`, `workflow` |
| `title` | string | Yes | Log title |
| `content` | string | Yes | Log content |
| `issue_number` | number | No | Issue number to associate with this log |
| `metadata` | object | No | Additional metadata for the log entry |

**Example:**
```json
{
  "type": "session",
  "title": "Feature Development Session",
  "content": "Session transcript...",
  "issue_number": 123,
  "metadata": {
    "model": "claude-3.5-sonnet",
    "duration": 3600
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "LOG-20240115-001",
    "type": "session",
    "title": "Feature Development Session",
    "path": ".fractary/logs/session/LOG-20240115-001.md"
  }
}
```

### fractary_logs_read

Read a specific log entry.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `log_id` | string | Yes | Log entry ID or path |

**Example:**
```json
{
  "log_id": "LOG-20240115-001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "LOG-20240115-001",
    "type": "session",
    "title": "Feature Development Session",
    "content": "Session transcript...",
    "metadata": {
      "issue_number": 123,
      "duration": 3600
    }
  }
}
```

### fractary_logs_search

Search log entries.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `type` | string | No | Filter by log type: `session`, `build`, `deployment`, `test`, `debug`, `audit`, `operational`, `workflow` |
| `issue_number` | number | No | Filter by issue number |
| `since` | string | No | Start date (ISO 8601 format) |
| `until` | string | No | End date (ISO 8601 format) |
| `regex` | boolean | No | Use regex for query matching |

**Example:**
```json
{
  "query": "authentication error",
  "type": "session",
  "regex": false
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "log_id": "LOG-20240115-001",
      "title": "Feature Development Session",
      "matches": [
        {
          "line": 45,
          "content": "Encountered authentication error during login",
          "context": "...attempting to login with invalid token..."
        }
      ],
      "score": 0.95
    }
  ]
}
```

### fractary_logs_list

List log entries.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | No | Filter by log type: `session`, `build`, `deployment`, `test`, `debug`, `audit`, `operational`, `workflow` |
| `status` | string | No | Filter by log status: `active`, `completed`, `stopped`, `success`, `failure`, `error` |
| `issue_number` | number | No | Filter by issue number |
| `since` | string | No | Start date (ISO 8601 format) |
| `until` | string | No | End date (ISO 8601 format) |
| `limit` | number | No | Maximum number of results |

**Example:**
```json
{
  "type": "session",
  "status": "completed",
  "issue_number": 123,
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "LOG-20240115-001",
      "type": "session",
      "title": "Feature Development Session",
      "status": "completed",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### fractary_logs_archive

Archive old log entries.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `max_age_days` | number | No | Archive logs older than this many days |
| `compress` | boolean | No | Compress archived logs |

**Example:**
```json
{
  "max_age_days": 90,
  "compress": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "archived": 15,
    "compressed": true,
    "size": "2.3 MB"
  }
}
```

## Tool Summary

| Tool | Description |
|------|-------------|
| `fractary_logs_capture` | Capture a log entry (session, build, deployment, etc.) |
| `fractary_logs_read` | Read a specific log entry |
| `fractary_logs_search` | Search log entries |
| `fractary_logs_list` | List log entries |
| `fractary_logs_archive` | Archive old log entries |

## Error Responses

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Log entry LOG-INVALID not found"
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `NOT_FOUND` | Log entry not found |
| `VALIDATION_ERROR` | Invalid parameters |

## Other Interfaces

- **SDK:** [Logs API](/docs/sdk/js/logs.md)
- **CLI:** [Logs Commands](/docs/cli/logs.md)
- **Plugin:** [Logs Plugin](/docs/plugins/logs.md)

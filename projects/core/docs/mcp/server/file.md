# File Toolset - MCP Tools Reference

MCP tools reference for the File toolset. 7 tools for file storage operations.

## Tool Naming Convention

```
fractary_file_{action}
```

## File Tools

### fractary_file_read

Read a file.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Path to the file to read |
| `encoding` | string | No | File encoding (default: utf-8) |

**Example:**
```json
{
  "path": "config.json"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "path": "config.json",
    "content": "{\"key\": \"value\"}",
    "size": 18
  }
}
```

### fractary_file_write

Write content to a file.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Path to the file to write |
| `content` | string | Yes | Content to write |
| `encoding` | string | No | File encoding (default: utf-8) |
| `overwrite` | boolean | No | Whether to overwrite if file exists |

**Example:**
```json
{
  "path": "config.json",
  "content": "{\"key\": \"value\"}",
  "overwrite": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "path": "config.json",
    "fullPath": "/project/data/config.json",
    "size": 18
  }
}
```

### fractary_file_list

List files in a directory.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | No | Directory path to list |
| `pattern` | string | No | Glob pattern to filter files |
| `recursive` | boolean | No | Whether to list recursively |

**Example:**
```json
{
  "path": "data/",
  "recursive": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "path": "data/config.json",
        "name": "config.json",
        "size": 1234,
        "isDirectory": false,
        "modifiedAt": "2024-01-15T10:30:00Z"
      },
      {
        "path": "data/exports/",
        "name": "exports",
        "isDirectory": true
      }
    ]
  }
}
```

### fractary_file_delete

Delete a file.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Path to the file to delete |

**Example:**
```json
{
  "path": "temp.json"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "path": "temp.json",
    "deleted": true
  }
}
```

### fractary_file_exists

Check if a file exists.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Path to check |

**Example:**
```json
{
  "path": "config.json"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "path": "config.json",
    "exists": true
  }
}
```

### fractary_file_copy

Copy a file.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `source` | string | Yes | Source file path |
| `destination` | string | Yes | Destination file path |
| `overwrite` | boolean | No | Whether to overwrite if destination exists |

**Example:**
```json
{
  "source": "config.json",
  "destination": "config.backup.json"
}
```

### fractary_file_move

Move a file.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `source` | string | Yes | Source file path |
| `destination` | string | Yes | Destination file path |
| `overwrite` | boolean | No | Whether to overwrite if destination exists |

**Example:**
```json
{
  "source": "old-config.json",
  "destination": "config.json"
}
```

## Tool Summary

| Tool | Description |
|------|-------------|
| `fractary_file_read` | Read a file |
| `fractary_file_write` | Write content to a file |
| `fractary_file_list` | List files in a directory |
| `fractary_file_delete` | Delete a file |
| `fractary_file_exists` | Check if a file exists |
| `fractary_file_copy` | Copy a file |
| `fractary_file_move` | Move a file |

## Error Responses

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "File 'missing.json' not found"
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `NOT_FOUND` | File or directory not found |
| `ALREADY_EXISTS` | File exists (when overwrite is not set) |
| `PERMISSION_DENIED` | Insufficient permissions |
| `PATH_TRAVERSAL` | Path traversal attempt detected |

## Other Interfaces

- **SDK:** [File API](/docs/sdk/js/file.md)
- **CLI:** [File Commands](/docs/cli/file.md)
- **Plugin:** [File Plugin](/docs/plugins/file.md)

# Docs Toolset - MCP Tools Reference

MCP tools reference for the Docs toolset. 7 tools for documentation management.

## Tool Naming Convention

```
fractary_docs_{action}
```

## Document Tools

### fractary_docs_create

Create documentation.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Document ID |
| `title` | string | Yes | Document title |
| `content` | string | Yes | Document content |
| `type` | string | No | Document type |
| `tags` | string[] | No | Document tags |

**Example:**
```json
{
  "id": "user-guide",
  "title": "User Guide",
  "content": "# User Guide\n\nWelcome to the application...",
  "type": "guide",
  "tags": ["guide", "user"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-guide",
    "title": "User Guide",
    "path": "docs/guides/user-guide.md"
  }
}
```

### fractary_docs_read

Read documentation content.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Document ID |

**Example:**
```json
{
  "id": "user-guide"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-guide",
    "title": "User Guide",
    "content": "# User Guide\n\nWelcome...",
    "metadata": {
      "tags": ["guide", "user"],
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  }
}
```

### fractary_docs_update

Update documentation.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Document ID |
| `title` | string | No | New document title |
| `content` | string | No | New document content |
| `tags` | string[] | No | New document tags |

**Example:**
```json
{
  "id": "user-guide",
  "content": "# User Guide\n\nUpdated content...",
  "tags": ["guide", "user", "v2"]
}
```

### fractary_docs_delete

Delete documentation.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Document ID |

**Example:**
```json
{
  "id": "outdated-doc"
}
```

### fractary_docs_list

List documentation.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tags` | string[] | No | Filter by tags |
| `author` | string | No | Filter by author |
| `limit` | number | No | Maximum number of results |

**Example:**
```json
{
  "tags": ["guide"],
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-guide",
      "title": "User Guide",
      "updatedAt": "2024-01-15T10:00:00Z"
    },
    {
      "id": "getting-started",
      "title": "Getting Started",
      "updatedAt": "2024-01-10T08:00:00Z"
    }
  ]
}
```

### fractary_docs_search

Search documentation.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | No | Search text |
| `tags` | string[] | No | Filter by tags |
| `author` | string | No | Filter by author |
| `limit` | number | No | Maximum number of results |

**Example:**
```json
{
  "text": "authentication",
  "tags": ["api"]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "api-auth",
      "title": "Authentication API",
      "excerpt": "...implements JWT authentication for secure access...",
      "score": 0.95
    }
  ]
}
```

### fractary_docs_export

Export documentation.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Document ID |
| `format` | string | No | Export format: `markdown`, `html`, `pdf` |

**Example:**
```json
{
  "id": "user-guide",
  "format": "html"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-guide",
    "format": "html",
    "content": "<html>..."
  }
}
```

## Tool Summary

| Tool | Description |
|------|-------------|
| `fractary_docs_create` | Create documentation |
| `fractary_docs_read` | Read documentation content |
| `fractary_docs_update` | Update documentation |
| `fractary_docs_delete` | Delete documentation |
| `fractary_docs_list` | List documentation |
| `fractary_docs_search` | Search documentation |
| `fractary_docs_export` | Export documentation |

## Error Responses

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Document 'missing-doc' not found"
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `NOT_FOUND` | Document not found |
| `VALIDATION_ERROR` | Invalid parameters |
| `ALREADY_EXISTS` | Document ID already exists |

## Other Interfaces

- **SDK:** [Docs API](/docs/sdk/js/docs.md)
- **CLI:** [Docs Commands](/docs/cli/docs.md)
- **Plugin:** [Docs Plugin](/docs/plugins/docs.md)

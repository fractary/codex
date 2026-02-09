# Spec Toolset - MCP Tools Reference

MCP tools reference for the Spec toolset. 5 tools for technical specification management.

## Tool Naming Convention

```
fractary_spec_{action}
```

## Specification Tools

### fractary_spec_create

Create a new specification document.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Title of the specification |
| `template` | string | No | Template type: `basic`, `feature`, `bug`, `infrastructure`, `api` |
| `work_id` | string | No | Work item ID to link to this spec |
| `context` | string | No | Context or background information for the specification |

**Example:**
```json
{
  "title": "API Authentication Design",
  "template": "api",
  "work_id": "123",
  "context": "Users need secure token-based access to the REST API"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "SPEC-20240115",
    "title": "API Authentication Design",
    "path": "specs/SPEC-20240115-api-authentication-design.md",
    "template": "api",
    "status": "draft"
  }
}
```

### fractary_spec_read

Read a specification document.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `spec_id` | string | Yes | Specification ID or path to read |

**Example:**
```json
{
  "spec_id": "SPEC-20240115"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "SPEC-20240115",
    "title": "API Authentication Design",
    "content": "# API Authentication Design\n\n## Problem Statement\n...",
    "metadata": {
      "author": "developer1",
      "status": "draft",
      "version": "1.0"
    }
  }
}
```

### fractary_spec_list

List specification documents.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `work_id` | string | No | Filter by work item ID |
| `status` | string | No | Filter by specification status |
| `template` | string | No | Filter by template type: `basic`, `feature`, `bug`, `infrastructure`, `api` |

**Example:**
```json
{
  "status": "draft",
  "template": "feature"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "SPEC-20240115",
      "title": "API Authentication Design",
      "template": "api",
      "status": "draft"
    },
    {
      "id": "SPEC-20240110",
      "title": "Database Migration",
      "template": "infrastructure",
      "status": "approved"
    }
  ]
}
```

### fractary_spec_validate

Validate a specification document.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `spec_id` | string | Yes | Specification ID or path to validate |

**Example:**
```json
{
  "spec_id": "SPEC-20240115"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "partial",
    "score": 75,
    "checks": [
      { "name": "has_title", "passed": true, "message": "Title present" },
      { "name": "has_problem_statement", "passed": true, "message": "Problem statement present" },
      { "name": "has_acceptance_criteria", "passed": false, "message": "Missing acceptance criteria" }
    ],
    "suggestions": [
      "Add specific acceptance criteria with measurable outcomes",
      "Consider adding rollout plan section"
    ]
  }
}
```

### fractary_spec_refine

Refine a specification with feedback.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `spec_id` | string | Yes | Specification ID or path to refine |
| `feedback` | string | No | Feedback or refinement instructions |

**Example:**
```json
{
  "spec_id": "SPEC-20240115",
  "feedback": "Needs more detail on error handling and rate limiting"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "category": "acceptance",
        "question": "What are the specific acceptance criteria?",
        "context": "The spec describes the feature but lacks measurable outcomes.",
        "priority": "high"
      },
      {
        "category": "error_handling",
        "question": "What error handling is required?",
        "context": "The API design doesn't specify error response formats.",
        "priority": "high"
      }
    ]
  }
}
```

## Tool Summary

| Tool | Description |
|------|-------------|
| `fractary_spec_create` | Create a new specification document |
| `fractary_spec_read` | Read a specification document |
| `fractary_spec_list` | List specification documents |
| `fractary_spec_validate` | Validate a specification document |
| `fractary_spec_refine` | Refine a specification with feedback |

## Error Responses

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Specification SPEC-INVALID not found"
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `NOT_FOUND` | Specification not found |
| `VALIDATION_ERROR` | Invalid parameters |
| `ALREADY_EXISTS` | Specification ID already exists |
| `TEMPLATE_NOT_FOUND` | Template not found |

## Other Interfaces

- **SDK:** [Spec API](/docs/sdk/js/spec.md)
- **CLI:** [Spec Commands](/docs/cli/spec.md)
- **Plugin:** [Spec Plugin](/docs/plugins/spec.md)

# Work Toolset - MCP Tools Reference

MCP tools reference for the Work toolset. 19 tools for work tracking across GitHub Issues, Jira, and Linear.

## Tool Naming Convention

```
fractary_work_{resource}_{action}
```

## Issue Tools

### fractary_work_issue_fetch

Fetch details of a work item (issue, ticket, task) from the configured work tracker.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issue_number` | string | Yes | Issue number or ID to fetch |

**Example:**
```json
{
  "issue_number": "123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "number": 123,
    "title": "Add user authentication",
    "body": "Implement JWT-based authentication",
    "state": "open",
    "labels": [{"name": "enhancement"}],
    "assignees": ["developer1"],
    "url": "https://github.com/myorg/myrepo/issues/123"
  }
}
```

### fractary_work_issue_create

Create a new work item (issue, ticket, task) in the configured work tracker.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Title of the issue |
| `body` | string | No | Body/description of the issue |
| `type` | string | No | Type of work item: `feature`, `bug`, `chore`, `task` |
| `labels` | string[] | No | Labels to apply |
| `assignee` | string | No | User to assign the issue to |
| `milestone` | string | No | Milestone to associate with |

**Example:**
```json
{
  "title": "Add user authentication",
  "body": "Implement JWT-based authentication",
  "type": "feature",
  "labels": ["enhancement", "priority:high"],
  "assignee": "developer1"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "number": 123,
    "title": "Add user authentication",
    "state": "open",
    "url": "https://github.com/myorg/myrepo/issues/123"
  }
}
```

### fractary_work_issue_update

Update a work item.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issue_number` | string | Yes | Issue number or ID to update |
| `title` | string | No | New title |
| `body` | string | No | New body/description |
| `state` | string | No | New state: `open`, `closed` |

**Example:**
```json
{
  "issue_number": "123",
  "title": "Add user authentication (updated)",
  "state": "closed"
}
```

### fractary_work_issue_assign

Assign an issue to a user.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issue_number` | string | Yes | Issue number or ID |
| `assignee` | string | Yes | Username to assign to |

**Example:**
```json
{
  "issue_number": "123",
  "assignee": "developer1"
}
```

### fractary_work_issue_unassign

Remove assignee from an issue.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issue_number` | string | Yes | Issue number or ID |

**Example:**
```json
{
  "issue_number": "123"
}
```

### fractary_work_issue_close

Close an issue.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issue_number` | string | Yes | Issue number or ID |
| `comment` | string | No | Optional closing comment |

**Example:**
```json
{
  "issue_number": "123",
  "comment": "Fixed in PR #42"
}
```

### fractary_work_issue_reopen

Reopen a closed issue.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issue_number` | string | Yes | Issue number or ID |
| `comment` | string | No | Optional reopening comment |

**Example:**
```json
{
  "issue_number": "123",
  "comment": "Reopening due to regression"
}
```

### fractary_work_issue_search

Search issues.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | No | Search query |
| `state` | string | No | Filter by state: `open`, `closed`, `all` |
| `labels` | string[] | No | Filter by labels |
| `assignee` | string | No | Filter by assignee |
| `milestone` | string | No | Filter by milestone |
| `since` | string | No | Filter by creation date (ISO 8601 format) |

**Example:**
```json
{
  "query": "authentication",
  "state": "open",
  "labels": ["bug"]
}
```

### fractary_work_issue_classify

Classify the work type of an issue.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issue_number` | string | Yes | Issue number or ID |

**Example:**
```json
{
  "issue_number": "123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "issue_number": "123",
    "classification": "feature",
    "confidence": 0.92
  }
}
```

## Comment Tools

### fractary_work_comment_create

Add a comment to an issue.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issue_number` | string | Yes | Issue number or ID |
| `body` | string | Yes | Comment text |
| `faber_context` | string | No | FABER workflow context: `frame`, `architect`, `build`, `evaluate`, `release` |

**Example:**
```json
{
  "issue_number": "123",
  "body": "Investigation complete, root cause identified",
  "faber_context": "architect"
}
```

### fractary_work_comment_list

List comments on an issue.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issue_number` | string | Yes | Issue number or ID |
| `limit` | number | No | Maximum number of comments |
| `since` | string | No | Only comments after this date (ISO 8601) |

**Example:**
```json
{
  "issue_number": "123",
  "limit": 10
}
```

## Label Tools

### fractary_work_label_add

Add labels to an issue.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issue_number` | string | Yes | Issue number or ID |
| `labels` | string[] | Yes | Labels to add |

**Example:**
```json
{
  "issue_number": "123",
  "labels": ["bug", "priority:high"]
}
```

### fractary_work_label_remove

Remove labels from an issue.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issue_number` | string | Yes | Issue number or ID |
| `labels` | string[] | Yes | Labels to remove |

**Example:**
```json
{
  "issue_number": "123",
  "labels": ["wontfix"]
}
```

### fractary_work_label_set

Set labels on an issue (replace all existing labels).

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issue_number` | string | Yes | Issue number or ID |
| `labels` | string[] | Yes | Labels to set |

**Example:**
```json
{
  "issue_number": "123",
  "labels": ["enhancement", "v2"]
}
```

### fractary_work_label_list

List labels.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issue_number` | string | No | Optional: list labels for a specific issue. If omitted, lists all repository labels |

**Example:**
```json
{
  "issue_number": "123"
}
```

## Milestone Tools

### fractary_work_milestone_create

Create a milestone.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Milestone title |
| `description` | string | No | Milestone description |
| `due_on` | string | No | Due date (ISO 8601 format) |

**Example:**
```json
{
  "title": "v1.0.0",
  "description": "Initial release",
  "due_on": "2024-03-01T00:00:00Z"
}
```

### fractary_work_milestone_list

List milestones.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `state` | string | No | Filter by state: `open`, `closed`, `all` |

**Example:**
```json
{
  "state": "open"
}
```

### fractary_work_milestone_set

Set milestone on an issue.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issue_number` | string | Yes | Issue number or ID |
| `milestone` | string | Yes | Milestone title |

**Example:**
```json
{
  "issue_number": "123",
  "milestone": "v1.0.0"
}
```

### fractary_work_milestone_remove

Remove milestone from an issue.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issue_number` | string | Yes | Issue number or ID |

**Example:**
```json
{
  "issue_number": "123"
}
```

## Tool Summary

| Tool | Description |
|------|-------------|
| `fractary_work_issue_fetch` | Fetch details of a work item |
| `fractary_work_issue_create` | Create a new work item |
| `fractary_work_issue_update` | Update a work item |
| `fractary_work_issue_assign` | Assign an issue to a user |
| `fractary_work_issue_unassign` | Remove assignee from an issue |
| `fractary_work_issue_close` | Close an issue |
| `fractary_work_issue_reopen` | Reopen a closed issue |
| `fractary_work_issue_search` | Search issues |
| `fractary_work_issue_classify` | Classify the work type of an issue |
| `fractary_work_comment_create` | Add a comment to an issue |
| `fractary_work_comment_list` | List comments on an issue |
| `fractary_work_label_add` | Add labels to an issue |
| `fractary_work_label_remove` | Remove labels from an issue |
| `fractary_work_label_set` | Set labels on an issue (replace all) |
| `fractary_work_label_list` | List labels |
| `fractary_work_milestone_create` | Create a milestone |
| `fractary_work_milestone_list` | List milestones |
| `fractary_work_milestone_set` | Set milestone on an issue |
| `fractary_work_milestone_remove` | Remove milestone from an issue |

## Error Responses

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Issue #999 not found"
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `NOT_FOUND` | Issue or resource not found |
| `UNAUTHORIZED` | Authentication failed |
| `FORBIDDEN` | Insufficient permissions |
| `VALIDATION_ERROR` | Invalid parameters |
| `RATE_LIMITED` | API rate limit exceeded |

## Other Interfaces

- **SDK:** [Work API](/docs/sdk/js/work.md)
- **CLI:** [Work Commands](/docs/cli/work.md)
- **Plugin:** [Work Plugin](/docs/plugins/work.md)

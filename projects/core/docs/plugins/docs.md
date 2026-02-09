# Docs Plugin - Claude Code Reference

Claude Code plugin reference for the Docs toolset (`fractary-docs`). Documentation management.

## Overview

The Docs plugin provides slash commands and agents for creating, validating, and auditing documentation directly from Claude Code.

## Installation

Add to your Claude Code settings:

```json
{
  "plugins": ["fractary-docs"]
}
```

## Configuration

The plugin uses configuration from `.fractary/config.yaml`:

```yaml
docs:
  schema_version: "1.1"
  custom_templates_path: .fractary/docs/templates/manifest.yaml  # optional
```

**Note:** The 11 core document types are always available from `templates/docs/`. The `custom_templates_path` is only needed to add project-specific types or override core types. Each type is defined by `type.yaml`, `template.md`, and `standards.md` files.

## Slash Commands

### /docs-write

Write documentation with AI assistance.

**Usage:**
```
/docs-write [options]
```

**Options:**
- `--type <type>` - Document type: adr, api, guide, readme
- `--title <text>` - Document title
- `--source <path>` - Source code to document

**Example:**
```
/docs-write --type api --title "User API" --source src/api/user/
```

This command delegates to the `fractary-docs:docs-write` agent.

### /docs-list

List documentation files.

**Usage:**
```
/docs-list [options]
```

**Options:**
- `--type <type>` - Filter by type
- `--tags <tags>` - Filter by tags

**Example:**
```
/docs-list --type guide
```

This command delegates to the `fractary-docs:docs-list` agent.

### /docs-validate

Validate documentation against type-specific rules.

**Usage:**
```
/docs-validate <doc-id>
```

**Example:**
```
/docs-validate api-auth
```

This command delegates to the `fractary-docs:docs-validate` agent.

### /docs-audit

Audit documentation quality and find gaps.

**Usage:**
```
/docs-audit [options]
```

**Options:**
- `--report <type>` - Report: summary, gaps, quality

**Example:**
```
/docs-audit --report gaps
```

This command delegates to the `fractary-docs:docs-audit` agent.

### /docs-check-consistency

Check if documentation is consistent with code changes.

**Usage:**
```
/docs-check-consistency [options]
```

**Options:**
- `--source <dir>` - Source directory to check

**Example:**
```
/docs-check-consistency --source src/
```

This command delegates to the `fractary-docs:docs-check-consistency` agent.

## Agents

### fractary-docs:docs-write

Creates or updates documentation with AI assistance.

**Triggered by:**
- `/docs-write` command
- Proactively when user mentions writing, creating, or documenting

**Capabilities:**
- Generates documentation from source code
- Follows document type templates
- Maintains consistent style
- Links to related docs

### fractary-docs:docs-list

Lists documentation files.

**Triggered by:**
- `/docs-list` command
- Proactively when user asks what docs exist

### fractary-docs:docs-validate

Validates documentation against type-specific rules.

**Triggered by:**
- `/docs-validate` command
- Proactively when user mentions validating or checking docs

**Capabilities:**
- Checks required sections
- Validates format compliance
- Reports errors and warnings

### fractary-docs:docs-audit

Audits documentation quality, finds gaps, and identifies issues.

**Triggered by:**
- `/docs-audit` command
- Proactively when user mentions auditing docs, doc quality, or finding gaps

**Capabilities:**
- Identifies missing documentation
- Detects incomplete sections
- Calculates coverage metrics
- Provides recommendations

### fractary-docs:docs-check-consistency

Checks if documentation is consistent with code changes.

**Triggered by:**
- `/docs-check-consistency` command
- Proactively when user mentions docs being out of date or stale

**Capabilities:**
- Compares docs to source code
- Detects API changes
- Identifies outdated references
- Reports inconsistencies

## Usage Examples

### Writing Documentation

```
User: Document the authentication API

Claude: [Uses fractary-docs:docs-write agent]

I'll document the authentication API. Let me analyze the source code...

## Generated Documentation: Authentication API

### Endpoints

#### POST /auth/login
Authenticates a user and returns a JWT token.

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "string",
  "expiresIn": 86400
}
```

#### POST /auth/logout
Invalidates the current session.

...

Documentation saved to: docs/api/auth.md
```

### Auditing Documentation

```
User: Audit our documentation for gaps

Claude: [Uses fractary-docs:docs-audit agent]

## Documentation Audit Report

### Coverage Summary
- **API Endpoints**: 75% documented (15/20)
- **Components**: 60% documented (12/20)
- **Guides**: 80% complete

### Missing Documentation
| Item | Type | Priority |
|------|------|----------|
| src/auth/middleware | API | High |
| src/api/handlers | API | High |
| Deployment process | Guide | Medium |

### Incomplete Documentation
| Document | Issue |
|----------|-------|
| api-auth.md | Missing error handling section |
| user-guide.md | Outdated setup instructions |

### Recommendations
1. Add documentation for auth middleware (high priority)
2. Document API handlers
3. Update user guide setup section

Would you like me to generate documentation for any of these gaps?
```

### Checking Consistency

```
User: Check if docs are up to date with the code

Claude: [Uses fractary-docs:docs-check-consistency agent]

## Documentation Consistency Check

Comparing documentation against src/...

### Outdated Documentation

**api-auth.md**
- ❌ Function `authenticate()` signature changed
  - Doc: `authenticate(token: string)`
  - Code: `authenticate(token: string, options?: AuthOptions)`
- ❌ New parameter `refreshToken` not documented

**user-guide.md**
- ⚠️ References removed config option `legacyMode`
- ⚠️ Screenshot outdated (UI changed)

### Summary
| Status | Count |
|--------|-------|
| Up to date | 8 |
| Outdated | 2 |
| Missing | 1 |

Would you like me to update the outdated documentation?
```

### Validating Documentation

```
User: Validate the API documentation

Claude: [Uses fractary-docs:docs-validate agent]

## Validation: api-auth.md

### Results

**Status**: ⚠️ Valid with warnings

### Checks
| Check | Status | Message |
|-------|--------|---------|
| Required title | ✅ Pass | |
| Required sections | ✅ Pass | |
| Code examples | ✅ Pass | |
| Error responses | ❌ Fail | Missing error response documentation |
| API version | ⚠️ Warn | No version specified |

### Issues to Fix
1. **Error responses**: Add documentation for error cases (4xx, 5xx responses)
2. **Version**: Add API version to document metadata

Would you like me to add the missing sections?
```

## Document Types

The Docs plugin supports various document types with specific templates and validation rules:

| Type | Description | Key Sections |
|------|-------------|--------------|
| `adr` | Architecture Decision Record | Context, Decision, Consequences |
| `api` | API Documentation | Endpoints, Request/Response, Errors |
| `guide` | User/Developer Guide | Overview, Steps, Examples |
| `readme` | Project README | Description, Installation, Usage |

## Other Interfaces

- **SDK:** [Docs API](/docs/sdk/js/docs.md)
- **CLI:** [Docs Commands](/docs/cli/docs.md)
- **MCP:** [Docs Tools](/docs/mcp/server/docs.md)
- **Configuration:** [Docs Config](/docs/guides/configuration.md#docs-toolset)

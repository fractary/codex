# Spec Plugin - Claude Code Reference

Claude Code plugin reference for the Spec toolset (`fractary-spec`). Technical specification management for FABER workflows.

## Overview

The Spec plugin provides slash commands and agents for creating, validating, and refining technical specifications directly from Claude Code.

## Installation

Add to your Claude Code settings:

```json
{
  "plugins": ["fractary-spec"]
}
```

## Configuration

The plugin uses configuration from `.fractary/config.yaml`:

```yaml
spec:
  schema_version: "1.0"
  storage:
    local_path: /specs
```

## Slash Commands

### /spec-create

Create a new specification.

**Usage:**
```
/spec-create [options]
```

**Options:**
- `--title <text>` - Specification title
- `--type <type>` - Work type: feature, bug, infrastructure, api
- `--template <template>` - Template: basic, feature, bug, infrastructure, api
- `--work-id <id>` - Associated work item ID

**Example:**
```
/spec-create --title "User Authentication API" --type api --template api --work-id 123
```

This command can also be used interactively, where it delegates to the `fractary-spec:spec-create` agent.

### /spec-refine

Refine a specification through critical review.

**Usage:**
```
/spec-refine <spec-id>
```

**Example:**
```
/spec-refine SPEC-20240115
```

This command delegates to the `fractary-spec:spec-refine` agent.

### /spec-validate

Validate implementation against a specification.

**Usage:**
```
/spec-validate <spec-id>
```

**Example:**
```
/spec-validate SPEC-20240115
```

This command delegates to the `fractary-spec:spec-validate` agent.

### /spec-archive

Archive a completed specification.

**Usage:**
```
/spec-archive <spec-id> [options]
```

**Options:**
- `--reason <text>` - Archive reason

**Example:**
```
/spec-archive SPEC-20240115 --reason "Feature completed and released"
```

## Agents

### fractary-spec:spec-create

Creates specifications from conversation context. Analyzes requirements and generates structured specification documents.

**Triggered by:**
- `/spec-create` command
- Proactively when user mentions creating specs, writing requirements, or documenting design

**Capabilities:**
- Extracts requirements from conversation
- Selects appropriate template
- Generates structured specification
- Links to work items

### fractary-spec:spec-refine

Critically reviews and improves specifications. Identifies gaps, ambiguities, and areas for improvement.

**Triggered by:**
- `/spec-refine` command
- Proactively when user mentions improving or reviewing specs

**Capabilities:**
- Analyzes specification completeness
- Generates refinement questions
- Identifies missing sections
- Suggests improvements

### fractary-spec:spec-validate

Validates implementation against specification requirements. Checks that acceptance criteria are met.

**Triggered by:**
- `/spec-validate` command
- Proactively when user mentions verifying requirements or checking implementation

**Capabilities:**
- Compares implementation to spec
- Validates acceptance criteria
- Reports coverage gaps
- Suggests corrections

### fractary-spec:spec-archive

Archives specifications for completed work. Stores specs with metadata for future reference.

**Triggered by:**
- `/spec-archive` command
- Proactively when user mentions archiving or completing specs

## Usage Examples

### Creating a Specification

```
User: I need to create a spec for the authentication feature

Claude: [Uses fractary-spec:spec-create agent]

I'll create a specification for the authentication feature. Let me gather some details:

Based on our conversation and issue #123, here's the draft specification:

# SPEC-20240115: User Authentication API

## Problem Statement
The application lacks user authentication, preventing secure access control.

## Proposed Solution
Implement JWT-based authentication with login, logout, and token refresh endpoints.

## Acceptance Criteria
- [ ] Users can register with email and password
- [ ] Users can login and receive JWT token
- [ ] Users can logout (invalidate token)
- [ ] Tokens expire after 24 hours
- [ ] Refresh tokens extend session

## Technical Approach
- Use bcrypt for password hashing
- JWT with RS256 signing
- Redis for token blacklist

Specification created: SPEC-20240115
Path: specs/SPEC-20240115-user-authentication-api.md
```

### Refining a Specification

```
User: The spec needs more detail, can you refine it?

Claude: [Uses fractary-spec:spec-refine agent]

I've reviewed SPEC-20240115 and identified these areas for refinement:

**Missing Details:**
1. What are the password requirements (length, complexity)?
2. Should failed login attempts trigger rate limiting?
3. What happens to active sessions when password changes?
4. Are there specific error response formats required?

**Suggested Additions:**
- Add rate limiting section
- Define error response schema
- Add security considerations section

Would you like me to update the spec with these improvements?
```

### Validating Implementation

```
User: I think I'm done implementing the auth feature, validate against the spec

Claude: [Uses fractary-spec:spec-validate agent]

## Validation Results: SPEC-20240115

### Acceptance Criteria
| Criteria | Status | Notes |
|----------|--------|-------|
| User registration | ✅ Pass | Implemented in /auth/register |
| User login | ✅ Pass | Implemented in /auth/login |
| User logout | ✅ Pass | Implemented in /auth/logout |
| Token expiration | ✅ Pass | Set to 24 hours |
| Refresh tokens | ⚠️ Partial | Missing refresh endpoint |

### Technical Requirements
- ✅ bcrypt password hashing
- ✅ JWT with RS256
- ❌ Redis token blacklist (using memory instead)

### Summary
**Status: PARTIAL (80%)**

Missing implementations:
1. Token refresh endpoint
2. Redis-based token blacklist

Would you like me to create tasks for the missing items?
```

## Integration with FABER Workflow

The Spec plugin is central to the FABER workflow:

- **Frame phase**: Create initial spec from work item
- **Architect phase**: Refine spec with technical details
- **Build phase**: Reference spec during implementation
- **Evaluate phase**: Validate implementation against spec
- **Release phase**: Archive spec with completion status

## Other Interfaces

- **SDK:** [Spec API](/docs/sdk/js/spec.md)
- **CLI:** [Spec Commands](/docs/cli/spec.md)
- **MCP:** [Spec Tools](/docs/mcp/server/spec.md)
- **Configuration:** [Spec Config](/docs/guides/configuration.md#spec-toolset)

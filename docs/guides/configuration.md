# Configuration Guide

Complete reference for configuring the Fractary Codex SDK.

## Table of Contents

- [Configuration File](#configuration-file)
- [Configuration Schema](#configuration-schema)
- [Storage Providers](#storage-providers)
- [Type Registry](#type-registry)
- [Permissions](#permissions)
- [Sync Configuration](#sync-configuration)
- [Environment Variables](#environment-variables)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Configuration File

The Codex SDK uses a YAML configuration file located at `.fractary/codex/config.yaml` in your project root.

### File Location

The SDK searches for configuration in the following order:

1. `.fractary/codex/config.yaml` (project-specific)
2. `~/.fractary/codex/config.yaml` (user-wide)
3. Environment variables
4. Default values

### Creating Configuration

**Initialize with defaults:**

```bash
# JavaScript/TypeScript
npx @fractary/codex init

# Python
python -m fractary_codex init
```

**Manual creation:**

```yaml
# .fractary/codex/config.yaml
organization: fractary
cacheDir: .fractary/codex/cache

storage:
  - type: local
    basePath: ./knowledge
  - type: github
    token: ${GITHUB_TOKEN}

types:
  docs:
    name: docs
    patterns:
      - docs/**
      - "**/*.md"
    defaultTtl: 86400

permissions:
  default: read
  rules:
    - pattern: internal/**
      permission: none
```

## Configuration Schema

### Root Configuration

```yaml
# Organization name (auto-detected from git if not specified)
organization: string

# Cache directory path (default: .fractary/codex/cache)
cacheDir: string

# Storage provider configurations
storage:
  - type: string
    # ... provider-specific options

# Custom artifact types
types:
  [typeName]:
    # ... type configuration

# Permission rules
permissions:
  default: string
  rules:
    - pattern: string
      permission: string

# Sync configuration
sync:
  bidirectional: boolean
  conflictResolution: string
  exclude:
    - string
```

### TypeScript Interface

```typescript
interface CodexConfig {
  organization?: string
  cacheDir: string
  storage?: StorageProviderConfig[]
  types?: Record<string, ArtifactType>
  permissions?: PermissionConfig
  sync?: SyncConfig
}
```

### Python Dataclass

```python
@dataclass
class CodexConfig:
    organization: Optional[str] = None
    cache_dir: str = ".fractary/codex/cache"
    storage: Optional[List[StorageProviderConfig]] = None
    types: Optional[Dict[str, ArtifactType]] = None
    permissions: Optional[PermissionConfig] = None
    sync: Optional[SyncConfig] = None
```

## Storage Providers

### Local Storage

Store documents on the local filesystem.

```yaml
storage:
  - type: local
    basePath: ./knowledge  # Required: Base directory path
    followSymlinks: false  # Optional: Follow symbolic links (default: false)
```

**Options:**

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `basePath` | string | Yes | - | Base directory for documents |
| `followSymlinks` | boolean | No | false | Whether to follow symbolic links |

### GitHub Storage

Fetch documents from GitHub repositories.

```yaml
storage:
  - type: github
    token: ${GITHUB_TOKEN}        # Optional: For private repos
    baseUrl: https://api.github.com  # Optional: For GitHub Enterprise
    branch: main                  # Optional: Default branch (default: main)
```

**Options:**

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `token` | string | No | - | GitHub personal access token |
| `baseUrl` | string | No | https://api.github.com | API base URL (for GitHub Enterprise) |
| `branch` | string | No | main | Default branch to fetch from |

**Token Scopes:**

For public repositories: No token required

For private repositories: `repo` scope

### HTTP Storage

Fetch documents from HTTP/HTTPS endpoints.

```yaml
storage:
  - type: http
    baseUrl: https://codex.example.com  # Required: Base URL
    headers:                             # Optional: Custom headers
      Authorization: Bearer ${API_TOKEN}
      X-Custom-Header: value
    timeout: 30000                       # Optional: Request timeout in ms (default: 30000)
```

**Options:**

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `baseUrl` | string | Yes | - | Base URL for HTTP requests |
| `headers` | object | No | {} | Custom HTTP headers |
| `timeout` | number | No | 30000 | Request timeout in milliseconds |

### S3 Storage (Planned)

```yaml
storage:
  - type: s3
    bucket: my-codex-bucket
    region: us-east-1
    accessKeyId: ${AWS_ACCESS_KEY_ID}
    secretAccessKey: ${AWS_SECRET_ACCESS_KEY}
```

### Multiple Providers

The SDK tries providers in priority order (lower = higher priority):

```yaml
storage:
  # Try local first (priority 10)
  - type: local
    basePath: ./knowledge
    priority: 10

  # Then GitHub (priority 50)
  - type: github
    token: ${GITHUB_TOKEN}
    priority: 50

  # Finally HTTP fallback (priority 100)
  - type: http
    baseUrl: https://codex.example.com
    priority: 100
```

## Type Registry

Define custom artifact types with TTL and archiving rules.

### Type Configuration

```yaml
types:
  # Type name (referenced in code)
  api-specs:
    # Human-readable name
    name: api-specs

    # Description
    description: OpenAPI specifications

    # Glob patterns to match files
    patterns:
      - openapi/**/*.yaml
      - specs/**/*.json

    # Default TTL in seconds (1 week = 604800)
    defaultTtl: 604800

    # Archive after N days (optional)
    archiveAfterDays: 90

    # Archive storage provider (optional)
    archiveStorage: s3

    # Priority for pattern matching (lower = higher priority)
    priority: 5
```

### Built-in Types

The SDK includes these built-in types:

```yaml
types:
  docs:
    name: docs
    patterns: ["docs/**", "**/*.md", "**/*.mdx"]
    defaultTtl: 86400  # 1 day

  specs:
    name: specs
    patterns: ["specs/**", "**/SPEC-*.md"]
    defaultTtl: 604800  # 7 days

  config:
    name: config
    patterns: ["**/*.yaml", "**/*.json", "**/*.toml"]
    defaultTtl: 3600  # 1 hour

  logs:
    name: logs
    patterns: ["logs/**", "**/*.log"]
    defaultTtl: 3600  # 1 hour
    archiveAfterDays: 30

  schemas:
    name: schemas
    patterns: ["schemas/**", "**/*.schema.json"]
    defaultTtl: 604800  # 7 days
```

### TTL Constants

Common TTL values (in seconds):

| Constant | Seconds | Description |
|----------|---------|-------------|
| MINUTE | 60 | 1 minute |
| HOUR | 3600 | 1 hour |
| DAY | 86400 | 1 day |
| WEEK | 604800 | 7 days |
| MONTH | 2592000 | 30 days |

### Pattern Matching

Patterns use glob syntax:

- `**` - Match any number of directories
- `*` - Match any characters in a single path segment
- `?` - Match a single character
- `[abc]` - Match any character in brackets
- `{a,b}` - Match either pattern

**Examples:**

```yaml
patterns:
  - "docs/**/*.md"          # All markdown files in docs/
  - "specs/SPEC-*.md"       # SPEC-*.md files in specs/
  - "**/*.{json,yaml}"      # All JSON and YAML files
  - "api/v[0-9]/**"         # Versioned API directories
  - "**/README.md"          # All README.md files
```

## Permissions

Configure access control for documents.

### Permission Levels

| Level | Description |
|-------|-------------|
| `none` | No access |
| `read` | Read-only access |
| `write` | Read and write access |
| `admin` | Full access including permission changes |

### Permission Configuration

```yaml
permissions:
  # Default permission for documents without specific rules
  default: read

  # Permission rules (evaluated in order)
  rules:
    # Deny access to internal documents
    - pattern: internal/**
      permission: none

    # Public documents are readable
    - pattern: public/**
      permission: read

    # Team members can write to team docs
    - pattern: team/**
      permission: write
      users:
        - alice
        - bob

    # Admins have full access
    - pattern: admin/**
      permission: admin
      users:
        - admin
```

### Frontmatter Permissions

Documents can override permissions in YAML frontmatter:

```markdown
---
permissions:
  read: all
  write: [alice, bob]
  admin: [admin]
---

# Document content
```

### Permission Priority

Permissions are checked in this order:

1. Document frontmatter
2. Configuration rules (first match wins)
3. Default permission

## Sync Configuration

Configure file synchronization behavior.

```yaml
sync:
  # Sync direction
  # Options: 'to-codex' | 'from-codex' | 'bidirectional'
  bidirectional: true

  # Conflict resolution strategy
  # Options: 'prompt' | 'local' | 'remote' | 'newest' | 'skip'
  conflictResolution: prompt

  # Patterns to exclude from sync
  exclude:
    - node_modules/**
    - .git/**
    - "**/*.log"
    - .env

  # Sync rules for specific paths
  rules:
    - pattern: docs/**
      direction: to-codex

    - pattern: specs/**
      direction: bidirectional

    - pattern: templates/**
      direction: from-codex
```

### Sync Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `bidirectional` | boolean | true | Enable two-way sync |
| `conflictResolution` | string | prompt | How to resolve conflicts |
| `exclude` | string[] | [] | Patterns to exclude |
| `rules` | SyncRule[] | [] | Path-specific sync rules |

### Conflict Resolution Strategies

| Strategy | Behavior |
|----------|----------|
| `prompt` | Ask user to resolve conflicts |
| `local` | Always prefer local version |
| `remote` | Always prefer remote version |
| `newest` | Use file with newest timestamp |
| `skip` | Skip conflicting files |

## Environment Variables

Environment variables can be used in configuration with `${VAR_NAME}` syntax.

### Common Variables

```yaml
storage:
  - type: github
    token: ${GITHUB_TOKEN}

  - type: http
    baseUrl: ${CODEX_BASE_URL}
    headers:
      Authorization: Bearer ${API_TOKEN}

# Or use with defaults
cacheDir: ${CODEX_CACHE_DIR:-.fractary/codex/cache}
```

### SDK-Specific Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CODEX_CONFIG_PATH` | Path to config file | `.fractary/codex/config.yaml` |
| `CODEX_CACHE_DIR` | Cache directory | `.fractary/codex/cache` |
| `CODEX_ORGANIZATION` | Organization name | (auto-detect) |
| `GITHUB_TOKEN` | GitHub access token | - |
| `CODEX_LOG_LEVEL` | Log level (debug/info/warn/error) | `info` |

## Best Practices

### 1. Use Environment Variables for Secrets

**Don't:**

```yaml
storage:
  - type: github
    token: ghp_1234567890abcdef  # ❌ Hardcoded token
```

**Do:**

```yaml
storage:
  - type: github
    token: ${GITHUB_TOKEN}  # ✅ Environment variable
```

### 2. Organize by Environment

```yaml
# .fractary/codex/config.yaml (base config)
organization: fractary
cacheDir: .fractary/codex/cache

# .fractary/codex.dev.yaml (development)
storage:
  - type: local
    basePath: ./knowledge

# .fractary/codex.prod.yaml (production)
storage:
  - type: github
    token: ${GITHUB_TOKEN}
  - type: http
    baseUrl: https://codex.example.com
```

Load with:

```typescript
const env = process.env.NODE_ENV || 'dev'
const config = loadConfig(`.fractary/codex.${env}.yaml`)
```

### 3. Layer Configurations

Use multiple configs for different scopes:

```
~/.fractary/codex/config.yaml     # User-wide defaults
.fractary/codex/config.yaml       # Project-specific
.fractary/codex.local.yaml # Local overrides (gitignored)
```

### 4. Document Custom Types

```yaml
types:
  # Good: Well-documented type
  api-contracts:
    name: api-contracts
    description: REST API contracts and specifications
    patterns:
      - contracts/**/*.yaml
      - openapi/**/*.json
    defaultTtl: 604800
    # Updated when API changes, cache for a week
```

### 5. Use Appropriate TTLs

```yaml
types:
  # Frequently changing content
  status-pages:
    patterns: ["status/**"]
    defaultTtl: 300  # 5 minutes

  # Stable documentation
  guides:
    patterns: ["guides/**"]
    defaultTtl: 86400  # 1 day

  # Archival content
  historical-specs:
    patterns: ["archive/**"]
    defaultTtl: 2592000  # 30 days
```

### 6. Secure Sensitive Documents

```yaml
permissions:
  default: read
  rules:
    # Sensitive data
    - pattern: credentials/**
      permission: none

    - pattern: internal/**
      permission: read
      users: [team-members]

    # Public docs
    - pattern: public/**
      permission: read
```

## Examples

### Minimal Configuration

```yaml
organization: fractary
cacheDir: .fractary/codex/cache

storage:
  - type: local
    basePath: ./knowledge
```

### Development Configuration

```yaml
organization: fractary
cacheDir: .fractary/codex/cache

storage:
  - type: local
    basePath: ./knowledge
    priority: 10

  - type: github
    token: ${GITHUB_TOKEN}
    priority: 50

types:
  docs:
    patterns: ["docs/**"]
    defaultTtl: 3600  # Short TTL for development
```

### Production Configuration

```yaml
organization: fractary
cacheDir: /var/cache/codex

storage:
  - type: http
    baseUrl: https://codex.example.com
    headers:
      Authorization: Bearer ${API_TOKEN}
    timeout: 10000
    priority: 10

  - type: github
    token: ${GITHUB_TOKEN}
    branch: main
    priority: 50

types:
  docs:
    patterns: ["docs/**"]
    defaultTtl: 86400
    archiveAfterDays: 90
    archiveStorage: s3

  api-specs:
    patterns: ["openapi/**"]
    defaultTtl: 604800

permissions:
  default: read
  rules:
    - pattern: internal/**
      permission: none
    - pattern: public/**
      permission: read

sync:
  bidirectional: true
  conflictResolution: newest
  exclude:
    - node_modules/**
    - .git/**
    - "**/*.log"
```

### Multi-Region Configuration

```yaml
organization: fractary
cacheDir: .fractary/codex/cache

storage:
  # Primary region (US)
  - type: http
    baseUrl: https://us.codex.example.com
    priority: 10

  # Secondary region (EU)
  - type: http
    baseUrl: https://eu.codex.example.com
    priority: 20

  # Fallback to GitHub
  - type: github
    token: ${GITHUB_TOKEN}
    priority: 100
```

## See Also

- [API Reference](./api-reference.md) - Detailed API documentation
- [CLI Integration Guide](./cli-integration.md) - Integration patterns
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

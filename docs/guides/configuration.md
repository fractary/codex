# Configuration Guide

Complete reference for configuring the Fractary Codex SDK.

## Table of Contents

- [Configuration File](#configuration-file)
- [Unified Configuration Structure](#unified-configuration-structure)
- [File Plugin Integration](#file-plugin-integration)
- [Configuration Schema](#configuration-schema)
- [Storage Providers](#storage-providers)
- [Archive Configuration](#archive-configuration)
- [Type Registry](#type-registry)
- [Permissions](#permissions)
- [Sync Configuration](#sync-configuration)
- [Environment Variables](#environment-variables)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Configuration File

The Codex SDK uses a unified YAML configuration file located at `.fractary/config.yaml` in your project root. This unified configuration includes both Codex plugin settings and File plugin integration.

**Note:** The legacy path `.fractary/codex/config.yaml` is still supported for backward compatibility but is deprecated.

### File Location

The SDK searches for configuration in the following order:

1. `.fractary/config.yaml` (unified configuration - recommended)
2. `.fractary/codex/config.yaml` (legacy - deprecated)
3. `~/.fractary/config.yaml` (user-wide)
4. Environment variables
5. Default values

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
# .fractary/config.yaml (unified configuration)
file:
  schema_version: "2.0"
  sources:
    specs:
      type: s3
      bucket: myproject-files
      prefix: specs/
      region: us-east-1
      local:
        base_path: .fractary/specs
      push:
        compress: false
        keep_local: true
      auth:
        profile: default

    logs:
      type: s3
      bucket: myproject-files
      prefix: logs/
      region: us-east-1
      local:
        base_path: .fractary/logs
      push:
        compress: true
        keep_local: true

codex:
  schema_version: "2.0"
  organization: fractary
  project: myproject
  dependencies: {}
```

## Unified Configuration Structure

The unified configuration file (`.fractary/config.yaml`) combines both file plugin and codex plugin settings in a single YAML file.

### File Plugin Section

The `file:` section configures local artifact sources (specs, logs, assets) that can be synced with cloud storage:

```yaml
file:
  schema_version: "2.0"
  sources:
    # Source name (e.g., "specs", "logs", "assets")
    {source-name}:
      type: s3 | r2 | gcs | local
      bucket: string              # Cloud storage bucket (optional for local)
      prefix: string              # Path prefix in bucket (optional)
      region: string              # Cloud region (optional)
      local:
        base_path: string         # Local filesystem path
      push:
        compress: boolean         # Compress before upload (optional)
        keep_local: boolean       # Keep local copy after upload (optional)
      auth:
        profile: string           # AWS profile or auth config (optional)
```

### Codex Plugin Section

The `codex:` section configures the knowledge management system and external project dependencies:

```yaml
codex:
  schema_version: "2.0"
  organization: string            # Your organization slug
  project: string                 # Current project name
  dependencies:
    # External project dependencies
    {org}/{project}:
      sources:
        {source-name}:
          type: s3 | github | http
          # ... source-specific configuration
```

### Benefits of Unified Configuration

1. **Single Source of Truth**: All Fractary configuration in one place
2. **Auto-Discovery**: Codex automatically detects file plugin sources for current project
3. **Current Project Optimization**: No caching for current project files (always fresh)
4. **Cross-Project Access**: Explicit dependencies with caching for external projects
5. **Simplified Management**: One file to version, backup, and share

## File Plugin Integration

The Codex SDK automatically integrates with file plugin sources configured in the unified configuration. This enables seamless access to current project artifacts without explicit configuration.

### Current Project Access

When you access files from your current project that are managed by the file plugin, Codex:

1. **Detects file plugin sources** from the `file.sources` configuration
2. **Bypasses cache** for freshness during active development
3. **Reads directly** from local filesystem
4. **Provides helpful errors** when files are missing locally

**Example:**

```yaml
# .fractary/config.yaml
file:
  sources:
    specs:
      local:
        base_path: .fractary/specs
```

```typescript
// Access specs directly - no caching, always fresh
const spec = await fetch('codex://fractary/myproject/specs/SPEC-001.md')
```

### URI Patterns

File plugin sources support flexible URI patterns:

```
# Full URI (explicit org/project)
codex://fractary/myproject/specs/SPEC-001.md

# Shorthand URI (omit org/project for current project)
codex://specs/SPEC-001.md

# Both resolve to: .fractary/specs/SPEC-001.md (no cache)
```

### Cache Behavior

**Current Project** (file plugin sources):
- ✅ Always reads fresh from disk
- ❌ Never cached
- ⚡ Optimal for active development

**External Projects** (dependencies):
- ✅ Cached with TTL
- 🔄 Stale-while-revalidate support
- 💾 Persisted across sessions

### Storage Provider Priority

When both file plugin and standard storage providers are configured:

```
1. file-plugin (current project only, no cache)
2. local (current project, standard files)
3. s3-archive (archived documents)
4. github (remote repositories)
5. http (API endpoints)
```

### File Not Found Handling

When a file plugin file is missing locally, Codex provides helpful error messages:

```
File not found: .fractary/specs/SPEC-001.md

This file may be in cloud storage (s3).

To fetch from cloud storage, run:
  file pull specs

Or sync all sources:
  file sync
```

### MCP Server Integration

The Codex MCP server automatically detects file plugin sources:

```json
// .claude/settings.json
{
  "mcpServers": {
    "fractary-codex": {
      "command": "npx",
      "args": ["-y", "@fractary/codex-mcp-server", "--config", ".fractary/config.yaml"]
    }
  }
}
```

Use the `codex_file_sources_list` tool to discover available sources:

```typescript
// List file plugin sources
const sources = await client.call('codex_file_sources_list', {})
// Returns: specs (.fractary/specs), logs (.fractary/logs), etc.
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

### S3 Archive Storage

Transparently access archived documents from S3-compatible storage (S3, R2, GCS).

**Note:** This provider enables **read-only** access to archived documents. It works via the [fractary CLI](https://github.com/fractary/cli) and requires per-project configuration. See [Archive Configuration](#archive-configuration) for details.

```yaml
# Archive configuration is per-project, not a general storage provider
# See Archive Configuration section below for full setup
```

The S3 Archive storage provider is automatically registered when archive configuration is present. Documents are accessed with the same `codex://org/project/path` URI regardless of whether they're in the active project or archived.

**Storage Priority with Archives:**
```
1. Local filesystem (current project)
2. S3 Archive (if configured and current project)
3. GitHub (remote repository)
4. HTTP (fallback)
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

## Archive Configuration

Configure transparent access to archived documents stored in cloud storage (S3, R2, GCS, Google Drive).

### Overview

The archive feature enables Codex to automatically fetch documents from cloud storage when they're not found locally. This implements **lifecycle-based storage**:

- **Active documents** → GitHub (versioning, PR workflow, collaboration)
- **Completed documents** → S3/R2/GCS (static, archived, read-only)
- **Codex URIs** → Same URI works for both (`codex://org/project/path`)

### Configuration Structure

Archive configuration is **per-project** and uses the [fractary CLI](https://github.com/fractary/cli) for cloud storage access.

```yaml
archive:
  projects:
    # Project key: "org/project"
    fractary/auth-service:
      enabled: true
      handler: s3              # Storage backend: s3, r2, gcs, local
      bucket: fractary-archives
      prefix: archive/         # Optional: path prefix (default: "archive/")
      patterns:                # Optional: limit to specific files
        - specs/**
        - docs/**

    fractary/api-gateway:
      enabled: true
      handler: r2
      bucket: api-archives
      # No patterns = all files eligible for archive
```

### Archive Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `enabled` | boolean | Yes | - | Enable archive for this project |
| `handler` | string | Yes | - | Storage backend: `s3`, `r2`, `gcs`, `local` |
| `bucket` | string | No | - | Cloud storage bucket name |
| `prefix` | string | No | `archive/` | Path prefix in bucket |
| `patterns` | string[] | No | `[]` | Glob patterns to match (empty = all files) |

### Storage Handlers

#### AWS S3

```yaml
archive:
  projects:
    fractary/project:
      enabled: true
      handler: s3
      bucket: my-archives
```

**Requirements:**
- AWS credentials configured (AWS CLI, environment variables, or IAM role)
- Bucket permissions: `s3:GetObject`

**Environment variables:**
```bash
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export AWS_REGION=us-east-1  # Optional
```

#### Cloudflare R2

```yaml
archive:
  projects:
    fractary/project:
      enabled: true
      handler: r2
      bucket: my-archives
```

**Requirements:**
- Cloudflare R2 credentials configured
- Environment variables: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`

#### Google Cloud Storage

```yaml
archive:
  projects:
    fractary/project:
      enabled: true
      handler: gcs
      bucket: my-archives
```

**Requirements:**
- GCS credentials configured (service account key or Application Default Credentials)
- Bucket permissions: `storage.objects.get`

#### Local Storage

```yaml
archive:
  projects:
    fractary/project:
      enabled: true
      handler: local
      # No bucket needed - uses local filesystem
```

### Archive Path Structure

Archives follow a standardized path structure:

```
{prefix}/{type}/{org}/{project}/{original-path}
```

**Examples:**
```
specs/WORK-123.md → archive/specs/fractary/auth-service/specs/WORK-123.md
docs/api.md       → archive/docs/fractary/auth-service/docs/api.md
logs/session.md   → archive/logs/fractary/auth-service/logs/session.md
```

**Custom prefix:**
```yaml
archive:
  projects:
    fractary/project:
      prefix: archived-docs/
      # Result: archived-docs/specs/fractary/project/specs/WORK-123.md
```

### Pattern Matching

Use glob patterns to limit which files are eligible for archive lookup:

```yaml
archive:
  projects:
    fractary/project:
      patterns:
        - "specs/**"           # All files in specs/
        - "docs/**/*.md"       # Markdown files in docs/
        - "*.md"               # Top-level markdown files
        - "archive/**"         # Explicitly archived content
```

**No patterns specified** = all files eligible (checked in archive if not found locally)

### Complete Example

```yaml
organizationSlug: fractary

cache:
  dir: .fractary/codex/cache
  maxMemorySize: 104857600  # 100 MB
  defaultTtl: 3600          # 1 hour

storage:
  providers:
    - type: local
      basePath: ./knowledge
    - type: github
      token: ${GITHUB_TOKEN}

# Archive configuration
archive:
  projects:
    # Production service - archive completed specs
    fractary/auth-service:
      enabled: true
      handler: s3
      bucket: fractary-prod-archives
      prefix: archive/
      patterns:
        - specs/**
        - docs/**

    # API gateway - use Cloudflare R2
    fractary/api-gateway:
      enabled: true
      handler: r2
      bucket: api-archives
      patterns:
        - specs/**

    # Development project - local archive for testing
    fractary/dev-project:
      enabled: true
      handler: local
```

### MCP Server Configuration

When using the Codex MCP server, archive configuration is loaded from the same config file:

```json
// .claude/settings.json
{
  "mcpServers": {
    "fractary-codex": {
      "command": "npx",
      "args": ["-y", "@fractary/codex-mcp-server", "--config", ".fractary/codex/config.yaml"]
    }
  }
}
```

The MCP server automatically enables archive providers based on your configuration.

### Requirements

1. **fractary CLI installed:**
   ```bash
   npm install -g @fractary/cli
   ```

2. **Cloud storage credentials configured** (for S3/R2/GCS)

3. **Archive structure in place** following the path conventions

### How It Works

1. User requests: `codex://fractary/project/specs/WORK-123.md`
2. Codex checks:
   - ✅ Local filesystem: `specs/WORK-123.md`
   - ❌ Not found locally
   - ✅ Archive configured for `fractary/project`
   - ✅ Path matches pattern `specs/**`
   - ✅ Fetch from S3: `archive/specs/fractary/project/specs/WORK-123.md`
3. Returns content with source: `s3-archive`
4. Caches result for TTL period

### Limitations

- **Read-only:** Archive storage is read-only (no write/update operations)
- **Current project only:** Archive provider only checks archives for the current project
- **Requires fractary CLI:** Uses fractary CLI for cloud storage access
- **exists() performance:** Checking file existence downloads the full file (optimization planned)

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

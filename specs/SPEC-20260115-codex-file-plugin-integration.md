# SPEC-20260115: Codex-File Plugin Integration

**Created:** 2026-01-15
**Status:** Approved
**Type:** Enhancement

## Executive Summary

Integrate the codex plugin with the file plugin (being developed in Fractary Core) to enable seamless cross-project artifact access. This integration auto-imports file plugin sources into the codex namespace, optimizes current project file access by bypassing cache, and establishes a unified configuration structure at `.fractary/config.yaml` that supports both file and codex plugins.

## Problem Statement

Currently:
1. **No cross-project artifact access**: Projects cannot easily reference specs, logs, or other artifacts from other projects
2. **Separate configs**: File plugin (Fractary Core) and codex plugin have separate configuration locations
3. **Inefficient current project access**: Current project files go through cache system unnecessarily
4. **Manual artifact discovery**: Users must manually know where artifacts are stored across projects

This creates friction for:
- Downstream services referencing upstream specs/changelogs
- Documentation that needs to link to artifacts in other projects
- Cross-project knowledge sharing and context management

## Architectural Decision: Codex as Universal Router

### Core Principles

**Separation of Concerns:**
1. **File plugin** (Fractary Core): Manages local project artifacts with push/pull to S3
2. **Codex plugin**: Handles cross-project dependencies and context management
3. **Integration**: Codex auto-imports file plugin sources and makes them available in codex namespace

**URI Scheme:**
- `codex://{org}/{project}/{source}/{path}` - Full format
- `codex://specs/SPEC-001.md` - Shorthand for current project

**Configuration:**
- Unified config: `.fractary/config.yaml`
- Contains both `file:` and `codex:` sections
- Single source of truth for both plugins

### Key Architectural Decisions

#### 1. Unified Configuration Structure

**Decision**: Single config file at `.fractary/config.yaml`

**Rationale:**
- Centralizes configuration management
- Reduces cognitive overhead (one config vs multiple)
- Enables cross-plugin awareness
- Aligns with Fractary Core architecture vision

**Migration Path:**
- Migrate from `.fractary/codex/config.yaml` → `.fractary/config.yaml`
- Maintain backward compatibility for 2 versions
- Provide migration utility with `codex config migrate` command

#### 2. Current Project Optimization

**Decision**: Bypass cache for current project file plugin sources

**Rationale:**
- Eliminates cache staleness for active development
- Reduces disk usage (no duplicate cache)
- Faster access (no cache lookup overhead)
- Aligns with developer mental model

**Implementation:**
- Detect current project via git remote parsing
- Check if URI path matches file plugin source
- Read directly from `.fractary/specs/`, `.fractary/logs/`, etc.
- Skip cache layer entirely

#### 3. Auto-Import File Sources

**Decision**: Codex reads `file.sources.*` from unified config and makes them available

**Rationale:**
- Single source of truth (file plugin owns the data)
- Avoids sync/consistency issues
- No duplication of configuration
- Clear separation of concerns

**Implementation:**
- `FileSourceResolver` parses file sources from config
- URI resolution checks file sources for current project
- Storage manager routes to appropriate provider

#### 4. Cross-Project Dependencies

**Decision**: External project artifacts accessed via explicit codex dependencies

**Rationale:**
- Security through allow-lists
- Clear dependency declaration (like package.json)
- Prevents accidental access to other projects
- Enables auditing and governance

**Configuration:**
```yaml
codex:
  remotes:
    # External project with specific token
    corthos/etl-corthion-ai:
      token: ${PARTNER_TOKEN}
```

## Solution Design

### Architecture Overview

```
MCP: codex_document_fetch("codex://specs/SPEC-001.md")
   ↓
URI Resolver: Expand shorthand → codex://fractary/core/specs/SPEC-001.md
   ↓
Detect: Current project? Yes
   ↓
FileSourceResolver: Match path to file source "specs"
   ↓
StorageManager.fetch() → FilePluginStorage
   ↓
Read from .fractary/specs/SPEC-001.md (bypass cache)
   ↓
Return content
```

### Component Architecture

```
┌─────────────────────────────────────────────────┐
│         MCP Server (codex:// URIs)              │
│  Tools: codex_document_fetch,                   │
│         codex_file_sources_list                 │
└──────────┬──────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│         URI Resolution & Context                │
│  - Parse codex:// URIs                          │
│  - Expand shorthand (specs → org/project/specs) │
│  - Detect current project (git remote)          │
│  - Determine source type                        │
└──────────┬──────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│         FileSourceResolver                      │
│  - Read file.sources from unified config        │
│  - Match URIs to file plugin sources            │
│  - Resolve local paths                          │
└──────────┬──────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│         Storage Manager                         │
│  Priority: [file-plugin, local, s3-archive,     │
│            github, http]                        │
└──────────┬──────────────────────────────────────┘
           │
           ├──> FilePluginStorage (current project)
           │    └─> Read from .fractary/specs/
           │
           ├──> GitHubStorage (external project)
           │    └─> Fetch from GitHub, cache
           │
           └──> S3ArchiveStorage (archived)
                └─> Fetch from S3, cache
```

### Configuration Structure

#### Unified Config (`.fractary/config.yaml`)

```yaml
# File plugin configuration (managed by file plugin in Fractary Core)
file:
  schema_version: "2.0"
  sources:
    specs:
      type: s3
      bucket: core-files
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
      bucket: core-files
      prefix: logs/
      region: us-east-1
      local:
        base_path: .fractary/logs
      push:
        compress: true
        keep_local: true
      auth:
        profile: default

# Codex plugin configuration
codex:
  schema_version: "2.0"
  organization: fractary
  project: core
  codex_repo: codex.fractary.com

  # External repository authentication
  remotes:
    # The codex repo itself
    fractary/codex.fractary.com:
      token: ${GITHUB_TOKEN}
    # External project with specific token
    corthos/etl-corthion-ai:
      token: ${PARTNER_TOKEN}
```

### New Components

#### 1. FileSourceResolver

**Location:** `/sdk/js/src/file-integration/source-resolver.ts`

**Purpose:** Parse and resolve file plugin sources from unified config

**Key Methods:**
```typescript
class FileSourceResolver {
  constructor(config: UnifiedConfig)

  // Parse all file.sources from config
  getAvailableSources(): ResolvedFileSource[]

  // Look up specific source by name
  resolveSource(name: string): ResolvedFileSource | null

  // Check if path belongs to a file plugin source
  isFilePluginPath(path: string): boolean
}
```

#### 2. FilePluginStorage

**Location:** `/sdk/js/src/storage/file-plugin.ts`

**Purpose:** Storage provider for file plugin integration

**Key Methods:**
```typescript
class FilePluginStorage implements StorageProvider {
  type = 'local'  // Reuse local type
  name = 'file-plugin'

  // Only handles current project + file-plugin sourceType
  canHandle(reference: ResolvedReference): boolean

  // Read from localPath directly (no cache)
  async fetch(reference: ResolvedReference): Promise<FetchResult>

  // Check file existence at localPath
  async exists(reference: ResolvedReference): Promise<boolean>

  // S3 fallback - helpful error suggesting file pull command
  private async fetchFromS3(source, reference): Promise<FetchResult>
}
```

### Updated Components

#### 1. Configuration Schemas

**File:** `/sdk/js/src/schemas/config.ts`

**Changes:**
```typescript
// File plugin source schema
export const FileSourceSchema = z.object({
  type: z.enum(['s3', 'r2', 'gcs', 'local']),
  bucket: z.string().optional(),
  prefix: z.string().optional(),
  region: z.string().optional(),
  local: z.object({
    base_path: z.string(),
  }),
  push: z.object({
    compress: z.boolean().optional(),
    keep_local: z.boolean().optional(),
  }).optional(),
  auth: z.object({
    profile: z.string().optional(),
  }).optional(),
})

// File plugin config section
export const FileConfigSchema = z.object({
  schema_version: z.string(),
  sources: z.record(FileSourceSchema),
})

// Unified config schema
export const UnifiedConfigSchema = z.object({
  file: FileConfigSchema.optional(),
  codex: CodexConfigSchema.optional(),
})
```

#### 2. URI Resolution

**File:** `/sdk/js/src/references/resolver.ts`

**Changes:**
```typescript
export interface ResolvedReference extends ParsedReference {
  // ... existing fields
  sourceType: 'github' | 'http' | 'local' | 'file-plugin' | 's3-archive'
  filePluginSource?: string  // Source name if type is file-plugin
}

export function resolveReference(uri: string, options: ResolveOptions = {}): ResolvedReference | null {
  const parsed = parseReference(uri)

  // Check if current project
  const currentContext = getCurrentContext(options)
  const isCurrentProject = /* check logic */

  // If current project, check file plugin sources
  if (isCurrentProject) {
    const fileSource = detectFilePluginSource(parsed.path, options)
    if (fileSource) {
      return {
        ...parsed,
        sourceType: 'file-plugin',
        filePluginSource: fileSource.name,
        localPath: path.join(fileSource.localPath, parsed.path),
        isCurrentProject: true,
      }
    }
  }

  // Existing cache-based resolution
  // ...
}
```

#### 3. Cache Manager

**File:** `/sdk/js/src/cache/manager.ts`

**Changes:**
```typescript
export class CacheManager {
  async get(reference: ResolvedReference, options?: FetchOptions): Promise<FetchResult> {
    // Skip cache for current project file plugin sources
    if (reference.isCurrentProject && reference.sourceType === 'file-plugin') {
      return await this.storage!.fetch(reference, options)
    }

    // Existing cache lookup logic
    // ...
  }

  async set(uri: string, result: FetchResult): Promise<void> {
    // Don't cache current project file plugin sources
    const resolved = resolveReference(uri)
    if (resolved?.isCurrentProject && resolved.sourceType === 'file-plugin') {
      return  // Skip caching
    }

    // Existing cache set logic
    // ...
  }
}
```

#### 4. MCP Server Tools

**File:** `/mcp/server/src/tools.ts`

**Changes:**
```typescript
// Update handleFetch for file plugin sources
export async function handleFetch(args: FetchToolArgs, ctx: ToolHandlerContext): Promise<ToolResult> {
  const ref = resolveReference(uri)

  // Handle current project file plugin sources
  if (ref.isCurrentProject && ref.sourceType === 'file-plugin') {
    result = await ctx.storage.fetch(ref, { branch })  // Skip cache
  } else if (noCache) {
    // ... existing logic
  } else {
    result = await ctx.cache.get(ref, { branch })
  }

  // Enhanced error handling
  if (error.message.includes('File plugin should pull from S3')) {
    return textResult(
      `File not found locally: ${ref.localPath}\n` +
      `Run: file pull ${ref.filePluginSource}`,
      true
    )
  }
}

// New tool: List file plugin sources
{
  name: 'codex_file_sources_list',
  description: 'List file plugin sources available in the current project.',
  inputSchema: { type: 'object', properties: {} },
}

export async function handleFileSourcesList(ctx: ToolHandlerContext): Promise<ToolResult> {
  const config = loadConfig()

  if (!config.file?.sources) {
    return textResult('No file plugin sources configured.')
  }

  const sources = Object.entries(config.file.sources)
    .map(([name, source]) => `- ${name}: ${source.local.base_path} (${source.type})`)
    .join('\n')

  return textResult(`File Plugin Sources:\n${sources}`)
}
```

## Implementation Phases

### Phase 1: Configuration Schema & Types (2 hours)
- Update config schemas with file plugin types
- Update config loader to support unified config path
- Maintain backward compatibility with legacy path

### Phase 2: File Source Resolution (3 hours)
- Create `FileSourceResolver` class
- Update URI resolution to detect file plugin sources
- Add `sourceType` and `filePluginSource` to `ResolvedReference`

### Phase 3: File Plugin Storage Provider (3 hours)
- Create `FilePluginStorage` provider
- Update `StorageManager` to register file plugin provider
- Update priority order to include file-plugin first

### Phase 4: Cache Bypass for Current Project (2 hours)
- Update `CacheManager.get()` to skip cache for file plugin sources
- Update `CacheManager.set()` to avoid caching file plugin sources
- Add comments explaining the optimization

### Phase 5: MCP Server Integration (2 hours)
- Update `handleFetch()` to handle file plugin sources
- Add enhanced error messages for file not found
- Add `codex_file_sources_list` tool

### Phase 6: Config Migration Utility (3 hours)
- Create migration utility for legacy → unified config
- Add CLI command `codex config migrate`
- Create backups and validate merged config

### Phase 7: Testing & Documentation (4 hours)
- Unit tests for source resolver and file plugin storage
- Integration tests for end-to-end scenarios
- Update documentation with new config structure

**Total Estimated Time:** ~19 hours

## Integration Points with File Plugin

The codex plugin will **not** implement file plugin functionality. Clear boundaries:

1. **Read-only access**: Codex reads file plugin config from unified config
2. **No push/pull**: Codex never writes to S3 - that's file plugin's responsibility
3. **Delegation**: Error messages suggest using file plugin commands:
   - `file pull specs` - Pull specs from S3 to local
   - `file sync` - Sync all sources
4. **Current project only**: File plugin integration only applies to current project

## Backward Compatibility

### Migration Timeline

1. **v0.9.0** (next release):
   - Introduce unified config support
   - Maintain full backward compatibility
   - Add deprecation warning

2. **v1.0.0** (future):
   - Make unified config the default
   - Legacy config still works with warnings

3. **v2.0.0** (future):
   - Remove legacy config support
   - Require migration to unified config

### Fallback Behavior

- Config loader tries `.fractary/config.yaml` first
- Falls back to `.fractary/codex/config.yaml` if not found
- Logs deprecation warning if using legacy path
- All existing features continue working during transition

## Success Criteria

### Functional Requirements

- [ ] Unified config loads correctly from `.fractary/config.yaml`
- [ ] File sources discovered and parsed from config
- [ ] Current project URIs resolve to file plugin sources
- [ ] Current project files read without caching
- [ ] External project files continue using cache
- [ ] MCP `codex_document_fetch` works with file plugin
- [ ] MCP `codex_file_sources_list` shows available sources
- [ ] Config migration creates valid unified config
- [ ] Backward compatibility with legacy config
- [ ] Error messages guide to file plugin commands

### Non-Functional Requirements

- [ ] Performance: No degradation for existing codex operations
- [ ] Security: File plugin integration doesn't expose unauthorized access
- [ ] Reliability: Fallback behavior works during migration period
- [ ] Maintainability: Clear separation between codex and file plugin concerns

### Test Coverage

- [ ] Unit tests for `FileSourceResolver`
- [ ] Unit tests for `FilePluginStorage`
- [ ] Unit tests for URI resolution with file sources
- [ ] Unit tests for cache bypass logic
- [ ] Integration tests for end-to-end file plugin access
- [ ] Migration tests for config conversion
- [ ] Backward compatibility tests

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking changes impact existing users | High | 2-version deprecation timeline, migration utility |
| Config complexity confuses users | Medium | Clear documentation, migration guide, helpful error messages |
| Version skew between codex and file plugin | Medium | Feature flags, graceful degradation |
| Performance impact on existing operations | Low | File plugin provider current-project-only, minimal overhead |

## Dependencies

- **File plugin config structure**: Defined in architectural discussion, no blocking issues
- **Fractary Core file plugin**: Implementation can proceed independently
- **MCP server**: Already supports tool additions
- **SDK architecture**: Provider pattern supports new providers

## References

- Architectural discussion from Fractary Core (see context section)
- SPEC-20260105-standardize-codex-config-locations: Config migration patterns
- SPEC-20260111-codex-archive-awareness: S3 storage provider patterns
- File plugin bucket naming: `{project-name}-files` (e.g., `core-files`, `corthodex-core-files`)

## Appendix: URI Examples

### Current Project Access

```bash
# Full format
codex://fractary/core/specs/SPEC-001.md
→ Reads from .fractary/specs/SPEC-001.md (no cache)

# Shorthand format
codex://specs/SPEC-001.md
→ Expands to fractary/core/specs/SPEC-001.md
→ Reads from .fractary/specs/SPEC-001.md (no cache)

# Logs example
codex://logs/issue-123.log
→ Reads from .fractary/logs/issue-123.log (no cache)
```

### External Project Access

```bash
# External specs
codex://corthos/etl-corthion-ai/specs/SPEC-001.md
→ Fetches from S3: s3://etl-corthion-ai-files/specs/SPEC-001.md
→ Caches in .fractary/codex/cache/corthos/etl-corthion-ai/specs/

# External docs (GitHub)
codex://fractary/faber/docs/README.md
→ Fetches from GitHub: fractary/faber repo
→ Caches in .fractary/codex/cache/fractary/faber/docs/
```

### Error Handling

```bash
# File not found locally
codex://specs/SPEC-002.md (file doesn't exist locally)

Error: File not found locally: .fractary/specs/SPEC-002.md
Suggestion: Run: file pull specs
```

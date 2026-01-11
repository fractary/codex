# SPEC-20260111: Codex Archive Awareness

**Created:** 2026-01-11
**Status:** Approved
**Type:** Enhancement

## Executive Summary

Enable Codex MCP server to transparently access archived documents from S3, making URIs like `codex://org/project/specs/WORK-123.md` work regardless of whether the file is in the active project (GitHub) or archived (S3). This implements lifecycle-based storage where evolving documents live in GitHub with versioning, while completed work is archived to S3.

## Problem Statement

Currently, when specs or other documents are archived to S3 (via fractary-spec or fractary-logs plugins), they become inaccessible via Codex URIs. Users must either:
1. Keep old documents in the active project (pollutes context, causes Claude to find outdated info)
2. Accept that archived documents are inaccessible (loses valuable historical reference)

This creates a tension between context cleanliness and document accessibility.

## Architectural Decision: Hybrid GitHub + S3

### Lifecycle-Based Storage Model

**Active Content → GitHub:**
- Living docs, evolving specs, active standards
- **Needs:** Git versioning, PR workflow, GitHub search/UI
- **Access:** `codex://org/project/docs/api-guide.md` → GitHub

**Completed Content → S3:**
- Finished specs (issue closed), old logs, deprecated docs
- **Don't need:** Further versioning (iteration complete)
- **Access:** `codex://org/project/specs/WORK-123.md` → S3

### Why Hybrid Works

**Separation of Concerns:**
1. GitHub = Living knowledge (evolving, collaborative, versioned)
2. S3 = Historical records (completed, static, archived)
3. Codex MCP = Unified interface (same URI, smart routing)

**Key Insight:** Archive is about **lifecycle** (evolving vs complete), not **age** (old vs new)

## Solution Design

### Architecture Overview

```
MCP Tool: codex_document_fetch
   ↓
CacheManager.get(reference)
   ↓ (cache miss)
StorageManager.fetch(reference)
   ↓
Priority chain: ['local', 's3-archive', 'github', 'http']
   ↓
LocalStorage (current project) OR S3ArchiveStorage (archive) OR GitHub
```

### New Component: S3ArchiveStorage Provider

**Location:** `sdk/js/src/storage/s3-archive.ts`

**Responsibilities:**
1. Handle archive lookups when local/GitHub don't have the file
2. Calculate archive path from original reference
3. Delegate to fractary-file CLI for actual S3 access
4. Support per-project archive configuration

**Key Methods:**
```typescript
class S3ArchiveStorage implements StorageProvider {
  type = 's3-archive'

  canHandle(reference: ResolvedReference): boolean {
    // Check: current project + archive enabled + matches patterns
  }

  async fetch(reference: ResolvedReference): Promise<FetchResult> {
    // 1. Calculate archive path
    // 2. Call fractary-file CLI via execFileNoThrow
    // 3. Return content with source: 's3-archive'
  }
}
```

### Archive Path Structure

Archive paths mirror project structure exactly:

```
Original: specs/WORK-123.md
Archive:  archive/specs/fractary/auth-service/specs/WORK-123.md

Pattern:  archive/{type}/{org}/{project}/{original-path}
```

**Type detection:**
- `specs/` → type: `specs`
- `docs/` → type: `docs`
- Path contains `/logs/` → type: `logs`
- Default → type: `misc`

### Configuration Schema

Extend `CodexConfigSchema` (in `sdk/js/src/schemas/config.ts`):

```typescript
export const ArchiveConfigSchema = z.object({
  projects: z.record(z.object({
    enabled: z.boolean(),
    handler: z.enum(['s3', 'r2', 'gcs', 'local']),
    bucket: z.string().optional(),
    prefix: z.string().optional(),
    patterns: z.array(z.string()).optional(),
  })),
})

export const CodexConfigSchema = z.object({
  organizationSlug: z.string(),
  directories: DirectoriesSchema.optional(),
  rules: SyncRulesSchema.optional(),
  sync: DirectionalSyncSchema.optional(),
  archive: ArchiveConfigSchema.optional(), // NEW
}).strict()
```

**Example configuration:**
```json
{
  "organizationSlug": "fractary",
  "archive": {
    "projects": {
      "auth-service": {
        "enabled": true,
        "handler": "s3",
        "bucket": "fractary-archives",
        "prefix": "archive/",
        "patterns": ["specs/**", "docs/**"]
      }
    }
  }
}
```

### Integration with fractary-file

Uses existing fractary-file CLI infrastructure:

```typescript
import { execFileNoThrow } from '../utils/execFileNoThrow.js'

async fetch(reference: ResolvedReference): Promise<FetchResult> {
  const archivePath = this.calculateArchivePath(reference)
  const config = this.getArchiveConfig(reference)

  const result = await execFileNoThrow('fractary', [
    'file', 'read',
    '--remote-path', archivePath,
    '--handler', config.handler,
  ])

  return {
    content: Buffer.from(result.stdout),
    contentType: detectContentType(reference.path),
    size: result.stdout.length,
    source: 's3-archive',
    metadata: { archivePath, bucket: config.bucket }
  }
}
```

**Benefits:**
- Leverages existing auth/retry/validation logic
- Supports all storage backends (S3, R2, GCS, Google Drive)
- Clean separation: Codex = discovery, fractary-file = storage
- No direct AWS SDK dependency

## Implementation Steps

### Phase 1: Core Infrastructure

1. **Create S3ArchiveStorage Provider** (`sdk/js/src/storage/s3-archive.ts`)
   - Implement `StorageProvider` interface
   - Add `canHandle()` logic with config checks
   - Implement `fetch()` with fractary-file CLI integration
   - Add `calculateArchivePath()` helper
   - Add error handling for S3 failures

2. **Extend Configuration Schema** (`sdk/js/src/schemas/config.ts`)
   - Add `ArchiveConfigSchema` with Zod validation
   - Extend `CodexConfigSchema` with archive field
   - Add config defaults in `sdk/js/src/core/config/defaults.ts`

3. **Register Archive Provider** (`sdk/js/src/storage/manager.ts`)
   - Accept archive config in constructor
   - Initialize S3ArchiveStorage if configured
   - Update default priority: `['local', 's3-archive', 'github', 'http']`
   - Add logging for archive hits/misses

### Phase 2: MCP Integration

4. **Update MCP Server** (`mcp/server/src/server.ts`)
   - Load archive config from Codex config
   - Pass to StorageManager on initialization
   - Ensure archive provider is registered

### Phase 3: Testing

5. **Unit Tests** (`sdk/js/src/storage/s3-archive.test.ts`)
   - Test archive path calculation
   - Test `canHandle()` logic with various configs
   - Test `fetch()` with mocked fractary-file CLI
   - Test error handling

6. **Integration Tests** (`sdk/js/tests/integration/`)
   - Test provider priority with archive
   - Test fallback chain: local → archive → github
   - Test per-project config
   - Test cache behavior with archived files

### Phase 4: Documentation

7. **Update Documentation**
   - MCP server README with archive configuration
   - Example archive setup guide
   - Archive path structure conventions
   - Troubleshooting guide

## Critical Files

### New Files
- `sdk/js/src/storage/s3-archive.ts` - Archive storage provider
- `sdk/js/src/storage/s3-archive.test.ts` - Unit tests

### Modified Files
- `sdk/js/src/storage/manager.ts` - Register provider, update priority
- `sdk/js/src/schemas/config.ts` - Add archive config schema
- `sdk/js/src/core/config/defaults.ts` - Add default archive config
- `mcp/server/src/server.ts` - Initialize with archive config

## Testing Strategy

### End-to-End Scenarios

**Scenario 1: Local File (No Archive)**
```
Setup: specs/TEST-001.md exists locally
Action: Fetch codex://org/project/specs/TEST-001.md
Expected: Returns from LocalStorage, source: 'local'
```

**Scenario 2: Archived File (No Local)**
```
Setup: specs/TEST-001.md archived to S3, local deleted
Action: Fetch codex://org/project/specs/TEST-001.md
Expected: Returns from S3ArchiveStorage, source: 's3-archive'
```

**Scenario 3: Not Found**
```
Setup: specs/MISSING.md doesn't exist anywhere
Action: Fetch codex://org/project/specs/MISSING.md
Expected: Error with details about checked locations
```

**Scenario 4: Cache Behavior**
```
Setup: Archived file in S3
Action: Fetch twice
Expected: First fetch from S3, second from cache
```

### Unit Test Coverage

- `calculateArchivePath()` - All path types (specs, docs, logs, misc)
- `canHandle()` - Config enabled/disabled, pattern matching
- `fetch()` - Success, S3 errors, fractary-file CLI failures
- Config parsing - Valid/invalid archive config

## Success Criteria

1. ✅ Same URI works for local and archived files
2. ✅ Local files checked first (performance)
3. ✅ Archive fallback transparent to user
4. ✅ Per-project config working
5. ✅ All storage backends supported (S3, R2, GCS via fractary-file)
6. ✅ Error messages helpful when file not found
7. ✅ Cache works correctly for archived files
8. ✅ No breaking changes to existing Codex functionality

## Migration Path

### For Existing Projects

No immediate action required. Archive awareness is opt-in:

1. Projects without archive config work as before
2. Add archive config to enable transparent archive access
3. Existing archived files automatically accessible

### Configuration Migration

No migration needed - new optional config field.

## Future Enhancements

### Phase 2 (Post-Implementation)

1. **Archive Index** - Optional index file for faster lookup without S3 calls
2. **Archive Search** - Extend `codex_search` to include archived documents
3. **Archive Metadata** - Track archive date, size in document frontmatter
4. **Archive Sync Command** - CLI tool to sync local ↔ archive
5. **Multi-type Archives** - Extend to logs, docs, other artifact types

## Dependencies

### Required
- `fractary-file` CLI installed and configured
- S3 bucket configured for archives
- IAM permissions for S3 access

### Optional
- Archive index for performance optimization

## Risks & Mitigations

### Risk: fractary-file CLI Not Available
**Mitigation:** Check for CLI on initialization, provide clear error if missing

### Risk: S3 Access Slow
**Mitigation:** Cache layer handles this - only first access is slow

### Risk: Archive Path Conflicts
**Mitigation:** Strict path structure enforced in `calculateArchivePath()`

### Risk: Config Complexity
**Mitigation:** Per-project config with clear examples in docs

## Related Work

- **fractary-logs** - Archives logs to S3, needs this for references
- **fractary-spec** - Archives specs to S3, needs this for references
- **fractary-file** - Provides cloud storage abstraction
- **Codex MCP Server** - Provides document retrieval

## References

- Original discussion: Context management and archiving strategy
- fractary-file analysis: Multi-provider abstraction value
- Codex storage architecture: Provider pattern and fallback chain

## Appendix: Why Keep fractary-file?

### Value Analysis

**Current Usage:** 3 systems (logs, spec, codex)

**Benefits:**
- Multi-provider abstraction (5 backends: S3, R2, GCS, Google Drive, local)
- Complex auth handling (IAM roles, profiles, keys, OAuth)
- Security layer (path validation, credential masking)
- Retry logic (exponential backoff, global config)
- 58% context reduction (scripts outside LLM context)

**Cost-Benefit:**
- Infrastructure: ~1.5K lines
- Saves: ~900 lines duplication (3 systems)
- Future: ~1,800+ lines saved (6+ systems including docs, faber)

**Decision:** KEEP - Valuable abstraction that prevents duplication and provides multi-provider flexibility.

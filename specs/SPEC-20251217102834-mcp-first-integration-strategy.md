---
spec_id: spec-20251217102834-mcp-first-integration-strategy
title: MCP-First Integration Strategy for Codex Plugin
type: infrastructure
status: draft
created: 2025-12-17
author: Claude Code
validated: false
tags:
  - mcp
  - architecture
  - claude-code-plugin
  - sdk-integration
  - performance
---

# Infrastructure Specification: MCP-First Integration Strategy for Codex Plugin

**Type**: Infrastructure
**Status**: Draft
**Created**: 2025-12-17

## Summary

This specification defines an MCP-first integration strategy for the Fractary Codex Claude Code plugin. The goal is to use the MCP (Model Context Protocol) server as the primary backend for all codex operations, with the CLI as a fallback. This approach maximizes performance (10x faster operations) while maintaining comprehensive functionality coverage.

The current v4.0 plugin architecture delegates all operations through the CLI, incurring ~50-100ms overhead per operation. By switching to MCP-first with CLI fallback, we can reduce this to ~5-10ms for common operations while preserving full functionality for batch and config operations.

## Objectives

- Reduce operation latency from ~100ms (CLI) to ~10ms (MCP) for common operations
- Maintain 100% functionality coverage through hybrid MCP + CLI architecture
- Keep Claude Code plugin skills as lightweight wrappers around SDK functionality
- Create a smart integration router that automatically selects the optimal backend
- Preserve CLI fallback for environments without MCP server
- Future-proof architecture for Python SDK integration when it matures

## Current State

### Architecture (v4.0)
```
Claude Code Plugin Skills (13 skills)
  ↓ (delegates via Skill tool)
cli-helper skill
  ↓ (invokes bash)
@fractary/codex-cli (Node.js process spawn)
  ↓ (imports)
@fractary/codex SDK (TypeScript)
```

### Performance Characteristics
- Document fetch: ~100ms
- Cache operations: ~80ms
- Sync operations: ~500ms
- Total skill overhead: ~50ms per operation
- Process spawn overhead: ~50-100ms per operation

### Available Components

| Component | Version | Status | Coverage |
|-----------|---------|--------|----------|
| TypeScript SDK | 0.2.0 | Production | 312 exports, comprehensive |
| CLI | 0.2.2 | Production | 13 commands |
| MCP Server | 0.1.0 | Production | 4 tools |
| Python SDK | 0.1.0 | Alpha | Feature incomplete |
| Plugin | 2.0.0 | Production | 13 skills via CLI |

### MCP Server Current Tools
1. `codex_fetch` - Fetch documents by URI
2. `codex_search` - Search cached documents
3. `codex_list` - List cache contents
4. `codex_invalidate` - Clear cache entries

### Plugin Skills Currently Using CLI
1. document-fetcher
2. cache-clear
3. cache-list
4. cache-metrics
5. cache-health
6. project-syncer
7. org-syncer
8. config-migrator
9. handler-http
10. handler-sync-github
11. repo-discoverer
12. config-helper
13. cli-helper

## Target State

### Architecture (v5.0)
```
┌─────────────────────────────────────────────────────────────┐
│              Claude Code Plugin Skills                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ document-    │  │ cache-       │  │ project-     │      │
│  │ fetcher      │  │ manager      │  │ syncer       │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                            ▼                                 │
│              ┌─────────────────────────────┐                │
│              │  Integration Router Skill   │                │
│              │  (NEW - Smart delegation)   │                │
│              └─────────────┬───────────────┘                │
└────────────────────────────┼─────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
         TRY FIRST                      FALLBACK
              │                             │
              ▼                             ▼
   ┌──────────────────────┐     ┌──────────────────────┐
   │  MCP Server          │     │  CLI Helper          │
   │  (~5-10ms/op)        │     │  (~50-150ms/op)      │
   └──────────┬───────────┘     └──────────┬───────────┘
              └──────────────┬──────────────┘
                             ▼
                  ┌──────────────────────┐
                  │  @fractary/codex SDK │
                  └──────────────────────┘
```

### Target Performance
- Document fetch: ~15ms (85% faster)
- Cache operations: ~10ms (87% faster)
- Sync operations: ~50ms (90% faster)
- Total skill overhead: ~5ms (90% faster)

## Architecture

### Components

- **Integration Router Skill**: Smart delegation layer that routes operations to optimal backend
  - Type: Plugin Skill
  - Purpose: Detect MCP availability, route operations, handle fallback

- **MCP Server (Expanded)**: Primary backend for all supported operations
  - Type: MCP Server (Node.js)
  - Purpose: Direct SDK access without process spawn overhead

- **CLI Helper**: Fallback backend for batch operations and MCP-unavailable environments
  - Type: Plugin Skill
  - Purpose: Comprehensive coverage, batch operations

- **Plugin Skills (Updated)**: Lightweight wrappers delegating to router
  - Type: Plugin Skills (13 total)
  - Purpose: User-facing interface, input validation

### Data Flow

```
User Request
     ↓
Plugin Skill (validate, format)
     ↓
Integration Router
     ↓
┌────┴────┐
│ Check   │
│ MCP     │
└────┬────┘
     │
  ┌──┴──┐
  │     │
  ↓     ↓
MCP   CLI
(fast) (fallback)
  │     │
  └──┬──┘
     ↓
SDK Operations
     ↓
Response
```

### Backend Decision Matrix

| Operation | Primary | Fallback | Rationale |
|-----------|---------|----------|-----------|
| fetch | MCP | CLI | MCP optimal for single doc |
| search | MCP | CLI | MCP has index access |
| list | MCP | CLI | MCP has cache in memory |
| invalidate | MCP | CLI | MCP has direct cache access |
| sync-project | MCP | CLI | MCP fast for single project |
| sync-org | CLI | - | Batch operation, CLI better |
| init | MCP | CLI | MCP can persist config |
| migrate | CLI | - | One-time operation |
| validate | MCP | CLI | MCP has config in memory |
| health | MCP | CLI | MCP has live state |
| cache-stats | MCP | CLI | MCP has metrics in memory |
| cache-clear | MCP | CLI | MCP atomic operations |

## Resources Required

### Compute
- MCP Server: Same process as Claude Code (no additional compute)
- CLI Fallback: Node.js process spawn when needed

### Storage
- Cache Directory: ~/.fractary/codex/cache (existing)
- Config Files: .fractary/codex/config.yaml per project (existing)

### Network
- MCP: StdIO/HTTP transport (local only)
- CLI: No network (local filesystem)

### Third-Party Services
- GitHub API: For repository sync operations (existing)
- npm Registry: For CLI installation (existing)

## Configuration

### Environment Variables
- `CODEX_MCP_ENABLED`: Enable/disable MCP server (default: true)
- `CODEX_MCP_TIMEOUT`: MCP operation timeout in ms (default: 5000)
- `CODEX_CLI_FALLBACK`: Enable CLI fallback (default: true)

### Secrets Management
No additional secrets required. Uses existing GitHub token from environment.

### Configuration Files
- `.fractary/codex/config.yaml`: Project configuration (existing)
- `~/.fractary/codex/config.yaml`: Global configuration (existing)

## Implementation Plan

### Phase 1: Expand MCP Server Tools
**Status**: Not Started

**Objective**: Add 8 new tools to MCP server to cover ~90% of operations

**Tasks**:
- [ ] Add `codex_sync_project` tool - Project sync operation
- [ ] Add `codex_sync_org` tool - Organization sync operation
- [ ] Add `codex_init` tool - Initialize configuration
- [ ] Add `codex_migrate` tool - Configuration migration
- [ ] Add `codex_validate_refs` tool - Validate references
- [ ] Add `codex_validate_setup` tool - Setup validation
- [ ] Add `codex_cache_stats` tool - Detailed cache metrics
- [ ] Add `codex_cache_health` tool - Health diagnostics
- [ ] Update MCP server types.ts with new type definitions
- [ ] Update MCP server capabilities
- [ ] Add tests for new tools
- [ ] Update MCP server documentation

**Estimated Scope**: 2-3 days

### Phase 2: Create Integration Router Skill
**Status**: Not Started

**Objective**: Smart delegation layer with MCP-first, CLI-fallback strategy

**Tasks**:
- [ ] Create `/plugins/codex/skills/integration-router/skill.md`
- [ ] Implement MCP availability detection script
- [ ] Implement operation routing logic
- [ ] Implement fallback mechanism
- [ ] Add structured response format
- [ ] Add performance metrics logging
- [ ] Test with existing MCP tools
- [ ] Document usage patterns

**Estimated Scope**: 1 day

### Phase 3: Update Existing Skills
**Status**: Not Started

**Objective**: Refactor skills to use integration router instead of cli-helper

**Tasks**:
- [ ] Update document-fetcher to use integration-router
- [ ] Update cache-clear to use integration-router
- [ ] Update cache-list to use integration-router
- [ ] Update cache-metrics to use integration-router
- [ ] Update cache-health to use integration-router
- [ ] Update project-syncer to use integration-router
- [ ] Update org-syncer to use integration-router
- [ ] Update config-migrator to use integration-router
- [ ] Bump plugin version to 3.0.0 (v5.0 internal)
- [ ] Update plugin README with new architecture
- [ ] E2E testing of all updated skills

**Estimated Scope**: 2-3 hours (find/replace + testing)

### Phase 4: Python SDK Integration (Future)
**Status**: Not Started

**Objective**: Add Python SDK as alternative backend when mature

**Tasks**:
- [ ] Complete Python SDK to feature parity with TypeScript
- [ ] Create Python execution wrapper for integration-router
- [ ] Add Python backend detection to router
- [ ] Implement Python → SDK direct calls
- [ ] Benchmark Python vs MCP vs CLI
- [ ] Document Python backend configuration

**Estimated Scope**: 2-3 weeks (depends on Python SDK completion)

## Deployment Strategy

### Infrastructure as Code
No IaC changes required. This is a software architecture change within the existing plugin system.

### Deployment Steps
1. Update MCP server package with new tools (npm publish)
2. Update plugin with integration-router skill
3. Update existing skills to use router
4. Test in development environment
5. Release plugin update (v3.0.0)
6. Users update plugin via standard mechanism

### Rollback Plan
1. Integration router falls back to CLI automatically if MCP unavailable
2. Skills can be reverted to cli-helper delegation by changing skill.md
3. Plugin version pinning allows rollback to v2.0.0
4. No data migration required - pure code change

## Monitoring and Observability

### Metrics
- `codex_operation_duration_ms`: Operation execution time
- `codex_backend_used`: Which backend handled the operation (mcp/cli)
- `codex_fallback_triggered`: When CLI fallback was used
- `codex_mcp_availability`: MCP server availability status

### Logs
- Skill Execution: JSON structured logs
- Integration Router: Decision logs (which backend selected)

### Alerts
- **MCP Unavailable**: MCP server not responding → Switch to CLI fallback, log warning
- **High Latency**: Operation > 500ms → Log warning, investigate

### Dashboards
- Plugin Performance: Track operation latency over time
- Backend Distribution: Visualize MCP vs CLI usage

## Security Considerations

### Authentication/Authorization
No changes. Uses existing permission system (frontmatter-based).

### Network Security
MCP uses StdIO transport (no network exposure). CLI operates locally only.

### Data Encryption
No changes. Cache data encrypted at rest if OS-level encryption enabled.

### Compliance
No compliance impact. No PII stored, no external data transmission changes.

## Cost Estimation

- MCP Server: $0/month (runs in-process)
- CLI Fallback: $0/month (local execution)
- Development: ~1 week engineering time

**Total Estimated**: $0/month (no infrastructure cost)

## Dependencies

- @fractary/codex SDK v0.2.0+ (existing)
- @fractary/codex-cli v0.2.2+ (existing)
- @fractary/codex-mcp v0.1.0+ (existing, needs expansion)
- Claude Code MCP integration (existing)
- Node.js 18+ (existing requirement)

## Risks and Mitigations

- **Risk**: MCP server not available in some environments
  - **Impact**: Medium - operations fall back to CLI
  - **Mitigation**: Automatic CLI fallback, no user intervention required

- **Risk**: MCP tool expansion introduces bugs
  - **Impact**: Medium - new tools may have issues
  - **Mitigation**: Comprehensive test suite, CLI fallback safety net

- **Risk**: Integration router adds complexity
  - **Impact**: Low - single point of routing
  - **Mitigation**: Simple decision logic, clear documentation

- **Risk**: Performance regression during transition
  - **Impact**: Low - worst case is CLI speed (current behavior)
  - **Mitigation**: Gradual rollout, metrics monitoring

## Testing Strategy

### Infrastructure Tests
- MCP server tool registration verification
- Integration router backend detection tests
- Fallback mechanism trigger tests

### Integration Tests
- E2E tests for each skill through router
- MCP → SDK operation flow tests
- CLI fallback path tests
- Mixed MCP/CLI operation sequences

### Disaster Recovery Tests
- MCP server crash recovery (verify CLI fallback)
- Cache corruption recovery (verify regeneration)

## Documentation Requirements

- Architecture Diagram: Updated plugin architecture with router
- Migration Guide: How to update custom skills to use router
- API Reference: New MCP tools documentation
- Performance Guide: Expected latency improvements

## Acceptance Criteria

- [ ] MCP server exposes 12+ tools (current 4 + 8 new)
- [ ] Integration router correctly detects MCP availability
- [ ] Integration router routes to MCP for supported operations
- [ ] Integration router falls back to CLI when MCP unavailable
- [ ] All 13 plugin skills updated to use integration router
- [ ] Document fetch latency < 20ms via MCP
- [ ] Cache operations latency < 15ms via MCP
- [ ] CLI fallback works identically to current v4.0 behavior
- [ ] All existing tests pass
- [ ] New integration tests added for router
- [ ] Plugin documentation updated

## Implementation Notes

### Why Not Python SDK Now?
The Python SDK (v0.1.0) is in alpha status and feature incomplete. While it would provide a Node.js-free execution path, the MCP server already provides optimal performance through direct SDK access. The Python SDK should be added as a third backend option when it reaches production status, primarily for Python-native environments.

### MCP vs CLI Performance Analysis
| Aspect | MCP Server | CLI |
|--------|-----------|-----|
| Process spawn | None (in-process) | ~50-100ms |
| State persistence | Yes (cache in memory) | No (reload each call) |
| JSON overhead | Minimal | Parse/stringify |
| Streaming support | Yes | No (buffered) |
| Batch operations | Limited | Good |
| Total overhead | ~5-10ms | ~50-150ms |

### Backward Compatibility
- All existing commands continue to work
- CLI-helper skill preserved as fallback implementation
- No breaking changes to skill input/output formats
- Plugin upgrade is non-breaking (v3.0.0)

### Future Considerations
1. **Python SDK Integration**: Add when SDK reaches v1.0
2. **WebSocket Transport**: For remote MCP server scenarios
3. **Caching Layer**: Add response caching in router for repeated queries
4. **Metrics Dashboard**: Visual performance monitoring

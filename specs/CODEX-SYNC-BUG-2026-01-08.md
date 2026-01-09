# SPEC: Fix Codex Sync Manager Pattern Matching Bug

**Document ID:** CODEX-SYNC-BUG-2026-01-08
**Created:** 2026-01-08
**Status:** Active
**Priority:** High
**Component:** fractary-codex:sync-manager agent
**Affected Projects:** All projects using codex sync (etl.corthion.ai confirmed)

---

## Executive Summary

The `fractary-codex:sync-manager` agent is not correctly reading or applying glob patterns from `.fractary/codex/config.yaml` during sync operations. Instead of syncing 569 files matching configured patterns, it synced only 11 untracked root-level files that don't match any configured pattern.

**Impact:** Critical - Documentation sync is completely broken, preventing proper codex repository updates.

---

## Issue Description

### Expected Behavior

When executing `/fractary-codex:sync --to-codex --env prod`, the sync-manager agent should:

1. Read glob patterns from `.fractary/codex/config.yaml` → `sync.to_codex` section
2. Apply each glob pattern to find matching files in the project
3. Sync all matched files to the codex repository
4. Report accurate file counts and sync results

### Actual Behavior

The sync-manager agent:

1. ❌ Ignored all configured glob patterns in `config.yaml`
2. ❌ Synced 11 random untracked files from the root directory
3. ✅ Reported success (false positive)
4. ❌ Missed 558+ files that should have been synced

### Impact Analysis

| Metric | Expected | Actual | Delta |
|--------|----------|--------|-------|
| Files synced | 569 | 11 | -558 (-98%) |
| Schema files | 305 | 0 | -305 (-100%) |
| Documentation | 264 | 2 | -262 (-99%) |

---

## Root Cause Analysis

### Configuration File Location

**Correct location:** `.fractary/codex/config.yaml` (v4.0 YAML format)
**Deprecated location:** `.fractary/plugins/codex/config.json` (old JSON format)

**Hypothesis:** The sync-manager agent may be:
- Reading the deprecated config.json instead of config.yaml
- Not parsing YAML format correctly
- Using hardcoded fallback patterns
- Encountering a silent error and reverting to default behavior

### Configuration Content

The correct config at `.fractary/codex/config.yaml` includes:

```yaml
version: "4.0"
organization: corthosai
codex_repo: codex.corthos.ai

sync:
  to_codex:
    # Core project documentation
    - "README.md"
    - "CLAUDE.md"

    # Schema files (JSON and Markdown)
    - "docs/schema/**/*.json"
    - "docs/schema/**/*.md"

    # Guides and documentation
    - "docs/guides/**/*.md"
    - "docs/standards/**/*.md"
    - "docs/**/*.md"

    # Specifications
    - "specs/**/*.md"
    - "docs/specs/**/*.md"

    # ETL-specific documentation
    - "docs/pipelines/**/*.md"
    - "docs/datasets/**/*.md"

    # Agent and skill documentation
    - ".claude/agents/**/*.md"
    - ".claude/skills/**/*.md"
```

### What Actually Got Synced

```
Files synced: 11 (658.6 KB)

1. .gitattributes
2. .gitignore
3. CLAUDE.md ✓ (only 1 of 2 correct matches)
4. Makefile
5. README.md ✓ (only 2 of 2 correct matches)
6. WORK-00088-SPEC.md
7. common.zip
8. package-lock.json
9. package.json
10. requirements.txt
11. test_ipeds_gr.py
```

**Observation:** Only 2 files (CLAUDE.md, README.md) match configured patterns. The other 9 files don't match any pattern in the config.

---

## Evidence & Diagnostics

### File Count Verification

```bash
# Actual files that should have been synced:
$ find docs/schema -type f \( -name "*.json" -o -name "*.md" \) | wc -l
305

# Pattern verification (docs/schema only):
$ git ls-files docs/schema/**/*.json docs/schema/**/*.md | wc -l
305

# Total files matching all to_codex patterns:
~569 files
```

### Breakdown by Pattern

| Pattern | Expected Matches | Actual Synced | Success Rate |
|---------|------------------|---------------|--------------|
| `README.md` | 1 | 1 | 100% |
| `CLAUDE.md` | 1 | 1 | 100% |
| `docs/schema/**/*.json` | 83 | 0 | 0% |
| `docs/schema/**/*.md` | 222 | 0 | 0% |
| `docs/guides/**/*.md` | 16 | 0 | 0% |
| `docs/standards/**/*.md` | 21 | 0 | 0% |
| `docs/**/*.md` | 74 | 0 | 0% |
| `specs/**/*.md` | 85 | 0 | 0% |
| `docs/specs/**/*.md` | 44 | 0 | 0% |
| `.claude/agents/**/*.md` | 11 | 0 | 0% |
| `.claude/skills/**/*.md` | 5 | 0 | 0% |
| **Not configured** | 0 | 9 | N/A ❌ |

---

## Reproduction Steps

1. **Setup:**
   ```bash
   cd /path/to/etl.corthion.ai
   # Ensure .fractary/codex/config.yaml exists with patterns
   ```

2. **Execute sync:**
   ```bash
   /fractary-codex:sync --to-codex --env prod
   ```

3. **Observe results:**
   - Agent reports success
   - Only 11 files synced (should be 569)
   - Wrong files selected (untracked root files vs. configured patterns)

4. **Verify with dry-run:**
   ```bash
   /fractary-codex:sync --to-codex --env prod --dry-run
   ```
   - Diagnostic shows 569 files should match
   - Actual sync behavior doesn't match diagnostic

---

## Technical Analysis

### Agent Behavior Investigation

The sync-manager agent output showed:
```
Total Files Synced: 11 files (658.6 KB)
Operations: 11 created, 0 failed, 1 skipped
```

**Questions for investigation:**
1. What config file is the agent actually reading?
2. Is the YAML parser working correctly?
3. Are glob patterns being expanded properly?
4. Is there error handling that's silently failing?
5. Why were untracked files selected?

### Possible Code Issues

**Hypothesis 1:** Config file resolution bug
```python
# Agent may be doing this:
config_path = ".fractary/plugins/codex/config.json"  # Old path
# Instead of:
config_path = ".fractary/codex/config.yaml"  # Correct path
```

**Hypothesis 2:** YAML parsing issue
```python
# Agent may not be parsing YAML correctly:
patterns = config['sync']['to_codex']  # May return None or []
```

**Hypothesis 3:** Glob pattern expansion failure
```python
# Glob patterns may not be expanding:
"docs/schema/**/*.json"  # Should expand to 83 files
# But actually returns: []
```

**Hypothesis 4:** Fallback to default behavior
```python
# On error, agent may fall back to:
files = os.listdir(".")  # Just grab root files
```

---

## Proposed Solution

### Required Fixes

1. **Config File Resolution:**
   - Update sync-manager to read `.fractary/codex/config.yaml` (v4.0)
   - Add deprecation warning if old config.json exists
   - Fail fast if config file is missing or invalid

2. **YAML Parsing:**
   - Ensure proper YAML parsing library is used
   - Validate config structure on load
   - Log the parsed patterns for debugging

3. **Glob Pattern Expansion:**
   - Implement robust glob pattern matching (use `glob` or `pathlib`)
   - Support `**` recursive wildcards correctly
   - Apply patterns relative to project root
   - Respect exclude patterns from config

4. **Error Handling:**
   - Never silently fail on config errors
   - Log all pattern matching operations
   - Report files matched per pattern
   - Fail sync if no files match (when patterns are configured)

5. **Validation:**
   - Add pre-sync validation step
   - Show user what files will be synced before proceeding
   - Require confirmation if file count seems wrong

### Recommended Implementation

```python
# Pseudocode for correct behavior

def sync_to_codex(project_path, config_path, env):
    # 1. Load and validate config
    config = load_yaml(config_path)
    validate_config_version(config, required="4.0")

    # 2. Get patterns
    patterns = config['sync']['to_codex']
    exclude_patterns = config['sync'].get('exclude', [])

    # 3. Expand glob patterns
    files_to_sync = []
    for pattern in patterns:
        matches = glob.glob(pattern, recursive=True)
        files_to_sync.extend(matches)
        log.info(f"Pattern '{pattern}' matched {len(matches)} files")

    # 4. Apply excludes
    files_to_sync = apply_excludes(files_to_sync, exclude_patterns)

    # 5. Validate results
    if not files_to_sync:
        raise SyncError("No files matched configured patterns")

    log.info(f"Total files to sync: {len(files_to_sync)}")

    # 6. Confirm with user
    if not dry_run:
        confirm_sync(files_to_sync, env)

    # 7. Execute sync
    return sync_files(files_to_sync, codex_repo, env)
```

---

## Acceptance Criteria

### Must Have (P0)

- [ ] Sync-manager reads config from `.fractary/codex/config.yaml`
- [ ] All glob patterns from `sync.to_codex` are correctly expanded
- [ ] Files matching patterns are synced (not random files)
- [ ] Sync count matches expected file count (569 files for etl.corthion.ai)
- [ ] Zero files synced that don't match any pattern

### Should Have (P1)

- [ ] Pre-sync validation shows matched files count per pattern
- [ ] Dry-run output matches actual sync behavior
- [ ] Clear error messages if config is missing or invalid
- [ ] Deprecation warning if old config.json is detected
- [ ] Sync summary shows files by pattern category

### Nice to Have (P2)

- [ ] Progress indicator during glob expansion
- [ ] Option to show all matched files before sync
- [ ] Diff view of what changed since last sync
- [ ] Performance optimization for large file sets

---

## Testing Requirements

### Unit Tests

```python
def test_config_yaml_parsing():
    """Ensure config.yaml is correctly parsed"""
    config = load_config(".fractary/codex/config.yaml")
    assert config['version'] == "4.0"
    assert 'to_codex' in config['sync']
    assert len(config['sync']['to_codex']) > 0

def test_glob_pattern_expansion():
    """Ensure glob patterns expand correctly"""
    matches = expand_pattern("docs/schema/**/*.json")
    assert len(matches) > 0
    assert all(f.endswith('.json') for f in matches)
    assert all('docs/schema' in f for f in matches)

def test_exclude_patterns():
    """Ensure exclude patterns work"""
    files = ["docs/test.md", "docs/internal/secret.md"]
    excluded = apply_excludes(files, ["docs/internal/**"])
    assert "docs/test.md" in excluded
    assert "docs/internal/secret.md" not in excluded
```

### Integration Tests

```python
def test_sync_to_codex_full_workflow():
    """Test complete sync workflow"""
    result = sync_to_codex(
        project="etl.corthion.ai",
        env="test",
        dry_run=True
    )

    # Should match at least 569 files
    assert result.file_count >= 569

    # Should include schema files
    schema_files = [f for f in result.files if 'docs/schema' in f]
    assert len(schema_files) >= 305

    # Should not include unmatched files
    assert "common.zip" not in result.files
    assert "package.json" not in result.files
```

### Regression Tests

```bash
# Test against known good state
./test_codex_sync.sh etl.corthion.ai prod --expect-files=569

# Verify no unmatched files synced
./verify_sync_patterns.sh etl.corthion.ai --strict
```

---

## Related Issues

- Migration from config.json to config.yaml (completed 2026-01-08)
- Codex v4.0 specification
- Glob pattern support in sync operations

---

## Open Questions

1. **Backward Compatibility:** Should the agent support both config.json and config.yaml during a transition period?
2. **Performance:** With 569 files, should sync be batched or use concurrent operations?
3. **Validation:** Should the agent validate that matched files are git-tracked before syncing?
4. **Error Recovery:** If some files fail to sync, should the operation continue or fail completely?

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Pattern match accuracy | 100% | All patterns correctly expand to expected files |
| File sync completeness | 100% | All matched files successfully synced |
| False positives | 0% | No unmatched files synced |
| Config compatibility | 100% | Works with all v4.0 config.yaml files |
| Error detection | 100% | All config/pattern errors reported to user |

---

## Timeline

**Priority:** High - Blocking production documentation sync

**Recommended Schedule:**
- Investigation: 1 day
- Fix implementation: 1-2 days
- Testing: 1 day
- Deployment: 1 day

**Total:** 4-5 days

---

## Contact & Context

**Reporter:** User from etl.corthion.ai project
**Date Reported:** 2026-01-08
**Environment:** Production (main branch, prod environment)
**Config Version:** 4.0 (YAML format)

**Test Case Repository:** etl.corthion.ai
**Expected File Count:** 569 files
**Actual File Count:** 11 files
**Success Rate:** 1.9% (critical failure)

---

## Appendix A: Full Config File

```yaml
# .fractary/codex/config.yaml
version: "4.0"
organization: corthosai
codex_repo: codex.corthos.ai

sync:
  to_codex:
    - "README.md"
    - "CLAUDE.md"
    - "docs/schema/**/*.json"
    - "docs/schema/**/*.md"
    - "docs/guides/**/*.md"
    - "docs/standards/**/*.md"
    - "docs/**/*.md"
    - "specs/**/*.md"
    - "docs/specs/**/*.md"
    - "docs/pipelines/**/*.md"
    - "docs/datasets/**/*.md"
    - ".claude/agents/**/*.md"
    - ".claude/skills/**/*.md"

  from_codex:
    - "core.corthodex.ai/docs/standards/**/*.md"
    - "core.corthodex.ai/docs/templates/**/*.md"
    - "standards/**/*.md"
    - "templates/**/*.md"
    - "shared/**/*.md"
    - "etl.corthion.ai/**"

  exclude:
    - "**/*-test.md"
    - "**/*.draft.md"
    - "docs/internal/**"
    - "**/node_modules/**"
    - "**/.git/**"

cache:
  enabled: true
  ttl_days: 7
  directory: ".fractary/codex/cache"

handlers:
  sync:
    active: github
    github:
      enabled: true
```

---

## Appendix B: Expected Files Sample

**docs/schema/ files (305 total):**
```
docs/schema/bea/README.md
docs/schema/bea/regional_price_parities/README.md
docs/schema/bea/regional_price_parities/sample.json
docs/schema/bea/regional_price_parities/schema.json
docs/schema/bls/abilities/README.md
docs/schema/bls/abilities/schema.json
docs/schema/bls/alternate_titles/CHANGELOG.md
docs/schema/bls/alternate_titles/README.md
docs/schema/bls/alternate_titles/schema.json
... (296 more files)
```

**Other docs/ files (264 total):**
```
docs/guides/development_guide.md
docs/guides/dataset-development-guide.md
docs/standards/production-safety-rules.md
docs/specs/dataset-management-standardization.md
... (260 more files)
```

---

**End of Specification**

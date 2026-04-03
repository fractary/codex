# Deep Analysis

Enhanced analysis mode activated by `--deep`. Adds git history analysis, cross-memory contradiction detection, and superseded memory detection beyond the standard claim verification.

## Git History Analysis

Check when referenced files were last modified and whether relevant areas changed since memory creation:

```bash
# When was the referenced file last modified?
git log -1 --format="%ai %s" -- {referenced_file}

# Has the relevant area changed since memory was created?
git log --after="{memory_created_date}" --oneline -- {relevant_directory}

# Check if a package was recently added or removed
git log --all --oneline -5 -- package.json
```

If git is not available, fall back to standard analysis and note in the report.

## Cross-Memory Contradiction Detection

Compare claims across all loaded memories to find contradictions:

**Contradiction patterns to check:**
- Two memories claim different solutions for the same problem
- An architectural decision says "use X" but a later memory says "migrated from X to Y"
- A convention says "always use pattern A" but a pattern memory documents "pattern B" for the same scenario
- A troubleshooting memory references a file/package that an architectural decision says was removed

For each contradiction, record:
- The two conflicting memory IDs
- The specific conflicting claims
- Which memory is newer (likely more current)

Search for topic overlap:
```
Search for "{key terms from memory}" in .fractary/codex/memory/
```

## Superseded Memory Detection

Check for memories effectively replaced by newer ones:

- Architectural decisions later reversed or evolved
- Troubleshooting entries for issues in rewritten code
- Performance memories for replaced optimizations
- Convention memories conflicting with newer conventions

Look for newer memories addressing the same topic by searching for shared keywords in other memory files.

## Enhanced Claim Classification

| Type | Example | Verification |
|------|---------|-------------|
| file_reference | "src/api/router.ts handles routing" | Glob for file existence |
| package_reference | "We use @prisma/client for ORM" | Grep in package.json |
| config_reference | "DATABASE_URL is set in .env" | Grep in config files |
| code_reference | "The AuthMiddleware class validates tokens" | Grep for class/function |
| version_reference | "Requires Node 18 or higher" | Read package.json engines |
| architectural_claim | "We use the repository pattern" | Grep for pattern indicators |
| behavioral_claim | "API returns 429 on rate limit" | Cannot verify statically — skip |

For file references not found, check if renamed or moved:
```
Search the codebase for "{filename_without_extension}"
```

## Dependency Verification (when --deep)

```bash
# Verify package is actually installed
npm ls {package_name} 2>/dev/null || echo "not installed"
```

## Scoring Adjustments for Deep Mode

Apply additional adjustments beyond the base scoring algorithm (see `docs/scoring-algorithm.md`):
- Contradicted by another memory: -0.2
- Superseded by newer memory: -0.3
- Has TODO/draft placeholders: -0.1
- All deep checks pass with no contradictions: no bonus (1.0 is max)

## Presenting Contradiction Findings

When contradictions are found, batch related findings and present together:

Ask the user which memory should take precedence, with options:
- Keep first, deprecate second (the convention is authoritative)
- Keep second, deprecate first (the pattern is valid for this use case)
- Keep both, add clarifying notes (both valid in different contexts)
- Deprecate both (neither is accurate anymore)

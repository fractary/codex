---
name: fractary-codex-memory-create
description: Create structured memory entries from troubleshooting sessions, architectural decisions, performance findings, and other reusable knowledge
---

# Memory Create

Creates structured memory entries in `.fractary/codex/memory/{type}/` as Markdown with YAML frontmatter.

## Memory Types

| Type | Prefix | Description |
|------|--------|-------------|
| troubleshooting | TS | Bug fixes, error resolutions |
| architectural-decision | AD | Design choices with rationale |
| performance | PF | Benchmarks, optimizations |
| pattern | PT | Reusable code patterns |
| integration | IN | Third-party integrations |
| convention | CV | Team conventions, standards |

## Workflow

1. **Determine type**: Use `--template`/`--memory-type` if provided. Otherwise, read `docs/interactive-guide.md` for type selection and auto-detection logic.
2. **Load template** (optional): Check `templates/{type}.md` for a structural template.
3. **Gather content**: Use `--context` to pre-populate, or read `docs/interactive-guide.md` for interactive gathering.
4. **Generate ID**: Read `docs/id-generation.md` for the `MEM-{PREFIX}-{SEQ}-{slug}` pattern.
5. **Populate body**: Read `docs/type-sections.md` for the section structure of the chosen type.
6. **Write file**: Ensure directory exists (`mkdir -p`), write to `.fractary/codex/memory/{type}/{id}.md`.
7. **Confirm**: Print ID, type, title, location, and next steps.

## Frontmatter Format

```yaml
---
id: MEM-{PREFIX}-{SEQ}-{slug}
title: "{title}"
type: {memory_type}
status: draft
created: {ISO 8601 timestamp}
last_audited: null
tags: [{relevant, tags}]
related: []
---
```

## Critical Rules

1. ALWAYS generate a unique memory ID — never overwrite existing files
2. ALWAYS set status to `draft` for new memories
3. NEVER fabricate content — use provided context or ask the user
4. Ask the user for all interactive prompts when context is not provided

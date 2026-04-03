# Interactive Guide

Rich interactive guidance for memory creation when context is limited or absent.

## Type Selection (when no --template or --memory-type)

### Auto-Detection from Context

If `--context` is provided but no type, analyze the text to suggest:
- Error/bug/fix/debug language → suggest `troubleshooting`
- Decision/chose/alternative/trade-off language → suggest `architectural-decision`
- Benchmark/latency/throughput/slow/fast language → suggest `performance`
- Pattern/abstraction/reusable/idiom language → suggest `pattern`
- API/service/library/config/integration language → suggest `integration`
- Convention/standard/naming/rule language → suggest `convention`

Present suggestion for confirmation. Ask the user:
- "Based on your description, this sounds like an architectural decision. Is that correct?"
- Options: "Yes, Architectural Decision" or "No, let me choose a different type"

### Full Type Selection Menu

If no context or user wants to choose, ask the user to select from:
- **Troubleshooting** — Bug fixes, error resolutions, debugging techniques you discovered
- **Architectural Decision** — Design choices you made, with rationale and trade-offs
- **Performance** — Benchmarks, optimizations, performance insights you found
- **Pattern** — Reusable code patterns, idioms, or best practices
- **Integration** — Third-party service integrations, API usage, configuration details
- **Convention** — Team conventions, coding standards, naming rules

## Content Gathering (when --context is NOT provided)

Guide through each section sequentially:

1. **Overview first:** Ask the user: "Tell me about what you discovered or decided. What's the key takeaway?"

2. **Type-specific follow-ups** — ask for each section relevant to the chosen type (see `docs/type-sections.md` for the sections). Ask one section at a time.

3. **Verify project references** — when the user mentions files, packages, or configurations, check they exist:
```bash
ls -la path/to/referenced/file.ts
```
If a reference can't be verified, note this but don't block creation.

## Content Pre-Population (when --context IS provided)

Parse the context to fill sections. Then ask targeted follow-ups only for missing critical sections.

## Title Determination

If `--title` not provided, propose a title based on content and ask the user to confirm or enter a different one.

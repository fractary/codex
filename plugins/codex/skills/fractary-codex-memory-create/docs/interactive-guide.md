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

Present suggestion for confirmation:
```
USE TOOL: AskUserQuestion
Questions: [
  {
    question: "Based on your description, this sounds like an architectural decision. Is that correct?",
    header: "Memory Type",
    options: [
      { label: "Yes, Architectural Decision", description: "Design choices with rationale and trade-offs" },
      { label: "No, let me choose a different type", description: "I'll show you all available types" }
    ]
  }
]
```

### Full Type Selection Menu

If no context or user wants to choose:
```
USE TOOL: AskUserQuestion
Questions: [
  {
    question: "What type of knowledge would you like to capture?",
    header: "Memory Type Selection",
    options: [
      { label: "Troubleshooting", description: "Bug fixes, error resolutions, debugging techniques you discovered" },
      { label: "Architectural Decision", description: "Design choices you made, with rationale and trade-offs" },
      { label: "Performance", description: "Benchmarks, optimizations, performance insights you found" },
      { label: "Pattern", description: "Reusable code patterns, idioms, or best practices" },
      { label: "Integration", description: "Third-party service integrations, API usage, configuration details" },
      { label: "Convention", description: "Team conventions, coding standards, naming rules" }
    ]
  }
]
```

## Content Gathering (when --context is NOT provided)

Guide through each section sequentially:

1. **Overview first:**
```
USE TOOL: AskUserQuestion
Questions: [
  { question: "Tell me about what you discovered or decided. What's the key takeaway?", header: "Overview", allowFreeText: true }
]
```

2. **Type-specific follow-ups** — ask for each section relevant to the chosen type (see `docs/type-sections.md` for the sections). Ask one section at a time.

3. **Verify project references** — when the user mentions files, packages, or configurations, check they exist:
```bash
ls -la path/to/referenced/file.ts
```
If a reference can't be verified, note this but don't block creation.

## Content Pre-Population (when --context IS provided)

Parse the context to fill sections. Then ask targeted follow-ups only for missing critical sections.

## Title Determination

If `--title` not provided, propose based on content:
```
USE TOOL: AskUserQuestion
Questions: [
  {
    question: "I'd suggest the title: \"<proposed title>\". Would you like to use this?",
    header: "Memory Title",
    options: [
      { label: "Use suggested title", description: "<proposed title>" },
      { label: "Enter a different title", description: "I'll type my own title" }
    ]
  }
]
```

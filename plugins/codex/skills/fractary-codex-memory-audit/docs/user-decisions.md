# User Decisions

Handling flows for memories that score below the action threshold.

## Presenting Low-Scoring Memories

For each memory below threshold, use AskUserQuestion:

```
USE TOOL: AskUserQuestion
Questions: [
  {
    question: "Memory <ID> scored <score> validity.\n\nTitle: <title>\nType: <type>\nCreated: <date>\n\nFailed claims:\n- <claim 1>\n- <claim 2>\n\nWhat would you like to do?",
    header: "Low Validity Memory",
    options: [
      { label: "Keep as-is", description: "Still relevant despite failed checks (e.g., file renamed but content accurate)" },
      { label: "Update", description: "I'll update the memory to reflect current state" },
      { label: "Deprecate", description: "Mark as deprecated — preserved for history" },
      { label: "Delete", description: "Remove the memory file entirely" }
    ]
  }
]
```

## Applying Decisions

### Keep as-is
- Update only `last_audited` timestamp in frontmatter

### Update
- Present current memory content for user review
- Ask what should change
- Apply changes and update `last_audited`
- Set `status: draft` if major changes

### Deprecate
- Set `status: deprecated` in frontmatter
- Add `deprecated_date: {ISO 8601 timestamp}`
- Add `deprecated_reason: "{reason from audit}"` 
- If superseded: add `superseded_by: "{newer memory ID}"`
- Update `last_audited`

### Delete
Confirm deletion before proceeding:
```
USE TOOL: AskUserQuestion
Questions: [
  {
    question: "Confirm permanent deletion of <ID>?\n\nFile: .fractary/codex/memory/<type>/<id>.md",
    header: "Confirm Deletion",
    options: [
      { label: "Yes, delete permanently", description: "File will be removed from disk" },
      { label: "No, deprecate instead", description: "Mark as deprecated but keep file" }
    ]
  }
]
```

If confirmed: `rm .fractary/codex/memory/{type}/{id}.md`
If not: apply deprecation instead.

## Stale But Valid Memories

For memories above threshold but not audited recently, batch them:

```
USE TOOL: AskUserQuestion
Questions: [
  {
    question: "The following N memories haven't been audited in over <stale_days> days but appear valid:\n\n- <id1> (score: <s1>)\n- <id2> (score: <s2>)\n\nMark all as audited?",
    header: "Stale but Valid Memories",
    options: [
      { label: "Mark all as audited", description: "Update last_audited for all" },
      { label: "Review individually", description: "Let me check each one" },
      { label: "Skip for now", description: "Leave timestamps unchanged" }
    ]
  }
]
```

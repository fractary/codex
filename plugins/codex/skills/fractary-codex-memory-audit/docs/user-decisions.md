# User Decisions

Handling flows for memories that score below the action threshold.

## Presenting Low-Scoring Memories

For each memory below threshold, present the details and ask the user what to do:

- Memory ID, title, type, creation date
- Failed claims with evidence
- Options: **Keep as-is** (still relevant despite failed checks), **Update** (reflect current state), **Deprecate** (mark deprecated, preserved for history), or **Delete** (remove entirely)

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
Confirm deletion before proceeding — ask the user: "Confirm permanent deletion of `<ID>`?" with options to delete permanently or deprecate instead.

If confirmed: `rm .fractary/codex/memory/{type}/{id}.md`
If not: apply deprecation instead.

## Stale But Valid Memories

For memories above threshold but not audited recently, batch them:

Ask the user whether to mark all stale-but-valid memories as audited, review them individually, or skip for now.

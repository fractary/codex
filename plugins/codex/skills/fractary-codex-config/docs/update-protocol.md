# Update Protocol

Updates specific fields in the codex section of `.fractary/config.yaml`. Only provided fields are changed; all others are preserved.

## Arguments

| Argument | Description |
|----------|-------------|
| `--org <slug>` | Update organization slug |
| `--project <name>` | Update project name |
| `--codex-repo <name>` | Update codex repository name |
| `--sync-preset <name>` | Update sync preset (standard, minimal) |
| `--no-mcp` | Skip MCP server update |
| `--json` | Output as JSON |

At least one update flag must be provided.

## Steps

### 1. Parse User Request

Map natural language to CLI flags:

| User says | CLI flag |
|-----------|----------|
| "change org to X" | `--org X` |
| "update codex repo to X" | `--codex-repo X` |
| "switch to minimal" | `--sync-preset minimal` |
| "change project name to X" | `--project X` |

### 2. Execute CLI Command

```bash
fractary-codex config-update \
  --org <org> \
  --codex-repo <repo> \
  --sync-preset <preset> \
  --json
```

### 3. Report Results

**Success:**
```
Codex configuration updated!

Updated:
  - organization: oldorg -> neworg
  - codex_repo: codex.oldorg.com -> codex.neworg.com
  - remotes (rebuilt)
```

## Error Handling

| Error | Resolution |
|-------|------------|
| "Configuration not found" | Run `fractary config-initialize` then config init |
| "Codex section not found" | Run config init first |
| "Invalid organization name" | Use valid name (alphanumeric, hyphens, underscores) |
| "No fields to update" | Provide at least one update flag |

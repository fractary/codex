# Validate Protocol

Validates the codex section of `.fractary/config.yaml`. This is a **read-only** operation — it never modifies any files.

Checks: config structure, field formats, directory existence, MCP server configuration, and gitignore entries.

## Steps

### 1. Execute CLI Command

```bash
fractary-codex config-validate --json
```

### 2. Parse Results

The CLI returns:

```json
{
  "valid": true,
  "configPath": ".fractary/config.yaml",
  "errors": [{ "field": "...", "message": "...", "severity": "error" }],
  "warnings": [{ "field": "...", "message": "...", "severity": "warning" }]
}
```

### 3. Report Results

**All valid:**
```
Codex configuration is valid!

Config: .fractary/config.yaml
Organization: <org>
Project: <project>
Codex Repository: <codex-repo>

All checks passed:
  - Config structure
  - Field formats
  - Directories exist
  - MCP server configured
  - Gitignore set up
```

**Valid with warnings:**
```
Codex configuration is valid (N warnings)

Warnings:
  - codex.sync: No sync configuration found
  - mcp: .mcp.json not found or invalid

Suggested fixes:
  - Use config update with --sync-preset standard
  - Use config init --force to reinstall MCP server
```

**Invalid:**
```
Codex configuration is invalid (N errors, M warnings)

Errors:
  - codex: Codex section not found in configuration
  - codex.organization: Organization is required

To fix:
  1. Use config init to create the codex section
```

## Error Handling

Do NOT attempt to fix any issues found. Do NOT modify any files. Report issues clearly with suggested fixes and let the user decide.

# Init Protocol

Initializes the codex configuration section in an existing Fractary project.

## Arguments

| Argument | Description |
|----------|-------------|
| `--org <slug>` | Organization slug (auto-detected from git remote if omitted) |
| `--project <name>` | Project name (auto-detected from directory if omitted) |
| `--codex-repo <name>` | Codex repository name (auto-discovered via `gh` if omitted) |
| `--sync-preset <name>` | Sync preset: `standard` (default) or `minimal` |
| `--force` | Overwrite existing codex section |
| `--no-mcp` | Skip MCP server installation |
| `--json` | Output as JSON |

## Steps

### 1. Check Prerequisites

`.fractary/config.yaml` must exist. This file is created by `fractary-core config-initialize`. If it does not exist, stop and tell the user to run that first.

### 2. Check CLI Availability

```bash
if ! command -v fractary-codex &> /dev/null; then
  echo "Using npx for CLI"
fi
```

### 3. Auto-Detect Missing Settings

For any setting NOT explicitly provided as an argument:

```bash
# Detect organization from git remote
git remote get-url origin 2>/dev/null

# Detect project from directory name
basename "$(pwd)"

# Discover codex repo (requires gh CLI)
gh repo list <org> --json name --jq '.[].name | select(startswith("codex."))'
```

### 4. Confirm Settings With User (REQUIRED)

**You MUST use AskUserQuestion to confirm settings before running the CLI.**

If the user provided ALL settings as explicit arguments, skip this step. Otherwise, present auto-detected values:

```
USE TOOL: AskUserQuestion
Questions: [
  {
    question: "I detected the following settings. Please confirm or adjust:",
    header: "Codex Configuration",
    options: [
      {
        label: "Confirm and proceed",
        description: "Organization: <org>\nProject: <project>\nCodex Repo: <repo>\nSync Preset: standard"
      },
      {
        label: "Let me specify different values",
        description: "I'll ask you for the values to use instead"
      }
    ]
  }
]
```

If user chooses different values, ask follow-up questions for each setting.

For sync preset (if not provided):
```
USE TOOL: AskUserQuestion
Questions: [
  {
    question: "Which sync preset would you like to use?",
    header: "Sync Preset",
    options: [
      { label: "Standard (Recommended)", description: "Syncs docs/**, README.md, and CLAUDE.md" },
      { label: "Minimal", description: "Syncs docs/** and README.md only" }
    ]
  }
]
```

### 5. Execute CLI Command

```bash
fractary-codex config-init \
  --org <confirmed-org> \
  --project <confirmed-project> \
  --codex-repo <confirmed-codex-repo> \
  --sync-preset <confirmed-preset> \
  --json
```

### 6. Report Results

**Success:**
```
Codex configuration initialized!

Created:
  - Codex section added to .fractary/config.yaml
  - Cache: .fractary/codex/cache/
  - MCP Server: .mcp.json (fractary-codex)

Configuration:
  Organization: <org>
  Project: <project>
  Codex Repository: <codex-repo>

Next Steps:
  1. Restart Claude Code (for MCP server)
  2. Verify codex repository access: gh repo view <org>/<codex-repo>
  3. Test: codex://org/proj/file.md
  4. Run first sync: use the fractary-codex-sync skill with --from-codex --dry-run
```

## Error Handling

Pass through CLI errors verbatim. Do not attempt workarounds or manual file operations.

| Error | Resolution |
|-------|------------|
| "Base configuration not found" | Run `fractary config-initialize` first |
| "Codex section already exists" | Use --force to overwrite, or use config update operation |
| "Invalid organization name" | Use --org with valid name |
| "Could not discover codex repository" | Use --codex-repo to specify explicitly |

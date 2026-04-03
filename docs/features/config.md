# Configuration Operations

Initialize, update, and validate your Codex configuration.

Codex configuration lives in the `codex:` section of `.fractary/config.yaml`. This file is created by `@fractary/core` — you must initialize `@fractary/core` first. See the [Getting Started Guide](../getting-started.md) for the full setup walkthrough.

## Quick Reference

| Operation | CLI | Plugin |
|-----------|-----|--------|
| [Initialize](#initialize-config) | `fractary-codex config-init` | `/fractary-codex-config init` |
| [Update](#update-config) | `fractary-codex config-update` | `/fractary-codex-config update` |
| [Validate](#validate-config) | `fractary-codex config-validate` | `/fractary-codex-config validate` |

> Config operations are not available via SDK or MCP — use the CLI or Claude Code plugin.

---

## Initialize Config

Adds the `codex:` section to `.fractary/config.yaml`. Also creates the cache directory, installs the MCP server entry in `.mcp.json`, and updates `.fractary/.gitignore`.

### Initialize Config: Plugin

```
/fractary-codex-config init
```

The skill auto-detects your organization from git remotes, derives the project name from the directory, and discovers the codex repository. It presents a summary for confirmation before writing anything.

**Options:**
- `--org <slug>` — Override organization slug
- `--codex-repo <name>` — Override codex repository name
- `--sync-preset minimal` — Use minimal sync config (default: `standard`)
- `--force` — Overwrite existing `codex:` section

> Recommended over the CLI for first-time setup — the skill has more context and produces a more accurate initial config.

### Initialize Config: CLI

```bash
fractary-codex config-init [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--org <slug>` | auto-detected from git remote | Organization slug |
| `--project <name>` | derived from directory name | Project name |
| `--codex-repo <name>` | auto-discovered or `codex.{org}.com` | Codex repository name |
| `--sync-preset <name>` | `standard` | Sync preset: `standard` or `minimal` |
| `--force` | `false` | Overwrite existing `codex:` section |
| `--no-mcp` | `false` | Skip MCP server installation |
| `--json` | `false` | Output as JSON |

**Examples:**

```bash
# Auto-detect all values
fractary-codex config-init

# Specify explicitly
fractary-codex config-init --org myorg --codex-repo codex.myorg.com

# Minimal preset, no MCP
fractary-codex config-init --sync-preset minimal --no-mcp

# Re-initialize (overwrite existing)
fractary-codex config-init --force
```

---

## Update Config

Updates specific fields in the existing `codex:` section. At least one field must be specified.

### Update Config: Plugin

```
/fractary-codex-config update
```

Describe the change in natural language and the skill applies the appropriate field update.

**Options:**
- `--org <slug>` — Update organization slug
- `--codex-repo <name>` — Update codex repository name
- `--sync-preset <name>` — Update sync preset

### Update Config: CLI

```bash
fractary-codex config-update [options]
```

| Option | Description |
|--------|-------------|
| `--org <slug>` | Update organization slug |
| `--project <name>` | Update project name |
| `--codex-repo <name>` | Update codex repository name |
| `--sync-preset <name>` | Update sync preset (`standard` or `minimal`) |
| `--no-mcp` | `false` | Remove MCP server entry |
| `--json` | `false` | Output as JSON |

**Examples:**

```bash
# Change codex repo
fractary-codex config-update --codex-repo codex.neworg.com

# Change org and project
fractary-codex config-update --org neworg --project new-project
```

---

## Validate Config

Read-only validation of the codex configuration. Does not modify any files.

**Checks:**
- Config structure and schema
- Field formats (org slug, project name, codex repo)
- Cache directory existence
- MCP server config in `.mcp.json`
- Gitignore entries

### Validate Config: Plugin

```
/fractary-codex-config validate
```

### Validate Config: CLI

```bash
fractary-codex config-validate [--json]
```

---

## See Also

- [Getting Started Guide](../getting-started.md) — Full setup walkthrough including GitHub token and codex repo creation
- [Configuration Reference](../configuration.md) — Complete config schema reference

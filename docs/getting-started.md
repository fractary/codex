# Getting Started with Fractary Codex

This guide walks through the full first-time setup: creating a codex repository, configuring GitHub authentication, installing packages, and running your first sync.

## Prerequisites

- **Node.js ≥ 18**
- **`@fractary/core` initialized** — Codex configuration lives inside `.fractary/config.yaml`, which is created and managed by `@fractary/core`. Run `fractary-core config-init` (or use the `@fractary/core` Claude Code plugin) before setting up Codex.
- **A GitHub account** with permissions to create repositories in your organization

---

## Step 1: Create a Codex Repository

A codex repository is a standard GitHub repository that acts as the central knowledge store for your organization. All projects sync their docs, specs, and memory files into it (and pull shared content from it).

**Create the repository:**

1. Go to GitHub and create a new repository in your organization
2. Name it something like `codex.myorg.com` (convention: `codex.{org}.com`)
3. Set visibility to **private** (recommended for organizational knowledge) or public
4. Initialize with a README so the repository is non-empty
5. Note your org name and repository name — you'll need them during config initialization

**Recommended initial structure** (you can let sync populate this over time):
```
codex.myorg.com/
└── README.md
```

---

## Step 2: GitHub Token Setup

Codex uses a GitHub personal access token to read from and write to your codex repository.

**Create a token:**

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. Click **Generate new token**
3. Set **Repository access** to your codex repository (or all repositories in your org)
4. Grant these permissions:
   - **Contents**: Read and write (required for sync)
   - **Metadata**: Read-only (required)
5. Copy the generated token

**Set the environment variable:**

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

Add this to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) to persist it across sessions.

**For CI/CD pipelines:** Add `GITHUB_TOKEN` as a repository or organization secret in your GitHub Actions settings.

> **Security:** Never hardcode the token in `.fractary/config.yaml`. The config uses `${GITHUB_TOKEN}` which expands from the environment at runtime.

---

## Step 3: Install Packages

```bash
# SDK — required by the CLI and MCP server
npm install @fractary/codex

# CLI — for running commands directly
npm install -g @fractary/codex-cli
```

Verify the CLI is available:

```bash
fractary-codex --version
```

---

## Step 4: Initialize Configuration

Codex adds a `codex:` section to your existing `.fractary/config.yaml`. There are two ways to initialize it:

### Option A: Claude Code Plugin (recommended)

Run the slash command in a Claude Code session:

```
/fractary-codex-config init
```

The skill auto-detects your organization (from git remotes), project name, and codex repository. It presents its findings for confirmation before writing anything. This is the recommended path because it inspects your actual git setup and existing config to construct a more accurate initial configuration.

After initialization, **restart Claude Code** to activate the MCP server tools.

### Option B: CLI

```bash
fractary-codex config-init --org myorg --codex-repo codex.myorg.com
```

Options:
- `--org <slug>` — organization name (auto-detected from git remote if omitted)
- `--codex-repo <name>` — codex repository name
- `--sync-preset minimal` — minimal sync config (default: `standard`)
- `--no-mcp` — skip MCP server installation

**What initialization does:**
- Adds the `codex:` section to `.fractary/config.yaml`
- Creates the cache directory at `.fractary/codex/cache/`
- Adds the MCP server entry to `.mcp.json` (unless `--no-mcp`)
- Updates `.fractary/.gitignore` to exclude the cache

**Resulting config (example):**

```yaml
# .fractary/config.yaml
codex:
  schema_version: "2.0"
  organization: myorg
  project: my-project
  codex_repo: codex.myorg.com
  remotes:
    myorg/codex.myorg.com:
      token: ${GITHUB_TOKEN}
  sync:
    to_codex:
      include:
        - docs/**
        - README.md
        - CLAUDE.md
    from_codex:
      include:
        - codex://myorg/codex.myorg.com/docs/**
```

---

## Step 5: Verify Setup

```bash
fractary-codex cache-health
```

This runs diagnostics against your configuration, storage providers, SDK client, and cache. All checks should show `pass` or `warn` (empty cache is a warning, not a failure).

---

## Step 6: First Sync

Preview what would be synced:

```bash
fractary-codex sync --dry-run
```

If the output looks correct, run the sync:

```bash
fractary-codex sync
```

After the first sync, your codex repository will contain files from your project and your project will have pulled any shared content from the codex repository.

---

## Next Steps

- [Configuration Guide](./configuration.md) — Full reference for all config options
- [Fetch Documents](./features/fetch-documents.md) — Fetch docs via URI using SDK, CLI, or MCP
- [Sync](./features/sync.md) — Sync with the codex repository
- [Cache Management](./features/cache.md) — Manage the local document cache
- [Configuration Operations](./features/config.md) — Update and validate your config

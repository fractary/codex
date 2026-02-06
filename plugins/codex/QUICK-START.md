# Codex Plugin - Quick Start Guide

**Get up and running with codex sync in 5 minutes**

---

## Prerequisites

1. **Git Authentication** configured for your organization's repositories
   ```bash
   # Check GitHub CLI authentication status
   gh auth status

   # Or verify git credentials work
   git ls-remote git@github.com:your-org/codex.your-org.com.git
   ```

2. **Git Repository** with a remote (GitHub, GitLab, or Bitbucket)
   ```bash
   git remote -v
   # Should show your organization's remote
   ```

3. **Codex Repository** exists in your organization
   - Naming convention: `codex.{organization}.{tld}`
   - Examples: `codex.fractary.com`, `codex.myorg.io`

---

## Step 1: Configure Plugin (2 minutes)

### Run the Configuration Command

```bash
/fractary-codex:configure
```

### What Happens

The command will guide you through an interactive setup:

1. **Auto-Detection**: Extracts organization from your git remote
   - Shows detected organization and asks for confirmation

2. **Codex Discovery**: Searches for `codex.*` repositories
   - Shows found repositories and asks you to select or confirm

3. **Sync Patterns**: Asks which files you want to sync
   - Standard (docs, README, CLAUDE.md, standards, guides) - Recommended
   - Minimal (docs and README only)
   - Custom (specify your own patterns)

4. **Auto-sync**: Asks if files should sync automatically on commit
   - Manual sync (recommended) or automatic sync

5. **Confirmation**: Shows proposed configuration and asks for approval

6. **Configuration Creation**: Creates config file after confirmation
   ```
   ✅ Codex plugin configured successfully!

   Created:
     - Config: .fractary/config.yaml (YAML, v4.0)
     - Cache: .fractary/codex/cache/
     - MCP Server: .mcp.json

   Configuration:
     Organization: fractary
     Codex Repository: codex.fractary.com
     Auto-sync: disabled
     Sync Patterns: 5 patterns configured
   ```

### Non-Interactive Configuration (Optional)

Specify everything explicitly to skip interactive questions:
```bash
/fractary-codex:configure --org fractary --codex codex.fractary.com
```

### Update Existing Configuration

Use the `--context` parameter to describe what you want to change:
```bash
/fractary-codex:configure --context "enable auto-sync and add specs folder to sync patterns"
```

---

## Step 2: Preview Your First Sync (1 minute)

### Run a Dry-Run

```bash
/fractary-codex:sync-project --dry-run
```

### What You'll See

```
🔍 DRY-RUN MODE: No changes will be applied

Detected project: my-project
Would sync: my-project ↔ codex.fractary.com

To Codex (Project → Codex):
  Would add: 12 files
  Would modify: 5 files
  Would delete: 0 files
  Deletion threshold: ✓ PASS (0 < 50)

From Codex (Codex → Project):
  Would add: 8 files
  Would modify: 2 files
  Would delete: 0 files
  Deletion threshold: ✓ PASS (0 < 50)

Recommendation: Safe to proceed

Run without --dry-run to apply changes:
/fractary-codex:sync-project
```

### Review the Changes

The dry-run shows:
- ✅ What files will be added
- ✅ What files will be modified
- ✅ What files will be deleted
- ✅ Whether deletion thresholds are exceeded

---

## Step 3: Perform Your First Sync (2 minutes)

### Run the Real Sync

```bash
/fractary-codex:sync-project
```

### What Happens

1. **Discovery**: Detects current project from git remote
2. **Phase 1 (To Codex)**: Copies docs from project → codex
3. **Phase 2 (From Codex)**: Copies docs from codex → project
4. **Commits**: Creates commits in both repositories
5. **Results**: Shows summary with commit URLs

### Expected Output

```
✅ Project Sync Complete: my-project

Direction: Bidirectional

To Codex:
  Files synced: 17 (12 added, 5 modified)
  Files deleted: 0
  Commit: abc123...
  URL: https://github.com/fractary/codex.fractary.com/commit/abc123

From Codex:
  Files synced: 10 (8 added, 2 modified)
  Files deleted: 0
  Commit: def456...
  URL: https://github.com/fractary/my-project/commit/def456

Next: Review commits and verify changes
```

### Verify the Results

1. **Check Codex Repository**: Visit the commit URL
2. **Check Project Repository**: Visit the commit URL
3. **Review Changes**: Ensure files synced correctly

---

## Common Use Cases

### Sync Specific Direction Only

```bash
# Only pull project docs to codex
/fractary-codex:sync-project --to-codex

# Only push codex docs to project
/fractary-codex:sync-project --from-codex
```

### Sync a Different Project

```bash
/fractary-codex:sync-project other-project
```

### Sync Entire Organization

```bash
# Preview first (recommended)
/fractary-codex:sync-org --dry-run

# Sync all projects
/fractary-codex:sync-org

# Exclude certain repos
/fractary-codex:sync-org --exclude "archive-*" --exclude "test-*"
```

### Override Sync Patterns

```bash
/fractary-codex:sync-project --patterns "docs/**,standards/**"
```

---

## Customization

### Project Configuration

Edit `.fractary/config.yaml`:

```yaml
codex:
  schema_version: "2.0"
  organization: fractary
  project: my-project
  codex_repo: codex.fractary.com
  remotes:
    fractary/codex.fractary.com:
      token: ${GITHUB_TOKEN}

sync:
  to_codex:
    - "docs/**/*.md"
    - "CLAUDE.md"
    - "README.md"
    - "standards/**"      # Add custom patterns
    - "guides/**"
  from_codex:
    - "codex://{org}/{codex_repo}/docs/**"
    - "codex://{org}/{project}/**"
```

### Frontmatter-Based Routing

Add sync rules to markdown files:

```markdown
---
codex_sync_include: ["docs/api/**", "docs/guides/**"]
codex_sync_exclude: ["docs/internal/**"]
---

# Your Document Content
```

---

## Troubleshooting

### Configuration Not Found

**Problem**:
```
⚠️ Configuration required
Run: /fractary-codex:configure
```

**Solution**: Run the init command to create configuration

### Authentication Failed

**Problem**:
```
❌ Failed to clone repository: authentication required
```

**Solution**: Verify your git authentication is configured correctly
```bash
# Check GitHub CLI auth status
gh auth status

# Or test repository access directly
gh repo view your-org/codex.your-org.com

# For CI/automation, set GITHUB_TOKEN
export GITHUB_TOKEN=<your-token>
```

### Deletion Threshold Exceeded

**Problem**:
```
⚠️ Deletion threshold exceeded
Would delete: 75 files (threshold: 50)
```

**Solutions**:
1. Review deletion list carefully (might be legitimate refactor)
2. Adjust threshold in config if intentional
3. Fix sync patterns if unintentional

### Project Not Detected

**Problem**:
```
❌ Cannot detect project from git remote
```

**Solution**: Specify project name explicitly
```bash
/fractary-codex:sync-project my-project
```

---

## Best Practices

### 1. Always Dry-Run First

```bash
/fractary-codex:sync-project --dry-run
```

Review what will change before applying.

### 2. Start Small

Test with one project before syncing entire organization.

### 3. Review Commits

After sync, review the commits in both repositories to ensure correctness.

### 4. Use Exclude Patterns

Don't sync:
- Private documentation
- Generated files
- Temporary files
- Environment files

### 5. Monitor Deletion Counts

If you see high deletions, investigate before proceeding.

### 6. Document Your Patterns

Keep a record of why certain patterns are included/excluded.

### 7. Automate in CI/CD

Set up automatic syncs on documentation changes:
```yaml
# .github/workflows/sync-docs.yml
on:
  push:
    paths:
      - 'docs/**'
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install CLI
        run: npm install -g @fractary/codex-cli
      - name: Sync to codex
        env:
          GITHUB_TOKEN: ${{ secrets.CODEX_GITHUB_TOKEN }}
        run: fractary-codex sync --to-codex
```

---

## Next Steps

### Explore Advanced Features

1. **Organization Sync**: Sync all projects at once
2. **Pattern Customization**: Fine-tune what syncs
3. **Frontmatter Routing**: Per-file sync rules
4. **Automation**: Set up CI/CD sync

### Learn More

- **Full Documentation**: See [README.md](README.md)
- **Architecture**: Understand the 3-layer design
- **Configuration**: All available options
- **Troubleshooting**: Common issues and solutions

### Contribute

- **Report Issues**: Found a bug? Report it!
- **Suggest Features**: Ideas for improvements?
- **Share Patterns**: Useful sync pattern combinations?

---

## Quick Reference

### Commands

```bash
# Initialize
/fractary-codex:configure

# Sync project (preview)
/fractary-codex:sync --dry-run

# Sync project (real)
/fractary-codex:sync

# Sync specific direction
/fractary-codex:sync --to-codex
/fractary-codex:sync --from-codex
```

### Configuration Location

```
Project: .fractary/config.yaml
```

### Common Patterns

```yaml
sync:
  to_codex:
    - "docs/**/*.md"         # All docs recursively
    - "CLAUDE.md"            # Specific file
    - "README.md"            # Specific file
    - "standards/**/*.md"    # Standards docs
    - "guides/**/*.md"       # Guide docs
  from_codex:
    - "codex://{org}/{codex_repo}/docs/**"
    - "codex://{org}/{project}/**"
```
```

---

**Ready to sync!** If you encounter issues, see the [README.md](README.md) for comprehensive documentation.

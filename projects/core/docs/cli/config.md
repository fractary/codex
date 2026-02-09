# Config Module - CLI Reference

Command-line reference for the Config module. Manage Fractary Core configuration, validation, and environment switching.

## Command Structure

```bash
fractary-core config <command> [arguments] [options]
```

All commands use dash-separated names (e.g., `env-switch`, `env-list`).

## Configuration Commands

### config configure

Initialize or update `.fractary/config.yaml` with defaults.

```bash
fractary-core config configure [options]
```

**Options:**
- `--work-platform <platform>` - Work tracking platform: `github`, `jira`, `linear` (default: `github`)
- `--file-handler <handler>` - File storage handler: `local`, `s3` (default: `local`)
- `--owner <owner>` - GitHub/GitLab owner/organization
- `--repo <repo>` - Repository name
- `--s3-bucket <bucket>` - S3 bucket name (if using S3)
- `--aws-region <region>` - AWS region (if using S3) (default: `us-east-1`)
- `--minimal` - Create minimal config (work + repo only)
- `--force` - Overwrite existing configuration

**Examples:**
```bash
# Initialize with defaults (GitHub + local storage)
fractary-core config configure

# Configure for Jira with S3 storage
fractary-core config configure \
  --work-platform jira \
  --file-handler s3 \
  --s3-bucket my-specs-bucket \
  --aws-region us-west-2

# Set owner and repo explicitly
fractary-core config configure --owner my-org --repo my-project

# Create a minimal configuration
fractary-core config configure --minimal

# Overwrite an existing configuration
fractary-core config configure --force
```

### config validate

Validate `.fractary/config.yaml` for correctness.

```bash
fractary-core config validate [options]
```

**Options:**
- `-v, --verbose` - Show detailed output including the full redacted configuration

**Examples:**
```bash
# Validate configuration
fractary-core config validate

# Validate with detailed output
fractary-core config validate --verbose
```

**Output:**
```
Validation Results:

  Configuration is valid

Configuration Summary:

  Version: 2.0
  Plugins configured: work, repo, file
  Work platform: github
  Repo platform: github
  File storage: local
```

### config show

Display the current configuration with sensitive values redacted.

```bash
fractary-core config show
```

**Examples:**
```bash
# Display redacted configuration
fractary-core config show
```

**Output:**
```
Fractary Core Configuration

Config file: /path/to/project/.fractary/config.yaml

{
  "version": "2.0",
  "work": {
    "active_handler": "github",
    "handlers": {
      "github": {
        "token": "****"
      }
    }
  }
}
```

## Environment Commands

### config env-switch

Switch to a different environment. Loads credentials from the corresponding `.env.<name>` file.

```bash
fractary-core config env-switch <name> [options]
```

**Arguments:**
- `name` - Environment name (e.g., `test`, `staging`, `prod`). Must contain only letters, numbers, dashes, and underscores.

**Options:**
- `--clear` - Clear existing credentials before switching

**Examples:**
```bash
# Switch to staging environment
fractary-core config env-switch staging

# Switch to production, clearing previous credentials first
fractary-core config env-switch prod --clear
```

### config env-list

List all available environments detected in the project root.

```bash
fractary-core config env-list
```

**Examples:**
```bash
# List available environments
fractary-core config env-list
```

**Output:**
```
Available environments:

  Name            File                Status
  ──────────────────────────────────────────────
 *(default)        .env                exists
  staging          .env.staging        exists
  prod             .env.prod           exists

Current environment: (default)

Switch with: fractary-core config env-switch <name>
```

### config env-show

Show the current environment status including which credential variables are set.

```bash
fractary-core config env-show
```

**Examples:**
```bash
# Show current environment status
fractary-core config env-show
```

**Output:**
```
Current environment status:

  FRACTARY_ENV: staging

  Credential status:
    GITHUB_TOKEN                set
    AWS_ACCESS_KEY_ID           not set
    AWS_SECRET_ACCESS_KEY       not set
    AWS_DEFAULT_REGION          not set
    JIRA_URL                    not set
    JIRA_EMAIL                  not set
    JIRA_TOKEN                  not set
    LINEAR_API_KEY              not set
```

### config env-clear

Clear environment credentials. Resets the current environment to the default.

```bash
fractary-core config env-clear [options]
```

**Options:**
- `--vars <vars>` - Comma-separated list of specific variables to clear (omit to clear all)

**Examples:**
```bash
# Clear all Fractary environment credentials
fractary-core config env-clear

# Clear specific variables only
fractary-core config env-clear --vars "AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY"
```

## Environment Variables

Environment files are loaded from the project root based on the active environment name:

```
.env            # Base defaults (always loaded)
.env.local      # Local overrides (always loaded if present)
.env.<name>     # Environment-specific variables (loaded on env-switch)
```

Recognized credential variables:

```bash
# GitHub credentials
export GITHUB_TOKEN=ghp_your_token

# AWS credentials (for S3 file handler)
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_DEFAULT_REGION=us-east-1

# Jira credentials
export JIRA_URL=https://your-org.atlassian.net
export JIRA_EMAIL=you@example.com
export JIRA_TOKEN=your_jira_token

# Linear credentials
export LINEAR_API_KEY=lin_api_your_key
```

## Other Interfaces

- **SDK:** [Config API](/docs/sdk/js/config.md)
- **Configuration:** [Configuration Guide](/docs/guides/configuration.md)

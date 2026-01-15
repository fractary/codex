# Authentication Guide

Comprehensive guide to authentication in Fractary Codex SDK.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Authentication Architecture](#authentication-architecture)
- [Multiple Organizations](#multiple-organizations)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)
- [Advanced Configuration](#advanced-configuration)

## Overview

Fractary Codex uses **token-based authentication** with GitHub Personal Access Tokens (PAT). This approach provides:

- **Simple setup**: Just set environment variables
- **Per-dependency configuration**: Different tokens for different organizations
- **Secure by default**: Tokens stay in environment variables, never in committed config files
- **Flexible**: Supports both default and custom authentication per dependency

## Quick Start

### Single Token Setup (2 minutes)

For simple use cases with a single GitHub organization:

**1. Generate a GitHub Personal Access Token**

```bash
# Using GitHub CLI (recommended)
gh auth login
# Follow the prompts to authenticate

# OR manually at: https://github.com/settings/tokens
# Required scopes:
# - repo (for private repositories)
# - read:org (for organization repositories)
```

**2. Set environment variable**

```bash
# Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# OR create .env file (recommended for local development)
echo 'GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx' > .env

# Ensure .env is gitignored
echo '.env' >> .gitignore
```

**3. Verify authentication**

```bash
# Test with CLI
fractary-codex fetch codex://fractary/codex/README.md

# The fetch will use GITHUB_TOKEN automatically
```

**Done!** Your configuration automatically uses the `GITHUB_TOKEN` environment variable.

## Authentication Architecture

### How Tokens Are Stored

**Tokens are stored in environment variables, NOT in configuration files.**

```yaml
# .fractary/config.yaml (SAFE TO COMMIT)
codex:
  auth:
    github:
      default_token_env: GITHUB_TOKEN  # <- Environment variable NAME only

  dependencies:
    partner-org/shared-specs:
      sources:
        specs:
          type: github
          token_env: PARTNER_GITHUB_TOKEN  # <- Environment variable NAME only
```

**Actual token values live in:**

1. **Environment variables** (production/CI/CD):
   ```bash
   export GITHUB_TOKEN="ghp_xxxxx"
   export PARTNER_GITHUB_TOKEN="ghp_yyyyy"
   ```

2. **`.env` file** (local development, gitignored):
   ```bash
   # .env (NEVER COMMITTED)
   GITHUB_TOKEN=ghp_xxxxx
   PARTNER_GITHUB_TOKEN=ghp_yyyyy
   ```

### Token Resolution Flow

When fetching a document, Codex resolves authentication in this order:

1. **Explicit option** - Token passed directly in fetch options
2. **Dependency-specific token** - From dependency's `token_env` configuration
3. **Default token** - From `auth.github.default_token_env` (defaults to `GITHUB_TOKEN`)
4. **Fallback to public** - If `fallback_to_public: true` is set

```typescript
// Example: fetching with explicit token (overrides all other sources)
const result = await fetch('codex://partner-org/specs/API.md', {
  token: 'ghp_custom_token'
})
```

### Security Guarantees

**Files safe to commit:**
- ✅ `.fractary/config.yaml` - Contains only environment variable names
- ✅ `.gitignore` - Contains `.env` entry

**Files NEVER committed:**
- ❌ `.env` - Contains actual token values
- ❌ Any file with actual credentials

## Multiple Organizations

### Configuration Pattern

When working with multiple GitHub organizations, configure per-dependency authentication:

```yaml
# .fractary/config.yaml (SAFE TO COMMIT)
codex:
  organization: myorg
  project: myproject

  # Default authentication for most dependencies
  auth:
    github:
      default_token_env: GITHUB_TOKEN
      fallback_to_public: true  # Try public access if auth fails

  # Dependencies with specific authentication
  dependencies:
    # Partner org with separate token
    partner-org/shared-specs:
      sources:
        specs:
          type: github
          token_env: PARTNER_GITHUB_TOKEN
          branch: main

    # Customer org with different token
    customer-org/api-docs:
      sources:
        docs:
          type: github
          token_env: CUSTOMER_GITHUB_TOKEN
          branch: production

    # Internal org using default GITHUB_TOKEN
    internal-org/templates:
      sources:
        templates:
          type: github
          # No token_env specified - uses default GITHUB_TOKEN
          branch: main

    # Public org, no authentication needed
    opensource-org/examples:
      sources:
        examples:
          type: github
          # Uses fallback_to_public: true from auth config
          branch: main
```

### Environment Variables Setup

Create a `.env` file for all tokens:

```bash
# .env (NEVER COMMITTED)

# Default token for most repositories
GITHUB_TOKEN=ghp_your_default_token_here

# Partner organization token
PARTNER_GITHUB_TOKEN=ghp_partner_specific_token

# Customer organization token
CUSTOMER_GITHUB_TOKEN=ghp_customer_specific_token

# AWS credentials for S3 storage (if using S3)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

**Ensure `.env` is gitignored:**

```bash
# Add to .gitignore
echo '.env' >> .gitignore
```

### Token Scopes by Use Case

Different use cases require different GitHub token scopes:

| Use Case | Required Scopes | Notes |
|----------|----------------|-------|
| **Public repos only** | None | No token needed with `fallback_to_public: true` |
| **Private repos (read)** | `repo` | Full repository access for private repos |
| **Organization repos** | `repo`, `read:org` | Access org-level repositories |
| **Fine-grained tokens** | Repository-specific | More secure, but requires careful configuration |

**Recommendation:** Use separate tokens per organization with minimum required scopes.

## Security Best Practices

### 1. Use Environment Variables for Secrets

**DON'T:**
```yaml
# ❌ NEVER hardcode tokens
codex:
  dependencies:
    partner-org/specs:
      sources:
        specs:
          token: ghp_hardcoded_token  # ❌ Will be committed!
```

**DO:**
```yaml
# ✅ Use environment variable names
codex:
  dependencies:
    partner-org/specs:
      sources:
        specs:
          token_env: PARTNER_TOKEN  # ✅ Safe to commit
```

### 2. Use `.env` Files for Local Development

Create a `.env` file in your project root:

```bash
# .env
GITHUB_TOKEN=ghp_xxxxx
PARTNER_TOKEN=ghp_yyyyy
```

**Ensure it's gitignored:**

```bash
# .gitignore
.env
.env.local
.env.*.local
```

### 3. Rotate Tokens Regularly

**Recommended rotation schedule:**
- Development tokens: Every 90 days
- Production tokens: Every 60 days
- Compromised tokens: Immediately

**Rotation process:**
1. Generate new token at https://github.com/settings/tokens
2. Update environment variables or CI/CD secrets
3. Test with `fractary-codex auth test` (coming soon)
4. Revoke old token

### 4. Use Minimum Required Scopes

**Principle of least privilege:**

```bash
# For read-only access to public repos
# No token needed with fallback_to_public: true

# For read-only access to private repos
# Scope: repo (required), read:org (if needed)

# For writing (rare in Codex)
# Scope: repo, workflow (if modifying workflows)
```

### 5. Separate Tokens by Environment

```bash
# .env.development
GITHUB_TOKEN=ghp_dev_token

# .env.staging
GITHUB_TOKEN=ghp_staging_token

# .env.production (in CI/CD secrets, not committed)
GITHUB_TOKEN=ghp_prod_token
```

Load appropriate env file based on environment:

```bash
# Development
export $(cat .env.development | xargs)

# Production (in CI/CD)
# Set as secrets in GitHub Actions, GitLab CI, etc.
```

### 6. Monitor Token Usage

GitHub provides token usage metrics:

```bash
# Check token scopes and expiration
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user

# Check rate limit
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/rate_limit
```

**Rate limits:**
- Unauthenticated: 60 requests/hour
- Authenticated: 5,000 requests/hour
- **Tip:** Always authenticate to avoid rate limiting

## Troubleshooting

### Token Validation Failures

**Problem:** "Bad credentials" or 401 errors

**Solutions:**

1. **Verify token is set:**
   ```bash
   echo $GITHUB_TOKEN
   # Should output: ghp_xxxxx (not empty)
   ```

2. **Check token validity:**
   ```bash
   curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
   # Should return your user info
   ```

3. **Verify token scopes:**
   ```bash
   curl -I -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | grep x-oauth-scopes
   # Should include 'repo' for private repos
   ```

4. **Check token expiration:**
   - Go to https://github.com/settings/tokens
   - Check expiration date of your token
   - Regenerate if expired

### Private Repository Access Issues

**Problem:** "Repository not found" for private repos

**Solutions:**

1. **Verify repository access:**
   ```bash
   # Test if token can access the repo
   curl -H "Authorization: token $GITHUB_TOKEN" \
     https://api.github.com/repos/org/private-repo
   ```

2. **Check organization access:**
   - For organization repos, token needs `read:org` scope
   - Organization owner may need to approve token access

3. **Verify token_env is correct:**
   ```yaml
   # Check config has correct env var name
   codex:
     dependencies:
       org/repo:
         sources:
           docs:
             token_env: GITHUB_TOKEN  # Must match env var name
   ```

### Rate Limiting Issues

**Problem:** "API rate limit exceeded"

**Solutions:**

1. **Authenticate your requests:**
   ```bash
   # Verify token is being used
   # Authenticated requests have 5,000/hour limit
   ```

2. **Check remaining rate limit:**
   ```bash
   curl -H "Authorization: token $GITHUB_TOKEN" \
     https://api.github.com/rate_limit
   ```

3. **Wait for reset:**
   - Rate limits reset every hour
   - Check `x-ratelimit-reset` header for exact time

4. **Use caching:**
   - Codex caches responses by default
   - Reduces API calls for frequently accessed files

### Environment Variable Not Found

**Problem:** Token environment variable is not set

**Solutions:**

1. **Check environment variable:**
   ```bash
   env | grep GITHUB_TOKEN
   ```

2. **Source `.env` file:**
   ```bash
   # If using .env file
   export $(cat .env | xargs)
   ```

3. **Verify config references correct variable:**
   ```yaml
   codex:
     auth:
       github:
         default_token_env: GITHUB_TOKEN  # Must match actual env var
   ```

4. **Check shell profile:**
   ```bash
   # Ensure .bashrc or .zshrc exports the token
   echo 'export GITHUB_TOKEN="ghp_xxx"' >> ~/.bashrc
   source ~/.bashrc
   ```

## Advanced Configuration

### Fallback to Public Access

For dependencies that mix public and private repositories:

```yaml
codex:
  auth:
    github:
      default_token_env: GITHUB_TOKEN
      fallback_to_public: true  # Try unauthenticated if token fails
```

**Use cases:**
- Public forks of private repositories
- Mixed public/private dependency graphs
- Graceful degradation in development

**Security consideration:** Only enable if you're certain private data won't be exposed through public repos.

### Direct Token Configuration (Not Recommended)

While supported, avoid hardcoding tokens:

```yaml
# ⚠️ NOT RECOMMENDED - token will be in git history
codex:
  dependencies:
    partner-org/specs:
      sources:
        specs:
          type: github
          token: ghp_hardcoded  # ⚠️ Security risk!
```

**Only use direct tokens for:**
- Temporary debugging
- Throw-away test environments
- Never commit files with direct tokens

### Custom Token Environment Variable Names

Use descriptive names for clarity:

```yaml
codex:
  auth:
    github:
      default_token_env: CODEX_DEFAULT_GITHUB_TOKEN

  dependencies:
    acme-corp/api:
      sources:
        api:
          token_env: ACME_CORP_GITHUB_TOKEN

    partner-co/specs:
      sources:
        specs:
          token_env: PARTNER_CO_GITHUB_TOKEN
```

```bash
# .env
CODEX_DEFAULT_GITHUB_TOKEN=ghp_xxx
ACME_CORP_GITHUB_TOKEN=ghp_yyy
PARTNER_CO_GITHUB_TOKEN=ghp_zzz
```

**Benefits:**
- Clear ownership of tokens
- Easier to audit
- Reduces confusion in multi-org setups

### CI/CD Integration

**GitHub Actions:**

```yaml
# .github/workflows/codex.yml
name: Codex Fetch

on: [push]

jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Fetch from Codex
        env:
          GITHUB_TOKEN: ${{ secrets.CODEX_GITHUB_TOKEN }}
          PARTNER_TOKEN: ${{ secrets.PARTNER_GITHUB_TOKEN }}
        run: |
          npm install -g @fractary/codex-cli
          fractary-codex fetch codex://org/project/file.md
```

**GitLab CI:**

```yaml
# .gitlab-ci.yml
fetch:
  script:
    - npm install -g @fractary/codex-cli
    - fractary-codex fetch codex://org/project/file.md
  variables:
    GITHUB_TOKEN: $CODEX_GITHUB_TOKEN
    PARTNER_TOKEN: $PARTNER_GITHUB_TOKEN
```

**Best practices for CI/CD:**
1. Use environment secrets, not hardcoded tokens
2. Rotate CI/CD tokens regularly
3. Use separate tokens for CI/CD vs. development
4. Audit token usage in CI/CD logs

## See Also

- [Configuration Guide](./configuration.md) - Full configuration reference
- [Multi-Org Setup Guide](./multi-org-setup.md) - Patterns for multiple organizations
- [CLI Reference](../../cli/README.md) - CLI commands and options
- [MCP Server Setup](../../mcp/server/README.md) - MCP server configuration
- [Security Best Practices](./security.md) - Comprehensive security guide

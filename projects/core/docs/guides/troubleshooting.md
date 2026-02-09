# Troubleshooting Guide

Common issues and solutions for Fractary Core.

## Configuration Issues

### Configuration File Not Found

**Symptoms:**
- Error: "Configuration file not found"
- Commands fail with "No configuration" error

**Solutions:**

1. Initialize configuration:
   ```bash
   fractary-core:config-init
   ```

2. Check file exists:
   ```bash
   ls -la .fractary/config.yaml
   ```

3. Specify config path explicitly:
   ```bash
   fractary-core --config .fractary/config.yaml work issue list
   ```

### Environment Variables Not Substituting

**Symptoms:**
- Error: "Token is required"
- Literal `${VAR_NAME}` in config values

**Solutions:**

1. Check variable is exported:
   ```bash
   echo $GITHUB_TOKEN
   export GITHUB_TOKEN=ghp_your_token
   ```

2. Verify syntax in config:
   ```yaml
   # Correct
   token: ${GITHUB_TOKEN}

   # Incorrect
   token: $GITHUB_TOKEN
   token: ${GITHUB_TOKEN
   ```

3. Use default values:
   ```yaml
   token: ${GITHUB_TOKEN:-default_value}
   ```

### Invalid YAML Syntax

**Symptoms:**
- Error: "YAML parsing error"
- Configuration fails to load

**Solutions:**

1. Validate YAML syntax:
   ```bash
   fractary-core:config-validate
   ```

2. Common YAML issues:
   ```yaml
   # Wrong - tabs instead of spaces
   work:
   	token: value

   # Correct - use spaces
   work:
     token: value

   # Wrong - missing quotes for special chars
   token: abc:def

   # Correct - quote strings with colons
   token: "abc:def"
   ```

## Authentication Issues

### GitHub Token Invalid

**Symptoms:**
- Error: "Bad credentials"
- 401 Unauthorized responses

**Solutions:**

1. Verify token is valid:
   ```bash
   curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
   ```

2. Check token permissions:
   - `repo` scope for repository access
   - `issues` scope for issue operations

3. Generate new token:
   - Go to GitHub Settings > Developer Settings > Personal Access Tokens
   - Generate new token with required scopes

### Jira Authentication Fails

**Symptoms:**
- Error: "Unauthorized"
- 401 responses from Jira

**Solutions:**

1. Verify credentials:
   ```bash
   curl -u "$JIRA_EMAIL:$JIRA_TOKEN" \
     https://myorg.atlassian.net/rest/api/3/myself
   ```

2. Use API token (not password):
   - Go to Atlassian Account Settings
   - Security > Create API Token

3. Check email matches account:
   ```yaml
   jira:
     email: your-actual-email@example.com  # Must match Atlassian account
     token: ${JIRA_TOKEN}
   ```

### Linear API Key Invalid

**Symptoms:**
- Error: "Invalid API key"
- GraphQL errors

**Solutions:**

1. Generate new API key:
   - Go to Linear Settings > API
   - Create new personal API key

2. Check key format:
   ```bash
   # Should start with lin_api_
   echo $LINEAR_API_KEY
   ```

## SDK Issues

### Module Not Found

**Symptoms:**
- Error: "Cannot find module '@fractary/core'"
- Import errors

**Solutions:**

1. Install package:
   ```bash
   npm install @fractary/core
   ```

2. Check package.json:
   ```json
   {
     "dependencies": {
       "@fractary/core": "^2.0.0"
     }
   }
   ```

3. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Type Errors

**Symptoms:**
- TypeScript compilation errors
- Type mismatches

**Solutions:**

1. Update to latest version:
   ```bash
   npm update @fractary/core
   ```

2. Check TypeScript version:
   ```json
   {
     "devDependencies": {
       "typescript": "^5.0.0"
     }
   }
   ```

3. Import types correctly:
   ```typescript
   import type { Issue, WorkConfig } from '@fractary/core/work';
   ```

## CLI Issues

### Command Not Found

**Symptoms:**
- Error: "fractary-core: command not found"

**Solutions:**

1. Install globally:
   ```bash
   npm install -g @fractary/core-cli
   ```

2. Use npx:
   ```bash
   npx @fractary/core-cli work issue list
   ```

3. Check PATH:
   ```bash
   echo $PATH
   npm config get prefix
   ```

### Permission Denied

**Symptoms:**
- Error: "EACCES: permission denied"

**Solutions:**

1. Fix npm permissions:
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   export PATH=~/.npm-global/bin:$PATH
   ```

2. Or use npx instead of global install

## MCP Server Issues

### Server Won't Start

**Symptoms:**
- MCP server fails to launch
- Claude Code can't connect

**Solutions:**

1. Test server directly:
   ```bash
   npx @fractary/core-mcp 2>&1
   ```

2. Check Claude Code settings:
   ```json
   {
     "mcpServers": {
       "fractary-core": {
         "command": "npx",
         "args": ["-y", "@fractary/core-mcp"],
         "env": {
           "GITHUB_TOKEN": "your_token"
         }
       }
     }
   }
   ```

3. Check for port conflicts (if using HTTP transport)

### Tools Not Available

**Symptoms:**
- MCP tools don't appear in Claude Code
- "Unknown tool" errors

**Solutions:**

1. Restart Claude Code after configuration changes

2. Check server logs:
   ```bash
   FRACTARY_MCP_LOG_LEVEL=debug npx @fractary/core-mcp 2>&1
   ```

3. Verify configuration is correct:
   ```bash
   fractary-core:config-validate
   ```

## Plugin Issues

### Plugin Not Loading

**Symptoms:**
- Plugin commands not available
- "Unknown command" errors

**Solutions:**

1. Check plugin is in settings:
   ```json
   {
     "plugins": ["fractary-work", "fractary-repo"]
   }
   ```

2. Restart Claude Code

3. Check for plugin errors in Claude Code logs

### Agent Not Triggering

**Symptoms:**
- Agents don't activate when expected

**Solutions:**

1. Use explicit command to trigger:
   ```
   /issue-refine 123
   ```

2. Check configuration:
   ```bash
   fractary-core:config-validate
   ```

## Common Error Messages

### "Rate limit exceeded"

**Cause:** Too many API requests to provider

**Solutions:**
- Wait for rate limit reset
- Use authenticated requests (higher limits)
- Implement request caching

### "Resource not found"

**Cause:** Issue, PR, or spec doesn't exist

**Solutions:**
- Verify ID/number is correct
- Check you have access to the repository
- Ensure resource wasn't deleted

### "Validation error"

**Cause:** Invalid parameters provided

**Solutions:**
- Check parameter types and values
- Review API documentation for required fields
- Use `--help` flag for command options

### "Permission denied"

**Cause:** Insufficient permissions for operation

**Solutions:**
- Check token scopes/permissions
- Verify repository access
- Contact repository admin

## Getting Help

1. **Check documentation:**
   - [SDK Reference](/docs/sdk/js/README.md)
   - [CLI Reference](/docs/cli/README.md)
   - [Configuration Guide](/docs/guides/configuration.md)

2. **Debug mode:**
   ```bash
   # CLI verbose output
   fractary-core --verbose work issue list

   # MCP debug logging
   FRACTARY_MCP_LOG_LEVEL=debug npx @fractary/core-mcp
   ```

3. **Report issues:**
   - GitHub: https://github.com/fractary/core/issues
   - Include:
     - Error message
     - Configuration (redacted)
     - Steps to reproduce
     - Version: `fractary-core --version`

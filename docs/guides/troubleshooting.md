# Troubleshooting Guide

Common issues and solutions when working with the Fractary Codex SDK.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Configuration Problems](#configuration-problems)
- [URI and Reference Errors](#uri-and-reference-errors)
- [Storage Provider Issues](#storage-provider-issues)
  - [Archive Storage Issues](#archive-storage-fractary-cli-not-found)
- [Cache Problems](#cache-problems)
- [Permission Errors](#permission-errors)
- [MCP Server Issues](#mcp-server-issues)
- [Performance Issues](#performance-issues)
- [Debugging Tips](#debugging-tips)

## Installation Issues

### npm/yarn Installation Fails

**Problem:** Package installation fails with network or permission errors.

**Solutions:**

```bash
# Clear npm cache
npm cache clean --force

# Try different registry
npm install @fractary/codex --registry=https://registry.npmjs.org

# Use yarn instead
yarn add @fractary/codex

# Install with verbose logging
npm install @fractary/codex --verbose
```

### Python pip Installation Fails

**Problem:** pip install fails or installs wrong version.

**Solutions:**

```bash
# Upgrade pip first
pip install --upgrade pip

# Install with verbose output
pip install fractary-codex --verbose

# Use specific index
pip install fractary-codex --index-url https://pypi.org/simple

# Install in virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install fractary-codex
```

### TypeScript Compilation Errors

**Problem:** TypeScript compiler errors when using the SDK.

**Solution:**

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "lib": ["ES2020"]
  }
}
```

## Configuration Problems

### Configuration Not Found

**Problem:** `loadConfig()` returns null or uses defaults.

**Diagnostic:**

```typescript
import { loadConfig } from '@fractary/codex'

const config = loadConfig()
if (!config) {
  console.log('Config not found, checking paths...')

  // Check if file exists
  const fs = require('fs')
  const path = require('path')

  const paths = [
    '.fractary/config.yaml',
    '.fractary/codex.yml',
    path.join(process.env.HOME, '.fractary/config.yaml')
  ]

  paths.forEach(p => {
    console.log(`${p}: ${fs.existsSync(p) ? 'exists' : 'not found'}`)
  })
}
```

**Solutions:**

1. Create config file:
   ```bash
   mkdir -p .fractary
   touch .fractary/config.yaml
   ```

2. Use absolute path:
   ```typescript
   const config = loadConfig('/absolute/path/to/codex.yaml')
   ```

3. Set environment variable:
   ```bash
   export CODEX_CONFIG_PATH=/path/to/codex.yaml
   ```

### Invalid YAML Syntax

**Problem:** Config file has YAML syntax errors.

**Error:**
```
ConfigError: Failed to parse YAML: unexpected token
```

**Solution:**

Validate YAML syntax:

```bash
# Using yamllint
yamllint .fractary/config.yaml

# Using Python
python -c "import yaml; yaml.safe_load(open('.fractary/config.yaml'))"

# Using Node.js
node -e "const yaml = require('js-yaml'); const fs = require('fs'); yaml.load(fs.readFileSync('.fractary/config.yaml'))"
```

Common YAML mistakes:

```yaml
# ❌ Wrong: Missing quotes around special chars
baseUrl: http://example.com:3000

# ✅ Correct: Use quotes
baseUrl: "http://example.com:3000"

# ❌ Wrong: Inconsistent indentation
storage:
  - type: local
   basePath: ./knowledge

# ✅ Correct: Consistent 2-space indentation
storage:
  - type: local
    basePath: ./knowledge
```

### Environment Variables Not Expanding

**Problem:** `${VAR_NAME}` appears literally in config.

**Diagnostic:**

```typescript
const config = loadConfig()
console.log(config.storage?.[0])
// If you see: { token: '${GITHUB_TOKEN}' } instead of actual token
```

**Solutions:**

1. Ensure environment variable is set:
   ```bash
   echo $GITHUB_TOKEN  # Should print token
   export GITHUB_TOKEN=your_token_here
   ```

2. Check syntax - must be exactly `${VAR_NAME}`:
   ```yaml
   # ❌ Wrong formats
   token: $GITHUB_TOKEN
   token: "{GITHUB_TOKEN}"
   token: "${GITHUB_TOKEN}"  # Double quotes might prevent expansion

   # ✅ Correct format
   token: ${GITHUB_TOKEN}
   ```

3. Use defaults:
   ```yaml
   token: ${GITHUB_TOKEN:-default_value}
   ```

## URI and Reference Errors

### InvalidUriError: Invalid codex URI

**Problem:** URI parsing fails.

**Error:**
```
InvalidUriError: Invalid codex URI: http://example.com/file.md
Reason: URI must start with 'codex://'
```

**Solution:**

Ensure URI follows the format: `codex://org/project/path`

```typescript
// ❌ Wrong formats
parseReference('http://example.com/file.md')
parseReference('codex:/org/project/file.md')  // Missing second slash
parseReference('codex://org')  // Missing project and path
parseReference('codex://org/project')  // Missing path

// ✅ Correct format
parseReference('codex://fractary/codex/docs/api.md')
```

### Reference Not Resolved to Local Path

**Problem:** `isLocal` is false when it should be true.

**Diagnostic:**

```typescript
const resolved = resolveReference('codex://myorg/myproject/file.md')
console.log('Is local:', resolved.isLocal)
console.log('Working dir:', process.cwd())
console.log('Detected org:', resolveOrganization())
```

**Solutions:**

1. Set organization in config:
   ```yaml
   organization: myorg
   ```

2. Use correct working directory:
   ```typescript
   const resolved = resolveReference(uri, {
     workingDir: '/path/to/myproject'
   })
   ```

3. Check git remote matches:
   ```bash
   git remote -v
   # Should include: github.com:myorg/myproject.git
   ```

## Storage Provider Issues

### GitHub Storage: 401 Unauthorized

**Problem:** GitHub API returns 401 error.

**Error:**
```
StorageError: GitHub API error: 401 Unauthorized
```

**Solutions:**

1. Check token is set:
   ```bash
   echo $GITHUB_TOKEN
   ```

2. Verify token has correct scopes:
   - For public repos: No scopes needed (but token should still be valid)
   - For private repos: `repo` scope required

3. Test token:
   ```bash
   curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
   ```

4. Regenerate token if needed at: https://github.com/settings/tokens

### GitHub Storage: 404 Not Found

**Problem:** Document not found in GitHub.

**Diagnostic:**

```typescript
const ref = parseReference('codex://org/project/file.md')
console.log('Looking for:')
console.log(`  Org: ${ref.org}`)
console.log(`  Repo: ${ref.project}`)
console.log(`  Path: ${ref.path}`)

// Check if file exists
const url = `https://api.github.com/repos/${ref.org}/${ref.project}/contents/${ref.path}`
console.log(`  URL: ${url}`)
```

**Solutions:**

1. Verify file exists in repository
2. Check branch (default is `main`):
   ```yaml
   storage:
     - type: github
       branch: develop  # Use specific branch
   ```

3. Check repository permissions
4. Ensure path is correct (case-sensitive)

### HTTP Storage: Connection Timeout

**Problem:** HTTP requests timeout.

**Error:**
```
StorageError: Request timeout after 30000ms
```

**Solutions:**

1. Increase timeout:
   ```yaml
   storage:
     - type: http
       baseUrl: https://slow-server.com
       timeout: 60000  # 60 seconds
   ```

2. Check network connectivity:
   ```bash
   curl -v https://codex.example.com/test.md
   ```

3. Use retry logic in application code

### Local Storage: Permission Denied

**Problem:** Cannot read files from local filesystem.

**Error:**
```
StorageError: EACCES: permission denied, open '/path/to/file.md'
```

**Solutions:**

1. Check file permissions:
   ```bash
   ls -la ./knowledge/docs/api.md
   ```

2. Fix permissions:
   ```bash
   chmod 644 ./knowledge/docs/api.md
   chmod 755 ./knowledge  # Directory needs execute permission
   ```

3. Run with appropriate user:
   ```bash
   # If using sudo, ensure files are readable
   sudo chown -R $USER:$USER ./knowledge
   ```

### Archive Storage: fractary CLI Not Found

**Problem:** Archive fetch fails with "command not found: fractary".

**Error:**
```
StorageError: Failed to fetch from archive: spawn fractary ENOENT
```

**Solutions:**

1. Install fractary CLI:
   ```bash
   npm install -g @fractary/cli
   ```

2. Verify installation:
   ```bash
   which fractary
   fractary --version
   ```

3. If installed but not found, check PATH:
   ```bash
   echo $PATH
   # Add npm global bin to PATH if needed
   export PATH="$PATH:$(npm config get prefix)/bin"
   ```

4. Specify custom path in configuration:
   ```yaml
   archive:
     # ... project config

   # Environment variable
   FRACTARY_CLI=/custom/path/to/fractary
   ```

### Archive Storage: AWS Credentials Not Found

**Problem:** S3 archive fetch fails with credentials error.

**Error:**
```
StorageError: fractary-file read failed: Unable to locate credentials
```

**Solutions:**

1. Set AWS environment variables:
   ```bash
   export AWS_ACCESS_KEY_ID=your-access-key
   export AWS_SECRET_ACCESS_KEY=your-secret-key
   export AWS_REGION=us-east-1  # Optional but recommended
   ```

2. Or configure AWS CLI:
   ```bash
   aws configure
   ```

3. Or use IAM role (when running on EC2/ECS)

4. Verify credentials:
   ```bash
   aws s3 ls s3://your-bucket/
   ```

5. Check bucket permissions:
   - Required: `s3:GetObject`
   - Verify with:
     ```bash
     aws s3api head-object --bucket your-bucket --key archive/test.md
     ```

### Archive Storage: File Not Found in Archive

**Problem:** Document expected in archive returns 404.

**Error:**
```
StorageError: All providers failed to fetch: codex://org/project/specs/WORK-123.md
```

**Diagnostic:**

```typescript
// Enable debug logging
process.env.CODEX_LOG_LEVEL = 'debug'

// Check archive configuration
const config = loadConfig()
console.log('Archive config:', config.archive?.projects)

// Verify archive path structure
const expectedPath = 'archive/specs/org/project/specs/WORK-123.md'
console.log('Expected archive path:', expectedPath)
```

**Solutions:**

1. Verify archive configuration is loaded:
   ```yaml
   archive:
     projects:
       org/project:  # Must match reference org/project
         enabled: true
         handler: s3
         bucket: your-bucket
   ```

2. Check path structure in S3:
   ```bash
   aws s3 ls s3://your-bucket/archive/specs/org/project/specs/
   ```

3. Verify pattern matching (if patterns configured):
   ```yaml
   archive:
     projects:
       org/project:
         patterns:
           - specs/**  # Must match file path
   ```

4. Test with fractary CLI directly:
   ```bash
   fractary file read \
     --remote-path archive/specs/org/project/specs/WORK-123.md \
     --handler s3 \
     --bucket your-bucket
   ```

### Archive Storage: Wrong Storage Handler

**Problem:** Archive fetch fails with handler-specific error.

**Error:**
```
StorageError: fractary-file read failed: Cloudflare credentials not configured
```

**Solutions:**

1. Verify handler matches your storage:
   ```yaml
   archive:
     projects:
       org/project:
         handler: r2  # Should match actual storage (s3, r2, gcs, local)
   ```

2. For R2, set Cloudflare credentials:
   ```bash
   export CLOUDFLARE_ACCOUNT_ID=your-account-id
   export CLOUDFLARE_API_TOKEN=your-api-token
   ```

3. For GCS, authenticate with gcloud:
   ```bash
   gcloud auth application-default login
   ```

4. Test handler with fractary CLI:
   ```bash
   fractary file read --remote-path test.md --handler r2 --bucket your-bucket
   ```

### Archive Storage: Slow Performance

**Problem:** Archive fetches are significantly slower than expected.

**Diagnostic:**

```typescript
const start = Date.now()
const result = await cache.get('codex://org/project/specs/WORK-123.md')
console.log(`Fetch took: ${Date.now() - start}ms`)
console.log(`Source: ${result.source}`)  // Check if 's3-archive'
```

**Solutions:**

1. **Enable caching** (should be automatic):
   ```yaml
   cache:
     defaultTtl: 3600  # Cache archive results for 1 hour
   ```

2. **Check network latency to S3**:
   ```bash
   aws s3 cp s3://your-bucket/archive/test.md - --debug
   ```

3. **Use regional S3 endpoints** (if applicable):
   ```bash
   export AWS_REGION=us-east-1  # Same region as your app
   ```

4. **Consider archive structure optimization**:
   - Large files: Use smaller archives
   - Many small files: Consider batching

5. **Monitor exists() calls** (they download full file):
   - This is a known limitation
   - Minimize exists() checks where possible

### Archive Storage: Pattern Not Matching

**Problem:** Files that should be in archive are not checked.

**Diagnostic:**

```typescript
import { S3ArchiveStorage } from '@fractary/codex'

const storage = new S3ArchiveStorage({
  projects: {
    'org/project': {
      enabled: true,
      handler: 's3',
      patterns: ['specs/**']
    }
  }
})

const ref = resolveReference('codex://org/project/docs/api.md')
console.log('Can handle?', storage.canHandle(ref))  // Should be false (docs/** not in patterns)
```

**Solutions:**

1. Check pattern syntax (uses glob):
   ```yaml
   patterns:
     - "specs/**"       # All files in specs/
     - "docs/**/*.md"   # Markdown files in docs/
     - "*.md"          # Top-level markdown only
   ```

2. Test patterns separately:
   ```typescript
   import { minimatch } from 'minimatch'
   minimatch('specs/WORK-123.md', 'specs/**')  // true
   minimatch('docs/api.md', 'specs/**')        // false
   ```

3. Remove patterns to allow all files:
   ```yaml
   archive:
     projects:
       org/project:
         enabled: true
         handler: s3
         # No patterns = all files eligible
   ```

### Archive Storage: Empty or Invalid Prefix

**Problem:** Archive fetch fails with path error.

**Error:**
```
Error: Archive prefix cannot be empty or whitespace-only
```

**Solution:**

Fix prefix configuration:
```yaml
archive:
  projects:
    org/project:
      prefix: archive/  # Must be non-empty, non-whitespace
      # Or omit to use default 'archive/'
```

## Cache Problems

### Cache Always Misses

**Problem:** Cache hit rate is 0%, always fetching from storage.

**Diagnostic:**

```typescript
const cache = CacheManager.create({ cacheDir: '.fractary/codex/cache' })
const stats = await cache.getStats()
console.log('Hit rate:', stats.hitRate)
console.log('Total entries:', stats.totalEntries)
console.log('Cache dir exists:', fs.existsSync('.fractary/codex/cache'))
```

**Solutions:**

1. Check cache directory exists and is writable:
   ```bash
   ls -la .fractary/codex/cache
   chmod 755 .fractary/codex/cache
   ```

2. Verify TTL is not too short:
   ```typescript
   const cache = CacheManager.create({
     defaultTtl: 3600  // Should be > 0
   })
   ```

3. Check for conflicting cache keys:
   ```typescript
   // Ensure consistent reference format
   const uri = 'codex://org/project/file.md'  // Always use same format
   ```

### Cache Grows Too Large

**Problem:** Cache directory consuming too much disk space.

**Solutions:**

1. Set memory limit:
   ```typescript
   const cache = CacheManager.create({
     maxMemorySize: 50 * 1024 * 1024  // 50 MB
   })
   ```

2. Lower TTLs:
   ```yaml
   types:
     docs:
       defaultTtl: 3600  # 1 hour instead of 1 day
   ```

3. Manually clear cache:
   ```typescript
   await cache.invalidate()  // Clear all
   await cache.invalidate('docs/**')  // Clear pattern
   ```

4. Set up periodic cleanup:
   ```typescript
   setInterval(async () => {
     const stats = await cache.getStats()
     if (stats.totalSize > 100 * 1024 * 1024) {  // 100 MB
       await cache.invalidate()
     }
   }, 3600000)  // Every hour
   ```

### Stale Cache Entries

**Problem:** Getting outdated content despite changes.

**Solutions:**

1. Invalidate specific entry:
   ```typescript
   await cache.invalidate('codex://org/project/updated-file.md')
   ```

2. Force fresh fetch:
   ```typescript
   await cache.get(ref, { noCache: true })
   ```

3. Lower TTL for frequently changing content:
   ```yaml
   types:
     status:
       patterns: ["status/**"]
       defaultTtl: 300  # 5 minutes
   ```

## Permission Errors

### Permission Denied When Fetching

**Problem:** `PermissionError` when accessing documents.

**Error:**
```
PermissionError: Access denied to codex://org/project/internal/secret.md
Required: read, Actual: none
```

**Solutions:**

1. Check permission rules:
   ```yaml
   permissions:
     default: read
     rules:
       - pattern: internal/**
         permission: read  # Change from 'none'
   ```

2. Check document frontmatter:
   ```markdown
   ---
   permissions:
     read: all  # or specific users
   ---
   ```

3. Override permissions (if authorized):
   ```typescript
   const permissions = new PermissionManager({
     default: 'read'  // More permissive default
   })
   ```

## MCP Server Issues

### MCP Server Won't Start

**Problem:** Server fails to start on specified port.

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**

1. Check if port is in use:
   ```bash
   # Linux/Mac
   lsof -i :3000
   netstat -an | grep 3000

   # Windows
   netstat -ano | findstr :3000
   ```

2. Kill existing process:
   ```bash
   # Linux/Mac
   kill -9 $(lsof -t -i:3000)

   # Windows
   # Find PID from netstat, then:
   taskkill /PID <pid> /F
   ```

3. Use different port:
   ```typescript
   await server.start({ port: 3001 })
   ```

### MCP Tools Not Working

**Problem:** Tool calls fail or return errors.

**Diagnostic:**

```typescript
const server = createMcpServer({ cache, storage })

// List available tools
console.log('Available tools:', server.listTools().map(t => t.name))

// Test tool directly
try {
  const result = await server.callTool('codex_fetch', {
    uri: 'codex://org/project/file.md'
  })
  console.log('Success:', result)
} catch (error) {
  console.error('Error:', error)
}
```

**Solutions:**

1. Verify tool arguments match schema:
   ```typescript
   // codex_fetch requires 'uri', not 'path'
   await server.callTool('codex_fetch', {
     uri: 'codex://org/project/file.md'  // ✅ Correct
     // path: 'file.md'  // ❌ Wrong
   })
   ```

2. Check cache and storage are configured:
   ```typescript
   const cache = CacheManager.create()
   cache.setStorageManager(storage)  // Must set storage!

   const server = createMcpServer({ cache, storage })
   ```

## Performance Issues

### Slow First Fetch

**Problem:** First document fetch is very slow.

**Expected:** First fetch is slower because it must:
1. Resolve reference
2. Try storage providers in priority order
3. Download from network
4. Write to cache

**Solutions:**

1. Pre-warm cache:
   ```typescript
   // Pre-fetch common documents
   const commonDocs = [
     'codex://org/project/README.md',
     'codex://org/project/docs/api.md'
   ]

   await Promise.all(
     commonDocs.map(uri => cache.get(parseReference(uri)))
   )
   ```

2. Use local storage first:
   ```yaml
   storage:
     - type: local
       basePath: ./knowledge
       priority: 10  # Try first
   ```

3. Reduce provider count:
   ```yaml
   storage:
     - type: github  # Only one provider
   ```

### High Memory Usage

**Problem:** Application using too much memory.

**Solutions:**

1. Reduce memory cache size:
   ```typescript
   const cache = CacheManager.create({
     maxMemorySize: 10 * 1024 * 1024  // 10 MB instead of default 50 MB
   })
   ```

2. Use disk cache only:
   ```typescript
   const cache = CacheManager.create({
     maxMemorySize: 0  // Disable memory cache
   })
   ```

3. Limit concurrent fetches:
   ```typescript
   // Instead of fetching all at once
   const results = await Promise.all(uris.map(uri => cache.get(uri)))

   // Fetch in batches
   const batchSize = 5
   for (let i = 0; i < uris.length; i += batchSize) {
     const batch = uris.slice(i, i + batchSize)
     await Promise.all(batch.map(uri => cache.get(uri)))
   }
   ```

## Debugging Tips

### Enable Debug Logging

**JavaScript/TypeScript:**

```bash
# Enable all codex debug logs
DEBUG=codex:* node app.js

# Enable specific modules
DEBUG=codex:cache,codex:storage node app.js
```

**Python:**

```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('fractary_codex')
logger.setLevel(logging.DEBUG)
```

### Inspect Cache Contents

```typescript
import fs from 'fs/promises'
import path from 'path'

async function inspectCache() {
  const cacheDir = '.fractary/codex/cache'

  async function walkDir(dir: string, depth = 0) {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      console.log('  '.repeat(depth) + entry.name)

      if (entry.isDirectory()) {
        await walkDir(fullPath, depth + 1)
      } else {
        const stats = await fs.stat(fullPath)
        console.log('  '.repeat(depth + 1) + `Size: ${stats.size} bytes`)
      }
    }
  }

  await walkDir(cacheDir)
}
```

### Trace HTTP Requests

```typescript
// Add request logging
const storage = new HttpStorage({
  baseUrl: 'https://codex.example.com'
})

// Monkey-patch fetch to log
const originalFetch = storage['fetch']
storage['fetch'] = async function(...args) {
  console.log('HTTP Request:', args[0])
  const result = await originalFetch.apply(this, args)
  console.log('HTTP Response:', result.status)
  return result
}
```

### Profile Performance

```typescript
async function profileFetch(uri: string) {
  const start = performance.now()

  console.log(`Fetching ${uri}...`)
  const result = await cache.get(uri)

  const duration = performance.now() - start
  console.log(`Completed in ${duration.toFixed(2)}ms`)
  console.log(`Size: ${result.size} bytes`)
  console.log(`Source: ${result.source}`)
  console.log(`From cache: ${result.metadata?.fromCache}`)

  return { duration, size: result.size, source: result.source }
}

// Profile multiple fetches
const uris = [
  'codex://org/project/file1.md',
  'codex://org/project/file2.md',
  'codex://org/project/file3.md'
]

for (const uri of uris) {
  await profileFetch(uri)
}
```

## Getting Help

If you're still experiencing issues:

1. **Check GitHub Issues**: https://github.com/fractary/codex/issues
2. **Create a Minimal Reproduction**:
   ```typescript
   import { CacheManager, StorageManager } from '@fractary/codex'

   async function reproduce() {
     const storage = StorageManager.create()
     const cache = CacheManager.create()
     cache.setStorageManager(storage)

     // Add minimal code that reproduces the issue
     await cache.get('codex://org/project/file.md')
   }

   reproduce().catch(console.error)
   ```
3. **Provide Details**:
   - SDK version (`npm list @fractary/codex` or `pip show fractary-codex`)
   - Node.js/Python version
   - Operating system
   - Error message and stack trace
   - Configuration (sanitized)

## See Also

- [API Reference](./api-reference.md) - Detailed API documentation
- [Configuration Guide](./configuration.md) - Configuration options
- [CLI Integration Guide](./cli-integration.md) - Integration patterns

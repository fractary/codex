# Automatic Version Bumping via Husky Pre-Commit Hook

**Status:** Implemented
**Project:** fractary/codex
**Date:** 2026-01-20
**PR:** [#57](https://github.com/fractary/codex/pull/57)

## Problem

When code changes are made to SDK, CLI, MCP, or plugins, version numbers and dependency references are frequently forgotten, causing deployment issues. Manual reminders and CI validation scripts don't work because:

1. Developers forget to bump versions before committing
2. CI catches the issue too late (after the commit is made)
3. Dependency references between packages get out of sync
4. Marketplace manifests don't match plugin versions

## Solution

Install a **Husky pre-commit hook** that automatically:

1. Detects which components have staged changes
2. Bumps their versions (patch increment)
3. Updates dependency references (e.g., CLI/MCP → SDK)
4. Syncs marketplace manifest with plugin version
5. Adds all version file changes to the commit

This is fully automatic - developers don't need to do anything.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         git commit                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    .husky/pre-commit                             │
│  1. Run bump-versions.js --staged                                │
│  2. Stage any modified version files                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 scripts/bump-versions.js                         │
│  1. Get staged files (git diff --cached --name-only)            │
│  2. Check if source dirs changed for each component             │
│  3. Bump patch version if source changed                        │
│  4. Update dependency references                                 │
│  5. Sync marketplace manifest                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Guide

### Step 1: Install Husky

Add to root `package.json`:

```json
{
  "scripts": {
    "prepare": "husky"
  },
  "devDependencies": {
    "husky": "^9.1.0"
  }
}
```

Run:
```bash
npm install
```

This automatically initializes Husky via the `prepare` script.

### Step 2: Create Pre-Commit Hook

Create `.husky/pre-commit`:

```bash
#!/bin/sh

# Auto-bump versions based on staged files
# This hook automatically bumps component versions when source files are staged

# Run version bump script
OUTPUT=$(node scripts/bump-versions.js --staged 2>&1)
EXIT_CODE=$?

# Show output to user so they know what happened
if [ -n "$OUTPUT" ]; then
  echo "$OUTPUT"
fi

# Exit if script failed
if [ $EXIT_CODE -ne 0 ]; then
  echo "Version bump failed. Use 'git commit --no-verify' to bypass."
  exit $EXIT_CODE
fi

# Stage any modified version files (only if they exist and were modified)
# CUSTOMIZE: Update this list for your project's version files
VERSION_FILES="sdk/js/package.json cli/package.json mcp/server/package.json plugins/codex/plugin.json .claude-plugin/marketplace.json"

STAGED_FILES=""
for file in $VERSION_FILES; do
  if [ -f "$file" ] && git diff --name-only "$file" | grep -q .; then
    STAGED_FILES="$STAGED_FILES $file"
  fi
done

if [ -n "$STAGED_FILES" ]; then
  echo "Auto-staging version files:$STAGED_FILES"
  git add $STAGED_FILES
fi
```

Make it executable:
```bash
chmod +x .husky/pre-commit
```

### Step 3: Create Version Bump Script

Create `scripts/bump-versions.js`. This script needs to be customized for each project's structure.

#### Configuration Section (customize per project)

```javascript
// Version file locations - CUSTOMIZE FOR YOUR PROJECT
const VERSION_FILES = {
  sdk: 'sdk/js/package.json',
  cli: 'cli/package.json',
  mcp: 'mcp/server/package.json',
  plugin: 'plugins/codex/plugin.json',
  marketplace: '.claude-plugin/marketplace.json',
};

// Source directories that trigger version bumps - CUSTOMIZE FOR YOUR PROJECT
const SOURCE_DIRS = {
  sdk: ['sdk/js/src/'],
  cli: ['cli/src/'],
  mcp: ['mcp/server/src/'],
  plugin: ['plugins/codex/agents/', 'plugins/codex/commands/', 'plugins/codex/skills/'],
};

// Dependencies to update when SDK version changes - CUSTOMIZE FOR YOUR PROJECT
const SDK_DEPENDENTS = ['cli', 'mcp'];
```

#### Core Functions (reusable)

```javascript
const fs = require('fs');
const { execSync } = require('child_process');

const checkOnly = process.argv.includes('--check-only');
const stagedOnly = process.argv.includes('--staged');
const verbose = process.argv.includes('--verbose');

function log(msg) {
  if (verbose || !checkOnly) console.log(msg);
}

function getChangedFiles() {
  try {
    if (stagedOnly) {
      return execSync('git diff --cached --name-only', { encoding: 'utf-8' })
        .trim().split('\n').filter(Boolean);
    }
    const result = execSync('git diff --name-only origin/main...HEAD 2>/dev/null || git diff --name-only HEAD~1', {
      encoding: 'utf-8'
    });
    return result.trim().split('\n').filter(Boolean);
  } catch (e) {
    try {
      return execSync('git diff --cached --name-only', { encoding: 'utf-8' })
        .trim().split('\n').filter(Boolean);
    } catch (e2) {
      return [];
    }
  }
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    throw new Error(`Failed to parse JSON in ${filePath}: ${e.message}`);
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function bumpPatch(version) {
  const parts = version.split('.');
  parts[2] = String(parseInt(parts[2], 10) + 1);
  return parts.join('.');
}

function getMajorMinor(version) {
  return version.split('.').slice(0, 2).join('.');
}

function checkSourceChanged(changedFiles, component) {
  const dirs = SOURCE_DIRS[component];
  return changedFiles.some(file => dirs.some(dir => file.startsWith(dir)));
}

function checkVersionBumped(changedFiles, component) {
  const versionFile = VERSION_FILES[component];
  return changedFiles.includes(versionFile);
}
```

#### Main Logic (customize as needed)

```javascript
function main() {
  const changedFiles = getChangedFiles();
  log(`Changed files: ${changedFiles.length}`);

  const updates = [];
  const errors = [];

  // Check each component for version bumps
  for (const [component, dirs] of Object.entries(SOURCE_DIRS)) {
    const sourceChanged = checkSourceChanged(changedFiles, component);
    const versionBumped = checkVersionBumped(changedFiles, component);

    if (sourceChanged && !versionBumped) {
      const pkg = readJson(VERSION_FILES[component]);
      const oldVersion = pkg.version;
      const newVersion = bumpPatch(oldVersion);

      if (checkOnly) {
        errors.push(`${component.toUpperCase()}: source changed but version not bumped (${oldVersion})`);
      } else {
        pkg.version = newVersion;
        writeJson(VERSION_FILES[component], pkg);
        updates.push(`${component.toUpperCase()}: ${oldVersion} → ${newVersion}`);
      }
    }
  }

  // CUSTOMIZE: Add dependency alignment logic for your project
  // Example: Update CLI/MCP when SDK version changes

  // Output results
  if (checkOnly) {
    if (errors.length > 0) {
      console.log('Version issues found:');
      errors.forEach(e => console.log(`  ❌ ${e}`));
      console.log('\nRun: node scripts/bump-versions.js');
      process.exit(1);
    } else {
      console.log('✓ All versions are properly aligned');
      process.exit(0);
    }
  } else {
    if (updates.length > 0) {
      console.log('Updated versions:');
      updates.forEach(u => console.log(`  ✓ ${u}`));
    } else {
      console.log('No version updates needed');
    }
  }
}

try {
  main();
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
```

### Step 4: Add Tests (Optional but Recommended)

Create `scripts/bump-versions.test.js` to verify the script works correctly. See the codex implementation for a complete example with 10 tests covering:

- Script execution with various flags
- Helper function unit tests
- Error handling for missing/invalid files
- Source file detection logic

Add to `package.json`:
```json
{
  "scripts": {
    "test:versions": "node scripts/bump-versions.test.js"
  }
}
```

### Step 5: Add CI Check (Optional)

Add a GitHub Actions workflow to validate versions on PR:

```yaml
name: Version Check
on: [pull_request]
jobs:
  check-versions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: node scripts/bump-versions.js --check-only
```

## How It Works (Developer Experience)

1. Developer stages code changes: `git add sdk/js/src/...`
2. Developer commits: `git commit -m "feat: add feature"`
3. **Pre-commit hook runs automatically:**
   - Sees SDK files staged → bumps `sdk/js/package.json` version
   - SDK bumped → updates CLI/MCP `@fractary/codex` dependency (if configured)
   - Shows output: `Updated versions: SDK: 0.12.5 → 0.12.6`
   - Adds version files to the commit
4. Commit completes with all version bumps included

### Bypassing the Hook

For emergency situations or when you know what you're doing:
```bash
git commit --no-verify -m "message"
```

## Customization Checklist

When implementing in a new project:

- [ ] Install Husky (`npm install -D husky`)
- [ ] Add `"prepare": "husky"` script to package.json
- [ ] Create `.husky/pre-commit` hook
- [ ] Create `scripts/bump-versions.js` with project-specific config:
  - [ ] Update `VERSION_FILES` mapping
  - [ ] Update `SOURCE_DIRS` mapping
  - [ ] Update `SDK_DEPENDENTS` if applicable
  - [ ] Add any custom dependency sync logic
- [ ] Update pre-commit hook's `VERSION_FILES` list
- [ ] Add tests (recommended)
- [ ] Add CI version check workflow (recommended)

## Files Created

| File | Purpose |
|------|---------|
| `.husky/pre-commit` | Git hook that runs on every commit |
| `scripts/bump-versions.js` | Version detection and bumping logic |
| `scripts/bump-versions.test.js` | Test suite (optional) |

## Project-Specific Configurations

### fractary/codex

```javascript
const VERSION_FILES = {
  sdk: 'sdk/js/package.json',
  cli: 'cli/package.json',
  mcp: 'mcp/server/package.json',
  plugin: 'plugins/codex/plugin.json',
  marketplace: '.claude-plugin/marketplace.json',
};

const SOURCE_DIRS = {
  sdk: ['sdk/js/src/'],
  cli: ['cli/src/'],
  mcp: ['mcp/server/src/'],
  plugin: ['plugins/codex/agents/', 'plugins/codex/commands/', 'plugins/codex/skills/', 'plugins/codex/config/'],
};
```

### fractary/core (example)

```javascript
const VERSION_FILES = {
  core: 'package.json',
  // Add other packages as needed
};

const SOURCE_DIRS = {
  core: ['src/'],
  // Add other packages as needed
};
```

### fractary/faber (example)

```javascript
const VERSION_FILES = {
  faber: 'package.json',
  plugin: 'plugins/faber/plugin.json',
  // Add other packages as needed
};

const SOURCE_DIRS = {
  faber: ['src/'],
  plugin: ['plugins/faber/agents/', 'plugins/faber/commands/', 'plugins/faber/skills/'],
};
```

## References

- [Husky Documentation](https://typicode.github.io/husky/)
- [Git Hooks](https://git-scm.com/docs/githooks)
- Implementation PR: https://github.com/fractary/codex/pull/57

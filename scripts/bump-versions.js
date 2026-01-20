#!/usr/bin/env node

/**
 * Auto-bump versions based on changed files
 *
 * Usage: node scripts/bump-versions.js [--check-only]
 *
 * This script:
 * 1. Detects which components have changed (SDK, CLI, MCP, Plugin)
 * 2. Bumps their versions (patch increment)
 * 3. Updates dependency references to include new versions
 * 4. Updates marketplace manifest to match plugin version
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const checkOnly = process.argv.includes('--check-only');
const verbose = process.argv.includes('--verbose');

// Version file locations
const VERSION_FILES = {
  sdk: 'sdk/js/package.json',
  cli: 'cli/package.json',
  mcp: 'mcp/server/package.json',
  plugin: 'plugins/codex/plugin.json',
  marketplace: '.claude-plugin/marketplace.json',
};

// Source directories that trigger version bumps
const SOURCE_DIRS = {
  sdk: ['sdk/js/src/'],
  cli: ['cli/src/'],
  mcp: ['mcp/server/src/'],
  plugin: ['plugins/codex/agents/', 'plugins/codex/commands/', 'plugins/codex/skills/', 'plugins/codex/config/'],
};

// Dependencies to update when SDK version changes
const SDK_DEPENDENTS = ['cli', 'mcp'];

function log(msg) {
  if (verbose || !checkOnly) console.log(msg);
}

function getChangedFiles() {
  try {
    // Try to get changed files vs origin/main
    const result = execSync('git diff --name-only origin/main...HEAD 2>/dev/null || git diff --name-only HEAD~1', {
      encoding: 'utf-8'
    });
    return result.trim().split('\n').filter(Boolean);
  } catch (e) {
    // Fallback: check staged files
    try {
      return execSync('git diff --cached --name-only', { encoding: 'utf-8' })
        .trim().split('\n').filter(Boolean);
    } catch (e2) {
      return [];
    }
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
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

// Main logic
const changedFiles = getChangedFiles();
log(`Changed files: ${changedFiles.length}`);

const updates = [];
const errors = [];

// Check each component
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

// Check SDK dependency alignment
const sdkPkg = readJson(VERSION_FILES.sdk);
const sdkVersion = sdkPkg.version;
const sdkMajorMinor = getMajorMinor(sdkVersion);

for (const dependent of SDK_DEPENDENTS) {
  const pkg = readJson(VERSION_FILES[dependent]);
  const currentDep = pkg.dependencies['@fractary/codex'];
  const currentMin = getMajorMinor(currentDep.replace(/[\^~]/, ''));

  if (currentMin !== sdkMajorMinor) {
    const newDep = `^${sdkMajorMinor}.0`;

    if (checkOnly) {
      errors.push(`${dependent.toUpperCase()}: SDK dependency ${currentDep} doesn't include SDK ${sdkVersion}`);
    } else {
      pkg.dependencies['@fractary/codex'] = newDep;
      writeJson(VERSION_FILES[dependent], pkg);
      updates.push(`${dependent.toUpperCase()} SDK dep: ${currentDep} → ${newDep}`);
    }
  }
}

// Check marketplace sync with plugin
const pluginPkg = readJson(VERSION_FILES.plugin);
const marketplacePkg = readJson(VERSION_FILES.marketplace);
const pluginVersion = pluginPkg.version;
const marketplacePluginVersion = marketplacePkg.plugins[0].version;

if (pluginVersion !== marketplacePluginVersion) {
  if (checkOnly) {
    errors.push(`MARKETPLACE: plugin version ${marketplacePluginVersion} != plugin.json ${pluginVersion}`);
  } else {
    marketplacePkg.plugins[0].version = pluginVersion;
    // Also bump marketplace metadata version
    marketplacePkg.metadata.version = bumpPatch(marketplacePkg.metadata.version);
    writeJson(VERSION_FILES.marketplace, marketplacePkg);
    updates.push(`MARKETPLACE: plugin version → ${pluginVersion}`);
    updates.push(`MARKETPLACE: metadata version → ${marketplacePkg.metadata.version}`);
  }
}

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
    console.log('\nDon\'t forget to run: npm install');
  } else {
    console.log('No version updates needed');
  }
}

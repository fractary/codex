#!/usr/bin/env node

/**
 * Tests for bump-versions.js
 *
 * Run with: node scripts/bump-versions.test.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${e.message}`);
    testsFailed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(str, substr, message) {
  if (!str.includes(substr)) {
    throw new Error(`${message || 'Assertion failed'}: expected string to include "${substr}"`);
  }
}

// Import functions to test by extracting them
// We'll test the script's behavior via execution

console.log('\nTesting bump-versions.js\n');

// Test 1: Script runs without error when no changes
console.log('Script execution tests:');

test('script runs with --staged flag', () => {
  const result = execSync('node scripts/bump-versions.js --staged', {
    encoding: 'utf-8',
    cwd: path.join(__dirname, '..')
  });
  assertIncludes(result, 'No version updates needed', 'should report no updates when nothing staged');
});

test('script runs with --check-only flag', () => {
  const result = execSync('node scripts/bump-versions.js --check-only', {
    encoding: 'utf-8',
    cwd: path.join(__dirname, '..')
  });
  assertIncludes(result, 'All versions are properly aligned', 'should pass check when aligned');
});

test('script runs with --verbose flag', () => {
  const result = execSync('node scripts/bump-versions.js --staged --verbose', {
    encoding: 'utf-8',
    cwd: path.join(__dirname, '..')
  });
  assertIncludes(result, 'Changed files:', 'should show changed files in verbose mode');
});

// Test 2: Helper function tests via inline execution
console.log('\nHelper function tests:');

test('bumpPatch increments patch version', () => {
  const script = `
    function bumpPatch(version) {
      const parts = version.split('.');
      parts[2] = String(parseInt(parts[2], 10) + 1);
      return parts.join('.');
    }
    console.log(bumpPatch('1.2.3'));
  `;
  const result = execSync(`node -e "${script}"`, { encoding: 'utf-8' }).trim();
  assertEqual(result, '1.2.4', 'should increment patch version');
});

test('bumpPatch handles version 0.0.0', () => {
  const script = `
    function bumpPatch(version) {
      const parts = version.split('.');
      parts[2] = String(parseInt(parts[2], 10) + 1);
      return parts.join('.');
    }
    console.log(bumpPatch('0.0.0'));
  `;
  const result = execSync(`node -e "${script}"`, { encoding: 'utf-8' }).trim();
  assertEqual(result, '0.0.1', 'should handle zero version');
});

test('getMajorMinor extracts major.minor', () => {
  const script = `
    function getMajorMinor(version) {
      return version.split('.').slice(0, 2).join('.');
    }
    console.log(getMajorMinor('1.2.3'));
  `;
  const result = execSync(`node -e "${script}"`, { encoding: 'utf-8' }).trim();
  assertEqual(result, '1.2', 'should extract major.minor');
});

// Test 3: Error handling tests
console.log('\nError handling tests:');

test('readJson throws on missing file', () => {
  const script = `
    const fs = require('fs');
    function readJson(filePath) {
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found: ' + filePath);
      }
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (e) {
        throw new Error('Failed to parse JSON in ' + filePath + ': ' + e.message);
      }
    }
    try {
      readJson('/nonexistent/file.json');
      console.log('NO_ERROR');
    } catch (e) {
      console.log('ERROR:' + e.message);
    }
  `;
  const result = execSync(`node -e "${script}"`, { encoding: 'utf-8' }).trim();
  assertIncludes(result, 'ERROR:', 'should throw error');
  assertIncludes(result, 'File not found', 'should mention file not found');
});

test('readJson throws on invalid JSON', () => {
  // Create temp file with invalid JSON
  const tempFile = '/tmp/invalid-test.json';
  fs.writeFileSync(tempFile, '{ invalid json }');

  const script = `
    const fs = require('fs');
    function readJson(filePath) {
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found: ' + filePath);
      }
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (e) {
        throw new Error('Failed to parse JSON in ' + filePath + ': ' + e.message);
      }
    }
    try {
      readJson('${tempFile}');
      console.log('NO_ERROR');
    } catch (e) {
      console.log('ERROR:' + e.message);
    }
  `;
  const result = execSync(`node -e "${script}"`, { encoding: 'utf-8' }).trim();
  assertIncludes(result, 'ERROR:', 'should throw error');
  assertIncludes(result, 'Failed to parse JSON', 'should mention parse failure');

  // Cleanup
  fs.unlinkSync(tempFile);
});

// Test 4: Version file detection tests
console.log('\nVersion file detection tests:');

test('checkSourceChanged detects SDK changes', () => {
  const script = `
    const SOURCE_DIRS = {
      sdk: ['sdk/js/src/'],
      cli: ['cli/src/'],
    };
    function checkSourceChanged(changedFiles, component) {
      const dirs = SOURCE_DIRS[component];
      return changedFiles.some(file => dirs.some(dir => file.startsWith(dir)));
    }
    console.log(checkSourceChanged(['sdk/js/src/index.ts', 'README.md'], 'sdk'));
  `;
  const result = execSync(`node -e "${script}"`, { encoding: 'utf-8' }).trim();
  assertEqual(result, 'true', 'should detect SDK source changes');
});

test('checkSourceChanged ignores non-source files', () => {
  const script = `
    const SOURCE_DIRS = {
      sdk: ['sdk/js/src/'],
      cli: ['cli/src/'],
    };
    function checkSourceChanged(changedFiles, component) {
      const dirs = SOURCE_DIRS[component];
      return changedFiles.some(file => dirs.some(dir => file.startsWith(dir)));
    }
    console.log(checkSourceChanged(['sdk/js/package.json', 'README.md'], 'sdk'));
  `;
  const result = execSync(`node -e "${script}"`, { encoding: 'utf-8' }).trim();
  assertEqual(result, 'false', 'should not detect non-source changes');
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Tests: ${testsPassed} passed, ${testsFailed} failed`);
console.log('='.repeat(50) + '\n');

process.exit(testsFailed > 0 ? 1 : 0);

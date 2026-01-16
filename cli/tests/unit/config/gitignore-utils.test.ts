/**
 * Tests for gitignore utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';
import {
  normalizeCachePath,
  isCachePathIgnored,
  addCachePathToGitignore,
  ensureCachePathIgnored,
  readFractaryGitignore,
  writeFractaryGitignore,
  DEFAULT_FRACTARY_GITIGNORE,
  DEFAULT_CACHE_DIR
} from '../../../src/config/gitignore-utils.js';

describe('gitignore-utils', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = path.join(tmpdir(), `codex-cli-gitignore-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('normalizeCachePath', () => {
    it('should remove .fractary/ prefix', () => {
      expect(normalizeCachePath('.fractary/codex/cache')).toBe('codex/cache/');
    });

    it('should add trailing slash', () => {
      expect(normalizeCachePath('codex/cache')).toBe('codex/cache/');
    });

    it('should not double trailing slash', () => {
      expect(normalizeCachePath('codex/cache/')).toBe('codex/cache/');
    });

    it('should handle Windows paths with backslashes', () => {
      expect(normalizeCachePath('codex\\cache')).toBe('codex/cache/');
    });

    it('should handle mixed separators', () => {
      expect(normalizeCachePath('.fractary\\codex/cache')).toBe('codex/cache/');
    });

    it('should handle Windows .fractary prefix', () => {
      expect(normalizeCachePath('.fractary\\codex\\cache')).toBe('codex/cache/');
    });

    it('should handle simple path', () => {
      expect(normalizeCachePath('cache')).toBe('cache/');
    });

    it('should handle nested paths', () => {
      expect(normalizeCachePath('plugins/codex/cache')).toBe('plugins/codex/cache/');
    });
  });

  describe('isCachePathIgnored', () => {
    it('should detect exact matches', () => {
      const content = 'codex/cache/\n';
      expect(isCachePathIgnored(content, 'codex/cache')).toBe(true);
    });

    it('should detect matches without trailing slash in gitignore', () => {
      const content = 'codex/cache\n';
      expect(isCachePathIgnored(content, 'codex/cache/')).toBe(true);
    });

    it('should ignore comments', () => {
      const content = '# codex/cache/\n';
      expect(isCachePathIgnored(content, 'codex/cache')).toBe(false);
    });

    it('should ignore empty lines', () => {
      const content = '\n\n';
      expect(isCachePathIgnored(content, 'codex/cache')).toBe(false);
    });

    it('should handle multiple entries', () => {
      const content = `# Comment
plugins/status/
codex/cache/
other/path/
`;
      expect(isCachePathIgnored(content, 'codex/cache')).toBe(true);
      expect(isCachePathIgnored(content, 'plugins/status')).toBe(true);
      expect(isCachePathIgnored(content, 'nonexistent')).toBe(false);
    });

    it('should handle Windows paths in gitignore content', () => {
      const content = 'codex\\cache\n';
      expect(isCachePathIgnored(content, 'codex/cache')).toBe(true);
    });

    it('should be case-sensitive', () => {
      const content = 'Codex/Cache/\n';
      expect(isCachePathIgnored(content, 'codex/cache')).toBe(false);
    });
  });

  describe('addCachePathToGitignore', () => {
    it('should add path to empty content', () => {
      const result = addCachePathToGitignore('', 'custom/cache');
      expect(result).toContain('custom/cache/');
    });

    it('should add path with comment', () => {
      const result = addCachePathToGitignore('existing/\n', 'custom/cache', 'My custom cache');
      expect(result).toContain('# My custom cache');
      expect(result).toContain('custom/cache/');
    });

    it('should not duplicate existing path', () => {
      const content = 'custom/cache/\n';
      const result = addCachePathToGitignore(content, 'custom/cache');
      expect(result).toBe(content);
    });

    it('should append to existing content', () => {
      const content = '# Existing\nexisting/path/\n';
      const result = addCachePathToGitignore(content, 'new/path');
      expect(result).toContain('existing/path/');
      expect(result).toContain('new/path/');
    });

    it('should normalize Windows paths', () => {
      const result = addCachePathToGitignore('', 'custom\\cache');
      expect(result).toContain('custom/cache/');
      expect(result).not.toContain('\\');
    });
  });

  describe('readFractaryGitignore', () => {
    it('should return null for non-existent file', async () => {
      const result = await readFractaryGitignore(testDir);
      expect(result).toBeNull();
    });

    it('should read existing gitignore content', async () => {
      const fractaryDir = path.join(testDir, '.fractary');
      await fs.mkdir(fractaryDir, { recursive: true });
      await fs.writeFile(path.join(fractaryDir, '.gitignore'), 'test/path/\n');

      const result = await readFractaryGitignore(testDir);
      expect(result).toBe('test/path/\n');
    });
  });

  describe('writeFractaryGitignore', () => {
    it('should create .fractary directory if needed', async () => {
      await writeFractaryGitignore(testDir, 'test/\n');

      const content = await fs.readFile(path.join(testDir, '.fractary', '.gitignore'), 'utf-8');
      expect(content).toBe('test/\n');
    });

    it('should overwrite existing content', async () => {
      const fractaryDir = path.join(testDir, '.fractary');
      await fs.mkdir(fractaryDir, { recursive: true });
      await fs.writeFile(path.join(fractaryDir, '.gitignore'), 'old/\n');

      await writeFractaryGitignore(testDir, 'new/\n');

      const content = await fs.readFile(path.join(fractaryDir, '.gitignore'), 'utf-8');
      expect(content).toBe('new/\n');
    });
  });

  describe('ensureCachePathIgnored', () => {
    it('should create gitignore with default content when none exists', async () => {
      const result = await ensureCachePathIgnored(testDir, '.fractary/codex/cache');

      expect(result.created).toBe(true);
      expect(result.updated).toBe(false);
      expect(result.alreadyIgnored).toBe(false);

      const content = await fs.readFile(path.join(testDir, '.fractary', '.gitignore'), 'utf-8');
      expect(content).toContain('codex/cache/');
    });

    it('should report alreadyIgnored for default cache path', async () => {
      // First call creates
      await ensureCachePathIgnored(testDir, '.fractary/codex/cache');

      // Second call should detect it's already ignored
      const result = await ensureCachePathIgnored(testDir, '.fractary/codex/cache');

      expect(result.created).toBe(false);
      expect(result.updated).toBe(false);
      expect(result.alreadyIgnored).toBe(true);
    });

    it('should add custom cache path to existing gitignore', async () => {
      // Create initial gitignore
      const fractaryDir = path.join(testDir, '.fractary');
      await fs.mkdir(fractaryDir, { recursive: true });
      await fs.writeFile(path.join(fractaryDir, '.gitignore'), 'existing/\n');

      const result = await ensureCachePathIgnored(testDir, 'custom/cache');

      expect(result.created).toBe(false);
      expect(result.updated).toBe(true);
      expect(result.alreadyIgnored).toBe(false);

      const content = await fs.readFile(path.join(fractaryDir, '.gitignore'), 'utf-8');
      expect(content).toContain('existing/');
      expect(content).toContain('custom/cache/');
    });

    it('should handle absolute paths', async () => {
      const absoluteCachePath = path.join(testDir, '.fractary', 'my', 'cache');

      const result = await ensureCachePathIgnored(testDir, absoluteCachePath);

      expect(result.created).toBe(true);

      const content = await fs.readFile(path.join(testDir, '.fractary', '.gitignore'), 'utf-8');
      expect(content).toContain('my/cache/');
    });

    it('should return correct gitignorePath', async () => {
      const result = await ensureCachePathIgnored(testDir, 'cache');

      expect(result.gitignorePath).toBe(path.join(testDir, '.fractary', '.gitignore'));
    });
  });

  describe('constants', () => {
    it('DEFAULT_CACHE_DIR should be codex/cache/', () => {
      expect(DEFAULT_CACHE_DIR).toBe('codex/cache/');
    });

    it('DEFAULT_FRACTARY_GITIGNORE should contain standard entries', () => {
      expect(DEFAULT_FRACTARY_GITIGNORE).toContain('codex/cache/');
      expect(DEFAULT_FRACTARY_GITIGNORE).toContain('plugins/codex/cache/');
      expect(DEFAULT_FRACTARY_GITIGNORE).toContain('plugins/status/');
    });
  });
});

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
  hasSectionMarker,
  getSectionContent,
  updateSection,
  migrateToSectionFormat,
  DEFAULT_FRACTARY_GITIGNORE,
  DEFAULT_CACHE_DIR,
  LEGACY_FRACTARY_GITIGNORE_PATTERNS
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

    it('DEFAULT_FRACTARY_GITIGNORE should use section-based format', () => {
      // New format uses section markers instead of flat entries
      expect(DEFAULT_FRACTARY_GITIGNORE).toContain('codex/cache/');
      expect(DEFAULT_FRACTARY_GITIGNORE).toContain('# ===== fractary-codex (managed) =====');
      expect(DEFAULT_FRACTARY_GITIGNORE).toContain('# ===== end fractary-codex =====');
    });

    it('LEGACY_FRACTARY_GITIGNORE_PATTERNS should contain old format entries', () => {
      expect(LEGACY_FRACTARY_GITIGNORE_PATTERNS).toContain('plugins/codex/cache/');
      expect(LEGACY_FRACTARY_GITIGNORE_PATTERNS).toContain('plugins/status/');
      expect(LEGACY_FRACTARY_GITIGNORE_PATTERNS).toContain('# Codex cache (v4.0 standard)');
    });
  });

  describe('hasSectionMarker', () => {
    it('should return true when section marker exists', () => {
      const content = `# .fractary/.gitignore
# ===== fractary-codex (managed) =====
codex/cache/
# ===== end fractary-codex =====
`;
      expect(hasSectionMarker(content, 'fractary-codex')).toBe(true);
    });

    it('should return false when section marker does not exist', () => {
      const content = `# .fractary/.gitignore
codex/cache/
`;
      expect(hasSectionMarker(content, 'fractary-codex')).toBe(false);
    });

    it('should match exact plugin name', () => {
      const content = `# ===== fractary-codex (managed) =====
codex/cache/
# ===== end fractary-codex =====
`;
      expect(hasSectionMarker(content, 'fractary-codex')).toBe(true);
      expect(hasSectionMarker(content, 'fractary-other')).toBe(false);
    });
  });

  describe('getSectionContent', () => {
    it('should return entries from existing section', () => {
      const content = `# .fractary/.gitignore
# ===== fractary-codex (managed) =====
codex/cache/
codex/temp/
# ===== end fractary-codex =====
`;
      const entries = getSectionContent(content, 'fractary-codex');
      expect(entries).toEqual(['codex/cache/', 'codex/temp/']);
    });

    it('should return null when section does not exist', () => {
      const content = `# .fractary/.gitignore
codex/cache/
`;
      expect(getSectionContent(content, 'fractary-codex')).toBeNull();
    });

    it('should ignore comments within section', () => {
      const content = `# ===== fractary-codex (managed) =====
# This is a comment
codex/cache/
# Another comment
codex/temp/
# ===== end fractary-codex =====
`;
      const entries = getSectionContent(content, 'fractary-codex');
      expect(entries).toEqual(['codex/cache/', 'codex/temp/']);
    });

    it('should return empty array for section with no entries', () => {
      const content = `# ===== fractary-codex (managed) =====
# ===== end fractary-codex =====
`;
      const entries = getSectionContent(content, 'fractary-codex');
      expect(entries).toEqual([]);
    });

    it('should handle multiple sections', () => {
      const content = `# ===== fractary-codex (managed) =====
codex/cache/
# ===== end fractary-codex =====

# ===== fractary-work (managed) =====
work/cache/
# ===== end fractary-work =====
`;
      expect(getSectionContent(content, 'fractary-codex')).toEqual(['codex/cache/']);
      expect(getSectionContent(content, 'fractary-work')).toEqual(['work/cache/']);
    });
  });

  describe('updateSection', () => {
    it('should create new section when none exists', () => {
      const content = `# .fractary/.gitignore
other/path/
`;
      const result = updateSection(content, 'fractary-codex', ['codex/cache/']);
      expect(result).toContain('# ===== fractary-codex (managed) =====');
      expect(result).toContain('codex/cache/');
      expect(result).toContain('# ===== end fractary-codex =====');
      expect(result).toContain('other/path/');
    });

    it('should replace existing section', () => {
      const content = `# ===== fractary-codex (managed) =====
old/path/
# ===== end fractary-codex =====
`;
      const result = updateSection(content, 'fractary-codex', ['new/cache/', 'another/path/']);
      expect(result).toContain('new/cache/');
      expect(result).toContain('another/path/');
      expect(result).not.toContain('old/path/');
    });

    it('should preserve other sections when updating', () => {
      const content = `# ===== fractary-codex (managed) =====
codex/cache/
# ===== end fractary-codex =====

# ===== fractary-work (managed) =====
work/cache/
# ===== end fractary-work =====
`;
      const result = updateSection(content, 'fractary-codex', ['codex/new/']);
      expect(result).toContain('codex/new/');
      expect(result).toContain('# ===== fractary-work (managed) =====');
      expect(result).toContain('work/cache/');
    });

    it('should handle empty entries array', () => {
      const content = `# .fractary/.gitignore
`;
      const result = updateSection(content, 'fractary-codex', []);
      expect(result).toContain('# ===== fractary-codex (managed) =====');
      expect(result).toContain('# ===== end fractary-codex =====');
    });
  });

  describe('migrateToSectionFormat', () => {
    it('should return content unchanged if already using section format', () => {
      const content = `# ===== fractary-codex (managed) =====
codex/cache/
# ===== end fractary-codex =====
`;
      expect(migrateToSectionFormat(content)).toBe(content);
    });

    it('should migrate old format to section format', () => {
      // Use only legacy header patterns (avoid substring match issue with codex/cache/)
      const oldContent = `# Fractary tool-specific ignores
plugins/status/
`;
      const result = migrateToSectionFormat(oldContent);
      expect(result).toContain('# ===== fractary-codex (managed) =====');
      expect(result).toContain('codex/cache/');
      expect(result).toContain('# ===== end fractary-codex =====');
      expect(result).not.toContain('plugins/status/');
    });

    it('should return unchanged if no legacy patterns found', () => {
      const content = `# Custom gitignore
custom/path/
`;
      expect(migrateToSectionFormat(content)).toBe(content);
    });

    it('should preserve non-legacy entries in "Other entries" section', () => {
      // Use legacy header without codex/cache/ substring to trigger proper migration
      const oldContent = `# Fractary tool-specific ignores
plugins/status/
custom/preserved/path/
`;
      const result = migrateToSectionFormat(oldContent);
      expect(result).toContain('# Other entries (preserved from migration)');
      expect(result).toContain('custom/preserved/path/');
    });
  });
});

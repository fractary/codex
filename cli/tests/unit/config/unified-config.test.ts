/**
 * Tests for unified configuration utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getDefaultUnifiedConfig,
  mergeUnifiedConfigs,
  CodexPluginConfig,
  UnifiedConfig
} from '../../../src/config/unified-config.js';

describe('unified-config', () => {
  describe('getDefaultUnifiedConfig', () => {
    it('should create config with all required fields', () => {
      const config = getDefaultUnifiedConfig('myorg', 'myproject', 'codex.myorg.com');

      expect(config.codex).toBeDefined();
      expect(config.codex?.schema_version).toBe('2.0');
      expect(config.codex?.organization).toBe('myorg');
      expect(config.codex?.project).toBe('myproject');
      expect(config.codex?.codex_repo).toBe('codex.myorg.com');
      // Default config includes the codex repo with GITHUB_TOKEN
      expect(config.codex?.remotes).toEqual({
        'myorg/codex.myorg.com': { token: '${GITHUB_TOKEN}' }
      });
    });

    it('should include file plugin configuration', () => {
      const config = getDefaultUnifiedConfig('org', 'proj', 'codex.org.com');

      expect(config.file).toBeDefined();
      expect(config.file?.schema_version).toBe('2.0');
      expect(config.file?.sources).toBeDefined();
      expect(config.file?.sources.specs).toBeDefined();
      expect(config.file?.sources.logs).toBeDefined();
    });

    it('should sanitize project name for S3 bucket naming', () => {
      const config = getDefaultUnifiedConfig('org', 'My.Project_Name', 'codex.org.com');

      // S3 bucket names should be lowercase with safe characters
      expect(config.file?.sources.specs.bucket).toBe('my-project-name-files');
    });

    it('should handle special characters in project name', () => {
      const config = getDefaultUnifiedConfig('org', 'project@2.0!test', 'codex.org.com');

      // Special characters should be replaced with hyphens
      expect(config.file?.sources.specs.bucket).toMatch(/^[a-z0-9-]+$/);
    });
  });

  describe('mergeUnifiedConfigs', () => {
    it('should merge codex_repo from updates', () => {
      const existing: UnifiedConfig = {
        codex: {
          schema_version: '2.0',
          organization: 'org1',
          project: 'proj1',
          codex_repo: '',
          remotes: {}
        }
      };

      const updates: UnifiedConfig = {
        codex: {
          schema_version: '2.0',
          organization: 'org2',
          project: 'proj2',
          codex_repo: 'codex.org2.com',
          remotes: {}
        }
      };

      const merged = mergeUnifiedConfigs(existing, updates);

      expect(merged.codex?.codex_repo).toBe('codex.org2.com');
    });

    it('should preserve existing codex_repo if updates is empty', () => {
      const existing: UnifiedConfig = {
        codex: {
          schema_version: '2.0',
          organization: 'org',
          project: 'proj',
          codex_repo: 'codex.existing.com',
          remotes: {}
        }
      };

      const updates: UnifiedConfig = {
        codex: {
          schema_version: '2.0',
          organization: 'org',
          project: 'proj',
          codex_repo: '',
          remotes: {}
        }
      };

      const merged = mergeUnifiedConfigs(existing, updates);

      expect(merged.codex?.codex_repo).toBe('codex.existing.com');
    });

    it('should merge remotes from both configs', () => {
      const existing: UnifiedConfig = {
        codex: {
          schema_version: '2.0',
          organization: 'org',
          project: 'proj',
          codex_repo: 'codex.org.com',
          remotes: { 'org/repo1': { token: '${TOKEN1}' } }
        }
      };

      const updates: UnifiedConfig = {
        codex: {
          schema_version: '2.0',
          organization: 'org',
          project: 'proj',
          codex_repo: 'codex.org.com',
          remotes: { 'org/repo2': { token: '${TOKEN2}' } }
        }
      };

      const merged = mergeUnifiedConfigs(existing, updates);

      expect(merged.codex?.remotes).toEqual({
        'org/repo1': { token: '${TOKEN1}' },
        'org/repo2': { token: '${TOKEN2}' }
      });
    });

    it('should prefer updates organization over existing', () => {
      const existing: UnifiedConfig = {
        codex: {
          schema_version: '2.0',
          organization: 'oldorg',
          project: 'proj',
          codex_repo: 'codex.org.com',
          remotes: {}
        }
      };

      const updates: UnifiedConfig = {
        codex: {
          schema_version: '2.0',
          organization: 'neworg',
          project: 'proj',
          codex_repo: 'codex.org.com',
          remotes: {}
        }
      };

      const merged = mergeUnifiedConfigs(existing, updates);

      expect(merged.codex?.organization).toBe('neworg');
    });

    it('should merge file sources from both configs', () => {
      const existing: UnifiedConfig = {
        file: {
          schema_version: '2.0',
          sources: {
            specs: {
              type: 's3',
              bucket: 'existing-bucket',
              local: { base_path: '.fractary/specs' }
            }
          }
        }
      };

      const updates: UnifiedConfig = {
        file: {
          schema_version: '2.0',
          sources: {
            logs: {
              type: 's3',
              bucket: 'new-bucket',
              local: { base_path: '.fractary/logs' }
            }
          }
        }
      };

      const merged = mergeUnifiedConfigs(existing, updates);

      expect(merged.file?.sources.specs).toBeDefined();
      expect(merged.file?.sources.logs).toBeDefined();
    });
  });
});

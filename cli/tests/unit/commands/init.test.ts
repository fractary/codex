/**
 * Tests for init command utilities
 *
 * Tests input validation and security measures for the config init command.
 */

import { describe, it, expect } from 'vitest';
import {
  validateNameFormat,
  discoverCodexRepo,
  DiscoverCodexRepoResult
} from '../../../src/commands/config/init.js';

describe('init command', () => {
  describe('validateNameFormat', () => {
    describe('valid names', () => {
      it('should accept simple alphanumeric names', () => {
        expect(() => validateNameFormat('fractary', 'organization')).not.toThrow();
        expect(() => validateNameFormat('myorg123', 'organization')).not.toThrow();
      });

      it('should accept names with hyphens', () => {
        expect(() => validateNameFormat('my-org', 'organization')).not.toThrow();
        expect(() => validateNameFormat('my-project-name', 'repository')).not.toThrow();
      });

      it('should accept names with underscores', () => {
        expect(() => validateNameFormat('my_org', 'organization')).not.toThrow();
        expect(() => validateNameFormat('my_project', 'repository')).not.toThrow();
      });

      it('should accept names with dots', () => {
        expect(() => validateNameFormat('codex.fractary.com', 'repository')).not.toThrow();
        expect(() => validateNameFormat('my.org.name', 'organization')).not.toThrow();
      });

      it('should accept mixed valid characters', () => {
        expect(() => validateNameFormat('my-org_v2.0', 'organization')).not.toThrow();
        expect(() => validateNameFormat('project-2024_v1.2', 'repository')).not.toThrow();
      });

      it('should accept uppercase letters', () => {
        expect(() => validateNameFormat('MyOrg', 'organization')).not.toThrow();
        expect(() => validateNameFormat('MyProject', 'repository')).not.toThrow();
      });
    });

    describe('invalid names - command injection prevention', () => {
      it('should reject names with semicolons (command separator)', () => {
        expect(() => validateNameFormat('org; rm -rf /', 'organization')).toThrow(/Invalid.*format/);
        expect(() => validateNameFormat('repo;echo hack', 'repository')).toThrow(/Invalid.*format/);
      });

      it('should reject names with backticks (command substitution)', () => {
        expect(() => validateNameFormat('org`whoami`', 'organization')).toThrow(/Invalid.*format/);
        expect(() => validateNameFormat('`id`', 'repository')).toThrow(/Invalid.*format/);
      });

      it('should reject names with $() (command substitution)', () => {
        expect(() => validateNameFormat('$(whoami)', 'organization')).toThrow(/Invalid.*format/);
        expect(() => validateNameFormat('org$(cat /etc/passwd)', 'repository')).toThrow(/Invalid.*format/);
      });

      it('should reject names with pipes', () => {
        expect(() => validateNameFormat('org|cat', 'organization')).toThrow(/Invalid.*format/);
        expect(() => validateNameFormat('repo | rm', 'repository')).toThrow(/Invalid.*format/);
      });

      it('should reject names with ampersands', () => {
        expect(() => validateNameFormat('org&echo hack', 'organization')).toThrow(/Invalid.*format/);
        expect(() => validateNameFormat('repo&&id', 'repository')).toThrow(/Invalid.*format/);
      });

      it('should reject names with quotes', () => {
        expect(() => validateNameFormat("org'test", 'organization')).toThrow(/Invalid.*format/);
        expect(() => validateNameFormat('repo"test', 'repository')).toThrow(/Invalid.*format/);
      });

      it('should reject names with angle brackets', () => {
        expect(() => validateNameFormat('org<file', 'organization')).toThrow(/Invalid.*format/);
        expect(() => validateNameFormat('repo>output', 'repository')).toThrow(/Invalid.*format/);
      });

      it('should reject names with spaces', () => {
        expect(() => validateNameFormat('my org', 'organization')).toThrow(/Invalid.*format/);
        expect(() => validateNameFormat('my repo', 'repository')).toThrow(/Invalid.*format/);
      });

      it('should reject names with newlines', () => {
        expect(() => validateNameFormat('org\necho hack', 'organization')).toThrow(/Invalid.*format/);
        expect(() => validateNameFormat('repo\r\ncommand', 'repository')).toThrow(/Invalid.*format/);
      });

      it('should reject names with null bytes', () => {
        expect(() => validateNameFormat('org\x00extra', 'organization')).toThrow(/Invalid.*format/);
      });
    });

    describe('invalid names - format requirements', () => {
      it('should reject empty names', () => {
        expect(() => validateNameFormat('', 'organization')).toThrow(/required/);
      });

      it('should reject names starting with non-alphanumeric', () => {
        expect(() => validateNameFormat('-startwithhyphen', 'organization')).toThrow(/Invalid.*format/);
        expect(() => validateNameFormat('.startwithperiod', 'repository')).toThrow(/Invalid.*format/);
        expect(() => validateNameFormat('_startwithunderscore', 'organization')).toThrow(/Invalid.*format/);
      });

      it('should reject names over 100 characters', () => {
        const longName = 'a'.repeat(101);
        expect(() => validateNameFormat(longName, 'organization')).toThrow(/too long/);
      });

      it('should accept names exactly 100 characters', () => {
        const maxName = 'a'.repeat(100);
        expect(() => validateNameFormat(maxName, 'organization')).not.toThrow();
      });

      it('should reject non-string inputs', () => {
        expect(() => validateNameFormat(null as any, 'organization')).toThrow(/required/);
        expect(() => validateNameFormat(undefined as any, 'organization')).toThrow(/required/);
        expect(() => validateNameFormat(123 as any, 'organization')).toThrow(/required/);
      });
    });

    describe('error messages', () => {
      it('should include the type in error message', () => {
        expect(() => validateNameFormat('bad;name', 'organization')).toThrow(/organization/);
        expect(() => validateNameFormat('bad;name', 'repository')).toThrow(/repository/);
      });

      it('should include the invalid name in error message', () => {
        expect(() => validateNameFormat('my bad name', 'organization')).toThrow(/my bad name/);
      });
    });
  });

  describe('discoverCodexRepo', () => {
    // Note: These tests verify the validation logic within discoverCodexRepo
    // The actual shell command execution would require mocking which adds complexity
    // The key security validation is tested via validateNameFormat tests above

    it('should reject invalid organization names', async () => {
      const result = await discoverCodexRepo('org; rm -rf /');

      expect(result.repo).toBeNull();
      expect(result.error).toBe('unknown');
      expect(result.message).toMatch(/Invalid.*format/);
    });

    it('should reject organization names with shell metacharacters', async () => {
      const maliciousInputs = [
        '$(whoami)',
        '`id`',
        'org|cat',
        'org&&echo',
        'org; echo',
        'org\ntest'
      ];

      for (const input of maliciousInputs) {
        const result = await discoverCodexRepo(input);
        expect(result.repo).toBeNull();
        expect(result.error).toBe('unknown');
        expect(result.message).toMatch(/Invalid.*format/);
      }
    });

    // Integration tests for actual gh CLI would go here
    // but require mocking execSync which adds significant complexity
    // The function structure ensures validation happens before shell execution
  });
});

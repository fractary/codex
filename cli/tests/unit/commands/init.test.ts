/**
 * Tests for init command utilities
 *
 * Tests input validation and security measures for the config init command.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  validateNameFormat,
  discoverCodexRepo,
  installMcpServer,
} from '@fractary/codex';

describe('init command', () => {
  describe('validateNameFormat', () => {
    describe('valid names', () => {
      it('should accept simple alphanumeric names', () => {
        expect(validateNameFormat('fractary', 'organization').valid).toBe(true);
        expect(validateNameFormat('myorg123', 'organization').valid).toBe(true);
      });

      it('should accept names with hyphens', () => {
        expect(validateNameFormat('my-org', 'organization').valid).toBe(true);
        expect(validateNameFormat('my-project-name', 'repository').valid).toBe(true);
      });

      it('should accept names with underscores', () => {
        expect(validateNameFormat('my_org', 'organization').valid).toBe(true);
        expect(validateNameFormat('my_project', 'repository').valid).toBe(true);
      });

      it('should accept names with dots', () => {
        expect(validateNameFormat('codex.fractary.com', 'repository').valid).toBe(true);
        expect(validateNameFormat('my.org.name', 'organization').valid).toBe(true);
      });

      it('should accept mixed valid characters', () => {
        expect(validateNameFormat('my-org_v2.0', 'organization').valid).toBe(true);
        expect(validateNameFormat('project-2024_v1.2', 'repository').valid).toBe(true);
      });

      it('should accept uppercase letters', () => {
        expect(validateNameFormat('MyOrg', 'organization').valid).toBe(true);
        expect(validateNameFormat('MyProject', 'repository').valid).toBe(true);
      });
    });

    describe('invalid names - command injection prevention', () => {
      it('should reject names with semicolons (command separator)', () => {
        const r1 = validateNameFormat('org; rm -rf /', 'organization');
        expect(r1.valid).toBe(false);
        expect(r1.error).toMatch(/Invalid.*format/);
        const r2 = validateNameFormat('repo;echo hack', 'repository');
        expect(r2.valid).toBe(false);
        expect(r2.error).toMatch(/Invalid.*format/);
      });

      it('should reject names with backticks (command substitution)', () => {
        const r1 = validateNameFormat('org`whoami`', 'organization');
        expect(r1.valid).toBe(false);
        expect(r1.error).toMatch(/Invalid.*format/);
        const r2 = validateNameFormat('`id`', 'repository');
        expect(r2.valid).toBe(false);
        expect(r2.error).toMatch(/Invalid.*format/);
      });

      it('should reject names with $() (command substitution)', () => {
        const r1 = validateNameFormat('$(whoami)', 'organization');
        expect(r1.valid).toBe(false);
        expect(r1.error).toMatch(/Invalid.*format/);
        const r2 = validateNameFormat('org$(cat /etc/passwd)', 'repository');
        expect(r2.valid).toBe(false);
        expect(r2.error).toMatch(/Invalid.*format/);
      });

      it('should reject names with pipes', () => {
        const r1 = validateNameFormat('org|cat', 'organization');
        expect(r1.valid).toBe(false);
        expect(r1.error).toMatch(/Invalid.*format/);
        const r2 = validateNameFormat('repo | rm', 'repository');
        expect(r2.valid).toBe(false);
        expect(r2.error).toMatch(/Invalid.*format/);
      });

      it('should reject names with ampersands', () => {
        const r1 = validateNameFormat('org&echo hack', 'organization');
        expect(r1.valid).toBe(false);
        expect(r1.error).toMatch(/Invalid.*format/);
        const r2 = validateNameFormat('repo&&id', 'repository');
        expect(r2.valid).toBe(false);
        expect(r2.error).toMatch(/Invalid.*format/);
      });

      it('should reject names with quotes', () => {
        const r1 = validateNameFormat("org'test", 'organization');
        expect(r1.valid).toBe(false);
        expect(r1.error).toMatch(/Invalid.*format/);
        const r2 = validateNameFormat('repo"test', 'repository');
        expect(r2.valid).toBe(false);
        expect(r2.error).toMatch(/Invalid.*format/);
      });

      it('should reject names with angle brackets', () => {
        const r1 = validateNameFormat('org<file', 'organization');
        expect(r1.valid).toBe(false);
        expect(r1.error).toMatch(/Invalid.*format/);
        const r2 = validateNameFormat('repo>output', 'repository');
        expect(r2.valid).toBe(false);
        expect(r2.error).toMatch(/Invalid.*format/);
      });

      it('should reject names with spaces', () => {
        const r1 = validateNameFormat('my org', 'organization');
        expect(r1.valid).toBe(false);
        expect(r1.error).toMatch(/Invalid.*format/);
        const r2 = validateNameFormat('my repo', 'repository');
        expect(r2.valid).toBe(false);
        expect(r2.error).toMatch(/Invalid.*format/);
      });

      it('should reject names with newlines', () => {
        const r1 = validateNameFormat('org\necho hack', 'organization');
        expect(r1.valid).toBe(false);
        expect(r1.error).toMatch(/Invalid.*format/);
        const r2 = validateNameFormat('repo\r\ncommand', 'repository');
        expect(r2.valid).toBe(false);
        expect(r2.error).toMatch(/Invalid.*format/);
      });

      it('should reject names with null bytes', () => {
        const r1 = validateNameFormat('org\x00extra', 'organization');
        expect(r1.valid).toBe(false);
        expect(r1.error).toMatch(/Invalid.*format/);
      });
    });

    describe('invalid names - format requirements', () => {
      it('should reject empty names', () => {
        const result = validateNameFormat('', 'organization');
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/required/);
      });

      it('should reject names starting with non-alphanumeric', () => {
        expect(validateNameFormat('-startwithhyphen', 'organization').valid).toBe(false);
        expect(validateNameFormat('-startwithhyphen', 'organization').error).toMatch(/Invalid.*format/);
        expect(validateNameFormat('.startwithperiod', 'repository').valid).toBe(false);
        expect(validateNameFormat('_startwithunderscore', 'organization').valid).toBe(false);
      });

      it('should reject names over 100 characters', () => {
        const longName = 'a'.repeat(101);
        const result = validateNameFormat(longName, 'organization');
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/too long/);
      });

      it('should accept names exactly 100 characters', () => {
        const maxName = 'a'.repeat(100);
        expect(validateNameFormat(maxName, 'organization').valid).toBe(true);
      });

      it('should reject non-string inputs', () => {
        expect(validateNameFormat(null as any, 'organization').valid).toBe(false);
        expect(validateNameFormat(null as any, 'organization').error).toMatch(/required/);
        expect(validateNameFormat(undefined as any, 'organization').valid).toBe(false);
        expect(validateNameFormat(123 as any, 'organization').valid).toBe(false);
      });
    });

    describe('error messages', () => {
      it('should include the type in error message', () => {
        expect(validateNameFormat('bad;name', 'organization').error).toMatch(/organization/);
        expect(validateNameFormat('bad;name', 'repository').error).toMatch(/repository/);
      });

      it('should include the invalid name in error message', () => {
        expect(validateNameFormat('my bad name', 'organization').error).toMatch(/my bad name/);
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

  describe('installMcpServer', () => {
    let tempDir: string;

    beforeEach(async () => {
      // Create a temporary directory for each test
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-test-'));
    });

    afterEach(async () => {
      // Clean up temporary directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    describe('fresh installation', () => {
      it('should create .mcp.json with correct configuration', async () => {
        const result = await installMcpServer(tempDir);

        expect(result.installed).toBe(true);
        expect(result.migrated).toBe(false);
        expect(result.alreadyInstalled).toBe(false);

        // Verify file was created
        const content = await fs.readFile(path.join(tempDir, '.mcp.json'), 'utf-8');
        const config = JSON.parse(content);

        expect(config.mcpServers['fractary-codex']).toEqual({
          command: 'npx',
          args: ['-y', '@fractary/codex-mcp', '--config', '.fractary/config.yaml']
        });
      });

      it('should use custom config path when provided', async () => {
        const customPath = 'custom/path/config.yaml';
        const result = await installMcpServer(tempDir, customPath);

        expect(result.installed).toBe(true);

        const content = await fs.readFile(path.join(tempDir, '.mcp.json'), 'utf-8');
        const config = JSON.parse(content);

        expect(config.mcpServers['fractary-codex'].args).toContain(customPath);
      });
    });

    describe('already installed', () => {
      it('should detect existing correct configuration', async () => {
        // Create existing correct config
        const existingConfig = {
          mcpServers: {
            'fractary-codex': {
              command: 'npx',
              args: ['-y', '@fractary/codex-mcp', '--config', '.fractary/config.yaml']
            }
          }
        };
        await fs.writeFile(
          path.join(tempDir, '.mcp.json'),
          JSON.stringify(existingConfig, null, 2)
        );

        const result = await installMcpServer(tempDir);

        expect(result.alreadyInstalled).toBe(true);
        expect(result.installed).toBe(false);
        expect(result.migrated).toBe(false);
      });
    });

    describe('migration from old formats', () => {
      it('should migrate from node command format', async () => {
        // Old format with node command
        const oldConfig = {
          mcpServers: {
            'fractary-codex': {
              command: 'node',
              args: ['plugins/codex/mcp-server/dist/cli.js']
            }
          }
        };
        await fs.writeFile(
          path.join(tempDir, '.mcp.json'),
          JSON.stringify(oldConfig, null, 2)
        );

        const result = await installMcpServer(tempDir);

        expect(result.installed).toBe(true);
        expect(result.migrated).toBe(true);
        expect(result.alreadyInstalled).toBe(false);

        // Verify migration
        const content = await fs.readFile(path.join(tempDir, '.mcp.json'), 'utf-8');
        const config = JSON.parse(content);
        expect(config.mcpServers['fractary-codex'].command).toBe('npx');
        expect(config.mcpServers['fractary-codex'].args).toContain('@fractary/codex-mcp');
      });

      it('should migrate from @fractary/codex package format', async () => {
        // Old format with @fractary/codex (SDK-embedded)
        const oldConfig = {
          mcpServers: {
            'fractary-codex': {
              command: 'npx',
              args: ['@fractary/codex', 'mcp', '--config', '.fractary/config.yaml']
            }
          }
        };
        await fs.writeFile(
          path.join(tempDir, '.mcp.json'),
          JSON.stringify(oldConfig, null, 2)
        );

        const result = await installMcpServer(tempDir);

        expect(result.installed).toBe(true);
        expect(result.migrated).toBe(true);

        // Verify migration to new package
        const content = await fs.readFile(path.join(tempDir, '.mcp.json'), 'utf-8');
        const config = JSON.parse(content);
        expect(config.mcpServers['fractary-codex'].args).toContain('@fractary/codex-mcp');
        expect(config.mcpServers['fractary-codex'].args).not.toContain('@fractary/codex');
      });
    });

    describe('backup creation', () => {
      it('should create backup by default', async () => {
        // Create existing config
        const existingConfig = {
          mcpServers: {
            'other-server': { command: 'test' }
          }
        };
        await fs.writeFile(
          path.join(tempDir, '.mcp.json'),
          JSON.stringify(existingConfig, null, 2)
        );

        const result = await installMcpServer(tempDir);

        expect(result.backupPath).toBeDefined();
        expect(result.backupPath).toContain('.mcp.json.backup.');

        // Verify backup exists
        const backupContent = await fs.readFile(result.backupPath!, 'utf-8');
        const backupConfig = JSON.parse(backupContent);
        expect(backupConfig.mcpServers['other-server']).toBeDefined();
      });

      it('should skip backup when disabled', async () => {
        const existingConfig = { mcpServers: {} };
        await fs.writeFile(
          path.join(tempDir, '.mcp.json'),
          JSON.stringify(existingConfig, null, 2)
        );

        const result = await installMcpServer(tempDir, '.fractary/config.yaml', { backup: false });

        expect(result.backupPath).toBeUndefined();
      });
    });

    describe('preserving other MCP servers', () => {
      it('should preserve other MCP server configurations', async () => {
        // Create config with other servers
        const existingConfig = {
          mcpServers: {
            'context7': {
              command: 'npx',
              args: ['-y', '@context7/mcp-server']
            },
            'custom-server': {
              command: 'custom',
              args: ['--option']
            }
          }
        };
        await fs.writeFile(
          path.join(tempDir, '.mcp.json'),
          JSON.stringify(existingConfig, null, 2)
        );

        await installMcpServer(tempDir);

        const content = await fs.readFile(path.join(tempDir, '.mcp.json'), 'utf-8');
        const config = JSON.parse(content);

        // Verify other servers preserved
        expect(config.mcpServers['context7']).toBeDefined();
        expect(config.mcpServers['custom-server']).toBeDefined();
        expect(config.mcpServers['fractary-codex']).toBeDefined();
      });
    });

    describe('invalid JSON handling', () => {
      it('should handle invalid JSON in existing .mcp.json', async () => {
        // Write invalid JSON
        await fs.writeFile(
          path.join(tempDir, '.mcp.json'),
          '{ invalid json content'
        );

        const result = await installMcpServer(tempDir);

        expect(result.installed).toBe(true);

        // Verify valid config was written
        const content = await fs.readFile(path.join(tempDir, '.mcp.json'), 'utf-8');
        const config = JSON.parse(content);
        expect(config.mcpServers['fractary-codex']).toBeDefined();
      });
    });
  });
});

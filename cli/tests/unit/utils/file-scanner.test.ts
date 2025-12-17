/**
 * Tests for file scanning utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fileExists, readFileContent, writeFileContent, ensureDirectory } from '../../../src/utils/file-scanner.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

describe('file-scanner', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = path.join(tmpdir(), `codex-cli-test-${Date.now()}`);
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

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'test content');

      const exists = await fileExists(filePath);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');
      const exists = await fileExists(filePath);
      expect(exists).toBe(false);
    });
  });

  describe('readFileContent', () => {
    it('should read file content', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'Hello, World!';
      await fs.writeFile(filePath, content);

      const result = await readFileContent(filePath);
      expect(result).toBe(content);
    });

    it('should throw error for non-existing file', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');
      await expect(readFileContent(filePath)).rejects.toThrow('Failed to read file');
    });
  });

  describe('writeFileContent', () => {
    it('should write file content', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'Test content';

      await writeFileContent(filePath, content);

      const result = await fs.readFile(filePath, 'utf-8');
      expect(result).toBe(content);
    });

    it('should create parent directories if they do not exist', async () => {
      const filePath = path.join(testDir, 'nested', 'dir', 'test.txt');
      const content = 'Nested content';

      await writeFileContent(filePath, content);

      const result = await fs.readFile(filePath, 'utf-8');
      expect(result).toBe(content);
    });
  });

  describe('ensureDirectory', () => {
    it('should create directory', async () => {
      const dirPath = path.join(testDir, 'new-dir');

      await ensureDirectory(dirPath);

      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create nested directories', async () => {
      const dirPath = path.join(testDir, 'nested', 'deep', 'dir');

      await ensureDirectory(dirPath);

      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should not throw if directory already exists', async () => {
      const dirPath = path.join(testDir, 'existing-dir');
      await fs.mkdir(dirPath);

      await expect(ensureDirectory(dirPath)).resolves.not.toThrow();
    });
  });
});

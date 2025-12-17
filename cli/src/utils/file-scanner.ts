/**
 * File scanning utilities for Codex CLI
 */

import { glob } from 'glob';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface ScanOptions {
  pattern?: string;
  cwd?: string;
  ignore?: string[];
}

/**
 * Scan for files matching a pattern
 */
export async function scanFiles(options: ScanOptions = {}): Promise<string[]> {
  const {
    pattern = '**/*.md',
    cwd = process.cwd(),
    ignore = ['node_modules/**', 'dist/**', '.git/**']
  } = options;

  try {
    const files = await glob(pattern, {
      cwd,
      ignore,
      absolute: false,
      nodir: true
    });

    return files.sort();
  } catch (error: any) {
    throw new Error(`Failed to scan files: ${error.message}`);
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read file content
 */
export async function readFileContent(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error: any) {
    throw new Error(`Failed to read file ${filePath}: ${error.message}`);
  }
}

/**
 * Write file content
 */
export async function writeFileContent(filePath: string, content: string): Promise<void> {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error: any) {
    throw new Error(`Failed to write file ${filePath}: ${error.message}`);
  }
}

/**
 * Ensure directory exists
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
  }
}

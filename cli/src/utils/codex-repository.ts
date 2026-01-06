/**
 * Codex Repository Utilities
 *
 * Handles cloning and updating the central codex repository for routing-aware sync.
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import type { CodexYamlConfig } from '../config/config-types';

/**
 * Execute a command using spawn (safer than exec)
 */
function spawnAsync(command: string, args: string[], options: { cwd: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        const error: any = new Error(stderr || `Command exited with code ${code}`);
        error.code = code;
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Extended config interface with codex_repository field
 */
interface CodexConfigWithRepo extends CodexYamlConfig {
  codex_repository?: string;
}

/**
 * Sanitize a path component to prevent path traversal attacks
 * Removes dangerous sequences like ../ and path separators
 */
function sanitizePathComponent(component: string): string {
  if (!component || typeof component !== 'string') {
    throw new Error('Path component must be a non-empty string');
  }

  // Remove path traversal sequences and path separators
  const sanitized = component
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    .trim();

  if (!sanitized) {
    throw new Error(`Invalid path component: ${component}`);
  }

  return sanitized;
}

/**
 * Validate a GitHub organization or repository name
 * Ensures it contains only safe characters
 */
function validateGitHubName(name: string, type: 'organization' | 'repository'): void {
  if (!name || typeof name !== 'string') {
    throw new Error(`GitHub ${type} name must be a non-empty string`);
  }

  // GitHub names can only contain alphanumeric characters, hyphens, underscores, and dots
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    throw new Error(`Invalid GitHub ${type} name: ${name}. Must contain only alphanumeric characters, hyphens, underscores, and dots.`);
  }

  // Additional checks
  if (name.startsWith('.') || name.startsWith('-')) {
    throw new Error(`GitHub ${type} name cannot start with a dot or hyphen: ${name}`);
  }
}

/**
 * Get the temporary directory path for codex clone
 * Includes process ID to prevent race conditions
 */
export function getTempCodexPath(config: CodexConfigWithRepo): string {
  const codexRepo = config.codex_repository || 'codex';

  // Sanitize path components to prevent path traversal
  const sanitizedOrg = sanitizePathComponent(config.organization);
  const sanitizedRepo = sanitizePathComponent(codexRepo);

  // Include process ID to prevent concurrent sync conflicts
  return path.join(
    os.tmpdir(),
    'fractary-codex-clone',
    `${sanitizedOrg}-${sanitizedRepo}-${process.pid}`
  );
}

/**
 * Check if a directory is a valid git repository
 */
export async function isValidGitRepo(repoPath: string): Promise<boolean> {
  try {
    const gitDir = path.join(repoPath, '.git');
    const stats = await fs.stat(gitDir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Construct the git repository URL from config
 */
export function getCodexRepoUrl(config: CodexConfigWithRepo): string {
  const codexRepo = config.codex_repository || 'codex';

  // Validate GitHub names to prevent URL injection
  validateGitHubName(config.organization, 'organization');
  validateGitHubName(codexRepo, 'repository');

  // Default to GitHub
  // Format: https://github.com/{org}/{repo}.git
  return `https://github.com/${config.organization}/${codexRepo}.git`;
}

/**
 * Execute a git command in a directory using spawn (safe from command injection)
 */
async function execGit(repoPath: string, args: string[]): Promise<string> {
  try {
    const stdout = await spawnAsync('git', args, {
      cwd: repoPath,
    });

    return stdout;
  } catch (error: any) {
    // Provide specific error messages based on error code
    if (error.code === 'ENOENT') {
      throw new Error(`Git command not found. Ensure git is installed and in PATH.`);
    }
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied accessing repository at ${repoPath}`);
    }
    if (error.code === 128) {
      throw new Error(`Git authentication failed. Check your credentials and repository access.`);
    }
    // For other errors, include the original message
    throw error;
  }
}

/**
 * Clone a git repository using spawn (safe from command injection)
 */
async function gitClone(
  url: string,
  targetPath: string,
  options?: { branch?: string; depth?: number }
): Promise<void> {
  // Ensure parent directory exists
  const parentDir = path.dirname(targetPath);
  await fs.mkdir(parentDir, { recursive: true });

  // Build args array (safe from command injection)
  const args = ['clone'];

  if (options?.depth) {
    // Validate depth is a positive integer
    if (!Number.isInteger(options.depth) || options.depth <= 0) {
      throw new Error(`Invalid depth parameter: ${options.depth}. Must be a positive integer.`);
    }
    args.push('--depth', String(options.depth));
  }

  if (options?.branch) {
    // Branch validation already done in gitCheckout, but validate here too
    if (!/^[\w\-./]+$/.test(options.branch)) {
      throw new Error(`Invalid branch name: ${options.branch}`);
    }
    args.push('--branch', options.branch);
  }

  // Add single-branch flag for performance
  args.push('--single-branch');

  args.push(url, targetPath);

  // Execute clone using spawn (parent directory is cwd)
  await spawnAsync('git', args, { cwd: parentDir });
}

/**
 * Fetch updates from remote
 */
async function gitFetch(repoPath: string, branch?: string): Promise<void> {
  // For shallow clones, fetch the specific branch if provided
  if (branch) {
    // Validate branch name
    if (!/^[\w\-./]+$/.test(branch)) {
      throw new Error(`Invalid branch name: ${branch}`);
    }
    await execGit(repoPath, ['fetch', 'origin', `${branch}:${branch}`]);
  } else {
    await execGit(repoPath, ['fetch', 'origin']);
  }
}

/**
 * Checkout a branch
 */
async function gitCheckout(repoPath: string, branch: string): Promise<void> {
  // Validate branch name to prevent command injection
  if (!/^[\w\-./]+$/.test(branch)) {
    throw new Error(`Invalid branch name: ${branch}`);
  }
  await execGit(repoPath, ['checkout', branch]);
}

/**
 * Pull latest changes
 */
async function gitPull(repoPath: string): Promise<void> {
  await execGit(repoPath, ['pull']);
}

/**
 * Ensure the codex repository is cloned and up-to-date
 *
 * This function will:
 * 1. Check if the repository already exists in temp directory
 * 2. If it exists and is valid, update it (fetch + checkout + pull)
 * 3. If it doesn't exist, clone it fresh (shallow clone for efficiency)
 * 4. Return the path to the cloned repository
 *
 * @param config - Codex configuration
 * @param options - Clone options
 * @returns Path to the cloned codex repository
 */
export async function ensureCodexCloned(
  config: CodexConfigWithRepo,
  options?: { force?: boolean; branch?: string }
): Promise<string> {
  const tempPath = getTempCodexPath(config);
  const branch = options?.branch || 'main';

  // If already exists and not forcing a fresh clone, update it
  if (await isValidGitRepo(tempPath) && !options?.force) {
    try {
      await gitFetch(tempPath, branch);
      await gitCheckout(tempPath, branch);
      await gitPull(tempPath);
      return tempPath;
    } catch (error: any) {
      // If update fails, remove and clone fresh
      console.warn(`Failed to update existing clone: ${error.message}`);
      console.warn(`Removing and cloning fresh...`);
      await fs.rm(tempPath, { recursive: true, force: true });
    }
  }

  // Clone fresh
  const repoUrl = getCodexRepoUrl(config);

  // Remove existing directory if present
  try {
    await fs.rm(tempPath, { recursive: true, force: true });
  } catch (error: any) {
    // Log but don't fail - directory might not exist yet
    console.warn(`Could not remove existing directory ${tempPath}: ${error.message}`);
  }

  await gitClone(repoUrl, tempPath, {
    branch,
    depth: 1,  // Shallow clone for efficiency
  });

  return tempPath;
}

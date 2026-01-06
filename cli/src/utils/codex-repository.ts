/**
 * Codex Repository Utilities
 *
 * Handles cloning and updating the central codex repository for routing-aware sync.
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { CodexYamlConfig } from '../config/config-types';

const execAsync = promisify(exec);

/**
 * Extended config interface with codex_repository field
 */
interface CodexConfigWithRepo extends CodexYamlConfig {
  codex_repository?: string;
}

/**
 * Get the temporary directory path for codex clone
 */
export function getTempCodexPath(config: CodexConfigWithRepo): string {
  const codexRepo = config.codex_repository || 'codex';
  return path.join(
    os.tmpdir(),
    'fractary-codex-clone',
    config.organization,
    codexRepo
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

  // Default to GitHub
  // Format: https://github.com/{org}/{repo}.git
  return `https://github.com/${config.organization}/${codexRepo}.git`;
}

/**
 * Execute a git command in a directory
 */
async function execGit(repoPath: string, command: string): Promise<string> {
  try {
    const { stdout } = await execAsync(command, {
      cwd: repoPath,
      env: { ...process.env },
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
 * Clone a git repository
 */
async function gitClone(
  url: string,
  targetPath: string,
  options?: { branch?: string; depth?: number }
): Promise<void> {
  // Ensure parent directory exists
  const parentDir = path.dirname(targetPath);
  await fs.mkdir(parentDir, { recursive: true });

  // Build clone command
  let command = `git clone`;

  if (options?.depth) {
    command += ` --depth ${options.depth}`;
  }

  if (options?.branch) {
    command += ` --branch ${options.branch}`;
  }

  command += ` "${url}" "${targetPath}"`;

  // Execute clone
  await execAsync(command);
}

/**
 * Fetch updates from remote
 */
async function gitFetch(repoPath: string, branch?: string): Promise<void> {
  // For shallow clones, fetch the specific branch if provided
  if (branch) {
    await execGit(repoPath, `git fetch origin ${branch}:${branch}`);
  } else {
    await execGit(repoPath, 'git fetch origin');
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
  await execGit(repoPath, `git checkout ${branch}`);
}

/**
 * Pull latest changes
 */
async function gitPull(repoPath: string): Promise<void> {
  await execGit(repoPath, 'git pull');
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

/**
 * Safe command execution utility
 *
 * Uses execFile instead of exec to prevent shell injection.
 * Provides structured output with stdout, stderr, and status.
 */

import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

/**
 * Execute a command safely using execFile
 *
 * @param command - Command to execute (NOT a shell string)
 * @param args - Array of arguments
 * @param options - Options for execFile
 * @returns Promise with stdout, stderr, and exit code
 */
export async function execFileNoThrow(
  command: string,
  args: string[] = [],
  options?: {
    cwd?: string
    timeout?: number
    maxBuffer?: number
    env?: NodeJS.ProcessEnv
  }
): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      ...options,
      maxBuffer: options?.maxBuffer || 1024 * 1024 * 10, // 10MB default
    })

    return {
      stdout: stdout || '',
      stderr: stderr || '',
      exitCode: 0,
    }
  } catch (error: any) {
    // execFile throws on non-zero exit codes
    // error.code is a string (e.g., 'ENOENT'), error.exitCode is the numeric exit code
    const exitCode = typeof error.exitCode === 'number' ? error.exitCode : 1

    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message || '',
      exitCode,
    }
  }
}

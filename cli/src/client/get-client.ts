/**
 * Singleton getter for CodexClient
 *
 * Provides lazy initialization of the CodexClient instance.
 * This ensures we only create one client instance across all command invocations,
 * avoiding repeated configuration loading and manager initialization.
 *
 * Uses dynamic imports to avoid loading @fractary/codex SDK at module load time,
 * which prevents CLI hangs when running simple commands like --help.
 *
 * @example
 * ```typescript
 * import { getClient } from './get-client';
 *
 * export async function fetchCommand(uri: string) {
 *   const client = await getClient();
 *   const result = await client.fetch(uri);
 *   console.log(result.content.toString());
 * }
 * ```
 */

// Import types only
import type { CodexClient, CodexClientOptions } from './codex-client';

/**
 * Singleton instance
 */
let clientInstance: CodexClient | null = null;

/**
 * Get the CodexClient singleton instance
 *
 * On first call, creates and initializes the client.
 * Subsequent calls return the same instance.
 *
 * @param options - Optional configuration (only used on first call)
 * @returns Promise resolving to CodexClient instance
 *
 * @example
 * ```typescript
 * const client = await getClient();
 * const stats = await client.getCacheStats();
 * ```
 */
export async function getClient(options?: CodexClientOptions): Promise<CodexClient> {
  if (!clientInstance) {
    // Dynamic import to avoid loading SDK at module time
    const { CodexClient } = await import('./codex-client');
    clientInstance = await CodexClient.create(options);
  }
  return clientInstance;
}

/**
 * Reset the singleton instance
 *
 * Useful for testing or when configuration changes require a fresh client.
 *
 * @example
 * ```typescript
 * // After changing configuration
 * resetClient();
 * const client = await getClient(); // Will create new instance
 * ```
 */
export function resetClient(): void {
  clientInstance = null;
}

/**
 * Check if client has been initialized
 *
 * @returns true if client instance exists
 */
export function isClientInitialized(): boolean {
  return clientInstance !== null;
}

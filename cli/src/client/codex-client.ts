/**
 * CodexClient - Re-exported from SDK
 *
 * The CodexClient facade now lives in the SDK (@fractary/codex) so both
 * CLI and MCP server share the same implementation. This module re-exports
 * for backward compatibility with existing CLI code.
 */

export {
  CodexClient,
  createCodexClient,
  type CodexClientOptions,
  type ClientFetchOptions,
  type ClientFetchResult,
  type HealthCheck,
} from '@fractary/codex';

// Re-export SDK error classes for convenience
export {
  CodexError,
  ConfigurationError,
  ValidationError,
  PermissionDeniedError
} from '@fractary/codex';

/**
 * Configure command
 *
 * Top-level command for initializing Fractary configuration (.fractary/config.yaml)
 */

// Re-export the configure command and utilities
export {
  configureCommand,
  installMcpServer,
  validateNameFormat,
  discoverCodexRepo,
  type McpInstallResult,
  type DiscoverCodexRepoResult
} from './init.js';

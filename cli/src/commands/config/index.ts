/**
 * Configure command
 *
 * Top-level command for initializing Fractary configuration (.fractary/config.yaml)
 */

// Re-export the configure command
export { configureCommand } from './init.js';

// Re-export SDK utilities used by the plugin
export {
  installMcpServer,
  validateNameFormat,
  discoverCodexRepo,
  type McpInstallResult,
  type DiscoverCodexRepoResult,
} from '@fractary/codex';

/**
 * Config commands
 *
 * Three distinct operations for codex configuration management:
 * - config-initialize: Add codex section to existing base config
 * - config-update: Update fields in existing codex section
 * - config-validate: Validate codex configuration (read-only)
 */

export { configInitializeCommand } from './initialize.js';
export { configUpdateCommand } from './update.js';
export { configValidateCommand } from './validate.js';

// Re-export SDK utilities used by the plugin
export {
  installMcpServer,
  validateNameFormat,
  discoverCodexRepo,
  type McpInstallResult,
  type DiscoverCodexRepoResult,
} from '@fractary/codex';

// Deprecated: old monolithic configure command
export { configureCommand } from './init.js';

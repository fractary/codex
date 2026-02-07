export {
  resolveOrganization,
  extractOrgFromRepoName,
  type ResolveOrgOptions,
} from './organization.js'

export {
  getDefaultConfig,
  getDefaultDirectories,
  getDefaultRules,
  getDefaultArchiveConfig,
} from './defaults.js'

export { loadConfig, type LoadConfigOptions } from './loader.js'

export {
  CONFIG_SCHEMA_VERSION,
  SYNC_PATTERN_PRESETS,
  DEFAULT_GLOBAL_EXCLUDES,
  getSyncPreset,
  getSyncPresetNames,
  substitutePatternPlaceholders,
  generateSyncConfigFromPreset,
  type SyncPreset,
  type SyncPresetConfig,
  type GenerateSyncConfigOptions,
} from './sync-presets.js'

// ConfigManager - centralized configuration management
export {
  // ConfigManager class
  ConfigManager,
  createConfigManager,
  // Name validation
  validateNameFormat,
  validateOrganizationName,
  validateRepositoryName,
  // Organization/project detection
  detectOrganizationFromGit,
  detectProjectName,
  // Codex repo discovery
  discoverCodexRepo,
  // Directory structure
  STANDARD_DIRECTORIES,
  CODEX_DIRECTORIES,
  ensureDirectoryStructure,
  // Gitignore management
  DEFAULT_FRACTARY_GITIGNORE,
  normalizeCachePath,
  ensureCachePathIgnored,
  // MCP server installation
  installMcpServer,
  // Codex section generation
  generateCodexSection,
  // Configuration generation (deprecated)
  sanitizeForS3BucketName,
  generateUnifiedConfig,
  // Config I/O
  readUnifiedConfig,
  writeUnifiedConfig,
  mergeUnifiedConfigs,
  // Shared infrastructure types
  type NameValidationResult,
  type DirectoryStructureResult,
  type GitignoreResult,
  type RemoteConfig,
  type FileSourceConfig,
  type FilePluginConfig,
  type UnifiedConfig,
  // Codex-specific types
  type CodexConfig,
  type DiscoverCodexRepoResult,
  type McpInstallResult,
  // New: config-init types
  type CodexInitOptions,
  type CodexInitResult,
  // New: config-update types
  type CodexUpdateOptions,
  type CodexUpdateResult,
  // New: config-validate types
  type ValidationIssue,
  type CodexValidateResult,
  // Deprecated types
  type ConfigInitOptions,
  type ConfigInitResult,
} from './manager.js'

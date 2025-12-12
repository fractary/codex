/**
 * @fractary/codex - Core SDK for Fractary Codex
 *
 * Knowledge infrastructure for AI agents - providing universal references,
 * storage abstraction, caching, synchronization, and MCP integration.
 *
 * @example
 * ```typescript
 * import { parseReference, resolveReference, TypeRegistry } from '@fractary/codex'
 *
 * // Parse a codex URI
 * const parsed = parseReference('codex://org/project/docs/api.md')
 *
 * // Create a type registry
 * const types = new TypeRegistry()
 * const ttl = types.getTtl('docs/api.md')
 * ```
 */

// Errors
export { CodexError, ConfigurationError, ValidationError } from './errors/index.js'

// References - Universal reference system (codex:// URIs)
export {
  // Parser
  parseReference,
  buildUri,
  isValidUri,
  isLegacyReference,
  convertLegacyReference,
  getExtension,
  getFilename,
  getDirectory,
  CODEX_URI_PREFIX,
  LEGACY_REF_PREFIX,
  type ParsedReference,
  type ParseOptions,
  // Resolver
  resolveReference,
  resolveReferences,
  detectCurrentProject,
  getCurrentContext,
  calculateCachePath,
  isCurrentProjectUri,
  getRelativeCachePath,
  DEFAULT_CACHE_DIR,
  type ResolvedReference,
  type ResolveOptions,
  // Validator
  validatePath,
  sanitizePath,
  validateOrg,
  validateProject,
  validateUri,
} from './references/index.js'

// Types - Extensible artifact type system
export {
  // Built-in types
  type ArtifactType,
  BUILT_IN_TYPES,
  DEFAULT_TYPE,
  TTL,
  getBuiltInType,
  getBuiltInTypeNames,
  isBuiltInType,
  // Registry
  TypeRegistry,
  createDefaultRegistry,
  type TypeRegistryOptions,
  // Custom types
  CustomTypeSchema,
  TypesConfigSchema,
  type CustomTypeConfig,
  type TypesConfig,
  parseTtl,
  validateCustomTypes,
  loadCustomTypes,
  mergeTypes,
  extendType,
} from './types/index.js'

// Schemas
export {
  MetadataSchema,
  AutoSyncPatternSchema,
  SyncRulesSchema,
  CodexConfigSchema,
  type Metadata,
  type AutoSyncPattern,
  type SyncRules,
  type CodexConfig,
} from './schemas/index.js'

// Metadata parsing
export {
  parseMetadata,
  hasFrontmatter,
  validateMetadata,
  extractRawFrontmatter,
  type ParseMetadataOptions,
  type ParseResult,
} from './core/metadata/index.js'

// Pattern matching
export {
  matchPattern,
  matchAnyPattern,
  filterByPatterns,
  evaluatePatterns,
} from './core/patterns/index.js'

// Configuration
export {
  loadConfig,
  resolveOrganization,
  extractOrgFromRepoName,
  getDefaultConfig,
  getDefaultDirectories,
  getDefaultRules,
  type LoadConfigOptions,
  type ResolveOrgOptions,
} from './core/config/index.js'

// Routing
export {
  shouldSyncToRepo,
  getTargetRepos,
  type ShouldSyncOptions,
} from './core/routing/index.js'

// Custom sync destinations
export {
  parseCustomDestination,
  getCustomSyncDestinations,
  type CustomSyncDestination,
} from './core/custom/index.js'

// Storage - Multi-provider storage abstraction
export {
  // Provider interface
  type StorageProvider,
  type StorageProviderType,
  type StorageProviderConfig,
  type FetchResult,
  type FetchOptions,
  DEFAULT_FETCH_OPTIONS,
  mergeFetchOptions,
  detectContentType,
  // Local storage
  LocalStorage,
  createLocalStorage,
  type LocalStorageOptions,
  // GitHub storage
  GitHubStorage,
  createGitHubStorage,
  type GitHubStorageOptions,
  // HTTP storage
  HttpStorage,
  createHttpStorage,
  type HttpStorageOptions,
  // Storage manager
  StorageManager,
  createStorageManager,
  getDefaultStorageManager,
  setDefaultStorageManager,
  type StorageManagerConfig,
} from './storage/index.js'

// Cache - Multi-tier caching with persistence
export {
  // Cache entry
  type CacheEntry,
  type CacheEntryMetadata,
  type CacheEntryStatus,
  type SerializedCacheEntry,
  createCacheEntry,
  getCacheEntryStatus,
  isCacheEntryValid,
  isCacheEntryFresh,
  touchCacheEntry,
  serializeCacheEntry,
  deserializeCacheEntry,
  getRemainingTtl,
  hasContentChanged,
  getCacheEntryAge,
  calculateContentHash,
  // Persistence
  CachePersistence,
  createCachePersistence,
  type CachePersistenceOptions,
  type CacheStats,
  // Cache manager
  CacheManager,
  createCacheManager,
  getDefaultCacheManager,
  setDefaultCacheManager,
  type CacheManagerConfig,
  type CacheLookupResult,
} from './cache/index.js'

// MCP - Model Context Protocol server
export {
  // Types
  type McpTool,
  type McpResource,
  type McpResourceTemplate,
  type McpCapabilities,
  type McpServerInfo,
  type FetchToolArgs,
  type SearchToolArgs,
  type ListToolArgs,
  type InvalidateToolArgs,
  type ToolResult,
  type ResourceContent,
  type SearchResult,
  // Tools
  CODEX_TOOLS,
  handleToolCall,
  handleFetch,
  handleSearch,
  handleList,
  handleInvalidate,
  type ToolHandlerContext,
  // Server
  McpServer,
  createMcpServer,
  type McpServerConfig,
} from './mcp/index.js'

// Sync - File synchronization
export {
  // Types
  type SyncDirection,
  type SyncOperation,
  type FileSyncStatus,
  type SyncManifestEntry,
  type SyncManifest,
  type SyncPlan,
  type SyncResult,
  type SyncOptions,
  type SyncRule,
  type SyncConfig,
  DEFAULT_SYNC_CONFIG,
  // Evaluator
  evaluatePath,
  evaluatePaths,
  filterSyncablePaths,
  createRulesFromPatterns,
  mergeRules,
  summarizeEvaluations,
  validateRules,
  type EvaluationResult,
  type EvaluationSummary,
  // Planner
  createSyncPlan,
  estimateSyncTime,
  createEmptySyncPlan,
  filterPlanOperations,
  getPlanStats,
  formatPlanSummary,
  type FileInfo,
  type PlanStats,
  // Manager
  SyncManager,
  createSyncManager,
  type SyncManagerConfig,
} from './sync/index.js'

// Permissions - Access control for codex operations
export {
  // Types
  type PermissionLevel,
  type PermissionScope,
  type PermissionAction,
  type PermissionRule,
  type PermissionContext,
  type PermissionResult,
  type PermissionConfig,
  DEFAULT_PERMISSION_CONFIG,
  PERMISSION_LEVEL_ORDER,
  levelGrants,
  maxLevel,
  minLevel,
  // Evaluator
  ruleMatchesContext,
  ruleMatchesPath,
  ruleMatchesAction,
  evaluatePermission,
  isAllowed as isPermissionAllowed,
  hasPermission as hasPermissionLevel,
  evaluatePermissions,
  filterByPermission,
  validateRules as validatePermissionRules,
  createRule,
  CommonRules,
  // Manager
  PermissionManager,
  PermissionDeniedError,
  createPermissionManager,
  getDefaultPermissionManager,
  setDefaultPermissionManager,
  type PermissionManagerConfig,
} from './permissions/index.js'

// Migration - v2.x to v3.0 configuration migration
export {
  // Types
  type LegacyCodexConfig,
  type LegacyAutoSyncPattern,
  type ModernCodexConfig,
  type ModernSyncPattern,
  type MigrationResult,
  type MigrationChange,
  type MigrationOptions,
  type VersionDetectionResult,
  type ReferenceConversionResult,
  type ConvertedReference,
  type ConversionOptions,
  // Detector
  detectVersion,
  isModernConfig,
  isLegacyConfig,
  needsMigration,
  getMigrationRequirements,
  // Migrator
  DEFAULT_MIGRATION_OPTIONS,
  migrateConfig,
  validateMigratedConfig,
  generateMigrationReport,
  createEmptyModernConfig,
  // References
  LEGACY_PATTERNS,
  convertLegacyReferences,
  convertToUri,
  findLegacyReferences,
  hasLegacyReferences,
  migrateFileReferences,
  generateReferenceMigrationSummary,
} from './migration/index.js'

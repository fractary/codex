/**
 * @fractary/codex - Core SDK for Fractary Codex
 *
 * Centralized knowledge management and distribution platform
 */

// Errors
export { CodexError, ConfigurationError, ValidationError } from './errors/index.js'

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

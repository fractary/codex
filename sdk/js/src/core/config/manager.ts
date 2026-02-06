/**
 * ConfigManager - Centralized configuration management for Codex
 *
 * Provides unified configuration operations that can be used by:
 * - CLI commands (config init)
 * - MCP Plugin (configurator agent)
 * - Direct SDK usage
 *
 * This is the single source of truth for all configuration-related operations.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { ValidationError } from '../../errors/index.js'
import { CONFIG_SCHEMA_VERSION, generateSyncConfigFromPreset, type SyncPresetConfig } from './sync-presets.js'

// ===== Types =====

/**
 * Organization/repository name validation result
 */
export interface NameValidationResult {
  valid: boolean
  error?: string
}

/**
 * Result of codex repository discovery
 */
export interface DiscoverCodexRepoResult {
  repo: string | null
  error?: 'gh_not_installed' | 'auth_failed' | 'org_not_found' | 'no_repos_found' | 'unknown'
  message?: string
}

/**
 * MCP server installation result
 */
export interface McpInstallResult {
  installed: boolean
  migrated: boolean
  alreadyInstalled: boolean
  backupPath?: string
}

/**
 * Directory structure creation result
 */
export interface DirectoryStructureResult {
  created: string[]
  alreadyExisted: string[]
}

/**
 * Gitignore update result
 */
export interface GitignoreResult {
  created: boolean
  updated: boolean
  alreadyIgnored: boolean
  path: string
}

/**
 * Remote repository configuration
 */
export interface RemoteConfig {
  token?: string
}

/**
 * Codex plugin configuration section
 */
export interface CodexConfig {
  schema_version: string
  organization: string
  project: string
  codex_repo: string
  sync?: SyncPresetConfig
  remotes?: Record<string, RemoteConfig>
}

/**
 * File source configuration for file plugin
 */
export interface FileSourceConfig {
  type: 's3' | 'r2' | 'gcs' | 'local'
  bucket?: string
  prefix?: string
  region?: string
  local: {
    base_path: string
  }
  push?: {
    compress?: boolean
    keep_local?: boolean
  }
  auth?: {
    profile?: string
  }
}

/**
 * File plugin configuration section
 */
export interface FilePluginConfig {
  schema_version: string
  sources: Record<string, FileSourceConfig>
}

/**
 * Unified configuration structure
 */
export interface UnifiedConfig {
  file?: FilePluginConfig
  codex?: CodexConfig
}

/**
 * Configuration initialization options
 */
export interface ConfigInitOptions {
  /** Organization name */
  organization: string
  /** Project name */
  project: string
  /** Codex repository name (e.g., codex.fractary.com) */
  codexRepo: string
  /** Sync preset name ('standard', 'minimal') */
  syncPreset?: string
  /** Force overwrite existing configuration */
  force?: boolean
  /** Skip MCP server installation */
  skipMcp?: boolean
  /** Include file plugin configuration */
  includeFilePlugin?: boolean
}

/**
 * Configuration initialization result
 */
export interface ConfigInitResult {
  configPath: string
  configCreated: boolean
  configMerged: boolean
  directories: DirectoryStructureResult
  gitignore: GitignoreResult
  mcp?: McpInstallResult
}

// ===== Name Validation =====

/**
 * Validate organization or repository name format
 *
 * Prevents command injection by ensuring only safe characters.
 * Valid: alphanumeric, hyphens, underscores, dots
 * Invalid: shell metacharacters, spaces, etc.
 *
 * @param name - Name to validate
 * @param type - Type of name for error messages
 * @returns Validation result with error message if invalid
 */
export function validateNameFormat(name: string, type: 'organization' | 'repository'): NameValidationResult {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: `${type} name is required` }
  }

  if (name.length > 100) {
    return { valid: false, error: `${type} name too long (max 100 characters)` }
  }

  // Only allow safe characters: alphanumeric, hyphens, underscores, dots
  // Must start with alphanumeric
  const safePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/
  if (!safePattern.test(name)) {
    return {
      valid: false,
      error: `Invalid ${type} name format: "${name}". Must start with alphanumeric and contain only: a-z, A-Z, 0-9, ., -, _`,
    }
  }

  return { valid: true }
}

/**
 * Validate organization name (throws on invalid)
 *
 * @param name - Organization name
 * @throws ValidationError if invalid
 */
export function validateOrganizationName(name: string): void {
  const result = validateNameFormat(name, 'organization')
  if (!result.valid) {
    throw new ValidationError(result.error!)
  }
}

/**
 * Validate repository name (throws on invalid)
 *
 * @param name - Repository name
 * @throws ValidationError if invalid
 */
export function validateRepositoryName(name: string): void {
  const result = validateNameFormat(name, 'repository')
  if (!result.valid) {
    throw new ValidationError(result.error!)
  }
}

// ===== Organization Detection =====

/**
 * Extract organization from git remote URL
 *
 * @param projectRoot - Project root directory
 * @returns Organization name or null if not detected
 */
export async function detectOrganizationFromGit(projectRoot: string): Promise<string | null> {
  try {
    const { spawnSync } = await import('child_process')
    const result = spawnSync('git', ['remote', 'get-url', 'origin'], {
      encoding: 'utf-8',
      cwd: projectRoot,
      stdio: 'pipe',
    })

    if (result.error || result.status !== 0) {
      return null
    }

    const remote = (result.stdout || '').trim()

    // Parse GitHub URL: git@github.com:org/repo.git or https://github.com/org/repo.git
    const sshMatch = remote.match(/git@github\.com:([^/]+)\//)
    const httpsMatch = remote.match(/github\.com\/([^/]+)\//)

    const org = sshMatch?.[1] || httpsMatch?.[1] || null

    // Validate detected org
    if (org) {
      const validation = validateNameFormat(org, 'organization')
      if (!validation.valid) {
        return null
      }
    }

    return org
  } catch {
    return null
  }
}

/**
 * Detect project name from directory
 *
 * @param projectRoot - Project root directory
 * @returns Project name
 */
export function detectProjectName(projectRoot: string): string {
  return path.basename(projectRoot)
}

// ===== Codex Repository Discovery =====

/**
 * Discover codex repository in organization
 *
 * Looks for repos matching codex.* pattern using GitHub CLI.
 *
 * @param org - Organization name (must be validated before calling)
 * @returns Discovery result with repo name or error details
 */
export async function discoverCodexRepo(org: string): Promise<DiscoverCodexRepoResult> {
  // Validate org to prevent command injection
  const validation = validateNameFormat(org, 'organization')
  if (!validation.valid) {
    return { repo: null, error: 'unknown', message: validation.error }
  }

  try {
    const { spawnSync } = await import('child_process')

    // First check if gh CLI is available
    const ghVersion = spawnSync('gh', ['--version'], { encoding: 'utf-8', stdio: 'pipe' })
    if (ghVersion.error || ghVersion.status !== 0) {
      return {
        repo: null,
        error: 'gh_not_installed',
        message: 'GitHub CLI (gh) is not installed. Install from https://cli.github.com/',
      }
    }

    // Check if authenticated
    const authStatus = spawnSync('gh', ['auth', 'status'], { encoding: 'utf-8', stdio: 'pipe' })
    if (authStatus.error || authStatus.status !== 0) {
      return {
        repo: null,
        error: 'auth_failed',
        message: 'GitHub CLI not authenticated. Run: gh auth login',
      }
    }

    // Use gh CLI to list repos matching codex.* pattern
    // Using spawnSync with array arguments to prevent command injection
    const listResult = spawnSync(
      'gh',
      ['repo', 'list', org, '--json', 'name', '--jq', '.[].name | select(startswith("codex."))'],
      { encoding: 'utf-8', stdio: 'pipe' }
    )

    if (listResult.error) {
      return {
        repo: null,
        error: 'unknown',
        message: listResult.error.message,
      }
    }

    const output = (listResult.stdout || '').trim()
    const stderr = (listResult.stderr || '').trim()

    // Check for org not found error
    if (stderr.includes('Could not resolve to an Organization') || stderr.includes('Not Found')) {
      return {
        repo: null,
        error: 'org_not_found',
        message: `Organization '${org}' not found on GitHub`,
      }
    }

    const repos = output.split('\n').filter(Boolean)
    if (repos.length === 0) {
      return {
        repo: null,
        error: 'no_repos_found',
        message: `No codex.* repositories found in organization '${org}'`,
      }
    }

    return { repo: repos[0] ?? null }
  } catch (error: any) {
    return {
      repo: null,
      error: 'unknown',
      message: error.message || 'Unknown error during discovery',
    }
  }
}

// ===== Directory Structure =====

/**
 * Standard directories for Fractary configuration
 */
export const STANDARD_DIRECTORIES = [
  '.fractary',
  '.fractary/specs',
  '.fractary/logs',
  '.fractary/codex',
  '.fractary/codex/cache',
] as const

/**
 * Ensure directory structure exists
 *
 * @param projectRoot - Project root directory
 * @param directories - Directories to create (defaults to STANDARD_DIRECTORIES)
 * @returns Result with created and already-existing directories
 */
export async function ensureDirectoryStructure(
  projectRoot: string,
  directories: readonly string[] = STANDARD_DIRECTORIES
): Promise<DirectoryStructureResult> {
  const created: string[] = []
  const alreadyExisted: string[] = []

  for (const dir of directories) {
    const fullPath = path.join(projectRoot, dir)
    try {
      await fs.access(fullPath)
      alreadyExisted.push(dir)
    } catch {
      await fs.mkdir(fullPath, { recursive: true })
      created.push(dir)
    }
  }

  return { created, alreadyExisted }
}

// ===== Gitignore Management =====

/**
 * Default gitignore content for .fractary directory
 */
export const DEFAULT_FRACTARY_GITIGNORE = `# .fractary/.gitignore
# This file is managed by multiple plugins - each plugin manages its own section

# ===== fractary-codex (managed) =====
codex/cache/
# ===== end fractary-codex =====
`

/**
 * Normalize a cache path to be relative to .fractary/
 *
 * @param cachePath - Cache path (e.g., ".fractary/codex/cache" or "codex/cache")
 * @returns Path relative to .fractary/ with trailing slash
 */
export function normalizeCachePath(cachePath: string): string {
  // Normalize to forward slashes (gitignore always uses forward slashes)
  let normalized = cachePath.replace(/\\/g, '/')

  // Remove .fractary/ prefix if present
  normalized = normalized.replace(/^\.fractary\//, '')

  // Ensure trailing slash for directory
  if (!normalized.endsWith('/')) {
    normalized += '/'
  }

  return normalized
}

/**
 * Ensure .fractary/.gitignore exists and contains the cache path
 *
 * @param projectRoot - Project root directory
 * @param cachePath - Cache path to ensure is ignored (can be absolute or relative)
 * @returns Result with status information
 */
export async function ensureCachePathIgnored(
  projectRoot: string,
  cachePath: string = '.fractary/codex/cache'
): Promise<GitignoreResult> {
  const gitignorePath = path.join(projectRoot, '.fractary', '.gitignore')

  // Normalize the cache path relative to .fractary/
  let relativeCachePath = cachePath
  if (path.isAbsolute(cachePath)) {
    relativeCachePath = path.relative(path.join(projectRoot, '.fractary'), cachePath)
  }

  // Security: Validate that the path doesn't escape the .fractary directory
  const normalizedForValidation = path.normalize(relativeCachePath)
  if (normalizedForValidation.startsWith('..') || path.isAbsolute(normalizedForValidation)) {
    throw new ValidationError('Cache path must be within .fractary directory')
  }

  relativeCachePath = normalizeCachePath(relativeCachePath)

  // Check if gitignore exists
  let content: string | null = null
  try {
    content = await fs.readFile(gitignorePath, 'utf-8')
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error
    }
  }

  if (content === null) {
    // Create with default content
    await fs.mkdir(path.join(projectRoot, '.fractary'), { recursive: true })
    await fs.writeFile(gitignorePath, DEFAULT_FRACTARY_GITIGNORE, 'utf-8')
    return {
      created: true,
      updated: false,
      alreadyIgnored: false,
      path: gitignorePath,
    }
  }

  // Check if already ignored
  const lines = content.split('\n').map((l) => l.trim())
  const isIgnored = lines.some((line) => {
    if (line.startsWith('#') || line === '') return false
    let normalizedLine = line.replace(/\\/g, '/')
    if (!normalizedLine.endsWith('/')) {
      normalizedLine += '/'
    }
    return normalizedLine === relativeCachePath
  })

  if (isIgnored) {
    return {
      created: false,
      updated: false,
      alreadyIgnored: true,
      path: gitignorePath,
    }
  }

  // Add the cache path
  const newContent = content.trimEnd() + `\n${relativeCachePath}\n`
  await fs.writeFile(gitignorePath, newContent, 'utf-8')

  return {
    created: false,
    updated: true,
    alreadyIgnored: false,
    path: gitignorePath,
  }
}

// ===== MCP Server Installation =====

/**
 * Install or update MCP server configuration in .mcp.json
 *
 * This is the centralized logic for MCP configuration.
 *
 * @param projectRoot - Project root directory
 * @param configPath - Path to config file (relative to project root)
 * @param options - Installation options
 * @returns Installation result
 */
export async function installMcpServer(
  projectRoot: string,
  configPath: string = '.fractary/config.yaml',
  options: { backup?: boolean } = {}
): Promise<McpInstallResult> {
  const mcpJsonPath = path.join(projectRoot, '.mcp.json')
  const { backup = true } = options

  let existingConfig: Record<string, unknown> = { mcpServers: {} }
  let backupPath: string | undefined
  let migrated = false

  // Read existing .mcp.json if it exists
  try {
    const content = await fs.readFile(mcpJsonPath, 'utf-8')
    existingConfig = JSON.parse(content)

    // Create backup if requested
    if (backup) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 18)
      const suffix = Math.random().toString(36).substring(2, 6)
      backupPath = `${mcpJsonPath}.backup.${timestamp}-${suffix}`
      await fs.writeFile(backupPath, content)
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      // Invalid JSON - start fresh
      existingConfig = { mcpServers: {} }
    }
  }

  // Ensure mcpServers object exists
  const mcpServers = (existingConfig.mcpServers || {}) as Record<string, { command?: string; args?: string[] }>

  // Check if already installed with correct configuration
  const existing = mcpServers['fractary-codex']
  if (existing) {
    const existingCommand = existing.command
    const existingArgs = existing.args || []

    // Check if it's the correct current format
    if (existingCommand === 'npx' && existingArgs.includes('@fractary/codex-mcp')) {
      return {
        installed: false,
        migrated: false,
        alreadyInstalled: true,
        backupPath,
      }
    }

    // Old format detected - will migrate
    if (existingCommand === 'node' || existingArgs.includes('@fractary/codex')) {
      migrated = true
    }
  }

  // Install the correct MCP server configuration
  mcpServers['fractary-codex'] = {
    command: 'npx',
    args: ['-y', '@fractary/codex-mcp', '--config', configPath],
  }

  existingConfig.mcpServers = mcpServers

  // Write updated .mcp.json
  await fs.writeFile(mcpJsonPath, JSON.stringify(existingConfig, null, 2) + '\n')

  return {
    installed: true,
    migrated,
    alreadyInstalled: false,
    backupPath,
  }
}

// ===== Configuration Generation =====

/**
 * Sanitize a name for use in S3 bucket naming
 *
 * @param name - Name to sanitize
 * @returns Sanitized name safe for S3 bucket naming
 */
export function sanitizeForS3BucketName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .substring(0, 63)
}

/**
 * Generate default unified configuration
 *
 * @param organization - Organization name
 * @param project - Project name
 * @param codexRepo - Codex repository name
 * @param options - Generation options
 * @returns Unified configuration
 */
export function generateUnifiedConfig(
  organization: string,
  project: string,
  codexRepo: string,
  options?: {
    syncPreset?: string
    includeFilePlugin?: boolean
  }
): UnifiedConfig {
  const sanitizedProject = sanitizeForS3BucketName(project)
  const syncPreset = options?.syncPreset || 'standard'

  const config: UnifiedConfig = {}

  // File plugin configuration (optional)
  if (options?.includeFilePlugin !== false) {
    config.file = {
      schema_version: CONFIG_SCHEMA_VERSION,
      sources: {
        specs: {
          type: 's3',
          bucket: `${sanitizedProject}-files`,
          prefix: 'specs/',
          region: 'us-east-1',
          local: {
            base_path: '.fractary/specs',
          },
          push: {
            compress: false,
            keep_local: true,
          },
          auth: {
            profile: 'default',
          },
        },
        logs: {
          type: 's3',
          bucket: `${sanitizedProject}-files`,
          prefix: 'logs/',
          region: 'us-east-1',
          local: {
            base_path: '.fractary/logs',
          },
          push: {
            compress: true,
            keep_local: true,
          },
          auth: {
            profile: 'default',
          },
        },
      },
    }
  }

  // Codex configuration
  const codexConfig: CodexConfig = {
    schema_version: CONFIG_SCHEMA_VERSION,
    organization,
    project,
    codex_repo: codexRepo,
    remotes: {
      [`${organization}/${codexRepo}`]: {
        token: '${GITHUB_TOKEN}',
      },
    },
  }

  // Add sync configuration from preset
  const syncConfig = generateSyncConfigFromPreset(syncPreset, organization, codexRepo)
  if (syncConfig) {
    codexConfig.sync = syncConfig
  }

  config.codex = codexConfig

  return config
}

/**
 * Read unified configuration from file
 *
 * @param configPath - Path to config file
 * @returns Unified configuration or null if not found
 */
export async function readUnifiedConfig(configPath: string): Promise<UnifiedConfig | null> {
  try {
    const content = await fs.readFile(configPath, 'utf-8')
    // Dynamic import for js-yaml to support ESM
    const yaml = await import('js-yaml')
    return yaml.load(content) as UnifiedConfig
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null
    }
    throw error
  }
}

/**
 * Write unified configuration to file
 *
 * @param config - Unified configuration
 * @param outputPath - Path to write config
 */
export async function writeUnifiedConfig(config: UnifiedConfig, outputPath: string): Promise<void> {
  // Ensure directory exists
  const dir = path.dirname(outputPath)
  await fs.mkdir(dir, { recursive: true })

  // Dynamic import for js-yaml to support ESM
  const yaml = await import('js-yaml')

  // Convert to YAML with nice formatting
  const yamlContent = yaml.dump(config, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  })

  await fs.writeFile(outputPath, yamlContent, 'utf-8')
}

/**
 * Merge unified configurations
 *
 * Merges a new config into an existing one, preserving existing values
 * and only adding missing sections.
 *
 * @param existing - Existing configuration
 * @param updates - New configuration values
 * @returns Merged configuration
 */
export function mergeUnifiedConfigs(existing: UnifiedConfig, updates: UnifiedConfig): UnifiedConfig {
  const merged: UnifiedConfig = {}

  // Merge file configuration
  if (updates.file || existing.file) {
    merged.file = {
      schema_version: updates.file?.schema_version || existing.file?.schema_version || CONFIG_SCHEMA_VERSION,
      sources: {
        ...(existing.file?.sources || {}),
        ...(updates.file?.sources || {}),
      },
    }
  }

  // Merge codex configuration
  if (updates.codex || existing.codex) {
    merged.codex = {
      schema_version: updates.codex?.schema_version || existing.codex?.schema_version || CONFIG_SCHEMA_VERSION,
      organization: updates.codex?.organization || existing.codex?.organization || 'default',
      project: updates.codex?.project || existing.codex?.project || 'default',
      codex_repo: updates.codex?.codex_repo || existing.codex?.codex_repo || '',
      sync: updates.codex?.sync || existing.codex?.sync,
      remotes: {
        ...(existing.codex?.remotes || {}),
        ...(updates.codex?.remotes || {}),
      },
    }
  }

  return merged
}

// ===== Main ConfigManager Class =====

/**
 * ConfigManager - Centralized configuration management
 *
 * Provides a high-level API for all configuration operations.
 */
export class ConfigManager {
  private projectRoot: string

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot
  }

  /**
   * Get project root directory
   */
  getProjectRoot(): string {
    return this.projectRoot
  }

  /**
   * Get default config path
   */
  getConfigPath(): string {
    return path.join(this.projectRoot, '.fractary', 'config.yaml')
  }

  /**
   * Detect organization from git remote
   */
  async detectOrganization(): Promise<string | null> {
    return detectOrganizationFromGit(this.projectRoot)
  }

  /**
   * Detect project name from directory
   */
  detectProject(): string {
    return detectProjectName(this.projectRoot)
  }

  /**
   * Discover codex repository in organization
   */
  async discoverCodexRepo(org: string): Promise<DiscoverCodexRepoResult> {
    return discoverCodexRepo(org)
  }

  /**
   * Initialize configuration
   *
   * Creates directory structure, configuration file, gitignore, and MCP server.
   *
   * @param options - Initialization options
   * @returns Initialization result
   */
  async initialize(options: ConfigInitOptions): Promise<ConfigInitResult> {
    // Validate inputs
    validateOrganizationName(options.organization)
    validateRepositoryName(options.codexRepo)

    const configPath = this.getConfigPath()

    // Create directory structure
    const directories = await ensureDirectoryStructure(this.projectRoot)

    // Setup gitignore
    const gitignore = await ensureCachePathIgnored(this.projectRoot)

    // Check if config exists
    const existingConfig = await readUnifiedConfig(configPath)

    let configCreated = false
    let configMerged = false

    if (existingConfig && !options.force) {
      // Merge with existing config
      const newConfig = generateUnifiedConfig(options.organization, options.project, options.codexRepo, {
        syncPreset: options.syncPreset,
        includeFilePlugin: options.includeFilePlugin,
      })
      const merged = mergeUnifiedConfigs(existingConfig, newConfig)
      await writeUnifiedConfig(merged, configPath)
      configMerged = true
    } else {
      // Create new config
      const config = generateUnifiedConfig(options.organization, options.project, options.codexRepo, {
        syncPreset: options.syncPreset,
        includeFilePlugin: options.includeFilePlugin,
      })
      await writeUnifiedConfig(config, configPath)
      configCreated = true
    }

    // Install MCP server
    let mcp: McpInstallResult | undefined
    if (!options.skipMcp) {
      mcp = await installMcpServer(this.projectRoot, '.fractary/config.yaml')
    }

    return {
      configPath,
      configCreated,
      configMerged,
      directories,
      gitignore,
      mcp,
    }
  }

  /**
   * Read current configuration
   */
  async readConfig(): Promise<UnifiedConfig | null> {
    return readUnifiedConfig(this.getConfigPath())
  }

  /**
   * Write configuration
   */
  async writeConfig(config: UnifiedConfig): Promise<void> {
    return writeUnifiedConfig(config, this.getConfigPath())
  }

  /**
   * Check if configuration exists
   */
  async configExists(): Promise<boolean> {
    try {
      await fs.access(this.getConfigPath())
      return true
    } catch {
      return false
    }
  }
}

/**
 * Create a ConfigManager instance
 *
 * @param projectRoot - Project root directory (defaults to cwd)
 * @returns ConfigManager instance
 */
export function createConfigManager(projectRoot: string = process.cwd()): ConfigManager {
  return new ConfigManager(projectRoot)
}

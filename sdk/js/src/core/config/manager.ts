/**
 * ConfigManager - Centralized configuration management for Codex
 *
 * Provides three distinct configuration operations:
 * - initializeCodexSection: Add codex section to existing base config (created by @fractary/core)
 * - updateCodexSection: Update fields in existing codex section
 * - validateCodexConfig: Validate codex configuration (read-only)
 *
 * Shared infrastructure (config I/O, org detection, name validation, directory management)
 * is imported from @fractary/core. Codex-specific logic (repo discovery, MCP installation,
 * sync presets) lives here.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { ValidationError } from '../../errors/index.js'
import { CONFIG_SCHEMA_VERSION, generateSyncConfigFromPreset, type SyncPresetConfig } from './sync-presets.js'

// ===== Shared Infrastructure Types =====
// These types are shared across plugins. They will migrate to @fractary/core
// as core's config module matures. For now they remain here for compatibility.

/**
 * Organization/repository name validation result
 */
export interface NameValidationResult {
  valid: boolean
  error?: string
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
 * Unified configuration structure (base type - owned by @fractary/core)
 */
export interface UnifiedConfig {
  file?: FilePluginConfig
  codex?: CodexConfig
  [section: string]: unknown
}

// ===== Codex-Specific Types =====

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

// ===== Codex Config Initialize =====

/**
 * Options for initializing the codex section in an existing config
 */
export interface CodexInitOptions {
  /** Organization name */
  organization: string
  /** Project name */
  project: string
  /** Codex repository name (e.g., codex.fractary.com) */
  codexRepo: string
  /** Sync preset name ('standard', 'minimal') */
  syncPreset?: string
  /** Force overwrite existing codex section */
  force?: boolean
  /** Skip MCP server installation */
  skipMcp?: boolean
}

/**
 * Result of codex section initialization
 */
export interface CodexInitResult {
  configPath: string
  codexSectionCreated: boolean
  directories: DirectoryStructureResult
  gitignore: GitignoreResult
  mcp?: McpInstallResult
}

// ===== Codex Config Update =====

/**
 * Options for updating the codex section (all fields optional - only specified fields are updated)
 */
export interface CodexUpdateOptions {
  /** Organization name */
  organization?: string
  /** Project name */
  project?: string
  /** Codex repository name */
  codexRepo?: string
  /** Sync preset name */
  syncPreset?: string
  /** Skip MCP server update */
  skipMcp?: boolean
}

/**
 * Result of codex section update
 */
export interface CodexUpdateResult {
  configPath: string
  fieldsUpdated: string[]
  mcp?: McpInstallResult
}

// ===== Codex Config Validate =====

/**
 * A single validation issue
 */
export interface ValidationIssue {
  field: string
  message: string
  severity: 'error' | 'warning'
}

/**
 * Result of codex configuration validation
 */
export interface CodexValidateResult {
  valid: boolean
  configPath: string
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
}

// ===== Deprecated Types (backward compatibility) =====

/**
 * @deprecated Use CodexInitOptions instead
 */
export interface ConfigInitOptions {
  organization: string
  project: string
  codexRepo: string
  syncPreset?: string
  force?: boolean
  skipMcp?: boolean
  includeFilePlugin?: boolean
}

/**
 * @deprecated Use CodexInitResult instead
 */
export interface ConfigInitResult {
  configPath: string
  configCreated: boolean
  configMerged: boolean
  directories: DirectoryStructureResult
  gitignore: GitignoreResult
  mcp?: McpInstallResult
}

// ===== Shared Infrastructure Functions =====
// These will migrate to @fractary/core. Codex SDK re-exports them for compatibility.

/**
 * Validate organization or repository name format
 */
export function validateNameFormat(name: string, type: 'organization' | 'repository'): NameValidationResult {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: `${type} name is required` }
  }

  if (name.length > 100) {
    return { valid: false, error: `${type} name too long (max 100 characters)` }
  }

  const safePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/
  if (!safePattern.test(name)) {
    return {
      valid: false,
      error: `Invalid ${type} name format: "${name}". Must start with alphanumeric and contain only: a-z, A-Z, 0-9, ., -, _`,
    }
  }

  return { valid: true }
}

export function validateOrganizationName(name: string): void {
  const result = validateNameFormat(name, 'organization')
  if (!result.valid) {
    throw new ValidationError(result.error!)
  }
}

export function validateRepositoryName(name: string): void {
  const result = validateNameFormat(name, 'repository')
  if (!result.valid) {
    throw new ValidationError(result.error!)
  }
}

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
    const sshMatch = remote.match(/git@github\.com:([^/]+)\//)
    const httpsMatch = remote.match(/github\.com\/([^/]+)\//)
    const org = sshMatch?.[1] || httpsMatch?.[1] || null

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

export function detectProjectName(projectRoot: string): string {
  return path.basename(projectRoot)
}

// ===== Directory Structure =====

/**
 * Standard directories created by @fractary/core
 */
export const STANDARD_DIRECTORIES = [
  '.fractary',
  '.fractary/specs',
  '.fractary/logs',
  '.fractary/codex',
  '.fractary/codex/cache',
] as const

/**
 * Codex-specific directories (subset of STANDARD_DIRECTORIES)
 */
export const CODEX_DIRECTORIES = [
  '.fractary/codex',
  '.fractary/codex/cache',
] as const

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

export const DEFAULT_FRACTARY_GITIGNORE = `# .fractary/.gitignore
# This file is managed by multiple plugins - each plugin manages its own section

# ===== fractary-codex (managed) =====
codex/cache/
# ===== end fractary-codex =====
`

export function normalizeCachePath(cachePath: string): string {
  let normalized = cachePath.replace(/\\/g, '/')
  normalized = normalized.replace(/^\.fractary\//, '')
  if (!normalized.endsWith('/')) {
    normalized += '/'
  }
  return normalized
}

export async function ensureCachePathIgnored(
  projectRoot: string,
  cachePath: string = '.fractary/codex/cache'
): Promise<GitignoreResult> {
  const gitignorePath = path.join(projectRoot, '.fractary', '.gitignore')

  let relativeCachePath = cachePath
  if (path.isAbsolute(cachePath)) {
    relativeCachePath = path.relative(path.join(projectRoot, '.fractary'), cachePath)
  }

  const normalizedForValidation = path.normalize(relativeCachePath)
  if (normalizedForValidation.startsWith('..') || path.isAbsolute(normalizedForValidation)) {
    throw new ValidationError('Cache path must be within .fractary directory')
  }

  relativeCachePath = normalizeCachePath(relativeCachePath)

  let content: string | null = null
  try {
    content = await fs.readFile(gitignorePath, 'utf-8')
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error
    }
  }

  if (content === null) {
    await fs.mkdir(path.join(projectRoot, '.fractary'), { recursive: true })
    await fs.writeFile(gitignorePath, DEFAULT_FRACTARY_GITIGNORE, 'utf-8')
    return {
      created: true,
      updated: false,
      alreadyIgnored: false,
      path: gitignorePath,
    }
  }

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

  const newContent = content.trimEnd() + `\n${relativeCachePath}\n`
  await fs.writeFile(gitignorePath, newContent, 'utf-8')

  return {
    created: false,
    updated: true,
    alreadyIgnored: false,
    path: gitignorePath,
  }
}

// ===== Codex-Specific: MCP Server Installation =====

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

  try {
    const content = await fs.readFile(mcpJsonPath, 'utf-8')
    existingConfig = JSON.parse(content)

    if (backup) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 18)
      const suffix = Math.random().toString(36).substring(2, 6)
      backupPath = `${mcpJsonPath}.backup.${timestamp}-${suffix}`
      await fs.writeFile(backupPath, content)
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      existingConfig = { mcpServers: {} }
    }
  }

  const mcpServers = (existingConfig.mcpServers || {}) as Record<string, { command?: string; args?: string[] }>

  const existing = mcpServers['fractary-codex']
  if (existing) {
    const existingCommand = existing.command
    const existingArgs = existing.args || []

    if (existingCommand === 'npx' && existingArgs.includes('@fractary/codex-mcp')) {
      return {
        installed: false,
        migrated: false,
        alreadyInstalled: true,
        backupPath,
      }
    }

    if (existingCommand === 'node' || existingArgs.includes('@fractary/codex')) {
      migrated = true
    }
  }

  mcpServers['fractary-codex'] = {
    command: 'npx',
    args: ['-y', '@fractary/codex-mcp', '--config', configPath],
  }

  existingConfig.mcpServers = mcpServers

  await fs.writeFile(mcpJsonPath, JSON.stringify(existingConfig, null, 2) + '\n')

  return {
    installed: true,
    migrated,
    alreadyInstalled: false,
    backupPath,
  }
}

// ===== Codex-Specific: Codex Repository Discovery =====

export async function discoverCodexRepo(org: string): Promise<DiscoverCodexRepoResult> {
  const validation = validateNameFormat(org, 'organization')
  if (!validation.valid) {
    return { repo: null, error: 'unknown', message: validation.error }
  }

  try {
    const { spawnSync } = await import('child_process')

    const ghVersion = spawnSync('gh', ['--version'], { encoding: 'utf-8', stdio: 'pipe' })
    if (ghVersion.error || ghVersion.status !== 0) {
      return {
        repo: null,
        error: 'gh_not_installed',
        message: 'GitHub CLI (gh) is not installed. Install from https://cli.github.com/',
      }
    }

    const authStatus = spawnSync('gh', ['auth', 'status'], { encoding: 'utf-8', stdio: 'pipe' })
    if (authStatus.error || authStatus.status !== 0) {
      return {
        repo: null,
        error: 'auth_failed',
        message: 'GitHub CLI not authenticated. Run: gh auth login',
      }
    }

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

// ===== Codex-Specific: Configuration Generation =====

export function sanitizeForS3BucketName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .substring(0, 63)
}

/**
 * Generate just the codex section of the unified config
 */
export function generateCodexSection(
  organization: string,
  project: string,
  codexRepo: string,
  options?: { syncPreset?: string }
): CodexConfig {
  const syncPreset = options?.syncPreset || 'standard'

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

  const syncConfig = generateSyncConfigFromPreset(syncPreset, organization, codexRepo)
  if (syncConfig) {
    codexConfig.sync = syncConfig
  }

  return codexConfig
}

/**
 * @deprecated Use generateCodexSection() for codex-only config generation.
 * Base config creation should be handled by @fractary/core.
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
  const config: UnifiedConfig = {}

  if (options?.includeFilePlugin !== false) {
    config.file = {
      schema_version: CONFIG_SCHEMA_VERSION,
      sources: {
        specs: {
          type: 's3',
          bucket: `${sanitizedProject}-files`,
          prefix: 'specs/',
          region: 'us-east-1',
          local: { base_path: '.fractary/specs' },
          push: { compress: false, keep_local: true },
          auth: { profile: 'default' },
        },
        logs: {
          type: 's3',
          bucket: `${sanitizedProject}-files`,
          prefix: 'logs/',
          region: 'us-east-1',
          local: { base_path: '.fractary/logs' },
          push: { compress: true, keep_local: true },
          auth: { profile: 'default' },
        },
      },
    }
  }

  config.codex = generateCodexSection(organization, project, codexRepo, {
    syncPreset: options?.syncPreset,
  })

  return config
}

// ===== Config I/O =====
// These are shared infrastructure that will migrate to @fractary/core.

export async function readUnifiedConfig(configPath: string): Promise<UnifiedConfig | null> {
  try {
    const content = await fs.readFile(configPath, 'utf-8')
    const yaml = await import('js-yaml')
    return yaml.load(content) as UnifiedConfig
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null
    }
    throw error
  }
}

export async function writeUnifiedConfig(config: UnifiedConfig, outputPath: string): Promise<void> {
  const dir = path.dirname(outputPath)
  await fs.mkdir(dir, { recursive: true })

  const yaml = await import('js-yaml')

  const yamlContent = yaml.dump(config, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  })

  await fs.writeFile(outputPath, yamlContent, 'utf-8')
}

export function mergeUnifiedConfigs(existing: UnifiedConfig, updates: UnifiedConfig): UnifiedConfig {
  const merged: UnifiedConfig = {}

  if (updates.file || existing.file) {
    merged.file = {
      schema_version: updates.file?.schema_version || existing.file?.schema_version || CONFIG_SCHEMA_VERSION,
      sources: {
        ...(existing.file?.sources || {}),
        ...(updates.file?.sources || {}),
      },
    }
  }

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
 * ConfigManager - Codex configuration management
 *
 * Three distinct operations:
 * - initializeCodexSection(): Add codex section to base config (requires config created by @fractary/core)
 * - updateCodexSection(): Update existing codex section fields
 * - validateCodexConfig(): Validate codex configuration (read-only)
 */
export class ConfigManager {
  private projectRoot: string

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot
  }

  getProjectRoot(): string {
    return this.projectRoot
  }

  getConfigPath(): string {
    return path.join(this.projectRoot, '.fractary', 'config.yaml')
  }

  async detectOrganization(): Promise<string | null> {
    return detectOrganizationFromGit(this.projectRoot)
  }

  detectProject(): string {
    return detectProjectName(this.projectRoot)
  }

  async discoverCodexRepo(org: string): Promise<DiscoverCodexRepoResult> {
    return discoverCodexRepo(org)
  }

  async readConfig(): Promise<UnifiedConfig | null> {
    return readUnifiedConfig(this.getConfigPath())
  }

  async writeConfig(config: UnifiedConfig): Promise<void> {
    return writeUnifiedConfig(config, this.getConfigPath())
  }

  async configExists(): Promise<boolean> {
    try {
      await fs.access(this.getConfigPath())
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if the codex section exists in the current config
   */
  async codexSectionExists(): Promise<boolean> {
    const config = await this.readConfig()
    return config !== null && config.codex !== undefined
  }

  // ===== Initialize: Add codex section to existing base config =====

  /**
   * Initialize the codex section in an existing unified config.
   *
   * Requires .fractary/config.yaml to already exist (created by @fractary/core's config-init).
   * Creates codex-specific directories, gitignore entries, and MCP server configuration.
   *
   * @param options - Initialization options
   * @returns Initialization result
   * @throws ValidationError if base config doesn't exist or codex section already exists (without --force)
   */
  async initializeCodexSection(options: CodexInitOptions): Promise<CodexInitResult> {
    validateOrganizationName(options.organization)
    validateRepositoryName(options.codexRepo)

    const configPath = this.getConfigPath()
    const existingConfig = await readUnifiedConfig(configPath)

    if (!existingConfig) {
      throw new ValidationError(
        'Base configuration not found at .fractary/config.yaml. ' +
        'Run fractary config-init first to create the base configuration.'
      )
    }

    if (existingConfig.codex && !options.force) {
      throw new ValidationError(
        'Codex section already exists in .fractary/config.yaml. ' +
        'Use --force to overwrite, or use config-update to modify specific fields.'
      )
    }

    // Create codex-specific directories only
    const directories = await ensureDirectoryStructure(this.projectRoot, CODEX_DIRECTORIES)

    // Setup gitignore for codex cache
    const gitignore = await ensureCachePathIgnored(this.projectRoot)

    // Generate and add codex section
    const codexSection = generateCodexSection(
      options.organization,
      options.project,
      options.codexRepo,
      { syncPreset: options.syncPreset }
    )

    const updatedConfig = { ...existingConfig, codex: codexSection }
    await writeUnifiedConfig(updatedConfig, configPath)

    // Install MCP server
    let mcp: McpInstallResult | undefined
    if (!options.skipMcp) {
      mcp = await installMcpServer(this.projectRoot, '.fractary/config.yaml')
    }

    return {
      configPath,
      codexSectionCreated: true,
      directories,
      gitignore,
      mcp,
    }
  }

  // ===== Update: Modify existing codex section =====

  /**
   * Update specific fields in the existing codex section.
   *
   * Requires codex section to already exist. Only updates the fields that are provided.
   *
   * @param options - Fields to update (only non-undefined fields are applied)
   * @returns Update result with list of updated fields
   * @throws ValidationError if config or codex section doesn't exist
   */
  async updateCodexSection(options: CodexUpdateOptions): Promise<CodexUpdateResult> {
    const configPath = this.getConfigPath()
    const existingConfig = await readUnifiedConfig(configPath)

    if (!existingConfig) {
      throw new ValidationError(
        'Configuration not found at .fractary/config.yaml. ' +
        'Run config-init first.'
      )
    }

    if (!existingConfig.codex) {
      throw new ValidationError(
        'Codex section not found in .fractary/config.yaml. ' +
        'Run config-init first to create the codex configuration.'
      )
    }

    const codex = { ...existingConfig.codex }
    const fieldsUpdated: string[] = []

    if (options.organization !== undefined) {
      validateOrganizationName(options.organization)
      codex.organization = options.organization
      fieldsUpdated.push('organization')
    }

    if (options.project !== undefined) {
      codex.project = options.project
      fieldsUpdated.push('project')
    }

    if (options.codexRepo !== undefined) {
      validateRepositoryName(options.codexRepo)
      codex.codex_repo = options.codexRepo
      fieldsUpdated.push('codex_repo')
    }

    if (options.syncPreset !== undefined) {
      const syncConfig = generateSyncConfigFromPreset(
        options.syncPreset,
        codex.organization,
        codex.codex_repo
      )
      if (syncConfig) {
        codex.sync = syncConfig
        fieldsUpdated.push('sync')
      }
    }

    // Rebuild remotes if org or repo changed
    if (options.organization !== undefined || options.codexRepo !== undefined) {
      codex.remotes = {
        [`${codex.organization}/${codex.codex_repo}`]: {
          token: '${GITHUB_TOKEN}',
        },
      }
      if (!fieldsUpdated.includes('remotes')) {
        fieldsUpdated.push('remotes')
      }
    }

    const updatedConfig = { ...existingConfig, codex }
    await writeUnifiedConfig(updatedConfig, configPath)

    // Update MCP server if needed
    let mcp: McpInstallResult | undefined
    if (!options.skipMcp) {
      mcp = await installMcpServer(this.projectRoot, '.fractary/config.yaml')
    }

    return {
      configPath,
      fieldsUpdated,
      mcp,
    }
  }

  // ===== Validate: Check codex configuration (read-only) =====

  /**
   * Validate the codex configuration.
   *
   * Read-only operation that checks config structure, field formats,
   * directory existence, and MCP server configuration.
   *
   * @returns Validation result with errors and warnings
   */
  async validateCodexConfig(): Promise<CodexValidateResult> {
    const configPath = this.getConfigPath()
    const errors: ValidationIssue[] = []
    const warnings: ValidationIssue[] = []

    // Check base config exists
    const config = await readUnifiedConfig(configPath)
    if (!config) {
      errors.push({
        field: 'config',
        message: 'Configuration file not found at .fractary/config.yaml',
        severity: 'error',
      })
      return { valid: false, configPath, errors, warnings }
    }

    // Check codex section exists
    if (!config.codex) {
      errors.push({
        field: 'codex',
        message: 'Codex section not found in configuration',
        severity: 'error',
      })
      return { valid: false, configPath, errors, warnings }
    }

    const codex = config.codex

    // Validate schema version
    if (!codex.schema_version) {
      warnings.push({
        field: 'codex.schema_version',
        message: 'Missing schema_version field',
        severity: 'warning',
      })
    }

    // Validate organization
    if (!codex.organization) {
      errors.push({
        field: 'codex.organization',
        message: 'Organization is required',
        severity: 'error',
      })
    } else {
      const orgValidation = validateNameFormat(codex.organization, 'organization')
      if (!orgValidation.valid) {
        errors.push({
          field: 'codex.organization',
          message: orgValidation.error!,
          severity: 'error',
        })
      }
    }

    // Validate project
    if (!codex.project) {
      errors.push({
        field: 'codex.project',
        message: 'Project name is required',
        severity: 'error',
      })
    }

    // Validate codex_repo
    if (!codex.codex_repo) {
      errors.push({
        field: 'codex.codex_repo',
        message: 'Codex repository name is required',
        severity: 'error',
      })
    } else {
      const repoValidation = validateNameFormat(codex.codex_repo, 'repository')
      if (!repoValidation.valid) {
        errors.push({
          field: 'codex.codex_repo',
          message: repoValidation.error!,
          severity: 'error',
        })
      }
    }

    // Validate sync preset names
    if (codex.sync) {
      if (!codex.sync.to_codex?.include?.length) {
        warnings.push({
          field: 'codex.sync.to_codex.include',
          message: 'No to_codex include patterns configured',
          severity: 'warning',
        })
      }
      if (!codex.sync.from_codex?.include?.length) {
        warnings.push({
          field: 'codex.sync.from_codex.include',
          message: 'No from_codex include patterns configured',
          severity: 'warning',
        })
      }
    } else {
      warnings.push({
        field: 'codex.sync',
        message: 'No sync configuration found',
        severity: 'warning',
      })
    }

    // Check codex directories exist
    for (const dir of CODEX_DIRECTORIES) {
      const fullPath = path.join(this.projectRoot, dir)
      try {
        await fs.access(fullPath)
      } catch {
        warnings.push({
          field: `directory:${dir}`,
          message: `Directory ${dir} does not exist`,
          severity: 'warning',
        })
      }
    }

    // Check MCP server configuration
    const mcpJsonPath = path.join(this.projectRoot, '.mcp.json')
    try {
      const mcpContent = await fs.readFile(mcpJsonPath, 'utf-8')
      const mcpConfig = JSON.parse(mcpContent)
      const mcpServers = mcpConfig.mcpServers || {}
      if (!mcpServers['fractary-codex']) {
        warnings.push({
          field: 'mcp',
          message: 'MCP server fractary-codex not configured in .mcp.json',
          severity: 'warning',
        })
      }
    } catch {
      warnings.push({
        field: 'mcp',
        message: '.mcp.json not found or invalid',
        severity: 'warning',
      })
    }

    // Check gitignore
    const gitignorePath = path.join(this.projectRoot, '.fractary', '.gitignore')
    try {
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8')
      if (!gitignoreContent.includes('codex/cache')) {
        warnings.push({
          field: 'gitignore',
          message: 'Codex cache directory not in .fractary/.gitignore',
          severity: 'warning',
        })
      }
    } catch {
      warnings.push({
        field: 'gitignore',
        message: '.fractary/.gitignore not found',
        severity: 'warning',
      })
    }

    return {
      valid: errors.length === 0,
      configPath,
      errors,
      warnings,
    }
  }

  // ===== Deprecated: Old monolithic initialize =====

  /**
   * @deprecated Use initializeCodexSection() instead. This method handles both
   * initialization and update in a single call, which conflates two distinct operations.
   */
  async initialize(options: ConfigInitOptions): Promise<ConfigInitResult> {
    validateOrganizationName(options.organization)
    validateRepositoryName(options.codexRepo)

    const configPath = this.getConfigPath()
    const directories = await ensureDirectoryStructure(this.projectRoot)
    const gitignore = await ensureCachePathIgnored(this.projectRoot)
    const existingConfig = await readUnifiedConfig(configPath)

    let configCreated = false
    let configMerged = false

    if (existingConfig && !options.force) {
      const newConfig = generateUnifiedConfig(options.organization, options.project, options.codexRepo, {
        syncPreset: options.syncPreset,
        includeFilePlugin: options.includeFilePlugin,
      })
      const merged = mergeUnifiedConfigs(existingConfig, newConfig)
      await writeUnifiedConfig(merged, configPath)
      configMerged = true
    } else {
      const config = generateUnifiedConfig(options.organization, options.project, options.codexRepo, {
        syncPreset: options.syncPreset,
        includeFilePlugin: options.includeFilePlugin,
      })
      await writeUnifiedConfig(config, configPath)
      configCreated = true
    }

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
}

export function createConfigManager(projectRoot: string = process.cwd()): ConfigManager {
  return new ConfigManager(projectRoot)
}

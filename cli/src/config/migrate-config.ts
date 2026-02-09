/**
 * Configuration migration utility
 *
 * Converts legacy v2.x JSON config to v3.0 YAML format.
 * Uses SDK utilities where possible to avoid code duplication.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'js-yaml'
import {
  type CodexYamlConfig,
  type LegacyCodexConfig,
} from './config-types'
// Re-export readCodexConfig from SDK for backward compatibility
export { readCodexConfig as readYamlConfig } from '@fractary/codex'

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  yamlConfig: CodexYamlConfig;
  warnings: string[];
  backupPath?: string;
}

/**
 * Detect if a config file is legacy JSON format
 */
export async function isLegacyConfig(configPath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);

    // Check for legacy v2.x structure
    return (
      config.version === '3.0' ||
      config.organizationSlug !== undefined ||
      config.directories !== undefined ||
      config.rules !== undefined
    );
  } catch {
    return false;
  }
}

/**
 * Migrate legacy JSON config to v3.0 YAML format
 */
export async function migrateConfig(
  legacyConfigPath: string,
  options?: {
    createBackup?: boolean;
    backupSuffix?: string;
  }
): Promise<MigrationResult> {
  const warnings: string[] = [];

  try {
    // Read legacy config
    const content = await fs.readFile(legacyConfigPath, 'utf-8');
    const legacy: LegacyCodexConfig = JSON.parse(content);

    // Create backup if requested
    let backupPath: string | undefined;
    if (options?.createBackup === true) {
      const suffix = options?.backupSuffix || new Date().toISOString().replace(/[:.]/g, '-');
      backupPath = `${legacyConfigPath}.backup-${suffix}`;
      await fs.writeFile(backupPath, content, 'utf-8');
    }

    // Build YAML config
    const yamlConfig: CodexYamlConfig = {
      organization: legacy.organization || legacy.organizationSlug || 'default'
    };

    // Migrate cache configuration
    if (legacy.cache) {
      yamlConfig.cacheDir = legacy.cache.directory || '.fractary/codex/cache';

      // Note: Legacy config had cache.defaultTtl, cache.maxSize with string formats
      // These are now handled by CacheManager config separately
    }

    // Migrate storage providers
    if (legacy.storage?.providers) {
      yamlConfig.storage = [];

      // Convert providers object to array
      for (const [type, config] of Object.entries(legacy.storage.providers)) {
        if (type === 'github') {
          const githubConfig = config as any;
          yamlConfig.storage.push({
            type: 'github',
            token: githubConfig.token || '${GITHUB_TOKEN}',
            apiBaseUrl: githubConfig.baseUrl || 'https://api.github.com',
            branch: githubConfig.branch || 'main',
            priority: 50
          });
        } else if (type === 'http') {
          const httpConfig = config as any;
          yamlConfig.storage.push({
            type: 'http',
            baseUrl: httpConfig.baseUrl,
            headers: httpConfig.headers,
            timeout: httpConfig.timeout || 30000,
            priority: 100
          });
        } else if (type === 'local') {
          const localConfig = config as any;
          yamlConfig.storage.push({
            type: 'local',
            basePath: localConfig.basePath || './knowledge',
            followSymlinks: localConfig.followSymlinks || false,
            priority: 10
          });
        } else {
          warnings.push(`Unknown storage provider type: ${type}`);
        }
      }

      // If no providers configured, add default GitHub
      if (yamlConfig.storage.length === 0) {
        yamlConfig.storage.push({
          type: 'github',
          token: '${GITHUB_TOKEN}',
          apiBaseUrl: 'https://api.github.com',
          branch: 'main',
          priority: 50
        });
        warnings.push('No storage providers found, added default GitHub provider');
      }
    }

    // Migrate custom types
    if (legacy.types?.custom && Array.isArray(legacy.types.custom)) {
      yamlConfig.types = {
        custom: {}
      };

      for (const customType of legacy.types.custom) {
        const ct = customType as any;
        if (ct.name) {
          yamlConfig.types!.custom![ct.name] = {
            description: ct.description,
            patterns: ct.patterns || [],
            defaultTtl: ct.defaultTtl,
            archiveAfterDays: ct.archiveAfterDays,
            archiveStorage: ct.archiveStorage
          };
        }
      }
    }

    // Migrate sync configuration
    if (legacy.sync) {
      yamlConfig.sync = {
        bidirectional: true,
        conflictResolution: 'prompt',
        exclude: [
          'node_modules/**',
          '.git/**',
          '**/*.log',
          '.env'
        ]
      };

      if (legacy.sync.environments) {
        warnings.push('Sync environments are not directly supported in v3.0 - please configure sync rules manually');
      }
    }

    // Migrate MCP configuration
    if (legacy.mcp) {
      yamlConfig.mcp = {
        enabled: legacy.mcp.enabled || false,
        port: legacy.mcp.port || 3000
      };
    }

    return {
      success: true,
      yamlConfig,
      warnings,
      backupPath
    };
  } catch (error) {
    throw new Error(
      `Migration failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Write YAML config to file
 */
export async function writeYamlConfig(
  config: CodexYamlConfig,
  outputPath: string
): Promise<void> {
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });

  // Convert to YAML with nice formatting
  const yamlContent = yaml.dump(config, {
    indent: 2,
    lineWidth: 80,
    noRefs: true,
    sortKeys: false
  });

  // Write to file
  await fs.writeFile(outputPath, yamlContent, 'utf-8');
}

/**
 * Get default YAML config (v4.0 standard)
 */
export function getDefaultYamlConfig(organization: string): CodexYamlConfig {
  return {
    organization,
    cacheDir: '.fractary/codex/cache',

    storage: [
      {
        type: 'local',
        basePath: './knowledge',
        followSymlinks: false,
        priority: 10
      },
      {
        type: 'github',
        token: '${GITHUB_TOKEN}',
        apiBaseUrl: 'https://api.github.com',
        branch: 'main',
        priority: 50
      },
      {
        type: 'http',
        baseUrl: 'https://codex.example.com',
        timeout: 30000,
        priority: 100
      }
    ],

    types: {
      custom: {}
    },

    permissions: {
      default: 'read',
      rules: [
        {
          pattern: 'internal/**',
          permission: 'none'
        },
        {
          pattern: 'public/**',
          permission: 'read'
        }
      ]
    },

    sync: {
      bidirectional: true,
      conflictResolution: 'prompt',
      exclude: [
        'node_modules/**',
        '.git/**',
        '**/*.log',
        '.env'
      ]
    },

    mcp: {
      enabled: false,
      port: 3000
    }
  };
}


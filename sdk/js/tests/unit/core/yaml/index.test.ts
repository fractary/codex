import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import {
  readCodexConfig,
  readUnifiedConfig,
  isUnifiedConfig,
} from '../../../../src/core/yaml/index.js'

describe('YAML Configuration Utilities', () => {
  let tempDir: string

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-yaml-test-'))
  })

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  /**
   * Helper to write a YAML config file
   */
  async function writeConfig(filename: string, content: string): Promise<string> {
    const filepath = path.join(tempDir, filename)
    await fs.writeFile(filepath, content, 'utf-8')
    return filepath
  }

  describe('readCodexConfig', () => {
    it('should read a simple flat config', async () => {
      const configPath = await writeConfig('config.yaml', `
organization: myorg
project: myproject
cacheDir: .cache
`)
      const config = await readCodexConfig(configPath)
      expect(config.organization).toBe('myorg')
      expect(config.project).toBe('myproject')
      expect(config.cacheDir).toBe('.cache')
    })

    it('should read a unified config with codex section', async () => {
      const configPath = await writeConfig('config.yaml', `
codex:
  organization: unified-org
  project: unified-project
file:
  sources: []
`)
      const config = await readCodexConfig(configPath)
      expect(config.organization).toBe('unified-org')
      expect(config.project).toBe('unified-project')
    })

    it('should expand environment variables by default', async () => {
      process.env.TEST_ORG = 'env-org'
      const configPath = await writeConfig('config.yaml', `
organization: \${TEST_ORG}
`)
      const config = await readCodexConfig(configPath)
      expect(config.organization).toBe('env-org')
      delete process.env.TEST_ORG
    })

    it('should not expand environment variables when disabled', async () => {
      process.env.TEST_ORG = 'env-org'
      const configPath = await writeConfig('config.yaml', `
organization: \${TEST_ORG}
`)
      const config = await readCodexConfig(configPath, { expandEnv: false })
      expect(config.organization).toBe('${TEST_ORG}')
      delete process.env.TEST_ORG
    })

    it('should throw error if organization is missing', async () => {
      const configPath = await writeConfig('config.yaml', `
project: myproject
`)
      await expect(readCodexConfig(configPath)).rejects.toThrow('Invalid config: organization is required')
    })

    it('should throw error for non-existent file', async () => {
      await expect(readCodexConfig('/nonexistent/config.yaml')).rejects.toThrow()
    })

    it('should read config with storage providers', async () => {
      const configPath = await writeConfig('config.yaml', `
organization: myorg
storage:
  - type: github
    branch: main
  - type: local
    basePath: ./data
`)
      const config = await readCodexConfig(configPath)
      expect(config.storage).toHaveLength(2)
      expect(config.storage?.[0].type).toBe('github')
      expect(config.storage?.[1].type).toBe('local')
    })

    it('should read config with sync rules', async () => {
      const configPath = await writeConfig('config.yaml', `
organization: myorg
sync:
  bidirectional: true
  to_codex:
    include:
      - "docs/**/*.md"
    exclude:
      - "*.log"
`)
      const config = await readCodexConfig(configPath)
      expect(config.sync?.bidirectional).toBe(true)
      expect(config.sync?.to_codex?.include).toEqual(['docs/**/*.md'])
      expect(config.sync?.to_codex?.exclude).toEqual(['*.log'])
    })

    it('should use custom env object', async () => {
      const configPath = await writeConfig('config.yaml', `
organization: \${CUSTOM_ORG}
`)
      const customEnv = { CUSTOM_ORG: 'custom-org-value' }
      const config = await readCodexConfig(configPath, { env: customEnv })
      expect(config.organization).toBe('custom-org-value')
    })
  })

  describe('readUnifiedConfig', () => {
    it('should read full unified config including non-codex sections', async () => {
      const configPath = await writeConfig('config.yaml', `
codex:
  organization: myorg
file:
  sources:
    - name: docs
      path: ./docs
custom:
  key: value
`)
      const config = await readUnifiedConfig(configPath)
      expect(config.codex?.organization).toBe('myorg')
      expect(config.file?.sources).toHaveLength(1)
      expect(config.custom).toEqual({ key: 'value' })
    })

    it('should expand environment variables', async () => {
      process.env.FILE_PATH = '/custom/path'
      const configPath = await writeConfig('config.yaml', `
codex:
  organization: myorg
file:
  sources:
    - name: docs
      path: \${FILE_PATH}
`)
      const config = await readUnifiedConfig(configPath)
      expect(config.file?.sources?.[0].path).toBe('/custom/path')
      delete process.env.FILE_PATH
    })

    it('should handle config without codex section', async () => {
      const configPath = await writeConfig('config.yaml', `
other:
  key: value
`)
      const config = await readUnifiedConfig(configPath)
      expect(config.codex).toBeUndefined()
      expect(config.other).toEqual({ key: 'value' })
    })

    it('should throw error for non-existent file', async () => {
      await expect(readUnifiedConfig('/nonexistent/config.yaml')).rejects.toThrow()
    })

    it('should handle empty file', async () => {
      const configPath = await writeConfig('config.yaml', '')
      const config = await readUnifiedConfig(configPath)
      // js-yaml returns undefined for empty content
      expect(config).toBeUndefined()
    })
  })

  describe('isUnifiedConfig', () => {
    it('should return true for config with codex section', () => {
      expect(isUnifiedConfig({ codex: { organization: 'test' } })).toBe(true)
    })

    it('should return false for flat config', () => {
      expect(isUnifiedConfig({ organization: 'test' })).toBe(false)
    })

    it('should return false for null', () => {
      expect(isUnifiedConfig(null)).toBe(false)
    })

    it('should return false for non-object', () => {
      expect(isUnifiedConfig('string')).toBe(false)
      expect(isUnifiedConfig(123)).toBe(false)
      expect(isUnifiedConfig(undefined)).toBe(false)
    })

    it('should return false if codex is not an object', () => {
      expect(isUnifiedConfig({ codex: 'string' })).toBe(false)
      expect(isUnifiedConfig({ codex: null })).toBe(false)
    })
  })
})

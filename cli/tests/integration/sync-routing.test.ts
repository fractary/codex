/**
 * Integration tests for routing-aware sync
 *
 * Tests the complete flow from CLI command through routing scanner to sync execution
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createSyncManager, createLocalStorage } from '@fractary/codex'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('Routing-aware sync integration', () => {
  let tempDir: string
  let codexDir: string

  beforeEach(async () => {
    // Create temporary directories
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-integration-test-'))
    codexDir = path.join(tempDir, 'codex')
    await fs.mkdir(codexDir, { recursive: true })
  })

  afterEach(async () => {
    // Cleanup
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  it('should sync files from multiple projects using routing', async () => {
    // Setup: Create a mock codex repository with multiple projects
    const org = 'testorg'
    const targetProject = 'target-project'

    // Project A - has files that route to target
    await fs.mkdir(path.join(codexDir, org, 'project-a'), { recursive: true })
    await fs.writeFile(
      path.join(codexDir, org, 'project-a', 'standard.md'),
      '---\ncodex_sync_include: ["*"]\n---\n# Standard\n\nShared standard'
    )

    // Project B - has files that route to target-*
    await fs.mkdir(path.join(codexDir, org, 'project-b'), { recursive: true })
    await fs.writeFile(
      path.join(codexDir, org, 'project-b', 'api.md'),
      '---\ncodex_sync_include: ["target-*"]\n---\n# API\n\nAPI Documentation'
    )

    // Project C - has files that DON'T route to target
    await fs.mkdir(path.join(codexDir, org, 'project-c'), { recursive: true })
    await fs.writeFile(
      path.join(codexDir, org, 'project-c', 'private.md'),
      '---\ncodex_sync_include: ["other-*"]\n---\n# Private\n\nPrivate doc'
    )

    // Target project directory - has existing file
    await fs.mkdir(path.join(codexDir, org, targetProject), { recursive: true })
    await fs.writeFile(
      path.join(codexDir, org, targetProject, 'readme.md'),
      '---\ncodex_sync_include: ["*"]\n---\n# Target\n\nTarget project'
    )

    // Create sync manager
    const localStorage = createLocalStorage({ baseDir: tempDir })
    const syncManager = createSyncManager({
      localStorage,
      config: {
        defaultDirection: 'from-codex',
        rules: [],
        defaultExcludes: [],
        deleteOrphans: false,
        conflictStrategy: 'newest',
      },
    })

    // Execute routing-aware sync
    const plan = await syncManager.createRoutingAwarePlan(
      org,
      targetProject,
      codexDir,
      { direction: 'from-codex' }
    )

    // Verify results
    expect(plan.routingScan).toBeDefined()
    expect(plan.routingScan!.files.length).toBeGreaterThan(0)

    // Should find files from project-a (wildcard) and project-b (target-*)
    // Should NOT find files from project-c (doesn't match)
    const sourceProjects = plan.routingScan!.stats.sourceProjects
    expect(sourceProjects).toContain('project-a')
    expect(sourceProjects).toContain('project-b')
    expect(sourceProjects).not.toContain('project-c')

    // Should find at least 3 files (standard.md, api.md, readme.md)
    expect(plan.routingScan!.stats.totalMatched).toBeGreaterThanOrEqual(3)

    // Verify scan statistics
    expect(plan.routingScan!.stats.totalScanned).toBeGreaterThan(0)
    expect(plan.routingScan!.stats.durationMs).toBeGreaterThan(0)
  })

  it('should respect exclude patterns in routing', async () => {
    const org = 'testorg'
    const targetProject = 'target-project'

    await fs.mkdir(path.join(codexDir, org, 'project-a'), { recursive: true })

    // File with include and exclude
    await fs.writeFile(
      path.join(codexDir, org, 'project-a', 'file.md'),
      '---\ncodex_sync_include: ["*"]\ncodex_sync_exclude: ["target-*"]\n---\nContent'
    )

    const localStorage = createLocalStorage({ baseDir: tempDir })
    const syncManager = createSyncManager({
      localStorage,
      config: {
        defaultDirection: 'from-codex',
        rules: [],
        defaultExcludes: [],
        deleteOrphans: false,
        conflictStrategy: 'newest',
      },
    })

    const plan = await syncManager.createRoutingAwarePlan(
      org,
      targetProject,
      codexDir,
      { direction: 'from-codex' }
    )

    // Should be excluded despite wildcard include
    expect(plan.routingScan!.stats.totalMatched).toBe(0)
  })

  it('should track files from multiple source projects', async () => {
    const org = 'testorg'
    const targetProject = 'lake-project'

    // Create files in 5 different projects
    for (let i = 1; i <= 5; i++) {
      await fs.mkdir(path.join(codexDir, org, `proj-${i}`), { recursive: true })
      await fs.writeFile(
        path.join(codexDir, org, `proj-${i}`, 'doc.md'),
        '---\ncodex_sync_include: ["lake-*", "api-*"]\n---\nShared doc'
      )
    }

    const localStorage = createLocalStorage({ baseDir: tempDir })
    const syncManager = createSyncManager({
      localStorage,
      config: {
        defaultDirection: 'from-codex',
        rules: [],
        defaultExcludes: [],
        deleteOrphans: false,
        conflictStrategy: 'newest',
      },
    })

    const plan = await syncManager.createRoutingAwarePlan(
      org,
      targetProject,
      codexDir,
      { direction: 'from-codex' }
    )

    // Should find files from all 5 projects
    expect(plan.routingScan!.stats.sourceProjects.length).toBe(5)
    expect(plan.routingScan!.stats.totalMatched).toBe(5)

    // All should match lake-* pattern
    for (let i = 1; i <= 5; i++) {
      expect(plan.routingScan!.stats.sourceProjects).toContain(`proj-${i}`)
    }
  })

  it('should handle empty codex gracefully', async () => {
    const org = 'testorg'
    const targetProject = 'target-project'

    // Empty codex directory
    await fs.mkdir(path.join(codexDir, org), { recursive: true })

    const localStorage = createLocalStorage({ baseDir: tempDir })
    const syncManager = createSyncManager({
      localStorage,
      config: {
        defaultDirection: 'from-codex',
        rules: [],
        defaultExcludes: [],
        deleteOrphans: false,
        conflictStrategy: 'newest',
      },
    })

    const plan = await syncManager.createRoutingAwarePlan(
      org,
      targetProject,
      codexDir,
      { direction: 'from-codex' }
    )

    // Should return empty results
    expect(plan.routingScan!.files.length).toBe(0)
    expect(plan.routingScan!.stats.totalMatched).toBe(0)
    expect(plan.totalFiles).toBe(0)
  })

  it('should provide file metadata for synced files', async () => {
    const org = 'testorg'
    const targetProject = 'target-project'

    await fs.mkdir(path.join(codexDir, org, 'proj-a'), { recursive: true })
    const content = '---\ncodex_sync_include: ["*"]\n---\n# Test\n\nContent here'
    await fs.writeFile(path.join(codexDir, org, 'proj-a', 'test.md'), content)

    const localStorage = createLocalStorage({ baseDir: tempDir })
    const syncManager = createSyncManager({
      localStorage,
      config: {
        defaultDirection: 'from-codex',
        rules: [],
        defaultExcludes: [],
        deleteOrphans: false,
        conflictStrategy: 'newest',
      },
    })

    const plan = await syncManager.createRoutingAwarePlan(
      org,
      targetProject,
      codexDir,
      { direction: 'from-codex' }
    )

    expect(plan.routingScan!.files.length).toBe(1)

    const file = plan.routingScan!.files[0]!
    expect(file.path).toBeDefined()
    expect(file.size).toBeGreaterThan(0)
    expect(file.hash).toBeDefined()
    expect(file.metadata.codex_sync_include).toEqual(['*'])
    expect(file.sourceProject).toBe('proj-a')
  })
})

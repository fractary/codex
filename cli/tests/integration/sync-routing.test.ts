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

    // Should find exactly 2 files (standard.md from project-a, api.md from project-b)
    // Note: readme.md from target-project is excluded due to preventSelfSync rule
    expect(plan.routingScan!.stats.totalMatched).toBe(2)

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

  it('should clone codex repository to temp directory and scan it', async () => {
    // This test verifies the new temp clone functionality
    // Note: Using execSync with controlled inputs (no user data) for test git operations
    const { execSync } = await import('child_process')

    // Create a mock git repository
    const gitRepoDir = path.join(tempDir, 'mock-codex.git')
    await fs.mkdir(gitRepoDir, { recursive: true })

    // Initialize git repo (all inputs are hardcoded, not user-provided)
    execSync('git init', { cwd: gitRepoDir, stdio: 'pipe' })
    execSync('git config user.email "test@test.com"', { cwd: gitRepoDir, stdio: 'pipe' })
    execSync('git config user.name "Test User"', { cwd: gitRepoDir, stdio: 'pipe' })

    // Create test files with routing metadata
    const org = 'testorg'
    await fs.mkdir(path.join(gitRepoDir, org, 'project-a'), { recursive: true })
    await fs.writeFile(
      path.join(gitRepoDir, org, 'project-a', 'doc.md'),
      '---\ncodex_sync_include: ["target-*"]\n---\n# Doc\n\nContent'
    )

    await fs.mkdir(path.join(gitRepoDir, org, 'project-b'), { recursive: true })
    await fs.writeFile(
      path.join(gitRepoDir, org, 'project-b', 'guide.md'),
      '---\ncodex_sync_include: ["*"]\n---\n# Guide\n\nGuide content'
    )

    // Commit files
    execSync('git add .', { cwd: gitRepoDir, stdio: 'pipe' })
    execSync('git commit -m "Initial commit"', { cwd: gitRepoDir, stdio: 'pipe' })
    execSync('git branch -M main', { cwd: gitRepoDir, stdio: 'pipe' })

    // Create temp clone path
    const testTempPath = path.join(os.tmpdir(), 'test-fractary-codex-clone', org, 'mock-codex.git')

    // Clean up any existing clone
    try {
      await fs.rm(testTempPath, { recursive: true, force: true })
    } catch {}

    // Clone using git directly (simulating what ensureCodexCloned does)
    await fs.mkdir(path.dirname(testTempPath), { recursive: true })
    // Using file:// protocol with controlled path (no user input)
    execSync(`git clone --depth 1 --branch main "file://${gitRepoDir}" "${testTempPath}"`, { stdio: 'pipe' })

    // Verify the clone exists
    const gitDirExists = await fs.access(path.join(testTempPath, '.git'))
      .then(() => true)
      .catch(() => false)
    expect(gitDirExists).toBe(true)

    // Create sync manager and test routing scan on cloned repo
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

    // Run routing-aware sync on the cloned repository
    const plan = await syncManager.createRoutingAwarePlan(
      org,
      'target-project',
      testTempPath,  // Use the cloned temp directory
      { direction: 'from-codex' }
    )

    // Verify results
    expect(plan.routingScan).toBeDefined()
    expect(plan.routingScan!.files.length).toBeGreaterThan(0)

    // Should find files from both projects
    const sourceProjects = plan.routingScan!.stats.sourceProjects
    expect(sourceProjects).toContain('project-a')  // Has target-* pattern
    expect(sourceProjects).toContain('project-b')  // Has * pattern

    // Should find exactly 2 files
    expect(plan.routingScan!.stats.totalMatched).toBe(2)

    // Cleanup
    await fs.rm(testTempPath, { recursive: true, force: true })
  })
})

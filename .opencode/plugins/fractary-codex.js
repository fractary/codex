import fs from 'fs'
import path from 'path'
import os from 'os'

/**
 * Fractary Codex plugin for OpenCode.
 *
 * Registers skill directories so OpenCode discovers all Fractary Codex skills,
 * and injects a system-level note about CLI availability.
 *
 * Skills are found in order of preference:
 *   1. Local monorepo (plugins/codex/.claude-plugin exists in ancestor dir)
 *   2. Claude marketplace install (~/.claude/plugins/marketplaces/fractary-codex)
 */

const PLUGIN_NAMES = ['codex']
const MARKETPLACE_PATH = path.join(
  os.homedir(),
  '.claude',
  'plugins',
  'marketplaces',
  'fractary-codex',
)

export const FractaryCodexPlugin = async ({ directory }) => {
  const pluginRoot = findPluginRoot(directory)

  return {
    config: async (config) => {
      config.skills = config.skills || {}
      config.skills.paths = config.skills.paths || []

      for (const name of PLUGIN_NAMES) {
        const skillsDir = path.join(pluginRoot, 'plugins', name, 'skills')
        if (fs.existsSync(skillsDir)) {
          config.skills.paths.push(skillsDir)
        }
      }
    },

    'experimental.chat.system.transform': async (_input, output) => {
      output.system.push(
        [
          'You have access to the `fractary-codex` CLI for knowledge management,',
          'document fetching, caching, and project-to-codex synchronization.',
          'Fractary Codex skills are loaded and available for reference.',
          'Configuration is at `.fractary/config.yaml`.',
          '',
          'Key CLI commands:',
          '- `fractary-codex fetch <uri>` — Fetch a document by codex:// URI',
          '- `fractary-codex cache list|clear|stats|health` — Manage document cache',
          '- `fractary-codex sync [--to-codex|--from-codex] [--work-id <id>]` — Sync with codex repository',
          '- `fractary-codex config-init|config-update|config-validate` — Manage configuration',
          '',
          'Run `fractary-codex --help` for full usage.',
        ].join('\n'),
      )
    },
  }
}

/** Walk up from the working directory looking for the monorepo marker. */
function findMonorepoRoot(dir) {
  let current = dir
  while (current !== path.dirname(current)) {
    if (
      fs.existsSync(path.join(current, 'plugins', 'codex', '.claude-plugin'))
    ) {
      return current
    }
    current = path.dirname(current)
  }
  return null
}

/**
 * Resolve the root directory containing the plugins/ tree.
 *
 * Prefers the local monorepo (developer working in fractary-codex itself),
 * falls back to the Claude marketplace install path.
 */
function findPluginRoot(directory) {
  const monorepo = findMonorepoRoot(directory)
  if (monorepo) return monorepo

  if (fs.existsSync(path.join(MARKETPLACE_PATH, 'plugins', 'codex'))) {
    return MARKETPLACE_PATH
  }

  return directory
}

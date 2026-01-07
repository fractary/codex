import { defineConfig, Options } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: ['cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  noExternal: [/@fractary\/codex/, 'commander', 'js-yaml', 'micromatch', 'zod'],
  onSuccess: async () => {
    // Add shebang to CLI file after build
    const { readFileSync, writeFileSync } = await import('fs')
    const cliPath = 'dist/cli.cjs'
    const content = readFileSync(cliPath, 'utf-8')
    if (!content.startsWith('#!/usr/bin/env node')) {
      writeFileSync(cliPath, '#!/usr/bin/env node\n' + content)
    }
  },
})

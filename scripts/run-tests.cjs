const { readdirSync } = require('node:fs')
const { join, relative, resolve } = require('node:path')
const { spawnSync } = require('node:child_process')

const sourceRoot = resolve(__dirname, '../src')
const outputRoot = resolve(__dirname, '../dist')
const discover = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name)
  if (entry.isDirectory()) return discover(path)
  return entry.name.endsWith('.test.ts')
    ? [join(outputRoot, relative(sourceRoot, path)).replace(/\.ts$/, '.js')]
    : []
})

// tsc retains output for deleted sources. Only run tests that still have source.
const tests = discover(join(sourceRoot, 'tests')).sort()
if (!tests.length) throw new Error('No source tests found.')
const result = spawnSync(process.execPath, ['--test', ...process.argv.slice(2), ...tests], {
  stdio: 'inherit', cwd: resolve(__dirname, '..'),
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1

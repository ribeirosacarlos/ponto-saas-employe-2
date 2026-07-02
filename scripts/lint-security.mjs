import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('../src/', import.meta.url))
const checks = [
  {
    name: 'auth localStorage persistence',
    matcher: (file, content) =>
      /localStorage\.(setItem|getItem)/.test(content) && /(auth_token|affiliate:token|auth_user|auth_roles)/.test(content),
    allow: [],
  },
  {
    name: 'token in URL usage',
    matcher: (file, content) => /\bparams\.get\(['"]token['"]\)|[?&]token=/.test(content),
    allow: [],
  },
]

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    const stats = statSync(full)
    if (stats.isDirectory()) return walk(full)
    return [full]
  })
}

const files = walk(root).filter((file) => /\.(js|jsx|ts|tsx)$/.test(file))
const failures = []

for (const file of files) {
  const content = readFileSync(file, 'utf8')
  for (const check of checks) {
    if (check.matcher(file, content)) {
      failures.push(`${check.name}: ${file}`)
    }
  }
}

if (failures.length) {
  console.error('Security lint failed:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('Security lint passed.')

import * as path from 'path'
import * as fs from 'fs'

export function isWithinDir(target: string, baseDir: string): boolean {
  const resolved = path.resolve(target)
  const base = path.resolve(baseDir)
  return resolved.startsWith(base + path.sep) || resolved === base
}

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function assertPathSafety(target: string, allowedDirs: string[]): void {
  const resolved = path.resolve(target)
  const safe = allowedDirs.some((d) => isWithinDir(resolved, path.resolve(d)))
  if (!safe) {
    throw new Error(`Path not allowed: ${target}. Allowed: ${allowedDirs.join(', ')}`)
  }
}

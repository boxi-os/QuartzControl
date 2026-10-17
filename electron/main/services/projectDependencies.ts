// The npm packages a project's package.json names and its node_modules does not hold. A clone of a
// project has none of them - node_modules is never committed - and every Quartz call then dies on
// its first import with Node's stack trace: "Jetzt bauen", the dev server and "Aus quartz.lock.json
// wiederherstellen", the button the app names for exactly this case, while the overview said
// "Alles ok" (alpha scenes 2026-10-17, finding 4.1). "Missing" is answered here, before the call,
// so it gets a sentence of its own instead of the trace that "broken" would produce.
import { readFile } from 'fs/promises'
import { join } from 'path'
import { hasNodeModule } from './templatePackage/shared'

/**
 * The names of the missing ones, in package.json's order; empty when all are there. Null when
 * package.json cannot be read - that is "cannot tell", not "nothing missing", and the callers then
 * leave the question to npm and Quartz as before.
 */
export async function missingDependencies(projectPath: string): Promise<string[] | null> {
  let deps: Record<string, unknown>
  try {
    const manifest = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8')) as { dependencies?: unknown }
    deps = manifest.dependencies && typeof manifest.dependencies === 'object' ? (manifest.dependencies as Record<string, unknown>) : {}
  } catch {
    return null
  }
  return Object.keys(deps).filter((name) => !hasNodeModule(projectPath, name))
}

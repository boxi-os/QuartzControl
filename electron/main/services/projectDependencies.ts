// The npm packages a project's package.json names and its node_modules does not hold. A clone of a
// project has none of them - node_modules is never committed - and every Quartz call then dies on
// its first import with Node's stack trace: "Jetzt bauen", the dev server and "Aus quartz.lock.json
// wiederherstellen", the button the app names for exactly this case, while the overview said
// "Alles ok" (alpha scenes 2026-10-17, finding 4.1). "Missing" is answered here, before the call,
// so it gets a sentence of its own instead of the trace that "broken" would produce.
import { existsSync, readFileSync } from 'fs'
import { readFile } from 'fs/promises'
import { basename, dirname, join } from 'path'
import { hasNodeModule } from './templatePackage/shared'
import { readConfig } from './configService'
import { ownFramePath } from './framePaths'

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

/**
 * The first package in `name`'s dependency tree whose folder is there without a readable
 * package.json, or null when every folder found is whole. That is the state npm leaves while it
 * unpacks: it makes all package folders within half a second and fills them over the whole
 * download. Asked before the main process requires a project's package, because Node remembers a
 * missing package.json for the life of the process: one `require('sass')` in that window, and sass
 * stayed "not installed" after npm had finished, until QuartzControl was restarted - for sass's own
 * folder and for one of its dependencies alike (alpha scene 7, finding 7.1, measured under Node
 * 26.5.1 and Electron's Node). A folder that is not there at all is not remembered, and is left to
 * the require. Lookup as Node's: the package's own node_modules, then each one above it.
 */
export function halfUnpackedModule(projectPath: string, name: string): string | null {
  const seen = new Set<string>()
  const queue = [{ name, from: projectPath }]
  for (let next = queue.shift(); next; next = queue.shift()) {
    const dir = moduleDir(projectPath, next.from, next.name)
    if (!dir || seen.has(dir)) continue
    seen.add(dir)
    let manifest: { dependencies?: Record<string, unknown>; optionalDependencies?: Record<string, unknown> }
    try {
      manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'))
    } catch {
      return next.name
    }
    for (const dep of Object.keys({ ...manifest.dependencies, ...manifest.optionalDependencies })) queue.push({ name: dep, from: dir })
  }
  return null
}

function moduleDir(projectPath: string, from: string, name: string): string | null {
  for (let dir = from; ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', name)
    if (basename(dir) !== 'node_modules' && existsSync(candidate)) return candidate
    if (dir === projectPath || dirname(dir) === dir) return null
  }
}

const AUTHORED_FRAME = /[\\/]\.quartz-gui[\\/]authored-frames[\\/]/

/**
 * The config entries that name an authored frame whose directory is not there. A clone has none of
 * its frames: they live under .quartz-gui/, which .gitignore keeps out of the repository, and the
 * config names them by the first machine's absolute path. `quartz plugin install` then reported
 * "local path missing" and ended with 0, the build was green and the site lost its layout, while
 * the overview said "Alles ok" and only the layout page named the frame (alpha scenes 2026-10-17,
 * finding 2.1). A frame copied into this project's .quartz-gui/ is not missing even while the
 * config still names the other path; the build door repoints it. Null when the config cannot be read; the overview says that one on its own.
 */
export async function missingAuthoredFrames(projectPath: string): Promise<string[] | null> {
  let plugins: { name: string; source?: unknown }[]
  try {
    plugins = (await readConfig(projectPath)).plugins ?? []
  } catch {
    return null
  }
  return plugins
    .filter((p) => typeof p.source === 'string' && AUTHORED_FRAME.test(p.source) && !existsSync(p.source))
    // copied over by hand: still named by the other machine's path, repointed at the build door
    .filter((p) => ownFramePath(projectPath, p.source as string) === null)
    .map((p) => p.name)
}

import { createHash } from 'crypto'
import { existsSync } from 'fs'
import { readFile, readdir, rename, writeFile } from 'fs/promises'
import { join, relative } from 'path'
import type { DeployDiffEntry } from '@shared/ipc-contract'
import { quartzGuiDir, quartzGuiPath } from '../projectDirs'

// Path relative to the build directory -> sha256 hex digest: what this app last deployed *to one
// target*. Per target, not per project - the shared file this replaced meant that after deploying
// to A the manifest already matched the current build, so the diff for B came back empty and B
// silently received nothing. There is no cheap way to ask a remote what it holds (rsync being the
// exception, which is why it skips this file entirely), so "what we last sent there" is the best
// answer available.
type Manifest = Record<string, string>

// Read path (see projectDirs' quartzGuiPath): readManifest runs on the Uebersicht and on opening
// Veroeffentlichen, and quartzGuiDir() would create the directory and its .gitignore entry there.
function manifestPath(projectPath: string, targetId: string): string {
  return quartzGuiPath(projectPath, `deploy-manifest-${targetId}.json`)
}

function legacyManifestPath(projectPath: string): string {
  return quartzGuiPath(projectPath, 'deploy-manifest.json')
}

export async function readManifest(projectPath: string, targetId: string): Promise<Manifest> {
  try {
    return JSON.parse(await readFile(manifestPath(projectPath, targetId), 'utf-8')) as Manifest
  } catch {
    // There was exactly one manifest before the split, and in practice one profile. It is adopted
    // by whichever target asks first and renamed in the process, so the second target starts from
    // an empty manifest (i.e. a full upload) rather than inheriting someone else's state.
    const legacy = legacyManifestPath(projectPath)
    if (existsSync(legacy)) {
      await rename(legacy, manifestPath(projectPath, targetId)).catch(() => {})
      try {
        return JSON.parse(await readFile(manifestPath(projectPath, targetId), 'utf-8')) as Manifest
      } catch {
        return {}
      }
    }
    return {}
  }
}

async function writeManifest(projectPath: string, targetId: string, manifest: Manifest): Promise<void> {
  await writeFile(join(quartzGuiDir(projectPath), `deploy-manifest-${targetId}.json`), JSON.stringify(manifest, null, 2), 'utf-8')
}

async function walkFiles(dir: string, base = dir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const results: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) results.push(...(await walkFiles(full, base)))
    else results.push(relative(base, full))
  }
  return results
}

async function hashFile(path: string): Promise<string> {
  return createHash('sha256').update(await readFile(path)).digest('hex')
}

export async function buildCurrentManifest(buildDir: string): Promise<Manifest> {
  const files = await walkFiles(buildDir)
  const manifest: Manifest = {}
  await Promise.all(
    files.map(async (relPath) => {
      manifest[relPath.split('\\').join('/')] = await hashFile(join(buildDir, relPath))
    })
  )
  return manifest
}

export async function diffAgainstManifest(projectPath: string, targetId: string, buildDir: string): Promise<DeployDiffEntry[]> {
  const previous = await readManifest(projectPath, targetId)
  const current = await buildCurrentManifest(buildDir)
  const entries: DeployDiffEntry[] = []
  for (const [path, hash] of Object.entries(current)) {
    if (!(path in previous)) entries.push({ path, status: 'added' })
    else if (previous[path] !== hash) entries.push({ path, status: 'changed' })
  }
  for (const path of Object.keys(previous)) {
    if (!(path in current)) entries.push({ path, status: 'removed' })
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path))
}

export async function commitManifest(
  projectPath: string,
  targetId: string,
  buildDir: string,
  excludePaths: string[]
): Promise<void> {
  const current = await buildCurrentManifest(buildDir)
  const excluded = new Set(excludePaths)
  const previous = await readManifest(projectPath, targetId)
  const next: Manifest = {}
  for (const [path, hash] of Object.entries(current)) {
    // an excluded file was never actually uploaded/deleted this run, so its manifest entry must
    // reflect that: carry over its previous entry unchanged, or - if it has none (new file,
    // excluded on its very first appearance) - omit it entirely rather than falling through to
    // the current hash, which would wrongly mark a never-uploaded file as up to date.
    if (excluded.has(path)) {
      if (path in previous) next[path] = previous[path]
      continue
    }
    next[path] = hash
  }
  // a removed-but-excluded file was never actually deleted remotely either, so it must be carried
  // forward too - the loop above only ever visits paths still present in `current`, so a file
  // that no longer exists locally would otherwise vanish from the manifest outright, and the next
  // diff would forget it was ever deployed at all instead of continuing to offer its removal.
  for (const path of Object.keys(previous)) {
    if (!(path in current) && excluded.has(path)) next[path] = previous[path]
  }
  await writeManifest(projectPath, targetId, next)
}

// Splits a diff into the two lists every file-transfer adapter needs, plus the set that has to be
// treated as "not acted on" when the manifest is committed.
//
// That third list is the whole reason this returns an object rather than two arrays. There are now
// *two* ways a removal can fail to happen: the user unticked the file, or the target has deletion
// switched off entirely. commitManifest only knows about explicit exclusions, so with
// deleteRemoved: false a file that vanished locally dropped out of the manifest as though it had
// been deleted remotely - it is still on the server, and no later run would ever offer to remove
// it, not even after switching deletion back on. Reproduced against real files before this fix.
export function partitionDiff(
  diff: DeployDiffEntry[],
  excludePaths: string[],
  deleteRemoved: boolean
): { toUpload: string[]; toDelete: string[]; manifestExcludes: string[] } {
  const excluded = new Set(excludePaths)
  const removable = diff.filter((e) => e.status === 'removed' && !excluded.has(e.path)).map((e) => e.path)
  return {
    toUpload: diff.filter((e) => e.status !== 'removed' && !excluded.has(e.path)).map((e) => e.path),
    toDelete: deleteRemoved ? removable : [],
    manifestExcludes: deleteRemoved ? excludePaths : [...excludePaths, ...removable]
  }
}

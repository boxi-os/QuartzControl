import { readdir, readlink, rm, symlink } from 'fs/promises'
import { existsSync } from 'fs'
import { isAbsolute, join, relative, resolve, sep } from 'path'
import type { PluginEntry } from '@shared/ipc-contract'
import { readConfig, writeConfig } from './configService'
import { readLockfile } from './pluginService'
import { writeJsonFile } from './jsonStore'

// An authored frame is a plugin whose source is an absolute path into the project it was authored
// in (see layoutFrameService), and three places record that path: the plugin entry's `source` in
// quartz.config.yaml, `source` and `resolved` in quartz.lock.json, and the symlink
// `.quartz/plugins/<id>` that `quartz plugin add` laid down.
//
// Two operations move a project's folder out from under those three, and both used to leave them
// pointing at the old location:
//
//   * **Duplizieren** copies them verbatim, so the copy kept building from the *original's* frame
//     directories: an edit made in the copy went to its own authored-frames/ (saveFrame sees the
//     directory, considers the frame registered and never re-adds it) and appeared in no build,
//     while every edit in the original showed up in the copy, and deleting a frame there broke the
//     copy's build.
//   * **Umbenennen/Verschieben** (`projects.relocate`) keeps the project id and moves the row - and
//     left every one of those three paths naming a folder that no longer exists. Measured on the
//     example project: all three frames dead and the next `quartz plugin add` failing with ENOENT
//     on the old path, while the layout editor went on listing the frames, because it reads them
//     from `.quartz-gui/authored-frames/` and never asks whether anything still points there
//     (BEFUNDE 8).
//
// Rewritten is every path that lies inside the old project folder, not only the frames: a plugin
// installed from somewhere else on disk means the same thing in both places and stays as it is.
//
// This used to go on to claim that nothing else in a project holds its own absolute path, measured
// by grepping `.quartz-gui/` for the project's location. The grep was the wrong instrument and the
// claim was wrong with it; what it missed, and what to do about it, is at repointAuthoredFrames.
export async function repointProjectPaths(from: string, to: string): Promise<void> {
  await rewriteRecordedPaths(to, (path) => {
    if (!isAbsolute(path)) return null
    const abs = resolve(path)
    const rel = relative(resolve(from), abs)
    const inside = rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
    return inside ? join(to, rel) : null
  })
}

// The same three places, driven by the pattern instead of by a prefix - for the case where there
// is no `from` to compute one from.
//
// A snapshot is not exempt from holding the project's own path, which is what the comment above
// used to claim on the strength of a grep: the store is a git object database, and grep reads
// nothing in a zlib-compressed object. Asked properly (`git grep` per ref against the project's
// own location, quartz.config.yaml and quartz.lock.json only), two real projects answered: 8 of 8
// snapshots in one and 6 of 7 in the other carry the path in the config, 6 of 8 and 2 of 7 in the
// lockfile. Those are exactly the entries repointProjectPaths rewrites, frozen at the moment of
// the recording - so renaming a project, having its frames repaired, and then restoring any older
// snapshot puts the dead paths straight back, with the symlinks under .quartz/plugins/ (which no
// snapshot holds, `/.quartz/` is excluded) still pointing at the right place. Every frame dead,
// the next `quartz plugin add` failing with ENOENT, and the layout editor listing the frames as
// though nothing were wrong, because it reads them from .quartz-gui/authored-frames/.
//
// Driven by the pattern rather than by a recorded path, because the frame id *is* the identity:
// an authored frame lives at <project>/.quartz-gui/authored-frames/<id> and nowhere else, so a
// source ending in that and starting somewhere else is a source that means this project's frame.
// Only rewritten when the frame is actually here - a path this cannot back up is left alone
// rather than pointed at nothing.
const FRAME_MARKER = `${sep}${join('.quartz-gui', 'authored-frames')}${sep}`

export async function repointAuthoredFrames(projectPath: string): Promise<void> {
  await rewriteRecordedPaths(projectPath, (path) => {
    if (!isAbsolute(path)) return null
    const abs = resolve(path)
    const at = abs.indexOf(FRAME_MARKER)
    if (at === -1) return null
    if (resolve(abs.slice(0, at)) === resolve(projectPath)) return null // already ours
    const next = join(projectPath, abs.slice(at + 1))
    return existsSync(next) ? next : null
  })
}

// The three places that record an absolute path into a project: the plugin entry's `source` in
// quartz.config.yaml, `source` and `resolved` per entry in quartz.lock.json, and the symlink
// .quartz/plugins/<id>. `rewrite` gets each one and answers with its replacement or null.
async function rewriteRecordedPaths(
  to: string,
  rewrite: (path: string) => string | null
): Promise<void> {
  // A folder with no config is not a Quartz project (yet): a relocate to one is the user's
  // business, and there is nothing here to repair.
  if (!existsSync(join(to, 'quartz.config.yaml'))) return

  const config = await readConfig(to)
  let configChanged = false
  const plugins: PluginEntry[] = config.plugins.map((entry) => {
    if (typeof entry.source !== 'string') return entry
    const next = rewrite(entry.source)
    if (next === null) return entry
    configChanged = true
    return { ...entry, source: next }
  })
  // No snapshot: this is a repair that makes the project buildable again, not an edit anyone would
  // want to undo - and for a duplicate there is no snapshot store to write into yet.
  if (configChanged) await writeConfig(to, { ...config, plugins }, { snapshot: false })

  // A lockfile that cannot be read is not this operation's problem to solve - the project is no
  // worse off than before, and `quartz plugin install` is what reports it.
  const lock = await readLockfile(to).catch(() => null)
  const locked = lock?.plugins
  if (locked && typeof locked === 'object') {
    let lockChanged = false
    for (const entry of Object.values(locked as Record<string, unknown>)) {
      if (!entry || typeof entry !== 'object') continue
      for (const key of ['source', 'resolved'] as const) {
        const value = (entry as Record<string, unknown>)[key]
        if (typeof value !== 'string') continue
        const next = rewrite(value)
        if (next === null) continue
        ;(entry as Record<string, unknown>)[key] = next
        lockChanged = true
      }
    }
    if (lockChanged) await writeJsonFile(join(to, 'quartz.lock.json'), lock)
  }

  const pluginsDir = join(to, '.quartz', 'plugins')
  let entries
  try {
    entries = await readdir(pluginsDir, { withFileTypes: true })
  } catch {
    return // a project whose plugins were never installed
  }
  for (const entry of entries) {
    if (!entry.isSymbolicLink()) continue
    const link = join(pluginsDir, entry.name)
    // resolve() against the link's own directory, because a symlink may be relative - and readlink
    // on a dangling link still answers, which is exactly the case being repaired here.
    const next = rewrite(resolve(pluginsDir, await readlink(link)))
    if (next === null) continue
    await rm(link, { force: true })
    await symlink(next, link, 'dir')
  }
}

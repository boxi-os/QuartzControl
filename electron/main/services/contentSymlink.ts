import { lstat, readlink, rm, symlink } from 'fs/promises'
import { join } from 'path'

// git cannot write through a symbolic link, so every git operation that touches content/ fails
// outright while the content folder is symlinked into an Obsidian vault - which is one of this
// app's headline features. Verified against real git: a core update on such a project died with
// "error: 'content/.gitkeep' is beyond a symbolic link / fatal: stash failed", raw, in the output
// pane.
//
// Parking the link is safe because the vault is never the operation's business: whatever a Quartz
// upstream or an old snapshot holds under content/ belongs to a project that keeps its notes
// elsewhere. The link is removed (not the vault - `rm` on a symlink unlinks the link itself), git
// is free to populate a real content/ directory, and the finally throws that away and puts the
// link back.
//
// Shared by updateService (merge, merge --abort) and snapshotService (resetting the project's
// HEAD), which is why it lives here rather than in either of them: they already depend on each
// other in the other direction.
export async function withContentSymlinkParked<T>(projectPath: string, fn: () => Promise<T>): Promise<T> {
  const contentPath = join(projectPath, 'content')
  let target: string | null = null
  try {
    const stat = await lstat(contentPath)
    if (stat.isSymbolicLink()) target = await readlink(contentPath)
  } catch {
    // no content/ at all - nothing to park
  }
  if (target === null) return fn()

  await rm(contentPath)
  try {
    return await fn()
  } finally {
    await rm(contentPath, { recursive: true, force: true })
    await symlink(target, contentPath, 'dir')
  }
}

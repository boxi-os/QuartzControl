import { isAbsolute, join, resolve, sep } from 'path'
import { existsSync } from 'fs'

// An authored frame lives at <project>/.quartz-gui/authored-frames/<id> and nowhere else, so the
// id is its identity and the prefix in front of the marker is noise (see projectPaths.ts).
const FRAME_MARKER = `${sep}${join('.quartz-gui', 'authored-frames')}${sep}`

/**
 * The path of this project's own frame that `path` means, or null when it means nothing to
 * change: not a frame path, already this project's, or a frame this project does not have.
 *
 * The last one is the limit of the rule. A project that names another project's frame on purpose
 * keeps it - unless it has a frame with the same id itself, and then it is pointed at its own.
 * Ids are `frame-<timestamp>` or `frame-<name>` (`frame-editorial`), and the second kind can
 * repeat between projects; accepted, because naming another project's frame by absolute path is
 * what a copy does by accident and nobody does on purpose (forty-second review, finding 6).
 */
export function ownFramePath(projectPath: string, path: string): string | null {
  if (!isAbsolute(path)) return null
  const abs = resolve(path)
  const at = abs.indexOf(FRAME_MARKER)
  if (at === -1) return null
  if (resolve(abs.slice(0, at)) === resolve(projectPath)) return null // already ours
  const next = join(projectPath, abs.slice(at + 1))
  return existsSync(next) ? next : null
}

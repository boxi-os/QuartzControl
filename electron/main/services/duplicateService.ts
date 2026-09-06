// Copying a project is not `cp -r`. Four kinds of thing live inside a project folder and only two
// of them may travel:
//
//   * the project itself - quartz, its config, the stylesheets, the installed plugins, the git
//     repository. All of it comes along.
//   * the parts of .quartz-gui/ that *are* the design: the authored frames, the theme presets, the
//     breakpoints. Those come along too - without them the copy is not a copy.
//   * the parts of .quartz-gui/ that belong to the original's past or to its outside world: the
//     snapshot store and the set-aside content folders (its history) and publish-targets.json (its
//     destinations). Those stay behind. The targets matter most: the credentials behind them are
//     app-wide, so a copy that inherited them could overwrite the original's live website with the
//     first click on "Veröffentlichen" - by a person who thinks they are working on a copy.
//   * what is derived and large: node_modules and the build output. Reinstalled and rebuilt.
//
// The git repository is the one judgement call. It carries the original's own commits, which a
// "start at zero" reading would drop - but dropping it means `git init`, and an unrelated history
// makes the core update impossible: updateService merges FETCH_HEAD from jackyzha0/quartz, and git
// refuses to merge histories that share no commit. So the repository comes along and only `origin`
// is removed, exactly as createService does after cloning: a later Git-Sync push must never land in
// the original's remote.
import { cp, mkdir, readdir, symlink, writeFile, rm } from 'fs/promises'
import { existsSync } from 'fs'
import { basename, isAbsolute, join, relative, resolve } from 'path'
import type { DuplicateProjectOptions, DuplicateProjectResult } from '@shared/ipc-contract'
import { runCommand as run } from './runCommand'
import { contentDirPath } from './contentService'
import { readConfig, writeConfig } from './configService'
import { repointProjectPaths } from './projectPaths'
import { mainT } from '../i18n'

/** Relative to the project root. Everything else is copied. */
const SKIP = new Set([
  'node_modules',
  'public',
  'content',
  '.quartz-gui/snapshots.git',
  '.quartz-gui/content-backups',
  '.quartz-gui/publish-targets.json',
  '.quartz-gui/deploy-manifest.json',
  // The build output directory, and it is an absolute path pointing at where the *original*
  // exports its site. Inherited, the copy's first click on "Bauen" deleted that folder and wrote
  // itself into it, with no question asked: `quartz build --output` empties the directory first,
  // and buildOutputGuard answers `ok` for it because a folder holding index.html and static/ is
  // indistinguishable from this project's own previous build. The file has one key, so leaving it
  // behind loses nothing - a second key that *should* travel would need its own decision here.
  '.quartz-gui/project-prefs.json'
])

// Same reasoning as publish-targets.json, one level further: a deploy manifest records what is
// already lying on a particular server, keyed by the id of a target that stays behind. In the copy
// it is an orphan at best and a wrong answer to "what still has to be uploaded" at worst. Both
// names are listed - readManifest adopts a pre-split `deploy-manifest.json` for whichever target
// asks first, so a copy that inherited one would tell its new target that a server it has never
// uploaded to is already up to date, and the first deploy would leave that server empty.
//
// branch-worktree-<id> is not history but a leftover: a git worktree registered in the *original's*
// .git, left behind by a deploy that broke off. Copied, it is a directory whose .git file points
// into another project.
const SKIP_PREFIX = ['.quartz-gui/deploy-manifest-', '.quartz-gui/branch-worktree-']

// Neither direction of containment is allowed - the same check changeContentSource makes, and for
// the same reason: copying a folder into itself either loops or writes into what it is reading.
function contains(parent: string, child: string): boolean {
  const rel = relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}


export async function duplicateProject(options: DuplicateProjectOptions): Promise<DuplicateProjectResult> {
  const source = resolve(options.sourcePath)
  const target = resolve(options.targetDirectory)

  if (!existsSync(join(source, 'quartz.config.yaml'))) {
    return { success: false, output: mainT('duplicateSourceNotAProject', { path: source }) }
  }
  if (existsSync(target) && (await readdir(target)).length > 0) {
    return { success: false, output: mainT('createTargetExists', { path: target }) }
  }
  if (contains(source, target) || contains(target, source)) {
    return { success: false, output: mainT('duplicateNested') }
  }
  if (options.contentStrategy !== 'blank') {
    const from = options.contentSource ? resolve(options.contentSource) : ''
    if (!from || !existsSync(from)) {
      return { success: false, output: mainT('contentSourceMissing', { path: options.contentSource ?? '' }) }
    }
    if (contains(from, target)) {
      return { success: false, output: mainT('contentTargetInsideSource', { target }) }
    }
  }

  await mkdir(target, { recursive: true })
  await cp(source, target, {
    recursive: true,
    // A symlink is copied as a link, not as what it points at. Only `content` is one today, and
    // that one is skipped anyway - but a vault with links inside it would otherwise be duplicated
    // by value, which is the opposite of what a link means.
    verbatimSymlinks: true,
    filter: (from) => {
      const rel = relative(source, from)
      if (rel === '') return true
      if (SKIP.has(rel)) return false
      return !SKIP_PREFIX.some((prefix) => rel.startsWith(prefix))
    }
  })

  await repointProjectPaths(source, target)

  // The copy must not push where the original pushes. `remote remove` answers non-zero when there
  // is nothing to remove, which is not a failure here.
  await run('git', ['remote', 'remove', 'origin'], target)

  const contentPath = contentDirPath(target)
  await rm(contentPath, { recursive: true, force: true })
  if (options.contentStrategy === 'symlink') {
    await symlink(resolve(options.contentSource as string), contentPath, 'dir')
  } else if (options.contentStrategy === 'copy') {
    await mkdir(contentPath, { recursive: true })
    await cp(resolve(options.contentSource as string), contentPath, { recursive: true })
  } else {
    // Not an empty directory: quartz builds a site with no pages at all, and the first thing the
    // user then sees is a 404 on their own home page. One page with the project's name is a
    // starting point rather than a puzzle.
    await mkdir(contentPath, { recursive: true })
    await writeFile(
      join(contentPath, 'index.md'),
      `---\ntitle: ${basename(target)}\n---\n\n${mainT('duplicateBlankContent')}\n`,
      'utf-8'
    )
  }

  const install = await run('npm', ['install'], target)
  if (!install.success) {
    return { success: false, output: `${mainT('createInstallFailed')}\n${install.output}` }
  }

  return { success: true, output: install.output }
}

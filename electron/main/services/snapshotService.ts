import { existsSync } from 'fs'
import { lstat, mkdir, readdir, readFile, rename, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { spawn } from 'child_process'
import type {
  PluginActionResult,
  RestoreOptions,
  Snapshot,
  SnapshotFileChange,
  SnapshotKind,
  SnapshotSettings
} from '@shared/ipc-contract'
import { runCommand as run } from './runCommand'
import { quartzGuiDir, quartzGuiPath } from './projectDirs'
import { withContentSymlinkParked } from './contentSymlink'
import { repointAuthoredFrames } from './projectPaths'
import { mainT } from '../i18n'

// A snapshot store is a git repository of its own, pointed at the project as its work tree:
//
//   git --git-dir=<project>/.quartz-gui/snapshots.git --work-tree=<project>
//
// git is used here as a content-addressed store, not as the user's history. That is the whole
// point of the separation: the project's own repo (and everything Git-Sync pushes) stays
// untouched, while snapshots still get deduplication, real diffs between any two points, per-file
// restore and an export - none of which a directory of timestamped file copies can do. It also
// adds no dependency: a Quartz project is a git clone to begin with.
//
// Each snapshot is an independent *root* commit (no parent) kept alive by its own ref under
// refs/snapshots/. Deleting one is then a ref deletion rather than history surgery, and the order
// is the commit date rather than a chain. Identical trees and blobs are still shared, so fifty
// near-identical configs cost almost nothing - the problem the old "keep the newest 50 copies"
// pruning was working around.
const STORE_DIR = 'snapshots.git'
const REF_PREFIX = 'refs/snapshots/'
const SETTINGS_FILE = 'snapshot-settings.json'
const NUL = '\u0000'
const COALESCE_WINDOW = 15 * 60 * 1000

// Only the kinds that come from frequent, small saves - which is one kind, config saves. A core
// update, a plugin change, a content switch, a restore and a template import are each a
// deliberate, infrequent act that deserves its own point to go back to: collapsing two core
// updates (or two template imports) ten minutes apart into one would lose the state between them,
// which is the opposite of what a snapshot is for. 'styleChange' used to be in this set even
// though its only caller is the template import, which is precisely a one-shot act.
const COALESCING_KINDS = new Set<SnapshotKind>(['configChange'])

// Every operation below shares one git index, and git guards that index with an index.lock that
// a second process cannot take: measured, six concurrent `git add -A` runs leave five failing with
// "Unable to create index.lock". React's StrictMode makes that the normal case, not an edge case -
// it runs every page's mount effect twice, so the Backups page fires each of its calls twice at
// once. Worse than the failure was how it failed: diffSnapshot swallowed it and answered with an
// empty change list, i.e. "no differences from the current state".
//
// So every operation that touches the index runs in a per-project queue. The two pure reads
// (listSnapshots, getSettings) stay outside it - they read refs and a JSON file, take no lock, and
// are called from inside the locked operations, where waiting on the queue would deadlock.
const queues = new Map<string, Promise<unknown>>()

function serialize<T>(projectPath: string, operation: () => Promise<T>): Promise<T> {
  const previous = queues.get(projectPath) ?? Promise.resolve()
  const next = previous.then(operation, operation)
  // The stored tail must never reject, or every later operation would inherit that rejection.
  queues.set(
    projectPath,
    next.catch(() => undefined)
  )
  return next
}

// quartzGuiPath, not quartzGuiDir: listSnapshots() only looks whether a store exists, and it runs
// on the Uebersicht of every project - with the creating helper that read left an empty
// .quartz-gui/ and an edited .gitignore in a project nobody had snapshotted. ensureStore() creates.
function storePath(projectPath: string): string {
  return quartzGuiPath(projectPath, STORE_DIR)
}

function git(
  projectPath: string,
  args: string[],
  env?: Record<string, string>
): Promise<{ success: boolean; output: string }> {
  return run('git', ['--git-dir', storePath(projectPath), '--work-tree', projectPath, ...args], projectPath, env)
}

// Anything derived, huge, or belonging to another tool. `/.git/` is the critical one: to this git
// invocation the project's own repository is just a directory in the work tree, and without the
// rule the entire object database would be staged into every snapshot.
//
// `/.quartz-gui/` is excluded wholesale and the parts worth keeping are force-added back by
// stage(), because a project's own .gitignore already ignores that directory and an `info/exclude`
// negation cannot re-include what a .gitignore excluded (the .gitignore wins). Being explicit
// about which children come along also means the store can never end up inside itself.
const BASE_EXCLUDES = [
  '/node_modules/',
  '/public/',
  '/prof/',
  '/.quartz/',
  '/.quartz-cache/',
  '/.turbo/',
  '/.git/',
  '/.quartz-gui/',
  '/tsconfig.tsbuildinfo',
  '.DS_Store'
]

// Derived state about a *remote*, not the user's work: restoring an old manifest would only make
// the next deploy re-upload files the server already has.
function isSnapshotWorthy(entryName: string): boolean {
  if (entryName === STORE_DIR || entryName === SETTINGS_FILE) return false
  if (entryName === 'backups' || entryName === 'content-backups') return false
  // The dev server's own output, which buildService tails: transient, truncated at every start,
  // and nothing anyone would restore a project to.
  if (entryName === 'logs') return false
  return !entryName.startsWith('deploy-manifest-')
}

async function writeExcludes(projectPath: string, settings: SnapshotSettings): Promise<void> {
  const lines = [...BASE_EXCLUDES]
  if (!settings.includeContent) lines.push('/content/')
  const infoDir = join(storePath(projectPath), 'info')
  await mkdir(infoDir, { recursive: true })
  await writeFile(join(infoDir, 'exclude'), `${lines.join('\n')}\n`, 'utf-8')
}

async function ensureStore(projectPath: string): Promise<SnapshotSettings> {
  const store = storePath(projectPath)
  if (!existsSync(join(store, 'HEAD'))) {
    quartzGuiDir(projectPath) // the one creating call - and what writes the .gitignore rule
    await run('git', ['init', '--bare', '--quiet', store])
    // A bare repo refuses to use a work tree; everything else about "bare" (no checkout of its
    // own, no nested .git directory) is exactly what is wanted here.
    await run('git', ['--git-dir', store, 'config', 'core.bare', 'false'])
    await run('git', ['--git-dir', store, 'config', 'user.name', 'QuartzControl'])
    await run('git', ['--git-dir', store, 'config', 'user.email', 'snapshots@quartzcontrol.local'])
  }
  const settings = await getSettings(projectPath)
  await writeExcludes(projectPath, settings)
  return settings
}

async function stage(projectPath: string, settings: SnapshotSettings): Promise<void> {
  // Not silent: a failure here means the index does not describe the project, and every answer
  // derived from it - a diff above all - would be confidently wrong.
  const added = await git(projectPath, ['add', '-A'])
  if (!added.success) throw new Error(`${mainT('snapshotStageFailed')}\n${added.output}`)
  const entries = (await readdir(quartzGuiPath(projectPath))).filter(isSnapshotWorthy).map((name) => `.quartz-gui/${name}`)
  if (entries.length > 0) await git(projectPath, ['add', '-f', '--', ...entries])
  // An ignore rule only ever governs *untracked* files, so turning the content folder off left it
  // in the index and in every later snapshot - it had been added while the setting was still on.
  // The index therefore has to be told explicitly, on every staging run rather than only when the
  // setting changes, since the store's index outlives any one of them.
  if (!settings.includeContent) {
    await git(projectPath, ['rm', '-r', '--cached', '--quiet', '--ignore-unmatch', '--', 'content'])
  }
}

// ---------------------------------------------------------------------------------------------
// Settings

// The content folder is the one part whose value cannot be a constant. A real directory of markdown
// belongs in every snapshot; a symlink points at an Obsidian vault outside the project - and there
// the setting is not a default but a fact: **git does not follow symlinks**. Measured against a real
// store: with the switch on, the snapshot holds `120000 blob … content`, the link object, and not
// one note; changing a note in the vault afterwards leaves `diff-index` empty, so the comparison
// correctly reports no differences while the user believes their notes are backed up. That is a
// silent false promise about a backup, which is worse than no switch at all - so a symlinked
// content folder is never included, whatever an older settings file says. It also matches what the
// restore does: a vault is the user's own primary data and is never written back from a snapshot,
// so notes in a snapshot could not be restored anyway. Reported by the alpha test (2026-09-03),
// where the switch was on and the comparison showed nothing after a note had changed.
export async function getSettings(projectPath: string): Promise<SnapshotSettings> {
  let contentExists = false
  let contentIsSymlink = false
  try {
    const stat = await lstat(join(projectPath, 'content'))
    contentExists = true
    contentIsSymlink = stat.isSymbolicLink()
  } catch {
    // no content folder at all
  }
  let stored: { includeContent?: boolean } = {}
  try {
    stored = JSON.parse(await readFile(quartzGuiPath(projectPath, SETTINGS_FILE), 'utf-8')) as {
      includeContent?: boolean
    }
  } catch {
    // never saved - fall through to the derived default
  }
  return {
    includeContent: contentIsSymlink ? false : (stored.includeContent ?? contentExists),
    contentExists,
    contentIsSymlink
  }
}

async function saveSettingsUnlocked(projectPath: string, includeContent: boolean): Promise<SnapshotSettings> {
  // Normalised on the way in as well, not only on the way out: a stored `true` from before this
  // rule existed would otherwise sit in the file looking like a setting that does something.
  const { contentIsSymlink } = await getSettings(projectPath)
  await writeFile(
    join(quartzGuiDir(projectPath), SETTINGS_FILE),
    JSON.stringify({ includeContent: contentIsSymlink ? false : includeContent }, null, 2),
    'utf-8'
  )
  const settings = await getSettings(projectPath)
  await writeExcludes(projectPath, settings)
  return settings
}

// ---------------------------------------------------------------------------------------------
// Creating and listing

function newSnapshotId(): string {
  // Sortable and ref-name-safe (a ref cannot contain ":"), with a random tail because two
  // snapshots can land in the same millisecond - an automatic one and the action that triggered
  // it, for instance.
  return `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomBytes(2).toString('hex')}`
}

// Automatic snapshots are skipped when nothing changed since the last one, because the value of
// this list is being able to read it. A manual snapshot is always kept: the user pressed a button,
// and an entry not appearing would read as a failure.
async function createSnapshotUnlocked(projectPath: string, kind: SnapshotKind, rawLabel = ''): Promise<Snapshot | null> {
  // The label rides in the commit subject, which is one line by definition.
  const label = rawLabel.replace(/\s+/g, ' ').trim().slice(0, 120)
  const settings = await ensureStore(projectPath)
  await stage(projectPath, settings)

  const tree = (await git(projectPath, ['write-tree'])).output.trim()
  if (!tree) throw new Error(mainT('snapshotWriteTreeFailed'))

  if (kind !== 'manual') {
    const existing = await listSnapshots(projectPath)
    const [newest] = existing
    if (newest) {
      const previousTree = (await git(projectPath, ['rev-parse', `${newest.commit}^{tree}`])).output.trim()
      if (previousTree === tree) return null
    }
    // A burst of the same kind - a session of config edits, a run of style saves - collapses into
    // the *first* snapshot of that burst, not the last: the interesting state is the one from
    // before the session started, and keeping one entry per save is exactly what made the old list
    // of fifty identical timestamps unreadable.
    if (COALESCING_KINDS.has(kind)) {
      const recent = existing.find(
        (entry) => entry.kind === kind && Date.now() - new Date(entry.createdAt).getTime() < COALESCE_WINDOW
      )
      if (recent) return null
    }
  }

  // One line, "<kind> <label>", rather than a commit trailer: with an empty label a
  // "<label>\n\n<trailer>" message has git promote the trailer itself to the subject, and the
  // kind would then be parsed back out of the wrong field. A kind never contains a space, so the
  // first token is the kind and the remainder is the label.
  // Everything the listing needs sits in the commit subject at a fixed position: "<kind> <head>
  // <label>". Neither of the two obvious alternatives survives a line-based read of
  // `for-each-ref` - a trailer paragraph gets promoted to the subject when the label is empty,
  // and for-each-ref's own %(trailers) atom appends a newline that splits every record in two.
  // Only the label can contain spaces, so it goes last.
  //
  // The project's own HEAD is recorded because a core update leaves a merge commit in the user's
  // history; restoring the files alone would leave git claiming the update is installed while the
  // files say otherwise.
  const head = (await run('git', ['rev-parse', 'HEAD'], projectPath)).output.trim()
  const subject = `${kind} ${head || '-'}${label ? ` ${label}` : ''}`
  const commit = (await git(projectPath, ['commit-tree', tree, '-m', subject])).output.trim()
  const id = newSnapshotId()
  await git(projectPath, ['update-ref', `${REF_PREFIX}${id}`, commit])
  // Every snapshot writes a handful of loose objects, and a loose object costs a whole disk block
  // no matter how small it is - which is most of what an unpacked store takes up. `--auto` only
  // does the work once git's own threshold is crossed, so this is a cheap check on the common path.
  await git(projectPath, ['gc', '--auto', '--quiet'])
  if (kind !== 'manual') await pruneAutomaticUnlocked(projectPath)
  return { id, commit, createdAt: new Date().toISOString(), kind, label, projectHead: head || undefined }
}

export async function listSnapshots(projectPath: string): Promise<Snapshot[]> {
  if (!existsSync(join(storePath(projectPath), 'HEAD'))) return []
  const format = ['%(refname)', '%(objectname)', '%(creatordate:iso-strict)', '%(subject)'].join(' ')
  const result = await git(projectPath, ['for-each-ref', `--format=${format}`, REF_PREFIX])
  if (!result.success) return []
  return result.output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith(REF_PREFIX))
    .map((line) => {
      // The subject is "<kind> <head> <label>"; only the label can contain spaces, so it is
      // whatever follows the fifth field.
      const [refname, commit, createdAt, kind, projectHead, ...rest] = line.split(' ')
      return {
        id: refname.slice(REF_PREFIX.length),
        commit,
        createdAt,
        projectHead: projectHead && projectHead !== '-' ? projectHead : undefined,
        kind: (kind || 'manual') as SnapshotKind,
        label: rest.join(' ')
      }
    })
    // Newest first, sorted here rather than by `for-each-ref --sort=-creatordate`: a commit date
    // has second precision, so several snapshots from the same second tie and git falls back to
    // ref name order, which is *ascending*. That put the oldest entry at the top of the list and,
    // worse, made createSnapshot compare a new tree against the oldest snapshot instead of the
    // newest - so the "nothing changed, skip it" check never fired. Ids carry milliseconds and
    // are fixed-width, so they sort chronologically as plain strings.
    .sort((a, b) => b.id.localeCompare(a.id))
}

// An imported entry carries a single file - the config copy the old per-save backups kept. It
// describes that file at a point in time, not the project, so the whole-project comparison every
// other snapshot gets is wrong for it in a dangerous way: on a real project it reported 342 files
// as "added since", and restoring all of them would have deleted the entire project down to that
// one config file. Every other kind is a full-project snapshot, where deleting what the snapshot
// does not have is exactly right.
function isPartial(kind: SnapshotKind): boolean {
  return kind === 'imported'
}

async function snapshotPaths(projectPath: string, commit: string): Promise<string[]> {
  return (await git(projectPath, ['ls-tree', '-r', '--name-only', '-z', commit])).output.split(NUL).filter(Boolean)
}

async function findSnapshot(projectPath: string, id: string): Promise<Snapshot | undefined> {
  return (await listSnapshots(projectPath)).find((entry) => entry.id === id)
}

async function commitFor(projectPath: string, id: string): Promise<string> {
  const result = await git(projectPath, ['rev-parse', `${REF_PREFIX}${id}`])
  const commit = result.output.trim()
  if (!result.success || !commit) throw new Error(mainT('snapshotMissing', { id }))
  return commit
}

// ---------------------------------------------------------------------------------------------
// Migration
//
// The config backups this replaces are timestamped copies of one file. They are read in as real
// snapshots, oldest first, so their history survives the switch instead of being thrown away -
// and the directory is renamed rather than deleted, the same "keep the old data, just stop using
// it" treatment connectionsService gave deploy-secrets.json.
//
// Each imported snapshot holds *only* that config file: the rest of the project as it was back
// then is not recoverable, and inventing it from today's files would produce a snapshot that
// never existed. Restoring one therefore offers exactly the file it has.
async function migrateConfigBackupsUnlocked(projectPath: string): Promise<number> {
  const legacyDir = join(projectPath, '.quartz-gui', 'backups')
  const claimedDir = `${legacyDir}.migrated`
  // The rename claims the work up front rather than confirming it at the end, because a check
  // followed by a rename is not atomic: React's StrictMode runs the Backups page's mount effect
  // twice, so two snapshot:list calls arrive at once, both got past an existsSync, one renamed,
  // and the other threw its ENOENT at the user as a toast. Exactly one caller can win a rename.
  //
  // A crash between the claim and the import would leave the files unimported but intact under
  // .migrated, which is the better failure: nothing is lost, and nothing is imported twice.
  try {
    await rename(legacyDir, claimedDir)
  } catch {
    return 0 // nothing to migrate, or another call is already doing it
  }
  await ensureStore(projectPath)

  // Only files whose name is one of backupService's generated timestamps. A stray file - the
  // .DS_Store macOS drops into any folder opened in Finder, or anything hand-placed - would
  // otherwise become a snapshot whose id the IPC schema rejects, i.e. an entry the list shows and
  // no action can touch. backupService's own listing filters for the same reason.
  const files = (await readdir(claimedDir))
    .filter((name) => /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.yaml$/.test(name))
    .sort()
  let imported = 0
  for (const file of files) {
    const id = file.replace(/\.yaml$/, '')
    const blob = (
      await run('git', ['--git-dir', storePath(projectPath), 'hash-object', '-w', join(claimedDir, file)], projectPath)
    ).output.trim()
    if (!blob) continue
    // mktree reads "<mode> <type> <sha>\t<path>" - one entry, the config file at the project root.
    const tree = (
      await runWithInput(
        ['--git-dir', storePath(projectPath), 'mktree'],
        `100644 blob ${blob}\tquartz.config.yaml\n`,
        projectPath
      )
    ).trim()
    if (!tree) continue
    // The commit gets the backup's *own* timestamp, not the moment of the migration: without this
    // every imported entry showed today's date, which flattens the very history the import exists
    // to preserve - and, because the list is ordered by that date, buried everything else under
    // forty entries from the same second.
    const when = idToIsoDate(id)
    const commit = (
      await git(
        projectPath,
        ['commit-tree', tree, '-m', 'imported -'],
        when ? { GIT_AUTHOR_DATE: when, GIT_COMMITTER_DATE: when } : undefined
      )
    ).output.trim()
    if (!commit) continue
    await git(projectPath, ['update-ref', `${REF_PREFIX}${id}-0000`, commit])
    imported += 1
  }
  // Imported entries are automatic, so the usual thinning applies to them - forty config saves
  // from one afternoon collapse to one per day the same way a fresh burst would.
  await pruneAutomaticUnlocked(projectPath)
  return imported
}

// backupService's timestampId() in reverse: "2026-08-22T10-00-00-000Z" -> an ISO instant git takes.
function idToIsoDate(id: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/.exec(id)
  return match ? `${match[1]}:${match[2]}:${match[3]}.${match[4]}Z` : null
}

// git mktree only reads its tree entries from stdin, which runCommand deliberately keeps closed
// (see its own comment: an unexpected prompt must fail fast rather than hang).
function runWithInput(args: string[], input: string, cwd: string): Promise<string> {
  return new Promise((resolvePromise) => {
    const child = spawn('git', args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.on('close', () => resolvePromise(output))
    child.on('error', () => resolvePromise(''))
    child.stdin.end(input)
  })
}

// ---------------------------------------------------------------------------------------------
// Comparing

// Compares the snapshot against the project as it is *now*, which needs the current state in the
// index first - hence the stage() on what looks like a read. The index belongs to this store and
// is rebuilt on every operation anyway, so there is nothing to preserve.
//
// -z because git C-quotes non-ASCII paths otherwise, which reaches the UI as mojibake - the same
// reason gitStatusService uses it.
async function diffSnapshotUnlocked(projectPath: string, id: string): Promise<SnapshotFileChange[]> {
  const commit = await commitFor(projectPath, id)
  const snapshot = await findSnapshot(projectPath, id)
  await stage(projectPath, await ensureStore(projectPath))
  // A partial snapshot is compared only against what it actually holds; anything else would report
  // the rest of the project as new.
  const limitTo = snapshot && isPartial(snapshot.kind) ? ['--', ...(await snapshotPaths(projectPath, commit))] : []
  const result = await git(projectPath, ['diff-index', '--cached', '--name-status', '-z', commit, ...limitTo])
  if (!result.success) return []
  const parts = result.output.split(NUL).filter((part) => part.length > 0)
  const changes: SnapshotFileChange[] = []
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const letter = parts[i][0]
    // diff-index compares <commit> -> index, so "A" means the file exists now but not in the
    // snapshot: restoring it would delete the file rather than add one.
    changes.push({
      path: parts[i + 1],
      status: letter === 'A' ? 'addedSince' : letter === 'D' ? 'removedSince' : 'modified'
    })
  }
  return changes.sort((a, b) => a.path.localeCompare(b.path))
}

async function fileDiffUnlocked(projectPath: string, id: string, path: string): Promise<string> {
  const commit = await commitFor(projectPath, id)
  await stage(projectPath, await ensureStore(projectPath))
  return (await git(projectPath, ['diff', '--cached', commit, '--', path])).output
}

// ---------------------------------------------------------------------------------------------
// Restoring, deleting, exporting

// Restoring is itself reversible - a snapshot of the current state is taken first, the principle
// the old config backups already followed and the update page's git tags did not.
// A path list goes into argv, and argv has a hard ceiling: measured against real git on macOS
// (ARG_MAX 1048576), 5000 paths of ~55 characters still spawn, 10000 fail with ENOBUFS and 20000
// with E2BIG - and the IPC schema allows up to 20000, which a per-file restore out of a project
// with a real content folder can reach. The whole-project restore does not go through here (it is
// one read-tree), so this only ever splits an explicit selection.
const PATH_BATCH = 1000

function inBatches(paths: string[]): string[][] {
  const batches: string[][] = []
  for (let i = 0; i < paths.length; i += PATH_BATCH) batches.push(paths.slice(i, i + PATH_BATCH))
  return batches
}

async function restoreSnapshotUnlocked(
  projectPath: string,
  id: string,
  options: RestoreOptions = {}
): Promise<PluginActionResult> {
  const { paths, resetProjectHead } = options
  const commit = await commitFor(projectPath, id)
  const snapshot = await findSnapshot(projectPath, id)
  // "Everything" means everything *this snapshot is about*. For a partial one that is the files it
  // holds - never a whole-project reset, which would delete the rest of the project.
  const effectivePaths =
    paths && paths.length > 0 ? paths : snapshot && isPartial(snapshot.kind) ? await snapshotPaths(projectPath, commit) : undefined
  const touched = effectivePaths ?? (await diffSnapshotUnlocked(projectPath, id)).map((change) => change.path)
  const settings = await getSettings(projectPath)
  await createSnapshotUnlocked(projectPath, 'restore', '')
  await stage(projectPath, settings)

  const output: string[] = []

  // git writes *through* a symlinked content folder, and a restore is a git write like any other.
  // Measured against a real project whose content/ pointed at a vault: a whole-project restore
  // reported success with no output at all and left content/ as a real directory holding the
  // snapshot's old notes, i.e. the project silently disconnected from the vault - and a per-file
  // restore of a content path would have written into the vault itself. So the link is parked for
  // the whole write phase and put back afterwards, which also discards whatever the snapshot held
  // under content/: a vault is the user's own primary data with its own backup, and it is not
  // overwritten from a snapshot without being asked. Only wrapped when the restore actually
  // reaches content/, so a restore of one config file never unlinks the vault even briefly.
  const touchesContent = touched.some((path) => path === 'content' || path.startsWith('content/'))
  const needsParking = resetProjectHead || touchesContent
  const park = <T>(fn: () => Promise<T>): Promise<T> =>
    needsParking ? withContentSymlinkParked(projectPath, fn) : fn()

  // Returns a failure to hand straight back, or null to carry on - the write phase has several
  // exits and they all have to leave the parking helper's finally intact.
  const failure = await park(async (): Promise<PluginActionResult | null> => {
    // Moving the project's own branch back is a separate, opt-in step, and it happens first so the
    // snapshot's files are written on top of it rather than the other way round.
    if (resetProjectHead && snapshot?.projectHead) {
      const reset = await run('git', ['reset', '--hard', snapshot.projectHead], projectPath)
      if (!reset.success) return { success: false, output: reset.output }
      output.push(reset.output)
    }
    if (!effectivePaths) {
      // Updates the work tree *and* removes what the snapshot doesn't have. That only ever touches
      // files this store tracks - node_modules and everything else excluded stays where it is.
      const read = await git(projectPath, ['read-tree', '-u', '--reset', commit])
      if (!read.success) return { success: false, output: read.output }
      output.push(read.output)
      return null
    }
    // git checkout can bring a file back but cannot delete one the snapshot never had, so those
    // are removed by hand and dropped from the index.
    const inSnapshot = new Set(
      (await git(projectPath, ['ls-tree', '-r', '--name-only', '-z', commit])).output.split(NUL).filter(Boolean)
    )
    const toRestore = effectivePaths.filter((path) => inSnapshot.has(path))
    const toDelete = effectivePaths.filter((path) => !inSnapshot.has(path))
    for (const batch of inBatches(toRestore)) {
      const checkout = await git(projectPath, ['checkout', commit, '--', ...batch])
      if (!checkout.success) return { success: false, output: checkout.output }
      output.push(checkout.output)
    }
    for (const doomedPath of toDelete) await rm(join(projectPath, doomedPath), { force: true })
    for (const batch of inBatches(toDelete)) {
      await git(projectPath, ['rm', '--cached', '--quiet', '--', ...batch])
    }
    return null
  })
  if (failure) return failure

  // Said out loud rather than left to be discovered: the restore did run, and the notes it holds
  // are the one part of it that did not happen.
  if (settings.contentIsSymlink && touchesContent) {
    output.push(
      mainT('snapshotVaultUntouched')
    )
  }

  // A snapshot holds the project's own absolute paths - the plugin sources in the config and the
  // lockfile - frozen at the moment it was taken, so restoring one taken before a rename puts the
  // dead paths back. The repair is pattern-driven and therefore needs no record of where the
  // project used to be; see repointAuthoredFrames. It runs on the files this restore actually
  // touched, which is why it is here and not in the write phase: a restore that never went near
  // the config has nothing to repair.
  if (touched.some((path) => path === 'quartz.config.yaml' || path === 'quartz.lock.json')) {
    await repointAuthoredFrames(projectPath)
  }

  // node_modules is never part of a snapshot, so a restore that moved the dependency manifests
  // leaves the installed tree out of step with them.
  if (touched.some((path) => path === 'package.json' || path === 'package-lock.json')) {
    const install = await run('npm', ['install'], projectPath)
    output.push(install.output)
    if (!install.success) return { success: false, output: output.join('\n') }
  }
  return { success: true, output: output.join('\n').trim() }
}

async function deleteSnapshotUnlocked(projectPath: string, id: string): Promise<void> {
  await git(projectPath, ['update-ref', '-d', `${REF_PREFIX}${id}`])
  // The commit is unreachable now; without a prune its objects would sit there forever.
  await git(projectPath, ['gc', '--prune=now', '--quiet'])
}

async function exportSnapshotUnlocked(projectPath: string, id: string, targetFile: string): Promise<void> {
  const commit = await commitFor(projectPath, id)
  const result = await git(projectPath, ['archive', '--format=zip', `--prefix=${id}/`, '-o', targetFile, commit])
  if (!result.success) throw new Error(result.output)
}

// ---------------------------------------------------------------------------------------------
// Retention
//
// Deduplication makes disk space a weak argument; a list nobody can read is the real cost. So
// automatic snapshots are thinned to a resolution that decreases with age, and manual ones are
// never touched - the user named those on purpose.
const DAY = 24 * 60 * 60 * 1000

function retentionBucket(age: number, createdAt: Date): string | null {
  if (age < DAY) return null // keep every one from the last 24 hours
  if (age < 7 * DAY) return `day-${createdAt.toISOString().slice(0, 10)}`
  if (age < 56 * DAY) return `week-${Math.floor(createdAt.getTime() / (7 * DAY))}`
  return `month-${createdAt.toISOString().slice(0, 7)}`
}

async function pruneAutomaticUnlocked(projectPath: string): Promise<number> {
  const snapshots = await listSnapshots(projectPath)
  const now = Date.now()
  const kept = new Set<string>()
  const doomed: string[] = []
  // newest first, so the first entry to claim a bucket is the one that survives it
  for (const snapshot of snapshots) {
    if (snapshot.kind === 'manual') continue
    const createdAt = new Date(snapshot.createdAt)
    const bucket = retentionBucket(now - createdAt.getTime(), createdAt)
    if (bucket === null) continue
    if (kept.has(bucket)) doomed.push(snapshot.id)
    else kept.add(bucket)
  }
  for (const id of doomed) await git(projectPath, ['update-ref', '-d', `${REF_PREFIX}${id}`])
  if (doomed.length > 0) await git(projectPath, ['gc', '--prune=now', '--quiet'])
  return doomed.length
}

// ---------------------------------------------------------------------------------------------
// Public API - everything that touches the index goes through the per-project queue above.

export const createSnapshot = (projectPath: string, kind: SnapshotKind, label = ''): Promise<Snapshot | null> =>
  serialize(projectPath, () => createSnapshotUnlocked(projectPath, kind, label))

export const diffSnapshot = (projectPath: string, id: string): Promise<SnapshotFileChange[]> =>
  serialize(projectPath, () => diffSnapshotUnlocked(projectPath, id))

export const fileDiff = (projectPath: string, id: string, path: string): Promise<string> =>
  serialize(projectPath, () => fileDiffUnlocked(projectPath, id, path))

export const restoreSnapshot = (projectPath: string, id: string, options: RestoreOptions = {}): Promise<PluginActionResult> =>
  serialize(projectPath, () => restoreSnapshotUnlocked(projectPath, id, options))

export const deleteSnapshot = (projectPath: string, id: string): Promise<void> =>
  serialize(projectPath, () => deleteSnapshotUnlocked(projectPath, id))

export const exportSnapshot = (projectPath: string, id: string, targetFile: string): Promise<void> =>
  serialize(projectPath, () => exportSnapshotUnlocked(projectPath, id, targetFile))

export const saveSettings = (projectPath: string, includeContent: boolean): Promise<SnapshotSettings> =>
  serialize(projectPath, () => saveSettingsUnlocked(projectPath, includeContent))

export const migrateConfigBackups = (projectPath: string): Promise<number> =>
  serialize(projectPath, () => migrateConfigBackupsUnlocked(projectPath))

export const pruneAutomatic = (projectPath: string): Promise<number> =>
  serialize(projectPath, () => pruneAutomaticUnlocked(projectPath))

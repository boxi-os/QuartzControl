import { existsSync } from 'fs'
import { isAbsolute, resolve } from 'path'
import { runCommand as run } from './runCommand'
import type { GitFileChange, GitStatus, GitOperationInProgress } from '@shared/ipc-contract'

// A content folder can hold thousands of files, and a fresh symlink swap or a `quartz create` run
// makes every one of them show up at once. The list is capped for the renderer; `changeCount`
// keeps the real number so the UI can say "und N weitere" rather than lying about the total.
const MAX_LISTED_CHANGES = 500

const EMPTY: GitStatus = {
  isRepo: false,
  branch: null,
  detached: false,
  upstream: null,
  ahead: 0,
  behind: 0,
  remoteUrl: null,
  changes: [],
  changeCount: 0,
  conflictCount: 0,
  inProgress: null,
  lastCommit: null
}

// porcelain=v2's status codes, in the order the format documents them: X is the index vs HEAD,
// Y is the working tree vs the index. A '.' means "unchanged in this half".
function decodeCode(code: string): GitFileChange['status'] {
  switch (code) {
    case 'A':
      return 'added'
    case 'D':
      return 'deleted'
    case 'R':
      return 'renamed'
    case 'C':
      return 'copied'
    case 'T':
    case 'M':
      return 'modified'
    default:
      return 'modified'
  }
}

// `1`/`2` entries carry a fixed number of space-separated fields before the path, and the path
// itself may contain spaces - so it is everything after the Nth field, not `fields[N]`.
function pathAfter(record: string, fieldCount: number): string {
  let index = 0
  for (let field = 0; field < fieldCount; field++) {
    const next = record.indexOf(' ', index)
    if (next === -1) return ''
    index = next + 1
  }
  return record.slice(index)
}

// Why `-z` rather than the readable default: without it git C-quotes any path that isn't plain
// ASCII ("w\303\251ird \"q\".txt"), which would reach the UI as mojibake. With it, paths are raw
// UTF-8 and a rename's original path is simply the next NUL-terminated record.
//
// runCommand merges stdout and stderr into one string, so a git warning could interleave with the
// records. Every record is therefore matched against its leading token and anything unrecognised
// is skipped, instead of being parsed positionally and turning into a bogus file entry.
function parseStatus(raw: string, status: GitStatus): void {
  const records = raw.split('\0')

  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    if (!record) continue

    if (record.startsWith('# branch.head ')) {
      const head = record.slice('# branch.head '.length)
      status.detached = head === '(detached)'
      status.branch = status.detached ? null : head
    } else if (record.startsWith('# branch.upstream ')) {
      status.upstream = record.slice('# branch.upstream '.length)
    } else if (record.startsWith('# branch.ab ')) {
      // "+3 -1"; absent entirely when the branch has no upstream, which is why ahead/behind
      // default to 0 and `upstream` is what the UI checks before showing them.
      const [ahead, behind] = record.slice('# branch.ab '.length).split(' ')
      status.ahead = Math.abs(Number(ahead)) || 0
      status.behind = Math.abs(Number(behind)) || 0
    } else if (record.startsWith('1 ')) {
      const [x, y] = record.slice(2, 4)
      status.changes.push({
        path: pathAfter(record, 8),
        staged: x !== '.',
        unstaged: y !== '.',
        status: decodeCode(x === '.' ? y : x)
      })
    } else if (record.startsWith('2 ')) {
      const [x, y] = record.slice(2, 4)
      // A rename/copy entry is two records: the new path, then the original one.
      const origPath = records[i + 1] ?? ''
      i++
      status.changes.push({
        path: pathAfter(record, 9),
        origPath,
        staged: x !== '.',
        unstaged: y !== '.',
        status: decodeCode(x === '.' ? y : x)
      })
    } else if (record.startsWith('u ')) {
      status.changes.push({ path: pathAfter(record, 10), staged: false, unstaged: true, status: 'conflicted' })
    } else if (record.startsWith('? ')) {
      status.changes.push({ path: record.slice(2), staged: false, unstaged: true, status: 'untracked' })
    }
  }
}

// An interrupted merge/rebase/cherry-pick leaves a marker file in the git directory, and a
// half-finished one is exactly the state in which pressing "Push" does something surprising - so
// it is read and shown rather than left for the user to discover from `quartz sync`'s output.
// `--git-path` (not a hand-built `<project>/.git/<name>`) is what resolves these correctly inside
// a linked worktree, where the git directory isn't `.git` at all - the Pages deploy creates one.
async function detectInProgress(projectPath: string): Promise<GitOperationInProgress | null> {
  const markers: [GitOperationInProgress, string[]][] = [
    ['merge', ['MERGE_HEAD']],
    ['rebase', ['rebase-merge', 'rebase-apply']],
    ['cherry-pick', ['CHERRY_PICK_HEAD']],
    ['revert', ['REVERT_HEAD']]
  ]

  for (const [operation, names] of markers) {
    for (const name of names) {
      const result = await run('git', ['rev-parse', '--git-path', name], projectPath)
      if (!result.success) continue
      const relativeOrAbsolute = result.output.trim()
      if (!relativeOrAbsolute) continue
      const full = isAbsolute(relativeOrAbsolute) ? relativeOrAbsolute : resolve(projectPath, relativeOrAbsolute)
      if (existsSync(full)) return operation
    }
  }
  return null
}

// NUL-separated so a commit subject containing the separator character is impossible; %aI is the
// strict-ISO author date, which the renderer can hand straight to Date.
async function readLastCommit(projectPath: string): Promise<GitStatus['lastCommit']> {
  const result = await run('git', ['log', '-1', '--format=%H%x00%h%x00%an%x00%aI%x00%s'], projectPath)
  if (!result.success) return null
  const [sha, shortSha, author, date, subject] = result.output.split('\0')
  if (!sha) return null
  return { sha: sha.trim(), shortSha, author, date, subject: (subject ?? '').replace(/\n$/, '') }
}

export async function getGitStatus(projectPath: string): Promise<GitStatus> {
  const statusResult = await run('git', ['status', '--porcelain=v2', '--branch', '-z'], projectPath)
  // Covers both "not a git repository" and a git that isn't installed at all; either way there is
  // no status to show and the UI says so instead of rendering an empty, healthy-looking panel.
  if (!statusResult.success) return { ...EMPTY }

  const status: GitStatus = { ...EMPTY, isRepo: true, changes: [] }
  parseStatus(statusResult.output, status)

  status.conflictCount = status.changes.filter((c) => c.status === 'conflicted').length
  status.changeCount = status.changes.length
  // Conflicts first, then staged, so the capped list keeps what the user has to act on rather
  // than whatever git happened to emit first.
  status.changes.sort((a, b) => {
    const rank = (c: GitFileChange): number => (c.status === 'conflicted' ? 0 : c.status === 'untracked' ? 2 : 1)
    return rank(a) - rank(b) || a.path.localeCompare(b.path)
  })
  status.changes = status.changes.slice(0, MAX_LISTED_CHANGES)

  const remote = await run('git', ['remote', 'get-url', 'origin'], projectPath)
  status.remoteUrl = remote.success ? remote.output.trim() || null : null
  status.inProgress = await detectInProgress(projectPath)
  status.lastCommit = await readLastCommit(projectPath)

  return status
}

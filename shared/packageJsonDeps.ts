// What a project changed in its own package.json, measured against the commit the core update
// merges from.
//
// Why this exists: `package.json` and `package-lock.json` are not documents a user writes, they are
// the record of which packages are installed - and both sides write them. Quartz rewrote all of
// its dependencies on 2026-09-15 (3dff48b: every @quartz-community/* to ^1.0.0, @quartz-themes/core
// to ^2.0.0, lockfile regenerated), while the projects on this machine had added theme packages of
// their own. Measured on four of them, that produced two failures with one cause: uncommitted, git
// refused the merge before it started ("local changes ... would be overwritten"); committed through
// Git-Sync, git started and left both files conflicted, and every later attempt then died with
// "Merging is not possible because you have unmerged files".
//
// A three-way merge is the wrong tool for both files. The lockfile is generated and a conflict in
// it is not resolvable by hand at all; package.json's dependency block is an alphabetical list
// whose conflicts are pure noise. The right answer is to take the upstream copy and let npm write
// the local additions back in, which is exactly what this function works out.
//
// Pure on purpose (three parsed objects in, a plan out): `npm run check:core-update` loads it and
// replays the four real projects against it, and none of that needs a project on disk.

export type DependencySection = 'dependencies' | 'devDependencies' | 'optionalDependencies' | 'peerDependencies'

export const DEPENDENCY_SECTIONS: DependencySection[] = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies'
]

export interface PackageAddition {
  name: string
  section: DependencySection
  /** The range this project asked for, e.g. "^1.0.1" - handed to npm as `name@range`. */
  range: string
}

export interface LocalPackageChanges {
  /** Added or re-pinned here, and reproducible with `npm install name@range` after the merge. */
  reinstall: PackageAddition[]
  /** Changed here *and* upstream. Upstream wins; named so the output can say so rather than lose it silently. */
  upstreamWins: string[]
  /**
   * Everything this plan cannot reproduce: a locally removed dependency, or any edit outside the
   * dependency sections (scripts, exports, a renamed package). Non-empty means hands off - git
   * decides, and the user gets the old message. "Kann nicht prüfen" is never "alles gut", and a
   * plan that silently dropped one of these would throw away an edit nobody could get back.
   */
  unreproducible: string[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The range a parsed package.json asks for, or undefined. Exported because the caller has the same
 * question after the merge - is this package already there with this range - and answering it with
 * a second reading of the file's shape is how the two drift apart.
 */
export function dependencyRange(pkg: unknown, name: DependencySection, dependency: string): string | undefined {
  return section(pkg, name)[dependency]
}

function section(pkg: unknown, name: DependencySection): Record<string, string> {
  if (!isPlainObject(pkg)) return {}
  const raw = pkg[name]
  if (!isPlainObject(raw)) return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) if (typeof value === 'string') out[key] = value
  return out
}

/**
 * @param base   package.json at the merge base - the last state both sides agreed on.
 * @param ours   package.json as it is in the working tree (which covers uncommitted additions too).
 * @param theirs package.json at the commit being merged in.
 */
export function localPackageChanges(base: unknown, ours: unknown, theirs: unknown): LocalPackageChanges {
  const reinstall: PackageAddition[] = []
  const upstreamWins: string[] = []
  const unreproducible: string[] = []

  for (const name of DEPENDENCY_SECTIONS) {
    const baseDeps = section(base, name)
    const ourDeps = section(ours, name)
    const theirDeps = section(theirs, name)
    for (const pkg of new Set([...Object.keys(baseDeps), ...Object.keys(ourDeps)])) {
      const baseRange = baseDeps[pkg]
      const ourRange = ourDeps[pkg]
      const theirRange = theirDeps[pkg]
      if (ourRange === baseRange) continue
      if (ourRange === undefined) {
        // Removing a dependency is not something `npm install` can replay, and a package that
        // comes back unasked is a different project than the one the user saved.
        unreproducible.push(`${name}.${pkg}`)
        continue
      }
      if (theirRange !== undefined && theirRange !== baseRange) {
        upstreamWins.push(pkg)
        continue
      }
      reinstall.push({ name: pkg, section: name, range: ourRange })
    }
  }

  // Everything that is not a dependency section: package.json also carries scripts, exports and
  // the package's own name, and Quartz edits those too.
  const baseKeys = isPlainObject(base) ? base : {}
  const ourKeys = isPlainObject(ours) ? ours : {}
  for (const key of new Set([...Object.keys(baseKeys), ...Object.keys(ourKeys)])) {
    if (DEPENDENCY_SECTIONS.includes(key as DependencySection)) continue
    if (JSON.stringify(baseKeys[key]) !== JSON.stringify(ourKeys[key])) unreproducible.push(key)
  }

  return { reinstall, upstreamWins, unreproducible }
}

/**
 * The npm arguments that put `reinstall` back, one call per section because the flag that decides
 * *which* section a package lands in is a flag on the call, not on the package.
 */
export function reinstallCommands(reinstall: PackageAddition[]): Array<{ args: string[] }> {
  const flags: Record<DependencySection, string[]> = {
    dependencies: ['--save-prod'],
    devDependencies: ['--save-dev'],
    optionalDependencies: ['--save-optional'],
    peerDependencies: ['--save-peer']
  }
  const calls: Array<{ args: string[] }> = []
  for (const name of DEPENDENCY_SECTIONS) {
    const packages = reinstall.filter((entry) => entry.section === name)
    if (packages.length === 0) continue
    calls.push({ args: ['install', ...flags[name], ...packages.map((entry) => `${entry.name}@${entry.range}`)] })
  }
  return calls
}

/** What a caller passes for a package.json it could not read or parse - distinct from any value
 *  JSON.parse can return, `null` included. */
export const UNREADABLE: unique symbol = Symbol('unreadable package.json')

/**
 * What of the plan the merged package.json does not already say. After one merge the base is
 * upstream's commit, so `plan.reinstall` names this project's own packages for ever - and every
 * update then ran an `npm install` over the network that changed nothing, under a line claiming
 * packages had been put back (sixteenth review, finding 3b). Unreadable is not "nothing to do":
 * then all of them, and npm answers.
 */
export function missingFrom(pkg: unknown, reinstall: PackageAddition[]): PackageAddition[] {
  if (pkg === UNREADABLE) return reinstall
  return reinstall.filter((entry) => dependencyRange(pkg, entry.section, entry.name) !== entry.range)
}

/**
 * What of a list is *not in package.json at all* - as opposed to `missingFrom`, which also counts
 * an entry standing at another range, because for the run that is a reason to ask npm.
 *
 * The two questions look alike and are not, and the sentence about a dropped list is the place
 * where the difference shows: `npm install <name>` writes the range npm resolves, not the one the
 * note remembers, so a user who puts both lines back by hand through npm and commits gets `^2.3.1`
 * where the note says `^2.0.0`. Measured (twenty-fifth review, finding 3, scenes G4 and G8): the
 * run then named both themes as "not putting back" over a package.json in which both stood. Asked
 * across all sections, because a line moved from `dependencies` to `devDependencies` is an answer
 * too.
 *
 * But only a section the list does not claim for the same name stands in for a missing one. A
 * package can be in two sections at once - `devDependencies` and `peerDependencies` is the usual
 * form for one that is developed against and required - and asked purely by name, the `dev` line
 * answered for the missing `peer` line: the sentence named `kind-of` and not the second entry that
 * was just as gone (twenty-eighth review, finding 4, scene R2 with real npm). Which sections are
 * claimed is read from `entries`, so a caller hands it the whole list, never a filtered part.
 *
 * Unreadable: the file says nothing either way, and a sentence naming packages that may well be
 * there is the worse of the two answers.
 */
export function absentFrom(pkg: unknown, entries: PackageAddition[]): PackageAddition[] {
  if (pkg === UNREADABLE) return []
  const holds = (section: DependencySection, name: string): boolean => dependencyRange(pkg, section, name) !== undefined
  const absent: PackageAddition[] = []
  for (const name of new Set(entries.map((entry) => entry.name))) {
    const own = entries.filter((entry) => entry.name === name)
    const claimed = new Set(own.map((entry) => entry.section))
    // Sections that hold the name without the list asking for it there: each one is a line that
    // may have moved, and answers for one entry whose own section is empty.
    let moved = DEPENDENCY_SECTIONS.filter((section) => !claimed.has(section) && holds(section, name)).length
    for (const entry of own) {
      if (holds(entry.section, name)) continue
      if (moved > 0) moved--
      else absent.push(entry)
    }
  }
  return absent
}

/**
 * The packages the Updates and Git-Sync pages name as still to be put back, one name per package.
 *
 * `missingFrom` is the run's question - "fehlt oder steht mit einem anderen Bereich da", and in
 * doubt ask npm - and as a list on the page it named lines that stand: npm writes the range it
 * resolves, so every line a failed run had already put back still differed from the note (R2:
 * left-pad, is-odd and is-buffer beside the one missing kind-of - twenty-ninth review, "nebenbei"
 * 4). A line this app's npm wrote back (`putBack`) is therefore outstanding only while it is not
 * there at all; any other line at another range still is, because that may be upstream's range
 * where the project had its own.
 *
 * `absentFrom` is asked about the whole list, not about the missing part: a dev line standing at
 * the note's range is not missing, its section then looked unclaimed, and the gone peer line of
 * the same package counted as "moved" there and fell out (thirtieth review, finding 2, scene R2N
 * with the ranges npm writes). The identity of the entries survives, because `missingFrom`
 * filters and does not copy. One name per package: an entry in two sections is one package to
 * the reader, and the page counted it twice (twenty-eighth review, finding 4).
 */
export function outstandingPackages(pkg: unknown, reinstall: PackageAddition[], putBack: string[]): string[] {
  const absent = new Set(absentFrom(pkg, reinstall))
  const outstanding = missingFrom(pkg, reinstall).filter((entry) => !putBack.includes(entry.name) || absent.has(entry))
  return [...new Set(outstanding.map((entry) => entry.name))]
}

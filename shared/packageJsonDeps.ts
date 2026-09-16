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

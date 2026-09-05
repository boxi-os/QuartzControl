// Version comparison, in its own module because it is arithmetic and everything around it is not.
//
// It lives here rather than beside the update check for a reason a testable thing usually lives
// somewhere: the check imports `electron`, so nothing can load it outside a running app - and the
// only part of it that can be wrong in an interesting way is this comparison. A prerelease is where
// that happens: `1.0.0` is newer than `1.0.0-beta.2`, and `beta.10` is newer than `beta.9`, which
// a string comparison gets backwards.

interface Zerlegt {
  zahlen: [number, number, number]
  pre: string[]
}

function zerlege(version: string): Zerlegt | null {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(version.trim())
  if (!m) return null
  return { zahlen: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ? m[4].split('.') : [] }
}

/**
 * True when `candidate` is a later version than `current`.
 *
 * Anything either side cannot parse counts as "not newer". That is the safe direction: a malformed
 * version on the server then says nothing, rather than telling every tester about an update that
 * does not exist.
 */
export function isNewerVersion(candidate: string, current: string): boolean {
  const a = zerlege(candidate)
  const b = zerlege(current)
  if (!a || !b) return false

  for (let i = 0; i < 3; i++) {
    if (a.zahlen[i] !== b.zahlen[i]) return a.zahlen[i] > b.zahlen[i]
  }
  // Same x.y.z. A release beats a prerelease; two prereleases compare part by part, numerically
  // where both parts are numbers - which is what puts beta.10 after beta.9 instead of before it.
  if (a.pre.length === 0) return b.pre.length > 0
  if (b.pre.length === 0) return false
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const x = a.pre[i]
    const y = b.pre[i]
    // A prerelease with more parts is later than its own prefix: beta.1.2 after beta.1.
    if (x === undefined) return false
    if (y === undefined) return true
    if (x === y) continue
    const beideZahlen = /^\d+$/.test(x) && /^\d+$/.test(y)
    return beideZahlen ? Number(x) > Number(y) : x > y
  }
  return false
}

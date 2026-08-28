import type { PluginEntry } from '@shared/ipc-contract'

/**
 * Normalizes any plugin source form (github: string, {repo} object, or the built-in
 * "@quartz-community/x" shorthand - which really is the quartz-community/x repo, just bundled
 * instead of `plugin add`ed) down to a lowercase "owner/repo".
 *
 * Shared by both tabs: Marketplace compares it against a result's fullName to mark what is already
 * installed, and Installed turns it into the repository link on each row. Two copies would drift,
 * and they answer the same question.
 */
export function normalizedRepoId(source: PluginEntry['source']): string | null {
  let raw = typeof source === 'string' ? source : source.repo
  raw = raw
    .replace(/^git\+/, '')
    .replace(/^github:/, '')
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/^@/, '')
  raw = raw.split('#')[0].replace(/\.git$/, '')
  return /^[^/]+\/[^/]+$/.test(raw) ? raw.toLowerCase() : null
}

/**
 * The repository a plugin came from, or null when there is nothing to link - a local path (an
 * authored frame), or a source shape that isn't owner/repo. Deliberately github.com: every source
 * form this app produces or accepts resolves there, and guessing a host for anything else would
 * hand the user a dead link.
 */
export function repoUrl(source: PluginEntry['source']): string | null {
  const id = normalizedRepoId(source)
  return id ? `https://github.com/${id}` : null
}

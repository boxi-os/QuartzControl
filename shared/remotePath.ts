/**
 * What is wrong with a target's remote path, or null when it is usable. Shared by the IPC schema
 * and the target form for the same reason `rsyncSupport` is shared: two copies of the rule drift,
 * and the form would then offer a value the boundary rejects - which is exactly what happened, as
 * a raw zod message reading "must be an absolute path" under a heading saying this is a bug in the
 * app rather than something the user typed.
 *
 * An **absolute path is not required**. Every consumer joins it with `posix.join` (sftp, ftp) or
 * appends it to `user@host:` (rsync), and all three resolve a relative path against the login's
 * own directory - which is how a shared webspace is normally addressed ("httpdocs"), and looking
 * up its absolute equivalent is work the provider's own panel often does not even show.
 *
 * Refused instead: nothing to deploy into, the whole login directory (a deploy with deletion
 * enabled would empty it), and any upward traversal, which no target legitimately needs.
 */
export type RemotePathProblem = 'empty' | 'whole-root' | 'traversal'

export function remotePathProblem(path: string): RemotePathProblem | null {
  const trimmed = path.trim()
  if (trimmed === '') return 'empty'

  const segments = trimmed.split('/').filter((segment) => segment !== '' && segment !== '.')
  if (segments.some((segment) => segment === '..')) return 'traversal'
  // "/" and "." both name the root of what this login can see; so does "./" and "/.".
  if (segments.length === 0) return 'whole-root'
  return null
}

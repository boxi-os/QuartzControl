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
 * Refused instead: nothing to deploy into, the whole login directory when deletion is enabled (a
 * deploy would empty it), and any upward traversal, which no target legitimately needs. Without
 * deletion the login directory is where some hosts keep the site: 1.1.0 uploaded an rsync target
 * "~" there, and refusing it left only the absolute path, which no sentence named (review
 * 2026-10-31, N2).
 */
export type RemotePathProblem = 'empty' | 'whole-root' | 'traversal'

export function remotePathProblem(path: string, deleteRemoved: boolean): RemotePathProblem | null {
  const trimmed = path.trim()
  if (trimmed === '') return 'empty'

  const segments = trimmed.split('/').filter((segment) => segment !== '' && segment !== '.')
  if (segments.some((segment) => segment === '..')) return 'traversal'
  // "/" and "." both name the root of what this login can see; so does "./" and "/.". So do "~"
  // and "~user", which the remote shell expands for rsync: an rsync target "~" with deletion
  // listed the whole home of the account for deletion in its preview, .ssh/ included (debian-vm,
  // review 2026-10-30, nebenbei). Over SFTP and FTP the adapters resolve it the same way
  // (fromLoginDir below), so it is the login directory on every way.
  const below = /^~[^/]*$/.test(segments[0] ?? '') ? segments.slice(1) : segments
  if (below.length === 0 && deleteRemoved) return 'whole-root'
  return null
}

/**
 * A target's path with a leading "~" or "~<the login's own account>" as the folder the login starts
 * in, which the SFTP and FTP adapters ask the server for; any other path as it is. null for "~" of
 * another account, which neither can name. rsync's remote shell expands "~" itself; over SFTP and
 * FTP it meant something else on each server: OpenSSH made a folder "~", vsftpd expanded "~/" and
 * made a folder "~qchost", ProFTPD expanded "~/" and broke the data connection on "~qchost/", with
 * chroot answered 550, Pure-FTPd answered 553 to both (debian-vm, support matrix, 2026-10-21).
 */
export function fromLoginDir(path: string, loginDir: string, account: string): string | null {
  const tilde = /^~([^/]*)(?:\/+|$)/.exec(path)
  if (!tilde) return path
  if (tilde[1] !== '' && tilde[1] !== account) return null
  const rest = path.slice(tilde[0].length)
  const base = loginDir.replace(/\/+$/, '')
  return rest ? `${base}/${rest}` : base || '/'
}

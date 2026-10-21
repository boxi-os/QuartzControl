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

/**
 * The relay's folder below a target's path, slashes at either end dropped, or null when it is not
 * a folder of its own: empty, ".", "..", or an empty, "." or ".." segment anywhere. Shared by the
 * IPC schema, the field in the Relay section and runDirectoryUpload, for the reason above.
 *
 * The relay brings its modes (keepLocalModes), and every adapter sets the mode of the folder it
 * uploads into. With "." that folder is the target's own: measured on debian-vm with three targets
 * whose folders were 2750 qchost:www-data (the kind a shared host gives a webroot so that other
 * accounts cannot look in, setgid so new files get the web server's group), a relay uploaded with
 * "." over SFTP, rsync and FTP left all three 755, with no line in the output.
 */
export function relaySubdir(raw: string): string | null {
  const subdir = raw.trim().replace(/^\/+|\/+$/g, '')
  const segments = subdir.split('/')
  return subdir && !subdir.includes('\0') && segments.every((s) => s !== '' && s !== '.' && s !== '..') ? subdir : null
}

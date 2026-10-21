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

// "~" is left out on purpose: a leading "~/" or "~user/" is meant to expand there. Loosening it
// (for rsync 3.2.4 and later, which escape the path themselves) opens the mkdir of the second
// attempt to the remote shell under openrsync: remoteShellPath's quotes do not survive there
// (deploy/rsync.ts).
const SHELL_SPECIAL = /['"\\$`;&|<>(){}[\]*?!#]/

/**
 * The first character of a remote path that rsync cannot carry safely, or null: whitespace and
 * anything a shell gives a meaning to. openrsync has no --protect-args, so the remote shell reads
 * the path once more (deploy/rsync.ts, remoteSpec). Shared by the rsync adapter, the target form
 * and runDirectoryUpload, so a path is refused where it is typed and not only at the upload:
 * "neu!" was saved without a word and refused by preview and upload (review 2026-10-30, N5).
 */
export function rsyncUnsafeChar(path: string): string | null {
  return /\s/.exec(path)?.[0] ?? SHELL_SPECIAL.exec(path)?.[0] ?? null
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

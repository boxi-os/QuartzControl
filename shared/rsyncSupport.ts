import type { SshConnection } from './ipc-contract'

// Why a machine-readable reason rather than a message: the rule for "can this connection be used
// with rsync" has to hold in exactly one place - the main process refuses on it, and the target
// form uses it to decide whether to offer rsync at all. Two copies of the rule would drift, and
// the UI would end up offering a transfer that the adapter then rejects. The *wording* is
// deliberately not shared: main's errors are plain strings, the renderer's go through i18n.
export type RsyncBlockReason =
  /** ssh(1) cannot take a password from us, and sshpass is neither present nor shippable. */
  | 'password-auth'
  /** ssh needs a key *file*; a key pasted as text only exists inside the encrypted store. */
  | 'key-not-a-file'
  /** A known_hosts line needs the raw key, which cannot be derived from a stored fingerprint. */
  | 'no-pinned-host-key'

export function rsyncBlockReason(connection: SshConnection): RsyncBlockReason | null {
  if (connection.authMethod === 'password') return 'password-auth'
  if (connection.authMethod === 'privateKey' && !connection.keyPath) return 'key-not-a-file'
  if (!connection.hostKey?.blob) return 'no-pinned-host-key'
  return null
}

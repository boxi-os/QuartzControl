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
  /**
   * There is no rsync to spawn. macOS ships openrsync and every Linux has it or can install it;
   * Windows has neither it nor a shell for the `-e` wrapper script this adapter writes. Without
   * this the target form would offer rsync there and the adapter would fail at deploy time.
   */
  | 'platform-unsupported'

/**
 * `platform` is passed in rather than read here because this rule has to hold on both sides of
 * the IPC boundary and the renderer has no `process` - it reads window.quartzGui.platform. Keeping
 * one function with an argument is what stops the two sides from drifting.
 */
export function rsyncBlockReason(connection: SshConnection, platform: string): RsyncBlockReason | null {
  if (platform === 'win32') return 'platform-unsupported'
  if (connection.authMethod === 'password') return 'password-auth'
  if (connection.authMethod === 'privateKey' && !connection.keyPath) return 'key-not-a-file'
  if (!connection.hostKey?.blob) return 'no-pinned-host-key'
  return null
}

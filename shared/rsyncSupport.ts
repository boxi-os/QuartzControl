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
   * Windows has neither rsync nor a shell for the `-e` wrapper script this adapter writes. Without
   * this the target form would offer rsync there and the adapter would fail at deploy time.
   */
  | 'platform-unsupported'
  /**
   * The platform could have rsync and this machine does not. This used to be folded into the
   * assumption above - "macOS ships openrsync and every Linux has it or can install it" - and the
   * alpha test found the second half wrong: a Debian desktop install has no rsync, so the form
   * offered the transfer and `spawn rsync ENOENT` came back from the diff.
   */
  | 'not-installed'

/**
 * `platform` and `rsyncAvailable` are passed in rather than read here because this rule has to hold
 * on both sides of the IPC boundary and the renderer has neither `process` nor a PATH to search -
 * it reads window.quartzGui.platform and asks `settings.environment` for the binary. Keeping one
 * function with arguments is what stops the two sides from drifting.
 *
 * `rsyncAvailable` is null while the renderer has not heard back yet. Deliberately not a blocker:
 * the answer arrives long before this form can be opened - opening it takes a click - and the
 * adapter checks for itself before spawning, so a "not installed" flash on a machine that has
 * rsync would be the worse of the two lies.
 */
export function rsyncBlockReason(
  connection: SshConnection,
  platform: string,
  rsyncAvailable: boolean | null
): RsyncBlockReason | null {
  if (platform === 'win32') return 'platform-unsupported'
  if (rsyncAvailable === false) return 'not-installed'
  if (connection.authMethod === 'password') return 'password-auth'
  if (connection.authMethod === 'privateKey' && !connection.keyPath) return 'key-not-a-file'
  if (!connection.hostKey?.blob) return 'no-pinned-host-key'
  return null
}

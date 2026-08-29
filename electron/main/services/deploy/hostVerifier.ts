import { dialog } from 'electron'
import { createHash } from 'crypto'
import type { SshConnection } from '@shared/ipc-contract'
import * as connectionsService from '../connectionsService'
import { mainT } from '../../i18n'

// OpenSSH's fingerprint format: base64 of the SHA-256 over the raw public-key blob, unpadded.
// Same bytes `ssh-keygen -lf` hashes, so this string can be compared 1:1 against what the user
// sees from ssh-keyscan or what a provider publishes.
export function fingerprintOf(hostKey: Buffer): string {
  return `SHA256:${createHash('sha256').update(hostKey).digest('base64').replace(/=+$/, '')}`
}

// An SSH public-key blob starts with its own algorithm name as a length-prefixed string
// (RFC 4253 §6.6), so the type is read out of the key rather than guessed from the connection.
// Needed because a known_hosts line is "<host> <type> <base64 blob>" and rsync's ssh(1) is pinned
// through exactly such a file.
export function keyTypeOf(hostKey: Buffer): string {
  if (hostKey.length < 4) return ''
  const length = hostKey.readUInt32BE(0)
  if (length <= 0 || length > hostKey.length - 4) return ''
  return hostKey.subarray(4, 4 + length).toString('ascii')
}

// Without a hostVerifier, ssh2 accepts ANY host key - verified in its own source
// (lib/protocol/kex.js: "Host accepted by default (no verification)"), which makes the connection
// trivially interceptable. This is trust-on-first-use, the same model OpenSSH and GUI clients like
// FileZilla use: ask once, showing the fingerprint, then pin it.
//
// A later mismatch is refused outright rather than re-prompting. A "the key changed, continue?"
// dialog is exactly the moment a user clicks through, and a changed key is either a rebuilt server
// or an active interception - the two cases are indistinguishable from here. Clearing the pin
// (connections.forgetHostKey, an explicit button) is the way back, taken deliberately and not
// under pressure mid-deploy.
export function makeHostVerifier(connection: SshConnection, onRejected: (message: string) => void) {
  return (hostKey: Buffer, accept: (ok: boolean) => void): void => {
    const fingerprint = fingerprintOf(hostKey)
    const pinned = connection.hostKey

    if (pinned?.fingerprint) {
      if (pinned.fingerprint === fingerprint) {
        // A pin migrated from the pre-split store has the fingerprint but no raw blob (it cannot
        // be derived from a hash). Backfilling it here - on a connection that just matched the
        // trusted fingerprint - is what lets rsync reuse the same pin later without asking again.
        if (!pinned.blob) {
          void connectionsService.rememberHostKey(connection.id, {
            fingerprint,
            blob: hostKey.toString('base64'),
            type: keyTypeOf(hostKey)
          })
        }
        return accept(true)
      }
      onRejected(
        mainT('hostKeyChanged', {
          host: connection.host,
          expected: pinned.fingerprint,
          received: fingerprint
        })
      )
      return accept(false)
    }

    void dialog
      .showMessageBox({
        type: 'warning',
        // Cancel first for the same reason the build guard puts it first: `defaultId` does not
        // decide what Return does here (measured), and confirming an unknown host key by reflex
        // is exactly what trust-on-first-use must not make easy.
        buttons: [mainT('hostKeyCancel'), mainT('hostKeyAccept')],
        defaultId: 0,
        cancelId: 0,
        title: mainT('hostKeyUnknownTitle'),
        message: mainT('hostKeyUnknownMessage', { host: connection.host }),
        detail: mainT('hostKeyUnknownDetail', { fingerprint, host: connection.host })
      })
      .then(async ({ response }) => {
        if (response !== 1) {
          onRejected(mainT('hostKeyRejected'))
          return accept(false)
        }
        await connectionsService.rememberHostKey(connection.id, {
          fingerprint,
          blob: hostKey.toString('base64'),
          type: keyTypeOf(hostKey)
        })
        accept(true)
      })
  }
}

import type { TFunction } from 'i18next'
import type { ServerStatus } from '@shared/ipc-contract'

/**
 * Why a dev server is in the error state, in the user's language - or null when it isn't in one.
 *
 * Shared by the Übersicht and Vorschau & Build because both show it and a second copy would drift.
 * The two cases are genuinely different: `error` is whatever the OS said about a failed spawn and
 * is passed through verbatim, while a process that started and then died is described by its exit
 * code, which the main process deliberately reports as a number rather than as a sentence.
 */
export function serverErrorText(status: ServerStatus, t: TFunction): string | null {
  if (status.state !== 'error') return null
  if (status.error) return status.error
  if (status.exitCode != null) return t('buildServer.exitedWithCode', { code: status.exitCode })
  return t('buildServer.exitedUnexpectedly')
}

import type { DeployResult } from '@shared/ipc-contract'
import { mainT } from '../../i18n'

/** The relay file that names its upload's generation (quartz-forms writes it on every run). */
export const RELAY_GENERATED = 'config.generated.php'

/** What reading config.generated.php on the server gave: its text, null when it is not there, or
 *  why it could not be read. */
export type GeneratedRead = string | null | { unreadable: string }

// As send.php reads it (qf_generation_on_disk): the line in the head of the file, as text.
const GENERATION = /'generation' => '([0-9a-f]{16})'/

/**
 * Removing the relay takes down the one this project uploaded last, not one that took its place:
 * two projects publishing into the same folder, or a relay replaced by hand, were deleted by
 * whoever removed first, because only the names were asked (review 2026-11-04, N4 a). The adapter
 * reads config.generated.php there over its own session; null means go on. A file that is not
 * there goes on too: what is left is deleted by name as before, and the output says what went. One
 * that cannot be read is not taken for ours.
 */
export function relayGuard(read: GeneratedRead, own: string, folder: string): DeployResult | null {
  if (read === null) return null
  if (typeof read !== 'string') return { success: false, output: mainT('relayRemoveUnverified', { path: folder, reason: read.unreadable }) }
  if (GENERATION.exec(read)?.[1] === own) return null
  return { success: false, output: mainT('relayRemoveForeign', { path: folder }) }
}

import type { ConfirmAnswer } from '@shared/ipc-contract'

/**
 * The renderer's one way to ask a yes/no question. Goes to the native dialog in the main process
 * (dialog.confirm), never to window.confirm() - see the contract's note on why the default
 * button matters, and the rule at the handler: confirmations are native, in-app overlays are for
 * forms and selections only.
 *
 * The texts in de.ts/en.ts were written for window.confirm(), which takes one string: a question
 * on the first line and, after a blank line, what the action does. The native dialog has exactly
 * those two slots (bold message, body detail), so the split happens here rather than in eighteen
 * call sites or by rewriting every text as two keys.
 */
export async function confirmDialog(options: {
  text: string
  confirmLabel: string
  /** Deletes, overwrites or ships something. Almost every question here does. */
  danger?: boolean
}): Promise<boolean> {
  return (await askDialog(options)) === 'confirm'
}

/**
 * The same dialog with three answers. Separate from confirmDialog rather than a wider return type
 * there, because eighteen call sites ask a yes/no question and reading their answer as a boolean is
 * the honest shape for those; only the unsaved-changes guard has a third thing to offer.
 *
 * `altLabel` is the middle button and is named after what it does ("Speichern"), like the
 * confirming one - see the handler for where each answer sits.
 */
export async function askDialog(options: {
  text: string
  confirmLabel: string
  altLabel?: string
  danger?: boolean
}): Promise<ConfirmAnswer> {
  const [message, ...rest] = options.text.split(/\n\s*\n/)
  const detail = rest.join('\n\n').trim()
  return window.quartzGui.dialog.confirm({
    message: message.trim(),
    detail: detail || undefined,
    altLabel: options.altLabel,
    confirmLabel: options.confirmLabel,
    danger: options.danger
  })
}

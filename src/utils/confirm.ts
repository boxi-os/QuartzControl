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
  const [message, ...rest] = options.text.split(/\n\s*\n/)
  const detail = rest.join('\n\n').trim()
  return window.quartzGui.dialog.confirm({
    message: message.trim(),
    detail: detail || undefined,
    confirmLabel: options.confirmLabel,
    danger: options.danger
  })
}

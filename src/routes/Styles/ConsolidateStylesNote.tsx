import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import { confirmDialog } from '../../utils/confirm'

// The door to the twelve stylesheets of 1.1 for a project that still has the template's 31
// (styleService.consolidateStylesheets, shared/stylesheetConsolidation.ts). Offered, not done: the
// 31 keep working, and some users keep them on purpose. Asked through the native dialog because it
// removes files; not while the page holds drafts, which might be drafts of exactly those files.
export default function ConsolidateStylesNote({
  projectPath,
  dirty,
  count,
  onDone
}: {
  projectPath: string
  dirty: boolean
  /** How many of the 31 the project loads. */
  count: number
  onDone: (sentence: string) => Promise<void>
}): JSX.Element {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function consolidate(): Promise<void> {
    const ok = await confirmDialog({
      text: t('styles.consolidate.confirm', { count }),
      confirmLabel: t('styles.consolidate.action')
    })
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      const r = await window.quartzGui.styles.consolidate({ projectPath })
      const renamed = r.renamed.map(({ from, to }) => t('styles.consolidate.renamed', { from, to })).join(' ')
      await onDone([t('styles.consolidate.done', { merged: r.merged, written: r.written.length }), renamed].filter(Boolean).join(' '))
    } catch (err) {
      setError(formatIpcError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs leading-relaxed text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
      <p>{t('styles.consolidate.note', { count })}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button onClick={consolidate} disabled={busy || dirty}>
          {busy ? t('styles.consolidate.running') : t('styles.consolidate.action')}
        </Button>
        {dirty && <span>{t('styles.migrate.saveFirst')}</span>}
      </div>
      {error && <p className="mt-2 text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'

// The one door to 1.1's form of the Styles page's blocks (styleService.migrateManagedStyles). A
// project in the 1.0 form keeps working - every writer here still writes custom.scss for it - so
// this asks rather than does: a moved project is one an older app reads with no variables and no
// stylesheets, and only the user knows whether a second machine still runs one (fortieth review,
// closing question). Not while the page holds drafts: the move rewrites custom.scss under them.
export default function MoveStylesNote({
  projectPath,
  dirty,
  onMoved
}: {
  projectPath: string
  dirty: boolean
  onMoved: () => Promise<void>
}): JSX.Element {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function move(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      await window.quartzGui.styles.migrate({ projectPath, snapshot: true })
      await onMoved()
    } catch (err) {
      setError(formatIpcError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-4 max-w-[95ch] rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs leading-relaxed text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
      <p>{t('styles.migrate.note')}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button onClick={move} disabled={busy || dirty}>
          {busy ? t('styles.migrate.running') : t('styles.migrate.action')}
        </Button>
        {dirty && <span>{t('styles.migrate.saveFirst')}</span>}
      </div>
      {error && <p className="mt-2 text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

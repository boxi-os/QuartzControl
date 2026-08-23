import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProject } from './ProjectLayout'
import { Button, Card, PageHeader } from '../components/ui'
import { formatIpcError } from '../components/ErrorSurface'
import { TAB_ICONS } from './navConfig'

export default function GitSync(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [busy, setBusy] = useState<'push' | 'pull' | 'both' | null>(null)
  const [output, setOutput] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean | null>(null)

  async function run(direction: 'push' | 'pull' | 'both'): Promise<void> {
    setBusy(direction)
    setOutput(null)
    try {
      const result = await window.quartzGui.sync.run(project.path, direction)
      setSuccess(result.success)
      setOutput(result.output)
    } catch (err) {
      // A rejected invoke used to skip setBusy(null) below, leaving all three buttons disabled
      // for good. Reported through the existing output panel rather than a separate error slot.
      setSuccess(false)
      setOutput(formatIpcError(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        icon={TAB_ICONS.sync}
        title={t('projectLayout.tabs.sync')}
        description={t('projectLayout.descriptions.sync')}
      />
      <Card>
        <h2 className="mb-1 font-medium">{t('gitSync.title')}</h2>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('gitSync.explainer')}</p>
        <div className="mb-4 flex gap-2">
          <Button onClick={() => run('pull')} disabled={busy !== null}>
            {busy === 'pull' ? t('gitSync.pullRunning') : t('gitSync.pull')}
          </Button>
          <Button onClick={() => run('push')} disabled={busy !== null}>
            {busy === 'push' ? t('gitSync.pushRunning') : t('gitSync.push')}
          </Button>
          <Button variant="ghost" onClick={() => run('both')} disabled={busy !== null}>
            {busy === 'both' ? t('gitSync.bothRunning') : t('gitSync.both')}
          </Button>
        </div>
        {output != null && (
          <div>
            <p className={`mb-2 text-sm ${success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {success ? t('gitSync.success') : t('gitSync.failed')}
            </p>
            <pre className="max-h-72 overflow-y-auto rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-200">
              {output}
            </pre>
          </div>
        )}
      </Card>
    </div>
  )
}

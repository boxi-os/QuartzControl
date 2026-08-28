import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProject } from '../ProjectLayout'
import type { ContentProgress, ContentStatus, ContentStrategy } from '@shared/ipc-contract'
import { Badge, Button, Card, Field, Select, TextInput } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'

export default function ContentFolder(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [status, setStatus] = useState<ContentStatus | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [source, setSource] = useState('')
  const [strategy, setStrategy] = useState<ContentStrategy>('symlink')
  const [progress, setProgress] = useState<ContentProgress | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reload(): Promise<void> {
    setStatus(await window.quartzGui.content.status(project.path))
  }

  useEffect(() => {
    reload()
    return window.quartzGui.content.onProgress((p) => {
      if (p.projectId === project.id) setProgress(p)
    })
  }, [project.id, project.path])

  async function pickSource(): Promise<void> {
    const folder = await window.quartzGui.dialog.pickFolder()
    if (folder) setSource(folder)
  }

  async function apply(): Promise<void> {
    setBusy(true)
    setError(null)
    setProgress(null)
    try {
      await window.quartzGui.content.change(project.id, project.path, source, strategy)
      setShowDialog(false)
      setSource('')
      await reload()
    } catch (err) {
      setError(formatIpcError(err))
    }
    setBusy(false)
  }

  return (
    <div>
      {/* The one block on this tab, and it's four short lines - the cap sits on the card rather
          than on the page, so it's this content saying how wide it wants to be. */}
      <Card className="max-w-2xl">
        <h2 className="mb-3 font-medium">{t('content.currentFolder')}</h2>
        {!status && <p className="text-sm text-slate-500">{t('content.loading')}</p>}
        {status && !status.exists && <p className="text-sm text-amber-600">{t('content.noFolder')}</p>}
        {status?.exists && (
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center gap-2">
              <Badge tone={status.isSymlink ? (status.targetExists ? 'slate' : 'red') : 'green'}>
                {status.isSymlink ? t('content.symlinkBadge') : t('content.realFolderBadge')}
              </Badge>
              {status.fileCount != null && (
                <span className="text-slate-500">{t('content.filesCount', { count: status.fileCount })}</span>
              )}
            </div>
            <p className="text-slate-500">{status.path}</p>
            {status.isSymlink && (
              <p className={status.targetExists ? 'text-slate-500' : 'text-red-600 dark:text-red-400'}>
                → {status.symlinkTarget}
                {!status.targetExists && t('content.targetMissingSuffix')}
              </p>
            )}
          </div>
        )}
        <Button className="mt-4" variant="ghost" onClick={() => setShowDialog(true)}>
          {t('content.changeSource')}
        </Button>
      </Card>

      {showDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm">
          <Card className="w-full max-w-lg">
            <h3 className="mb-1 text-lg font-semibold">{t('content.dialogTitle')}</h3>
            <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">{t('content.dialogWarning')}</p>
            <div className="flex flex-col gap-3">
              <Field label={t('content.newSourceFolder')}>
                <div className="flex gap-2">
                  <TextInput value={source} onChange={(e) => setSource(e.target.value)} className="flex-1" />
                  <Button variant="ghost" onClick={pickSource}>
                    {t('common.select')}
                  </Button>
                </div>
              </Field>
              <Field label={t('content.strategy')}>
                <Select value={strategy} onChange={(e) => setStrategy(e.target.value as ContentStrategy)}>
                  <option value="symlink">{t('content.strategySymlink')}</option>
                  <option value="copy">{t('content.strategyCopy')}</option>
                </Select>
              </Field>

              {progress && (
                <p className="text-sm text-slate-500">
                  {t('content.progress', { processed: progress.processed, total: progress.total })}
                </p>
              )}
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <div className="mt-2 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowDialog(false)} disabled={busy}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={apply} disabled={busy || !source}>
                  {busy ? t('content.applying') : t('content.apply')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

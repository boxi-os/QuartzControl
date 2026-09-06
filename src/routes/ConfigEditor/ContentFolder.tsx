import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Folder } from 'lucide-react'
import { useProject } from '../ProjectLayout'
import type { ContentProgress, ContentStatus, ContentStrategy } from '@shared/ipc-contract'
import { Badge, Button, Card, CardHeading, Field, Modal, Select, TextInput } from '../../components/ui'
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
    // Return in the folder field submits the form; the submit button being disabled stops the
    // implicit case, this stops a submit that arrives anyway.
    if (busy || !source) return
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
        <CardHeading icon={Folder} className="mb-3">{t('content.currentFolder')}</CardHeading>
        {!status && <p className="text-sm text-text-muted">{t('content.loading')}</p>}
        {status && !status.exists && <p className="text-sm text-amber-600">{t('content.noFolder')}</p>}
        {status?.exists && (
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center gap-2">
              <Badge tone={status.isSymlink ? (status.targetExists ? 'slate' : 'red') : 'green'}>
                {status.isSymlink ? t('content.symlinkBadge') : t('content.realFolderBadge')}
              </Badge>
              {status.fileCount != null && (
                <span className="text-text-muted">{t('content.filesCount', { count: status.fileCount })}</span>
              )}
            </div>
            <p className="text-text-muted">{status.path}</p>
            {status.isSymlink && (
              <p className={status.targetExists ? 'text-text-muted' : 'text-red-600 dark:text-red-400'}>
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
        <Modal
          open
          onClose={() => setShowDialog(false)}
          onSubmit={apply}
          dismissible={!busy}
          title={t('content.dialogTitle')}
        >
            <p className="mb-1 text-sm text-amber-700 dark:text-amber-400">{t('content.dialogWarning')}</p>
            <div className="flex flex-col gap-3">
              <Field label={t('content.newSourceFolder')}>
                <div className="flex gap-2">
                  <TextInput data-autofocus value={source} onChange={(e) => setSource(e.target.value)} className="flex-1" />
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
                <p className="text-sm text-text-muted">
                  {t('content.progress', { processed: progress.processed, total: progress.total })}
                </p>
              )}
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <div className="mt-2 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowDialog(false)} disabled={busy}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={busy || !source}>
                  {busy ? t('content.applying') : t('content.apply')}
                </Button>
              </div>
            </div>
        </Modal>
      )}
    </div>
  )
}

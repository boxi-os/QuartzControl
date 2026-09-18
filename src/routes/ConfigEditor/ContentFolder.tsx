import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProject } from '../ProjectLayout'
import type { ContentProgress, ContentStatus, ContentStrategy } from '@shared/ipc-contract'
import { FolderOpen } from 'lucide-react'
import { Badge, Button, Card, CardHeading, Field, FormActions, Modal, Select, TextInput } from '../../components/ui'
import HandbookLink from '../../components/HandbookLink'
import { formatIpcError } from '../../components/ErrorSurface'
import { announce } from '../../state/announcer'

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
  // The start page. Without content/index.md the site's own address is Quartz's 404 page, and a
  // linked vault almost never has one - offered here, written only from the dialog, never on its own.
  const [indexDialog, setIndexDialog] = useState(false)
  const [indexTitle, setIndexTitle] = useState('')
  const [indexBusy, setIndexBusy] = useState(false)
  const [indexError, setIndexError] = useState<string | null>(null)
  // Set when the list on a just-created start page came from the fallback rather than Quartz's own
  // globby. It outlives the dialog, because the dialog closes on success - and the one thing to say
  // then is that the list may link folders the build leaves out.
  const [indexFallback, setIndexFallback] = useState(false)

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

  function openIndexDialog(): void {
    setIndexTitle(project.name)
    setIndexError(null)
    setIndexDialog(true)
  }

  async function createIndex(): Promise<void> {
    if (indexBusy || !indexTitle.trim()) return
    setIndexBusy(true)
    setIndexError(null)
    try {
      const { path, listSource } = await window.quartzGui.content.createIndex({
        projectPath: project.path,
        title: indexTitle.trim()
      })
      setIndexDialog(false)
      setIndexFallback(listSource === 'fallback')
      announce(
        listSource === 'fallback'
          ? `${t('content.indexCreated', { path })} ${t('content.indexCreatedFallback')}`
          : t('content.indexCreated', { path })
      )
      await reload()
    } catch (err) {
      setIndexError(formatIpcError(err))
    } finally {
      setIndexBusy(false)
    }
  }

  return (
    <>
      {/* One card of the "Website" tab, like every other part of it. It is the one part of the tab
          with a chapter of its own - the header's link names the tab's, so this one names the
          folder's. The one link in a page body beside the header's; docs/conventions.md names it
          as the exception it is (Settings has one link only, having no PageHeader). */}
      <Card className="flex flex-col gap-1 text-ui">
        <CardHeading icon={FolderOpen} className="mb-2">{t('content.label')}</CardHeading>
        {!status && <p className="text-text-muted">{t('content.loading')}</p>}
        {status && !status.exists && <p className="text-amber-600">{t('content.noFolder')}</p>}
        {status?.exists && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge tone={status.isSymlink ? (status.targetExists ? 'slate' : 'red') : 'green'}>
                {status.isSymlink ? t('content.symlinkBadge') : t('content.realFolderBadge')}
              </Badge>
              {status.fileCount != null && (
                <span className="text-text-muted">{t('content.filesCount', { count: status.fileCount })}</span>
              )}
            </div>
            <p className="break-all text-text-muted">{status.path}</p>
            {status.isSymlink && (
              <p className={`break-all ${status.targetExists ? 'text-text-muted' : 'text-red-600 dark:text-red-400'}`}>
                → {status.symlinkTarget}
                {!status.targetExists && t('content.targetMissingSuffix')}
              </p>
            )}
          </div>
        )}
        {status?.hasIndex === false && (
          <div className="mt-1 flex flex-col items-start gap-2">
            <p className="text-amber-700 dark:text-amber-400">{t('content.noIndex')}</p>
            <Button variant="ghost" onClick={openIndexDialog}>
              {t('content.createIndex')}
            </Button>
          </div>
        )}
        {indexFallback && status?.hasIndex && (
          <p className="mt-1 text-amber-700 dark:text-amber-400">{t('content.indexCreatedFallback')}</p>
        )}
        <Button className="mt-1 self-start" variant="ghost" onClick={() => setShowDialog(true)}>
          {t('content.changeSource')}
        </Button>
        <span className="text-micro text-text-muted">{t('content.cardHint')}</span>
        <HandbookLink page="content" />
      </Card>

      {indexDialog && status && (
        <Modal
          open
          onClose={() => setIndexDialog(false)}
          onSubmit={createIndex}
          dismissible={!indexBusy}
          title={t('content.createIndexTitle')}
        >
          <div className="flex flex-col gap-3">
            <Field label={t('content.createIndexTitleLabel')} hint={t('content.createIndexTitleHint')}>
              <TextInput data-autofocus value={indexTitle} onChange={(e) => setIndexTitle(e.target.value)} maxLength={200} />
            </Field>
            <p className="text-xs text-text-muted">{t('content.createIndexListHint')}</p>
            {status.isSymlink && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {t('content.createIndexLinked', { path: status.symlinkTarget })}
              </p>
            )}
            {indexError && <p className="text-sm text-red-600 dark:text-red-400">{indexError}</p>}
            <FormActions>
              <Button variant="ghost" onClick={() => setIndexDialog(false)} disabled={indexBusy}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={indexBusy || !indexTitle.trim()}>
                {indexBusy ? t('content.creatingIndex') : t('content.createIndexAction')}
              </Button>
            </FormActions>
          </div>
        </Modal>
      )}

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

              <FormActions>
                <Button variant="ghost" onClick={() => setShowDialog(false)} disabled={busy}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={busy || !source}>
                  {busy ? t('content.applying') : t('content.apply')}
                </Button>
              </FormActions>
            </div>
        </Modal>
      )}
    </>
  )
}

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useProject } from '../ProjectLayout'
import type { QuartzConfig } from '@shared/ipc-contract'
import { Button, PageHeader } from '../../components/ui'
import { TAB_ICONS } from '../navConfig'
import SiteSettings from './SiteSettings'

export default function ConfigEditor(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [config, setConfig] = useState<QuartzConfig | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    setLoadError(null)
    window.quartzGui.config.get(project.path).then(setConfig).catch((err) => setLoadError(String(err)))
  }, [project.path])

  async function save(): Promise<void> {
    if (!config) return
    setStatus('saving')
    setError(null)
    try {
      await window.quartzGui.config.save(project.path, config)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      setStatus('error')
      setError(String(err))
    }
  }

  if (loadError) {
    return (
      <div className="max-w-xl">
        <p className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">{t('configEditor.loadError')}</p>
        <pre className="whitespace-pre-wrap rounded-md bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {loadError}
        </pre>
        <p className="mt-2 text-sm text-slate-500">{t('configEditor.loadErrorHint')}</p>
      </div>
    )
  }

  if (!config) return <p className="text-sm text-slate-500">{t('configEditor.loading')}</p>

  return (
    <div>
      <PageHeader
        icon={TAB_ICONS.config}
        title={t('projectLayout.tabs.config')}
        description={t('projectLayout.descriptions.config')}
        actions={
          <>
            {status === 'saved' && <span className="text-sm text-green-600 dark:text-green-400">{t('common.saved')}</span>}
            {status === 'error' && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
            <Button onClick={save} disabled={status === 'saving'}>
              {status === 'saving' ? t('common.saving') : t('common.save')}
            </Button>
          </>
        }
      />

      <SiteSettings
        configuration={config.configuration}
        onChange={(configuration) => setConfig({ ...config, configuration })}
      />

      {/* Colors and fonts used to be a second tab here. They are the bottom layer of the styling
          cascade, so they now live with the other three layers on the Styles page instead. */}
      <p className="mt-8 max-w-xl text-xs text-slate-500 dark:text-slate-400">
        {t('configEditor.themeMoved')}{' '}
        <Link to="../styles" className="underline">
          {t('configEditor.themeMovedLink')}
        </Link>
      </p>
    </div>
  )
}

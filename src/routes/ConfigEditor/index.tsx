import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProject } from '../ProjectLayout'
import type { QuartzConfig } from '@shared/ipc-contract'
import { Button, SegmentedControl } from '../../components/ui'
import SiteSettings from './SiteSettings'
import ThemeEditor from './ThemeEditor'

export default function ConfigEditor(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [config, setConfig] = useState<QuartzConfig | null>(null)
  const [tab, setTab] = useState<'site' | 'theme'>('site')
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
      <div className="mb-6 flex items-center justify-between">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'site', label: t('configEditor.tabSite') },
            { value: 'theme', label: t('configEditor.tabTheme') }
          ]}
        />
        <div className="flex items-center gap-3">
          {status === 'saved' && <span className="text-sm text-green-600 dark:text-green-400">{t('common.saved')}</span>}
          {status === 'error' && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
          <Button onClick={save} disabled={status === 'saving'}>
            {status === 'saving' ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </div>

      {tab === 'site' && (
        <SiteSettings
          configuration={config.configuration}
          onChange={(configuration) => setConfig({ ...config, configuration })}
        />
      )}
      {tab === 'theme' && (
        <ThemeEditor theme={config.theme} plugins={config.plugins} onChange={(theme) => setConfig({ ...config, theme })} />
      )}
    </div>
  )
}

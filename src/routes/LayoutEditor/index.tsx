import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProject } from '../ProjectLayout'
import type { GridFrameDefinition, QuartzConfig } from '@shared/ipc-contract'
import { Button, PageHeader, Select } from '../../components/ui'
import { TAB_ICONS } from '../navConfig'
import GlobalBoard from './GlobalBoard'
import PageTypeOverrides from './PageTypeOverrides'
import FrameBuilder from './FrameBuilder'
import { derivePageTypes } from './utils'

export default function LayoutEditor(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [config, setConfig] = useState<QuartzConfig | null>(null)
  const [tab, setTab] = useState<string>('global')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [addingType, setAddingType] = useState('')
  const [customFrames, setCustomFrames] = useState<GridFrameDefinition[]>([])

  useEffect(() => {
    window.quartzGui.config.get(project.path).then(setConfig)
  }, [project.path])

  useEffect(() => {
    if (tab !== 'frames') window.quartzGui.layoutFrames.list(project.path).then(setCustomFrames)
  }, [project.path, tab])

  // Creating/deleting a frame mutates quartz.config.yaml's plugins array out-of-band (via the
  // `quartz plugin add/remove` CLI in layoutFrameService), so the in-memory `config.plugins` this
  // editor holds goes stale the moment that happens. Re-syncing only `plugins` (not the whole
  // config) preserves any unsaved layout edits already queued up in other tabs.
  async function syncPluginsFromDisk(): Promise<void> {
    const fresh = await window.quartzGui.config.get(project.path)
    setConfig((prev) => (prev ? { ...prev, plugins: fresh.plugins } : fresh))
  }

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

  const availablePageTypes = useMemo(() => (config ? derivePageTypes(config.plugins) : []), [config])
  const overrideTypes = Object.keys(config?.layout?.byPageType ?? {})
  const addableTypes = availablePageTypes.filter((pt) => !overrideTypes.includes(pt))

  function addOverride(pageType: string): void {
    if (!config || !pageType) return
    const byPageType = { ...(config.layout?.byPageType ?? {}), [pageType]: {} }
    setConfig({ ...config, layout: { ...config.layout, byPageType } })
    setTab(pageType)
    setAddingType('')
  }

  function removeOverride(pageType: string): void {
    if (!config) return
    const byPageType = { ...(config.layout?.byPageType ?? {}) }
    delete byPageType[pageType]
    setConfig({ ...config, layout: { ...config.layout, byPageType } })
    setTab('global')
  }

  if (!config) return <p className="text-sm text-slate-500">{t('layoutEditor.loading')}</p>

  return (
    <div className="max-w-4xl">
      <PageHeader
        icon={TAB_ICONS.layout}
        title={t('projectLayout.tabs.layout')}
        description={t('projectLayout.descriptions.layout')}
      />
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-[8px] bg-black/[0.05] p-0.5 dark:bg-white/10">
          <button
            onClick={() => setTab('global')}
            className={`rounded-[6px] px-3 py-1 text-[13px] font-medium transition-colors ${
              tab === 'global'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-white/20 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            {t('layoutEditor.tabGlobal')}
          </button>
          {overrideTypes.map((pt) => (
            <button
              key={pt}
              onClick={() => setTab(pt)}
              className={`rounded-[6px] px-3 py-1 text-[13px] font-medium transition-colors ${
                tab === pt
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-white/20 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {t(`layoutEditor.pageTypes.${pt}`, pt)}
            </button>
          ))}
          <button
            onClick={() => setTab('frames')}
            className={`rounded-[6px] px-3 py-1 text-[13px] font-medium transition-colors ${
              tab === 'frames'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-white/20 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            {t('layoutEditor.tabFrames')}
          </button>
        </div>
        {tab !== 'frames' && (
          <div className="flex items-center gap-3">
            {status === 'saved' && <span className="text-sm text-green-600 dark:text-green-400">{t('common.saved')}</span>}
            {status === 'error' && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
            <Button onClick={save} disabled={status === 'saving'}>
              {status === 'saving' ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        )}
      </div>

      {tab === 'global' && (
        <>
          {addableTypes.length > 0 && (
            <div className="mb-4 flex items-center gap-2">
              <Select value={addingType} onChange={(e) => setAddingType(e.target.value)} className="w-56">
                <option value="">{t('layoutEditor.addOverridePlaceholder')}</option>
                {addableTypes.map((pt) => (
                  <option key={pt} value={pt}>
                    {t(`layoutEditor.pageTypes.${pt}`, pt)}
                  </option>
                ))}
              </Select>
              <Button variant="ghost" onClick={() => addOverride(addingType)} disabled={!addingType}>
                {t('layoutEditor.addOverride')}
              </Button>
            </div>
          )}
          <GlobalBoard config={config} onChange={setConfig} />
        </>
      )}

      {tab === 'frames' && <FrameBuilder projectPath={project.path} config={config} onFramesChanged={syncPluginsFromDisk} />}

      {tab !== 'global' && tab !== 'frames' && (
        <>
          <div className="mb-4 flex justify-end">
            <button type="button" onClick={() => removeOverride(tab)} className="text-xs text-slate-500 underline">
              {t('layoutEditor.removeOverride')}
            </button>
          </div>
          <PageTypeOverrides
            config={config}
            pageType={tab}
            onChange={setConfig}
            customTemplates={customFrames.map((f) => f.frameName)}
          />
        </>
      )}
    </div>
  )
}

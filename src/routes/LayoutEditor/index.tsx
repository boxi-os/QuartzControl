import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal } from 'lucide-react'
import { useProject } from '../ProjectLayout'
import type { GridFrameDefinition, QuartzConfig } from '@shared/ipc-contract'
import { Button, PageHeader } from '../../components/ui'
import { TAB_ICONS } from '../navConfig'
import GlobalBoard from './GlobalBoard'
import PageTypeOverrides from './PageTypeOverrides'
import FrameBuilder from './FrameBuilder'
import { derivePageTypes, hasPageTypeOverride } from './utils'

type Tab = 'global' | 'pagetypes' | 'frames'

export default function LayoutEditor(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [config, setConfig] = useState<QuartzConfig | null>(null)
  const [tab, setTab] = useState<Tab>('global')
  const [activePageType, setActivePageType] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [customFrames, setCustomFrames] = useState<GridFrameDefinition[]>([])
  // Frame names built-in pageType plugins (e.g. canvas-page) bring as their own default, keyed by
  // plugin display name - see IPC.layoutFrameBuiltinPageTypeFrames. Config.yaml never records
  // these, so without this lookup the "Frame/Template" dropdown and Global's preview both silently
  // assumed "no override" meant the literal 3-column default frame, which is wrong for e.g. canvas
  // pages (canvas-page's PageType instance defaults to its own fullscreen "canvas" frame).
  const [builtinPageTypeFrames, setBuiltinPageTypeFrames] = useState<Record<string, string>>({})

  useEffect(() => {
    window.quartzGui.config.get(project.path).then(setConfig)
  }, [project.path])

  useEffect(() => {
    if (tab !== 'frames') window.quartzGui.layoutFrames.list(project.path).then(setCustomFrames)
  }, [project.path, tab])

  // Keyed off the plugins' identity (name+source), not the whole `config` object, so dragging
  // components around in Global (which mutates config.plugins' order/layout) doesn't re-trigger
  // this node_modules scan on every drop.
  const pluginSourcesKey = useMemo(() => JSON.stringify((config?.plugins ?? []).map((p) => [p.name, p.source])), [config])

  useEffect(() => {
    if (tab === 'frames' || !config) return
    window.quartzGui.layoutFrames.builtinPageTypeFrames(project.path, config.plugins).then(setBuiltinPageTypeFrames)
    // config is intentionally omitted - pluginSourcesKey is the stable proxy for its relevant part
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.path, tab, pluginSourcesKey])

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
  // Raw keys present under layout.byPageType, regardless of whether they actually customize
  // anything - still lets "Override entfernen" clean up a stray empty entry left over from before
  // the selectPageType fix below, or from every individual toggle for a type being undone one at a
  // time (see PageTypeOverrides.update()).
  const overrideTypes = Object.keys(config?.layout?.byPageType ?? {})
  // Which of those are worth flagging to the user - see hasPageTypeOverride's doc comment.
  const customizedTypes = overrideTypes.filter((pt) => hasPageTypeOverride(config?.layout?.byPageType?.[pt]))

  // Just switches which page type's override panel is shown - does NOT write anything to
  // config.layout.byPageType. Merely viewing a page type must not count as customizing it; the
  // override entry is created lazily by PageTypeOverrides.update() the moment the user actually
  // changes a field (reproduced by hand: every page type ever clicked once got permanently marked
  // "Angepasst" and, on save, wrote an empty `{}` override into quartz.config.yaml).
  function selectPageType(pageType: string): void {
    setActivePageType(pageType)
  }

  function removeOverride(pageType: string): void {
    if (!config) return
    const byPageType = { ...(config.layout?.byPageType ?? {}) }
    delete byPageType[pageType]
    setConfig({ ...config, layout: { ...config.layout, byPageType } })
    setActivePageType(null)
  }

  if (!config) return <p className="text-sm text-slate-500">{t('layoutEditor.loading')}</p>

  return (
    <div>
      <PageHeader
        icon={TAB_ICONS.layout}
        title={t('projectLayout.tabs.layout')}
        description={t('projectLayout.descriptions.layout')}
      />
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-[8px] bg-black/[0.05] p-0.5 dark:bg-white/10">
          {(['global', 'pagetypes', 'frames'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-[6px] px-3 py-1 text-[13px] font-medium transition-colors ${
                tab === key
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-white/20 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {t(`layoutEditor.tab${key === 'global' ? 'Global' : key === 'pagetypes' ? 'PageTypes' : 'Frames'}`)}
            </button>
          ))}
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

      {tab === 'pagetypes' && (
        <div className="mb-6 flex flex-wrap items-center gap-1.5 border-b border-black/[0.06] pb-4 dark:border-white/10">
          {availablePageTypes.map((pt) => (
            <button
              key={pt}
              onClick={() => selectPageType(pt)}
              className={`flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[13px] font-medium transition-colors ${
                activePageType === pt
                  ? 'bg-blue-600 text-white'
                  : 'bg-black/[0.04] text-slate-700 hover:bg-black/[0.08] dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15'
              }`}
            >
              {t(`layoutEditor.pageTypes.${pt}`, pt)}
              {customizedTypes.includes(pt) && activePageType !== pt && (
                <span title={t('layoutEditor.pageTypeHasOverride')} className="shrink-0 opacity-70">
                  <SlidersHorizontal size={12} aria-hidden="true" />
                </span>
              )}
            </button>
          ))}
          {activePageType && overrideTypes.includes(activePageType) && (
            <button type="button" onClick={() => removeOverride(activePageType)} className="ml-auto text-xs text-slate-500 underline">
              {t('layoutEditor.removeOverride')}
            </button>
          )}
        </div>
      )}

      {tab === 'global' && (
        <GlobalBoard projectPath={project.path} config={config} onChange={setConfig} builtinPageTypeFrames={builtinPageTypeFrames} />
      )}

      {tab === 'frames' && <FrameBuilder projectPath={project.path} onFramesChanged={syncPluginsFromDisk} />}

      {tab === 'pagetypes' &&
        (activePageType ? (
          <PageTypeOverrides
            config={config}
            pageType={activePageType}
            onChange={setConfig}
            customTemplates={customFrames.map((f) => f.frameName)}
            builtinFrameName={builtinPageTypeFrames[`${activePageType}-page`]}
          />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('layoutEditor.pageTypesHint')}</p>
        ))}
    </div>
  )
}

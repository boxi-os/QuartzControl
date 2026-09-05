import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { useProject } from '../ProjectLayout'
import type { GridFrameDefinition, QuartzConfig } from '@shared/ipc-contract'
import { Button, PageHeader, SegmentedControl } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import { useStickyState } from '../../state/uiState'
import { useSaveCommand } from '../../state/saveCommand'
import { UnsavedBadge, useUnsavedChanges } from '../../state/unsavedGuard'
import { TAB_ICONS } from '../navConfig'
import GlobalBoard from './GlobalBoard'
import PageTypeOverrides from './PageTypeOverrides'
import FrameBuilder from './FrameBuilder'
import { derivePageTypes, hasPageTypeOverride } from './utils'

type Tab = 'global' | 'pagetypes' | 'frames'
const TAB_ORDER: Tab[] = ['global', 'pagetypes', 'frames']

function isTab(value: string | null): value is Tab {
  return value !== null && (TAB_ORDER as string[]).includes(value)
}

export default function LayoutEditor(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [config, setConfig] = useState<QuartzConfig | null>(null)
  // What quartz.config.yaml held when it was last read - see syncPluginsFromDisk, which moves this
  // along with it, so a frame the CLI just registered does not read as an unsaved edit.
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  // URL first, remembered tab as the fallback - the same shape Konfiguration and Stile use. The
  // parameter is what makes "open this frame in the layout editor" a link rather than a store
  // write, and what lets a sub-tab be deep-linked at all; the sticky half is still needed because
  // the sidebar's NavLink carries no search string, so a trip to another area and back would
  // otherwise always reset to Global. Which page type is open stays sticky-only: it is a value out
  // of the project's own data, not one of three fixed names.
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const [lastTab, setLastTab] = useStickyState<Tab>('layout.tab', 'global')
  const tab: Tab = isTab(rawTab) ? rawTab : lastTab
  const [activePageType, setActivePageType] = useStickyState<string | null>('layout.pageType', null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [customFrames, setCustomFrames] = useState<GridFrameDefinition[]>([])
  // Frame names built-in pageType plugins (e.g. canvas-page) bring as their own default, keyed by
  // plugin display name - see IPC.layoutFrameBuiltinPageTypeFrames. Config.yaml never records
  // these, so without this lookup the "Frame/Template" dropdown and Global's preview both silently
  // assumed "no override" meant the literal 3-column default frame, which is wrong for e.g. canvas
  // pages (canvas-page's PageType instance defaults to its own fullscreen "canvas" frame).
  const [builtinPageTypeFrames, setBuiltinPageTypeFrames] = useState<Record<string, string>>({})

  // A tab reached through the URL has to be remembered as well, or coming back via the sidebar -
  // which carries no search string - would drop the user somewhere they never chose.
  useEffect(() => {
    if (isTab(rawTab)) setLastTab(rawTab)
  }, [rawTab, setLastTab])

  const goToTab = useCallback(
    (next: Tab) => {
      setSearchParams(next === 'global' ? {} : { tab: next }, { replace: true })
      setLastTab(next)
    },
    [setSearchParams, setLastTab]
  )

  useEffect(() => {
    window.quartzGui.config
      .get(project.path)
      .then((loaded) => {
        setConfig(loaded)
        setSavedSnapshot(JSON.stringify(loaded))
      })
      .catch((err) => setLoadError(formatIpcError(err)))
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
    // The snapshot is what is on disk, which `fresh` now is - so unsaved layout edits elsewhere in
    // the config still count as unsaved, while the plugin entry the CLI just wrote does not.
    setSavedSnapshot(JSON.stringify(fresh))
  }

  // Returns whether it worked - see the leave guard in ProjectLayout.
  async function save(): Promise<boolean> {
    if (!config) return false
    setStatus('saving')
    setError(null)
    try {
      await window.quartzGui.config.save(project.path, config)
      setSavedSnapshot(JSON.stringify(config))
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
      return true
    } catch (err) {
      setStatus('error')
      setError(formatIpcError(err))
      return false
    }
  }

  const dirty = useMemo(
    () => config !== null && savedSnapshot !== null && JSON.stringify(config) !== savedSnapshot,
    [config, savedSnapshot]
  )
  useUnsavedChanges(dirty)
  // Cmd+S saves the same thing the button does, and is registered only while that button would do
  // something: no edits, a save already running, or a sub-tab that saves elsewhere means the
  // shortcut stays quiet rather than rewriting an unchanged file.
  useSaveCommand(tab !== 'frames' && dirty && status !== 'saving' ? save : null)

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

  if (loadError) {
    return (
      <div className="max-w-xl">
        <p className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">{t('configEditor.loadError')}</p>
        <pre className="whitespace-pre-wrap rounded-md bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {loadError}
        </pre>
        <p className="mt-2 text-sm text-text-muted">{t('configEditor.loadErrorHint')}</p>
      </div>
    )
  }
  if (!config) return <p className="text-sm text-text-muted">{t('layoutEditor.loading')}</p>

  return (
    <div>
      <PageHeader
        icon={TAB_ICONS.layout}
        title={t('projectLayout.tabs.layout')}
        description={t('projectLayout.descriptions.layout')}
        status={
          tab !== 'frames' ? (
            <>
              {status === 'saved' && <span className="text-sm text-green-600 dark:text-green-400">{t('common.saved')}</span>}
              {status === 'error' && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
            </>
          ) : undefined
        }
        actions={
          // Same place as on Konfiguration and Stile - the other two pages that hold a whole
          // document behind one Save button. The Frames tab saves per frame from its own editor.
          tab !== 'frames' && (
            <>
              {dirty && status !== 'saving' && <UnsavedBadge />}
              <Button onClick={save} disabled={status === 'saving'}>
                {status === 'saving' ? t('common.saving') : t('common.save')}
              </Button>
            </>
          )
        }
      />
      <div className="mb-4">
        <SegmentedControl
          label={t('common.viewSwitcher')}
          value={tab}
          onChange={goToTab}
          options={TAB_ORDER.map((key) => ({
            value: key,
            label: t(`layoutEditor.tab${key === 'global' ? 'Global' : key === 'pagetypes' ? 'PageTypes' : 'Frames'}`)
          }))}
        />
      </div>

      {tab === 'pagetypes' && (
        <div className="mb-6 flex flex-wrap items-center gap-1.5 border-b border-ink/[0.06] pb-4 dark:border-ink/10">
          {availablePageTypes.map((pt) => (
            <button
              key={pt}
              onClick={() => selectPageType(pt)}
              className={`flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-ui font-medium transition-colors ${
                activePageType === pt
                  ? 'bg-blue-600 text-white'
                  : 'bg-ink/[0.04] text-text-secondary hover:bg-ink/[0.08] dark:bg-ink/10 dark:hover:bg-ink/15'
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
            <button type="button" onClick={() => removeOverride(activePageType)} className="ml-auto text-xs text-text-muted underline">
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
          <p className="text-sm text-text-muted">{t('layoutEditor.pageTypesHint')}</p>
        ))}
    </div>
  )
}

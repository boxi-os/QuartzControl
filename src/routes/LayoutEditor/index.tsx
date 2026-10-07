import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useProject } from '../ProjectLayout'
import type { FrameBreakpoint, GridFrameDefinition, QuartzConfig } from '@shared/ipc-contract'
import { Button, PageHeader, SegmentedControl } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import { peekStickyState, primeStickyState, useStickyState } from '../../state/uiState'
import { announce } from '../../state/announcer'
import { useSaveCommand } from '../../state/saveCommand'
import { UnsavedBadge, useUnsavedChanges } from '../../state/unsavedGuard'
import { TAB_ICONS } from '../navConfig'
import GlobalBoard from './GlobalBoard'
import FrameBuilder from './FrameBuilder'
import HandbookLink from '../../components/HandbookLink'

// Ein Kapitel je Frage: was erscheint wo (die Bühne, mit den Seitentypen seit 1.1), und wie ist die
// Seite aufgeteilt (die eigenen Frames).
const HANDBOOK = { global: 'layoutGlobal', frames: 'layoutFrames' } as const

type Tab = 'global' | 'frames'
const TAB_ORDER: Tab[] = ['global', 'frames']
// The page types were a tab of their own until 1.1 and are the stage's selector now. A link or a
// remembered tab that still says so opens the stage rather than nothing.
const RETIRED_TABS = ['pagetypes']

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
  // otherwise always reset to Global. Which page type the stage shows stays sticky-only (GlobalBoard):
  // it is a value out of the project's own data, not one of two fixed names.
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const [lastTab, setLastTab] = useStickyState<Tab>('layout.tab', 'global')
  const tab: Tab = isTab(rawTab) ? rawTab : isTab(lastTab) ? lastTab : 'global'
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
    else if (rawTab && RETIRED_TABS.includes(rawTab)) {
      setSearchParams({}, { replace: true })
      setLastTab('global')
    }
  }, [rawTab, setLastTab, setSearchParams])

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

  // "Frame bearbeiten" on the stage: the frame builder on this frame and in the view the stage
  // showed, the same hand-over as Plugins' openFrameInLayoutEditor, only within this route - the
  // builder is not mounted while the board is, so it reads the primed values when the tab opens.
  // What the builder still holds wins over the link: a draft of this very frame is newer than the
  // file, and a draft of another frame with unsaved changes would otherwise be thrown away by a
  // click that only meant to look somewhere else.
  const { pathname } = useLocation()
  function editFrame(frame: GridFrameDefinition, breakpoint: FrameBreakpoint): void {
    const open = peekStickyState<GridFrameDefinition | null>(pathname, 'frames.editing') ?? null
    const saved = open && customFrames.find((f) => f.id === open.id)
    const openIsDirty = !!open && open.id !== frame.id && (!saved || JSON.stringify(saved) !== JSON.stringify(open))
    if (openIsDirty) {
      announce(t('layoutEditor.stage.otherDraftOpen', { name: open.frameName }))
    } else {
      if (open?.id !== frame.id) {
        primeStickyState(pathname, 'frames.editing', frame)
        primeStickyState(pathname, 'frames.isNewDraft', false)
        primeStickyState(pathname, 'frames.selectedArea', null)
      }
      primeStickyState(pathname, 'frames.breakpoint', breakpoint)
    }
    goToTab('frames')
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

  if (loadError) {
    return (
      <div className="max-w-xl">
        <p className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">{t('configEditor.loadError')}</p>
        <pre className="whitespace-pre-wrap rounded-md bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {loadError}
        </pre>
      </div>
    )
  }
  if (!config) return <p className="text-sm text-text-muted">{t('layoutEditor.loading')}</p>

  return (
    <div>
      <PageHeader
        handbook={<HandbookLink page={HANDBOOK[tab]} />}
        icon={TAB_ICONS.layout}
        title={t('projectLayout.tabs.layout')}
        description={t('projectLayout.descriptions.layout')}
        status={
          tab !== 'frames' ? (
            status === 'saved' ? (
              <span className="text-sm text-green-600 dark:text-green-400">{t('common.saved')}</span>
            ) : null
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
      {/* The save error below the header, not in its slot: the slot is shrink-0 beside the title
          and does not wrap, so a long sentence pushed the title block aside and was cut off at the
          window edge (thirty-fourth review, finding 3, measured on Stile). Its own live region,
          mounted empty, because it appears after a save without anyone asking for it. */}
      <p role="status" className="mb-3 text-sm text-red-600 empty:mb-0 dark:text-red-400">
        {tab !== 'frames' && status === 'error' ? error : null}
      </p>
      <div className="mb-4">
        <SegmentedControl
          label={t('common.viewSwitcher')}
          value={tab}
          onChange={goToTab}
          options={TAB_ORDER.map((key) => ({
            value: key,
            label: t(key === 'global' ? 'layoutEditor.tabGlobal' : 'layoutEditor.tabFrames')
          }))}
        />
      </div>

      {tab === 'global' && (
        <GlobalBoard
          projectPath={project.path}
          config={config}
          onChange={setConfig}
          onEditFrame={editFrame}
          builtinPageTypeFrames={builtinPageTypeFrames}
        />
      )}

      {tab === 'frames' && <FrameBuilder projectPath={project.path} onFramesChanged={syncPluginsFromDisk} />}
    </div>
  )
}

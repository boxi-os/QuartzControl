import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import type { CssVariableGraph, Project, QuartzConfig, StyleFileSet } from '@shared/ipc-contract'
import { Button, PageHeader, SegmentedControl } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import { useStickyState } from '../../state/uiState'
import { UnsavedBadge, useUnsavedChanges } from '../../state/unsavedGuard'
import { TAB_ICONS } from '../navConfig'
import { useProject } from '../ProjectLayout'
import Basics from './Basics'
import Theme from './Theme'
import Variables from './Variables'
import CustomCss from './CustomCss'

export type StylesTab = 'basics' | 'theme' | 'variables' | 'customCss'

const TAB_ORDER: StylesTab[] = ['basics', 'theme', 'variables', 'customCss']

function isTab(value: string | null): value is StylesTab {
  return value !== null && (TAB_ORDER as string[]).includes(value)
}

// Editing state for every styling layer lives here rather than in the four sub-tabs, because only
// one sub-tab is mounted at a time (switching unmounts the previous one) and all four ultimately
// write to just two places: quartz.config.yaml and quartz/styles/custom.scss. Lifting it keeps an
// unsaved draft alive across a tab switch, lets the cascade line above the tabs report what the
// other layers currently contain, and gives the page a single Save button instead of one per
// section - each sub-tab registers what "save" means for it via registerSave().
export interface StylesContextValue {
  project: Project
  config: QuartzConfig
  setConfig: (next: QuartzConfig) => void
  saveConfig: () => Promise<void>
  overrides: Record<string, { light: string; dark: string }>
  setOverrides: React.Dispatch<React.SetStateAction<Record<string, { light: string; dark: string }>>>
  scss: { path: string; content: string; dirty: boolean; staleOnDisk: boolean }
  /** True while anything on this page differs from what is on disk. */
  dirty: boolean
  setScssContent: (content: string) => void
  reloadScss: (force?: boolean) => Promise<void>
  /** custom.scss plus every additional stylesheet, in the order the import block loads them. */
  fileSet: StyleFileSet | null
  /** Unsaved editor content per relativePath - only files the user actually typed in appear. */
  fileDrafts: Record<string, string>
  setFileDraft: (relativePath: string, content: string) => void
  clearFileDrafts: (relativePaths: string[]) => void
  reloadFiles: () => Promise<void>
  graph: CssVariableGraph | null
  graphLoading: boolean
  reloadGraph: () => void
  registerSave: (fn: () => Promise<void>) => void
  goToTab: (tab: StylesTab) => void
}

const StylesContext = createContext<StylesContextValue | null>(null)

export function useStyles(): StylesContextValue {
  const value = useContext(StylesContext)
  if (!value) throw new Error('useStyles must be used inside the Styles route')
  return value
}

// The one place that knows how a Quartz theme plugin is recognised on this page - kept in sync with
// the same check in ProjectDashboard/Theme.tsx (source prefix, since @quartz-themes is a whole npm
// scope rather than one fixed plugin name).
export function activeThemeIdOf(config: QuartzConfig): string | undefined {
  const plugin = config.plugins.find((p) => typeof p.source === 'string' && p.source.startsWith('@quartz-themes/'))
  if (!plugin?.enabled) return undefined
  return typeof plugin.options?.theme === 'string' ? plugin.options.theme : undefined
}

export default function Styles(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  // The URL stays the source of truth (so /themes' redirect and any in-app link still land right),
  // but the sidebar's NavLink points at a bare "styles" with no search string - so coming back from
  // another area would otherwise always reset to Basis. The remembered tab fills exactly that gap:
  // it only applies when the URL says nothing.
  const [lastTab, setLastTab] = useStickyState<StylesTab>('styles.tab', 'basics')
  const tab: StylesTab = isTab(rawTab) ? rawTab : lastTab

  const [config, setConfig] = useState<QuartzConfig | null>(null)
  const [overrides, setOverrides] = useState<Record<string, { light: string; dark: string }>>({})
  // `original` is what the file held when it was last read, so `dirty` stays a comparison rather
  // than a flag that survives typing an edit and undoing it again.
  const [scss, setScss] = useState<{
    path: string
    content: string
    original: string
    dirty: boolean
    staleOnDisk: boolean
  } | null>(null)
  const [savedConfig, setSavedConfig] = useState<string | null>(null)
  const [savedOverrides, setSavedOverrides] = useState<string | null>(null)
  const [fileSet, setFileSet] = useState<StyleFileSet | null>(null)
  const [fileDrafts, setFileDrafts] = useState<Record<string, string>>({})
  const [graph, setGraph] = useState<CssVariableGraph | null>(null)
  const [graphLoading, setGraphLoading] = useState(true)
  const [graphNonce, setGraphNonce] = useState(0)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  // Assigned on every render of the active sub-tab (see registerSave below) - a ref rather than
  // state because changing it must never re-render the shell, which would remount the sub-tab.
  const saveRef = useRef<() => Promise<void>>(async () => {})

  useEffect(() => {
    window.quartzGui.config.get(project.path).then((loaded) => {
      setConfig(loaded)
      setSavedConfig(JSON.stringify(loaded))
    })
    window.quartzGui.styles
      .get(project.path)
      .then((info) => setScss({ ...info, original: info.content, dirty: false, staleOnDisk: false }))
    window.quartzGui.styles.listFiles(project.path).then(setFileSet)
    window.quartzGui.styles.getVariableOverrides(project.path).then((list) => {
      const next: Record<string, { light: string; dark: string }> = {}
      for (const o of list) next[o.key] = { light: o.light, dark: o.dark ?? o.light }
      setOverrides(next)
      setSavedOverrides(JSON.stringify(next))
    })
  }, [project.path])

  // Re-read whenever the active theme changes (a different theme.json means a different variable
  // table entirely) or the user asks for it after a build. Deliberately keyed on the theme *id*
  // rather than the config object, so editing an unrelated field doesn't re-scan build output.
  const configLoaded = config !== null
  const activeTheme = config ? activeThemeIdOf(config) : undefined
  useEffect(() => {
    if (!configLoaded) return
    let cancelled = false
    setGraphLoading(true)
    window.quartzGui.styles.variableGraph(project.path, activeTheme).then((result) => {
      if (cancelled) return
      setGraph(result)
      setGraphLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [project.path, activeTheme, graphNonce, configLoaded])

  // A tab reached through the URL (the /themes redirect, a link from another tab, a deep link) has
  // to be remembered too - otherwise coming back via the sidebar, which carries no search string,
  // would drop the user somewhere they never chose. goToTab still records it as well, because
  // switching to Basis clears the parameter entirely and leaves nothing here to react to.
  useEffect(() => {
    if (isTab(rawTab)) setLastTab(rawTab)
  }, [rawTab, setLastTab])

  const goToTab = useCallback(
    (next: StylesTab) => {
      setSearchParams(next === 'basics' ? {} : { tab: next }, { replace: true })
      setLastTab(next)
      setStatus('idle')
      setMessage(null)
    },
    [setSearchParams, setLastTab]
  )

  const registerSave = useCallback((fn: () => Promise<void>) => {
    saveRef.current = fn
  }, [])

  const setScssContent = useCallback((content: string) => {
    setScss((prev) => (prev ? { ...prev, content, dirty: content !== prev.original } : prev))
  }, [])

  const reloadGraph = useCallback(() => setGraphNonce((n) => n + 1), [])

  // Creating, renaming, reordering and deleting a stylesheet all act on disk immediately - they
  // are file operations, not text edits, and treating them as drafts would mean a second copy of
  // the import order that could disagree with the file. Only the *content* of a file is a draft.
  // Every one of them rewrites custom.scss's import block, so reloadScss() runs afterwards for the
  // same reason variable overrides do (see below).
  const reloadFiles = useCallback(async () => {
    setFileSet(await window.quartzGui.styles.listFiles(project.path))
  }, [project.path])

  // Drafts are keyed by relativePath and survive a sub-tab switch, exactly like the custom.scss
  // draft above - the whole point of lifting this state out of the tab that renders it.
  const setFileDraft = useCallback((relativePath: string, content: string) => {
    setFileDrafts((prev) => ({ ...prev, [relativePath]: content }))
  }, [])

  const clearFileDrafts = useCallback((relativePaths: string[]) => {
    setFileDrafts((prev) => {
      const next = { ...prev }
      for (const relativePath of relativePaths) delete next[relativePath]
      return next
    })
  }, [])

  // Saving variable overrides and importing a local font both rewrite custom.scss behind the
  // editor's back (each replaces its own marker-delimited managed block), so the in-memory draft
  // has to be re-read afterwards or the next save from the CSS tab would write it straight back to
  // the pre-change state. An unsaved draft is never silently thrown away: it stays, flagged
  // staleOnDisk, and the CSS tab offers an explicit reload.
  const reloadScss = useCallback(
    async (force = false) => {
      const info = await window.quartzGui.styles.get(project.path)
      setScss((prev) => {
        if (prev?.dirty && !force) return { ...prev, original: info.content, staleOnDisk: true }
        return { ...info, original: info.content, dirty: false, staleOnDisk: false }
      })
    },
    [project.path]
  )

  const saveConfig = useCallback(async () => {
    if (!config) return
    await window.quartzGui.config.save(project.path, config)
  }, [config, project.path])

  async function save(): Promise<void> {
    setStatus('saving')
    setMessage(null)
    try {
      await saveRef.current()
      // Every sub-tab's save ends with what it wrote being on disk, so both snapshots are taken
      // again here rather than in four places - the scss/file drafts clear themselves.
      setSavedConfig(JSON.stringify(config))
      setSavedOverrides(JSON.stringify(overrides))
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      setStatus('error')
      setMessage(formatIpcError(err))
    }
  }

  // Computed before the early return below, since the guard is a hook and hooks cannot be skipped.
  const dirty =
    (savedConfig !== null && JSON.stringify(config) !== savedConfig) ||
    (savedOverrides !== null && JSON.stringify(overrides) !== savedOverrides) ||
    (scss?.dirty ?? false) ||
    Object.keys(fileDrafts).length > 0
  useUnsavedChanges(dirty)

  if (!config || !scss) return <p className="text-sm text-slate-500">{t('common.loading')}</p>

  const value: StylesContextValue = {
    project,
    config,
    setConfig,
    saveConfig,
    overrides,
    setOverrides,
    scss,
    setScssContent,
    reloadScss,
    fileSet,
    fileDrafts,
    setFileDraft,
    clearFileDrafts,
    reloadFiles,
    graph,
    graphLoading,
    reloadGraph,
    registerSave,
    goToTab,
    dirty
  }

  const themeId = activeThemeIdOf(config)
  const overrideCount = Object.keys(overrides).length

  return (
    <StylesContext.Provider value={value}>
      <div className="flex flex-col">
        <PageHeader
          icon={TAB_ICONS.styles}
          title={t('projectLayout.tabs.styles')}
          description={t('projectLayout.descriptions.styles')}
          actions={
            <>
              {status === 'saved' && <span className="text-sm text-green-600 dark:text-green-400">{t('common.saved')}</span>}
              {status === 'error' && <span className="text-sm text-red-600 dark:text-red-400">{message}</span>}
              {dirty && status !== 'saving' && <UnsavedBadge />}
              <Button onClick={save} disabled={status === 'saving'}>
                {status === 'saving' ? t('common.saving') : t('common.save')}
              </Button>
            </>
          }
        />

        <div className="mb-2 flex flex-wrap items-center gap-3">
          <SegmentedControl
            value={tab}
            onChange={goToTab}
            options={TAB_ORDER.map((key) => ({ value: key, label: t(`styles.tabs.${key}`) }))}
          />
        </div>
        <p className="mb-5 text-xs text-slate-500 dark:text-slate-400">
          {themeId ? t('styles.cascade.themeActive', { themeId }) : t('styles.cascade.themeInactive')}{' '}
          {overrideCount > 0 && t('styles.cascade.overrides', { count: overrideCount })}
        </p>

        {tab === 'basics' && <Basics />}
        {tab === 'theme' && <Theme />}
        {tab === 'variables' && <Variables />}
        {tab === 'customCss' && <CustomCss />}
      </div>
    </StylesContext.Provider>
  )
}

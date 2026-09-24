import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import type { CssVariableGraph, Project, QuartzConfig, StyleFileSet } from '@shared/ipc-contract'
import { Button, PageHeader, SegmentedControl } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import { useStickyState } from '../../state/uiState'
import { useSaveCommand } from '../../state/saveCommand'
import { UnsavedBadge, useUnsavedChanges } from '../../state/unsavedGuard'
import { TAB_ICONS } from '../navConfig'
import { useProject } from '../ProjectLayout'
import { fetchesGoogleFonts, persistFontDelivery, presentFontDelivery } from './fontDelivery'
import Basics from './Basics'
import Theme from './Theme'
import Variables from './Variables'
import CustomCss from './CustomCss'
import HandbookLink from '../../components/HandbookLink'

// Ein Kapitel je Reiter, und sie stehen im Handbuch in derselben Reihenfolge wie hier: Basis,
// Community-Themes, Variablen, eigenes CSS - also in der, in der sie einander überschreiben.
const HANDBOOK = { basics: 'stylesBasics', theme: 'stylesTheme', variables: 'stylesVariables', customCss: 'stylesCustomCss' } as const

export type StylesTab = 'basics' | 'theme' | 'variables' | 'customCss'

/** What can rewrite custom.scss while the CSS tab holds a draft of it. */
export type ScssWriter = 'variables' | 'fontImport' | 'fontRemoval' | 'googleFonts' | 'stylesheets'

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
  /** The page's save, as the header button runs it: everything `dirty` counts. Returns whether it worked. */
  savePage: () => Promise<boolean>
  /**
   * The config on disk still has Quartz download the Google fonts at build time (`cdnCaching:
   * false` without the app's block): the switch reads "served locally", and the next save fetches
   * them into the project - see fontDelivery.ts.
   */
  quartzStillDownloadsFonts: boolean
  overrides: Record<string, { light: string; dark: string }>
  setOverrides: React.Dispatch<React.SetStateAction<Record<string, { light: string; dark: string }>>>
  /** `staleBy`: what rewrote custom.scss under an unsaved draft, or null - see reloadScss. */
  scss: { path: string; content: string; dirty: boolean; staleBy: ScssWriter | null }
  /** True while anything on this page differs from what is on disk. */
  dirty: boolean
  setScssContent: (content: string) => void
  /** 'force' drops the draft; the others name what just wrote the file, for the banner. */
  reloadScss: (after: 'force' | ScssWriter) => Promise<void>
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
  /**
   * What follows a save while this sub-tab is in front - not the writing itself, which the page
   * does for every tab at once (see save()). `written` holds the file drafts that save just wrote,
   * keyed by relativePath, because by the time this runs the page has already cleared them.
   */
  registerSave: (fn: (written: Record<string, string>) => Promise<void>) => void
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
    staleBy: ScssWriter | null
  } | null>(null)
  const [savedConfig, setSavedConfig] = useState<string | null>(null)
  const [quartzStillDownloadsFonts, setQuartzStillDownloadsFonts] = useState(false)
  const [savedOverrides, setSavedOverrides] = useState<string | null>(null)
  const [fileSet, setFileSet] = useState<StyleFileSet | null>(null)
  const [fileDrafts, setFileDrafts] = useState<Record<string, string>>({})
  const [graph, setGraph] = useState<CssVariableGraph | null>(null)
  const [graphLoading, setGraphLoading] = useState(true)
  const [graphNonce, setGraphNonce] = useState(0)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  // What the last save deleted without asking - the Google fonts chosen away. Stays until the next
  // save, unlike "Saved", because it names files that are gone.
  const [fontNote, setFontNote] = useState<string | null>(null)
  // The two reads this page cannot do without. Unhandled, a rejection left the page on "Lade…" for
  // ever - no heading, no tabs - and only the toast in the corner said why (twenty-first review,
  // "nebenbei" 6). The other two reads below may fail without stopping the page: their state stays
  // empty and the toast is the answer, the way it was.
  const [loadError, setLoadError] = useState<string | null>(null)
  // Through formatIpcError, like every other page that shows an IPC failure in place: Electron
  // wraps the message in "Error invoking remote method 'config:get': Error: …", which buries the
  // sentence the user needs.
  const failed = (error: unknown): void => setLoadError(formatIpcError(error))

  // Assigned on every render of the active sub-tab (see registerSave below) - a ref rather than
  // state because changing it must never re-render the shell, which would remount the sub-tab.
  const saveRef = useRef<(written: Record<string, string>) => Promise<void>>(async () => {})
  // The timer that takes "Saved" away again. Held, because a save that fails less than two seconds
  // after one that worked used to show nothing at all: the first save's timer set the status to
  // 'idle', and the error message hangs on 'error' (thirty-third review, finding 10).
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Cleared on unmount: harmless in React 18, which ignores a setState on an unmounted component,
  // but a timer nobody owns any more is a timer nobody can reason about.
  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current)
    },
    []
  )

  useEffect(() => {
    // Together, because the config is only read right with custom.scss beside it: whether the
    // Google fonts live in the project is the block there (presentFontDelivery).
    Promise.all([window.quartzGui.config.get(project.path), window.quartzGui.styles.get(project.path)])
      .then(([loaded, info]) => {
        const presented = presentFontDelivery(loaded, info.content)
        setConfig(presented)
        setSavedConfig(JSON.stringify(presented))
        setQuartzStillDownloadsFonts(fetchesGoogleFonts(loaded) && presented === loaded)
        setScss({ ...info, original: info.content, dirty: false, staleBy: null })
      })
      .catch(failed)
    window.quartzGui.styles.listFiles(project.path).then(setFileSet)
    window.quartzGui.styles.getVariableOverrides(project.path).then((list) => {
      const next: Record<string, { light: string; dark: string }> = {}
      // An empty `dark`, not a copy of `light`. The dark half of an override is optional - a
      // variable that only differs in light mode has no declaration in the file's dark block, and
      // effectiveValue() already falls back to the light value for it. Filling it in here looked
      // harmless because it is only a display default, but the same object is what goes back to
      // saveVariableOverrides(): one edit to --divider-color wrote 40 further declarations into the
      // dark block, and every mode-independent token was decoupled from its light counterpart from
      // then on - change --tpl-space-md in light and dark no longer follows.
      // A dark declaration that repeats the light value is dropped on the way in, which heals a
      // file the old behaviour had already bloated: it takes effect the next time the page is
      // saved, and nothing is written before that. Effectively it changes nothing either way -
      // a variable with no dark declaration resolves to its light value anyway - so the only
      // thing lost is a deliberate "pin dark to exactly this value", which would have to survive
      // a change to the light value to be worth anything, and cannot.
      for (const o of list) next[o.key] = { light: o.light, dark: o.dark === o.light ? '' : (o.dark ?? '') }
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

  const registerSave = useCallback((fn: (written: Record<string, string>) => Promise<void>) => {
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
  // the pre-change state. An unsaved draft is never silently thrown away: it stays, flagged with
  // what wrote the file, and the CSS tab offers an explicit reload. The writer is named because the
  // banner used to say "another tab (variable override or font import)" for every one of them,
  // including the load order, the arrows and the repair button on the CSS tab itself (twenty-ninth
  // review, "nebenbei" 1).
  const reloadScss = useCallback(
    async (after: 'force' | ScssWriter) => {
      const info = await window.quartzGui.styles.get(project.path)
      setScss((prev) => {
        if (prev?.dirty && after !== 'force') return { ...prev, original: info.content, staleBy: after }
        return { ...info, original: info.content, dirty: false, staleBy: null }
      })
    },
    [project.path]
  )

  // The fonts first and the config after: a fetch that fails (no network, a misspelt name) leaves
  // the file as it was, rather than a config that says `local` over a block that is not there.
  // Returns whether custom.scss was rewritten, which save() needs for the case where a later step
  // throws: the draft in the editor then predates the block that is now on disk.
  // `blockWritten` is called as soon as custom.scss may have been rewritten, not at the end: the
  // caller reads that in its catch, and a throw after the fetch - config.save failing, say - left
  // it unset, so the draft was not flagged stale and the next save would put the old block back
  // over files that are gone (thirty-fourth review, "nebenbei" 1; the case healed itself through
  // the config staying dirty, which is one hop too many to rely on).
  async function saveConfig(blockWritten: () => void): Promise<boolean> {
    if (!config) return false
    if (fetchesGoogleFonts(config)) {
      const result = await window.quartzGui.fonts.fetchGoogle({ projectPath: project.path, typography: config.theme.typography ?? {} })
      blockWritten()
      // Both sentences, because they are about different families: what was taken out, and what
      // Google did not send. A misspelt name among three right ones comes back as a 200 with the
      // other three in it, so this is the one moment where it can be named (thirty-third review,
      // finding 5).
      const notes = [
        result.removedFamilies.length > 0 &&
          t('styles.googleFontsRemoved', { families: result.removedFamilies.join(', '), count: result.removedFiles.length }),
        result.missingFamilies.length > 0 &&
          t('styles.googleFontsMissing', { families: result.missingFamilies.join(', '), count: result.missingFamilies.length })
      ].filter((note): note is string => typeof note === 'string')
      if (notes.length > 0) setFontNote(notes.join(' '))
    } else {
      const result = await window.quartzGui.fonts.dropGoogle({ projectPath: project.path })
      blockWritten()
      if (result.removedFiles.length > 0) setFontNote(t('styles.googleFontsDropped', { count: result.removedFiles.length }))
    }
    await window.quartzGui.config.save(project.path, persistFontDelivery(config))
    setQuartzStillDownloadsFonts(false)
    return true
  }

  // The page's one save, and it writes everything `dirty` counts - whichever sub-tab is in front.
  // It used to run only the save the front tab had registered and then take *both* snapshots
  // again: a font picked on Basis and saved from the Variables tab never reached the config, the
  // badge went out, and the next route change dropped it (measured 2026-09-19 in the built app,
  // Variablen and Eigenes CSS alike; the rule is in docs/conventions.md, "Das registrierte
  // Speichern schreibt alles, was dirty zählt"). What a tab registers now is only what follows a
  // save on that tab: reading the faces again, the SCSS check.
  //
  // custom.scss as a whole goes first. The two writers after it replace one managed block each
  // (the Google fonts, the variables), and in the other order the draft would put the old blocks
  // back. Each snapshot is taken right after its own write, so a failure half-way leaves dirty
  // exactly what was not written.
  async function save(): Promise<boolean> {
    if (savedTimer.current) clearTimeout(savedTimer.current)
    setStatus('saving')
    setMessage(null)
    setFontNote(null)
    // Which of the block writers below has already rewritten custom.scss - read in the catch, so
    // it has to live outside the try.
    let blocksWritten: ScssWriter | null = null
    // The file drafts that have reached disk. Read in the catch for the same reason, so that a
    // step failing after them still hands them over instead of leaving the editor on a draft the
    // file no longer has.
    const draftsWritten: Record<string, string> = {}
    // Both state updates in one tick: clearFileDrafts here, and the `loaded` the sub-tab pulls up
    // from `written` - saveRef's body runs synchronously up to its first await, so React 18
    // batches the pair and the editor never sees a value in between.
    const commitDrafts = async (): Promise<void> => {
      if (Object.keys(draftsWritten).length > 0) clearFileDrafts(Object.keys(draftsWritten))
      await saveRef.current(draftsWritten)
    }
    try {
      if (!config || !scss) return false
      const configDirty = JSON.stringify(config) !== savedConfig || quartzStillDownloadsFonts
      const overridesDirty = JSON.stringify(overrides) !== savedOverrides
      const drafts = Object.entries(fileDrafts)
      // A draft of custom.scss that something else has written under (staleBy) is only written from
      // the tab that shows the banner saying so. Overwriting under that banner is a choice the CSS
      // tab has always offered; from the other three it was a silent one, and since this save
      // writes every tab's drafts it was reachable from all of them - "type CSS, import a font,
      // save" cost the @font-face rule of the font just imported (thirty-third review, finding 2).
      const scssRefused = scss.dirty && scss.staleBy !== null && tab !== 'customCss'
      if (scss.dirty && !scssRefused) await window.quartzGui.styles.save(project.path, scss.content)
      for (const [relativePath, draft] of drafts) {
        await window.quartzGui.styles.saveFile(project.path, relativePath, draft)
        draftsWritten[relativePath] = draft
      }
      if (configDirty) {
        await saveConfig(() => {
          blocksWritten = 'googleFonts'
        })
        setSavedConfig(JSON.stringify(config))
      }
      if (overridesDirty) {
        // A row whose fields were both emptied is no override; the file gets nothing for it, and
        // the page drops it too, so after the save it reads what the file holds.
        const kept = Object.fromEntries(Object.entries(overrides).filter(([, v]) => v.light.trim() !== '' || !!v.dark?.trim()))
        const list = Object.entries(kept).map(([key, v]) => ({ key, light: v.light, dark: v.dark }))
        await window.quartzGui.styles.saveVariableOverrides(project.path, list)
        blocksWritten = 'variables'
        setOverrides(kept)
        setSavedOverrides(JSON.stringify(kept))
      }
      // 'force' drops the draft, which is exactly wrong for the refused one: it is re-read under
      // its own name so the banner stays and the draft survives.
      if (scssRefused) {
        if (configDirty) await reloadScss('googleFonts')
        else if (overridesDirty) await reloadScss('variables')
      } else if (scss.dirty || configDirty || overridesDirty) {
        await reloadScss('force')
      }
      // The drafts go along rather than being read from the registered callback's closure. That
      // closure is the one from the render in which it was registered, and registerSave runs in an
      // effect after *every* render: with any await between clearFileDrafts() and here - one
      // changed colour is enough - the re-registered callback sees an already emptied fileDrafts,
      // never updates `loaded`, and the editor drops back to the content from before the save.
      // Typing on top of that then wrote the pre-save state over the file that was just saved
      // (thirty-third review, finding 1, measured in the built app).
      //
      // And they are dropped here rather than right after being written, in the same tick as the
      // sub-tab pulls `loaded` up: `contentOf` reads `fileDrafts[tab] ?? loaded[tab]`, so clearing
      // them earlier sent the editor through draft -> pre-save state -> draft, and
      // react-codemirror does not apply an outside change while typing - it puts it aside as a
      // pendingUpdate and replays it once its latch expires, with the value of back then. The
      // third value equals the document, so no new pendingUpdate replaces the old one, and ~0.8 s
      // after everything looks saved the editor fell back to the pre-save state; typing on top of
      // that wrote it over the file (thirty-fourth review, finding 1: save within a quarter second
      // of the last keystroke, i.e. Cmd+S out of typing). Batched, the value goes draft to draft
      // and no pendingUpdate arises at all.
      await commitDrafts()
      if (scssRefused) {
        // Not "saved": the page stays dirty, and the leave dialog has to keep the user here, where
        // the sentence is.
        setStatus('error')
        setMessage(t('styles.scssStaleNotSaved'))
        return false
      }
      setStatus('saved')
      savedTimer.current = setTimeout(() => setStatus((prev) => (prev === 'saved' ? 'idle' : prev)), 2000)
      return true
    } catch (err) {
      // A step after the block writers can throw with custom.scss already rewritten on disk, while
      // the draft in the editor still predates that block. Re-read under the writer's name so the
      // draft is flagged stale: the banner appears, and the next save does not put the old block
      // back over files that are gone (thirty-third review, finding 2, last paragraph).
      if (blocksWritten) await reloadScss(blocksWritten).catch(() => {})
      // Whatever did reach disk is committed here too, so that a failure half-way leaves dirty
      // exactly what was not written - and never an editor showing a draft that is already the
      // file's content. Only then: without a written draft there is nothing to hand over, and the
      // registered callback re-runs the SCSS check, which is not what a failed save should do.
      if (Object.keys(draftsWritten).length > 0) await commitDrafts().catch(() => {})
      setStatus('error')
      setMessage(formatIpcError(err))
      return false
    }
  }

  // Computed before the early return below, since the guard is a hook and hooks cannot be skipped.
  const dirty =
    (savedConfig !== null && JSON.stringify(config) !== savedConfig) ||
    (savedOverrides !== null && JSON.stringify(overrides) !== savedOverrides) ||
    (scss?.dirty ?? false) ||
    Object.keys(fileDrafts).length > 0
  useUnsavedChanges(dirty)
  // Cmd+S saves the same thing the button does, and is registered only while that button would do
  // something: no edits, a save already running, or a sub-tab that saves elsewhere means the
  // shortcut stays quiet rather than rewriting an unchanged file.
  useSaveCommand(dirty && status !== 'saving' ? save : null)

  if (loadError) {
    return (
      <div className="max-w-xl">
        <p className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">{t('styles.loadFailed')}</p>
        <pre className="whitespace-pre-wrap rounded-md bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {loadError}
        </pre>
      </div>
    )
  }
  if (!config || !scss) return <p className="text-sm text-text-muted">{t('common.loading')}</p>

  const value: StylesContextValue = {
    project,
    config,
    setConfig,
    savePage: save,
    quartzStillDownloadsFonts,
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
          handbook={<HandbookLink page={HANDBOOK[tab]} />}
          icon={TAB_ICONS.styles}
          title={t('projectLayout.tabs.styles')}
          description={t('projectLayout.descriptions.styles')}
          status={status === 'saved' ? <span className="text-sm text-green-600 dark:text-green-400">{t('common.saved')}</span> : null}
          actions={
            <>
              {dirty && status !== 'saving' && <UnsavedBadge />}
              <Button onClick={save} disabled={status === 'saving'}>
                {status === 'saving' ? t('common.saving') : t('common.save')}
              </Button>
            </>
          }
        />

        {/* The save error, below the header for the same reason as the note beneath it - and with
            more at stake: it is the longest sentence on the page and a planned answer rather than
            an exception. In the slot it was one line 1457 px wide at a 1280 px window, cut off at
            "Alles and", i.e. before the half that says nothing is lost and how to go on, and the
            page got a horizontal scrollbar (thirty-fourth review, finding 3). Its own region,
            separate from the note, so the two are not read as one sentence. */}
        <p role="status" className="mb-3 text-sm text-red-600 empty:mb-0 dark:text-red-400">
          {status === 'error' ? message : null}
        </p>

        {/* Below the header rather than in its status slot. The slot is shrink-0 beside the title,
            and this note names families and file counts: at 1280 px it took 566 px, left 237 px for
            the title and description, broke the description from three lines to six and pushed
            everything under it down by some 60 px - and its two spans read as "Saved.No longer
            selected …" here and in the live region (thirty-third review, finding 10). Its own
            region, mounted empty, because it appears after a save without anyone asking for it. */}
        <p role="status" className="mb-3 text-sm text-text-secondary empty:mb-0">
          {fontNote}
        </p>

        <div className="mb-2 flex flex-wrap items-center gap-3">
          <SegmentedControl
            label={t('common.viewSwitcher')}
            value={tab}
            onChange={goToTab}
            options={TAB_ORDER.map((key) => ({ value: key, label: t(`styles.tabs.${key}`) }))}
          />
        </div>
        <p className="mb-5 text-xs text-text-muted">
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

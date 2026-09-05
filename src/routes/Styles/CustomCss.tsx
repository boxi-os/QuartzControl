import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CodeMirror from '@uiw/react-codemirror'
import { css } from '@codemirror/lang-css'
import type { EditorView } from '@codemirror/view'
import { ArrowDown, ArrowUp, Check, FileWarning, Plus, X } from 'lucide-react'
import type { FontFaceInfo, ScssCheckResult, StyleFile, StyleReferenceFile } from '@shared/ipc-contract'
import { Button, Card, Select, TextInput, useCopyToClipboard } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import { useStickyState } from '../../state/uiState'
import { componentItems } from '../LayoutEditor/utils'
import CssVariableReference from './CssVariableReference'
import { cssColorToHex, isDisplayableColor, resolvedValue, type ResolveContext } from './variableGraph'
import { fontIsAvailable, googleFontRequest, primaryFamily, summarizeFaces, type TypographySlot } from './fontSpec'
import { fontLoaders } from './fontDelivery'
import { activeThemeIdOf, useStyles } from './index'

// What this file is writing on top of, as it actually looks right now - resolved through the same
// chain the Variablen tab uses, so an active community theme's values show here rather than the
// base colors it has long since overridden. Deliberately just the classic palette and the font
// slots: the full table is one tab away, this is the "what am I working against" glance.
// custom.scss is not one of the additional files (it has no relativePath and is never part of the
// order), but it is one of the editor's tabs - this is the key it goes under.
const MAIN_TAB = ':main'

const SUMMARY_COLORS = ['light', 'lightgray', 'gray', 'darkgray', 'dark', 'secondary', 'tertiary', 'highlight', 'textHighlight']
const SUMMARY_FONTS = ['titleFont', 'headerFont', 'bodyFont', 'codeFont']

// Tailwind's darkMode:'media' means there's no manual theme class to read - CodeMirror's own
// theme prop needs an explicit 'light'/'dark' string, so this mirrors the same media query.
function useColorScheme(): 'light' | 'dark' {
  const [scheme, setScheme] = useState<'light' | 'dark'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent): void => setScheme(e.matches ? 'dark' : 'light')
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return scheme
}

// The last layer of the cascade: whatever is in quartz/styles/custom.scss wins. The draft lives in
// the Styles context rather than here, so switching to another tab and back doesn't discard unsaved
// edits - and so the other tabs can tell when their own writes (variable overrides, font imports)
// have made that draft stale.
export default function CustomCss(): JSX.Element {
  const { t } = useTranslation()
  const {
    project,
    config,
    scss,
    setScssContent,
    reloadScss,
    registerSave,
    fileSet,
    fileDrafts,
    setFileDraft,
    clearFileDrafts,
    reloadFiles
  } = useStyles()
  const [selectedComponent, setSelectedComponent] = useState('')
  const [references, setReferences] = useState<StyleReferenceFile[]>([])
  // Which files are open and which one is in front is "where I was" - kept across an area switch.
  // Their *content* is not here: an unsaved draft lives in the Styles context, so it also survives
  // switching to another styling sub-tab and back.
  const [openTabs, setOpenTabs] = useStickyState<string[]>('styles.css.openTabs', [MAIN_TAB])
  const [activeTab, setActiveTab] = useStickyState<string>('styles.css.activeTab', MAIN_TAB)
  // On-disk content of the extra files that have been opened, so "is this draft different?" is a
  // real comparison. Local rather than lifted: re-reading a file is one cheap call.
  const [loaded, setLoaded] = useState<Record<string, string>>({})
  const [check, setCheck] = useState<ScssCheckResult | null>(null)
  const [checking, setChecking] = useState(false)
  // Where a diagnostic wants the cursor. Not sticky: it is a single gesture, and restoring it after
  // an area switch would scroll the editor for a click made minutes ago.
  const [pendingJump, setPendingJump] = useState<{ tab: string; line: number } | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const scheme = useColorScheme()

  const files = fileSet?.files ?? []
  const imported = files.filter((f) => f.imported)

  const runCheck = useCallback(async () => {
    setChecking(true)
    try {
      setCheck(await window.quartzGui.styles.check(project.path))
    } finally {
      setChecking(false)
    }
  }, [project.path])

  // Checked once on arrival too, not only after a save: an error introduced outside the app (or
  // left behind by an earlier session) should be visible before the next edit builds on top of it.
  useEffect(() => {
    void runCheck()
  }, [runCheck])

  useEffect(() => {
    const missing = openTabs.filter((tab) => tab !== MAIN_TAB && loaded[tab] === undefined)
    if (missing.length === 0) return
    let cancelled = false
    Promise.all(missing.map((tab) => window.quartzGui.styles.readFile(project.path, tab).then((c) => [tab, c] as const))).then(
      (entries) => {
        if (cancelled) return
        setLoaded((prev) => ({ ...prev, ...Object.fromEntries(entries) }))
      }
    )
    return () => {
      cancelled = true
    }
  }, [project.path, openTabs, loaded])

  const dirtyFiles = files
    .map((f) => f.relativePath)
    .filter((rel) => fileDrafts[rel] !== undefined && fileDrafts[rel] !== loaded[rel])

  // Saves the file that is in front, and only that one. Several open files are several separate
  // pieces of work - writing all of them because one was finished is not what the button says, and
  // the tab bar's dots make what is still unsaved visible. The page's own Save button does the
  // same thing, so both spellings of "save" mean the file you are looking at.
  const saveActive = useCallback(
    async (tab: string) => {
      if (tab === MAIN_TAB) {
        await window.quartzGui.styles.save(project.path, scss.content)
        // Re-reads what is now on disk, which clears the dirty/stale flags in one step.
        await reloadScss(true)
      } else {
        const draft = fileDrafts[tab]
        if (draft === undefined) return
        await window.quartzGui.styles.saveFile(project.path, tab, draft)
        setLoaded((prev) => ({ ...prev, [tab]: draft }))
        clearFileDrafts([tab])
      }
      await runCheck()
    },
    [project.path, scss.content, fileDrafts, reloadScss, clearFileDrafts, runCheck]
  )

  useEffect(() => registerSave(() => saveActive(activeTab)))

  useEffect(() => {
    if (!selectedComponent) {
      setReferences([])
      return
    }
    window.quartzGui.styles.reference(project.path, selectedComponent).then(setReferences)
  }, [project.path, selectedComponent])

  // A tab whose file was deleted (or renamed) must not stay open pointing at nothing.
  useEffect(() => {
    if (!fileSet) return
    const known = new Set([MAIN_TAB, ...files.map((f) => f.relativePath)])
    setOpenTabs((prev) => (prev.every((tab) => known.has(tab)) ? prev : prev.filter((tab) => known.has(tab))))
    setActiveTab((prev) => (known.has(prev) ? prev : MAIN_TAB))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileSet])

  // Checks what is in the editor right now, unsaved included - each stylesheet is its own Sass
  // module, so compiling one on its own is exactly how the build sees it.
  async function checkActive(): Promise<void> {
    setChecking(true)
    try {
      const entry = activeTab === MAIN_TAB ? 'custom.scss' : activeTab
      setCheck(await window.quartzGui.styles.checkSource(project.path, entry, contentOf(activeTab)))
    } finally {
      setChecking(false)
    }
  }

  const contentOf = (tab: string): string =>
    tab === MAIN_TAB ? scss.content : (fileDrafts[tab] ?? loaded[tab] ?? '')

  // Opening the file a diagnostic points at is only half of "jump there" - this puts the cursor on
  // the line. It waits for the file's content, since an extra file is read asynchronously after its
  // tab opens and an empty document has no line to scroll to; the line is clamped because the
  // diagnostic can be older than the text in front of it.
  const activeContent = contentOf(activeTab)
  const activeContentReady = activeTab === MAIN_TAB || fileDrafts[activeTab] !== undefined || loaded[activeTab] !== undefined
  useEffect(() => {
    const view = viewRef.current
    if (!pendingJump || !view || pendingJump.tab !== activeTab || !activeContentReady) return
    const pos = view.state.doc.line(Math.min(Math.max(pendingJump.line, 1), view.state.doc.lines)).from
    view.dispatch({ selection: { anchor: pos }, scrollIntoView: true })
    view.focus()
    setPendingJump(null)
  }, [pendingJump, activeTab, activeContent, activeContentReady])

  function setContent(value: string): void {
    if (activeTab === MAIN_TAB) setScssContent(value)
    // Typing the file's own content back drops the draft rather than keeping an identical one -
    // otherwise the tab keeps its modified dot, and the page keeps warning about unsaved changes
    // that are not changes.
    else if (value === loaded[activeTab]) clearFileDrafts([activeTab])
    else setFileDraft(activeTab, value)
  }

  function openTab(tab: string): void {
    setOpenTabs((prev) => (prev.includes(tab) ? prev : [...prev, tab]))
    setActiveTab(tab)
  }

  // A diagnostic names a file on disk, which is not the same thing as one of this editor's tabs:
  // custom.scss is the pinned main tab rather than one of the additional files, and an error inside
  // Quartz's own stylesheets or node_modules has no tab at all. Returning null is what lets the
  // banner print the location as plain text instead of a link that opens an empty editor.
  function tabForFile(relativePath: string): string | null {
    if (relativePath === 'custom.scss') return MAIN_TAB
    return files.some((f) => f.relativePath === relativePath) ? relativePath : null
  }

  function jumpToFile(relativePath: string, line: number | undefined): void {
    const tab = tabForFile(relativePath)
    if (!tab) return
    openTab(tab)
    if (line !== undefined) setPendingJump({ tab, line })
  }

  function closeTab(tab: string): void {
    if (tab === MAIN_TAB) return
    setOpenTabs((prev) => prev.filter((x) => x !== tab))
    setActiveTab((prev) => (prev === tab ? MAIN_TAB : prev))
  }

  // Every file operation writes custom.scss's import block, so the editor's draft of that file has
  // to be re-read afterwards - the same rule variable overrides and font imports follow. Not
  // forced: an unsaved draft is kept and flagged stale rather than thrown away.
  async function afterFileOp(): Promise<void> {
    await reloadFiles()
    await reloadScss()
    await runCheck()
  }

  async function applyOrder(next: string[]): Promise<void> {
    await window.quartzGui.styles.setImportOrder(project.path, next)
    await afterFileOp()
  }

  function move(relativePath: string, delta: number): void {
    const order = imported.map((f) => f.relativePath)
    const from = order.indexOf(relativePath)
    const to = from + delta
    if (from === -1 || to < 0 || to >= order.length) return
    order.splice(to, 0, ...order.splice(from, 1))
    void applyOrder(order)
  }

  // Inserts at the cursor only when the editor actually has focus (the user clicked into it and
  // placed the cursor deliberately) - otherwise the cursor defaults to position 0, and inserting
  // there would shove the snippet in front of the file's leading `@use` imports. Unfocused (the
  // common case, since this is triggered from a toolbar button) appends at the end instead.
  function insertAtCursor(text: string): void {
    const view = viewRef.current
    if (view?.hasFocus) {
      view.dispatch(view.state.replaceSelection(text))
    } else if (view) {
      view.dispatch({ changes: { from: view.state.doc.length, insert: text } })
    } else {
      setContent(contentOf(activeTab) + text)
    }
    view?.focus()
  }

  function insertSnippet(name: string): void {
    insertAtCursor(`\n.${name} {\n  \n}\n`)
  }

  async function openExternally(targetPath: string): Promise<void> {
    await window.quartzGui.dialog.openPath(targetPath)
  }

  // Copies a stylesheet from anywhere into quartz/styles/imported and wires it into the order,
  // rather than pasting an @use line into whatever the user happens to be editing.
  async function importFile(): Promise<void> {
    const picked = await window.quartzGui.dialog.pickFile([{ name: 'Stylesheets', extensions: ['scss', 'css'] }])
    if (!picked) return
    const result = await window.quartzGui.styles.importFile(project.path, picked)
    await applyOrder([...imported.map((f) => f.relativePath), result.relativePath])
    openTab(result.relativePath)
  }

  const components = useMemo(() => componentItems(config.plugins), [config.plugins])
  const activeFile = files.find((f) => f.relativePath === activeTab)
  const activePath = activeTab === MAIN_TAB ? scss.path : (activeFile?.path ?? '')
  const isDirty = (tab: string): boolean =>
    tab === MAIN_TAB ? scss.dirty : fileDrafts[tab] !== undefined && fileDrafts[tab] !== loaded[tab]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="truncate text-xs text-text-muted">{activePath}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={checkActive} disabled={checking}>
            {checking ? t('styleEditor.check.running') : t('styleEditor.check.checkActive')}
          </Button>
          <Button onClick={() => saveActive(activeTab)} disabled={!isDirty(activeTab)}>
            {t('styleEditor.files.saveActive')}
          </Button>
          <Button variant="ghost" onClick={() => openExternally(activePath)}>
            {t('styleEditor.openExternally')}
          </Button>
          <Button variant="ghost" onClick={importFile}>
            {t('styleEditor.importFile')}
          </Button>
        </div>
      </div>

      {scss.staleOnDisk && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <span>{t('styles.scssStale')}</span>
          <button type="button" className="underline" onClick={() => reloadScss(true)}>
            {t('styles.scssStaleReload')}
          </button>
        </div>
      )}

      <CheckBanner result={check} checking={checking} onRecheck={runCheck} onJump={jumpToFile} tabForFile={tabForFile} />

      <ActiveStyles />

      <Card className="flex flex-wrap items-center gap-2">
        <Select value={selectedComponent} onChange={(e) => setSelectedComponent(e.target.value)} className="w-56">
          <option value="">{t('styleEditor.componentPlaceholder')}</option>
          {components.map(({ plugin }) => (
            <option key={plugin.name} value={plugin.name}>
              {plugin.name}
            </option>
          ))}
        </Select>
        <Button variant="ghost" onClick={() => insertSnippet(selectedComponent)} disabled={!selectedComponent}>
          {t('styleEditor.insertSelector')}
        </Button>
        <span className="text-xs text-text-muted">{t('styleEditor.componentHint')}</span>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex min-w-0 flex-col">
          <TabBar
            tabs={openTabs}
            active={activeTab}
            files={files}
            isDirty={isDirty}
            onSelect={setActiveTab}
            onClose={closeTab}
          />
          <Card className="!rounded-t-none !p-0 overflow-hidden">
            <CodeMirror
              key={activeTab}
              value={contentOf(activeTab)}
              height="65vh"
              theme={scheme}
              extensions={[css()]}
              onChange={setContent}
              onCreateEditor={(view) => {
                viewRef.current = view
              }}
            />
          </Card>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <FileOrder
            files={files}
            activeTab={activeTab}
            projectPath={project.path}
            onOpen={openTab}
            onMove={move}
            onSetOrder={applyOrder}
            onChanged={afterFileOp}
          />

          <CssVariableReference onInsert={insertAtCursor} />

          {references.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">{t('styleEditor.referenceHeading')}</h2>
              {references.map((ref) => (
                <Card key={ref.path} className="!p-0 overflow-hidden">
                  <div className="flex items-center justify-between border-b border-ink/[0.06] px-3 py-1.5 dark:border-ink/10">
                    <span className="truncate text-xs font-medium">{ref.label}</span>
                    <button
                      type="button"
                      className="shrink-0 text-xs text-text-muted underline"
                      onClick={() => openExternally(ref.path)}
                    >
                      {t('styleEditor.openExternally')}
                    </button>
                  </div>
                  <CodeMirror value={ref.content} height="200px" theme={scheme} extensions={[css()]} editable={false} />
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// One tab per open file. custom.scss is pinned first and cannot be closed - it is the file Quartz
// actually imports, and closing it would leave the editor pointing at nothing.
function TabBar({
  tabs,
  active,
  files,
  isDirty,
  onSelect,
  onClose
}: {
  tabs: string[]
  active: string
  files: StyleFile[]
  isDirty: (tab: string) => boolean
  onSelect: (tab: string) => void
  onClose: (tab: string) => void
}): JSX.Element {
  const { t } = useTranslation()
  const label = (tab: string): string =>
    tab === MAIN_TAB ? 'custom.scss' : (files.find((f) => f.relativePath === tab)?.name ?? tab)
  const ordered = [MAIN_TAB, ...tabs.filter((tab) => tab !== MAIN_TAB)]

  return (
    <div className="flex flex-wrap items-end gap-0.5 overflow-x-auto">
      {ordered.map((tab) => {
        const isActive = tab === active
        return (
          <div
            key={tab}
            className={`flex items-center gap-1 rounded-t-[8px] border border-b-0 px-2.5 py-1.5 text-xs ${
              isActive
                ? 'border-ink/[0.06] bg-surface dark:border-ink/10 dark:bg-[#1c1c1e]'
                : 'border-transparent bg-ink/[0.04] text-text-muted hover:bg-ink/[0.07] dark:bg-ink/[0.06] dark:hover:bg-ink/10'
            }`}
          >
            <button type="button" onClick={() => onSelect(tab)} className="max-w-[16ch] truncate" title={label(tab)}>
              {label(tab)}
            </button>
            {isDirty(tab) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" title={t('styleEditor.files.unsaved')} />}
            {tab !== MAIN_TAB && (
              <button
                type="button"
                onClick={() => onClose(tab)}
                className="shrink-0 text-text-muted hover:text-text"
                title={t('styleEditor.files.closeTab')}
              >
                <X size={11} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// The load order, as a list rather than as draggable tabs: the tabs say which files are *open*,
// which is a different question from which files are loaded and in what sequence - and with more
// than a handful of files a tab strip is the wrong place to sort anything.
function FileOrder({
  files,
  activeTab,
  projectPath,
  onOpen,
  onMove,
  onSetOrder,
  onChanged
}: {
  files: StyleFile[]
  activeTab: string
  projectPath: string
  onOpen: (tab: string) => void
  onMove: (relativePath: string, delta: number) => void
  onSetOrder: (next: string[]) => Promise<void>
  onChanged: () => Promise<void>
}): JSX.Element {
  const { t } = useTranslation()
  const [creating, setCreating] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ relativePath: string; name: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const imported = files.filter((f) => f.imported)
  const orphans = files.filter((f) => !f.imported)

  async function run(action: () => Promise<unknown>): Promise<void> {
    setError(null)
    try {
      await action()
      await onChanged()
    } catch (err) {
      setError(formatIpcError(err))
    }
  }

  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold">{t('styleEditor.files.heading')}</h3>
      <p className="mb-3 text-xs text-text-muted">{t('styleEditor.files.description')}</p>

      <div className="flex flex-col gap-1">
        {imported.map((file, index) => (
          <div
            key={file.relativePath}
            className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs ${
              activeTab === file.relativePath ? 'bg-blue-50 dark:bg-blue-500/10' : ''
            }`}
          >
            <span className="w-4 shrink-0 text-right text-[11px] text-text-muted">{index + 1}</span>
            {renaming?.relativePath === file.relativePath ? (
              <>
                <TextInput
                  value={renaming.name}
                  onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
                  className="h-6 min-w-0 flex-1 text-xs"
                  autoFocus
                />
                <button
                  type="button"
                  className="shrink-0 text-[11px] underline"
                  onClick={() =>
                    run(async () => {
                      await window.quartzGui.styles.renameFile(projectPath, file.relativePath, renaming.name.trim())
                      setRenaming(null)
                    })
                  }
                >
                  {t('common.save')}
                </button>
                <button type="button" className="shrink-0 text-[11px] underline" onClick={() => setRenaming(null)}>
                  {t('common.cancel')}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => onOpen(file.relativePath)} className="min-w-0 flex-1 truncate text-left font-mono hover:underline">
                  {file.name}
                </button>
                {/* Secondary / muted / text for enabled / disabled / hover, all explicit: the
                    `disabled:opacity-30` this replaces left the arrow at 1.69:1. */}
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => onMove(file.relativePath, -1)}
                  className="shrink-0 text-text-secondary hover:text-text disabled:text-text-muted"
                  title={t('styleEditor.files.moveUp')}
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  type="button"
                  disabled={index === imported.length - 1}
                  onClick={() => onMove(file.relativePath, 1)}
                  className="shrink-0 text-text-secondary hover:text-text disabled:text-text-muted"
                  title={t('styleEditor.files.moveDown')}
                >
                  <ArrowDown size={12} />
                </button>
                <button
                  type="button"
                  className="shrink-0 text-[11px] text-text-muted underline"
                  onClick={() => setRenaming({ relativePath: file.relativePath, name: file.name })}
                >
                  {t('styleEditor.files.rename')}
                </button>
                {confirmDelete === file.relativePath ? (
                  <>
                    <button
                      type="button"
                      className="shrink-0 text-[11px] font-medium text-red-600 underline"
                      onClick={() =>
                        run(async () => {
                          await window.quartzGui.styles.deleteFile(projectPath, file.relativePath)
                          setConfirmDelete(null)
                        })
                      }
                    >
                      {t('styleEditor.files.deleteConfirm')}
                    </button>
                    <button type="button" className="shrink-0 text-[11px] underline" onClick={() => setConfirmDelete(null)}>
                      {t('common.cancel')}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="shrink-0 text-[11px] text-text-muted underline"
                    onClick={() => setConfirmDelete(file.relativePath)}
                  >
                    {t('styleEditor.files.delete')}
                  </button>
                )}
              </>
            )}
          </div>
        ))}

        <div className="flex items-center gap-1.5 rounded-md border-t border-dashed border-ink/10 px-1.5 pt-1.5 text-xs text-text-muted dark:border-ink/10">
          <span className="w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate font-mono">custom.scss</span>
          <span className="shrink-0 text-[11px] text-text-muted">{t('styleEditor.files.alwaysLast')}</span>
        </div>
      </div>

      {/* A stylesheet that exists but is in no @use line does literally nothing - worth showing as
          its own state rather than hiding, since it looks like a working file in Finder. */}
      {orphans.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
            {t('styleEditor.files.orphansHeading')}
          </p>
          <div className="flex flex-col gap-1">
            {orphans.map((file) => (
              <div key={file.relativePath} className="flex items-center gap-1.5 text-xs">
                <span className="min-w-0 flex-1 truncate font-mono text-text-muted">{file.name}</span>
                <button
                  type="button"
                  className="shrink-0 text-[11px] underline"
                  onClick={() => onSetOrder([...imported.map((f) => f.relativePath), file.relativePath])}
                >
                  {t('styleEditor.files.include')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {creating === null ? (
        <Button variant="ghost" className="mt-3" onClick={() => setCreating('')}>
          {/* Tailwind's preflight makes an <svg> display:block, which breaks the line inside an
              inline-block button - the icon and the label need their own flex row. */}
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Plus size={13} aria-hidden /> {t('styleEditor.files.create')}
          </span>
        </Button>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <TextInput
            value={creating}
            onChange={(e) => setCreating(e.target.value)}
            placeholder={t('styleEditor.files.namePlaceholder')}
            className="h-7 min-w-0 flex-1 text-xs"
            autoFocus
          />
          <Button
            variant="ghost"
            disabled={!creating.trim()}
            onClick={() =>
              run(async () => {
                const created = await window.quartzGui.styles.createFile(projectPath, creating.trim())
                setCreating(null)
                onOpen(created.relativePath)
              })
            }
          >
            {t('styleEditor.files.createConfirm')}
          </Button>
          <Button variant="ghost" onClick={() => setCreating(null)}>
            {t('common.cancel')}
          </Button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </Card>
  )
}

// Compiles the whole chain with the project's own Sass, so an error in any of the files above -
// not just the one being edited - is reported, with the file and line it actually came from.
function CheckBanner({
  result,
  checking,
  onRecheck,
  onJump,
  tabForFile
}: {
  result: ScssCheckResult | null
  checking: boolean
  onRecheck: () => void
  onJump: (relativePath: string, line: number | undefined) => void
  tabForFile: (relativePath: string) => string | null
}): JSX.Element | null {
  const { t } = useTranslation()
  if (!result) return null

  if (result.status === 'error') {
    const { message, relativePath, line } = result.diagnostic
    return (
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1 rounded-md border border-red-300 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
        <FileWarning size={14} className="mt-0.5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t('styleEditor.check.failed')}</p>
          <p className="whitespace-pre-wrap font-mono">{message}</p>
          {relativePath &&
            (tabForFile(relativePath) ? (
              <button type="button" className="mt-1 underline" onClick={() => onJump(relativePath, line)}>
                {t('styleEditor.check.location', { file: relativePath, line: line ?? '?' })}
              </button>
            ) : (
              // Not one of this editor's files (Quartz's own stylesheets, or something under
              // node_modules): the location is still worth printing, but there is nothing to open.
              <p className="mt-1">{t('styleEditor.check.locationExternal', { file: relativePath, line: line ?? '?' })}</p>
            ))}
        </div>
        <button type="button" className="shrink-0 underline" onClick={onRecheck} disabled={checking}>
          {checking ? t('styleEditor.check.running') : t('styleEditor.check.recheck')}
        </button>
      </div>
    )
  }

  if (result.status === 'unavailable') {
    return (
      <p className="rounded-md border border-ink/[0.06] p-2 text-[11px] text-text-muted dark:border-ink/10">
        {t('styleEditor.check.unavailable', { reason: result.reason })}
      </p>
    )
  }

  return (
    <p className="flex items-center gap-1.5 text-[11px] text-green-700 dark:text-green-400">
      <Check size={12} aria-hidden />
      {t('styleEditor.check.ok')}
      <button type="button" className="ml-1 text-text-muted underline" onClick={onRecheck} disabled={checking}>
        {checking ? t('styleEditor.check.running') : t('styleEditor.check.recheck')}
      </button>
    </p>
  )
}

function ActiveStyles(): JSX.Element {
  const { t } = useTranslation()
  const { project, config, graph, overrides } = useStyles()
  const { copied, copy } = useCopyToClipboard()
  const [faces, setFaces] = useState<FontFaceInfo[]>([])
  const themeId = activeThemeIdOf(config)

  useEffect(() => {
    window.quartzGui.styles.fontFaces(project.path, themeId).then(setFaces)
  }, [project.path, themeId])

  const ctx: ResolveContext = {
    graph,
    overrides,
    colors: (config.theme.colors as { lightMode?: Record<string, string>; darkMode?: Record<string, string> }) ?? {},
    typography: config.theme.typography as Record<string, string> | undefined
  }

  const loaders = fontLoaders(config)
  const typography = (config.theme.typography ?? {}) as Record<string, unknown>
  const requests = (['header', 'body', 'code'] as TypographySlot[])
    .map((slot) => googleFontRequest(slot, typography[slot]))
    .filter((r): r is NonNullable<typeof r> => r !== null)

  const families = SUMMARY_FONTS.map((key) => primaryFamily(resolvedValue(key, 'light', ctx) ?? undefined))
  const anyMissing = families.some((family) => family && !fontIsAvailable(family))

  return (
    <Card className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {t('styleEditor.current.colors')}
        </h3>
        {/* A table rather than a wrapping row of swatch pairs: the values themselves used to live
            only in a title attribute, and a hex one has to hover for is not a value one can read
            off. Two columns, because a colour without its counterpart in the other scheme is half
            an answer here. */}
        <table className="text-xs">
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
              <th className="pb-1 pr-4 text-left font-semibold">{t('styleEditor.current.variable')}</th>
              <th className="pb-1 pr-4 text-left font-semibold">{t('styles.variables.light')}</th>
              <th className="pb-1 text-left font-semibold">{t('styles.variables.dark')}</th>
            </tr>
          </thead>
          <tbody>
            {SUMMARY_COLORS.map((key) => (
              <tr key={key} className="border-t border-ink/[0.05]">
                <td className="py-0.5 pr-4 font-mono">--{key}</td>
                {(['light', 'dark'] as const).map((mode) => {
                  const value = resolvedValue(key, mode, ctx)
                  const hex = cssColorToHex(value) ?? value
                  return (
                    <td key={mode} className="whitespace-nowrap py-0.5 pr-4">
                      {/* Still a copy target, and still one per mode: the two halves are different
                          colours, so "which one did I just copy" has to be unambiguous. */}
                      <button
                        type="button"
                        onClick={() => hex && copy(hex, `--${key} (${t(`styles.variables.${mode}`)})`)}
                        title={t('styleEditor.cssVars.copyHint', { value: hex ?? '—' })}
                        className="flex items-center gap-1.5 text-left"
                      >
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded border border-ink/15"
                          style={{ backgroundColor: isDisplayableColor(value) ? value : 'transparent' }}
                        />
                        <span className="font-mono tabular-nums text-text-muted">{hex ?? '—'}</span>
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p role="status" className="mt-2 min-h-[15px] truncate text-[11px] text-green-700 dark:text-green-400">
          {copied ? t('common.copied', { value: copied }) : ''}
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {t('styleEditor.current.fonts')}
        </h3>
        <div className="flex flex-col">
          {SUMMARY_FONTS.map((key) => {
            const stack = resolvedValue(key, 'light', ctx)
            if (!stack) return null
            const family = primaryFamily(stack)
            const summary = summarizeFaces(faces, family)
            const available = fontIsAvailable(family)
            return (
              <div key={key} className="border-t border-ink/[0.05] py-1.5 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-baseline gap-x-2 text-[11px]">
                  <code className="w-[74px] shrink-0 font-mono text-text-muted">{key}</code>
                  <button
                    type="button"
                    onClick={() => copy(stack, `--${key}`)}
                    title={t('styleEditor.cssVars.copyHint', { value: stack })}
                    className="font-semibold hover:underline"
                  >
                    {family}
                  </button>
                  {/* Straight out of the @font-face declarations the site really has - a range like
                      100–1000 is a variable font, and italic only shows when a face declares it. */}
                  <span className="text-text-muted">
                    {summary
                      ? `${summary.weights.join(' · ')}${summary.italic ? ` · ${t('styleEditor.current.italic')}` : ''}`
                      : t('styleEditor.current.noFace')}
                  </span>
                  {!available && <span className="text-amber-700 dark:text-amber-400">{t('styleEditor.current.notInstalled')}</span>}
                </div>
                <p
                  className={`pl-[82px] text-xl leading-tight ${available ? '' : 'text-text-muted'}`}
                  style={{ fontFamily: stack }}
                >
                  {t('styleEditor.current.sample')}
                </p>
              </div>
            )
          })}
        </div>

        {/* Said once under the block, not on every line: four identical warnings read as four
            problems. The short word sits on the line it belongs to. */}
        {anyMissing && <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">{t('styleEditor.current.notInstalledExplainer')}</p>}

        {/* Where the fonts come from decides what the weights above even mean - and whether the
            site calls Google at all. Both mechanisms are checked, not just the theme setting: the
            Fonts plugin has its own fontOrigin and defaults to Google. */}
        <div className="mt-2 flex flex-col gap-1 text-[11px]">
          {loaders.length === 0 && <p className="text-text-muted">{t('styleEditor.current.noLoader')}</p>}
          {loaders.map((loader) => (
            <p
              key={`${loader.via}-${loader.mode}`}
              className={loader.mode === 'google' ? 'text-amber-700 dark:text-amber-400' : 'text-text-muted'}
            >
              {t(`styleEditor.current.loader.${loader.via}.${loader.mode}`, {
                specs: requests
                  .map(
                    (r) =>
                      `${r.family} ${r.singleWeightDropped ? t('styleEditor.current.familyDefault') : r.weights.join('/')}${
                        r.italic ? ` + ${t('styleEditor.current.italic')}` : ''
                      }`
                  )
                  .join(' · ')
              })}
            </p>
          ))}
        </div>
      </div>
    </Card>
  )
}

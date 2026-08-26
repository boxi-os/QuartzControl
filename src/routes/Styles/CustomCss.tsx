import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CodeMirror from '@uiw/react-codemirror'
import { css } from '@codemirror/lang-css'
import type { EditorView } from '@codemirror/view'
import type { StyleReferenceFile } from '@shared/ipc-contract'
import { Button, Card, Select } from '../../components/ui'
import { componentItems } from '../LayoutEditor/utils'
import CssVariableReference from './CssVariableReference'
import { cssColorToHex, isDisplayableColor, resolvedValue, type ResolveContext } from './variableGraph'
import { useStyles } from './index'

// What this file is writing on top of, as it actually looks right now - resolved through the same
// chain the Variablen tab uses, so an active community theme's values show here rather than the
// base colors it has long since overridden. Deliberately just the classic palette and the font
// slots: the full table is one tab away, this is the "what am I working against" glance.
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
  const { project, config, scss, setScssContent, reloadScss, registerSave } = useStyles()
  const [selectedComponent, setSelectedComponent] = useState('')
  const [references, setReferences] = useState<StyleReferenceFile[]>([])
  const viewRef = useRef<EditorView | null>(null)
  const scheme = useColorScheme()

  useEffect(() =>
    registerSave(async () => {
      await window.quartzGui.styles.save(project.path, scss.content)
      // Re-reads what is now on disk, which clears the dirty/stale flags in one step.
      await reloadScss(true)
    })
  )

  useEffect(() => {
    if (!selectedComponent) {
      setReferences([])
      return
    }
    window.quartzGui.styles.reference(project.path, selectedComponent).then(setReferences)
  }, [project.path, selectedComponent])

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
      setScssContent(scss.content + text)
    }
    view?.focus()
  }

  function insertSnippet(name: string): void {
    insertAtCursor(`\n.${name} {\n  \n}\n`)
  }

  async function openExternally(targetPath: string): Promise<void> {
    await window.quartzGui.dialog.openPath(targetPath)
  }

  async function importFile(): Promise<void> {
    const picked = await window.quartzGui.dialog.pickFile([{ name: 'Stylesheets', extensions: ['scss', 'css'] }])
    if (!picked) return
    const result = await window.quartzGui.styles.importFile(project.path, picked)
    setScssContent(`${result.importLine}\n${scss.content}`)
  }

  const components = useMemo(() => componentItems(config.plugins), [config.plugins])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{scss.path}</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => openExternally(scss.path)}>
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

      <ActiveStyles />

      <Card className="flex items-center gap-2">
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
        <span className="text-xs text-slate-500 dark:text-slate-400">{t('styleEditor.componentHint')}</span>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="!p-0 overflow-hidden">
          <CodeMirror
            value={scss.content}
            height="65vh"
            theme={scheme}
            extensions={[css()]}
            onChange={setScssContent}
            onCreateEditor={(view) => {
              viewRef.current = view
            }}
          />
        </Card>

        <div className="flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: '65vh' }}>
          <CssVariableReference onInsert={insertAtCursor} />

          {references.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">{t('styleEditor.referenceHeading')}</h2>
              {references.map((ref) => (
                <Card key={ref.path} className="!p-0 overflow-hidden">
                  <div className="flex items-center justify-between border-b border-black/[0.06] px-3 py-1.5 dark:border-white/10">
                    <span className="truncate text-xs font-medium">{ref.label}</span>
                    <button
                      type="button"
                      className="shrink-0 text-xs text-slate-500 underline"
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

function ActiveStyles(): JSX.Element {
  const { t } = useTranslation()
  const { config, graph, overrides } = useStyles()
  const ctx: ResolveContext = {
    graph,
    overrides,
    colors: (config.theme.colors as { lightMode?: Record<string, string>; darkMode?: Record<string, string> }) ?? {},
    typography: config.theme.typography as Record<string, string> | undefined
  }

  return (
    <Card className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t('styleEditor.current.colors')}
        </h3>
        <div className="flex flex-wrap gap-3">
          {SUMMARY_COLORS.map((key) => {
            const light = resolvedValue(key, 'light', ctx)
            const dark = resolvedValue(key, 'dark', ctx)
            return (
              <div key={key} className="flex items-center gap-1.5" title={`${cssColorToHex(light) ?? light ?? '—'} / ${cssColorToHex(dark) ?? dark ?? '—'}`}>
                <span className="flex overflow-hidden rounded border border-black/10 dark:border-white/20">
                  <span className="h-5 w-5" style={{ backgroundColor: isDisplayableColor(light) ? light : 'transparent' }} />
                  <span className="h-5 w-5" style={{ backgroundColor: isDisplayableColor(dark) ? dark : 'transparent' }} />
                </span>
                <code className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{key}</code>
              </div>
            )
          })}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t('styleEditor.current.fonts')}
        </h3>
        <div className="flex flex-col gap-1">
          {SUMMARY_FONTS.map((key) => {
            const value = resolvedValue(key, 'light', ctx)
            if (!value) return null
            return (
              <div key={key} className="flex items-baseline gap-2 text-[11px]">
                <code className="w-24 shrink-0 font-mono text-slate-500 dark:text-slate-400">{key}</code>
                <span className="truncate text-[13px] text-slate-700 dark:text-slate-200" style={{ fontFamily: value }} title={value}>
                  {value.split(',')[0].replace(/^["']|["']$/g, '')}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CodeMirror from '@uiw/react-codemirror'
import { css } from '@codemirror/lang-css'
import type { EditorView } from '@codemirror/view'
import { useProject } from '../ProjectLayout'
import type { QuartzConfig, StyleReferenceFile } from '@shared/ipc-contract'
import { Button, Card, PageHeader, Select } from '../../components/ui'
import { componentItems } from '../LayoutEditor/utils'
import { TAB_ICONS } from '../navConfig'
import CssVariableReference from './CssVariableReference'

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

export default function StyleEditor(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [path, setPath] = useState('')
  const [content, setContent] = useState<string | null>(null)
  const [config, setConfig] = useState<QuartzConfig | null>(null)
  const [selectedComponent, setSelectedComponent] = useState('')
  const [references, setReferences] = useState<StyleReferenceFile[]>([])
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const scheme = useColorScheme()

  useEffect(() => {
    window.quartzGui.styles.get(project.path).then((info) => {
      setPath(info.path)
      setContent(info.content)
    })
    window.quartzGui.config.get(project.path).then(setConfig)
  }, [project.path])

  useEffect(() => {
    if (!selectedComponent) {
      setReferences([])
      return
    }
    window.quartzGui.styles.reference(project.path, selectedComponent).then(setReferences)
  }, [project.path, selectedComponent])

  async function save(): Promise<void> {
    if (content === null) return
    setStatus('saving')
    setMessage(null)
    try {
      await window.quartzGui.styles.save(project.path, content)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      setStatus('error')
      setMessage(String(err))
    }
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
      setContent((prev) => (prev ?? '') + text)
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
    setContent((prev) => `${result.importLine}\n${prev ?? ''}`)
  }

  const components = useMemo(() => (config ? componentItems(config.plugins) : []), [config])

  if (content === null) return <p className="text-sm text-slate-500">{t('common.loading')}</p>

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <PageHeader
        icon={TAB_ICONS.styles}
        title={t('styleEditor.title')}
        description={t('projectLayout.descriptions.styles')}
        actions={
          <>
            {status === 'saved' && <span className="text-sm text-green-600 dark:text-green-400">{t('common.saved')}</span>}
            {status === 'error' && <span className="text-sm text-red-600 dark:text-red-400">{message}</span>}
            <Button variant="ghost" onClick={() => openExternally(path)}>
              {t('styleEditor.openExternally')}
            </Button>
            <Button variant="ghost" onClick={importFile}>
              {t('styleEditor.importFile')}
            </Button>
            <Button onClick={save} disabled={status === 'saving'}>
              {status === 'saving' ? t('common.saving') : t('common.save')}
            </Button>
          </>
        }
      />
      <p className="-mt-3 truncate text-xs text-slate-500 dark:text-slate-400">{path}</p>

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
            value={content}
            height="65vh"
            theme={scheme}
            extensions={[css()]}
            onChange={setContent}
            onCreateEditor={(view) => {
              viewRef.current = view
            }}
          />
        </Card>

        <div className="flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: '65vh' }}>
          {config && <CssVariableReference theme={config.theme} projectPath={project.path} onInsert={insertAtCursor} />}

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

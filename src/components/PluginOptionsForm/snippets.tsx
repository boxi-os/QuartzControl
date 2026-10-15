import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CodeMirror, { Transaction } from '@uiw/react-codemirror'
import { html } from '@codemirror/lang-html'
import { markdown } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import { Braces, FilePlus2, FileUp, ImagePlus, Pencil } from 'lucide-react'
import type { OptionField, SnippetDirInfo } from '@shared/ipc-contract'
import { Button, Select, TextInput } from '../ui'
import { askDialog, confirmDialog } from '../../utils/confirm'
import { formatIpcError } from '../ErrorSurface'
import { useStickyState } from '../../state/uiState'
import { inlineValue } from './text'
import { inlineSvg } from '../../utils/inlineSvg'
import { LAYOUT_BOX_FRONTMATTER_PLACEHOLDER, LAYOUT_BOX_PLACEHOLDERS } from '../../routes/Plugins/layoutBoxes'

// The editors behind `x-quartz-widget: snippetFile` and the image button of `html`/`markdown`
// (shared/pluginOptionSchema.ts). Picked by the schema's widget, not by the plugin's name: any
// plugin that describes a snippet file this way gets the same picker. Every file operation goes
// through the main process (snippetService), which decides what may be read and written.

export type SnippetFormat = 'html' | 'markdown'

export function formatOfFile(name: string): SnippetFormat {
  return name.toLowerCase().endsWith('.md') ? 'markdown' : 'html'
}

/**
 * The reference a snippet needs to show a picture under quartz/static/images. `{{root}}` is the
 * placeholder layout-box replaces with the way from the page to the site root, so the picture loads
 * on every page depth and under a sub-path. In Markdown the renderer percent-encodes the braces
 * inside a URL, and layout-box turns them back (placeholders.ts, ENCODED_PLACEHOLDER).
 */
export function imageReference(relativePath: string, format: SnippetFormat): string {
  const url = `{{root}}/static/${relativePath.split('/').map(encodeURIComponent).join('/')}`
  return format === 'markdown' ? `![](<${url}>)` : `<img src="${url}" alt="">`
}

/** The value of a sibling option as it applies: set here, set above (a byLang entry), or the default. */
export function siblingValue(key: string, values: Record<string, unknown>, fields: readonly OptionField[]): unknown {
  if (values[key] !== undefined) return values[key]
  const f = fields.find((g) => g.key === key)
  return f?.hasDefault ? f.default : undefined
}

/**
 * "Bild einfügen…": copies a picture into quartz/static/images and hands back the reference.
 * A picture of the same name already there is a question - replace it, or use the one there.
 * An SVG may instead go in as its own markup (utils/inlineSvg.ts), so the site's CSS can style it.
 */
export function ImageButton({
  projectPath,
  format,
  placeholdersOff,
  onInsert
}: {
  projectPath: string
  format: SnippetFormat
  /** The plugin's `placeholders` is off: `{{root}}` would stay as it is, and the picture would not load. */
  placeholdersOff: boolean
  onInsert: (text: string) => void
}): JSX.Element {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const pick = async (): Promise<void> => {
    const sourcePath = await window.quartzGui.dialog.pickFile([
      {
        name: t('snippets.imageFilter'),
        extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif']
      }
    ])
    if (!sourcePath) return
    setError(null)
    setNote(null)
    // An SVG can go in as code, which CSS can style inside - or as a picture like any other.
    if (/\.svg$/i.test(sourcePath)) {
      const how = await askDialog({ text: t('snippets.svgHow'), altLabel: t('snippets.svgAsImage'), confirmLabel: t('snippets.svgInline') })
      if (how === 'cancel') return
      if (how === 'confirm') {
        setBusy(true)
        try {
          const fileName = sourcePath.split(/[\\/]/).pop() ?? ''
          const result = inlineSvg(await window.quartzGui.staticImage.readSvg({ sourcePath }), fileName)
          if (!result.ok) {
            setError(t('snippets.svgInvalid', { name: fileName }))
            return
          }
          onInsert(result.markup)
          if (result.removed > 0)
            setNote(
              result.styled
                ? `${t('snippets.svgCleaned', { count: result.removed })} ${t('snippets.svgStyleRemoved')}`
                : t('snippets.svgCleaned', { count: result.removed })
            )
        } catch (err) {
          setError(formatIpcError(err))
        } finally {
          setBusy(false)
        }
        return
      }
    }
    setBusy(true)
    try {
      let result = await window.quartzGui.staticImage.import({
        projectPath,
        sourcePath
      })
      if (result.status === 'exists') {
        const answer = await askDialog({
          text: t('snippets.imageExists', { name: result.relativePath }),
          altLabel: t('snippets.useExisting'),
          confirmLabel: t('snippets.replace'),
          danger: true
        })
        if (answer === 'cancel') return
        if (answer === 'confirm')
          result = await window.quartzGui.staticImage.import({
            projectPath,
            sourcePath,
            overwrite: true
          })
      }
      onInsert(imageReference(result.relativePath, format))
    } catch (err) {
      setError(formatIpcError(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <span className="flex flex-col gap-1">
      <span>
        <Button variant="ghost" onClick={() => void pick()} disabled={busy}>
          <ImagePlus size={14} aria-hidden />
          {t('snippets.insertImage')}
        </Button>
      </span>
      {placeholdersOff && <span className="text-micro text-amber-700 dark:text-amber-300">{t('snippets.placeholdersOff', { token: '{{root}}' })}</span>}
      {note && <span className="text-micro text-amber-700 dark:text-amber-300">{note}</span>}
      {error && <span className="text-micro text-red-600 dark:text-red-400">{error}</span>}
    </span>
  )
}

/**
 * The placeholders a layout box can use, folded under a summary (Wunsch des Nutzers, 2026-10-10:
 * the option `placeholders` said that it replaces `{{placeholder}}` tokens, not which). It stands
 * beside a text editor, and each token is a button that puts it in at the cursor. `off`: the
 * plugin's `placeholders` is false, and the tokens would stay as text.
 */
export function PlaceholderList({ onInsert, off }: { onInsert: (text: string) => void; off: boolean }): JSX.Element {
  const { t } = useTranslation()
  const frontmatterExample = `{{${LAYOUT_BOX_FRONTMATTER_PLACEHOLDER}author}}`
  const rows: [token: string, meaning: string][] = [
    ...LAYOUT_BOX_PLACEHOLDERS.map((name): [string, string] => [`{{${name}}}`, t(`snippets.placeholders.${name}`, { example: '{{root}}/static/images/logo.png' })]),
    [frontmatterExample, t('snippets.placeholders.frontmatter')]
  ]
  return (
    <details className="text-micro text-text-secondary">
      <summary className="inline-flex cursor-pointer items-center gap-1.5 font-medium">
        <Braces size={12} aria-hidden />
        {t('snippets.placeholders.summary', { count: rows.length })}
      </summary>
      <div className="mt-1.5 flex flex-col gap-1.5">
        <p className="text-text-muted">{t('snippets.placeholders.introInsert')}</p>
        {off && <p className="text-amber-700 dark:text-amber-300">{t('snippets.placeholders.off')}</p>}
        <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1">
          {rows.map(([token, meaning]) => (
            <div key={token} className="contents">
              <dt>
                <button
                  type="button"
                  onClick={() => onInsert(token)}
                  title={t('snippets.placeholders.insertNamed', { token })}
                  className="rounded border border-ink/10 bg-surface px-1.5 py-0.5 font-mono text-xs text-text hover:border-accent hover:text-accent-text"
                >
                  {token}
                </button>
              </dt>
              <dd className="text-text-muted">{meaning}</dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  )
}

/**
 * The `file` option of a layout box: a choice from the files in `dir`, with "Neu", "Importieren"
 * and "Bearbeiten". `dir` is read from the sibling option the schema names (`x-quartz-dir-option`),
 * in a byLang entry from the options above it.
 */
export function SnippetFileField({
  id,
  projectPath,
  dir,
  value,
  defaultValue,
  hasDefault,
  placeholdersOff,
  onValue
}: {
  id?: string
  projectPath: string
  dir: string
  value: unknown
  defaultValue: unknown
  hasDefault: boolean
  placeholdersOff: boolean
  onValue: (v: unknown) => void
}): JSX.Element {
  const { t } = useTranslation()
  const [info, setInfo] = useState<SnippetDirInfo | null>(null)
  const [reload, setReload] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState<string | null>(null)
  const [newExt, setNewExt] = useState<'.md' | '.html'>('.md')
  // Which file this field has open. Plain state, not sticky: the form has no key for one field of
  // one plugin instance, and a key per folder opened the editor in every box that shares the
  // folder - a byLang entry included - with an image button that wrote into the wrong one
  // (measured in the built app, 1.1 P6). The draft itself is sticky, per file (SnippetEditor).
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    window.quartzGui.snippets
      .list({ projectPath, dir })
      .then((r) => live && setInfo(r))
      .catch((err) => live && setError(formatIpcError(err)))
    return () => {
      live = false
    }
  }, [projectPath, dir, reload])

  const current = typeof value === 'string' ? value : undefined
  const effective = current ?? (typeof defaultValue === 'string' ? defaultValue : undefined)
  const files = info?.files ?? []
  const writable = info?.state === 'ok' || info?.state === 'missing'
  const unlisted = current !== undefined && !files.includes(current)
  const effectiveExists = effective !== undefined && files.includes(effective)

  // An existing file is a question with three answers, as for a picture: replace, use it, or stop.
  const resolveExists = async (file: string, replace: () => Promise<void>): Promise<boolean> => {
    const answer = await askDialog({
      text: t('snippets.fileExists', { name: file, dir }),
      altLabel: t('snippets.useExisting'),
      confirmLabel: t('snippets.replace'),
      danger: true
    })
    if (answer === 'cancel') return false
    if (answer === 'confirm') await replace()
    return true
  }

  const run = async (action: () => Promise<void>): Promise<void> => {
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(formatIpcError(err))
    } finally {
      setReload((n) => n + 1)
    }
  }

  const create = (): Promise<void> =>
    run(async () => {
      const base = (newName ?? '').trim()
      if (!base) return
      const file = /\.(md|html?)$/i.test(base) ? base : base + newExt
      const r = await window.quartzGui.snippets.write({
        projectPath,
        dir,
        file,
        content: ''
      })
      if (r.status === 'exists') {
        const go = await resolveExists(r.file, async () => {
          await window.quartzGui.snippets.write({
            projectPath,
            dir,
            file: r.file,
            content: '',
            overwrite: true
          })
        })
        if (!go) return
      }
      setNewName(null)
      onValue(r.file)
      setEditing(r.file)
    })

  const importFile = (): Promise<void> =>
    run(async () => {
      const sourcePath = await window.quartzGui.dialog.pickFile([
        {
          name: t('snippets.snippetFilter'),
          extensions: ['md', 'html', 'htm']
        }
      ])
      if (!sourcePath) return
      const r = await window.quartzGui.snippets.import({
        projectPath,
        dir,
        sourcePath
      })
      if (r.status === 'exists') {
        const go = await resolveExists(r.file, async () => {
          await window.quartzGui.snippets.import({
            projectPath,
            dir,
            sourcePath,
            overwrite: true
          })
        })
        if (!go) return
      }
      onValue(r.file)
    })

  if (info && (info.state === 'outside' || info.state === 'reserved')) {
    // Nothing to choose from: the folder is one the app does not read. The value stays editable as
    // text, as before 1.1, and the sentence says why there is no list.
    return (
      <span className="flex flex-col gap-1">
        <TextInput
          key={current ?? ''}
          id={id}
          defaultValue={current ?? ''}
          placeholder={hasDefault ? inlineValue(defaultValue) : undefined}
          onBlur={(e) => e.target.value !== (current ?? '') && onValue(e.target.value === '' ? undefined : e.target.value)}
          className="w-56"
        />
        <span className="text-micro text-amber-700 dark:text-amber-300">{t(info.state === 'outside' ? 'snippets.dir.outside' : 'snippets.dir.reserved', { dir })}</span>
      </span>
    )
  }

  return (
    <div className="flex w-[28rem] max-w-full flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Select
          id={id}
          value={current === undefined ? '' : current}
          onChange={(e) => onValue(e.target.value === '' ? undefined : e.target.value)}
          className="w-56"
        >
          <option value="">
            {hasDefault
              ? t('pluginOptions.defaultChoice', {
                  value: inlineValue(defaultValue)
                })
              : t('pluginOptions.notSet')}
          </option>
          {unlisted && <option value={current}>{t('snippets.notInDir', { name: current })}</option>}
          {files.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
        {writable && (
          <Button variant="ghost" onClick={() => setNewName(newName === null ? '' : null)} aria-expanded={newName !== null}>
            <FilePlus2 size={14} aria-hidden />
            {t('snippets.new')}
          </Button>
        )}
        {writable && (
          <Button variant="ghost" onClick={() => void importFile()}>
            <FileUp size={14} aria-hidden />
            {t('snippets.import')}
          </Button>
        )}
        {writable && effectiveExists && (
          <Button
            variant="ghost"
            onClick={() => setEditing(editing === effective ? null : (effective ?? null))}
            aria-expanded={editing === effective}
          >
            <Pencil size={14} aria-hidden />
            {t('snippets.edit')}
          </Button>
        )}
      </div>
      {info?.state === 'link' && <span className="text-micro text-text-muted">{t('snippets.dir.link', { dir })}</span>}
      {info?.state === 'missing' && <span className="text-micro text-text-muted">{t('snippets.dir.missing', { dir })}</span>}
      {info && effective !== undefined && !effectiveExists && info.state !== 'missing' && (
        <span className="text-micro text-amber-700 dark:text-amber-300">{t('snippets.missingFile', { name: effective, dir })}</span>
      )}
      {newName !== null && (
        <form
          className="flex flex-wrap items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            void create()
          }}
        >
          <TextInput
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('snippets.newNamePlaceholder')}
            aria-label={t('snippets.newName')}
            className="w-40"
          />
          <Select
            value={newExt}
            onChange={(e) => setNewExt(e.target.value as '.md' | '.html')}
            aria-label={t('snippets.newFormat')}
            className="w-32"
          >
            <option value=".md">{t('snippets.formatMarkdown')}</option>
            <option value=".html">{t('snippets.formatHtml')}</option>
          </Select>
          <Button type="submit" disabled={!newName.trim()}>
            {t('snippets.create')}
          </Button>
        </form>
      )}
      {error && <span className="text-micro text-red-600 dark:text-red-400">{error}</span>}
      {editing !== null && writable && files.includes(editing) && (
        <SnippetEditor
          key={`${dir}/${editing}`}
          projectPath={projectPath}
          dir={dir}
          file={editing}
          placeholdersOff={placeholdersOff}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// Tailwind's darkMode:'media' leaves no class to read; CodeMirror's theme wants the word (as in
// Styles/CustomCss.tsx).
function useScheme(): 'light' | 'dark' {
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

/**
 * One snippet file in an editor. It writes the file with its own button - "Snippet speichern" -
 * and not with the page's save, which writes the config: a knob that saves part of a page carries
 * its reach in its name (conventions.md). The draft survives a change of route (sticky state), so
 * leaving the page does not lose it, and closing with unsaved changes asks.
 */
export function SnippetEditor({
  projectPath,
  dir,
  file,
  placeholdersOff,
  onClose,
  onSaved
}: {
  projectPath: string
  dir: string
  file: string
  placeholdersOff: boolean
  onClose: () => void
  /** After the file is written - for a list that shows what the file contains (which pictures it uses). */
  onSaved?: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const scheme = useScheme()
  const format = formatOfFile(file)
  const [saved, setSaved] = useState<string | null>(null)
  const [draft, setDraft] = useStickyState<string | null>(`snippets.draft:${dir}/${file}`, null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  // As in the CSS editor: an insert goes to the cursor only once the user has placed one, otherwise
  // to the end - position 0 is CodeMirror's default, not a choice.
  const cursorPlaced = useRef(false)

  useEffect(() => {
    let live = true
    window.quartzGui.snippets
      .read({ projectPath, dir, file })
      .then((text) => live && setSaved(text))
      .catch((err) => live && setError(formatIpcError(err)))
    return () => {
      live = false
    }
  }, [projectPath, dir, file])

  const content = draft ?? saved ?? ''
  const dirty = draft !== null && saved !== null && draft !== saved

  const save = async (): Promise<void> => {
    if (draft === null) return
    setError(null)
    try {
      await window.quartzGui.snippets.write({
        projectPath,
        dir,
        file,
        content: draft,
        overwrite: true
      })
      setSaved(draft)
      setDraft(null)
      setStatus(t('snippets.saved', { name: file }))
      onSaved?.()
    } catch (err) {
      setError(formatIpcError(err))
    }
  }

  const close = async (): Promise<void> => {
    if (dirty) {
      const ok = await confirmDialog({
        text: t('snippets.discardConfirm', { name: file }),
        confirmLabel: t('snippets.discard'),
        danger: true
      })
      if (!ok) return
    }
    setDraft(null)
    onClose()
  }

  const insert = useCallback((text: string): void => {
    const view = viewRef.current
    if (!view) return
    if (cursorPlaced.current) {
      view.dispatch({
        ...view.state.replaceSelection(text),
        userEvent: 'input'
      })
    } else {
      const end = view.state.doc.length
      const lead = end > 0 && !view.state.doc.toString().endsWith('\n') ? '\n' : ''
      view.dispatch({
        changes: { from: end, insert: lead + text },
        selection: { anchor: end + lead.length + text.length }
      })
    }
    view.focus()
  }, [])

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-ink/10 p-2 dark:border-ink/10">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-semibold">{file}</span>
        <span className="text-micro text-text-muted">
          {format === 'markdown' ? t('snippets.formatMarkdown') : t('snippets.formatHtml')}
        </span>
        <span className="flex-1" />
        {/* "Unsaved" changes because someone types, so it stays out of the live region; "saved"
            appears after a click, not where the click was, so it is announced. */}
        {dirty && <span className="text-micro text-text-muted">{t('snippets.unsaved')}</span>}
        <span role="status" className="text-micro text-text-muted">
          {dirty ? null : status}
        </span>
      </div>
      {saved === null && !error ? (
        <span className="text-micro text-text-muted">{t('common.loading')}</span>
      ) : (
        <div className="overflow-hidden rounded border border-ink/10 dark:border-ink/10">
          <CodeMirror
            value={content}
            height="240px"
            theme={scheme}
            // A snippet is prose, not a stylesheet: lines wrap instead of running out of the box.
            extensions={[format === 'markdown' ? markdown() : html(), EditorView.lineWrapping]}
            onChange={(v) => {
              setDraft(v)
              setStatus(null)
            }}
            onCreateEditor={(view) => {
              viewRef.current = view
              cursorPlaced.current = false
            }}
            onUpdate={(update) => {
              if (update.transactions.some((tr) => tr.annotation(Transaction.userEvent) !== undefined)) cursorPlaced.current = true
              else if (update.docChanged) cursorPlaced.current = false
            }}
          />
        </div>
      )}
      <p className="text-micro text-text-muted">{t('snippets.saveHint')}</p>
      <PlaceholderList onInsert={insert} off={placeholdersOff} />
      <div className="flex flex-wrap items-start gap-1.5">
        <ImageButton projectPath={projectPath} format={format} placeholdersOff={placeholdersOff} onInsert={insert} />
        <span className="flex-1" />
        <Button variant="ghost" onClick={() => void close()}>
          {t('snippets.close')}
        </Button>
        <Button onClick={() => void save()} disabled={!dirty}>
          {t('snippets.save')}
        </Button>
      </div>
      {error && <span className="text-micro text-red-600 dark:text-red-400">{error}</span>}
    </div>
  )
}

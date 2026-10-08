import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FilePlus2, FileUp, FolderOpen, ImagePlus, Pencil, TextCursorInput, Trash2 } from 'lucide-react'
import type { SnippetDirInfo, StaticFileKind } from '@shared/ipc-contract'
import { Button, Card, CardHeading, IconButton, Select, TextInput } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import { SnippetEditor } from '../../components/PluginOptionsForm/snippets'
import { announce } from '../../state/announcer'
import { askDialog, confirmDialog } from '../../utils/confirm'
import { IMAGES_DIR, boxDir, boxHtmls, mentionsImage, snippetRefs, type BoxInstance } from './layoutBoxes'

/**
 * The files behind the layout boxes, as a list: the snippets in each folder a box reads from, and
 * the pictures in quartz/static/images, each with the boxes - or snippets - that use it.
 *
 * Every operation goes through snippetService, which decides what may be written; a file is never
 * deleted, only moved to the system's trash. Renaming a snippet updates the boxes that name it
 * (`onSnippetRenamed`, which writes the config); renaming a picture does not touch the text that
 * mentions it, and asks first when something does.
 */
export default function ExtraContentFiles({
  projectPath,
  boxes,
  labelOf,
  onSnippetRenamed
}: {
  projectPath: string
  boxes: BoxInstance[]
  labelOf: (box: BoxInstance) => string
  onSnippetRenamed: (dir: string, from: string, to: string) => Promise<void>
}): JSX.Element {
  const { t } = useTranslation()
  const dirs = [...new Set(boxes.map((b) => boxDir(b.plugin.options)))].sort()
  const dirsKey = dirs.join('\n')
  const [snippetDirs, setSnippetDirs] = useState<Record<string, SnippetDirInfo>>({})
  // What each snippet says, for the question which pictures it shows. Keyed `dir/file`.
  const [contents, setContents] = useState<Record<string, string>>({})
  const [images, setImages] = useState<SnippetDirInfo | null>(null)
  // Two errors, because the list is read again after every action: one shared state let the
  // successful reload clear the action's message in the same breath (41st review, finding 3).
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const reload = useCallback(async (): Promise<void> => {
    try {
      const listed = await Promise.all(dirsKey.split('\n').filter(Boolean).map(async (dir) => [dir, await window.quartzGui.snippets.list({ projectPath, dir })] as const))
      const texts: Record<string, string> = {}
      await Promise.all(
        listed.flatMap(([dir, info]) =>
          info.state === 'ok' || info.state === 'link'
            ? info.files.map(async (file) => {
                texts[`${dir}/${file}`] = await window.quartzGui.snippets.read({ projectPath, dir, file }).catch(() => '')
              })
            : []
        )
      )
      setSnippetDirs(Object.fromEntries(listed))
      setContents(texts)
      setImages(await window.quartzGui.staticFiles.listImages({ projectPath }))
      setLoadError(null)
    } catch (err) {
      setLoadError(formatIpcError(err))
    }
  }, [projectPath, dirsKey])

  useEffect(() => {
    void reload()
  }, [reload])

  const snippetUsers = (dir: string, file: string): string[] =>
    boxes
      .filter((b) => boxDir(b.plugin.options) === dir)
      .flatMap((b) => {
        const refs = snippetRefs(b.plugin.options).filter((r) => r.file === file)
        if (refs.length === 0) return []
        const label = labelOf(b)
        return [refs.every((r) => r.inherited) ? t('extraContent.files.inherited', { name: label }) : label]
      })

  const imageUsers = (name: string): string[] => [
    ...boxes.filter((b) => boxHtmls(b.plugin.options).some((h) => mentionsImage(h, name))).map(labelOf),
    ...Object.entries(contents)
      .filter(([, text]) => mentionsImage(text, name))
      .map(([key]) => key.slice(key.lastIndexOf('/') + 1))
  ]

  async function run(action: () => Promise<void>): Promise<void> {
    setActionError(null)
    try {
      await action()
    } catch (err) {
      setActionError(formatIpcError(err))
    }
    await reload()
  }

  // An existing file is a question with three answers, as in the snippet field: replace, keep the one there, or stop.
  async function replaceOrKeep(name: string, dir: string): Promise<'confirm' | 'alt' | 'cancel'> {
    return askDialog({
      text: t('snippets.fileExists', { name, dir }),
      altLabel: t('snippets.useExisting'),
      confirmLabel: t('snippets.replace'),
      danger: true
    })
  }

  const addSnippet = (dir: string): Promise<void> =>
    run(async () => {
      const sourcePath = await window.quartzGui.dialog.pickFile([{ name: t('snippets.snippetFilter'), extensions: ['md', 'html', 'htm'] }])
      if (!sourcePath) return
      let r = await window.quartzGui.snippets.import({ projectPath, dir, sourcePath })
      if (r.status === 'exists') {
        if ((await replaceOrKeep(r.file, dir)) !== 'confirm') return
        r = await window.quartzGui.snippets.import({ projectPath, dir, sourcePath, overwrite: true })
      }
      announce(t('extraContent.files.addedAnnounce', { name: r.file }))
    })

  const newSnippet = (dir: string, name: string): Promise<void> =>
    run(async () => {
      const r = await window.quartzGui.snippets.write({ projectPath, dir, file: name, content: '' })
      if (r.status === 'exists' && (await replaceOrKeep(r.file, dir)) === 'confirm') {
        await window.quartzGui.snippets.write({ projectPath, dir, file: r.file, content: '', overwrite: true })
      } else if (r.status === 'exists') return
      announce(t('extraContent.files.addedAnnounce', { name: r.file }))
    })

  const addImage = (): Promise<void> =>
    run(async () => {
      const sourcePath = await window.quartzGui.dialog.pickFile([
        { name: t('snippets.imageFilter'), extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'] }
      ])
      if (!sourcePath) return
      let r = await window.quartzGui.staticImage.import({ projectPath, sourcePath })
      if (r.status === 'exists') {
        if ((await replaceOrKeep(r.relativePath, IMAGES_DIR)) !== 'confirm') return
        r = await window.quartzGui.staticImage.import({ projectPath, sourcePath, overwrite: true })
      }
      announce(t('extraContent.files.addedAnnounce', { name: r.relativePath.slice('images/'.length) }))
    })

  /** Returns the sentence for the rename form when the name is taken, null when done. */
  async function rename(kind: StaticFileKind, dir: string, from: string, to: string): Promise<string | null> {
    const users = kind === 'image' ? imageUsers(from) : []
    if (
      users.length > 0 &&
      !(await confirmDialog({
        text: t('extraContent.files.imageRenameConfirm', { name: from, names: users.join(', ') }),
        confirmLabel: t('extraContent.files.renameSubmit')
      }))
    )
      return null
    let taken: string | null = null
    await run(async () => {
      const r = await window.quartzGui.staticFiles.rename({ projectPath, kind, dir: kind === 'snippet' ? dir : undefined, from, to })
      if (r.status === 'exists') {
        taken = t('extraContent.files.renameTaken', { name: r.file })
        return
      }
      if (kind === 'snippet') await onSnippetRenamed(dir, from, r.file)
      else announce(t('extraContent.files.renamedAnnounce', { from, to: r.file }))
    })
    return taken
  }

  const trash = (kind: StaticFileKind, dir: string, file: string, users: string[]): Promise<void> =>
    run(async () => {
      const ok = await confirmDialog({
        text: users.length
          ? t('extraContent.files.trashConfirmUsed', { name: file, names: users.join(', ') })
          : t('extraContent.files.trashConfirm', { name: file }),
        confirmLabel: t('extraContent.files.trashLabel'),
        danger: true
      })
      if (!ok) return
      await window.quartzGui.staticFiles.trash({ projectPath, kind, dir: kind === 'snippet' ? dir : undefined, file })
      announce(t('extraContent.files.trashedAnnounce', { name: file }))
    })

  return (
    <Card className="flex flex-col gap-4">
      <CardHeading icon={FolderOpen}>{t('extraContent.files.title')}</CardHeading>
      <p className="max-w-[95ch] text-micro text-text-muted">{t('extraContent.files.intro')}</p>
      {[actionError, loadError].filter(Boolean).map((message) => (
        <p key={message} role="alert" className="text-ui text-red-600 dark:text-red-400">
          {message}
        </p>
      ))}
      {dirs.map((dir) => (
        <FileSection
          key={dir}
          kind="snippet"
          dir={dir}
          heading={t('extraContent.files.snippetsIn', { dir })}
          info={snippetDirs[dir] ?? null}
          usersOf={(file) => snippetUsers(dir, file)}
          projectPath={projectPath}
          onAdd={() => void addSnippet(dir)}
          onNew={(name) => newSnippet(dir, name)}
          onRename={(from, to) => rename('snippet', dir, from, to)}
          onTrash={(file, users) => void trash('snippet', dir, file, users)}
          onSaved={() => void reload()}
        />
      ))}
      <FileSection
        kind="image"
        dir={IMAGES_DIR}
        heading={t('extraContent.files.images', { dir: IMAGES_DIR })}
        info={images}
        usersOf={imageUsers}
        projectPath={projectPath}
        onAdd={() => void addImage()}
        onRename={(from, to) => rename('image', IMAGES_DIR, from, to)}
        onTrash={(file, users) => void trash('image', IMAGES_DIR, file, users)}
      />
    </Card>
  )
}

function FileSection({
  kind,
  dir,
  heading,
  info,
  usersOf,
  projectPath,
  onAdd,
  onNew,
  onRename,
  onTrash,
  onSaved
}: {
  kind: StaticFileKind
  dir: string
  heading: string
  info: SnippetDirInfo | null
  usersOf: (file: string) => string[]
  projectPath: string
  onAdd: () => void
  /** Snippets only: an empty file under this name. */
  onNew?: (name: string) => Promise<void>
  onRename: (from: string, to: string) => Promise<string | null>
  onTrash: (file: string, users: string[]) => void
  onSaved?: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const [newName, setNewName] = useState<string | null>(null)
  const [newExt, setNewExt] = useState<'.md' | '.html'>('.md')
  const [editing, setEditing] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const writable = info?.state === 'ok' || info?.state === 'missing'
  const files = info?.files ?? []

  return (
    <section className="flex flex-col gap-2 border-t border-ink/[0.06] pt-3 dark:border-ink/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="break-all font-mono text-micro font-semibold text-text-secondary">{heading}</h3>
        {writable && (
          <div className="flex flex-wrap gap-1.5">
            {onNew && (
              <Button variant="ghost" onClick={() => setNewName(newName === null ? '' : null)} aria-expanded={newName !== null}>
                <FilePlus2 size={14} aria-hidden />
                {t('extraContent.files.newSnippet')}
              </Button>
            )}
            <Button variant="ghost" onClick={onAdd}>
              {kind === 'image' ? <ImagePlus size={14} aria-hidden /> : <FileUp size={14} aria-hidden />}
              {kind === 'image' ? t('extraContent.files.addImage') : t('extraContent.files.addSnippet')}
            </Button>
          </div>
        )}
      </div>
      {info?.state === 'missing' && <p className="text-micro text-text-muted">{t('extraContent.files.dirMissing')}</p>}
      {info?.state === 'link' && <p className="text-micro text-text-muted">{t('extraContent.files.dirLink')}</p>}
      {(info?.state === 'outside' || info?.state === 'reserved') && (
        <p className="text-micro text-amber-700 dark:text-amber-300">{t('extraContent.files.dirUnusable')}</p>
      )}
      {newName !== null && onNew && (
        <form
          className="flex flex-wrap items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            const base = newName.trim()
            if (!base) return
            void onNew(/\.(md|html?)$/i.test(base) ? base : base + newExt).then(() => setNewName(null))
          }}
        >
          <TextInput
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('snippets.newNamePlaceholder')}
            aria-label={t('snippets.newName')}
            className="w-48"
          />
          <Select value={newExt} onChange={(e) => setNewExt(e.target.value as '.md' | '.html')} aria-label={t('snippets.newFormat')} className="w-32">
            <option value=".md">{t('snippets.formatMarkdown')}</option>
            <option value=".html">{t('snippets.formatHtml')}</option>
          </Select>
          <Button type="submit" disabled={!newName.trim()}>
            {t('snippets.create')}
          </Button>
        </form>
      )}
      {info?.state === 'ok' && files.length === 0 && (
        <p className="text-micro text-text-muted">{t('extraContent.files.empty')}</p>
      )}
      <ul className="flex flex-col gap-1">
        {files.map((file) => {
          const users = usersOf(file)
          return (
            <li key={file} className="flex flex-col gap-1.5 rounded-md border border-ink/10 px-3 py-1.5 dark:border-ink/10">
              {renaming === file ? (
                <RenameForm file={file} onCancel={() => setRenaming(null)} onSubmit={(to) => onRename(file, to)} onDone={() => setRenaming(null)} />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-mono text-xs text-text">{file}</span>
                    <span className="truncate text-micro text-text-muted">
                      {users.length ? t('extraContent.files.usedBy', { names: users.join(', ') }) : t('extraContent.files.unused')}
                    </span>
                  </div>
                  {writable && kind === 'snippet' && (
                    <IconButton
                      icon={Pencil}
                      tone="neutral"
                      title={t('extraContent.files.editNamed', { name: file })}
                      expanded={editing === file}
                      onClick={() => setEditing(editing === file ? null : file)}
                    />
                  )}
                  {writable && (
                    <IconButton icon={TextCursorInput} tone="neutral" title={t('extraContent.files.renameNamed', { name: file })} onClick={() => setRenaming(file)} />
                  )}
                  {writable && <IconButton icon={Trash2} title={t('extraContent.files.trashNamed', { name: file })} onClick={() => onTrash(file, users)} />}
                </div>
              )}
              {editing === file && kind === 'snippet' && (
                <SnippetEditor
                  key={`${dir}/${file}`}
                  projectPath={projectPath}
                  dir={dir}
                  file={file}
                  placeholdersOff={false}
                  onClose={() => setEditing(null)}
                  onSaved={onSaved}
                />
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function RenameForm({
  file,
  onSubmit,
  onCancel,
  onDone
}: {
  file: string
  onSubmit: (to: string) => Promise<string | null>
  onCancel: () => void
  onDone: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const [value, setValue] = useState(file)
  const [problem, setProblem] = useState<string | null>(null)
  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={(e) => {
        e.preventDefault()
        const to = value.trim()
        if (!to || to === file) return onCancel()
        void onSubmit(to).then((taken) => (taken ? setProblem(taken) : onDone()))
      }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <TextInput
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setProblem(null)
          }}
          onKeyDown={(e) => {
            // Handled here, so the page's Escape (DetailLayout) does not also drop the selected box.
            if (e.key === 'Escape') {
              e.preventDefault()
              onCancel()
            }
          }}
          aria-label={t('extraContent.files.renameLabel', { name: file })}
          className="min-w-0 flex-1 font-mono"
        />
        <Button type="submit">{t('extraContent.files.renameSubmit')}</Button>
        <Button variant="ghost" onClick={onCancel}>
          {t('extraContent.files.cancel')}
        </Button>
      </div>
      {problem && <span className="text-micro text-red-600 dark:text-red-400">{problem}</span>}
    </form>
  )
}

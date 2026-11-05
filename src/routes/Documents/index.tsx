import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookText, ListOrdered, Plus, Settings2, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { BookDefinition, BookListing, SaveBookInput } from '@shared/ipc-contract'
import { emptyBook } from '@shared/bookDefinition'
import {
  Button,
  Card,
  CardHeading,
  DetailLayout,
  Field,
  FieldGroup,
  FormActions,
  IconButton,
  InfoNote,
  PageHeader,
  SegmentedControl,
  Select,
  SelectableRow,
  TextInput,
  Toggle,
  focusRowAt
} from '../../components/ui'
import { confirmDialog } from '../../utils/confirm'
import { formatIpcError } from '../../components/ErrorSurface'
import { useAsyncAction } from '../../hooks/useAsyncAction'
import { useStickyState } from '../../state/uiState'
import { confirmLeave, useUnsavedChanges } from '../../state/unsavedGuard'
import { useSaveCommand } from '../../state/saveCommand'
import { useIpcQuery } from '../../state/useIpcQuery'
import { announce } from '../../state/announcer'
import { useProject } from '../ProjectLayout'
import { TAB_ICONS } from '../navConfig'
import PageOrder from './PageOrder'
import HandbookLink from '../../components/HandbookLink'

/**
 * Dokumente: the books of a project - which pages of the site go into a PDF, ePub or offline HTML,
 * in which order, with which title. A book is a file in the project (quartz-books/<id>.json, see
 * bookService); the export itself is a target on Veröffentlichen, which names a book.
 *
 * The page owns the selected book as a draft: read from the listing, saved explicitly (button or
 * Cmd+S), dirty by comparison with what was read, and read again after every save.
 */

type Draft = SaveBookInput & { id: string }

function asDraft(book: BookDefinition): Draft {
  return { ...book }
}

export default function Documents(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [listing, setListing] = useState<BookListing | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useStickyState<string | null>('documents.book', null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const listRef = useRef<HTMLUListElement>(null)

  async function reload(select?: string | null): Promise<BookListing | null> {
    try {
      const next = await window.quartzGui.books.list({ projectPath: project.path })
      setListing(next)
      setListError(null)
      const id = select !== undefined ? select : selectedId
      const book = next.books.find((b) => b.id === id) ?? null
      setDraft(book ? asDraft(book) : null)
      setSaved(book ? JSON.stringify(asDraft(book)) : null)
      if (select !== undefined) setSelectedId(book ? book.id : null)
      return next
    } catch (err) {
      setListError(formatIpcError(err))
      return null
    }
  }

  useEffect(() => {
    void reload()
  }, [project.path])

  const dirty = draft !== null && JSON.stringify(draft) !== saved
  useUnsavedChanges(dirty)

  // The leave guard goes on only when the save says it worked (runSaveCommand), and useAsyncAction
  // keeps a failure to itself - so the save records whether it got through. Registered as a bare
  // `saveAction.run()`, a save into a read-only quartz-books/ failed, and the sidebar left the page
  // anyway, edits gone (measured 2026-11-05).
  const saveWorked = useRef(false)
  const saveAction = useAsyncAction(async () => {
    saveWorked.current = false
    if (!draft) return
    const book = await window.quartzGui.books.save({ projectPath: project.path, book: draft })
    await reload(book.id)
    announce(t('documents.savedAnnounce', { name: book.title || book.id }))
    saveWorked.current = true
  })
  async function save(): Promise<boolean> {
    await saveAction.run()
    return saveWorked.current
  }
  // A failed save keeps the page. Its message stood under the buttons at the foot of the panel,
  // below the window after the leave guard's "Speichern" (measured: y 1019 in a window 800 high),
  // so the page seemed to ignore the click. It is said, stands above the buttons and is brought
  // into view.
  const saveErrorRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    const el = saveErrorRef.current
    if (!saveAction.error || !el) return
    el.scrollIntoView({ block: 'nearest' })
    // scrollIntoView moves the page and the sticky panel in one go and fell 67 px short (the panel
    // could still scroll 127); what is missing is scrolled in the panel itself.
    const panel = el.closest('aside')
    if (!panel) return
    const over = el.getBoundingClientRect().bottom - panel.getBoundingClientRect().bottom
    if (over > 0) panel.scrollTop += over + 8
  }, [saveAction.error])
  useSaveCommand(dirty && !saveAction.pending ? save : null)

  // Every way off the open book asks the question the sidebar asks, with its three answers: another
  // row, Escape, a click on the empty page and "Neues Buch" asked "Verwerfen?" with two, while the
  // sidebar and the menu offered "Speichern" as well (measured 2026-11-05).
  async function select(id: string | null): Promise<void> {
    if (id === selectedId) return
    if (!(await confirmLeave(t))) return
    setSelectedId(id)
    const book = listing?.books.find((b) => b.id === id) ?? null
    setDraft(book ? asDraft(book) : null)
    setSaved(book ? JSON.stringify(asDraft(book)) : null)
  }

  const createAction = useAsyncAction(async () => {
    if (!(await confirmLeave(t))) return
    const book = await window.quartzGui.books.save({ projectPath: project.path, book: emptyBook(t('documents.newBookTitle')) })
    await reload(book.id)
    announce(t('documents.createdAnnounce', { name: book.title }))
  })

  async function remove(book: BookDefinition, index: number): Promise<void> {
    const name = book.title || book.id
    if (!(await confirmDialog({ text: t('documents.confirmDelete', { name, file: `quartz-books/${book.id}.json` }), confirmLabel: t('documents.deleteBook'), danger: true }))) return
    await window.quartzGui.books.delete({ projectPath: project.path, id: book.id })
    await reload(book.id === selectedId ? null : selectedId)
    announce(t('documents.deletedAnnounce', { name }))
    // After the removal is rendered, or the focus lands on the row that is going away.
    requestAnimationFrame(() => focusRowAt(listRef.current, index))
  }

  // The pages of the build, for the selected book's folder and language. A new read on every
  // change of those two, guarded against an older answer arriving last (useIpcQuery).
  const root = draft?.root ?? ''
  const language = draft?.language ?? ''
  const site = useIpcQuery(
    () => (draft ? window.quartzGui.books.sitePages({ projectPath: project.path, root, language }) : Promise.resolve(null)),
    [project.path, draft?.id, root, language]
  )

  const update = (patch: Partial<Draft>): void => setDraft((d) => (d ? { ...d, ...patch } : d))
  const languages = site.data?.languages ?? []

  const panel = draft ? (
    <Card>
      <CardHeading icon={Settings2} className="mb-3">{t('documents.settingsHeading')}</CardHeading>
      <div className="flex flex-col gap-3">
        <Field label={t('documents.fields.title')} hint={t('documents.fields.titleHint')}>
          <TextInput value={draft.title} onChange={(e) => update({ title: e.target.value })} />
        </Field>
        <Field label={t('documents.fields.subtitle')}>
          <TextInput value={draft.subtitle} onChange={(e) => update({ subtitle: e.target.value })} />
        </Field>
        <Field label={t('documents.fields.author')}>
          <TextInput value={draft.author} onChange={(e) => update({ author: e.target.value })} />
        </Field>
        {languages.length > 1 && (
          <Field label={t('documents.fields.language')}>
            <Select value={draft.language} onChange={(e) => update({ language: e.target.value })}>
              <option value="">{t('documents.fields.languageDefault', { language: languages.find((l) => l.code === site.data?.defaultLanguage)?.label ?? site.data?.defaultLanguage ?? '' })}</option>
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label={t('documents.fields.root')} hint={t('documents.fields.rootHint')}>
          <TextInput value={draft.root} placeholder={t('documents.fields.rootPlaceholder')} onChange={(e) => update({ root: e.target.value })} />
        </Field>
        <Field label={t('documents.fields.cover')} hint={t('documents.fields.coverHint')}>
          <TextInput value={draft.coverImage} placeholder="quartz/static/icon.png" onChange={(e) => update({ coverImage: e.target.value })} />
        </Field>
        <Toggle label={t('documents.fields.toc')} hint={t('documents.fields.tocHint')} checked={draft.toc} onChange={(toc) => update({ toc })} />
        <Toggle label={t('documents.fields.backlinks')} hint={t('documents.fields.backlinksHint')} checked={draft.backlinks} onChange={(backlinks) => update({ backlinks })} />
        <Toggle label={t('documents.fields.tagIndex')} hint={t('documents.fields.tagIndexHint')} checked={draft.tagIndex} onChange={(tagIndex) => update({ tagIndex })} />
        <FieldGroup label={t('documents.fields.outsideLinks')}>
          <SegmentedControl
            label={t('documents.fields.outsideLinks')}
            value={draft.outsideLinks}
            onChange={(outsideLinks) => update({ outsideLinks })}
            options={[
              { value: 'site', label: t('documents.fields.outsideSite') },
              { value: 'text', label: t('documents.fields.outsideText') }
            ]}
          />
        </FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('documents.fields.pageSize')}>
            <Select value={draft.pdf.pageSize} onChange={(e) => update({ pdf: { ...draft.pdf, pageSize: e.target.value as Draft['pdf']['pageSize'] } })}>
              <option value="A4">A4</option>
              <option value="A5">A5</option>
              <option value="Letter">Letter</option>
            </Select>
          </Field>
          <div className="flex items-end pb-1.5">
            <Toggle label={t('documents.fields.landscape')} checked={draft.pdf.landscape} onChange={(landscape) => update({ pdf: { ...draft.pdf, landscape } })} />
          </div>
        </div>
      </div>
      {saveAction.error && (
        <p ref={saveErrorRef} role="alert" className="mt-3 whitespace-pre-wrap break-words text-xs text-red-600 dark:text-red-400">
          {saveAction.error}
        </p>
      )}
      <FormActions
        secondary={dirty ? <span className="text-micro text-text-muted">{t('documents.unsaved')}</span> : undefined}
      >
        <Button variant="ghost" disabled={!dirty || saveAction.pending} onClick={() => setDraft(saved ? (JSON.parse(saved) as Draft) : draft)}>
          {t('documents.discard')}
        </Button>
        <Button disabled={!dirty || saveAction.pending} onClick={() => void saveAction.run()}>
          {saveAction.pending ? t('common.saving') : t('common.save')}
        </Button>
      </FormActions>
    </Card>
  ) : (
    <Card>
      <CardHeading icon={Settings2} className="mb-2">{t('documents.settingsHeading')}</CardHeading>
      <p className="text-ui text-text-muted">{t('documents.noSelection')}</p>
    </Card>
  )

  const books = listing?.books ?? []
  const sourceSentence = useMemo(() => (site.data ? t(`documents.source.${site.data.source}`) : null), [site.data, t])

  return (
    <div>
      <PageHeader icon={TAB_ICONS.documents} title={t('documents.title')} description={t('documents.description')} status={null} handbook={<HandbookLink page="documents" />} />
      <DetailLayout panel={panel} panelLabel={t('documents.settingsHeading')} panelWidth="wide" onDismiss={() => void select(null)}>
        <InfoNote>
          {t('documents.howItWorks')}{' '}
          <Link to="../publish" className="underline">
            {t('documents.toPublish')}
          </Link>
        </InfoNote>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardHeading icon={BookText}>{t('documents.booksHeading')}</CardHeading>
            <Button variant="ghost" onClick={() => void createAction.run()} disabled={createAction.pending}>
              <Plus size={14} aria-hidden />
              {t('documents.newBook')}
            </Button>
          </div>
          {listError && <p className="text-xs text-red-600 dark:text-red-400">{listError}</p>}
          {createAction.error && <p className="text-xs text-red-600 dark:text-red-400">{createAction.error}</p>}
          {listing && books.length === 0 && <p className="text-ui text-text-muted">{t('documents.noBooks')}</p>}
          <ul ref={listRef} className="flex flex-col gap-2">
            {books.map((book, i) => (
              <SelectableRow
                key={book.id}
                selected={book.id === selectedId}
                onSelect={() => void select(book.id)}
                title={book.title || book.id}
                subtitle={`quartz-books/${book.id}.json`}
                trailing={<IconButton icon={Trash2} title={t('common.deleteNamed', { name: book.title || book.id })} onClick={() => void remove(book, i)} />}
              />
            ))}
          </ul>
          {listing && listing.unreadable.length > 0 && (
            <div className="mt-3">
              {listing.unreadable.map((u) => (
                <p key={u.id} className="text-xs text-amber-700 dark:text-amber-400">
                  {t('documents.unreadable', { file: `quartz-books/${u.id}.json`, reason: u.reason })}
                </p>
              ))}
            </div>
          )}
        </Card>
        {draft && (
          <Card>
            <CardHeading icon={ListOrdered} className="mb-2">{t('documents.pagesHeading')}</CardHeading>
            {site.loading && <p className="text-ui text-text-muted">{t('documents.pagesLoading')}</p>}
            {site.error && (
              <p className="whitespace-pre-wrap break-words text-xs text-red-600 dark:text-red-400">
                {site.error}{' '}
                <Link to="../server" className="underline">
                  {t('documents.toBuild')}
                </Link>
              </p>
            )}
            {site.data && !site.loading && (
              <>
                {sourceSentence && <p className="mb-2 text-micro text-text-muted">{sourceSentence}</p>}
                <PageOrder
                  order={draft.order}
                  excluded={draft.excluded}
                  site={site.data}
                  onChange={({ order, excluded }) => update({ order, excluded })}
                />
              </>
            )}
          </Card>
        )}
      </DetailLayout>
    </div>
  )
}

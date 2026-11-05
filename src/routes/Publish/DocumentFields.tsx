import { useTranslation } from 'react-i18next'
import type { BookDefinition, DocumentFormat, PublishDestination } from '@shared/ipc-contract'
import { Button, Field, FieldGroup, Select, TextInput, Toggle, useCopyToClipboard } from '../../components/ui'

type DocumentDestination = Extract<PublishDestination, { type: 'document' }>

const FORMATS: DocumentFormat[] = ['pdf', 'epub', 'html']

// Written out rather than computed, so the i18n check sees each key used.
const DOWNLOAD_LABEL: Record<DocumentFormat, string> = {
  pdf: 'publish.targetForm.downloadLink.pdf',
  epub: 'publish.targetForm.downloadLink.epub',
  html: 'publish.targetForm.downloadLink.html'
}

/**
 * The form fields of a document target: the folder the files go into, the book, and which formats.
 * The folder row is a FieldGroup, not a Field: a <label> forwards its clicks to the first labelable
 * element inside, and the „Auswählen“ button is one (see FieldGroup in ui.tsx).
 */
export default function DocumentFields({
  destination,
  books,
  onChange
}: {
  destination: DocumentDestination
  books: BookDefinition[]
  onChange: (destination: DocumentDestination) => void
}): JSX.Element {
  const { t } = useTranslation()
  // Two books of the same title were two equal lines; the file name tells them apart (review of
  // 2026-11-06, nebenbei 4). A book the target names that is gone (deleted, renamed on another
  // machine) stays selected and says so, rather than showing "pick a book" (nebenbei 5).
  const titleCount = new Map<string, number>()
  for (const b of books) titleCount.set(b.title, (titleCount.get(b.title) ?? 0) + 1)
  const bookLabel = (b: BookDefinition): string => (!b.title ? b.id : (titleCount.get(b.title) ?? 0) > 1 ? `${b.title} (${b.id})` : b.title)
  const bookGone = !!destination.bookId && !books.some((b) => b.id === destination.bookId)
  const toggleFormat = (format: DocumentFormat, on: boolean): void => {
    const formats = on ? FORMATS.filter((f) => f === format || destination.formats.includes(f)) : destination.formats.filter((f) => f !== format)
    onChange({ ...destination, formats })
  }
  return (
    <>
      <FieldGroup label={t('publish.targetForm.documentFolder')}>
        <div className="flex gap-2">
          <TextInput
            aria-label={t('publish.targetForm.documentFolder')}
            value={destination.path}
            onChange={(e) => onChange({ ...destination, path: e.target.value })}
            className="flex-1"
          />
          <Button
            variant="ghost"
            onClick={async () => {
              const folder = await window.quartzGui.dialog.pickFolder()
              if (folder) onChange({ ...destination, path: folder })
            }}
          >
            {t('common.select')}
          </Button>
        </div>
      </FieldGroup>
      <Field
        label={t('publish.targetForm.documentBook')}
        hint={
          bookGone
            ? t('publish.targetForm.documentBookGone', { id: destination.bookId })
            : books.length === 0
              ? t('publish.targetForm.documentNoBooks')
              : t('publish.targetForm.documentBookHint')
        }
      >
        <Select value={destination.bookId} onChange={(e) => onChange({ ...destination, bookId: e.target.value })}>
          <option value="">{t('publish.targetForm.documentPickBook')}</option>
          {bookGone && <option value={destination.bookId}>{t('publish.targetForm.documentBookGoneOption', { id: destination.bookId })}</option>}
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {bookLabel(b)}
            </option>
          ))}
        </Select>
      </Field>
      <FieldGroup label={t('publish.targetForm.documentFormats')} className="sm:col-span-2">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {FORMATS.map((format) => (
            <Toggle
              key={format}
              label={t(`publish.targetForm.format.${format}`)}
              checked={destination.formats.includes(format)}
              onChange={(on) => toggleFormat(format, on)}
            />
          ))}
        </div>
      </FieldGroup>
    </>
  )
}

/**
 * On a website target: which document targets go up with the site, under downloads/ (see
 * deploy/staging.ts), and the link to put on a page for each file. The link is a full address
 * from baseUrl: a site under a sub-path (GitHub Pages' /<repo>/) would break a link starting
 * with `/downloads/`, and a relative one depends on the page it stands on.
 */
export function WithDocumentsFields({
  targets,
  selected,
  baseUrl,
  onChange
}: {
  targets: { id: string; name: string; destination: DocumentDestination }[]
  selected: string[]
  baseUrl: string | undefined
  onChange: (ids: string[]) => void
}): JSX.Element | null {
  const { t } = useTranslation()
  const { copied, copy } = useCopyToClipboard()
  if (targets.length === 0) return null
  const host = (baseUrl ?? '').replace(/^https?:\/\//, '').replace(/\/+$/, '')
  return (
    <FieldGroup label={t('publish.targetForm.withDocuments')} className="sm:col-span-2">
      <p className="text-micro text-text-muted">{t('publish.targetForm.withDocumentsHint')}</p>
      <div className="flex flex-col gap-2">
        {targets.map((target) => {
          const on = selected.includes(target.id)
          return (
            <div key={target.id} className="flex flex-col gap-1">
              <Toggle
                label={target.name}
                checked={on}
                onChange={(next) => onChange(next ? [...selected, target.id] : selected.filter((id) => id !== target.id))}
              />
              {on &&
                target.destination.formats.map((format) => {
                  const name = `${target.destination.bookId}.${format}`
                  const markdown = host
                    ? `[${t(DOWNLOAD_LABEL[format])}](https://${host}/downloads/${name})`
                    : `downloads/${name}`
                  return (
                    <div key={format} className="ml-11 flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate font-mono text-micro text-text-secondary">{markdown}</code>
                      {host && (
                        <Button variant="ghost" onClick={() => copy(markdown)}>
                          {t('publish.targetForm.copyLink')}
                        </Button>
                      )}
                    </div>
                  )
                })}
            </div>
          )
        })}
      </div>
      {!host && <p className="text-micro text-text-muted">{t('publish.targetForm.withDocumentsNoBaseUrl')}</p>}
      <span role="status" className="text-micro text-text-muted">
        {copied ? t('publish.targetForm.linkCopied') : ''}
      </span>
    </FieldGroup>
  )
}

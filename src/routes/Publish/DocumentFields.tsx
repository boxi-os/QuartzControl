import { useTranslation } from 'react-i18next'
import type { BookDefinition, DocumentFormat, PublishDestination } from '@shared/ipc-contract'
import { Button, Field, FieldGroup, Select, TextInput, Toggle } from '../../components/ui'

type DocumentDestination = Extract<PublishDestination, { type: 'document' }>

const FORMATS: DocumentFormat[] = ['pdf', 'epub', 'html']

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
        hint={books.length === 0 ? t('publish.targetForm.documentNoBooks') : t('publish.targetForm.documentBookHint')}
      >
        <Select value={destination.bookId} onChange={(e) => onChange({ ...destination, bookId: e.target.value })}>
          <option value="">{t('publish.targetForm.documentPickBook')}</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title || b.id}
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

import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, TextInput } from '../../components/ui'
import { isObject, textIn, type Text } from './formsOptions'

/**
 * A Text of quartz-forms: one string for every language, or a record by language code. Most
 * texts of a form are of this kind - title, labels, hints, the consent sentence - so the forms tab
 * has one editor for them rather than the generic union (a select "Text / Liste" and a record
 * editor), which showed a template's `{ en, de }` title as an empty field.
 *
 * - one field while the value is a string (or unset) and the site has one language; a site with
 *   several offers "per language", which writes a record with one entry per language
 * - a record shows one field per site language, plus any code the record names beside them
 * - `fallback` is what applies while the value is unset (the template's text, the plugin's): its
 *   words in each language stand as the placeholder
 * - a field writes when it is left or Return is pressed; an emptied record entry goes, an emptied
 *   record takes the key with it
 */
export function TextEditor({
  label,
  hint,
  value,
  fallback,
  languages,
  multiline = false,
  required = false,
  onValue
}: {
  label: string
  hint?: string
  value: unknown
  fallback?: unknown
  /** The site's language codes (siteLanguages); empty: the editor's own language. */
  languages: string[]
  multiline?: boolean
  /** The plugin refuses an empty text here; emptying the field is not offered as a value. */
  required?: boolean
  onValue: (next: Text | undefined) => void
}): JSX.Element {
  const { t, i18n } = useTranslation()
  const ui = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'de'
  const id = useId()
  const own = languages.length ? languages : [ui]
  const record = isObject(value)
  const codes = record ? [...own, ...Object.keys(value).filter((k) => !own.includes(k))] : own

  if (!record) {
    return (
      <div className="flex flex-col gap-1 text-ui">
        <label htmlFor={id} className="font-medium text-text-secondary">
          {label}
        </label>
        <TextDraft
          id={id}
          multiline={multiline}
          value={typeof value === 'string' ? value : ''}
          placeholder={textIn(fallback, own[0])}
          onCommit={(v) => onValue(v === '' && !required ? undefined : v === '' ? (value as Text | undefined) : v)}
        />
        <div className="flex flex-wrap items-center gap-2">
          {hint && <span className="text-micro text-text-muted">{hint}</span>}
          {own.length > 1 && (
            <Button
              variant="ghost"
              onClick={() => {
                const base = typeof value === 'string' ? value : ''
                const next = Object.fromEntries(own.map((code) => [code, base || textIn(fallback, code)]).filter(([, v]) => v))
                onValue(Object.keys(next).length ? next : undefined)
              }}
            >
              {t('formsEditor.text.perLanguage')}
            </Button>
          )}
        </div>
      </div>
    )
  }

  const entries = value as Record<string, unknown>
  const setCode = (code: string, v: string): void => {
    const next: Record<string, string> = {}
    for (const [k, x] of Object.entries(entries)) if (typeof x === 'string') next[k] = x
    if (v) next[code] = v
    else delete next[code]
    onValue(Object.keys(next).length ? next : undefined)
  }
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1 text-ui">
      <span className="font-medium text-text-secondary">{label}</span>
      {codes.map((code) => (
        <div key={code} className="flex items-start gap-2">
          <label htmlFor={`${id}-${code}`} className="w-8 shrink-0 pt-1.5 text-micro font-semibold uppercase text-text-secondary">
            {code}
          </label>
          <div className="min-w-0 flex-1">
            <TextDraft
              id={`${id}-${code}`}
              multiline={multiline}
              value={typeof entries[code] === 'string' ? (entries[code] as string) : ''}
              placeholder={textIn(fallback, code)}
              onCommit={(v) => setCode(code, v)}
            />
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        {hint && <span className="text-micro text-text-muted">{hint}</span>}
        <Button
          variant="ghost"
          onClick={() => {
            const first = textIn(entries, own[0])
            onValue(first || undefined)
          }}
        >
          {t('formsEditor.text.oneForAll')}
        </Button>
      </div>
    </div>
  )
}

/** An input or textarea that keeps what is typed and hands it on when it is left or on Return. */
function TextDraft({
  id,
  value,
  placeholder,
  multiline,
  onCommit
}: {
  id: string
  value: string
  placeholder?: string
  multiline: boolean
  onCommit: (value: string) => void
}): JSX.Element {
  const [draft, setDraft] = useState(value)
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setDraft(value)
  }, [value])
  const common = {
    id,
    value: draft,
    placeholder,
    onFocus: () => {
      focused.current = true
    },
    onBlur: () => {
      focused.current = false
      const trimmed = draft.trim()
      if (trimmed !== value) onCommit(trimmed)
    }
  }
  if (multiline) {
    return (
      <textarea
        {...common}
        rows={2}
        onChange={(e) => setDraft(e.target.value)}
        className="w-full rounded-[7px] border border-ink/10 bg-surface px-2.5 py-1.5 text-ui text-text shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
    )
  }
  return (
    <TextInput
      {...common}
      className="w-full"
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  )
}

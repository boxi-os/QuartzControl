import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import type { NormalizedOptionSchema } from '@shared/ipc-contract'
import { withPresentKeys } from '@shared/pluginOptionSchema'
import { ObjectBlock, type FormContext, type RootExtras } from './editors'
import { AddOptionRow } from './AddOptionRow'
import { fieldMatch, isEmptyObject } from './text'
import { TextInput } from '../ui'

// Below this many options the form is short enough to read; a search field would be one more thing.
const SEARCH_FROM = 8

/**
 * A plugin entry's `options`, as a form built from what the plugin says about them
 * (shared/pluginOptionSchema.ts, read by plugins.optionSchema in the main process). Not tied to
 * the plugins page: the layout builder shows the same form in its sidebar (P7 of 1.1).
 *
 * - a field shows its value, or the plugin's default where none is set; resetting removes the key
 * - a field whose condition (`x-quartz-when`) does not hold stays in its group, greyed, with the
 *   condition under it - the groups look the same whatever is chosen above them
 * - keys the config sets and no schema names stand under "unknown keys"; the free key/value row
 *   beside them only where the schema does not describe every option
 * - named groups fold, a group's rarely needed fields stand at its end; above SEARCH_FROM options
 *   a search field narrows the form to what matches, and the groups keep their titles
 *
 * `onChange` gets the whole new options object, or undefined when nothing is left - the caller
 * writes it in one place. Every editor below works on values, not paths, because the items of a
 * list have no object path to address.
 */
export default function PluginOptionsForm({
  schema,
  values,
  onChange,
  explicitEmpty = false,
  languages = [],
  projectPath,
  pick,
  freeKeys = true,
  root
}: {
  schema: NormalizedOptionSchema | null
  values: Record<string, unknown>
  onChange: (next: Record<string, unknown> | undefined) => void
  explicitEmpty?: boolean
  /** The site's language codes, for keys of a record such as layout-box's `byLang`. */
  languages?: string[]
  /** Turns on the editors that read and write files - the snippet picker and the image button. */
  projectPath?: string
  /** Only the options this accepts, for a caller that shows the rest elsewhere (the variant tiles
   *  of the navigations editor, the text tile of the box editor). Applied after the entry's own keys have
   *  joined the schema, so a set key that is picked away does not come back as "more keys". */
  pick?: (key: string) => boolean
  /** The free key/value row; off in the editors that know every option. Shown anyway only where
   *  the schema is incomplete - for a plugin whose options are all described it was one more row
   *  under every form, for keys nobody needs. */
  freeKeys?: boolean
  /** What an editor with tiles above the form adds on the top level (editors.tsx, RootExtras). */
  root?: RootExtras
}): JSX.Element {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'de'
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const ctx: FormContext = useMemo(
    () => ({ lang, explicitEmpty, languages, projectPath, query, entryReason: root?.entryReason }),
    [lang, explicitEmpty, languages, projectPath, query, root?.entryReason]
  )
  // The entry's own keys join the schema here, per entry: two instances of one plugin set
  // different keys, and a key no schema names is still shown (withPresentKeys).
  const merged = useMemo(() => {
    const all = withPresentKeys(schema ?? { source: 'defaults', fields: [], notes: [] }, values)
    return pick ? { ...all, fields: all.fields.filter((f) => pick(f.key)) } : all
  }, [schema, values, pick])
  const emit = (next: Record<string, unknown>): void => onChange(isEmptyObject(next) ? undefined : next)
  const noMatch = query !== '' && !merged.fields.some((f) => fieldMatch(f, query, lang) !== 'none')
  const incomplete = !schema || schema.source === 'defaults' || schema.notes.length > 0

  return (
    <div className="flex flex-col gap-3">
      {merged.fields.length >= SEARCH_FROM && (
        <div className="relative">
          <Search size={14} aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <TextInput
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('pluginOptions.searchPlaceholder')}
            aria-label={t('pluginOptions.searchPlaceholder')}
            className="w-full pl-8"
          />
        </div>
      )}
      {noMatch && <p className="text-micro text-text-muted">{t('pluginOptions.noMatch')}</p>}
      {schema?.source === 'defaults' && <p className="text-micro text-text-muted">{t('pluginOptions.fromDefaults')}</p>}
      {merged.fields.length === 0 && <p className="text-micro text-text-muted">{t('pluginOptions.none')}</p>}
      {/* What the reader could not read, counted rather than passed over: the field is then a JSON
          text or plain text, and the note says which and why - in the reader's own words, which are
          for whoever wrote the plugin's schema (fortieth review, finding 7). */}
      {schema && schema.notes.length > 0 && (
        <details className="text-micro text-text-muted">
          <summary className="cursor-pointer">{t('pluginOptions.notes', { count: schema.notes.length })}</summary>
          <ul className="mt-1 list-disc pl-5 font-mono">
            {schema.notes.map((note, i) => (
              <li key={i}>
                {note.path.length > 0 ? `${note.path.join('.')}: ` : ''}
                {note.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
      <ObjectBlock
        fields={merged.fields}
        values={values}
        onValue={emit}
        ctx={ctx}
        root={root}
        extra={freeKeys && incomplete ? <AddOptionRow existingKeys={Object.keys(values)} onAdd={(key, value) => emit({ ...values, [key]: value })} /> : undefined}
      />
    </div>
  )
}

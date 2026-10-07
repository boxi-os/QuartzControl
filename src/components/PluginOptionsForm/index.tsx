import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { NormalizedOptionSchema } from '@shared/ipc-contract'
import { withPresentKeys } from '@shared/pluginOptionSchema'
import { ObjectBlock, type FormContext } from './editors'
import { AddOptionRow } from './AddOptionRow'
import { isEmptyObject } from './text'

/**
 * A plugin entry's `options`, as a form built from what the plugin says about them
 * (shared/pluginOptionSchema.ts, read by plugins.optionSchema in the main process). Not tied to
 * the plugins page: the layout builder shows the same form in its sidebar (P7 of 1.1).
 *
 * - a field shows its value, or the plugin's default where none is set; resetting removes the key
 * - a field whose condition (`x-quartz-when`) does not hold is hidden, unless it is set - then it
 *   stands under "has no effect with this setting", so no value is lost from sight
 * - keys the config sets and no schema names stand under "more keys", beside a free key/value row
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
  languages = []
}: {
  schema: NormalizedOptionSchema | null
  values: Record<string, unknown>
  onChange: (next: Record<string, unknown> | undefined) => void
  explicitEmpty?: boolean
  /** The site's language codes, for keys of a record such as layout-box's `byLang`. */
  languages?: string[]
}): JSX.Element {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'de'
  const ctx: FormContext = useMemo(() => ({ lang, explicitEmpty, languages }), [lang, explicitEmpty, languages])
  // The entry's own keys join the schema here, per entry: two instances of one plugin set
  // different keys, and a key no schema names is still shown (withPresentKeys).
  const merged = useMemo(() => withPresentKeys(schema ?? { source: 'defaults', fields: [], notes: [] }, values), [schema, values])
  const emit = (next: Record<string, unknown>): void => onChange(isEmptyObject(next) ? undefined : next)

  return (
    <div className="flex flex-col gap-3">
      {schema?.source === 'defaults' && <p className="text-micro text-text-muted">{t('pluginOptions.fromDefaults')}</p>}
      {merged.fields.length === 0 && <p className="text-micro text-text-muted">{t('pluginOptions.none')}</p>}
      <ObjectBlock
        fields={merged.fields}
        values={values}
        onValue={emit}
        ctx={ctx}
        extra={<AddOptionRow existingKeys={Object.keys(values)} onAdd={(key, value) => emit({ ...values, [key]: value })} />}
      />
    </div>
  )
}

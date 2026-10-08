import { useTranslation } from 'react-i18next'
import type { PluginEntry } from '@shared/ipc-contract'
import { FieldGroup } from '../../components/ui'
import PluginOptionsForm from '../../components/PluginOptionsForm'
import type { PluginOptionSchemaResult } from '@shared/ipc-contract'

/**
 * The selected component's own options in the side panel - the same form the plugins page shows,
 * but writing into the board's config draft instead of the file: the header's Save writes it along
 * with every move on the stage, and `dirty` sees it because it compares the whole config.
 *
 * The schema comes from the panel (Inspector), which reads it per source through useIpcQuery's
 * guard and needs its categories itself; nothing is shown while it runs, because the hook keeps the
 * previous component's answer until the new one lands.
 */
export default function ComponentOptions({
  projectPath,
  plugin,
  languages,
  schemaQuery: { data, loading, error },
  onChange
}: {
  projectPath: string
  plugin: PluginEntry
  languages: string[]
  schemaQuery: { data: PluginOptionSchemaResult | null; loading: boolean; error: string | null }
  onChange: (next: Record<string, unknown> | undefined) => void
}): JSX.Element {
  const { t } = useTranslation()

  return (
    <FieldGroup label={t('layoutEditor.inspector.options')} className="gap-2">
      {loading ? (
        <p className="text-micro text-text-muted">{t('layoutEditor.inspector.optionsLoading')}</p>
      ) : error || !data ? (
        <p className="text-micro text-red-600 dark:text-red-400">{t('layoutEditor.inspector.optionsError', { reason: error ?? '' })}</p>
      ) : (
        <>
          {data.unreadable && (
            <p className="text-micro text-amber-700 dark:text-amber-300">{t('pluginOptions.unreadable', { reason: data.unreadable })}</p>
          )}
          <PluginOptionsForm
            schema={data.schema}
            values={plugin.options ?? {}}
            onChange={onChange}
            explicitEmpty
            languages={languages}
            projectPath={projectPath}
          />
        </>
      )}
    </FieldGroup>
  )
}

import { useTranslation } from 'react-i18next'
import type { PluginEntry } from '@shared/ipc-contract'
import { FieldGroup } from '../../components/ui'
import PluginOptionsForm from '../../components/PluginOptionsForm'
import { useIpcQuery } from '../../state/useIpcQuery'

/**
 * The selected component's own options in the side panel - the same form the plugins page shows,
 * but writing into the board's config draft instead of the file: the header's Save writes it along
 * with every move on the stage, and `dirty` sees it because it compares the whole config.
 *
 * The schema is read per source, and the source changes with every click on another chip, so the
 * read goes through useIpcQuery's guard - and nothing is shown while it runs, because the hook
 * keeps the previous component's answer until the new one lands.
 */
export default function ComponentOptions({
  projectPath,
  plugin,
  languages,
  onChange
}: {
  projectPath: string
  plugin: PluginEntry
  languages: string[]
  onChange: (next: Record<string, unknown> | undefined) => void
}): JSX.Element {
  const { t } = useTranslation()
  const sourceKey = JSON.stringify(plugin.source)
  const { data, loading, error } = useIpcQuery(
    () => window.quartzGui.plugins.optionSchema({ projectPath, source: plugin.source }),
    [projectPath, sourceKey]
  )

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

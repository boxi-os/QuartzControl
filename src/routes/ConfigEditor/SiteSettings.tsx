import { useTranslation } from 'react-i18next'
import type { QuartzConfig } from '@shared/ipc-contract'
import { Field, TextInput, Toggle } from '../../components/ui'

type Configuration = QuartzConfig['configuration']

export default function SiteSettings({
  configuration,
  onChange
}: {
  configuration: Configuration
  onChange: (next: Configuration) => void
}): JSX.Element {
  const { t } = useTranslation()
  function set(key: string, value: unknown): void {
    onChange({ ...configuration, [key]: value })
  }

  return (
    <div className="grid max-w-xl gap-4">
      <Field label={t('siteSettings.pageTitle')}>
        <TextInput value={configuration.pageTitle ?? ''} onChange={(e) => set('pageTitle', e.target.value)} />
      </Field>
      <Field label={t('siteSettings.pageTitleSuffix')}>
        <TextInput value={configuration.pageTitleSuffix ?? ''} onChange={(e) => set('pageTitleSuffix', e.target.value)} />
      </Field>
      <Field label={t('siteSettings.baseUrl')}>
        <TextInput
          value={configuration.baseUrl ?? ''}
          onChange={(e) => set('baseUrl', e.target.value)}
          placeholder="example.com"
        />
      </Field>
      <Field label={t('siteSettings.locale')}>
        <TextInput value={configuration.locale ?? ''} onChange={(e) => set('locale', e.target.value)} placeholder="en-US" />
      </Field>
      <div className="flex gap-6">
        <Toggle
          label={t('siteSettings.spa')}
          checked={configuration.enableSPA ?? false}
          onChange={(checked) => set('enableSPA', checked)}
        />
        <Toggle
          label={t('siteSettings.popovers')}
          checked={configuration.enablePopovers ?? false}
          onChange={(checked) => set('enablePopovers', checked)}
        />
      </div>
      <Field label={t('siteSettings.ignorePatterns')}>
        <textarea
          className="min-h-32 rounded-[7px] border border-black/10 bg-white px-2.5 py-1.5 font-mono text-[13px] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          value={(configuration.ignorePatterns ?? []).join('\n')}
          onChange={(e) =>
            set(
              'ignorePatterns',
              e.target.value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
            )
          }
        />
      </Field>
    </div>
  )
}

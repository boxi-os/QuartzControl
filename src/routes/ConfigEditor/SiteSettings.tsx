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
  function set(key: string, value: unknown): void {
    onChange({ ...configuration, [key]: value })
  }

  return (
    <div className="grid max-w-xl gap-4">
      <Field label="Seitentitel">
        <TextInput value={configuration.pageTitle ?? ''} onChange={(e) => set('pageTitle', e.target.value)} />
      </Field>
      <Field label="Titel-Suffix (nur Browser-Tab)">
        <TextInput value={configuration.pageTitleSuffix ?? ''} onChange={(e) => set('pageTitleSuffix', e.target.value)} />
      </Field>
      <Field label="Base URL">
        <TextInput
          value={configuration.baseUrl ?? ''}
          onChange={(e) => set('baseUrl', e.target.value)}
          placeholder="example.com"
        />
      </Field>
      <Field label="Locale">
        <TextInput value={configuration.locale ?? ''} onChange={(e) => set('locale', e.target.value)} placeholder="en-US" />
      </Field>
      <div className="flex gap-6">
        <Toggle
          label="Single-Page-App-Routing"
          checked={configuration.enableSPA ?? false}
          onChange={(checked) => set('enableSPA', checked)}
        />
        <Toggle
          label="Popover-Vorschauen"
          checked={configuration.enablePopovers ?? false}
          onChange={(checked) => set('enablePopovers', checked)}
        />
      </div>
      <Field label="Ignore-Patterns (eine Zeile pro Muster)">
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

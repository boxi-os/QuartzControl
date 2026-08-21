import type { QuartzConfig } from '@shared/ipc-contract'
import { Checkbox, Field, TextInput } from '../../components/ui'

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
        <Checkbox
          label="Single-Page-App-Routing"
          checked={configuration.enableSPA ?? false}
          onChange={(e) => set('enableSPA', e.target.checked)}
        />
        <Checkbox
          label="Popover-Vorschauen"
          checked={configuration.enablePopovers ?? false}
          onChange={(e) => set('enablePopovers', e.target.checked)}
        />
      </div>
      <Field label="Ignore-Patterns (eine Zeile pro Muster)">
        <textarea
          className="min-h-32 rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-sm focus:border-slate-500 focus:outline-none"
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

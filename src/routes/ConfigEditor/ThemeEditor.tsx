import type { QuartzConfig } from '@shared/ipc-contract'
import { Field, Select, TextInput } from '../../components/ui'

type Theme = QuartzConfig['theme']
const TYPOGRAPHY_KEYS = ['header', 'body', 'code'] as const

export default function ThemeEditor({ theme, onChange }: { theme: Theme; onChange: (next: Theme) => void }): JSX.Element {
  function set(key: string, value: unknown): void {
    onChange({ ...theme, [key]: value })
  }

  function setTypography(key: string, value: string): void {
    onChange({ ...theme, typography: { ...(theme.typography ?? {}), [key]: value } })
  }

  return (
    <div className="grid max-w-xl gap-6">
      <div className="grid gap-4">
        <Field label="Font-Quelle">
          <Select value={(theme.fontOrigin as string) ?? 'googleFonts'} onChange={(e) => set('fontOrigin', e.target.value)}>
            <option value="googleFonts">Google Fonts</option>
            <option value="local">Lokal</option>
          </Select>
        </Field>
        {TYPOGRAPHY_KEYS.map((key) => (
          <Field key={key} label={`Schriftart (${key})`}>
            <TextInput value={theme.typography?.[key] ?? ''} onChange={(e) => setTypography(key, e.target.value)} />
          </Field>
        ))}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Farben</h3>
        <ColorGroup
          value={(theme.colors as Record<string, unknown>) ?? {}}
          onChange={(colors) => set('colors', colors)}
        />
      </div>
    </div>
  )
}

// Renders nested color palettes (e.g. per light/dark mode) without assuming a fixed schema depth,
// since the exact quartz.config.yaml colors shape wasn't confirmed from the docs.
function ColorGroup({
  value,
  onChange
}: {
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      {Object.entries(value).map(([key, v]) => {
        if (typeof v === 'string') {
          const hex = /^#([0-9a-f]{3}){1,2}$/i.test(v) ? v : '#ffffff'
          return (
            <div key={key} className="flex items-center gap-3">
              <input
                type="color"
                value={hex}
                onChange={(e) => onChange({ ...value, [key]: e.target.value })}
                className="h-8 w-8 cursor-pointer rounded border border-slate-300"
              />
              <span className="w-32 text-sm text-slate-600">{key}</span>
              <TextInput value={v} onChange={(e) => onChange({ ...value, [key]: e.target.value })} className="w-40" />
            </div>
          )
        }
        if (v && typeof v === 'object') {
          return (
            <div key={key} className="rounded-md border border-slate-200 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{key}</p>
              <ColorGroup value={v as Record<string, unknown>} onChange={(next) => onChange({ ...value, [key]: next })} />
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { QuartzConfig } from '@shared/ipc-contract'
import { Button, Field, Select, TextInput } from '../../components/ui'
import { CURATED_GOOGLE_FONTS } from '../../data/googleFonts'
import { useStyles } from './index'

type Theme = QuartzConfig['theme']
const TYPOGRAPHY_KEYS = ['header', 'body', 'code'] as const
const GOOGLE_FONTS_DATALIST_ID = 'quartz-gui-google-fonts'

// The bottom layer of the cascade: the 9 classic colors and 3 font slots Quartz writes straight
// into :root (quartz/util/theme.ts::joinStyles) - everything the other three tabs do sits on top of
// this. Lived under "Konfiguration -> Theme" before; the config tab now only points here, so this
// is the single place these values are edited.
export default function Basics(): JSX.Element {
  const { t } = useTranslation()
  const { config, setConfig, saveConfig, registerSave, goToTab, reloadScss, project } = useStyles()
  const theme = config.theme

  useEffect(() => registerSave(saveConfig))

  function onChange(next: Theme): void {
    setConfig({ ...config, theme: next })
  }

  function set(key: string, value: unknown): void {
    onChange({ ...theme, [key]: value })
  }

  function setTypography(key: string, value: string): void {
    onChange({ ...theme, typography: { ...(theme.typography ?? {}), [key]: value } })
  }

  // Matches regardless of which theme is picked - the warning is about the plugin overriding these
  // colors at all, and the Theme tab is one click away rather than a separate page now.
  const overridingPlugin = config.plugins.find(
    (p) => p.enabled && typeof p.source === 'string' && p.source.startsWith('@quartz-themes/')
  )
  const fontOrigin = (theme.fontOrigin as string) ?? 'googleFonts'

  return (
    <div className="grid max-w-xl gap-6">
      {overridingPlugin && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {t('themeEditor.overrideWarningPrefix')}
          <code className="font-mono">{String(overridingPlugin.source)}</code>
          {t('themeEditor.overrideWarningSuffix')}{' '}
          <button type="button" className="underline" onClick={() => goToTab('theme')}>
            {t('themeEditor.goToThemeTab')}
          </button>
        </p>
      )}
      <div className="grid gap-4">
        <Field label={t('themeEditor.fontSource')}>
          <Select value={fontOrigin} onChange={(e) => set('fontOrigin', e.target.value)}>
            <option value="googleFonts">{t('themeEditor.googleFonts')}</option>
            <option value="local">{t('themeEditor.local')}</option>
          </Select>
        </Field>
        {fontOrigin === 'googleFonts' && (
          <p className="rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
            {t('themeEditor.gdprHint')}
          </p>
        )}
        <datalist id={GOOGLE_FONTS_DATALIST_ID}>
          {CURATED_GOOGLE_FONTS.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        {TYPOGRAPHY_KEYS.map((key) => (
          <Field key={key} label={t('themeEditor.fontFor', { slot: key })}>
            <TextInput
              list={GOOGLE_FONTS_DATALIST_ID}
              value={theme.typography?.[key] ?? ''}
              onChange={(e) => setTypography(key, e.target.value)}
            />
          </Field>
        ))}
      </div>

      <LocalFontImport
        projectPath={project.path}
        onImported={(family, slot) => {
          if (slot) setTypography(slot, family)
          // The import wrote an @font-face block into custom.scss - pull that change into the
          // draft the "Eigenes CSS" tab edits, or its next save would undo it.
          void reloadScss()
        }}
      />

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('themeEditor.colors')}</h3>
        <ColorGroup value={(theme.colors as Record<string, unknown>) ?? {}} onChange={(colors) => set('colors', colors)} />
      </div>
    </div>
  )
}

function LocalFontImport({
  projectPath,
  onImported
}: {
  projectPath: string
  onImported: (family: string, slot: (typeof TYPOGRAPHY_KEYS)[number] | '') => void
}): JSX.Element {
  const { t } = useTranslation()
  const [pendingPath, setPendingPath] = useState<string | null>(null)
  const [family, setFamily] = useState('')
  const [slot, setSlot] = useState<(typeof TYPOGRAPHY_KEYS)[number] | ''>('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function pickFile(): Promise<void> {
    setMessage(null)
    const picked = await window.quartzGui.dialog.pickFile([{ name: 'Fonts', extensions: ['ttf', 'otf', 'woff', 'woff2'] }])
    if (!picked) return
    const base = picked.split(/[/\\]/).pop() ?? picked
    const suggested = base
      .replace(/\.(ttf|otf|woff2?|)$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim()
    setPendingPath(picked)
    setFamily(suggested)
  }

  async function confirmImport(): Promise<void> {
    if (!pendingPath || !family.trim()) return
    setBusy(true)
    setMessage(null)
    try {
      await window.quartzGui.fonts.importFile(projectPath, pendingPath, family.trim())
      onImported(family.trim(), slot)
      setMessage(t('themeEditor.fontImportSuccess', { family: family.trim() }))
      setPendingPath(null)
      setFamily('')
      setSlot('')
    } catch (err) {
      setMessage(String(err))
    }
    setBusy(false)
  }

  return (
    <div className="rounded-md border border-black/[0.06] p-3 dark:border-white/10">
      <h3 className="mb-1 text-sm font-semibold">{t('themeEditor.localFontHeading')}</h3>
      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{t('themeEditor.localFontDescription')}</p>
      {!pendingPath && (
        <Button variant="ghost" onClick={pickFile}>
          {t('themeEditor.localFontPick')}
        </Button>
      )}
      {pendingPath && (
        <div className="flex flex-wrap items-end gap-2">
          <Field label={t('themeEditor.localFontFamily')}>
            <TextInput value={family} onChange={(e) => setFamily(e.target.value)} className="w-48" />
          </Field>
          <Field label={t('themeEditor.localFontSlot')}>
            <Select value={slot} onChange={(e) => setSlot(e.target.value as typeof slot)} className="w-40">
              <option value="">{t('themeEditor.localFontNoSlot')}</option>
              {TYPOGRAPHY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t('themeEditor.fontFor', { slot: key })}
                </option>
              ))}
            </Select>
          </Field>
          <Button onClick={confirmImport} disabled={busy || !family.trim()}>
            {busy ? t('common.saving') : t('themeEditor.localFontConfirm')}
          </Button>
          <Button variant="ghost" onClick={() => setPendingPath(null)}>
            {t('common.cancel')}
          </Button>
        </div>
      )}
      {message && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{message}</p>}
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
              <span className="w-32 text-sm text-slate-600 dark:text-slate-300">{key}</span>
              <TextInput value={v} onChange={(e) => onChange({ ...value, [key]: e.target.value })} className="w-40" />
            </div>
          )
        }
        if (v && typeof v === 'object') {
          return (
            <div key={key} className="rounded-md border border-slate-200 p-3 dark:border-white/10">
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

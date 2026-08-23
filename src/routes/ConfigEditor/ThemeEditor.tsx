import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { CssVariableOverride, PluginEntry, QuartzConfig } from '@shared/ipc-contract'
import { Button, Field, Select, TextInput } from '../../components/ui'
import { CURATED_GOOGLE_FONTS } from '../../data/googleFonts'
import { CSS_VARIABLES, defaultValueFor, type CssVariableDef } from '../../data/cssVariables'

type Theme = QuartzConfig['theme']
const TYPOGRAPHY_KEYS = ['header', 'body', 'code'] as const
const GOOGLE_FONTS_DATALIST_ID = 'quartz-gui-google-fonts'

// @quartz-themes/* (e.g. @quartz-themes/core) is a third-party Obsidian-style theming engine,
// separate from Quartz's built-in configuration.theme.colors, that can override these colors in
// the rendered site. Full management (install, style-settings, presets) lives on the dedicated
// Themes page - this is just a pointer so editing colors here doesn't look silently broken.
function findOverridingThemePlugin(plugins: PluginEntry[]): PluginEntry | undefined {
  return plugins.find((p) => p.enabled && typeof p.source === 'string' && p.source.startsWith('@quartz-themes/'))
}

export default function ThemeEditor({
  theme,
  plugins,
  projectPath,
  onChange
}: {
  theme: Theme
  plugins: PluginEntry[]
  projectPath: string
  onChange: (next: Theme) => void
}): JSX.Element {
  const { t } = useTranslation()
  function set(key: string, value: unknown): void {
    onChange({ ...theme, [key]: value })
  }

  function setTypography(key: string, value: string): void {
    onChange({ ...theme, typography: { ...(theme.typography ?? {}), [key]: value } })
  }

  const overridingPlugin = findOverridingThemePlugin(plugins)
  const fontOrigin = (theme.fontOrigin as string) ?? 'googleFonts'

  return (
    <div className="grid max-w-xl gap-6">
      {overridingPlugin && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {t('themeEditor.overrideWarningPrefix')}
          <code className="font-mono">{String(overridingPlugin.source)}</code>
          {t('themeEditor.overrideWarningSuffix')}{' '}
          <Link to="../themes" className="underline">
            {t('themeEditor.goToThemes')}
          </Link>
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
        projectPath={projectPath}
        onImported={(family, slot) => {
          if (slot) setTypography(slot, family)
        }}
      />

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">{t('themeEditor.colors')}</h3>
        <ColorGroup
          value={(theme.colors as Record<string, unknown>) ?? {}}
          onChange={(colors) => set('colors', colors)}
        />
      </div>

      <CssVariablesEditor projectPath={projectPath} theme={theme} />
    </div>
  )
}

function CssVariablesEditor({ projectPath, theme }: { projectPath: string; theme: Theme }): JSX.Element {
  const { t } = useTranslation()
  const colors = (theme.colors as { lightMode?: Record<string, string>; darkMode?: Record<string, string> }) ?? {}
  const typography = theme.typography as Record<string, string> | undefined

  const [overrides, setOverrides] = useState<Record<string, { light: string; dark: string }>>({})
  const [extraKeys, setExtraKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    window.quartzGui.styles.getVariableOverrides(projectPath).then((list) => {
      if (cancelled) return
      const knownKeys = new Set(CSS_VARIABLES.map((v) => v.key))
      const next: Record<string, { light: string; dark: string }> = {}
      const extras: string[] = []
      for (const o of list) {
        next[o.key] = { light: o.light, dark: o.dark ?? o.light }
        if (!knownKeys.has(o.key)) extras.push(o.key)
      }
      setOverrides(next)
      setExtraKeys(extras)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [projectPath])

  const allDefs: CssVariableDef[] = [
    ...CSS_VARIABLES,
    ...extraKeys.map((key) => ({ key, group: t('themeEditor.cssVars.discoveredGroup'), kind: 'font' as const }))
  ]

  function toggle(def: CssVariableDef, enabled: boolean): void {
    setOverrides((prev) => {
      const next = { ...prev }
      if (enabled) {
        next[def.key] = {
          light: defaultValueFor(def, colors, typography, 'light'),
          dark: defaultValueFor(def, colors, typography, 'dark')
        }
      } else {
        delete next[def.key]
      }
      return next
    })
  }

  function setValue(key: string, mode: 'light' | 'dark', value: string): void {
    setOverrides((prev) => ({ ...prev, [key]: { ...prev[key], [mode]: value } }))
  }

  async function scanBuildOutput(): Promise<void> {
    setScanning(true)
    setMessage(null)
    try {
      const found = await window.quartzGui.styles.scanBuildOutputVariables(projectPath)
      const knownKeys = new Set(CSS_VARIABLES.map((v) => v.key))
      const newOnes = found.filter((k) => !knownKeys.has(k) && !extraKeys.includes(k))
      setMessage(newOnes.length === 0 ? t('themeEditor.cssVars.scanNoneFound') : t('themeEditor.cssVars.scanFound', { count: newOnes.length }))
      if (newOnes.length > 0) setExtraKeys((prev) => [...prev, ...newOnes])
    } catch (err) {
      setMessage(String(err))
    }
    setScanning(false)
  }

  async function save(): Promise<void> {
    setSaving(true)
    setMessage(null)
    try {
      const list: CssVariableOverride[] = Object.entries(overrides).map(([key, v]) => ({ key, light: v.light, dark: v.dark }))
      await window.quartzGui.styles.saveVariableOverrides(projectPath, list)
      setMessage(t('themeEditor.cssVars.saved'))
    } catch (err) {
      setMessage(String(err))
    }
    setSaving(false)
  }

  if (loading) return <p className="text-xs text-slate-500">{t('common.loading')}</p>

  const grouped = new Map<string, CssVariableDef[]>()
  for (const def of allDefs) {
    const list = grouped.get(def.group) ?? []
    list.push(def)
    grouped.set(def.group, list)
  }

  return (
    <div className="rounded-md border border-black/[0.06] p-3 dark:border-white/10">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t('themeEditor.cssVars.heading')}</h3>
        <Button variant="ghost" onClick={scanBuildOutput} disabled={scanning}>
          {scanning ? t('common.loading') : t('themeEditor.cssVars.scanButton')}
        </Button>
      </div>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('themeEditor.cssVars.description')}</p>
      <div className="flex flex-col gap-4">
        {Array.from(grouped.entries()).map(([group, defs]) => (
          <div key={group}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</p>
            <div className="flex flex-col gap-2">
              {defs.map((def) => {
                const active = def.key in overrides
                const value = overrides[def.key]
                return (
                  <div key={def.key} className="flex flex-wrap items-center gap-2">
                    <label className="flex w-56 items-center gap-2 text-xs">
                      <input type="checkbox" checked={active} onChange={(e) => toggle(def, e.target.checked)} />
                      <code className="font-mono">--{def.key}</code>
                    </label>
                    {active && value && (
                      <>
                        <CssVarValueInput
                          kind={def.kind}
                          label={t('themeEditor.cssVars.light')}
                          value={value.light}
                          onChange={(v) => setValue(def.key, 'light', v)}
                        />
                        <CssVarValueInput
                          kind={def.kind}
                          label={t('themeEditor.cssVars.dark')}
                          value={value.dark}
                          onChange={(v) => setValue(def.key, 'dark', v)}
                        />
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? t('common.saving') : t('common.save')}
        </Button>
        {message && <p className="text-xs text-slate-600 dark:text-slate-300">{message}</p>}
      </div>
    </div>
  )
}

function CssVarValueInput({
  kind,
  label,
  value,
  onChange
}: {
  kind: CssVariableDef['kind']
  label: string
  value: string
  onChange: (value: string) => void
}): JSX.Element {
  const isValidHex = /^#([0-9a-f]{3}){1,2}$/i.test(value)
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-slate-500">{label}</span>
      {kind === 'color' && (
        <input
          type="color"
          value={isValidHex ? value : '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-6 cursor-pointer rounded border border-slate-300"
        />
      )}
      <TextInput value={value} onChange={(e) => onChange(e.target.value)} className="w-32" />
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

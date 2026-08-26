import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { QuartzConfig } from '@shared/ipc-contract'
import { Button, Field, Select, TextInput, Toggle } from '../../components/ui'
import { CURATED_GOOGLE_FONTS } from '../../data/googleFonts'
import { formatIpcError } from '../../components/ErrorSurface'
import { CSS_FIXES, type CssFix } from './cssFixes'
import {
  callsGoogle,
  fontLoaders,
  themeFontsEnabled,
  withSelfHostedFonts,
  withThemeFonts,
  THEME_PLUGIN_PREFIX
} from './fontDelivery'
import { activeThemeIdOf, useStyles } from './index'

type Theme = QuartzConfig['theme']
const TYPOGRAPHY_KEYS = ['header', 'body', 'code'] as const
const GOOGLE_FONTS_DATALIST_ID = 'quartz-gui-google-fonts'

// The bottom layer of the cascade: the 9 classic colors and 3 font slots Quartz writes straight
// into :root (quartz/util/theme.ts::joinStyles) - everything the other three tabs do sits on top of
// this. Lived under "Konfiguration -> Theme" before; the config tab now only points here, so this
// is the single place these values are edited.
export default function Basics(): JSX.Element {
  const { t } = useTranslation()
  const { config, setConfig, saveConfig, registerSave, goToTab, reloadScss, project, graph, graphLoading } = useStyles()
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

  // Which of these values the active theme actually takes over, asked per variable rather than
  // assumed for all of them. The answer comes from the installed theme's own :root block (see
  // variableGraphService), so it is right for *this* theme - a theme that declares no
  // --textHighlight leaves that field working, and greying it out would be a lie. Nothing is
  // disabled either way: setting a base value while a theme is on is how you prepare for turning
  // the theme off again.
  const overriddenByTheme = (cssVariable: string): boolean => graph?.vars[cssVariable]?.origin === 'theme'
  const colorKeys = Object.values((theme.colors as Record<string, Record<string, string>>) ?? {}).flatMap((palette) =>
    typeof palette === 'object' && palette ? Object.keys(palette) : []
  )
  const uniqueColorKeys = Array.from(new Set(colorKeys))
  const overriddenColors = uniqueColorKeys.filter(overriddenByTheme).length
  const FONT_VARIABLE: Record<(typeof TYPOGRAPHY_KEYS)[number], string> = {
    header: 'headerFont',
    body: 'bodyFont',
    code: 'codeFont'
  }
  const overriddenFonts = TYPOGRAPHY_KEYS.filter((key) => overriddenByTheme(FONT_VARIABLE[key])).length

  return (
    <div className="grid gap-6">
      {overridingPlugin && (
        <p className="max-w-4xl rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {graphLoading
            ? t('themeEditor.overrideChecking')
            : t('themeEditor.overrideCounted', {
                themeId: activeThemeIdOf(config) ?? String(overridingPlugin.source),
                colors: overriddenColors,
                totalColors: uniqueColorKeys.length,
                fonts: overriddenFonts,
                totalFonts: TYPOGRAPHY_KEYS.length
              })}{' '}
          {t('themeEditor.overrideStillEditable')}{' '}
          <button type="button" className="underline" onClick={() => goToTab('theme')}>
            {t('themeEditor.goToThemeTab')}
          </button>
        </p>
      )}
      {/* Same rule as the site settings form: width buys columns, not longer input boxes. */}
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <Field label={t('themeEditor.fontSource')}>
          <Select value={fontOrigin} onChange={(e) => set('fontOrigin', e.target.value)}>
            <option value="googleFonts">{t('themeEditor.googleFonts')}</option>
            <option value="local">{t('themeEditor.local')}</option>
          </Select>
          {/* The single most misread setting on this page: "local" does not mean "download and
              serve locally", it means Quartz fetches nothing at all. Whether the fetched fonts are
              self-hosted is the separate switch below. */}
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {fontOrigin === 'local' ? t('themeEditor.localHint') : t('themeEditor.googleFontsHint')}
          </span>
        </Field>

        <datalist id={GOOGLE_FONTS_DATALIST_ID}>
          {CURATED_GOOGLE_FONTS.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        {TYPOGRAPHY_KEYS.map((key) => {
          const overridden = overriddenByTheme(FONT_VARIABLE[key])
          return (
            <Field key={key} label={t('themeEditor.fontFor', { slot: key })} className={overridden ? 'opacity-60' : ''}>
              <TextInput
                list={GOOGLE_FONTS_DATALIST_ID}
                value={theme.typography?.[key] ?? ''}
                onChange={(e) => setTypography(key, e.target.value)}
              />
              {overridden && (
                <span className="text-[11px] text-amber-700 dark:text-amber-400">{t('themeEditor.overriddenByTheme')}</span>
              )}
            </Field>
          )
        })}
      </div>

      <FontDelivery config={config} onChange={setConfig} />

      <CssFixes />

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
        <ColorGroup
          value={(theme.colors as Record<string, unknown>) ?? {}}
          onChange={(colors) => set('colors', colors)}
          isOverridden={overriddenByTheme}
        />
      </div>
    </div>
  )
}

// "Woher kommen die Schriften" is one question for the user but two settings underneath: Quartz'
// own cdnCaching and, if the Fonts plugin is installed, its own fontOrigin - which defaults to
// Google, so a project can be calling Google while the theme's font source says "local". Both are
// reported and both are flipped together; see fontDelivery.ts for what each one does.
function FontDelivery({
  config,
  onChange
}: {
  config: QuartzConfig
  onChange: (next: QuartzConfig) => void
}): JSX.Element {
  const { t } = useTranslation()
  const loaders = fontLoaders(config)
  const google = callsGoogle(config)
  const themeFonts = themeFontsEnabled(config)
  const hasTheme = config.plugins.some(
    (p) => p.enabled && typeof p.source === 'string' && p.source.startsWith(THEME_PLUGIN_PREFIX)
  )
  const baseUrl = (config.configuration.baseUrl as string) ?? ''

  return (
    <div className="rounded-md border border-black/[0.06] p-3 dark:border-white/10">
      <h3 className="mb-1 text-sm font-semibold">{t('themeEditor.delivery.heading')}</h3>
      <div className="mb-2 flex flex-col gap-0.5 text-xs">
        {loaders.length === 0 && <p className="text-slate-500 dark:text-slate-400">{t('styleEditor.current.noLoader')}</p>}
        {loaders.map((loader) => (
          <p
            key={`${loader.via}-${loader.mode}`}
            className={loader.mode === 'google' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}
          >
            {t(`themeEditor.delivery.state.${loader.via}.${loader.mode}`)}
          </p>
        ))}
      </div>
      <Toggle
        label={t('themeEditor.delivery.selfHost')}
        checked={loaders.some((l) => l.mode === 'selfHosted') && !google}
        onChange={(checked) => onChange(withSelfHostedFonts(config, checked))}
      />
      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{t('themeEditor.delivery.description')}</p>

      {/* Its own control, not part of the switch above: there is no option to serve the theme's
          fonts locally, so the only way to stop the CDN requests is to drop them - which changes
          how the site looks. That is a different decision. */}
      {themeFonts && (
        <div className="mt-3 border-t border-black/[0.06] pt-3 dark:border-white/10">
          <Toggle
            label={t('themeEditor.delivery.themeFonts')}
            checked
            onChange={() => onChange(withThemeFonts(config, false))}
          />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{t('themeEditor.delivery.themeFontsHint')}</p>
        </div>
      )}
      {!themeFonts && hasTheme && (
        <div className="mt-3 border-t border-black/[0.06] pt-3 dark:border-white/10">
          <Toggle
            label={t('themeEditor.delivery.themeFonts')}
            checked={false}
            onChange={() => onChange(withThemeFonts(config, true))}
          />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{t('themeEditor.delivery.themeFontsOff')}</p>
        </div>
      )}
      {/* Both self-hosting paths rewrite the font URLs to <baseUrl>/static/fonts, and the plugin
          throws outright without one - so an empty baseUrl is a build failure, not a detail. */}
      {!google && loaders.length > 0 && !baseUrl && (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{t('themeEditor.delivery.baseUrlMissing')}</p>
      )}
    </div>
  )
}

// Offers the ready-made stylesheets from cssFixes.ts, and only for the conflicts this project
// actually has. Nothing is written until the button is pressed: the fix lands as an ordinary file
// under quartz/styles/custom/, which the Eigenes-CSS tab then owns like any other stylesheet.
function CssFixes(): JSX.Element | null {
  const { t } = useTranslation()
  const { project, config, fileSet, reloadFiles, reloadScss, goToTab } = useStyles()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const applicable = CSS_FIXES.filter((fix) => fix.appliesTo(config))
  if (applicable.length === 0) return null

  async function addFix(fix: CssFix): Promise<void> {
    setBusy(fix.id)
    setError(null)
    try {
      const created = await window.quartzGui.styles.createFile(project.path, fix.fileName)
      await window.quartzGui.styles.saveFile(project.path, created.relativePath, fix.content(t))
      await reloadFiles()
      // createFile rewrote custom.scss's import block - the CSS tab's draft has to be re-read, or
      // its next save would put the pre-change file back.
      await reloadScss()
      goToTab('customCss')
    } catch (err) {
      setError(formatIpcError(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-md border border-black/[0.06] p-3 dark:border-white/10">
      <h3 className="mb-1 text-sm font-semibold">{t('styles.fixes.heading')}</h3>
      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{t('styles.fixes.description')}</p>
      <div className="flex flex-col gap-2">
        {applicable.map((fix) => {
          const existing = fileSet?.files.find((f) => f.name === fix.fileName)
          return (
            <div key={fix.id} className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">{t(`styles.fixes.${fix.id}.title`)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t(`styles.fixes.${fix.id}.summary`)}</p>
              </div>
              {existing ? (
                <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {t('styles.fixes.alreadyAdded', { file: existing.name })}
                  <button type="button" className="underline" onClick={() => goToTab('customCss')}>
                    {t('styles.fixes.open')}
                  </button>
                </span>
              ) : (
                <Button variant="ghost" className="shrink-0" disabled={busy === fix.id} onClick={() => addFix(fix)}>
                  {busy === fix.id ? t('common.saving') : t('styles.fixes.add')}
                </Button>
              )}
            </div>
          )
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
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
//
// Two levels, laid out differently on purpose: the mode palettes (lightMode/darkMode) sit *under*
// each other, so each one gets the full width for its own multi-column grid of colors - side by
// side they left every color cell half as wide, which is what squeezed the swatch to a sliver and
// made the fixed-width name and hex field collide on a narrow window. Nothing inside a cell has a
// fixed width any more except the swatch itself.
function ColorGroup({
  value,
  onChange,
  isOverridden
}: {
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
  isOverridden: (key: string) => boolean
}): JSX.Element {
  const entries = Object.entries(value)
  const nested = entries.filter(([, v]) => v !== null && typeof v === 'object')
  const leaves = entries.filter(([, v]) => typeof v === 'string') as [string, string][]

  return (
    <div className="flex flex-col gap-4">
      {leaves.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
          {leaves.map(([key, v]) => (
            <ColorCell
              key={key}
              name={key}
              value={v}
              overridden={isOverridden(key)}
              onChange={(next) => onChange({ ...value, [key]: next })}
            />
          ))}
        </div>
      )}
      {nested.map(([key, v]) => (
        <div key={key} className="rounded-md border border-slate-200 p-3 dark:border-white/10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{key}</p>
          <ColorGroup
            value={v as Record<string, unknown>}
            onChange={(next) => onChange({ ...value, [key]: next })}
            isOverridden={isOverridden}
          />
        </div>
      ))}
    </div>
  )
}

function ColorCell({
  name,
  value,
  overridden,
  onChange
}: {
  name: string
  value: string
  overridden: boolean
  onChange: (next: string) => void
}): JSX.Element {
  const { t } = useTranslation()
  const isHex = /^#([0-9a-f]{3}){1,2}$/i.test(value)
  // Dimmed, not disabled: this value has no effect while the theme is on, but it is still the
  // value that applies the moment the theme is turned off - and for a theme that happens not to
  // declare this variable, it applies right now.
  return (
    <div
      className={`flex items-center gap-2.5 rounded-md border border-black/[0.06] p-2 dark:border-white/10 ${
        overridden ? 'opacity-60' : ''
      }`}
      title={overridden ? t('themeEditor.overriddenByTheme') : undefined}
    >
      {/* Big enough to actually read the color, and a real preview even when the value is a
          notation <input type="color"> cannot parse (it falls back to white internally, so the
          background is painted from the raw value behind it). */}
      <span
        className="relative h-10 w-10 shrink-0 overflow-hidden rounded border border-black/10 dark:border-white/20"
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={isHex ? value : '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          title={name}
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-baseline gap-1.5">
          <span className="truncate text-xs text-slate-600 dark:text-slate-300" title={name}>
            {name}
          </span>
          {overridden && <span className="shrink-0 text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-400">{t('themeEditor.overriddenShort')}</span>}
        </span>
        <TextInput value={value} onChange={(e) => onChange(e.target.value)} className="w-full font-mono text-xs" />
      </div>
    </div>
  )
}

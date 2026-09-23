import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FontFaceInfo, QuartzConfig, UnusedImportedFont } from '@shared/ipc-contract'
import { Button, Combobox, Field, Select, TextInput, Toggle, type ComboboxOption } from '../../components/ui'
import { GOOGLE_FONTS, GOOGLE_FONTS_FETCHED, type GoogleFontCategory } from '../../data/googleFonts'
import { formatIpcError } from '../../components/ErrorSurface'
import { confirmDialog } from '../../utils/confirm'
import { CSS_FIXES, type CssFix } from './cssFixes'
import {
  callsGoogle,
  fontLoaders,
  themeFontsEnabled,
  withSelfHostedFonts,
  withThemeFonts,
  THEME_PLUGIN_PREFIX
} from './fontDelivery'
import { cssColorToHexAlpha, type Mode } from './variableGraph'
import { paletteGround } from './swatch'
import { fontBuildState } from './previewFonts'
import { activeThemeIdOf, useStyles } from './index'
import ColorPicker from './ColorPicker'

type Theme = QuartzConfig['theme']
const TYPOGRAPHY_KEYS = ['header', 'body', 'code'] as const
const GOOGLE_FAMILIES = new Set(GOOGLE_FONTS.map(([family]) => family))

// A typography entry is a bare family name or `{ name, weights?, includeItalic? }` (fontSpec.ts
// reads both); the field edits the name and leaves the rest of an object alone.
function familyOf(spec: unknown): string {
  if (typeof spec === 'string') return spec
  if (spec && typeof spec === 'object' && typeof (spec as { name?: unknown }).name === 'string') return (spec as { name: string }).name
  return ''
}

// The bottom layer of the cascade: the 9 classic colors and 3 font slots Quartz writes straight
// into :root (quartz/util/theme.ts::joinStyles) - everything the other three tabs do sits on top of
// this. Lived under "Konfiguration -> Theme" before; the config tab now only points here, so this
// is the single place these values are edited.
export default function Basics(): JSX.Element {
  const { t } = useTranslation()
  const { config, setConfig, registerSave, goToTab, reloadScss, project, graph, graphLoading, overrides } = useStyles()
  const theme = config.theme
  const [faces, setFaces] = useState<FontFaceInfo[]>([])
  const themeId = activeThemeIdOf(config)

  // The faces again after a save: saving may have fetched the Google fonts into the project.
  useEffect(() => registerSave(async () => reloadFaces()))

  // Under "local" the suggestions are the families the project itself declares - that is all a
  // local font source can render. Read again after a font import below adds one.
  // `built` for the same card: whether a build exists at all, asked without reading any font file.
  const [built, setBuilt] = useState<boolean | null>(null)
  const reloadFaces = useCallback(() => {
    window.quartzGui.styles.fontFaces(project.path, themeId).then(setFaces)
    window.quartzGui.styles.previewFonts({ projectPath: project.path, families: [] }).then((r) => setBuilt(r.built))
  }, [project.path, themeId])
  useEffect(reloadFaces, [reloadFaces])

  function onChange(next: Theme): void {
    setConfig({ ...config, theme: next })
  }

  function set(key: string, value: unknown): void {
    onChange({ ...theme, [key]: value })
  }

  function setTypography(key: string, value: string): void {
    const current: unknown = theme.typography?.[key]
    // The contract types an entry as a string, but Quartz also takes the object form, and a field
    // that edits the name must not throw away the weights next to it.
    const next = current && typeof current === 'object' ? ({ ...current, name: value } as unknown as string) : value
    onChange({ ...theme, typography: { ...(theme.typography ?? {}), [key]: next } })
  }

  // Matches regardless of which theme is picked - the warning is about the plugin overriding these
  // colors at all, and the Theme tab is one click away rather than a separate page now.
  const overridingPlugin = config.plugins.find(
    (p) => p.enabled && typeof p.source === 'string' && p.source.startsWith('@quartz-themes/')
  )
  const fontOrigin = (theme.fontOrigin as string) ?? 'googleFonts'
  const categoryLabel: Record<GoogleFontCategory, string> = {
    'sans-serif': t('themeEditor.fontCategory.sansSerif'),
    serif: t('themeEditor.fontCategory.serif'),
    monospace: t('themeEditor.fontCategory.monospace'),
    display: t('themeEditor.fontCategory.display'),
    handwriting: t('themeEditor.fontCategory.handwriting')
  }
  const fontOptions: ComboboxOption[] =
    fontOrigin === 'local'
      ? [...new Map(faces.map((f) => [f.family, { value: f.family, meta: f.origin === 'theme' ? t('themeEditor.fontFromTheme') : f.source }])).values()]
      : GOOGLE_FONTS.map(([family, category]) => ({ value: family, meta: categoryLabel[category] }))

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
  // The project's own css-vars block beats whatever Quartz writes from theme.typography, because
  // that block is unlayered and comes after. Eight of the nine projects on the machine this was
  // measured on carry exactly these variables - every project made from the built-in example
  // template does (d4da5ef found the cause and fixed the template; the projects keep it) - and
  // there a font picked here changed nothing on the site while the page fetched 26 files from
  // Google without a word (thirty-third review, finding 4). Same answer as the colours get one
  // card down, asked at the page's own override state rather than at the variable graph, which
  // only knows 'theme' and 'build'.
  const overriddenByVariable = (key: (typeof TYPOGRAPHY_KEYS)[number]): boolean => FONT_VARIABLE[key] in overrides

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
          <span className="text-micro text-text-muted">
            {fontOrigin === 'local' ? t('themeEditor.localHint') : t('themeEditor.googleFontsHint', { count: GOOGLE_FONTS.length })}
          </span>
        </Field>

        {TYPOGRAPHY_KEYS.map((key) => {
          const overridden = overriddenByTheme(FONT_VARIABLE[key])
          const ownVariable = overriddenByVariable(key)
          const family = familyOf(theme.typography?.[key])
          // Google's CSS2 API is case-sensitive: "open sans" fails where "Open Sans" works. It
          // answers with an error page only when *no* family of the request matches - among others
          // that do, an unknown one is left out silently (measured against the real API). The list
          // here is from a fixed date, so a name missing from it is worth a sentence, not a refusal
          // - and not even that when the project declares the family itself, which is the normal
          // state right after importing a font into a slot (thirty-third review, finding 5).
          const declaredHere = faces.some((f) => f.family.toLowerCase() === family.trim().toLowerCase())
          const unknownToGoogle =
            fontOrigin !== 'local' && family.trim() !== '' && !GOOGLE_FAMILIES.has(family.trim()) && !declaredHere
          const spelledDifferently = unknownToGoogle
            ? GOOGLE_FONTS.find(([name]) => name.toLowerCase() === family.trim().toLowerCase())?.[0]
            : undefined
          return (
            <Field key={key} label={t('themeEditor.fontFor', { slot: key })} muted={overridden || ownVariable}>
              <Combobox
                value={family}
                onChange={(next) => setTypography(key, next)}
                options={fontOptions}
                label={t('themeEditor.fontFor', { slot: key })}
                listLabel={t('themeEditor.fontListFor', { slot: key })}
                countText={(count) => t('themeEditor.fontMatches', { count })}
                emptyText={fontOrigin === 'local' ? t('themeEditor.fontNoLocalMatch') : t('themeEditor.fontNoGoogleMatch')}
              />
              {spelledDifferently ? (
                <span className="text-micro text-amber-700 dark:text-amber-400">
                  {t('themeEditor.fontSpelledDifferently', { name: spelledDifferently })}
                </span>
              ) : (
                unknownToGoogle && (
                  <span className="text-micro text-amber-700 dark:text-amber-400">
                    {t('themeEditor.fontUnknownToGoogle', { date: GOOGLE_FONTS_FETCHED })}
                  </span>
                )
              )}
              {overridden && (
                <span className="text-micro text-amber-700 dark:text-amber-400">{t('themeEditor.overriddenByTheme')}</span>
              )}
              {ownVariable && (
                <span className="text-micro text-amber-700 dark:text-amber-400">
                  {t('themeEditor.overriddenByVariable', { variable: FONT_VARIABLE[key] })}{' '}
                  <button type="button" className="underline" onClick={() => goToTab('variables')}>
                    {t('themeEditor.goToVariablesTab')}
                  </button>
                </span>
              )}
            </Field>
          )
        })}
      </div>

      <FontDelivery config={config} onChange={setConfig} buildState={fontBuildState(config, faces, built)} />

      <CssFixes />

      <LocalFontImport
        projectPath={project.path}
        onImported={(family, slot) => {
          if (slot) setTypography(slot, family)
          reloadFaces()
          // The import wrote an @font-face block into custom.scss - pull that change into the
          // draft the "Eigenes CSS" tab edits, or its next save would undo it.
          void reloadScss('fontImport')
        }}
      />

      <UnusedImportedFonts
        projectPath={project.path}
        draftFamilies={TYPOGRAPHY_KEYS.map((key) => familyOf(theme.typography?.[key])).filter(Boolean)}
        faces={faces}
        onRemoved={() => {
          reloadFaces()
          void reloadScss('fontRemoval')
        }}
      />

      <div>
        <h3 className="mb-2 text-sm font-semibold text-text">{t('themeEditor.colors')}</h3>
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
  onChange,
  buildState
}: {
  config: QuartzConfig
  onChange: (next: QuartzConfig) => void
  buildState: ReturnType<typeof fontBuildState>
}): JSX.Element {
  const { t } = useTranslation()
  const { quartzStillDownloadsFonts, savePage } = useStyles()
  const [fetching, setFetching] = useState(false)
  const loaders = fontLoaders(config)
  const google = callsGoogle(config)
  // The page's own save, not a second path to the same files: it also writes whatever else is
  // pending on this tab, and it is what resets the page's dirty state.
  async function fetchNow(): Promise<void> {
    setFetching(true)
    try {
      await savePage()
    } finally {
      setFetching(false)
    }
  }
  const themeFonts = themeFontsEnabled(config)
  const hasTheme = config.plugins.some(
    (p) => p.enabled && typeof p.source === 'string' && p.source.startsWith(THEME_PLUGIN_PREFIX)
  )
  const baseUrl = (config.configuration.baseUrl as string) ?? ''

  return (
    <div className="rounded-md border border-ink/[0.06] p-3 dark:border-ink/10">
      <h3 className="mb-1 text-sm font-semibold">{t('themeEditor.delivery.heading')}</h3>
      <div className="mb-2 flex flex-col gap-0.5 text-xs">
        {loaders.length === 0 && <p className="text-text-muted">{t('styleEditor.current.noLoader')}</p>}
        {loaders.map((loader) => (
          <p
            key={`${loader.via}-${loader.mode}`}
            className={loader.mode === 'google' ? 'text-amber-700 dark:text-amber-400' : 'text-text-muted'}
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
      <p className="mt-1.5 text-xs text-text-muted">{t('themeEditor.delivery.description')}</p>
      {/* Self-hosting means "downloaded at build time", and until then the files exist nowhere -
          which is what the preview on "Eigenes CSS" then shows. Said here too, where the choice is. */}
      {buildState?.kind === 'notBuilt' && (
        <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">{t('styleEditor.current.fontsNotBuilt')}</p>
      )}
      {buildState?.kind === 'missing' && (
        <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
          {t('styleEditor.current.fontsMissingFromBuild', { families: buildState.families.join(', ') })}
        </p>
      )}
      {quartzStillDownloadsFonts ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <p className="text-xs text-amber-700 dark:text-amber-400">{t('themeEditor.delivery.quartzStillDownloads')}</p>
          <Button onClick={fetchNow} disabled={fetching}>
            {fetching ? t('themeEditor.delivery.fetching') : t('themeEditor.delivery.fetchNow')}
          </Button>
        </div>
      ) : (
        buildState?.kind === 'notFetched' && (
          <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
            {t('styleEditor.current.fontsNotFetched', { families: buildState.families.join(', ') })}
          </p>
        )
      )}
      {buildState?.kind === 'noRule' && (
        <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
          {t('styleEditor.current.fontsNoRule', { families: buildState.families.join(', ') })}
        </p>
      )}

      {/* Its own control, not part of the switch above: there is no option to serve the theme's
          fonts locally, so the only way to stop the CDN requests is to drop them - which changes
          how the site looks. That is a different decision. */}
      {themeFonts && (
        <div className="mt-3 border-t border-ink/[0.06] pt-3 dark:border-ink/10">
          <Toggle
            label={t('themeEditor.delivery.themeFonts')}
            checked
            onChange={() => onChange(withThemeFonts(config, false))}
          />
          <p className="mt-1.5 text-xs text-text-muted">{t('themeEditor.delivery.themeFontsHint')}</p>
        </div>
      )}
      {!themeFonts && hasTheme && (
        <div className="mt-3 border-t border-ink/[0.06] pt-3 dark:border-ink/10">
          <Toggle
            label={t('themeEditor.delivery.themeFonts')}
            checked={false}
            onChange={() => onChange(withThemeFonts(config, true))}
          />
          <p className="mt-1.5 text-xs text-text-muted">{t('themeEditor.delivery.themeFontsOff')}</p>
        </div>
      )}
      {/* The plugin's self-hosting rewrites the font URLs to <baseUrl>/static/fonts and throws
          outright without one - so an empty baseUrl is a build failure, not a detail. Core's no
          longer needs one: the app holds those files in the project (fontDelivery.ts). */}
      {loaders.some((l) => l.via === 'plugin' && l.mode === 'selfHosted') && !baseUrl && (
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
      await reloadScss('stylesheets')
      goToTab('customCss')
    } catch (err) {
      setError(formatIpcError(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-md border border-ink/[0.06] p-3 dark:border-ink/10">
      <h3 className="mb-1 text-sm font-semibold">{t('styles.fixes.heading')}</h3>
      <p className="mb-2 text-xs text-text-muted">{t('styles.fixes.description')}</p>
      <div className="flex flex-col gap-2">
        {applicable.map((fix) => {
          const existing = fileSet?.files.find((f) => f.name === fix.fileName)
          return (
            <div key={fix.id} className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">{t(`styles.fixes.${fix.id}.title`)}</p>
                <p className="text-xs text-text-muted">{t(`styles.fixes.${fix.id}.summary`)}</p>
              </div>
              {existing ? (
                <span className="flex shrink-0 items-center gap-2 text-xs text-text-muted">
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

// Fonts a template or an import brought along that nothing names any more. Offered for removal one
// by one and never removed by itself: the block is the user's as much as the app's, and a family
// can be named in ways the search in fontService does not see (a stylesheet outside
// quartz/styles, an inline style in a note). `faces` is only a trigger - it is re-read after an
// import or a removal, and the list with it.
function UnusedImportedFonts({
  projectPath,
  draftFamilies,
  faces,
  onRemoved
}: {
  projectPath: string
  draftFamilies: string[]
  faces: FontFaceInfo[]
  onRemoved: () => void
}): JSX.Element | null {
  const { t } = useTranslation()
  const [unused, setUnused] = useState<UnusedImportedFont[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const draftKey = draftFamilies.join('|')

  useEffect(() => {
    let cancelled = false
    window.quartzGui.fonts
      .unusedImported({ projectPath, draftFamilies: draftKey ? draftKey.split('|') : [] })
      .then((list) => !cancelled && setUnused(list))
    return () => {
      cancelled = true
    }
  }, [projectPath, draftKey, faces])

  if (unused.length === 0) return null

  async function remove(font: UnusedImportedFont): Promise<void> {
    // Its own sentence when nothing is deleted: "und 0 Datei(en)" is the shape of a number, not an
    // answer. `files` is what would really go - the same question deleteUnreferencedFontFiles
    // answers afterwards (fontService) - so zero is a state that happens, not an edge case.
    const ok = await confirmDialog({
      text:
        font.files.length === 0
          ? t('themeEditor.unusedFonts.confirmNoFiles', { family: font.family })
          : t('themeEditor.unusedFonts.confirm', { family: font.family, count: font.files.length }),
      confirmLabel: t('themeEditor.unusedFonts.confirmButton'),
      danger: true
    })
    if (!ok) return
    setBusy(font.family)
    setError(null)
    try {
      await window.quartzGui.fonts.removeImported({ projectPath, family: font.family })
      onRemoved()
    } catch (err) {
      setError(formatIpcError(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-md border border-ink/[0.06] p-3 dark:border-ink/10">
      <h3 className="mb-1 text-sm font-semibold">{t('themeEditor.unusedFonts.heading')}</h3>
      <p className="mb-2 text-xs text-text-muted">{t('themeEditor.unusedFonts.description')}</p>
      <div className="flex flex-col gap-2">
        {unused.map((font) => (
          <div key={font.family} className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">{font.family}</p>
              <p className="truncate font-mono text-micro text-text-muted" title={font.files.join(', ')}>
                {font.files.length > 0 ? font.files.join(', ') : t('themeEditor.unusedFonts.noFile')}
              </p>
            </div>
            <Button variant="ghost" className="shrink-0" disabled={busy !== null} onClick={() => remove(font)}>
              {busy === font.family ? t('themeEditor.unusedFonts.removing') : t('themeEditor.unusedFonts.remove')}
            </Button>
          </div>
        ))}
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
      const imported = await window.quartzGui.fonts.importFile(projectPath, pendingPath, family.trim())
      onImported(family.trim(), slot)
      // What the rule says now, rather than only that it was written: the weight comes out of the
      // file, and when the file does not name one that is worth saying too - the rule is then the
      // one it always was, and nobody can see the difference from the outside.
      const named = { family: family.trim(), weight: imported.weight }
      // One `t()` per branch, not one with a computed key: `npm run check:i18n` finds keys by
      // reading literal t('…') calls, and a key assembled in a ternary is invisible to it - which
      // is the one thing that check exists to prevent, since i18next renders a missing key as the
      // key itself.
      setMessage(
        !imported.weight
          ? t('themeEditor.fontImportUndetected', named)
          : imported.italic
            ? t('themeEditor.fontImportDetectedItalic', named)
            : t('themeEditor.fontImportDetected', named)
      )
      setPendingPath(null)
      setFamily('')
      setSlot('')
    } catch (err) {
      setMessage(formatIpcError(err))
    }
    setBusy(false)
  }

  return (
    <div className="rounded-md border border-ink/[0.06] p-3 dark:border-ink/10">
      <h3 className="mb-1 text-sm font-semibold">{t('themeEditor.localFontHeading')}</h3>
      <p className="mb-2 text-xs text-text-muted">{t('themeEditor.localFontDescription')}</p>
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
      {message && <p className="mt-2 text-xs text-text-secondary">{message}</p>}
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
  isOverridden,
  mode
}: {
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
  isOverridden: (key: string) => boolean
  // Known once the recursion is inside lightMode/darkMode; the swatches then sit on that mode's
  // `light`, which is what the website paints behind them.
  mode?: Mode
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
              ground={mode ? paletteGround(mode, value) : undefined}
            />
          ))}
        </div>
      )}
      {nested.map(([key, v]) => (
        <div key={key} className="rounded-md border border-slate-200 p-3 dark:border-ink/10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">{key}</p>
          <ColorGroup
            value={v as Record<string, unknown>}
            onChange={(next) => onChange({ ...value, [key]: next })}
            isOverridden={isOverridden}
            mode={key === 'lightMode' ? 'light' : key === 'darkMode' ? 'dark' : mode}
          />
        </div>
      ))}
    </div>
  )
}

/** `#rrggbb` plus an alpha, as the `rgba()` the palette writes. */
function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

function ColorCell({
  name,
  value,
  overridden,
  onChange,
  ground
}: {
  name: string
  value: string
  overridden: boolean
  onChange: (next: string) => void
  ground?: string
}): JSX.Element {
  const { t } = useTranslation()
  // Every notation the browser can paint *and hold in sRGB* - hex, `rgb()`/`rgba()`, `hsl()`,
  // a named colour, a `color-mix()` in sRGB - and the alpha comes back separately because
  // `<input type="color">` has nowhere to put it. The regex that stood here matched only six-digit
  // hex, so all four `rgba()` values in a palette (`highlight` and `textHighlight`, per mode)
  // handed the picker `null` and it opened on black - on the values where the *tint* is the whole
  // point. A colour in another space is where the sentence stops: `oklch()` and
  // `color(display-p3 …)` come back as themselves, `parsed` is `null`, and the swatch behind the
  // input still paints the value while the text field is what edits it. Not "every notation the
  // browser can paint", which is what this said until 2026-09-10.
  const parsed = cssColorToHexAlpha(value)
  // Dimmed, not disabled: this value has no effect while the theme is on, but it is still the
  // value that applies the moment the theme is turned off - and for a theme that happens not to
  // declare this variable, it applies right now. The dimming is the name going muted, not
  // `opacity-60` on the row: that took the amber tag saying *why* down to 2.88:1
  // (docs/REVIEW-2026-09-02.md, d), and the swatch and the value are the information here.
  return (
    <div
      className="flex items-center gap-2.5 rounded-md border border-ink/[0.06] p-2 dark:border-ink/10"
      title={overridden ? t('themeEditor.overriddenByTheme') : undefined}
    >
      {/* Big enough to actually read the colour. The shared picker paints the raw value behind a
          transparent input, so a notation the picker cannot parse still shows as itself. */}
      <ColorPicker
        value={value}
        hex={parsed?.hex ?? null}
        // Picking on a translucent value keeps its alpha: the user reached for a colour, not for
        // the difference between a tint and a solid fill. Written back as `rgba()` - the one
        // notation `withAlpha` has - whichever of the three it came in as.
        onChange={(hex) => onChange(parsed && parsed.alpha < 1 ? withAlpha(hex, parsed.alpha) : hex)}
        title={name}
        ground={ground}
        size="lg"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-baseline gap-1.5">
          <span className={`truncate text-xs ${overridden ? 'text-text-muted' : 'text-text-secondary'}`} title={name}>
            {name}
          </span>
          {overridden && <span className="shrink-0 text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-400">{t('themeEditor.overriddenShort')}</span>}
        </span>
        <TextInput value={value} onChange={(e) => onChange(e.target.value)} className="w-full font-mono text-xs" />
      </div>
    </div>
  )
}

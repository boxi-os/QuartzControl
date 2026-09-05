import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  PluginEntry,
  QuartzThemeListing,
  StyleSettingsSchema,
  ThemeDetail,
  ThemePreset,
  ThemeStyleSettingsInfo
} from '@shared/ipc-contract'
import { Badge, Button, Card, TextInput, Toggle } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import { useStickyState } from '../../state/uiState'
import { useIpcQuery } from '../../state/useIpcQuery'
import StyleSettingsForm from './StyleSettingsForm'
import { useStyles } from './index'

// @quartz-themes/* (e.g. @quartz-themes/core) is a third-party Obsidian-style theming engine,
// separate from Quartz's built-in configuration.theme.colors. It injects its own CSS variables
// later in the cascade and overrides the classic colors outright. Detected by source prefix since
// it's a whole npm scope of theme packages, not a single fixed plugin name.
//
// Matches regardless of `enabled` - unlike activeThemeIdOf() in index.tsx, this tab needs to find a
// *disabled* entry too, to offer turning it back on rather than showing "no theme installed".
function findThemePluginIndex(plugins: PluginEntry[]): number {
  return plugins.findIndex((p) => typeof p.source === 'string' && p.source.startsWith('@quartz-themes/'))
}

const VISIBLE_THEME_LIMIT = 30

export default function Theme(): JSX.Element {
  const { t } = useTranslation()
  const { project, config, setConfig, saveConfig, registerSave } = useStyles()
  const [presets, setPresets] = useState<ThemePreset[]>([])

  useEffect(() => registerSave(saveConfig))

  useEffect(() => {
    window.quartzGui.themePresets.list(project.path).then(setPresets)
  }, [project.path])

  async function refreshPresets(): Promise<void> {
    setPresets(await window.quartzGui.themePresets.list(project.path))
  }

  const themePluginIndex = findThemePluginIndex(config.plugins)
  const themePlugin = themePluginIndex === -1 ? undefined : config.plugins[themePluginIndex]
  const activeThemeId =
    themePlugin?.enabled && typeof themePlugin.options?.theme === 'string' ? themePlugin.options.theme : undefined

  function updatePlugin(next: PluginEntry): void {
    const nextPlugins = [...config.plugins]
    if (themePluginIndex === -1) nextPlugins.push(next)
    else nextPlugins[themePluginIndex] = next
    setConfig({ ...config, plugins: nextPlugins })
  }

  function activateTheme(themeId: string, extraOptions?: Record<string, unknown>): void {
    const base: PluginEntry = themePlugin ?? {
      name: themeId,
      source: '@quartz-themes/core',
      enabled: true,
      options: { mode: 'both' }
    }
    updatePlugin({ ...base, enabled: true, options: { ...base.options, theme: themeId, ...extraOptions } })
  }

  async function applyPreset(preset: ThemePreset): Promise<void> {
    await window.quartzGui.themeMarketplace.install(project.path, preset.baseThemeId)
    const base: PluginEntry = themePlugin ?? { name: preset.baseThemeId, source: '@quartz-themes/core', enabled: true }
    updatePlugin({ ...base, enabled: true, options: { ...preset.options } })
  }

  return (
    <div className="grid gap-6">
      {themePlugin && (
        <div className="-mt-2">
          {themePlugin.enabled ? (
            <Button variant="ghost" onClick={() => updatePlugin({ ...themePlugin, enabled: false })}>
              {t('themes.disableAll')}
            </Button>
          ) : (
            <Badge>{t('themes.allDisabled')}</Badge>
          )}
        </div>
      )}

      <ActiveThemeSection
        plugin={themePlugin}
        onChange={updatePlugin}
        projectPath={project.path}
        onSavedAsPreset={refreshPresets}
      />

      <PresetsSection
        presets={presets}
        projectPath={project.path}
        activeThemeId={activeThemeId}
        onApply={applyPreset}
        onDeleted={refreshPresets}
      />

      <ThemeCatalog projectPath={project.path} activeThemeId={activeThemeId} onActivate={(id) => activateTheme(id)} />
    </div>
  )
}

// Style-Settings keys are namespaced "<styleSettingsId>@@<key>" (see
// pluginSchemaService.getThemeStyleSettingsInfo - styleSettingsId can be more than one id, e.g.
// tokyo-night ships ["Appearance", "Editor"]; any of them works as a prefix). We always write
// using the first id, which the plugin accepts the same as any other.
function styleSettingsKey(styleSettingsId: string[], suffix: string): string {
  return `${styleSettingsId[0]}@@${suffix}`
}

function ActiveThemeSection({
  plugin,
  onChange,
  projectPath,
  onSavedAsPreset
}: {
  plugin: PluginEntry | undefined
  onChange: (next: PluginEntry) => void
  projectPath: string
  onSavedAsPreset: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const { goToTab } = useStyles()
  const themeId = typeof plugin?.options?.theme === 'string' ? plugin.options.theme : undefined
  // Both reads are keyed by the active theme, and both are slow the first time (the schema is
  // fetched upstream and cached on disk) - so both go through useIpcQuery's guard: switching theme
  // twice in a row must not leave the second theme's panel filled with the first theme's answer.
  const { data: info, loading: infoLoading } = useIpcQuery(
    async () => (themeId && plugin?.enabled ? window.quartzGui.plugins.themeStyleSettingsInfo(projectPath, themeId) : null),
    [projectPath, themeId, plugin?.enabled]
  )
  const { data: fetchedSchema, loading: schemaLoading } = useIpcQuery(
    async () => (themeId && plugin?.enabled ? window.quartzGui.themeMarketplace.styleSettingsSchema(themeId) : null),
    [themeId, plugin?.enabled]
  )
  // The refresh button replaces the fetched answer until the next read - see refreshSchema.
  const [refreshedSchema, setRefreshedSchema] = useState<StyleSettingsSchema | null | undefined>(undefined)
  const schema = refreshedSchema !== undefined ? refreshedSchema : fetchedSchema
  const [refreshingSchema, setRefreshingSchema] = useState(false)
  const [savingName, setSavingName] = useState<string | null>(null)

  // The option documentation lives upstream, not in the installed package (see
  // styleSettingsSchemaService) - fetched once per theme and cached on disk, so the read above is a
  // network call only the first time a given theme is opened. This one always is.
  async function refreshSchema(): Promise<void> {
    if (!themeId) return
    setRefreshingSchema(true)
    try {
      setRefreshedSchema(await window.quartzGui.themeMarketplace.refreshStyleSettingsSchema(themeId))
    } finally {
      setRefreshingSchema(false)
    }
  }

  if (!plugin) {
    return (
      <Card>
        <h3 className="mb-1 text-sm font-semibold">{t('themes.active.title')}</h3>
        <p className="text-xs text-text-muted">{t('themes.active.none')}</p>
      </Card>
    )
  }

  // Kept as a plugin entry with enabled:false rather than removed, so the theme choice and all
  // its style settings survive being turned off - re-enabling restores exactly what was there.
  if (!plugin.enabled) {
    return (
      <Card>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t('themes.active.disabledHeading', { themeId: themeId ?? '—' })}</h3>
          <Button variant="ghost" onClick={() => onChange({ ...plugin, enabled: true })}>
            {t('themes.active.reactivate')}
          </Button>
        </div>
        <p className="mt-1 text-xs text-text-muted">{t('themes.active.disabledNote')}</p>
      </Card>
    )
  }

  const styleSettings = (plugin.options?.styleSettings as Record<string, unknown>) ?? {}

  // One patch at a time, applied to a single copy: a themed color in hsl-split format writes six
  // keys, and applying them one call each would each start from the same pre-change state.
  function applyStyleSettings(patch: Record<string, unknown>): void {
    if (!plugin) return
    const nextStyleSettings = { ...styleSettings }
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === '') delete nextStyleSettings[key]
      else nextStyleSettings[key] = value
    }
    onChange({ ...plugin, options: { ...plugin.options, styleSettings: nextStyleSettings } })
  }

  function setStyleSettingsKey(fullKey: string, value: unknown): void {
    applyStyleSettings({ [fullKey]: value })
  }

  async function confirmSavePreset(): Promise<void> {
    if (!plugin || !savingName?.trim()) return
    const preset: ThemePreset = {
      id: `preset-${Date.now()}`,
      name: savingName.trim(),
      createdAt: new Date().toISOString(),
      baseThemeId: themeId ?? 'default',
      options: {
        theme: themeId ?? 'default',
        mode: typeof plugin.options?.mode === 'string' ? plugin.options.mode : 'both',
        variation: typeof plugin.options?.variation === 'string' ? plugin.options.variation : undefined,
        calloutStyle: typeof plugin.options?.calloutStyle === 'string' ? plugin.options.calloutStyle : undefined,
        styleSettings: styleSettings as Record<string, string | number | boolean>
      }
    }
    await window.quartzGui.themePresets.save(projectPath, preset)
    setSavingName(null)
    onSavedAsPreset()
  }

  const hasStyleSettings = !!info && info.styleSettingsId.length > 0

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t('themes.active.heading', { themeId })}</h3>
        {savingName === null ? (
          <Button variant="ghost" onClick={() => setSavingName('')}>
            {t('themes.active.saveAsPreset')}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <TextInput
              value={savingName}
              onChange={(e) => setSavingName(e.target.value)}
              placeholder={t('themes.active.presetNamePlaceholder')}
              className="w-40 text-xs"
              autoFocus
            />
            <Button variant="ghost" onClick={confirmSavePreset} disabled={!savingName.trim()}>
              {t('common.save')}
            </Button>
            <button type="button" onClick={() => setSavingName(null)} className="text-xs text-text-muted underline">
              {t('common.cancel')}
            </button>
          </div>
        )}
      </div>
      <p className="mt-1 text-xs text-text-muted">
        {t('themes.active.overrideNote', { source: String(plugin.source) })}
      </p>

      {infoLoading && <p className="mt-2 text-xs text-text-muted">{t('themes.active.checkingStyleSettings')}</p>}

      {!infoLoading && !hasStyleSettings && themeId && (
        <p className="mt-2 text-xs text-text-muted">{t('themes.active.noStyleSettingsNote', { themeId })}</p>
      )}

      {hasStyleSettings && info && (
        <div className="mt-3 rounded-md border border-ink/[0.06] bg-ink/[0.02] p-3 dark:border-ink/10 dark:bg-ink/[0.03]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {t('themes.active.styleSettingsHeading', { ids: info.styleSettingsId.join(', ') })}
            </p>
            <Button variant="ghost" onClick={refreshSchema} disabled={refreshingSchema || schemaLoading}>
              {refreshingSchema ? t('common.loading') : t('styles.styleSettings.refresh')}
            </Button>
          </div>

          {schemaLoading && <p className="text-xs text-text-muted">{t('styles.styleSettings.loading')}</p>}

          {!schemaLoading && schema && (
            <StyleSettingsForm schema={schema} info={info} values={styleSettings} onChange={applyStyleSettings} />
          )}

          {!schemaLoading && schema === null && (
            <>
              <p className="mb-2 text-xs text-text-muted">{t('styles.styleSettings.unavailable')}</p>
              {info.classSettingKeys.length > 0 && (
                <div className="mb-3 flex flex-col gap-1.5">
                  {info.classSettingKeys.map((key) => {
                    const fullKey = styleSettingsKey(info.styleSettingsId, key)
                    return (
                      <Toggle
                        key={key}
                        label={key}
                        checked={styleSettings[fullKey] === true}
                        onChange={(checked) => setStyleSettingsKey(fullKey, checked ? true : undefined)}
                      />
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* This card is deliberately limited to what the theme itself declares. Writing an
              arbitrary CSS custom property through a style setting worked here too, but it is the
              same edit the Variablen tab does properly - with the value's origin, its dependents
              and a light/dark pair - so there is one place for it now, not two. */}
          <p className="mt-3 text-micro text-text-muted">
            {t('themes.active.ownValuesHint')}{' '}
            <button type="button" className="underline" onClick={() => goToTab('variables')}>
              {t('themes.active.goToVariables')}
            </button>
          </p>
        </div>
      )}
    </Card>
  )
}

function PresetsSection({
  presets,
  projectPath,
  activeThemeId,
  onApply,
  onDeleted
}: {
  presets: ThemePreset[]
  projectPath: string
  activeThemeId?: string
  onApply: (preset: ThemePreset) => void
  onDeleted: () => void
}): JSX.Element {
  const { t } = useTranslation()
  async function remove(id: string): Promise<void> {
    await window.quartzGui.themePresets.delete(projectPath, id)
    onDeleted()
  }

  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold">{t('themes.presets.title')}</h3>
      <p className="mb-3 text-xs text-text-muted">{t('themes.presets.description')}</p>
      {presets.length === 0 && <p className="text-xs text-text-muted">{t('themes.presets.none')}</p>}
      <div className="flex flex-col gap-1.5">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="flex items-center justify-between rounded-md border border-ink/[0.06] px-2.5 py-1.5 text-sm dark:border-ink/10"
          >
            <div>
              <span className="font-medium">{preset.name}</span>{' '}
              <span className="text-xs text-text-muted">{t('themes.presets.basisLabel', { base: preset.baseThemeId })}</span>
            </div>
            <div className="flex items-center gap-2">
              {preset.options.theme === activeThemeId ? (
                <Badge tone="green">{t('themes.presets.active')}</Badge>
              ) : (
                <Button variant="ghost" onClick={() => onApply(preset)}>
                  {t('themes.presets.apply')}
                </Button>
              )}
              <button type="button" onClick={() => remove(preset.id)} className="text-xs text-text-muted underline">
                {t('themes.presets.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ThemeCatalog({
  projectPath,
  activeThemeId,
  onActivate
}: {
  projectPath: string
  activeThemeId?: string
  onActivate: (themeId: string) => void
}): JSX.Element {
  const { t } = useTranslation()
  const [themes, setThemes] = useState<QuartzThemeListing[]>([])
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  // Which theme was being looked at, and what was searched for, are worth keeping across a trip to
  // another area - the catalog itself is refetched, only the position is restored.
  const [query, setQuery] = useStickyState('styles.themeCatalog.query', '')
  const [installingId, setInstallingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useStickyState<string | null>('styles.themeCatalog.expanded', null)
  // Through useIpcQuery for its cancel guard, and this is the site that needs one most in the app:
  // opening a theme fetches its detail from GitHub, and opening the next one before that comes back
  // used to be a race whose winner was whichever answer was slower. `undefined` while it runs,
  // `null` when there is nothing to show - the three states the panel below already reads.
  const { data: detail, loading: detailLoading } = useIpcQuery(
    async () => (expandedId ? window.quartzGui.themeMarketplace.detail(projectPath, expandedId) : null),
    [projectPath, expandedId]
  )

  const load = useCallback(async () => {
    setLoading(true)
    const result = await window.quartzGui.themeMarketplace.list()
    setThemes(result.themes)
    setUnavailable(result.unavailable)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // The catalog is cached for fifteen minutes in main, so a theme published in the meantime - or a
  // catalog that could not be fetched a moment ago - is otherwise out of reach until a restart.
  async function refresh(): Promise<void> {
    await window.quartzGui.themeMarketplace.refresh()
    await load()
  }

  async function install(themeId: string): Promise<void> {
    setInstallingId(themeId)
    setMessage(null)
    try {
      const result = await window.quartzGui.themeMarketplace.install(projectPath, themeId)
      if (result.success) {
        onActivate(themeId)
        setMessage(t('themes.catalog.installSuccess', { id: themeId }))
      } else {
        setMessage(t('themes.catalog.installFailed', { id: themeId, output: result.output.slice(0, 300) }))
      }
    } catch (err) {
      setMessage(formatIpcError(err))
    } finally {
      setInstallingId(null)
    }
  }

  const q = query.trim().toLowerCase()
  const filtered = q ? themes.filter((theme) => theme.id.toLowerCase().includes(q)) : themes
  const visible = filtered.slice(0, VISIBLE_THEME_LIMIT)

  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold">{t('themes.catalog.title')}</h3>
      <p className="mb-3 text-xs text-text-muted">{t('themes.catalog.description')}</p>
      <div className="flex items-center gap-2">
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('themes.catalog.searchPlaceholder')}
          className="flex-1"
        />
        <Button variant="ghost" onClick={refresh} disabled={loading}>
          {loading ? t('themes.catalog.refreshing') : t('themes.catalog.refresh')}
        </Button>
      </div>
      {unavailable && (
        <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {t('themes.catalog.unavailable')}
        </p>
      )}
      <div className="mt-2 max-h-80 overflow-y-auto rounded-md border border-ink/[0.06] dark:border-ink/10">
        {visible.map((listing) => {
          const isActive = listing.id === activeThemeId
          const isExpanded = expandedId === listing.id
          return (
            <div key={listing.id} className="border-b border-ink/[0.04] last:border-b-0 dark:border-ink/5">
              <div className="flex items-center justify-between px-2.5 py-1.5 text-sm">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : listing.id)}
                  className="flex items-center gap-2 font-mono text-xs hover:underline"
                >
                  {listing.id}
                  {listing.stars !== undefined && listing.stars > 0 && (
                    <span className="text-micro text-text-muted">★ {listing.stars}</span>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  {listing.topics?.map((topic) => (
                    <Badge key={topic}>{topic}</Badge>
                  ))}
                  {isActive ? (
                    <Badge tone="green">{t('themes.catalog.active')}</Badge>
                  ) : (
                    <Button variant="ghost" onClick={() => install(listing.id)} disabled={installingId === listing.id}>
                      {installingId === listing.id ? t('themes.catalog.installing') : t('themes.catalog.install')}
                    </Button>
                  )}
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-ink/[0.04] bg-ink/[0.02] px-2.5 py-2 text-xs dark:border-ink/5 dark:bg-ink/[0.02]">
                  {detailLoading && <p className="text-text-muted">{t('themes.catalog.detailLoading')}</p>}
                  {!detailLoading && detail === null && <p className="text-text-muted">{t('themes.catalog.detailNone')}</p>}
                  {!detailLoading && detail && (
                    <div className="flex flex-col gap-1 text-text-secondary">
                      <p>{t('themes.catalog.modes', { modes: detail.modes.join(', ') || '—' })}</p>
                      <p>{t('themes.catalog.variations', { variations: detail.variations.join(', ') || '—' })}</p>
                      <p>
                        {t('themes.catalog.customColorsLabel', {
                          value: detail.styleSettingsId.length > 0 ? t('themes.catalog.yes') : t('themes.catalog.no')
                        })}
                      </p>
                      <p>{t('themes.catalog.fonts', { fonts: detail.fonts.join(', ') || '—' })}</p>
                      {listing.githubDescription && <p>{t('themes.catalog.github', { text: listing.githubDescription })}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {visible.length === 0 && (
          <p className="p-2 text-xs text-text-muted">{loading ? t('themes.loading') : t('themes.catalog.noResults')}</p>
        )}
      </div>
      {filtered.length > visible.length && (
        <p className="mt-1 text-xs text-text-muted">
          {t('themes.catalog.moreResults', { count: filtered.length - visible.length })}
        </p>
      )}
      {message && <p className="mt-2 text-xs text-text-secondary">{message}</p>}
    </Card>
  )
}

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProject } from '../ProjectLayout'
import type { PluginEntry, QuartzConfig, QuartzThemeListing, ThemeDetail, ThemePreset, ThemeStyleSettingsInfo } from '@shared/ipc-contract'
import { Badge, Button, Card, PageHeader, TextInput, Toggle } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import { TAB_ICONS } from '../navConfig'

// @quartz-themes/* (e.g. @quartz-themes/core) is a third-party Obsidian-style theming engine,
// separate from Quartz's built-in configuration.theme.colors. It injects its own CSS variables
// later in the cascade and overrides the classic colors outright. Detected by source prefix since
// it's a whole npm scope of theme packages, not a single fixed plugin name.
//
// Matches regardless of `enabled` - unlike the same-named check elsewhere (ProjectDashboard,
// ThemeEditor), this page needs to find a *disabled* entry too, to offer turning it back on
// rather than just showing "no theme installed" once it's off.
function findThemePluginIndex(plugins: PluginEntry[]): number {
  return plugins.findIndex((p) => typeof p.source === 'string' && p.source.startsWith('@quartz-themes/'))
}

const VISIBLE_THEME_LIMIT = 30

export default function Themes(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [config, setConfig] = useState<QuartzConfig | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [presets, setPresets] = useState<ThemePreset[]>([])

  useEffect(() => {
    window.quartzGui.config.get(project.path).then(setConfig)
  }, [project.path])

  useEffect(() => {
    window.quartzGui.themePresets.list(project.path).then(setPresets)
  }, [project.path])

  async function refreshPresets(): Promise<void> {
    setPresets(await window.quartzGui.themePresets.list(project.path))
  }

  async function save(): Promise<void> {
    if (!config) return
    setStatus('saving')
    setError(null)
    try {
      await window.quartzGui.config.save(project.path, config)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      setStatus('error')
      setError(String(err))
    }
  }

  if (!config) return <p className="text-sm text-slate-500">{t('themes.loading')}</p>

  const themePluginIndex = findThemePluginIndex(config.plugins)
  const themePlugin = themePluginIndex === -1 ? undefined : config.plugins[themePluginIndex]
  const activeThemeId =
    themePlugin?.enabled && typeof themePlugin.options?.theme === 'string' ? themePlugin.options.theme : undefined

  function updatePlugin(next: PluginEntry): void {
    if (!config) return
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
    <div className="grid max-w-3xl gap-6">
      <PageHeader
        icon={TAB_ICONS.themes}
        title={t('themes.title')}
        description={t('projectLayout.descriptions.themes')}
        actions={
          <>
            {status === 'saved' && <span className="text-sm text-green-600 dark:text-green-400">{t('common.saved')}</span>}
            {status === 'error' && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
            <Button onClick={save} disabled={status === 'saving'}>
              {status === 'saving' ? t('common.saving') : t('common.save')}
            </Button>
          </>
        }
      />

      {themePlugin && (
        <div className="-mt-4">
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

function parseStyleSettingsSuffix(styleSettingsId: string[], key: string): string | null {
  for (const id of styleSettingsId) {
    if (key.startsWith(`${id}@@`)) return key.slice(id.length + 2)
  }
  return null
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
  const themeId = typeof plugin?.options?.theme === 'string' ? plugin.options.theme : undefined
  const [info, setInfo] = useState<ThemeStyleSettingsInfo | null | undefined>(undefined)
  const [savingName, setSavingName] = useState<string | null>(null)

  useEffect(() => {
    if (!themeId || !plugin?.enabled) {
      setInfo(null)
      return
    }
    setInfo(undefined)
    window.quartzGui.plugins.themeStyleSettingsInfo(projectPath, themeId).then(setInfo)
  }, [projectPath, themeId, plugin?.enabled])

  if (!plugin) {
    return (
      <Card>
        <h3 className="mb-1 text-sm font-semibold">{t('themes.active.title')}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('themes.active.none')}</p>
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
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('themes.active.disabledNote')}</p>
      </Card>
    )
  }

  const styleSettings = (plugin.options?.styleSettings as Record<string, unknown>) ?? {}

  function setStyleSettingsKey(fullKey: string, value: unknown): void {
    if (!plugin) return
    const nextStyleSettings = { ...styleSettings }
    if (value === undefined || value === '') delete nextStyleSettings[fullKey]
    else nextStyleSettings[fullKey] = value
    onChange({ ...plugin, options: { ...plugin.options, styleSettings: nextStyleSettings } })
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
            <button type="button" onClick={() => setSavingName(null)} className="text-xs text-slate-500 underline">
              {t('common.cancel')}
            </button>
          </div>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {t('themes.active.overrideNote', { source: String(plugin.source) })}
      </p>

      {info === undefined && <p className="mt-2 text-xs text-slate-500">{t('themes.active.checkingStyleSettings')}</p>}

      {info !== undefined && !hasStyleSettings && themeId && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('themes.active.noStyleSettingsNote', { themeId })}</p>
      )}

      {hasStyleSettings && info && (
        <div className="mt-3 rounded-md border border-black/[0.06] bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('themes.active.styleSettingsHeading', { ids: info.styleSettingsId.join(', ') })}
          </p>
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
          <CustomStyleSettingsRows
            styleSettingsId={info.styleSettingsId}
            styleSettings={styleSettings}
            classSettingKeys={info.classSettingKeys}
            onSet={setStyleSettingsKey}
          />
        </div>
      )}
    </Card>
  )
}

// Any settingId not matched by a class-toggle in the theme's classSettingKeys is treated by
// @quartz-themes/core as a literal CSS custom property override (e.g. key "secondary" emits
// `--secondary: <value>`; a "@@dark"/"@@light" suffix on the key scopes it to one mode) -
// verified directly against the compiled plugin. This lets the classic Quartz color names
// (light, secondary, tertiary, ...) be overridden here even when the theme has no dedicated
// setting for them.
function CustomStyleSettingsRows({
  styleSettingsId,
  styleSettings,
  classSettingKeys,
  onSet
}: {
  styleSettingsId: string[]
  styleSettings: Record<string, unknown>
  classSettingKeys: string[]
  onSet: (fullKey: string, value: unknown) => void
}): JSX.Element {
  const { t } = useTranslation()
  const classSettingKeySet = new Set(classSettingKeys)
  const customEntries = Object.entries(styleSettings).filter(([fullKey]) => {
    const suffix = parseStyleSettingsSuffix(styleSettingsId, fullKey)
    return suffix !== null && !classSettingKeySet.has(suffix)
  })

  const [draftKey, setDraftKey] = useState('')
  const [draftValue, setDraftValue] = useState('')

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('themes.active.cssVarsHeading')}</p>
      <div className="flex flex-col gap-1.5">
        {customEntries.map(([fullKey, value]) => {
          const suffix = parseStyleSettingsSuffix(styleSettingsId, fullKey) ?? fullKey
          return (
            <div key={fullKey} className="flex items-center gap-2">
              <span className="w-40 truncate font-mono text-xs" title={suffix}>
                {suffix}
              </span>
              <TextInput
                value={String(value)}
                onChange={(e) => onSet(fullKey, e.target.value)}
                className="w-32 text-xs"
              />
              <button type="button" onClick={() => onSet(fullKey, undefined)} className="text-xs text-slate-500 underline">
                {t('themes.active.removeLink')}
              </button>
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <TextInput
          value={draftKey}
          onChange={(e) => setDraftKey(e.target.value)}
          placeholder={t('themes.active.keyPlaceholder')}
          className="w-40 text-xs"
        />
        <TextInput
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          placeholder={t('themes.active.valuePlaceholder')}
          className="w-32 text-xs"
        />
        <Button
          variant="ghost"
          onClick={() => {
            if (!draftKey.trim() || !draftValue.trim()) return
            onSet(styleSettingsKey(styleSettingsId, draftKey.trim()), draftValue.trim())
            setDraftKey('')
            setDraftValue('')
          }}
        >
          {t('themes.active.addButton')}
        </Button>
      </div>
    </div>
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
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('themes.presets.description')}</p>
      {presets.length === 0 && <p className="text-xs text-slate-500">{t('themes.presets.none')}</p>}
      <div className="flex flex-col gap-1.5">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="flex items-center justify-between rounded-md border border-black/[0.06] px-2.5 py-1.5 text-sm dark:border-white/10"
          >
            <div>
              <span className="font-medium">{preset.name}</span>{' '}
              <span className="text-xs text-slate-500">{t('themes.presets.basisLabel', { base: preset.baseThemeId })}</span>
            </div>
            <div className="flex items-center gap-2">
              {preset.options.theme === activeThemeId ? (
                <Badge tone="green">{t('themes.presets.active')}</Badge>
              ) : (
                <Button variant="ghost" onClick={() => onApply(preset)}>
                  {t('themes.presets.apply')}
                </Button>
              )}
              <button type="button" onClick={() => remove(preset.id)} className="text-xs text-slate-500 underline">
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
  const [query, setQuery] = useState('')
  const [installingId, setInstallingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ThemeDetail | null | undefined>(undefined)

  useEffect(() => {
    window.quartzGui.themeMarketplace.list().then((result) => {
      setThemes(result)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!expandedId) return
    setDetail(undefined)
    window.quartzGui.themeMarketplace.detail(projectPath, expandedId).then(setDetail)
  }, [projectPath, expandedId])

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
  const filtered = q ? themes.filter((t) => t.id.toLowerCase().includes(q)) : themes
  const visible = filtered.slice(0, VISIBLE_THEME_LIMIT)

  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold">{t('themes.catalog.title')}</h3>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('themes.catalog.description')}</p>
      <TextInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('themes.catalog.searchPlaceholder')}
        className="w-full"
      />
      <div className="mt-2 max-h-80 overflow-y-auto rounded-md border border-black/[0.06] dark:border-white/10">
        {visible.map((listing) => {
          const isActive = listing.id === activeThemeId
          const isExpanded = expandedId === listing.id
          return (
            <div key={listing.id} className="border-b border-black/[0.04] last:border-b-0 dark:border-white/5">
              <div className="flex items-center justify-between px-2.5 py-1.5 text-sm">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : listing.id)}
                  className="flex items-center gap-2 font-mono text-xs hover:underline"
                >
                  {listing.id}
                  {listing.stars !== undefined && listing.stars > 0 && (
                    <span className="text-[11px] text-slate-400">★ {listing.stars}</span>
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
                <div className="border-t border-black/[0.04] bg-black/[0.02] px-2.5 py-2 text-xs dark:border-white/5 dark:bg-white/[0.02]">
                  {detail === undefined && <p className="text-slate-500">{t('themes.catalog.detailLoading')}</p>}
                  {detail === null && <p className="text-slate-500">{t('themes.catalog.detailNone')}</p>}
                  {detail && (
                    <div className="flex flex-col gap-1 text-slate-600 dark:text-slate-300">
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
          <p className="p-2 text-xs text-slate-500">{loading ? t('themes.loading') : t('themes.catalog.noResults')}</p>
        )}
      </div>
      {filtered.length > visible.length && (
        <p className="mt-1 text-xs text-slate-500">
          {t('themes.catalog.moreResults', { count: filtered.length - visible.length })}
        </p>
      )}
      {message && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{message}</p>}
    </Card>
  )
}

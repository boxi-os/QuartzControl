import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import type { Project, QuartzConfig } from '@shared/ipc-contract'
import { Button, PageHeader, SegmentedControl } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import { TAB_ICONS } from '../navConfig'
import { useProject } from '../ProjectLayout'
import Basics from './Basics'
import Theme from './Theme'
import Variables from './Variables'
import CustomCss from './CustomCss'

export type StylesTab = 'basics' | 'theme' | 'variables' | 'customCss'

const TAB_ORDER: StylesTab[] = ['basics', 'theme', 'variables', 'customCss']

function isTab(value: string | null): value is StylesTab {
  return value !== null && (TAB_ORDER as string[]).includes(value)
}

// Editing state for every styling layer lives here rather than in the four sub-tabs, because only
// one sub-tab is mounted at a time (switching unmounts the previous one) and all four ultimately
// write to just two places: quartz.config.yaml and quartz/styles/custom.scss. Lifting it keeps an
// unsaved draft alive across a tab switch, lets the cascade line above the tabs report what the
// other layers currently contain, and gives the page a single Save button instead of one per
// section - each sub-tab registers what "save" means for it via registerSave().
export interface StylesContextValue {
  project: Project
  config: QuartzConfig
  setConfig: (next: QuartzConfig) => void
  saveConfig: () => Promise<void>
  overrides: Record<string, { light: string; dark: string }>
  setOverrides: React.Dispatch<React.SetStateAction<Record<string, { light: string; dark: string }>>>
  scss: { path: string; content: string; dirty: boolean; staleOnDisk: boolean }
  setScssContent: (content: string) => void
  reloadScss: (force?: boolean) => Promise<void>
  discoveredKeys: string[]
  addDiscoveredKeys: (keys: string[]) => void
  registerSave: (fn: () => Promise<void>) => void
  goToTab: (tab: StylesTab) => void
}

const StylesContext = createContext<StylesContextValue | null>(null)

export function useStyles(): StylesContextValue {
  const value = useContext(StylesContext)
  if (!value) throw new Error('useStyles must be used inside the Styles route')
  return value
}

// The one place that knows how a Quartz theme plugin is recognised on this page - kept in sync with
// the same check in ProjectDashboard/Theme.tsx (source prefix, since @quartz-themes is a whole npm
// scope rather than one fixed plugin name).
export function activeThemeIdOf(config: QuartzConfig): string | undefined {
  const plugin = config.plugins.find((p) => typeof p.source === 'string' && p.source.startsWith('@quartz-themes/'))
  if (!plugin?.enabled) return undefined
  return typeof plugin.options?.theme === 'string' ? plugin.options.theme : undefined
}

export default function Styles(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const tab: StylesTab = isTab(rawTab) ? rawTab : 'basics'

  const [config, setConfig] = useState<QuartzConfig | null>(null)
  const [overrides, setOverrides] = useState<Record<string, { light: string; dark: string }>>({})
  const [scss, setScss] = useState<{ path: string; content: string; dirty: boolean; staleOnDisk: boolean } | null>(null)
  const [discoveredKeys, setDiscoveredKeys] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  // Assigned on every render of the active sub-tab (see registerSave below) - a ref rather than
  // state because changing it must never re-render the shell, which would remount the sub-tab.
  const saveRef = useRef<() => Promise<void>>(async () => {})

  useEffect(() => {
    window.quartzGui.config.get(project.path).then(setConfig)
    window.quartzGui.styles.get(project.path).then((info) => setScss({ ...info, dirty: false, staleOnDisk: false }))
    window.quartzGui.styles.getVariableOverrides(project.path).then((list) => {
      const next: Record<string, { light: string; dark: string }> = {}
      for (const o of list) next[o.key] = { light: o.light, dark: o.dark ?? o.light }
      setOverrides(next)
    })
  }, [project.path])

  const goToTab = useCallback(
    (next: StylesTab) => {
      setSearchParams(next === 'basics' ? {} : { tab: next }, { replace: true })
      setStatus('idle')
      setMessage(null)
    },
    [setSearchParams]
  )

  const registerSave = useCallback((fn: () => Promise<void>) => {
    saveRef.current = fn
  }, [])

  const setScssContent = useCallback((content: string) => {
    setScss((prev) => (prev ? { ...prev, content, dirty: true } : prev))
  }, [])

  const addDiscoveredKeys = useCallback((keys: string[]) => {
    setDiscoveredKeys((prev) => [...prev, ...keys.filter((k) => !prev.includes(k))])
  }, [])

  // Saving variable overrides and importing a local font both rewrite custom.scss behind the
  // editor's back (each replaces its own marker-delimited managed block), so the in-memory draft
  // has to be re-read afterwards or the next save from the CSS tab would write it straight back to
  // the pre-change state. An unsaved draft is never silently thrown away: it stays, flagged
  // staleOnDisk, and the CSS tab offers an explicit reload.
  const reloadScss = useCallback(
    async (force = false) => {
      const info = await window.quartzGui.styles.get(project.path)
      setScss((prev) => {
        if (prev?.dirty && !force) return { ...prev, staleOnDisk: true }
        return { ...info, dirty: false, staleOnDisk: false }
      })
    },
    [project.path]
  )

  const saveConfig = useCallback(async () => {
    if (!config) return
    await window.quartzGui.config.save(project.path, config)
  }, [config, project.path])

  async function save(): Promise<void> {
    setStatus('saving')
    setMessage(null)
    try {
      await saveRef.current()
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      setStatus('error')
      setMessage(formatIpcError(err))
    }
  }

  if (!config || !scss) return <p className="text-sm text-slate-500">{t('common.loading')}</p>

  const value: StylesContextValue = {
    project,
    config,
    setConfig,
    saveConfig,
    overrides,
    setOverrides,
    scss,
    setScssContent,
    reloadScss,
    discoveredKeys,
    addDiscoveredKeys,
    registerSave,
    goToTab
  }

  const themeId = activeThemeIdOf(config)
  const overrideCount = Object.keys(overrides).length

  return (
    <StylesContext.Provider value={value}>
      <div className="flex max-w-6xl flex-col">
        <PageHeader
          icon={TAB_ICONS.styles}
          title={t('projectLayout.tabs.styles')}
          description={t('projectLayout.descriptions.styles')}
          actions={
            <>
              {status === 'saved' && <span className="text-sm text-green-600 dark:text-green-400">{t('common.saved')}</span>}
              {status === 'error' && <span className="text-sm text-red-600 dark:text-red-400">{message}</span>}
              <Button onClick={save} disabled={status === 'saving'}>
                {status === 'saving' ? t('common.saving') : t('common.save')}
              </Button>
            </>
          }
        />

        <div className="mb-2 flex flex-wrap items-center gap-3">
          <SegmentedControl
            value={tab}
            onChange={goToTab}
            options={TAB_ORDER.map((key) => ({ value: key, label: t(`styles.tabs.${key}`) }))}
          />
        </div>
        <p className="mb-5 text-xs text-slate-500 dark:text-slate-400">
          {themeId ? t('styles.cascade.themeActive', { themeId }) : t('styles.cascade.themeInactive')}{' '}
          {overrideCount > 0 && t('styles.cascade.overrides', { count: overrideCount })}
        </p>

        {tab === 'basics' && <Basics />}
        {tab === 'theme' && <Theme />}
        {tab === 'variables' && <Variables />}
        {tab === 'customCss' && <CustomCss />}
      </div>
    </StylesContext.Provider>
  )
}

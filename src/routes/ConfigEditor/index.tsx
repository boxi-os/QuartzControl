import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { useProject } from '../ProjectLayout'
import type { PluginEntry, QuartzConfig } from '@shared/ipc-contract'
import { LAYOUT_BOX_SOURCE } from '@shared/projectImageBox'
import { Button, PageHeader, SegmentedControl } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import { useStickyState } from '../../state/uiState'
import { useSaveCommand } from '../../state/saveCommand'
import { UnsavedBadge, useUnsavedChanges } from '../../state/unsavedGuard'
import { TAB_ICONS } from '../navConfig'
import SiteSettings from './SiteSettings'
import ProjectImage from './ProjectImage'
import ContentFolder from './ContentFolder'
import Localization from './Localization'
import HandbookLink from '../../components/HandbookLink'

// Welches Kapitel diesen Reiter erklärt. Der Verweis im Kopf folgt dem offenen Reiter, nicht der
// Seite - zwei Reiter, zwei Kapitel. Das Kapitel zum Content-Ordner verlinkt seine Karte selbst.
const HANDBOOK = { site: 'site', localization: 'localization' } as const

// The things that describe *what* the site is rather than how it looks: its own settings, where
// its notes come from, and the wording of its fixed interface texts. They used to be three sidebar
// entries, then three sub-tabs here. The content folder was a tab of its own until 2026-09-18 and
// never more than one card on it - a screen that is a card is a card, so it now sits at the top of
// "Website", as the first thing the site is made of.
export type ConfigTab = 'site' | 'localization'

const TAB_ORDER: ConfigTab[] = ['site', 'localization']

function isTab(value: string | null): value is ConfigTab {
  return value !== null && (TAB_ORDER as string[]).includes(value)
}

// `?tab=content` is what every link into the content folder said until it moved, and a bookmark or
// an older in-app link still may: it means the tab that holds the card now.
const LEGACY_SITE_TAB = 'content'

export default function ConfigEditor(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  // Same split as the Styles page: the URL wins (so the /content and /localization redirects and
  // any in-app link land where they say), and the remembered tab only fills in when the URL says
  // nothing - which is exactly the sidebar's own NavLink, since it carries no search string.
  const [lastTab, setLastTab] = useStickyState<ConfigTab>('config.tab', 'site')
  const tab: ConfigTab = rawTab === LEGACY_SITE_TAB ? 'site' : isTab(rawTab) ? rawTab : isTab(lastTab) ? lastTab : 'site'

  const [config, setConfig] = useState<QuartzConfig | null>(null)
  // What the file held when it was read, so "unsaved" is a comparison. Stringified once per change
  // rather than per render, since a real project's config carries some fifty plugin entries.
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    setLoadError(null)
    window.quartzGui.config
      .get(project.path)
      .then((loaded) => {
        setConfig(loaded)
        setSavedSnapshot(JSON.stringify(loaded))
      })
      .catch((err) => setLoadError(formatIpcError(err)))
  }, [project.path])

  // Arriving at a tab through the URL has to be remembered too, or a deep link followed by a
  // sidebar round-trip drops the user on a tab they never chose.
  useEffect(() => {
    if (isTab(rawTab)) setLastTab(rawTab)
    if (rawTab === LEGACY_SITE_TAB) {
      setLastTab('site')
      setSearchParams({}, { replace: true })
    }
  }, [rawTab, setLastTab, setSearchParams])

  const dirty = useMemo(
    () => config !== null && savedSnapshot !== null && JSON.stringify(config) !== savedSnapshot,
    [config, savedSnapshot]
  )
  useUnsavedChanges(dirty)
  const savedPlugins = useMemo(
    () => (savedSnapshot === null ? [] : (JSON.parse(savedSnapshot) as QuartzConfig).plugins),
    [savedSnapshot]
  )
  // Cmd+S saves the same thing the button does, and is registered only while that button would do
  // something: no edits, a save already running, or a sub-tab that saves elsewhere means the
  // shortcut stays quiet rather than rewriting an unchanged file.
  useSaveCommand(tab === 'site' && dirty && status !== 'saving' ? save : null)

  const goToTab = useCallback(
    (next: ConfigTab) => {
      setSearchParams(next === 'site' ? {} : { tab: next }, { replace: true })
      setLastTab(next)
      setStatus('idle')
      setError(null)
    },
    [setSearchParams, setLastTab]
  )

  // `quartz plugin add` writes quartz.config.yaml itself, and this page holds a copy of it. So the
  // copy is saved first when it has edits (the confirmation said so), and read again afterwards -
  // the rule for a document a route owns: after anything Main writes to it, read it anew.
  async function installLayoutBox(): Promise<PluginEntry[]> {
    if (dirty && !(await save())) throw new Error(t('projectImage.header.saveFirstFailed'))
    const result = await window.quartzGui.plugins.add(project.path, LAYOUT_BOX_SOURCE)
    if (!result.success) throw new Error(result.output.slice(-600))
    const loaded = await window.quartzGui.config.get(project.path)
    setConfig(loaded)
    setSavedSnapshot(JSON.stringify(loaded))
    return loaded.plugins
  }

  // Returns whether it worked: the leave guard's "Speichern" needs to know before it navigates
  // away, and the error itself stays here in the header where the user can read it.
  async function save(): Promise<boolean> {
    if (!config) return false
    setStatus('saving')
    setError(null)
    try {
      await window.quartzGui.config.save(project.path, config)
      setSavedSnapshot(JSON.stringify(config))
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
      return true
    } catch (err) {
      setStatus('error')
      setError(formatIpcError(err))
      return false
    }
  }

  const tabBar = (
    <SegmentedControl
      label={t('common.viewSwitcher')}
      value={tab}
      onChange={goToTab}
      options={TAB_ORDER.map((key) => ({ value: key, label: t(`configEditor.tabs.${key}`) }))}
    />
  )

  return (
    <div className="flex flex-col">
      <PageHeader
        handbook={<HandbookLink page={HANDBOOK[tab]} />}
        icon={TAB_ICONS.config}
        title={t('projectLayout.tabs.config')}
        description={t(`configEditor.descriptions.${tab}`)}
        // Announced, unlike the badge and the button next to it - see PageHeader. Only the site
        // tab has a save of its own, so only it mounts the region.
        status={
          tab === 'site' ? (
            <>
              {status === 'saved' && <span className="text-sm text-green-600 dark:text-green-400">{t('common.saved')}</span>}
              {status === 'error' && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
            </>
          ) : undefined
        }
        actions={
          // Only the site form saves through this button - the other two tabs act on their own
          // (a folder change runs immediately, translations save per locale from their toolbar).
          tab === 'site' && (
            <>
              {dirty && status !== 'saving' && <UnsavedBadge />}
              <Button onClick={save} disabled={status === 'saving' || !config}>
                {status === 'saving' ? t('common.saving') : t('common.save')}
              </Button>
            </>
          )
        }
      />

      <div className="mb-5">{tabBar}</div>

      {tab === 'site' && (
        <>
          {/* Outside the config's own loading and error states: the content folder is not in
              quartz.config.yaml, and a config the app cannot read is no reason to hide where the
              notes come from. The same grid as the form below, so it lines up with it. */}
          <div className="mb-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            <ContentFolder />
          </div>
          {loadError && (
            <div className="max-w-xl">
              <p className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">{t('configEditor.loadError')}</p>
              <pre className="whitespace-pre-wrap rounded-md bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
                {loadError}
              </pre>
            </div>
          )}
          {!loadError && !config && <p className="text-sm text-text-muted">{t('configEditor.loading')}</p>}
          {config && (
            <>
              <SiteSettings
                configuration={config.configuration}
                onChange={(configuration) => setConfig({ ...config, configuration })}
                // The picture writes its files immediately, but two plugins make something of it:
                // the favicon, and the layout box that shows it in the header. Both live in the
                // config this page holds and saves, so the card reads this page's plugin list and
                // hands its header switch back as a change to the draft - never a second writer.
                // The one exception is installing the layout box, which only the CLI can do: that
                // saves pending edits first and reads the config anew, see installLayoutBox.
                image={
                  <ProjectImage
                    plugins={config.plugins}
                    savedPlugins={savedPlugins}
                    onPluginsChange={(update) => setConfig((current) => (current ? { ...current, plugins: update(current.plugins) } : current))}
                    onInstallLayoutBox={installLayoutBox}
                  />
                }
              />
              {/* Colors and fonts used to be a second tab here. They are the bottom layer of the
                  styling cascade, so they now live with the other three layers on the Styles page. */}
              <p className="mt-8 max-w-xl text-xs text-text-muted">
                {t('configEditor.themeMoved')}{' '}
                <Link to="../styles" className="underline">
                  {t('configEditor.themeMovedLink')}
                </Link>
              </p>
            </>
          )}
        </>
      )}
      {tab === 'localization' && <Localization />}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { useProject } from '../ProjectLayout'
import type { QuartzConfig } from '@shared/ipc-contract'
import { Button, PageHeader, SegmentedControl } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import { useStickyState } from '../../state/uiState'
import { UnsavedBadge, useUnsavedChanges } from '../../state/unsavedGuard'
import { TAB_ICONS } from '../navConfig'
import SiteSettings from './SiteSettings'
import ContentFolder from './ContentFolder'
import Localization from './Localization'

// The three things that describe *what* the site is rather than how it looks: its own settings,
// where its notes come from, and the wording of its fixed interface texts. They used to be three
// sidebar entries; two of them are a single card and a single form, so they are sub-tabs here.
export type ConfigTab = 'site' | 'content' | 'localization'

const TAB_ORDER: ConfigTab[] = ['site', 'content', 'localization']

function isTab(value: string | null): value is ConfigTab {
  return value !== null && (TAB_ORDER as string[]).includes(value)
}

export default function ConfigEditor(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  // Same split as the Styles page: the URL wins (so the /content and /localization redirects and
  // any in-app link land where they say), and the remembered tab only fills in when the URL says
  // nothing - which is exactly the sidebar's own NavLink, since it carries no search string.
  const [lastTab, setLastTab] = useStickyState<ConfigTab>('config.tab', 'site')
  const tab: ConfigTab = isTab(rawTab) ? rawTab : lastTab

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
  }, [rawTab, setLastTab])

  const dirty = useMemo(
    () => config !== null && savedSnapshot !== null && JSON.stringify(config) !== savedSnapshot,
    [config, savedSnapshot]
  )
  useUnsavedChanges(dirty)

  const goToTab = useCallback(
    (next: ConfigTab) => {
      setSearchParams(next === 'site' ? {} : { tab: next }, { replace: true })
      setLastTab(next)
      setStatus('idle')
      setError(null)
    },
    [setSearchParams, setLastTab]
  )

  async function save(): Promise<void> {
    if (!config) return
    setStatus('saving')
    setError(null)
    try {
      await window.quartzGui.config.save(project.path, config)
      setSavedSnapshot(JSON.stringify(config))
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      setStatus('error')
      setError(formatIpcError(err))
    }
  }

  const tabBar = (
    <SegmentedControl
      value={tab}
      onChange={goToTab}
      options={TAB_ORDER.map((key) => ({ value: key, label: t(`configEditor.tabs.${key}`) }))}
    />
  )

  return (
    <div className="flex flex-col">
      <PageHeader
        icon={TAB_ICONS.config}
        title={t('projectLayout.tabs.config')}
        description={t(`configEditor.descriptions.${tab}`)}
        actions={
          // Only the site form saves through this button - the other two tabs act on their own
          // (a folder change runs immediately, translations save per locale from their toolbar).
          tab === 'site' && (
            <>
              {status === 'saved' && <span className="text-sm text-green-600 dark:text-green-400">{t('common.saved')}</span>}
              {status === 'error' && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
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
          {loadError && (
            <div className="max-w-xl">
              <p className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">{t('configEditor.loadError')}</p>
              <pre className="whitespace-pre-wrap rounded-md bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
                {loadError}
              </pre>
              <p className="mt-2 text-sm text-slate-500">{t('configEditor.loadErrorHint')}</p>
            </div>
          )}
          {!loadError && !config && <p className="text-sm text-slate-500">{t('configEditor.loading')}</p>}
          {config && (
            <>
              <SiteSettings
                configuration={config.configuration}
                onChange={(configuration) => setConfig({ ...config, configuration })}
              />
              {/* Colors and fonts used to be a second tab here. They are the bottom layer of the
                  styling cascade, so they now live with the other three layers on the Styles page. */}
              <p className="mt-8 max-w-xl text-xs text-slate-500 dark:text-slate-400">
                {t('configEditor.themeMoved')}{' '}
                <Link to="../styles" className="underline">
                  {t('configEditor.themeMovedLink')}
                </Link>
              </p>
            </>
          )}
        </>
      )}
      {tab === 'content' && <ContentFolder />}
      {tab === 'localization' && <Localization />}
    </div>
  )
}

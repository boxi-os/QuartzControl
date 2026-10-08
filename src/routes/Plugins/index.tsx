import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useSearchParams } from 'react-router-dom'
import { PageHeader, SegmentedControl } from '../../components/ui'
import { primeStickyState, useStickyState } from '../../state/uiState'
import { TAB_ICONS } from '../navConfig'
import Installed from './Installed'
import Marketplace from './Marketplace'
import Navigations from './Navigations'
import ExtraContent from './ExtraContent'
import Multilanguage from './Multilanguage'
import HandbookLink from '../../components/HandbookLink'

// Beide Reiter stehen im selben Kapitel - der Marktplatz ist dort der letzte Abschnitt.
const HANDBOOK = { installed: 'plugins', navigations: 'plugins', extras: 'plugins', languages: 'plugins', marketplace: 'plugins' } as const

// Finding a plugin and configuring it is one job, so it is one page. Updating is not: that is
// maintenance, it covers the Quartz core as much as the plugins, and it lives next to Backups.
export type PluginsTab = 'installed' | 'navigations' | 'extras' | 'languages' | 'marketplace'

// The editors for this project's own plugins sit between the list and the marketplace: they are a
// closer look at entries of the list (plan 1.1, phases 5-7).
const TAB_ORDER: PluginsTab[] = ['installed', 'navigations', 'extras', 'languages', 'marketplace']

function isTab(value: string | null): value is PluginsTab {
  return value !== null && (TAB_ORDER as string[]).includes(value)
}

export default function Plugins(): JSX.Element {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { pathname } = useLocation()
  const rawTab = searchParams.get('tab')
  // URL first, remembered tab second - see the same split on the Styles and Konfiguration pages.
  const [lastTab, setLastTab] = useStickyState<PluginsTab>('plugins.tab', 'installed')
  const tab: PluginsTab = isTab(rawTab) ? rawTab : lastTab

  useEffect(() => {
    if (isTab(rawTab)) setLastTab(rawTab)
  }, [rawTab, setLastTab])

  const goToTab = useCallback(
    (next: PluginsTab) => {
      setSearchParams(next === 'installed' ? {} : { tab: next }, { replace: true })
      setLastTab(next)
    },
    [setSearchParams, setLastTab]
  )

  // From an editor tab to the same entry in the plugin list. The list mounts on the tab switch,
  // which is when it reads its selection.
  const showInList = (key: string): void => {
    primeStickyState(pathname, 'plugins.selected', key)
    goToTab('installed')
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        handbook={<HandbookLink page={HANDBOOK[tab]} />}
        icon={TAB_ICONS.plugins}
        title={t('projectLayout.tabs.plugins')}
        description={t(`plugins.descriptions.${tab}`)}
      />

      <div className="mb-5">
        <SegmentedControl
          label={t('common.viewSwitcher')}
          value={tab}
          onChange={goToTab}
          options={TAB_ORDER.map((key) => ({ value: key, label: t(`plugins.tabs.${key}`) }))}
        />
      </div>

      {tab === 'installed' && <Installed />}
      {tab === 'navigations' && <Navigations onShowAllOptions={showInList} />}
      {tab === 'extras' && <ExtraContent onShowAllOptions={showInList} />}
      {tab === 'languages' && <Multilanguage onShowAllOptions={showInList} />}
      {tab === 'marketplace' && <Marketplace />}
    </div>
  )
}

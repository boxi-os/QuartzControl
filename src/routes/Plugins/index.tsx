import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { PageHeader, SegmentedControl } from '../../components/ui'
import { useStickyState } from '../../state/uiState'
import { TAB_ICONS } from '../navConfig'
import Installed from './Installed'
import Marketplace from './Marketplace'
import Updates from './Updates'

// Finding, configuring and updating an extension is one job, so it is one page. Updates lives
// here too even though it also updates Quartz itself: everything it lists is something that was
// installed, and its plugin half is the same lockfile the other two tabs write.
export type PluginsTab = 'installed' | 'marketplace' | 'updates'

const TAB_ORDER: PluginsTab[] = ['installed', 'marketplace', 'updates']

function isTab(value: string | null): value is PluginsTab {
  return value !== null && (TAB_ORDER as string[]).includes(value)
}

export default function Plugins(): JSX.Element {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
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

  return (
    <div className="flex flex-col">
      <PageHeader
        icon={TAB_ICONS.plugins}
        title={t('projectLayout.tabs.plugins')}
        description={t(`plugins.descriptions.${tab}`)}
      />

      <div className="mb-5">
        <SegmentedControl
          value={tab}
          onChange={goToTab}
          options={TAB_ORDER.map((key) => ({ value: key, label: t(`plugins.tabs.${key}`) }))}
        />
      </div>

      {tab === 'installed' && <Installed />}
      {tab === 'marketplace' && <Marketplace />}
      {tab === 'updates' && <Updates />}
    </div>
  )
}

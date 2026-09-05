import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, RefreshCw, Search } from 'lucide-react'
import { useProject } from '../ProjectLayout'
import { useStickyState } from '../../state/uiState'
import type { MarketplacePlugin } from '@shared/ipc-contract'
import { Badge, Button, Card, TextInput } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import { normalizedRepoId } from './pluginSource'

// The catalog is every repository of the quartz-community organisation, and most of what is in
// there is not installable: the core itself (`v5`, archived), the shared libraries
// (`types`/`runtime`/`utils`), a `registry`, a `plugin-template`, an awesome-list and a few forks.
// 47 of the 63 repositories carry the `quartz-plugin` topic, which is the org's own marker for
// "this is a plugin" - so that is what decides which list a result lands in. It is a split rather
// than a filter because the marker is not perfect either (a forked plugin can be missing it), and
// hiding a real plugin is worse than listing an odd repository under "other".
const PLUGIN_TOPIC = 'quartz-plugin'

function isPlugin(plugin: MarketplacePlugin): boolean {
  return (plugin.topics ?? []).includes(PLUGIN_TOPIC)
}

export default function PluginsMarketplace(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  // The search term survives a trip to another area (see useStickyState) - the results themselves
  // are refetched, so what is shown is never stale.
  const [query, setQuery] = useStickyState('marketplace.query', '')
  // null until the first fetch answers: an empty array renders "nothing found", which is a false
  // answer for the second or two the catalog takes to arrive - measured in the running app.
  const [results, setResults] = useState<MarketplacePlugin[] | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set())
  const [installing, setInstalling] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showOther, setShowOther] = useStickyState('marketplace.showOther', false)
  // Installing by hand used to live on the Installed tab, unlabelled, in the spot where a search
  // box belongs. It is the same job as the catalog below - find a plugin and add it - and it is
  // the only way to reach a plugin outside this one organisation, which the catalog cannot show.
  const [source, setSource] = useStickyState('marketplace.source', '')
  const [addingSource, setAddingSource] = useState(false)

  async function loadInstalled(): Promise<void> {
    const config = await window.quartzGui.config.get(project.path)
    const ids = config.plugins.map((p) => normalizedRepoId(p.source)).filter((id): id is string => id !== null)
    setInstalledIds(new Set(ids))
  }

  useEffect(() => {
    loadInstalled()
  }, [project.path])

  // Fetched once, not per keystroke. The catalog is the org's ~60 repositories and the search box
  // is a substring match over them, so filtering happens below in useMemo: an effect keyed on
  // `query` put an IPC round trip on every character and - because a failed catalog fetch is
  // deliberately never cached in main - a GitHub request on every character whenever the API was
  // unreachable, with no ordering guarantee between the overlapping answers.
  //
  // No token passed from here either: it is a credential, and main resolves it from the
  // connection store itself (see connectionsService.getGithubToken).
  useEffect(() => {
    window.quartzGui.marketplace.list().then((result) => {
      setResults(result.plugins)
      setUnavailable(result.unavailable)
    })
  }, [])

  // The catalog is cached for fifteen minutes in main, so a plugin published in the meantime is
  // otherwise unreachable without restarting the app.
  async function refresh(): Promise<void> {
    setRefreshing(true)
    try {
      await window.quartzGui.marketplace.refresh()
      const result = await window.quartzGui.marketplace.list()
      setResults(result.plugins)
      setUnavailable(result.unavailable)
    } finally {
      setRefreshing(false)
    }
  }

  async function install(plugin: MarketplacePlugin): Promise<void> {
    setInstalling(plugin.fullName)
    try {
      const result = await window.quartzGui.plugins.add(project.path, `github:${plugin.fullName}`)
      setMessage(result.success ? t('pluginsMarketplace.installedMessage', { name: plugin.name }) : result.output)
      if (result.success) await loadInstalled()
    } catch (err) {
      setMessage(formatIpcError(err))
    } finally {
      setInstalling(null)
    }
  }

  async function addFromSource(): Promise<void> {
    const trimmed = source.trim()
    if (!trimmed) return
    setAddingSource(true)
    try {
      const result = await window.quartzGui.plugins.add(project.path, trimmed)
      setMessage(result.success ? t('pluginsMarketplace.installedMessage', { name: trimmed }) : result.output)
      if (result.success) {
        setSource('')
        await loadInstalled()
      }
    } catch (err) {
      setMessage(formatIpcError(err))
    } finally {
      setAddingSource(false)
    }
  }

  const [plugins, other] = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = (results ?? []).filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.fullName.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q)
    )
    // Archived repositories are not offered as plugins even if they carry the topic - the org's
    // archived entry is the Quartz core itself, and "install" on it would be nonsense.
    const pluginResults = list.filter((r) => isPlugin(r) && !r.archived)
    const rest = list.filter((r) => !pluginResults.includes(r))
    const byStars = (a: MarketplacePlugin, b: MarketplacePlugin): number => (b.stars ?? 0) - (a.stars ?? 0)
    return [[...pluginResults].sort(byStars), [...rest].sort(byStars)]
  }, [results, query])

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="relative w-full max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
            aria-hidden
          />
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('pluginsMarketplace.searchPlaceholder')}
            className="w-full pl-8"
          />
        </div>
        <Button variant="ghost" onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} aria-hidden />
          {refreshing ? t('pluginsMarketplace.refreshing') : t('pluginsMarketplace.refresh')}
        </Button>
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-text-secondary">
            {t('pluginsMarketplace.addFromGithub')}
          </span>
          <div className="flex gap-2">
            <TextInput
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={t('pluginsMarketplace.addPlaceholder')}
              className="w-64 font-mono"
            />
            <Button onClick={addFromSource} disabled={addingSource || !source.trim()}>
              {addingSource ? t('pluginsMarketplace.installing') : t('pluginsMarketplace.add')}
            </Button>
          </div>
        </div>
      </div>

      {unavailable && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {t('pluginsMarketplace.unavailable')}
        </p>
      )}
      {message && <p className="mb-4 text-sm text-text-secondary">{message}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {plugins.map((plugin) => (
          <ResultCard
            key={plugin.fullName}
            plugin={plugin}
            installed={installedIds.has(plugin.fullName.toLowerCase())}
            installing={installing === plugin.fullName}
            onInstall={() => install(plugin)}
          />
        ))}
      </div>
      {results === null && <p className="text-sm text-text-muted">{t('pluginsMarketplace.loading')}</p>}
      {results !== null && plugins.length === 0 && (
        <p className="text-sm text-text-muted">{t('pluginsMarketplace.noResults')}</p>
      )}

      {other.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowOther((v) => !v)}
            className="text-[13px] font-medium text-text-muted hover:text-text"
          >
            {showOther
              ? t('pluginsMarketplace.hideOther', { count: other.length })
              : t('pluginsMarketplace.showOther', { count: other.length })}
          </button>
          <p className="mt-1 max-w-3xl text-xs text-text-muted">{t('pluginsMarketplace.otherDescription')}</p>
          {showOther && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {other.map((plugin) => (
                <ResultCard
                  key={plugin.fullName}
                  plugin={plugin}
                  installed={installedIds.has(plugin.fullName.toLowerCase())}
                  installing={installing === plugin.fullName}
                  onInstall={() => install(plugin)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ResultCard({
  plugin,
  installed,
  installing,
  onInstall
}: {
  plugin: MarketplacePlugin
  installed: boolean
  installing: boolean
  onInstall: () => void
}): JSX.Element {
  const { t } = useTranslation()
  return (
    // flex-col + mt-auto on the footer: without it the install button sat directly under a
    // description of whatever length, so no two buttons in a row lined up.
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{plugin.name}</p>
        {installed && <Badge tone="green">{t('pluginsMarketplace.installed')}</Badge>}
        {!installed && plugin.archived && <Badge tone="amber">{t('pluginsMarketplace.archived')}</Badge>}
      </div>
      <a
        href={plugin.url}
        target="_blank"
        rel="noreferrer"
        title={t('pluginsMarketplace.openRepo')}
        className="inline-flex w-fit items-center gap-1 text-xs text-text-muted hover:text-blue-600 dark:hover:text-blue-400"
      >
        {plugin.fullName}
        <ExternalLink size={11} aria-hidden />
      </a>
      {plugin.description && <p className="mt-1 text-sm text-text-secondary">{plugin.description}</p>}
      <div className="mt-3 flex items-center justify-between pt-1">
        <span className="text-xs text-text-muted">★ {plugin.stars ?? 0}</span>
        {/* An installed plugin says so once, in the badge at the top. The disabled button that used
            to sit here repeated the same word a second time in every card of a full catalog. */}
        {!installed && (
          <Button variant="ghost" onClick={onInstall} disabled={installing}>
            {installing ? t('pluginsMarketplace.installing') : t('pluginsMarketplace.install')}
          </Button>
        )}
      </div>
    </Card>
  )
}

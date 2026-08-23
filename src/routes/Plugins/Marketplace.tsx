import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useProject } from '../ProjectLayout'
import { useAppStore } from '../../state/store'
import type { MarketplacePlugin, PluginEntry } from '@shared/ipc-contract'
import { Badge, Button, Card, TextInput } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'

// Normalizes any plugin source form (github: string, {repo} object, or the built-in
// "@quartz-community/x" shorthand - which really is the quartz-community/x repo, just
// bundled instead of `plugin add`ed) down to a lowercase "owner/repo" for comparing
// against a marketplace result's fullName.
function normalizedRepoId(source: PluginEntry['source']): string | null {
  let raw = typeof source === 'string' ? source : source.repo
  raw = raw
    .replace(/^git\+/, '')
    .replace(/^github:/, '')
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/^@/, '')
  raw = raw.split('#')[0].replace(/\.git$/, '')
  return /^[^/]+\/[^/]+$/.test(raw) ? raw.toLowerCase() : null
}

export default function PluginsMarketplace(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const { settings, loadSettings } = useAppStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MarketplacePlugin[]>([])
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set())
  const [installing, setInstalling] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function loadInstalled(): Promise<void> {
    const config = await window.quartzGui.config.get(project.path)
    const ids = config.plugins.map((p) => normalizedRepoId(p.source)).filter((id): id is string => id !== null)
    setInstalledIds(new Set(ids))
  }

  useEffect(() => {
    loadSettings()
    loadInstalled()
  }, [loadSettings, project.path])

  useEffect(() => {
    window.quartzGui.marketplace.search(query, settings.githubToken).then(setResults)
  }, [query, settings.githubToken])

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

  return (
    <div className="max-w-3xl">
      <Link to=".." relative="path" className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white">
        {t('pluginsMarketplace.backToInstalled')}
      </Link>
      <div className="my-4">
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('pluginsMarketplace.searchPlaceholder')}
          className="w-full"
        />
      </div>

      {message && <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{message}</p>}

      <div className="grid grid-cols-2 gap-3">
        {results.map((plugin) => {
          const isInstalled = installedIds.has(plugin.fullName.toLowerCase())
          return (
            <Card key={plugin.fullName}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{plugin.name}</p>
                {isInstalled && <Badge tone="green">{t('pluginsMarketplace.installed')}</Badge>}
              </div>
              <p className="text-xs text-slate-500">{plugin.fullName}</p>
              {plugin.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{plugin.description}</p>}
              <div className="mt-3 flex items-center justify-between">
                {plugin.stars != null && <span className="text-xs text-slate-400">★ {plugin.stars}</span>}
                <Button
                  variant="ghost"
                  onClick={() => install(plugin)}
                  disabled={installing === plugin.fullName || isInstalled}
                >
                  {isInstalled
                    ? t('pluginsMarketplace.installed')
                    : installing === plugin.fullName
                      ? t('pluginsMarketplace.installing')
                      : t('pluginsMarketplace.install')}
                </Button>
              </div>
            </Card>
          )
        })}
        {results.length === 0 && <p className="text-sm text-slate-500">{t('pluginsMarketplace.noResults')}</p>}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProject } from '../ProjectLayout'
import { useAppStore } from '../../state/store'
import type { MarketplacePlugin } from '@shared/ipc-contract'
import { Button, Card, TextInput } from '../../components/ui'

export default function PluginsMarketplace(): JSX.Element {
  const project = useProject()
  const { settings, loadSettings } = useAppStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MarketplacePlugin[]>([])
  const [installing, setInstalling] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    window.quartzGui.marketplace.search(query, settings.githubToken).then(setResults)
  }, [query, settings.githubToken])

  async function install(plugin: MarketplacePlugin): Promise<void> {
    setInstalling(plugin.fullName)
    const result = await window.quartzGui.plugins.add(project.path, `github:${plugin.fullName}`)
    setInstalling(null)
    setMessage(result.success ? `${plugin.name} installiert.` : result.output)
  }

  return (
    <div className="max-w-3xl">
      <Link to=".." relative="path" className="text-sm text-slate-500 hover:text-slate-800">
        ← Installierte Plugins
      </Link>
      <div className="my-4">
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Plugins durchsuchen…"
          className="w-full"
        />
      </div>

      {message && <p className="mb-4 text-sm text-slate-600">{message}</p>}

      <div className="grid grid-cols-2 gap-3">
        {results.map((plugin) => (
          <Card key={plugin.fullName}>
            <p className="font-medium">{plugin.name}</p>
            <p className="text-xs text-slate-500">{plugin.fullName}</p>
            {plugin.description && <p className="mt-1 text-sm text-slate-600">{plugin.description}</p>}
            <div className="mt-3 flex items-center justify-between">
              {plugin.stars != null && <span className="text-xs text-slate-400">★ {plugin.stars}</span>}
              <Button variant="ghost" onClick={() => install(plugin)} disabled={installing === plugin.fullName}>
                {installing === plugin.fullName ? 'Installiere…' : 'Installieren'}
              </Button>
            </div>
          </Card>
        ))}
        {results.length === 0 && <p className="text-sm text-slate-500">Keine Ergebnisse.</p>}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProject } from '../ProjectLayout'
import type { PluginEntry, QuartzConfig } from '@shared/ipc-contract'
import { Badge, Button, Card, TextInput } from '../../components/ui'

function sourceLabel(source: PluginEntry['source']): string {
  if (typeof source === 'string') return source
  return [source.repo, source.ref ? `#${source.ref}` : '', source.subdir ? ` (${source.subdir})` : ''].join('')
}

export default function PluginsInstalled(): JSX.Element {
  const project = useProject()
  const [config, setConfig] = useState<QuartzConfig | null>(null)
  const [newSource, setNewSource] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function reload(): Promise<void> {
    setConfig(await window.quartzGui.config.get(project.path))
  }

  useEffect(() => {
    reload()
  }, [project.path])

  async function addPlugin(): Promise<void> {
    if (!newSource.trim()) return
    setBusy(true)
    const result = await window.quartzGui.plugins.add(project.path, newSource.trim())
    setBusy(false)
    setMessage(result.success ? null : result.output)
    setNewSource('')
    await reload()
  }

  async function toggleEnabled(plugin: PluginEntry): Promise<void> {
    setBusy(true)
    const result = plugin.enabled
      ? await window.quartzGui.plugins.disable(project.path, plugin.name)
      : await window.quartzGui.plugins.enable(project.path, plugin.name)
    setBusy(false)
    setMessage(result.success ? null : result.output)
    await reload()
  }

  async function removePlugin(plugin: PluginEntry): Promise<void> {
    if (!confirm(`Plugin "${plugin.name}" wirklich entfernen?`)) return
    setBusy(true)
    const result = await window.quartzGui.plugins.remove(project.path, plugin.name)
    setBusy(false)
    setMessage(result.success ? null : result.output)
    await reload()
  }

  async function setOrder(plugin: PluginEntry, order: number): Promise<void> {
    if (!config) return
    const plugins = config.plugins.map((p) => (p.name === plugin.name ? { ...p, order } : p))
    await window.quartzGui.config.save(project.path, { ...config, plugins })
    await reload()
  }

  async function setOption(plugin: PluginEntry, key: string, value: string): Promise<void> {
    setBusy(true)
    const result = await window.quartzGui.plugins.configure(project.path, plugin.name, key, value)
    setBusy(false)
    setMessage(result.success ? null : result.output)
    await reload()
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <TextInput
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            placeholder="github:owner/repo"
            className="w-72"
          />
          <Button onClick={addPlugin} disabled={busy || !newSource.trim()}>
            Hinzufügen
          </Button>
        </div>
        <Link to="marketplace" className="text-sm text-slate-600 hover:underline">
          Marktplatz durchsuchen →
        </Link>
      </div>

      {message && <p className="mb-4 text-sm text-red-600">{message}</p>}

      <div className="flex flex-col gap-3">
        {config?.plugins.length === 0 && <p className="text-sm text-slate-500">Keine Plugins installiert.</p>}
        {config?.plugins.map((plugin) => (
          <Card key={plugin.name}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{plugin.name}</p>
                <p className="text-xs text-slate-500">{sourceLabel(plugin.source)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={plugin.enabled ? 'green' : 'slate'}>{plugin.enabled ? 'Aktiv' : 'Deaktiviert'}</Badge>
                <label className="flex items-center gap-1 text-xs text-slate-500">
                  Reihenfolge
                  <input
                    type="number"
                    defaultValue={plugin.order ?? 0}
                    onBlur={(e) => setOrder(plugin, Number(e.target.value))}
                    className="w-16 rounded border border-slate-300 px-1.5 py-0.5"
                  />
                </label>
                <Button variant="ghost" onClick={() => toggleEnabled(plugin)} disabled={busy}>
                  {plugin.enabled ? 'Deaktivieren' : 'Aktivieren'}
                </Button>
                <Button variant="danger" onClick={() => removePlugin(plugin)} disabled={busy}>
                  Entfernen
                </Button>
              </div>
            </div>

            <OptionsEditor plugin={plugin} onSave={(key, value) => setOption(plugin, key, value)} />
          </Card>
        ))}
      </div>
    </div>
  )
}

function OptionsEditor({
  plugin,
  onSave
}: {
  plugin: PluginEntry
  onSave: (key: string, value: string) => void
}): JSX.Element {
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const options = plugin.options ?? {}

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      {Object.entries(options).map(([k, v]) => (
        <div key={k} className="mb-1 flex items-center gap-2 text-xs text-slate-600">
          <span className="w-32 font-mono">{k}</span>
          <span className="font-mono">{String(v)}</span>
        </div>
      ))}
      <div className="mt-2 flex gap-2">
        <TextInput placeholder="Option" value={key} onChange={(e) => setKey(e.target.value)} className="w-32" />
        <TextInput placeholder="Wert" value={value} onChange={(e) => setValue(e.target.value)} className="w-32" />
        <Button
          variant="ghost"
          disabled={!key.trim()}
          onClick={() => {
            onSave(key.trim(), value)
            setKey('')
            setValue('')
          }}
        >
          Setzen
        </Button>
      </div>
    </div>
  )
}

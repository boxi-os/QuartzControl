import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProject } from '../ProjectLayout'
import type { PluginEntry, QuartzConfig } from '@shared/ipc-contract'
import { Badge, Button, Card, TextInput } from '../../components/ui'

function sourceLabel(source: PluginEntry['source']): string {
  if (typeof source === 'string') return source
  return [source.repo, source.ref ? `#${source.ref}` : '', source.subdir ? ` (${source.subdir})` : ''].join('')
}

function optionValueToText(value: unknown): string {
  return typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)
}

export default function PluginsInstalled(): JSX.Element {
  const project = useProject()
  const [config, setConfig] = useState<QuartzConfig | null>(null)
  const [newSource, setNewSource] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function reload(): Promise<void> {
    try {
      setConfig(await window.quartzGui.config.get(project.path))
      setLoadError(null)
    } catch (err) {
      setLoadError(String(err))
    }
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

  // Two config entries can derive the same display name (e.g. a built-in "@quartz-community/explorer"
  // alongside a separately `plugin add`ed "github:quartz-community/explorer"), so any mutation that
  // writes the config array directly targets the array index, not the derived name, to avoid touching
  // the wrong (or both) entries. CLI-based actions (remove/configure) stay name-based - verified that
  // `quartz plugin remove/config <name>` only ever affects the actually-tracked-installed entry, not
  // a same-named built-in one.
  async function toggleEnabled(index: number): Promise<void> {
    if (!config) return
    setBusy(true)
    const plugins = config.plugins.map((p, i) => (i === index ? { ...p, enabled: !p.enabled } : p))
    await window.quartzGui.config.save(project.path, { ...config, plugins })
    setBusy(false)
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

  async function setOrder(index: number, order: number): Promise<void> {
    if (!config) return
    const plugins = config.plugins.map((p, i) => (i === index ? { ...p, order } : p))
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

  if (loadError) {
    return (
      <div className="max-w-xl">
        <p className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">quartz.config.yaml konnte nicht gelesen werden.</p>
        <pre className="whitespace-pre-wrap rounded-md bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {loadError}
        </pre>
      </div>
    )
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
        <Link to="marketplace" className="text-sm text-slate-600 hover:underline dark:text-slate-300">
          Marktplatz durchsuchen →
        </Link>
      </div>

      {message && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{message}</p>}

      <div className="flex flex-col gap-3">
        {config?.plugins.length === 0 && <p className="text-sm text-slate-500">Keine Plugins installiert.</p>}
        {config?.plugins.map((plugin, index) => (
          <Card key={index}>
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
                    onBlur={(e) => setOrder(index, Number(e.target.value))}
                    className="w-16 rounded border border-black/10 bg-white px-1.5 py-0.5 dark:border-white/10 dark:bg-white/5"
                  />
                </label>
                <Button variant="ghost" onClick={() => toggleEnabled(index)} disabled={busy}>
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
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const options = plugin.options ?? {}

  return (
    <div className="mt-3 border-t border-black/10 pt-3 dark:border-white/10">
      {Object.entries(options).map(([key, value]) => {
        const initial = optionValueToText(value)
        return (
          <div key={key} className="mb-1.5 flex items-center gap-2 text-xs">
            <span className="w-40 shrink-0 truncate font-mono text-slate-500">{key}</span>
            <TextInput
              defaultValue={initial}
              onBlur={(e) => {
                if (e.target.value !== initial) onSave(key, e.target.value)
              }}
              className="w-56 font-mono"
            />
          </div>
        )
      })}
      <div className="mt-2 flex gap-2">
        <TextInput placeholder="Neue Option" value={newKey} onChange={(e) => setNewKey(e.target.value)} className="w-40" />
        <TextInput placeholder="Wert" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="w-40" />
        <Button
          variant="ghost"
          disabled={!newKey.trim()}
          onClick={() => {
            onSave(newKey.trim(), newValue)
            setNewKey('')
            setNewValue('')
          }}
        >
          Hinzufügen
        </Button>
      </div>
    </div>
  )
}

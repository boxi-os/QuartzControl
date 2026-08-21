import { useEffect, useState } from 'react'
import { useProject } from '../ProjectLayout'
import type { QuartzConfig } from '@shared/ipc-contract'
import { Button } from '../../components/ui'
import SiteSettings from './SiteSettings'
import ThemeEditor from './ThemeEditor'

export default function ConfigEditor(): JSX.Element {
  const project = useProject()
  const [config, setConfig] = useState<QuartzConfig | null>(null)
  const [tab, setTab] = useState<'site' | 'theme'>('site')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.quartzGui.config.get(project.path).then(setConfig)
  }, [project.path])

  async function save(): Promise<void> {
    if (!config) return
    setStatus('saving')
    setError(null)
    try {
      await window.quartzGui.config.save(project.path, config)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      setStatus('error')
      setError(String(err))
    }
  }

  if (!config) return <p className="text-sm text-slate-500">Lade Konfiguration…</p>

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1">
          {(['site', 'theme'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                tab === t ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t === 'site' ? 'Website' : 'Theme'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {status === 'saved' && <span className="text-sm text-green-600">Gespeichert.</span>}
          {status === 'error' && <span className="text-sm text-red-600">{error}</span>}
          <Button onClick={save} disabled={status === 'saving'}>
            {status === 'saving' ? 'Speichere…' : 'Speichern'}
          </Button>
        </div>
      </div>

      {tab === 'site' && (
        <SiteSettings
          configuration={config.configuration}
          onChange={(configuration) => setConfig({ ...config, configuration })}
        />
      )}
      {tab === 'theme' && <ThemeEditor theme={config.theme} onChange={(theme) => setConfig({ ...config, theme })} />}
    </div>
  )
}

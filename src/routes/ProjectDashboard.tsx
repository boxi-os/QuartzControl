import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ContentStatus, ServerStatus } from '@shared/ipc-contract'
import { useProject } from './ProjectLayout'
import { Badge, Card } from '../components/ui'

const SERVER_LABEL: Record<ServerStatus['state'], string> = {
  stopped: 'Gestoppt',
  starting: 'Startet…',
  running: 'Läuft',
  stopping: 'Stoppt…',
  error: 'Fehler'
}

export default function ProjectDashboard(): JSX.Element {
  const project = useProject()
  const [server, setServer] = useState<ServerStatus>({ state: 'stopped' })
  const [content, setContent] = useState<ContentStatus | null>(null)

  useEffect(() => {
    window.quartzGui.server.status(project.id).then(setServer)
    window.quartzGui.content.status(project.path).then(setContent)
    return window.quartzGui.server.onStatus((projectId, status) => {
      if (projectId === project.id) setServer(status)
    })
  }, [project.id, project.path])

  return (
    <div className="grid max-w-3xl gap-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium">Dev-Server</h2>
            <p className="text-sm text-slate-500">
              {server.state === 'running' && server.options
                ? `http://${server.options.host}:${server.options.port}`
                : 'Nicht erreichbar'}
            </p>
          </div>
          <Badge tone={server.state === 'running' ? 'green' : server.state === 'error' ? 'red' : 'slate'}>
            {SERVER_LABEL[server.state]}
          </Badge>
        </div>
        <Link to="server" className="mt-2 inline-block text-sm text-slate-600 hover:underline">
          Zur Build- & Server-Steuerung →
        </Link>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium">Content-Ordner</h2>
            <p className="text-sm text-slate-500">
              {!content?.exists && 'Nicht vorhanden'}
              {content?.exists && !content.isSymlink && `Echter Ordner${content.fileCount != null ? ` · ${content.fileCount} Dateien` : ''}`}
              {content?.exists && content.isSymlink && `Symlink → ${content.symlinkTarget}`}
            </p>
          </div>
          {content?.isSymlink && (
            <Badge tone={content.targetExists ? 'slate' : 'red'}>{content.targetExists ? 'Symlink' : 'Ziel fehlt'}</Badge>
          )}
        </div>
        <Link to="content" className="mt-2 inline-block text-sm text-slate-600 hover:underline">
          Content-Ordner verwalten →
        </Link>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Link to="config">
          <Card className="hover:border-slate-400">Konfiguration bearbeiten</Card>
        </Link>
        <Link to="plugins">
          <Card className="hover:border-slate-400">Plugins verwalten</Card>
        </Link>
        <Link to="sync">
          <Card className="hover:border-slate-400">Git-Sync</Card>
        </Link>
        <Link to="backups">
          <Card className="hover:border-slate-400">Backups ansehen</Card>
        </Link>
      </div>
    </div>
  )
}

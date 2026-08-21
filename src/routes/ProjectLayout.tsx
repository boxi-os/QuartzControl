import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom'
import type { Project } from '@shared/ipc-contract'

const TABS = [
  { to: '', label: 'Übersicht', end: true },
  { to: 'config', label: 'Konfiguration' },
  { to: 'plugins', label: 'Plugins' },
  { to: 'content', label: 'Content-Ordner' },
  { to: 'server', label: 'Build & Server' },
  { to: 'sync', label: 'Git-Sync' },
  { to: 'backups', label: 'Backups' }
]

export function useProject(): Project {
  return useOutletContext<Project>()
}

export default function ProjectLayout(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)

  useEffect(() => {
    if (!id) return
    window.quartzGui.projects.open(id).then((p) => setProject(p ?? null))
  }, [id])

  if (!project) {
    return <div className="p-10 text-sm text-slate-500">Lade Projekt…</div>
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-slate-200 bg-white px-6 py-3">
        <Link to="/" className="text-xs text-slate-500 hover:text-slate-800">
          ← Alle Projekte
        </Link>
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold">{project.name}</h1>
          <span className="text-xs text-slate-400">{project.path}</span>
        </div>
        <nav className="mt-3 flex gap-1">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm font-medium ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <Outlet context={project} />
      </main>
    </div>
  )
}

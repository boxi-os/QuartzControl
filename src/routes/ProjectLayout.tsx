import { useEffect, useState } from 'react'
import { NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom'
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
    return <div className="titlebar-drag flex h-screen items-center justify-center text-sm text-slate-500">Lade Projekt…</div>
  }

  return (
    <div className="flex h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-black/[0.06] bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]">
        <div className="titlebar-drag flex h-12 shrink-0 items-center pl-[84px]">
          <NavLink to="/" className="titlebar-no-drag text-[13px] text-slate-500 hover:text-slate-900 dark:hover:text-white">
            ← Projekte
          </NavLink>
        </div>
        <div className="px-4 pb-3">
          <h1 className="truncate text-[13px] font-semibold">{project.name}</h1>
          <p className="truncate text-[11px] text-slate-400">{project.path}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-black/[0.05] dark:text-slate-200 dark:hover:bg-white/10'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="titlebar-drag h-12 shrink-0" />
        <main className="flex-1 overflow-y-auto px-8 pb-8">
          <Outlet context={project} />
        </main>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom'
import type { Project } from '@shared/ipc-contract'

export function useProject(): Project {
  return useOutletContext<Project>()
}

export default function ProjectLayout(): JSX.Element {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)

  const TABS = [
    { to: '', label: t('projectLayout.tabs.overview'), end: true },
    { to: 'config', label: t('projectLayout.tabs.config') },
    { to: 'layout', label: t('projectLayout.tabs.layout') },
    { to: 'styles', label: t('projectLayout.tabs.styles') },
    { to: 'themes', label: t('projectLayout.tabs.themes') },
    { to: 'localization', label: t('projectLayout.tabs.localization') },
    { to: 'plugins', label: t('projectLayout.tabs.plugins') },
    { to: 'content', label: t('projectLayout.tabs.content') },
    { to: 'server', label: t('projectLayout.tabs.server') },
    { to: 'sync', label: t('projectLayout.tabs.sync') },
    { to: 'backups', label: t('projectLayout.tabs.backups') }
  ]

  useEffect(() => {
    if (!id) return
    window.quartzGui.projects.open(id).then((p) => setProject(p ?? null))
  }, [id])

  if (!project) {
    return (
      <div className="titlebar-drag flex h-screen items-center justify-center text-sm text-slate-500">
        {t('projectLayout.loading')}
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-black/[0.06] bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]">
        <div className="titlebar-drag h-12 shrink-0" />
        <div className="px-2 pb-2">
          <NavLink
            to="/"
            className="titlebar-no-drag flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-black/[0.05] dark:text-slate-200 dark:hover:bg-white/10"
          >
            <span aria-hidden>←</span> {t('projectLayout.allProjects')}
          </NavLink>
        </div>
        <div className="border-b border-black/[0.06] px-4 pb-3 dark:border-white/10">
          <h1 className="truncate text-[13px] font-semibold">{project.name}</h1>
          <p className="truncate text-[11px] text-slate-400">{project.path}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4 pt-2">
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

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, type LucideIcon } from 'lucide-react'
import type { Project } from '@shared/ipc-contract'
import { GROUP_ICONS, TAB_ICONS, type TabKey } from './navConfig'

export function useProject(): Project {
  return useOutletContext<Project>()
}

// A curated, brand-ish palette (indigo/violet-leaning, like the app icon) rather than random hues -
// picked deterministically from the project id so a given project always gets the same color
// across sessions, without needing to persist one.
const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#0ea5e9', '#14b8a6', '#f59e0b', '#f43f5e', '#a855f7', '#0891b2']

function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

type NavItem = { to: string; key: TabKey; label: string; end?: boolean }
type NavGroup = { key?: keyof typeof GROUP_ICONS; label?: string; items: NavItem[] }

export default function ProjectLayout(): JSX.Element {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)

  // Grouped by what a user is trying to do, not by which service implements it - "Gestaltung"
  // covers everything that changes how the site looks, "Veröffentlichung" everything that ships
  // it somewhere. Übersicht stays ungrouped at the top since it's the landing page, not a category.
  const NAV_GROUPS: NavGroup[] = [
    { items: [{ to: '', key: 'overview', label: t('projectLayout.tabs.overview'), end: true }] },
    {
      key: 'design',
      label: t('projectLayout.groups.design'),
      items: [
        { to: 'config', key: 'config', label: t('projectLayout.tabs.config') },
        { to: 'layout', key: 'layout', label: t('projectLayout.tabs.layout') },
        { to: 'styles', key: 'styles', label: t('projectLayout.tabs.styles') },
        { to: 'templates', key: 'templates', label: t('projectLayout.tabs.templates') }
      ]
    },
    {
      key: 'content',
      label: t('projectLayout.groups.content'),
      items: [
        { to: 'content', key: 'content', label: t('projectLayout.tabs.content') },
        { to: 'localization', key: 'localization', label: t('projectLayout.tabs.localization') }
      ]
    },
    {
      key: 'plugins',
      label: t('projectLayout.groups.plugins'),
      items: [
        { to: 'plugins', key: 'plugins', label: t('projectLayout.tabs.plugins') },
        { to: 'updates', key: 'updates', label: t('projectLayout.tabs.updates') }
      ]
    },
    {
      key: 'publish',
      label: t('projectLayout.groups.publish'),
      items: [
        { to: 'server', key: 'server', label: t('projectLayout.tabs.server') },
        { to: 'sync', key: 'sync', label: t('projectLayout.tabs.sync') },
        { to: 'backups', key: 'backups', label: t('projectLayout.tabs.backups') },
        { to: 'publish', key: 'publish', label: t('projectLayout.tabs.publish') }
      ]
    }
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
      <aside className="flex w-60 shrink-0 flex-col border-r border-black/[0.06] bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]">
        <div className="titlebar-drag h-12 shrink-0" />
        <div className="px-2 pb-2">
          <NavLink
            to="/"
            className="titlebar-no-drag flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-black/[0.05] dark:text-slate-200 dark:hover:bg-white/10"
          >
            <ArrowLeft size={14} aria-hidden /> {t('projectLayout.allProjects')}
          </NavLink>
        </div>
        <div className="mx-2 mb-2 flex items-center gap-2.5 rounded-[10px] border border-black/[0.06] bg-white/70 px-2.5 py-2.5 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-[13px] font-semibold text-white"
            style={{ backgroundColor: avatarColor(project.id) }}
            aria-hidden
          >
            {(project.name.trim()[0] ?? '?').toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[13px] font-semibold text-slate-900 dark:text-white" title={project.name}>
              {project.name}
            </h1>
            <p className="truncate text-[11px] text-slate-400" title={project.path}>
              {project.path}
            </p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-3 overflow-y-auto px-2 pb-4 pt-2">
          {NAV_GROUPS.map((group, i) => {
            const GroupIcon: LucideIcon | undefined = group.key ? GROUP_ICONS[group.key] : undefined
            return (
              <div key={group.label ?? `top-${i}`} className="flex flex-col gap-0.5">
                {group.label && (
                  <div className="flex items-center gap-1.5 px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {GroupIcon && <GroupIcon size={12} aria-hidden />}
                    {group.label}
                  </div>
                )}
                {group.items.map((item) => {
                  const ItemIcon = TAB_ICONS[item.key]
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-700 hover:bg-black/[0.05] dark:text-slate-200 dark:hover:bg-white/10'
                        }`
                      }
                    >
                      <ItemIcon size={15} strokeWidth={2} aria-hidden />
                      {item.label}
                    </NavLink>
                  )
                })}
              </div>
            )
          })}
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

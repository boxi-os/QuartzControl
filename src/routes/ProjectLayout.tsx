import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { titlebarStripClass } from '../utils/platform'
import { NavLink, Outlet, useLocation, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, type LucideIcon } from 'lucide-react'
import type { Project } from '@shared/ipc-contract'
import { GROUP_ICONS, TAB_ICONS, type TabKey } from './navConfig'
import { hasUnsavedChanges } from '../state/unsavedGuard'

// Guards every way out of a page that the sidebar offers - the nav items and the way back to the
// project list. In-page links are deliberately not wrapped: they lead out of pages that do not
// edit anything, and a guard nobody can see is worse than one place that is consistent.
function useLeaveGuard(): (event: { preventDefault: () => void }) => void {
  const { t } = useTranslation()
  return (event) => {
    if (hasUnsavedChanges() && !confirm(t('projectLayout.unsavedWarning'))) event.preventDefault()
  }
}

export function useProject(): Project {
  return useOutletContext<Project>()
}

// Module-level (not component state) so it survives a ProjectLayout unmount/remount too - e.g.
// leaving via "Alle Projekte" and coming back, or switching to a different project and back.
// Keyed by the full pathname (includes the project id), so different projects/tabs never collide.
// Lives only for the renderer process's lifetime - not persisted to disk, which matches the ask
// ("beim Wechseln der Tabs", not "nach einem Neustart").
const scrollPositions = new Map<string, number>()

// Restores the previous scroll position of `el` for the current route, and keeps it stable while
// the page's own data is still loading in - each route fully unmounts/remounts on tab switch
// (see App.tsx's <Routes>), so the newly-mounted page typically renders a loading state first and
// only reaches its final height once its `useEffect` data fetch resolves. A ResizeObserver
// re-applies the saved position on every height change; a plain scroll listener keeps the saved
// value in sync with the user's own scrolling, so once content settles the two converge and stop
// fighting each other.
function useRestoreScroll(
  mainRef: React.RefObject<HTMLElement>,
  contentRef: React.RefObject<HTMLElement>,
  ready: boolean
): void {
  const location = useLocation()
  useEffect(() => {
    // `ready` also gates this: on a project's very first render `<main>` doesn't exist yet (see
    // the loading-state early return below), so without it this effect would run once too early,
    // find mainRef.current still null, and never re-run once `<main>` actually mounts - silently
    // leaving the first-visited tab without a listener for the rest of the session.
    const el = mainRef.current
    const content = contentRef.current
    if (!ready || !el || !content) return
    const key = location.pathname
    el.scrollTop = scrollPositions.get(key) ?? 0

    // Observes the *content* wrapper rather than the scroll container. `<main>` is a flex-1 box
    // with overflow-y-auto: its own size doesn't track how much is inside it, so observing it only
    // catches a content change indirectly, when the growing content happens to make the scrollbar
    // appear and shrink the content box by its width. That works today (verified against the
    // slowest page, the plugin marketplace), but only as long as the scrollbar takes up space -
    // overlay scrollbars would silently take the re-apply away. The wrapper's height tracks the
    // content directly, which is the thing this actually cares about.
    const ro = new ResizeObserver(() => {
      el.scrollTop = scrollPositions.get(key) ?? 0
    })
    ro.observe(content)

    const onScroll = (): void => {
      scrollPositions.set(key, el.scrollTop)
    }
    el.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', onScroll)
    }
  }, [location.pathname, mainRef, contentRef, ready])
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
  const mainRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const guardLeave = useLeaveGuard()
  useRestoreScroll(mainRef, contentRef, project !== null)

  // Grouped by what a user is trying to do, not by which service implements it: "Einrichtung" is
  // what the site *is* and what it can do, "Gestaltung" everything that changes how it looks,
  // "Veröffentlichung" everything that ships it somewhere, "Wartung" what keeps it healthy.
  // Übersicht stays ungrouped at the top since it's the landing page, not a category.
  const NAV_GROUPS: NavGroup[] = [
    { items: [{ to: '', key: 'overview', label: t('projectLayout.tabs.overview'), end: true }] },
    {
      key: 'setup',
      label: t('projectLayout.groups.setup'),
      items: [
        { to: 'config', key: 'config', label: t('projectLayout.tabs.config') },
        { to: 'plugins', key: 'plugins', label: t('projectLayout.tabs.plugins') }
      ]
    },
    {
      key: 'design',
      label: t('projectLayout.groups.design'),
      items: [
        { to: 'layout', key: 'layout', label: t('projectLayout.tabs.layout') },
        { to: 'styles', key: 'styles', label: t('projectLayout.tabs.styles') },
        { to: 'templates', key: 'templates', label: t('projectLayout.tabs.templates') }
      ]
    },
    {
      key: 'publish',
      label: t('projectLayout.groups.publish'),
      items: [
        { to: 'server', key: 'server', label: t('projectLayout.tabs.server') },
        { to: 'sync', key: 'sync', label: t('projectLayout.tabs.sync') },
        { to: 'publish', key: 'publish', label: t('projectLayout.tabs.publish') }
      ]
    },
    {
      key: 'maintenance',
      label: t('projectLayout.groups.maintenance'),
      items: [
        { to: 'updates', key: 'updates', label: t('projectLayout.tabs.updates') },
        { to: 'backups', key: 'backups', label: t('projectLayout.tabs.backups') }
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
        <div className={titlebarStripClass} />
        <div className="px-2 pb-2">
          <NavLink
            to="/"
            onClick={guardLeave}
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
                      onClick={guardLeave}
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
        <div className={titlebarStripClass} />
        {/* One place decides how wide a page may get. Pages themselves set no max width at all -
            they fill whatever this gives them and lay their own content out responsively - so the
            window's width is actually used instead of every page picking its own arbitrary cap.
            The guard here is only against absurdity on a very wide display; below it the content
            column simply grows with the window. */}
        <main ref={mainRef} className="flex-1 overflow-y-auto px-8 pb-8">
          <div ref={contentRef} className="mx-auto w-full max-w-[1800px]">
            <Outlet context={project} />
          </div>
        </main>
      </div>
    </div>
  )
}

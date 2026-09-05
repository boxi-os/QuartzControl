import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { askDialog } from '../utils/confirm'
import { titlebarStripClass } from '../utils/platform'
import { NavLink, Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, type LucideIcon } from 'lucide-react'
import type { Project, ProjectIconInfo } from '@shared/ipc-contract'
import { GROUP_ICONS, TAB_ICONS, type TabKey } from './navConfig'
import { hasUnsavedChanges } from '../state/unsavedGuard'
import { hasSaveCommand, runSaveCommand } from '../state/saveCommand'
import { useLogStore } from '../state/store'
import { useIpcQuery } from '../state/useIpcQuery'
import ProjectAvatar from '../components/ProjectAvatar'

// Guards every way out of a page that the sidebar offers - the nav items and the way back to the
// project list. In-page links are deliberately not wrapped: they lead out of pages that do not
// edit anything, and a guard nobody can see is worse than one place that is consistent.
//
// The question is asked by the native dialog (src/utils/confirm.ts), which answers asynchronously,
// and a NavLink cannot wait for an answer mid-click: so the click is always stopped first and the
// navigation issued by hand once "discard" came back. `to` is the link's own target, relative to
// this layout's route the same way the NavLink resolves it.
function useLeaveGuard(): (event: { preventDefault: () => void }, to: string) => void {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (event, to) => {
    if (!hasUnsavedChanges()) return
    event.preventDefault()
    void (async () => {
      // Three answers where the page has a save to offer (Konfiguration, Layout, Stile), two where
      // it has not - see saveCommand. "Verwerfen" stays the confirming button, so the answer that
      // loses work keeps the place it always had and nobody hits it by muscle memory.
      // Two questions, because the wording has to match the answers: with a Save button the
      // question is what should happen, without one it is whether to leave at all.
      const canSave = hasSaveCommand()
      const answer = await askDialog({
        text: canSave ? t('projectLayout.unsavedWarningWithSave') : t('projectLayout.unsavedWarning'),
        altLabel: canSave ? t('projectLayout.unsavedSave') : undefined,
        confirmLabel: t('projectLayout.unsavedLeave'),
        danger: true
      })
      if (answer === 'cancel') return
      if (answer === 'confirm') {
        navigate(to)
        return
      }
      // A page's save catches its own errors and reports them in its header rather than throwing,
      // so it says in its return value whether it worked. A failed save stays on the page, where
      // the message is - navigating away would drop the changes the user just asked to keep.
      if (await runSaveCommand()) navigate(to)
    })()
  }
}

interface ProjectContext {
  project: Project
  /** Re-reads the project's picture. See useRefreshProjectIcon. */
  refreshIcon: () => void
}

export function useProject(): Project {
  return useOutletContext<ProjectContext>().project
}

// The avatar in the sidebar belongs to this layout, but the picture behind it is assigned on a
// page *inside* it (Konfiguration → Seite). The page that writes the file says so rather than the
// layout watching it: there is exactly one writer, and a file watcher for one image would be a
// second mechanism for something a function call already answers.
export function useRefreshProjectIcon(): () => void {
  return useOutletContext<ProjectContext>().refreshIcon
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

type NavItem = { to: string; key: TabKey; label: string; end?: boolean }
type NavGroup = { key?: keyof typeof GROUP_ICONS; label?: string; items: NavItem[] }

export default function ProjectLayout(): JSX.Element {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const mainRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const guardLeave = useLeaveGuard()
  const seedLogs = useLogStore((s) => s.seedLogs)
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

  // Only a picture the user assigned; a project still carrying the icon Quartz ships gets its
  // letter, or every project in the app would wear the same stock image. See projectIconService.
  const { data: icon, reload: refreshIcon } = useIpcQuery<ProjectIconInfo | null>(
    async () => (project ? window.quartzGui.projectIcon.get({ projectPath: project.path }) : null),
    [project?.path]
  )

  // What the dev server said while no window was open. The log store lives in the renderer and so
  // dies with the window, but on macOS a closed window leaves the app - and every server it started
  // - running; the main process buffers those lines for exactly this read. Here rather than on
  // Vorschau & Build, because the same store feeds the Übersicht, and because a project is opened
  // once while its pages come and go.
  useEffect(() => {
    if (!id) return
    void window.quartzGui.logs.history({ projectId: id }).then((history) => seedLogs(id, history))
  }, [id, seedLogs])

  if (!project) {
    return (
      <div className="titlebar-drag flex h-screen items-center justify-center text-sm text-text-muted">
        {t('projectLayout.loading')}
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-ink/[0.06] bg-ink/[0.02] dark:border-ink/10 dark:bg-ink/[0.03]">
        <div className={titlebarStripClass} />
        <div className="px-2 pb-2">
          <NavLink
            to="/"
            onClick={(event) => guardLeave(event, '/')}
            className="titlebar-no-drag flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-ink/[0.05] dark:text-slate-200 dark:hover:bg-ink/10"
          >
            <ArrowLeft size={14} aria-hidden /> {t('projectLayout.allProjects')}
          </NavLink>
        </div>
        <div className="mx-2 mb-2 flex items-center gap-2.5 rounded-[10px] border border-ink/[0.06] bg-surface/70 px-2.5 py-2.5 shadow-sm dark:border-ink/10 dark:bg-ink/[0.05]">
          <ProjectAvatar id={project.id} name={project.name} icon={icon?.custom ? icon.dataUrl : null} size={36} />
          <div className="min-w-0">
            {/* A <p>, not a second <h1>: the page's own heading is the one in PageHeader, and two
                first-level headings on one page leave a screen reader without a single top. */}
            <p className="truncate text-[13px] font-semibold text-text" title={project.name}>
              {project.name}
            </p>
            <p className="truncate text-[11px] text-text-muted" title={project.path}>
              {project.path}
            </p>
          </div>
        </div>
        <nav aria-label={t('projectLayout.navLabel')} className="flex flex-1 flex-col gap-3 overflow-y-auto px-2 pb-4 pt-2">
          {NAV_GROUPS.map((group, i) => {
            const GroupIcon: LucideIcon | undefined = group.key ? GROUP_ICONS[group.key] : undefined
            return (
              <div key={group.label ?? `top-${i}`} className="flex flex-col gap-0.5">
                {group.label && (
                  <div className="flex items-center gap-1.5 px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
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
                      onClick={(event) => guardLeave(event, item.to || '.')}
                      className={({ isActive }) =>
                        `flex items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-700 hover:bg-ink/[0.05] dark:text-slate-200 dark:hover:bg-ink/10'
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
            <Outlet context={{ project, refreshIcon } satisfies ProjectContext} />
          </div>
        </main>
      </div>
    </div>
  )
}

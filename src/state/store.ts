import { create } from 'zustand'
import type { LogHistory, LogLine, Project, Settings } from '@shared/ipc-contract'

// A cap per project, not a global one - so one busy project's build output can't crowd out
// another project's server log that just happens to share the app session.
const MAX_LOG_LINES = 999

// A single shared reference for "no log entry for this project yet", not `[]` inline at each call
// site: zustand's `useStore(selector)` runs the selector on every render (via useSyncExternalStore)
// and React requires getSnapshot to return a referentially-stable result when nothing changed. An
// inline `?? []` fallback allocates a new array every call, so React sees "the snapshot changed"
// on every single render and re-renders forever - "Maximum update depth exceeded" (React #185),
// reproduced by hand against ProjectDashboard/BuildServer before adding this constant.
export const EMPTY_LOG_LINES: LogLine[] = []

function appendLog(logs: Record<string, LogLine[]>, line: LogLine): Record<string, LogLine[]> {
  const existing = logs[line.projectId] ?? []
  return { ...logs, [line.projectId]: [...existing.slice(-(MAX_LOG_LINES - 1)), line] }
}

// Seeding a project's buffer from what the main process kept (see the `logs` API). Lines the live
// subscription already delivered are kept if they are newer than the last buffered one - the gap
// between asking for the history and applying it is small, but it is not nothing, and dropping a
// line that arrived inside it would be exactly the bug this seeding exists to fix.
function mergeHistory(history: LogLine[], live: LogLine[] | undefined): LogLine[] {
  if (!live || live.length === 0) return history
  const last = history[history.length - 1]
  if (!last) return live
  const newer = live.filter((line) => line.timestamp > last.timestamp)
  return newer.length === 0 ? history : [...history, ...newer].slice(-MAX_LOG_LINES)
}

interface LogState {
  // Dev-server output and one-off build output are tracked separately (a build can run while the
  // server is up) but both live here, keyed by project id, rather than as page-local useState:
  // the main process keeps emitting server:log/build:log events regardless of which page is open,
  // so anything short of an always-mounted subscriber (installed once in App.tsx) would silently
  // drop lines emitted while the user was on an unrelated tab. Kept in memory only - cleared on
  // app restart, same as before.
  serverLogs: Record<string, LogLine[]>
  buildLogs: Record<string, LogLine[]>
  appendServerLog: (line: LogLine) => void
  appendBuildLog: (line: LogLine) => void
  /** Fills both buffers for one project from the main process - see mergeHistory. */
  seedLogs: (projectId: string, history: LogHistory) => void
  clearServerLog: (projectId: string) => Promise<void>
  clearBuildLog: (projectId: string) => Promise<void>
}

export const useLogStore = create<LogState>((set) => ({
  serverLogs: {},
  buildLogs: {},
  appendServerLog: (line) => set((state) => ({ serverLogs: appendLog(state.serverLogs, line) })),
  appendBuildLog: (line) => set((state) => ({ buildLogs: appendLog(state.buildLogs, line) })),
  seedLogs: (projectId, history) =>
    set((state) => ({
      serverLogs: { ...state.serverLogs, [projectId]: mergeHistory(history.server, state.serverLogs[projectId]) },
      buildLogs: { ...state.buildLogs, [projectId]: mergeHistory(history.build, state.buildLogs[projectId]) }
    })),
  // Clearing has to reach the main process too, or "Ausgabe leeren" only holds until the next time
  // the page is opened and the buffer is read back.
  clearServerLog: async (projectId) => {
    await window.quartzGui.logs.clear({ projectId, stream: 'server' })
    set((state) => ({ serverLogs: { ...state.serverLogs, [projectId]: [] } }))
  },
  clearBuildLog: async (projectId) => {
    await window.quartzGui.logs.clear({ projectId, stream: 'build' })
    set((state) => ({ buildLogs: { ...state.buildLogs, [projectId]: [] } }))
  }
}))

export interface AppError {
  id: number
  message: string
}

interface AppState {
  projects: Project[]
  settings: Settings
  // App-wide error surface. Most pages call window.quartzGui.* without their own try/catch, so a
  // main-process failure would otherwise reject into nothing: no message, and whatever `busy` flag
  // the page set stays set. Errors land here (see installGlobalErrorHandlers) so a failure is at
  // least always visible, even where the page itself doesn't handle it yet.
  errors: AppError[]
  pushError: (message: string) => void
  dismissError: (id: number) => void
  loadProjects: () => Promise<void>
  loadSettings: () => Promise<void>
  addProject: (path: string) => Promise<Project>
  removeProject: (id: string) => Promise<void>
  saveSettings: (settings: Settings) => Promise<void>
}

let nextErrorId = 1

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  settings: {},
  errors: [],

  pushError: (message: string) => {
    set((state) => {
      // The same failure often arrives repeatedly (a re-render retrying a failing load); showing
      // one entry rather than a growing stack of identical ones keeps the surface useful.
      if (state.errors.some((e) => e.message === message)) return state
      return { errors: [...state.errors, { id: nextErrorId++, message }].slice(-5) }
    })
  },

  dismissError: (id: number) => set((state) => ({ errors: state.errors.filter((e) => e.id !== id) })),

  loadProjects: async () => {
    const projects = await window.quartzGui.projects.list()
    set({ projects })
  },

  loadSettings: async () => {
    const settings = await window.quartzGui.settings.get()
    set({ settings })
  },

  addProject: async (path: string) => {
    const project = await window.quartzGui.projects.add(path)
    await get().loadProjects()
    return project
  },

  removeProject: async (id: string) => {
    await window.quartzGui.projects.remove(id)
    await get().loadProjects()
  },

  saveSettings: async (settings: Settings) => {
    await window.quartzGui.settings.save(settings)
    set({ settings })
  }
}))

import { create } from 'zustand'
import type { LogLine, Project, Settings } from '@shared/ipc-contract'

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
  clearServerLog: (projectId: string) => void
  clearBuildLog: (projectId: string) => void
}

export const useLogStore = create<LogState>((set) => ({
  serverLogs: {},
  buildLogs: {},
  appendServerLog: (line) => set((state) => ({ serverLogs: appendLog(state.serverLogs, line) })),
  appendBuildLog: (line) => set((state) => ({ buildLogs: appendLog(state.buildLogs, line) })),
  clearServerLog: (projectId) => set((state) => ({ serverLogs: { ...state.serverLogs, [projectId]: [] } })),
  clearBuildLog: (projectId) => set((state) => ({ buildLogs: { ...state.buildLogs, [projectId]: [] } }))
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

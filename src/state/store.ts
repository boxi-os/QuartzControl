import { create } from 'zustand'
import type { Project, Settings } from '@shared/ipc-contract'

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

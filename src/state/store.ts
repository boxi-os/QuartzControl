import { create } from 'zustand'
import type { Project, Settings } from '@shared/ipc-contract'

interface AppState {
  projects: Project[]
  settings: Settings
  loadProjects: () => Promise<void>
  loadSettings: () => Promise<void>
  addProject: (path: string) => Promise<Project>
  removeProject: (id: string) => Promise<void>
  saveSettings: (settings: Settings) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  settings: {},

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

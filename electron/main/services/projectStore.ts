import { app } from 'electron'
import { randomUUID } from 'crypto'
import { existsSync, mkdirSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { basename, join } from 'path'
import type { Project } from '@shared/ipc-contract'

function storePath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'projects.json')
}

async function readAll(): Promise<Project[]> {
  try {
    const raw = await readFile(storePath(), 'utf-8')
    return JSON.parse(raw) as Project[]
  } catch {
    return []
  }
}

async function writeAll(projects: Project[]): Promise<void> {
  await writeFile(storePath(), JSON.stringify(projects, null, 2), 'utf-8')
}

export async function listProjects(): Promise<Project[]> {
  return readAll()
}

export async function addProject(path: string): Promise<Project> {
  const projects = await readAll()
  const existing = projects.find((p) => p.path === path)
  if (existing) return existing
  const project: Project = {
    id: randomUUID(),
    name: basename(path),
    path,
    addedAt: new Date().toISOString()
  }
  projects.push(project)
  await writeAll(projects)
  return project
}

export async function touchProject(id: string): Promise<void> {
  const projects = await readAll()
  const project = projects.find((p) => p.id === id)
  if (!project) return
  project.lastOpenedAt = new Date().toISOString()
  await writeAll(projects)
}

export async function removeProject(id: string): Promise<void> {
  const projects = await readAll()
  await writeAll(projects.filter((p) => p.id !== id))
}

export async function getProject(id: string): Promise<Project | undefined> {
  const projects = await readAll()
  return projects.find((p) => p.id === id)
}

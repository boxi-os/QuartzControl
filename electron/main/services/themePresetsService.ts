import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { ThemePreset } from '@shared/ipc-contract'
import { quartzGuiDir, quartzGuiPath } from './projectDirs'

// Presets live inside the project (.quartz-gui/, same convention as backupService.ts's
// backups/content-backups folders) rather than Electron's userData, since a preset is tied to a
// specific project's installed themes/plugins and should travel with it, not with the app install.
const FILE = 'theme-presets.json'

// Read path - see projectDirs' quartzGuiPath: only writeAll() may create the directory.
function presetsPath(projectPath: string): string {
  return quartzGuiPath(projectPath, FILE)
}

async function readAll(projectPath: string): Promise<ThemePreset[]> {
  try {
    return JSON.parse(await readFile(presetsPath(projectPath), 'utf-8')) as ThemePreset[]
  } catch {
    return []
  }
}

async function writeAll(projectPath: string, presets: ThemePreset[]): Promise<void> {
  await writeFile(join(quartzGuiDir(projectPath), FILE), JSON.stringify(presets, null, 2), 'utf-8')
}

export function listPresets(projectPath: string): Promise<ThemePreset[]> {
  return readAll(projectPath)
}

export async function savePreset(projectPath: string, preset: ThemePreset): Promise<void> {
  const presets = await readAll(projectPath)
  const index = presets.findIndex((p) => p.id === preset.id)
  if (index === -1) presets.push(preset)
  else presets[index] = preset
  await writeAll(projectPath, presets)
}

export async function deletePreset(projectPath: string, id: string): Promise<void> {
  const presets = await readAll(projectPath)
  await writeAll(
    projectPath,
    presets.filter((p) => p.id !== id)
  )
}

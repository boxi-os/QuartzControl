import { existsSync, mkdirSync } from 'fs'
import { copyFile, readFile, readdir, writeFile } from 'fs/promises'
import { basename, join, relative } from 'path'
import type { StyleReferenceFile, StylesInfo } from '@shared/ipc-contract'

// The file Quartz's build imports directly (quartz/plugins/emitters/componentResources.ts) -
// verified against a real clone. Already inside the dev server's esbuild watch graph, so saving
// it needs no extra live-reload wiring; the existing hot-reload websocket picks it up.
export function customScssPath(projectPath: string): string {
  return join(projectPath, 'quartz', 'styles', 'custom.scss')
}

export async function readCustomScss(projectPath: string): Promise<StylesInfo> {
  const path = customScssPath(projectPath)
  const content = existsSync(path) ? await readFile(path, 'utf-8') : ''
  return { path, content }
}

export async function writeCustomScss(projectPath: string, content: string): Promise<void> {
  await writeFile(customScssPath(projectPath), content, 'utf-8')
}

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', '.changeset'])

async function findScssFiles(dir: string, depth = 0): Promise<string[]> {
  if (depth > 6) return []
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const results: string[] = []
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...(await findScssFiles(full, depth + 1)))
    } else if (entry.name.endsWith('.scss')) {
      results.push(full)
    }
  }
  return results
}

// Read-only reference for a CLI-installed plugin's own *.scss files, so the user can see the
// original selectors they're overriding. Built-in @quartz-community/x entries have no
// discoverable source on disk - same limitation pluginSchemaService already has for options.
export async function getStyleReferences(projectPath: string, pluginName: string): Promise<StyleReferenceFile[]> {
  const pluginDir = join(projectPath, '.quartz', 'plugins', pluginName)
  if (!existsSync(pluginDir)) return []
  const files = (await findScssFiles(pluginDir)).slice(0, 20)
  return Promise.all(
    files.map(async (path) => ({
      label: relative(pluginDir, path),
      path,
      content: await readFile(path, 'utf-8')
    }))
  )
}

export async function importStyleFile(projectPath: string, sourcePath: string): Promise<{ importLine: string; relativePath: string }> {
  const importedDir = join(projectPath, 'quartz', 'styles', 'imported')
  mkdirSync(importedDir, { recursive: true })
  const fileName = basename(sourcePath)
  await copyFile(sourcePath, join(importedDir, fileName))
  const useSpecifier = `./imported/${fileName.replace(/\.(scss|css)$/, '')}`
  return { importLine: `@use "${useSpecifier}";`, relativePath: `imported/${fileName}` }
}

import { existsSync } from 'fs'
import { mkdir, readdir, readFile, copyFile as fsCopyFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { TemplatePackageCategory, TemplatePackageManifest, TemplatePackagePreview } from '@shared/ipc-contract'
import * as configService from './configService'
import * as styleService from './styleService'
import * as layoutFrameService from './layoutFrameService'

const MANIFEST_FILE = 'manifest.json'

function fontsDir(projectPath: string): string {
  return join(projectPath, 'quartz', 'static', 'fonts')
}

function importedStylesDir(projectPath: string): string {
  return join(projectPath, 'quartz', 'styles', 'imported')
}

// Flat (non-recursive) copy - both fonts/ and styles/imported/ are single-level directories in
// practice (see fontService.ts/styleService.ts), so this deliberately doesn't walk subdirectories.
async function copyDirFlat(srcDir: string, destDir: string): Promise<string[]> {
  if (!existsSync(srcDir)) return []
  const entries = await readdir(srcDir, { withFileTypes: true })
  const files = entries.filter((e) => e.isFile()).map((e) => e.name)
  if (files.length === 0) return []
  await mkdir(destDir, { recursive: true })
  await Promise.all(files.map((f) => fsCopyFile(join(srcDir, f), join(destDir, f))))
  return files
}

// A package folder name derived from the user-given package name - sanitized so it's always a
// valid directory name regardless of what characters the name contains.
function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'template-paket'
}

export async function exportPackage(
  projectPath: string,
  destDir: string,
  name: string,
  categories: TemplatePackageCategory[]
): Promise<{ packageDir: string }> {
  const packageDir = join(destDir, slugify(name))
  await mkdir(packageDir, { recursive: true })

  const config = await configService.readConfig(projectPath)
  const stats: TemplatePackageManifest['stats'] = {}

  if (categories.includes('layout')) {
    await writeFile(join(packageDir, 'layout.json'), JSON.stringify(config.layout ?? {}, null, 2), 'utf-8')
  }

  if (categories.includes('colors')) {
    // Bundles the classic 9 colors + typography + fontOrigin alongside the derived CSS variable
    // overrides from Phase 3a, since both together fully describe "the color scheme" a user would
    // expect a color export to carry.
    const cssVariableOverrides = await styleService.getVariableOverrides(projectPath)
    const colorsPayload = {
      colors: config.theme.colors ?? {},
      typography: config.theme.typography ?? {},
      fontOrigin: config.theme.fontOrigin ?? 'googleFonts',
      cssVariableOverrides
    }
    await writeFile(join(packageDir, 'colors.json'), JSON.stringify(colorsPayload, null, 2), 'utf-8')
  }

  if (categories.includes('plugins')) {
    await writeFile(join(packageDir, 'plugins.json'), JSON.stringify(config.plugins, null, 2), 'utf-8')
    stats.pluginCount = config.plugins.length
  }

  if (categories.includes('frames')) {
    // Stores each frame's GridFrameDefinition (frame.json) rather than copying the generated
    // dist/package.json files verbatim - layoutFrameService.saveFrame() can regenerate those from
    // the definition alone on import, which is more robust than shipping possibly-stale compiled
    // output and avoids a second code path for writing frame files.
    const frames = await layoutFrameService.listFrames(projectPath)
    await writeFile(join(packageDir, 'frames.json'), JSON.stringify(frames, null, 2), 'utf-8')
    stats.frameCount = frames.length
  }

  if (categories.includes('styles')) {
    const info = await styleService.readCustomScss(projectPath)
    await writeFile(join(packageDir, 'custom.scss'), info.content, 'utf-8')
    await copyDirFlat(importedStylesDir(projectPath), join(packageDir, 'imported'))
  }

  if (categories.includes('fonts')) {
    const files = await copyDirFlat(fontsDir(projectPath), join(packageDir, 'fonts'))
    stats.fontCount = files.length
  }

  const manifest: TemplatePackageManifest = {
    name,
    createdAt: new Date().toISOString(),
    categories,
    stats
  }
  await writeFile(join(packageDir, MANIFEST_FILE), JSON.stringify(manifest, null, 2), 'utf-8')

  return { packageDir }
}

export async function previewPackage(sourceDir: string): Promise<TemplatePackagePreview | null> {
  try {
    const manifest = JSON.parse(await readFile(join(sourceDir, MANIFEST_FILE), 'utf-8')) as TemplatePackageManifest
    return { manifest }
  } catch {
    return null
  }
}

import { createHash } from 'crypto'
import { existsSync, mkdirSync } from 'fs'
import { mkdir, readdir, readFile, copyFile as fsCopyFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type {
  CssVariableOverride,
  GridFrameDefinition,
  LayoutConfig,
  PluginEntry,
  TemplatePackageCategory,
  TemplatePackageImportResult,
  TemplatePackageManifest,
  TemplatePackagePreview
} from '@shared/ipc-contract'
import * as configService from './configService'
import * as styleService from './styleService'
import * as layoutFrameService from './layoutFrameService'
import * as pluginService from './pluginService'

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

async function tryReadJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, 'utf-8')) as T
  } catch {
    return null
  }
}

async function hashFile(path: string): Promise<string> {
  return createHash('sha256').update(await readFile(path)).digest('hex')
}

// Sass requires @use/@forward to precede every other rule in a file - blindly appending an
// imported custom.scss's full content (which likely starts with its own @use lines for its own
// imported/* files) under a marker block at the END of the target file would be invalid SCSS.
// Splitting them out lets the caller hoist them to the top instead.
function splitUseStatements(content: string): { useLines: string[]; rest: string } {
  const useLines: string[] = []
  const restLines: string[] = []
  for (const line of content.split('\n')) {
    if (/^\s*@(use|forward)\s+.*;\s*$/.test(line)) useLines.push(line.trim())
    else restLines.push(line)
  }
  return { useLines, rest: restLines.join('\n') }
}

function addMissingUseLines(content: string, useLines: string[]): string {
  const missing = useLines.filter((line) => !content.includes(line))
  if (missing.length === 0) return content
  return `${missing.join('\n')}\n${content}`
}

interface ColorsPayload {
  colors: unknown
  typography: unknown
  fontOrigin: string
  cssVariableOverrides: CssVariableOverride[]
}

// Collision handling throughout is always skip-and-warn (see TemplatePackageImportResult) - an
// existing plugin/frame/style-file/font in the target project always wins, never silently
// overwritten by the imported one.
export async function importPackage(
  projectPath: string,
  sourceDir: string,
  categories: TemplatePackageCategory[]
): Promise<TemplatePackageImportResult> {
  const warnings: string[] = []

  // Frames first: a newly registered frame mutates quartz.config.yaml's plugins array out-of-band
  // via the CLI (same mechanism/bug documented in Phase 1b's layoutFrameService), so this must
  // happen before the "plugins" step below reads that array - otherwise a later writeConfig call
  // from an in-memory snapshot taken before this step would silently revert the frame's own plugin
  // entry, exactly the bug Phase 1b's LayoutEditor already had to fix once.
  if (categories.includes('frames')) {
    const defs = await tryReadJson<GridFrameDefinition[]>(join(sourceDir, 'frames.json'))
    if (defs) {
      const existingIds = new Set((await layoutFrameService.listFrames(projectPath)).map((f) => f.id))
      for (const def of defs) {
        if (existingIds.has(def.id)) {
          warnings.push(`Frame "${def.id}" existiert bereits im Zielprojekt - übersprungen.`)
          continue
        }
        const result = await layoutFrameService.saveFrame(projectPath, def)
        if (!result.success) warnings.push(`Frame "${def.id}" konnte nicht registriert werden: ${result.output}`)
        else existingIds.add(def.id)
      }
    }
  }

  // Plugins: dedupe by the same deriveName() the Marketplace already uses to avoid a built-in and
  // a CLI-installed entry silently colliding. Every string-form source - github:/git+/https://, a
  // local path, or a bare npm-scoped package like "@quartz-community/x" or "@quartz-themes/core" -
  // is installed via the existing addPlugin() path first: verified against the real CLI's own
  // quartz/cli/plugin-data.js::parseGitSource, which recognizes a bare "@scope/name" as a valid
  // "npmPackage" source and installs it via a plain `npm install <name>` - there is no built-in
  // special case to skip, the CLI's own install is idempotent and cheap when already satisfied.
  // That call appends its own bare config entry via the CLI, which this then re-reads and replaces
  // with the richer imported entry (options/order/layout/enabled) rather than leaving two entries.
  if (categories.includes('plugins')) {
    const entries = await tryReadJson<PluginEntry[]>(join(sourceDir, 'plugins.json'))
    if (entries) {
      for (const entry of entries) {
        const name = configService.deriveName(entry.source)
        const config = await configService.readConfig(projectPath)
        if (config.plugins.some((p) => p.name === name)) {
          warnings.push(`Plugin "${name}" existiert bereits im Zielprojekt - übersprungen.`)
          continue
        }
        if (typeof entry.source !== 'string') {
          warnings.push(`Plugin "${name}" hat eine nicht unterstützte Quellenform - übersprungen.`)
          continue
        }
        const installResult = await pluginService.addPlugin(projectPath, entry.source)
        if (!installResult.success) {
          warnings.push(`Plugin "${name}" konnte nicht installiert werden: ${installResult.output}`)
          continue
        }
        const configAfterInstall = await configService.readConfig(projectPath)
        const { name: _name, ...rest } = entry
        const nextPlugins = configAfterInstall.plugins.filter((p) => p.name !== name).concat([{ ...rest, name } as PluginEntry])
        await configService.writeConfig(projectPath, { ...configAfterInstall, plugins: nextPlugins })
      }
    }
  }

  // Layout + colors: plain field replacements, batched into one write since neither mutates
  // quartz.config.yaml outside of writeConfig itself (unlike frames/plugins above).
  if (categories.includes('layout') || categories.includes('colors')) {
    const config = await configService.readConfig(projectPath)
    let next = config
    if (categories.includes('layout')) {
      const layout = await tryReadJson<LayoutConfig>(join(sourceDir, 'layout.json'))
      if (layout) next = { ...next, layout }
    }
    if (categories.includes('colors')) {
      const colors = await tryReadJson<ColorsPayload>(join(sourceDir, 'colors.json'))
      if (colors) {
        next = {
          ...next,
          theme: {
            ...next.theme,
            colors: colors.colors as Record<string, unknown>,
            typography: colors.typography as Record<string, string>,
            fontOrigin: colors.fontOrigin
          }
        }
      }
    }
    await configService.writeConfig(projectPath, next)
    if (categories.includes('colors')) {
      const colors = await tryReadJson<ColorsPayload>(join(sourceDir, 'colors.json'))
      if (colors) await styleService.saveVariableOverrides(projectPath, colors.cssVariableOverrides)
    }
  }

  // Styles: appended under its own managed marker (separate from Phase 3a's "css-vars" one) per
  // the user's confirmed decision to append rather than diff/replace the target's own custom.scss.
  if (categories.includes('styles')) {
    const scssPath = join(sourceDir, 'custom.scss')
    if (existsSync(scssPath)) {
      const importedContent = await readFile(scssPath, 'utf-8')
      const { useLines, rest } = splitUseStatements(importedContent)
      const info = await styleService.readCustomScss(projectPath)
      const withUses = addMissingUseLines(info.content, useLines)
      const next = styleService.upsertManagedBlock(withUses, 'imported-styles', rest.trim())
      await styleService.writeCustomScss(projectPath, next)
    }
    const importedFilesDir = join(sourceDir, 'imported')
    if (existsSync(importedFilesDir)) {
      const targetDir = join(projectPath, 'quartz', 'styles', 'imported')
      mkdirSync(targetDir, { recursive: true })
      const files = (await readdir(importedFilesDir, { withFileTypes: true })).filter((e) => e.isFile())
      for (const f of files) {
        const targetPath = join(targetDir, f.name)
        if (existsSync(targetPath)) {
          warnings.push(`Style-Datei "${f.name}" existiert bereits im Ziel - übersprungen.`)
          continue
        }
        await fsCopyFile(join(importedFilesDir, f.name), targetPath)
      }
    }
  }

  // Fonts: skip only when an identical file (same name + hash) already exists; warn (don't
  // overwrite) on a same-name collision with different content.
  if (categories.includes('fonts')) {
    const fontsSourceDir = join(sourceDir, 'fonts')
    if (existsSync(fontsSourceDir)) {
      const targetDir = fontsDir(projectPath)
      mkdirSync(targetDir, { recursive: true })
      const files = (await readdir(fontsSourceDir, { withFileTypes: true })).filter((e) => e.isFile())
      for (const f of files) {
        const targetPath = join(targetDir, f.name)
        if (existsSync(targetPath)) {
          const [sourceHash, targetHash] = await Promise.all([hashFile(join(fontsSourceDir, f.name)), hashFile(targetPath)])
          if (sourceHash === targetHash) continue
          warnings.push(`Schriftdatei "${f.name}" existiert bereits mit anderem Inhalt - übersprungen.`)
          continue
        }
        await fsCopyFile(join(fontsSourceDir, f.name), targetPath)
      }
    }
  }

  return { success: true, warnings }
}

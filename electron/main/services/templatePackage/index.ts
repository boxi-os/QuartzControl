import { app } from 'electron'
import { existsSync } from 'fs'
import { readFile, stat } from 'fs/promises'
import { basename, join } from 'path'
import type {
  TemplateConflictStrategy,
  TemplateExportOptions,
  TemplateExportResult,
  TemplateImportProgress,
  TemplatePackageImportResult,
  TemplatePackageManifest,
  TemplatePackagePlan,
  TemplatePartId,
  TemplatePartPlan,
  TemplatePartSummary
} from '@shared/ipc-contract'
import { TEMPLATE_PART_IDS } from '@shared/ipc-contract'
import { DEFAULT_FRAME_BREAKPOINT_WIDTHS } from '@shared/gridFrameCss'
import { createSnapshot } from '../snapshotService'
import { runCommand } from '../runCommand'
import { readZipFile, writeZipFile, type ZipEntry } from '../zipArchive'
import { FORMAT_VERSION, MANIFEST_FILE, listFilesFlat, partFile } from './shared'
import { PARTS } from './parts'

/**
 * A default file name for the save dialog, derived from the package name. Only the *suggestion* is
 * sanitized - the user can rename it in the dialog, and the name inside the manifest keeps every
 * character they typed.
 */
export function slugifyFileName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'vorlage'
}

function knownParts(): TemplatePartId[] {
  return TEMPLATE_PART_IDS.filter((id) => PARTS[id] !== undefined)
}

/** What every part would contribute from this project, so the export form can show real counts. */
export async function inspectProject(projectPath: string): Promise<TemplatePartSummary[]> {
  const out: TemplatePartSummary[] = []
  for (const id of knownParts()) {
    const part = PARTS[id]
    if (part.probe) {
      const stats = await part.probe({ projectPath, translationScope: 'changed' }).catch(() => null)
      if (stats && Object.values(stats).some((value) => value > 0)) out.push({ id, stats, requires: [] })
      continue
    }
    const collected = await part.collect({ projectPath, translationScope: 'changed' }).catch(() => null)
    if (collected) out.push({ id, stats: collected.stats, requires: collected.requires ?? [] })
  }
  return out
}

async function projectHead(projectPath: string): Promise<string | undefined> {
  const result = await runCommand('git', ['rev-parse', '--short', 'HEAD'], projectPath)
  return result.success ? result.output.trim() : undefined
}

export async function exportPackage(
  projectPath: string,
  filePath: string,
  options: TemplateExportOptions
): Promise<TemplateExportResult> {
  const entries: ZipEntry[] = []
  const parts: TemplatePartSummary[] = []

  for (const id of knownParts()) {
    if (!options.parts.includes(id)) continue
    const collected = await PARTS[id].collect({ projectPath, translationScope: options.translationScope })
    if (!collected) continue
    entries.push({ name: partFile(id), data: Buffer.from(JSON.stringify(collected.payload, null, 2), 'utf-8') })
    if (collected.files) entries.push(...collected.files)
    parts.push({ id, stats: collected.stats, requires: collected.requires ?? [] })
  }

  const manifest: TemplatePackageManifest = {
    formatVersion: FORMAT_VERSION,
    name: options.name,
    ...(options.description ? { description: options.description } : {}),
    createdAt: new Date().toISOString(),
    createdBy: { app: 'QuartzControl', appVersion: app.getVersion() },
    source: { projectName: basename(projectPath), quartzHead: await projectHead(projectPath) },
    parts
  }
  entries.unshift({ name: MANIFEST_FILE, data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8') })

  await writeZipFile(filePath, entries)
  const { size } = await stat(filePath)
  return { filePath, bytes: size, parts }
}

interface LoadedPackage {
  manifest: TemplatePackageManifest
  files: Map<string, Buffer>
  legacy: boolean
}

/**
 * Reads a package written before the single-file format existed: a folder with a fixed set of
 * files and six coarse categories.
 *
 * Kept rather than dropped because those folders are on the user's disk and would otherwise become
 * unreadable with no way back. It only converts - nothing writes this shape any more. The mapping
 * is not one-to-one: the old `colors` category held both the base colours and the CSS variable
 * overrides, and its `plugins.json` held the theme entry and the authored frames' entries too
 * (with absolute paths from the exporting machine, which is why they are dropped here - the
 * frames part re-registers them from frames.json).
 */
async function loadLegacyFolder(dir: string): Promise<LoadedPackage | null> {
  const manifestPath = join(dir, MANIFEST_FILE)
  if (!existsSync(manifestPath)) return null
  let old: { name?: string; createdAt?: string; categories?: string[] }
  try {
    old = JSON.parse(await readFile(manifestPath, 'utf-8'))
  } catch {
    return null
  }
  if (!Array.isArray(old.categories)) return null

  const files = new Map<string, Buffer>()
  const parts: TemplatePartSummary[] = []
  const put = (id: TemplatePartId, payload: unknown, stats: Record<string, number>): void => {
    files.set(partFile(id), Buffer.from(JSON.stringify(payload), 'utf-8'))
    parts.push({ id, stats, requires: [] })
  }
  const readJson = async <T>(name: string): Promise<T | null> => {
    try {
      return JSON.parse(await readFile(join(dir, name), 'utf-8')) as T
    } catch {
      return null
    }
  }

  const layout = await readJson<Record<string, unknown>>('layout.json')
  // The old format had no breakpoints, so the defaults are what a package of that vintage meant -
  // they were the only widths there were. Named rather than repeated as digits: if the default ever
  // moves, this line should keep saying "whatever quartz itself switches at", not 800.
  if (layout) put('layout', { layout, breakpoints: DEFAULT_FRAME_BREAKPOINT_WIDTHS }, { groups: 0, pageTypes: 0 })

  const colors = await readJson<{ colors?: unknown; typography?: unknown; fontOrigin?: string; cssVariableOverrides?: unknown[] }>(
    'colors.json'
  )
  if (colors) {
    put('appearance', { colors: colors.colors ?? {}, typography: colors.typography ?? {}, fontOrigin: colors.fontOrigin }, {})
    const overrides = colors.cssVariableOverrides ?? []
    if (overrides.length > 0) put('cssVariables', { overrides }, { variables: overrides.length })
  }

  const frames = await readJson<Array<{ id: string }>>('frames.json')
  if (frames && frames.length > 0) put('frames', { frames }, { frames: frames.length })

  const pluginEntries = await readJson<Array<{ name: string; source: unknown }>>('plugins.json')
  if (pluginEntries) {
    const frameIds = new Set((frames ?? []).map((f) => f.id))
    const themeEntry = pluginEntries.find((e) => typeof e.source === 'string' && (e.source as string).startsWith('@quartz-themes/'))
    const rest = pluginEntries.filter(
      (e) => e !== themeEntry && !(frameIds.has(e.name) && typeof e.source === 'string' && (e.source as string).includes('authored-frames'))
    )
    if (themeEntry) {
      const themeId = (themeEntry as { options?: { theme?: string } }).options?.theme ?? null
      put('theme', { entry: themeEntry, themeId }, {})
    }
    if (rest.length > 0) put('plugins', { entries: rest }, { plugins: rest.length })
  }

  const scssPath = join(dir, 'custom.scss')
  if (existsSync(scssPath)) {
    const imported = await listFilesFlat(join(dir, 'imported'))
    for (const name of imported) {
      files.set(`files/styles/imported/${name}`, await readFile(join(dir, 'imported', name)))
    }
    const relative = imported.map((name) => `imported/${name}`)
    put('styles', { customScss: await readFile(scssPath, 'utf-8'), order: relative, files: relative }, { files: relative.length })
  }

  const fontNames = await listFilesFlat(join(dir, 'fonts'))
  if (fontNames.length > 0) {
    for (const name of fontNames) files.set(`files/fonts/${name}`, await readFile(join(dir, 'fonts', name)))
    put('fonts', { fontFaceCss: null, files: fontNames }, { files: fontNames.length })
  }

  return {
    manifest: {
      formatVersion: 0,
      name: old.name ?? basename(dir),
      createdAt: old.createdAt ?? new Date(0).toISOString(),
      createdBy: { app: 'QuartzControl', appVersion: '' },
      source: {},
      parts
    },
    files,
    legacy: true
  }
}

async function loadPackage(packagePath: string): Promise<LoadedPackage | null> {
  if (!existsSync(packagePath)) return null
  if ((await stat(packagePath)).isDirectory()) return loadLegacyFolder(packagePath)
  // Deliberately not caught: readZipFile's messages are the only place that knows *what* is wrong
  // with a package - a name that would write outside, an entry that does not match its checksum,
  // an unsupported method, the 256-MB ceiling. Turning all of them into `null` made every one
  // arrive as the same "Die Vorlage ließ sich nicht lesen", the ceiling string included, which was
  // written for the user on 2026-09-02 and could never be seen. `null` keeps the two cases that
  // have nothing to say: no file, and a file that carries no readable manifest.
  const files = await readZipFile(packagePath)
  const raw = files.get(MANIFEST_FILE)
  if (!raw) return null
  try {
    return { manifest: JSON.parse(raw.toString('utf-8')) as TemplatePackageManifest, files, legacy: false }
  } catch {
    return null
  }
}

function payloadOf(pkg: LoadedPackage, id: TemplatePartId): unknown | null {
  const raw = pkg.files.get(partFile(id))
  if (!raw) return null
  try {
    return JSON.parse(raw.toString('utf-8'))
  } catch {
    return null
  }
}

/**
 * A real dry run: reads both the package and the target project and reports, per part, what would
 * be added and what already exists - before anything is written. The preview it replaced only
 * echoed the manifest back, so the first time a user learned what an import had changed was from
 * the warnings afterwards.
 */
export async function planImport(projectPath: string, packagePath: string): Promise<TemplatePackagePlan | null> {
  const pkg = await loadPackage(packagePath)
  if (!pkg) return null

  const parts: TemplatePartPlan[] = []
  const unknownParts: string[] = []
  for (const summary of pkg.manifest.parts ?? []) {
    const part = PARTS[summary.id]
    const payload = payloadOf(pkg, summary.id)
    if (!part || payload === null) {
      unknownParts.push(summary.id)
      continue
    }
    // A part whose own plan throws must not take the whole preview with it - the package may have
    // been written by a newer version whose payload shape this one cannot read.
    try {
      const plan = await part.plan(payload, {
        projectPath,
        strategy: 'packageWins',
        files: pkg.files,
        warn: () => {},
        progress: () => {}
      })
      parts.push({ id: summary.id, ...plan })
    } catch {
      unknownParts.push(summary.id)
    }
  }
  return { manifest: pkg.manifest, parts, unknownParts, legacy: pkg.legacy }
}

export async function importPackage(
  projectPath: string,
  packagePath: string,
  selected: TemplatePartId[],
  strategy: TemplateConflictStrategy,
  onProgress?: (progress: Omit<TemplateImportProgress, 'projectPath'>) => void
): Promise<TemplatePackageImportResult> {
  const pkg = await loadPackage(packagePath)
  if (!pkg) return { success: false, warnings: ['packageUnreadable'] }

  const warnings: string[] = []
  // An import replaces layout, colours, plugins, stylesheets and translations in one go - the most
  // far-reaching thing this app does to a project, and the case a snapshot exists for. It is also
  // what makes 'packageWins' a safe default.
  await createSnapshot(projectPath, 'styleChange', pkg.manifest.name)

  // Runs in TEMPLATE_PART_IDS order, not in the order the caller listed them: frames and plugins
  // mutate quartz.config.yaml through the Quartz CLI and have to precede the parts that write it
  // from an in-memory copy, and the three parts that share custom.scss run last, one at a time.
  const todo = TEMPLATE_PART_IDS.filter((id) => selected.includes(id) && PARTS[id] && pkg.files.has(partFile(id)))
  let done = 0
  for (const id of todo) {
    const payload = payloadOf(pkg, id)
    if (payload === null) {
      warnings.push(`partUnreadable:${id}`)
      done++
      continue
    }
    onProgress?.({ partId: id, message: '', done, total: todo.length })
    try {
      await PARTS[id].apply(payload, {
        projectPath,
        strategy,
        files: pkg.files,
        warn: (message) => warnings.push(message),
        progress: (message) => onProgress?.({ partId: id, message, done, total: todo.length })
      })
    } catch (err) {
      warnings.push(`partFailed:${id}:${err instanceof Error ? err.message : String(err)}`)
    }
    done++
    onProgress?.({ partId: id, message: '', done, total: todo.length })
  }

  return { success: true, warnings }
}

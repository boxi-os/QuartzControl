import { createHash } from 'crypto'
import { existsSync } from 'fs'
import { copyFile, mkdir, readdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type {
  CssVariableOverride,
  FrameBreakpointWidths,
  GridFrameDefinition,
  LayoutConfig,
  LocaleEntry,
  PluginEntry,
  TemplatePackageDependency,
  ThemePreset
} from '@shared/ipc-contract'
import * as configService from '../configService'
import * as contentService from '../contentService'
import * as layoutFrameService from '../layoutFrameService'
import * as localizationService from '../localizationService'
import * as pluginService from '../pluginService'
import * as styleService from '../styleService'
import * as themePresetsService from '../themePresetsService'
import { runCommand } from '../runCommand'
import { mainT } from '../../i18n'
import type { ZipEntry } from '../zipArchive'
import { containedPath, emptyPlan, hasNodeModule, installedVersion, listFilesFlat, type ApplyContext, type TemplatePart } from './shared'

// custom.scss's managed sections, split across three parts so each travels with what it describes:
// 'imports' (the load order) and the file's own free-form body belong to `styles`, 'fonts' to
// `fonts` (the @font-face rules and the files they point at are one thing), 'css-vars' to
// `cssVariables`. 'imported-styles' is written by an import under 'projectWins' and is stripped
// out on export like any other managed section, so packages never nest inside one another.
const MANAGED_MARKERS = ['imports', 'css-vars', 'fonts', 'imported-styles'] as const
const FONTS_MARKER = 'fonts'

function stripAllManaged(content: string): string {
  return MANAGED_MARKERS.reduce((acc, marker) => styleService.stripManagedBlock(acc, marker), content).trim()
}

function stylesDir(projectPath: string): string {
  return join(projectPath, 'quartz', 'styles')
}

function styleFilePath(projectPath: string, relativePath: string): string {
  return join(stylesDir(projectPath), ...relativePath.split('/'))
}

function fontsDir(projectPath: string): string {
  return join(projectPath, 'quartz', 'static', 'fonts')
}

function sha(buffer: Buffer | string): string {
  return createHash('sha256').update(buffer).digest('hex')
}

// A theme is one plugin entry whose source is any package in the @quartz-themes scope - the scope
// is the marker, not a fixed package name (same rule Styles/Theme.tsx uses to find it).
function themeEntryIndex(plugins: PluginEntry[]): number {
  return plugins.findIndex((p) => typeof p.source === 'string' && p.source.startsWith('@quartz-themes/'))
}

// An entry registered by layoutFrameService: its source is an absolute path into *this* machine's
// .quartz-gui/authored-frames. Both halves have to agree (a frame with that id exists *and* the
// source points into the frame directory), the same test Plugins/Installed.tsx makes.
function isFrameEntry(entry: PluginEntry, frameIds: Set<string>): boolean {
  return frameIds.has(entry.name) && typeof entry.source === 'string' && entry.source.includes('authored-frames')
}

// A bare npm specifier ("@quartz-community/explorer", "some-plugin") as opposed to the github:/
// git+/https:/local-path forms the Quartz CLI clones and builds. Verified against the CLI's own
// parseGitSource, which treats exactly this shape as an "npmPackage" source.
function npmPackageName(source: PluginEntry['source']): string | null {
  if (typeof source !== 'string') return null
  if (/^(github:|git\+|https?:|file:|\.|\/)/.test(source)) return null
  return /^(@[^/]+\/)?[^@/][^/]*$/.test(source) ? source : null
}

async function writeConfigPatch(projectPath: string, patch: (config: Awaited<ReturnType<typeof configService.readConfig>>) => unknown): Promise<void> {
  const config = await configService.readConfig(projectPath)
  await configService.writeConfig(projectPath, patch(config) as typeof config)
}

/* ------------------------------------------------------------------ appearance */

interface AppearancePayload {
  colors: Record<string, unknown>
  typography: Record<string, string>
  fontOrigin?: string
  cdnCaching?: boolean
}

// cdnCaching travels with fontOrigin deliberately: together they are core's whole font-delivery
// decision (see CLAUDE.md on the two independent webfont mechanisms), and exporting only one of
// them - which the old 'colors' category did - lands the two halves of one switch in different
// states in the target.
const appearance: TemplatePart<AppearancePayload> = {
  id: 'appearance',
  async collect({ projectPath }) {
    const config = await configService.readConfig(projectPath)
    const payload: AppearancePayload = {
      colors: (config.theme.colors ?? {}) as Record<string, unknown>,
      typography: (config.theme.typography ?? {}) as Record<string, string>,
      fontOrigin: config.theme.fontOrigin,
      cdnCaching: config.theme.cdnCaching
    }
    // theme.colors nests one object per mode (lightMode/darkMode), so the count the user cares
    // about is the leaves, not the two groups.
    const colourCount = Object.values(payload.colors).reduce<number>(
      (sum, group) => sum + (group && typeof group === 'object' ? Object.keys(group).length : 1),
      0
    )
    return { payload, stats: { colors: colourCount, fonts: Object.keys(payload.typography).length } }
  },
  async plan(payload, { projectPath }) {
    const config = await configService.readConfig(projectPath)
    const plan = emptyPlan()
    if (JSON.stringify(config.theme.colors ?? {}) !== JSON.stringify(payload.colors)) plan.conflicts.push('colors')
    if (JSON.stringify(config.theme.typography ?? {}) !== JSON.stringify(payload.typography)) plan.conflicts.push('typography')
    if (config.theme.fontOrigin !== payload.fontOrigin || config.theme.cdnCaching !== payload.cdnCaching) {
      plan.conflicts.push('fontDelivery')
    }
    return plan
  },
  async apply(payload, { projectPath, strategy, warn }) {
    if (strategy === 'projectWins') {
      warn('appearanceSkipped')
      return
    }
    await writeConfigPatch(projectPath, (config) => ({
      ...config,
      theme: {
        ...config.theme,
        colors: payload.colors,
        typography: payload.typography,
        ...(payload.fontOrigin !== undefined ? { fontOrigin: payload.fontOrigin } : {}),
        ...(payload.cdnCaching !== undefined ? { cdnCaching: payload.cdnCaching } : {})
      }
    }))
  }
}

/* --------------------------------------------------------------- cssVariables */

interface CssVariablesPayload {
  overrides: CssVariableOverride[]
}

const cssVariables: TemplatePart<CssVariablesPayload> = {
  id: 'cssVariables',
  async collect({ projectPath }) {
    const overrides = await styleService.getVariableOverrides(projectPath)
    if (overrides.length === 0) return null
    return { payload: { overrides }, stats: { variables: overrides.length } }
  },
  async plan(payload, { projectPath }) {
    const existing = new Map((await styleService.getVariableOverrides(projectPath)).map((o) => [o.key, o]))
    const plan = emptyPlan()
    for (const override of payload.overrides) {
      const current = existing.get(override.key)
      if (!current) plan.additions.push(`--${override.key}`)
      else if (current.light !== override.light || current.dark !== override.dark) plan.conflicts.push(`--${override.key}`)
    }
    return plan
  },
  // Merged per key rather than replaced wholesale: an override the package never mentions is not a
  // conflict, and dropping it would silently undo an unrelated decision in the target project.
  async apply(payload, { projectPath, strategy }) {
    const merged = new Map((await styleService.getVariableOverrides(projectPath)).map((o) => [o.key, o]))
    for (const override of payload.overrides) {
      if (strategy === 'projectWins' && merged.has(override.key)) continue
      merged.set(override.key, override)
    }
    await styleService.saveVariableOverrides(projectPath, [...merged.values()])
  }
}

/* ---------------------------------------------------------------------- theme */

interface ThemePayload {
  entry: PluginEntry
  themeId: string | null
}

const theme: TemplatePart<ThemePayload> = {
  id: 'theme',
  async collect({ projectPath }) {
    const config = await configService.readConfig(projectPath)
    const index = themeEntryIndex(config.plugins)
    if (index === -1) return null
    const entry = config.plugins[index]
    const themeId = typeof entry.options?.theme === 'string' ? (entry.options.theme as string) : null
    const packages = ['@quartz-themes/core', ...(themeId ? [`@quartz-themes/${themeId}`] : [])]
    const requires: TemplatePackageDependency[] = []
    for (const name of packages) requires.push({ name, version: await installedVersion(projectPath, name) })
    const settings = entry.options?.styleSettings
    return {
      payload: { entry, themeId },
      stats: { styleSettings: settings && typeof settings === 'object' ? Object.keys(settings).length : 0 },
      requires
    }
  },
  async plan(payload, { projectPath }) {
    const config = await configService.readConfig(projectPath)
    const index = themeEntryIndex(config.plugins)
    const plan = emptyPlan()
    if (index === -1) plan.additions.push(payload.themeId ?? '@quartz-themes/core')
    else plan.conflicts.push((config.plugins[index].options?.theme as string) ?? '@quartz-themes/core')
    for (const name of ['@quartz-themes/core', ...(payload.themeId ? [`@quartz-themes/${payload.themeId}`] : [])]) {
      if (!hasNodeModule(projectPath, name)) plan.missingPackages.push({ name })
    }
    return plan
  },
  async apply(payload, { projectPath, strategy, warn, progress }) {
    const config = await configService.readConfig(projectPath)
    const index = themeEntryIndex(config.plugins)
    if (index !== -1 && strategy === 'projectWins') {
      warn('themeSkipped')
      return
    }
    // The theme's own package is what the old implementation never installed: the config entry
    // travelled, @quartz-themes/core resolved it by name at build time, and the build failed on a
    // machine that had never had that theme.
    const missing = ['@quartz-themes/core', ...(payload.themeId ? [`@quartz-themes/${payload.themeId}`] : [])].filter(
      (name) => !hasNodeModule(projectPath, name)
    )
    if (missing.length > 0) {
      progress(missing.join(', '))
      const result = await runCommand('npm', ['install', ...missing], projectPath)
      if (!result.success) warn(`themeInstallFailed:${missing.join(', ')}:${result.output.slice(-400)}`)
    }
    const next = [...config.plugins]
    if (index === -1) next.push(payload.entry)
    else next[index] = { ...payload.entry, order: next[index].order ?? payload.entry.order }
    await configService.writeConfig(projectPath, { ...config, plugins: next })
  }
}

/* --------------------------------------------------------------------- styles */

interface StylesPayload {
  /** custom.scss with every managed section removed - the part the user actually wrote. */
  customScss: string
  /** Load order, as relative paths like "custom/typography.scss". */
  order: string[]
  files: string[]
}

// Sass rejects a @use that follows any other rule, so an imported body cannot simply be appended
// under a marker: its own @use lines have to be hoisted to the top of the file first.
function splitUseStatements(content: string): { useLines: string[]; rest: string } {
  const useLines: string[] = []
  const restLines: string[] = []
  for (const line of content.split('\n')) {
    if (/^\s*@(use|forward)\s+.*;\s*$/.test(line)) useLines.push(line.trim())
    else restLines.push(line)
  }
  return { useLines, rest: restLines.join('\n') }
}

const styles: TemplatePart<StylesPayload> = {
  id: 'styles',
  async collect({ projectPath }) {
    const set = await styleService.listStyleFiles(projectPath)
    const body = stripAllManaged(set.main.content)
    const files = set.files.map((f) => f.relativePath)
    if (body === '' && files.length === 0) return null
    const entries: ZipEntry[] = []
    for (const relativePath of files) {
      const path = styleFilePath(projectPath, relativePath)
      if (existsSync(path)) entries.push({ name: `files/styles/${relativePath}`, data: await readFile(path) })
    }
    return {
      payload: { customScss: body, order: set.files.filter((f) => f.imported).map((f) => f.relativePath), files },
      files: entries,
      stats: { files: files.length }
    }
  },
  async plan(payload, { projectPath }) {
    const plan = emptyPlan()
    for (const relativePath of payload.files) {
      // A name that would leave quartz/styles is dropped from the plan too, not only from apply -
      // the plan is what the user ticks, and it must not promise a file that will never be written.
      const target = containedPath(stylesDir(projectPath), relativePath)
      if (!target) continue
      if (existsSync(target)) plan.conflicts.push(relativePath)
      else plan.additions.push(relativePath)
    }
    const current = stripAllManaged((await styleService.readCustomScss(projectPath)).content)
    if (current !== payload.customScss) plan.conflicts.push('custom.scss')
    return plan
  },
  /**
   * Rebuilds custom.scss instead of patching it, because the file's managed sections are owned by
   * *other* parts that may or may not be running: everything is stripped down to the free body,
   * the body is replaced (or merged), and each section is then rewritten through the service
   * function that owns it - which is also the only way the 'imports' block ends up back at the top
   * of the file, where Sass requires it.
   */
  async apply(payload, { projectPath, strategy, files, warn }) {
    for (const relativePath of payload.files) {
      const data = files.get(`files/styles/${relativePath}`)
      if (!data) continue
      const target = containedPath(stylesDir(projectPath), relativePath)
      if (!target) {
        warn(`fileOutsideProject:${relativePath}`)
        continue
      }
      if (existsSync(target) && strategy === 'projectWins') {
        warn(`styleFileSkipped:${relativePath}`)
        continue
      }
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, data)
    }

    const before = await styleService.readCustomScss(projectPath)
    const keptFonts = styleService.getManagedBlock(before.content, FONTS_MARKER)
    const keptVariables = await styleService.getVariableOverrides(projectPath)
    const existingOrder = (await styleService.listStyleFiles(projectPath)).files.filter((f) => f.imported).map((f) => f.relativePath)

    let body: string
    if (strategy === 'packageWins') {
      body = payload.customScss
    } else {
      // Nothing is thrown away under 'projectWins': the project's own file stays the file, and the
      // package's rules are appended in their own managed section, which is also what makes them
      // removable again later.
      const own = stripAllManaged(before.content)
      const { useLines, rest } = splitUseStatements(payload.customScss)
      const missing = useLines.filter((line) => !own.includes(line))
      const withUses = missing.length > 0 ? `${missing.join('\n')}\n${own}` : own
      // Two projects that both still carry Quartz's own "// put your custom CSS here!" line and
      // nothing else would otherwise get that comment appended to itself in a managed block.
      const incoming = rest.trim()
      body = incoming === '' || own.includes(incoming) ? withUses : styleService.upsertManagedBlock(withUses, 'imported-styles', incoming)
    }
    await styleService.writeCustomScss(projectPath, body)

    if (keptFonts) {
      const restored = await styleService.readCustomScss(projectPath)
      await styleService.writeCustomScss(projectPath, styleService.upsertManagedBlock(restored.content, FONTS_MARKER, keptFonts))
    }
    if (keptVariables.length > 0) await styleService.saveVariableOverrides(projectPath, keptVariables)

    // The order the package brings, restricted to files that exist here, with anything the target
    // already imported and the package does not know appended after it.
    const packageOrder = payload.order.filter((p) => existsSync(styleFilePath(projectPath, p)))
    const merged = strategy === 'packageWins' ? packageOrder : existingOrder
    for (const relativePath of strategy === 'packageWins' ? existingOrder : packageOrder) {
      if (!merged.includes(relativePath)) merged.push(relativePath)
    }
    await styleService.setImportOrder(projectPath, merged)
  }
}

/* ---------------------------------------------------------------------- fonts */

interface FontsPayload {
  /** The generated @font-face rules from custom.scss's 'fonts' section. */
  fontFaceCss: string | null
  files: string[]
}

const fonts: TemplatePart<FontsPayload> = {
  id: 'fonts',
  async collect({ projectPath }) {
    const names = await listFilesFlat(fontsDir(projectPath))
    const fontFaceCss = styleService.getManagedBlock((await styleService.readCustomScss(projectPath)).content, FONTS_MARKER)
    if (names.length === 0 && !fontFaceCss) return null
    const entries: ZipEntry[] = []
    for (const name of names) entries.push({ name: `files/fonts/${name}`, data: await readFile(join(fontsDir(projectPath), name)) })
    return { payload: { fontFaceCss, files: names }, files: entries, stats: { files: names.length } }
  },
  async plan(payload, { projectPath, files }) {
    const plan = emptyPlan()
    for (const name of payload.files) {
      const target = containedPath(fontsDir(projectPath), name)
      if (!target) continue
      if (!existsSync(target)) {
        plan.additions.push(name)
        continue
      }
      // An identical file is neither an addition nor a conflict - the same font shipped twice is
      // the normal case when two packages come from the same designer.
      const incoming = files.get(`files/fonts/${name}`)
      if (incoming && sha(incoming) === sha(await readFile(target))) plan.notes.push(`identical:${name}`)
      else plan.conflicts.push(name)
    }
    if (payload.fontFaceCss) {
      const current = styleService.getManagedBlock((await styleService.readCustomScss(projectPath)).content, FONTS_MARKER)
      if (current && current !== payload.fontFaceCss) plan.conflicts.push('@font-face')
      else if (!current) plan.additions.push('@font-face')
    }
    return plan
  },
  async apply(payload, { projectPath, strategy, files, warn }) {
    await mkdir(fontsDir(projectPath), { recursive: true })
    for (const name of payload.files) {
      const data = files.get(`files/fonts/${name}`)
      if (!data) continue
      const target = containedPath(fontsDir(projectPath), name)
      if (!target) {
        warn(`fileOutsideProject:${name}`)
        continue
      }
      if (existsSync(target)) {
        if (sha(data) === sha(await readFile(target))) continue
        if (strategy === 'projectWins') {
          warn(`fontSkipped:${name}`)
          continue
        }
      }
      await writeFile(target, data)
    }
    if (!payload.fontFaceCss) return
    const info = await styleService.readCustomScss(projectPath)
    const current = styleService.getManagedBlock(info.content, FONTS_MARKER)
    // Under 'projectWins' the target's own rules stay, but the package's are still appended - a
    // @font-face that is dropped leaves the font files it shipped unreferenced and useless.
    const body =
      current && strategy === 'projectWins'
        ? `${current}\n\n${payload.fontFaceCss}`
        : current === payload.fontFaceCss
          ? current
          : payload.fontFaceCss
    await styleService.writeCustomScss(projectPath, styleService.upsertManagedBlock(info.content, FONTS_MARKER, body))
  }
}

/* --------------------------------------------------------------------- layout */

interface LayoutPayload {
  layout: LayoutConfig | null
  breakpoints: FrameBreakpointWidths
}

const layout: TemplatePart<LayoutPayload> = {
  id: 'layout',
  async collect({ projectPath }) {
    const config = await configService.readConfig(projectPath)
    const breakpoints = await layoutFrameService.getBreakpointWidths(projectPath)
    if (!config.layout && !breakpoints) return null
    const groups = Object.keys(config.layout?.groups ?? {}).length
    const pageTypes = Object.keys(config.layout?.byPageType ?? {}).length
    return { payload: { layout: config.layout ?? null, breakpoints }, stats: { groups, pageTypes } }
  },
  async plan(payload, { projectPath }) {
    const config = await configService.readConfig(projectPath)
    const plan = emptyPlan()
    if (JSON.stringify(config.layout ?? null) !== JSON.stringify(payload.layout)) plan.conflicts.push('layout')
    const current = await layoutFrameService.getBreakpointWidths(projectPath)
    if (current.tablet !== payload.breakpoints.tablet || current.mobile !== payload.breakpoints.mobile) {
      plan.conflicts.push('breakpoints')
    }
    return plan
  },
  async apply(payload, { projectPath, strategy, warn }) {
    if (strategy === 'projectWins') {
      warn('layoutSkipped')
      return
    }
    if (payload.layout) await writeConfigPatch(projectPath, (config) => ({ ...config, layout: payload.layout }))
    // Rewrites every frame's generated CSS, because the widths are baked into each frame's media
    // queries at codegen time (see layoutFrameService) - a frame left alone would keep the old
    // thresholds with nothing in the UI to show it.
    await layoutFrameService.saveBreakpointWidths(projectPath, payload.breakpoints)
  }
}

/* --------------------------------------------------------------------- frames */

interface FramesPayload {
  frames: GridFrameDefinition[]
}

const frames: TemplatePart<FramesPayload> = {
  id: 'frames',
  async collect({ projectPath }) {
    const list = await layoutFrameService.listFrames(projectPath)
    if (list.length === 0) return null
    return { payload: { frames: list }, stats: { frames: list.length } }
  },
  async plan(payload, { projectPath }) {
    const existing = new Set((await layoutFrameService.listFrames(projectPath)).map((f) => f.id))
    const plan = emptyPlan()
    for (const frame of payload.frames) {
      if (existing.has(frame.id)) plan.conflicts.push(frame.frameName || frame.id)
      else plan.additions.push(frame.frameName || frame.id)
    }
    return plan
  },
  async apply(payload, { projectPath, strategy, warn, progress }) {
    const existing = new Set((await layoutFrameService.listFrames(projectPath)).map((f) => f.id))
    for (const frame of payload.frames) {
      if (existing.has(frame.id) && strategy === 'projectWins') {
        warn(`frameSkipped:${frame.frameName || frame.id}`)
        continue
      }
      progress(frame.frameName || frame.id)
      // saveFrame regenerates the frame's files from the definition and registers it with
      // `quartz plugin add <its own directory>` - which is why a frame's plugin entry is never
      // carried in the `plugins` part: its source is an absolute path on the exporting machine.
      const result = await layoutFrameService.saveFrame(projectPath, frame, { snapshot: false })
      if (!result.success) {
        warn(`frameFailed:${frame.frameName || frame.id}:${result.output.slice(-400)}`)
        continue
      }
      // Verified, not assumed: with a `.quartz/plugins/<id>` link already in place - which a
      // project that once had this frame can easily still have - `quartz plugin add` exits 0 and
      // writes *no* config entry, so the frame is built by nothing while looking installed.
      // Reproduced against a real project. Same "check the file, don't trust the exit code" rule
      // createService applies to `quartz create`.
      const config = await configService.readConfig(projectPath)
      if (!config.plugins.some((p) => p.name === frame.id)) {
        await configService.writeConfig(projectPath, {
          ...config,
          plugins: [...config.plugins, { name: frame.id, source: layoutFrameService.authoredFrameDir(projectPath, frame.id), enabled: true }]
        })
      }
    }
  }
}

/* -------------------------------------------------------------------- plugins */

interface PluginsPayload {
  entries: PluginEntry[]
}

const plugins: TemplatePart<PluginsPayload> = {
  id: 'plugins',
  async collect({ projectPath }) {
    const config = await configService.readConfig(projectPath)
    const frameIds = new Set((await layoutFrameService.listFrames(projectPath)).map((f) => f.id))
    const themeIndex = themeEntryIndex(config.plugins)
    const entries = config.plugins.filter((entry, index) => index !== themeIndex && !isFrameEntry(entry, frameIds))
    if (entries.length === 0) return null
    const requires: TemplatePackageDependency[] = []
    for (const entry of entries) {
      const name = npmPackageName(entry.source)
      if (name) requires.push({ name, version: await installedVersion(projectPath, name) })
    }
    return {
      payload: { entries },
      stats: { plugins: entries.length, active: entries.filter((e) => e.enabled).length },
      requires
    }
  },
  async plan(payload, { projectPath }) {
    const config = await configService.readConfig(projectPath)
    const existing = new Set(config.plugins.map((p) => p.name))
    const plan = emptyPlan()
    for (const entry of payload.entries) {
      const name = configService.deriveName(entry.source)
      if (existing.has(name)) plan.conflicts.push(name)
      else plan.additions.push(name)
      const npmName = npmPackageName(entry.source)
      if (npmName && !hasNodeModule(projectPath, npmName)) plan.missingPackages.push({ name: npmName })
      else if (!npmName && typeof entry.source === 'string' && !existsSync(join(projectPath, '.quartz', 'plugins', name))) {
        plan.notes.push(`cliInstall:${name}`)
      }
    }
    return plan
  },
  /**
   * Installs only what is genuinely missing and writes every config entry in a single save.
   *
   * The previous implementation ran `quartz plugin add` for each of the 48 entries a real project
   * carries and re-read the config in between - which meant 48 npm installs for packages Quartz
   * already ships, 48 snapshots (pluginChange does not coalesce), and 48 config writes.
   */
  async apply(payload, { projectPath, strategy, warn, progress }) {
    const config = await configService.readConfig(projectPath)
    const byName = new Map(config.plugins.map((entry, index) => [entry.name, index]))
    const next = [...config.plugins]

    const missingNpm: string[] = []
    for (const entry of payload.entries) {
      const npmName = npmPackageName(entry.source)
      if (npmName && !hasNodeModule(projectPath, npmName)) missingNpm.push(npmName)
    }
    if (missingNpm.length > 0) {
      progress(missingNpm.join(', '))
      const result = await runCommand('npm', ['install', ...new Set(missingNpm)], projectPath)
      if (!result.success) warn(`pluginInstallFailed:${missingNpm.join(', ')}:${result.output.slice(-400)}`)
    }

    for (const entry of payload.entries) {
      const name = configService.deriveName(entry.source)
      const index = byName.get(name)
      if (index !== undefined && strategy === 'projectWins') {
        warn(`pluginSkipped:${name}`)
        continue
      }
      if (typeof entry.source !== 'string') {
        warn(`pluginUnsupported:${name}`)
        continue
      }
      // A github:/git+ source has to go through the CLI - it clones, builds and writes
      // quartz.lock.json, none of which can be reproduced by writing a config entry.
      if (!npmPackageName(entry.source) && !existsSync(join(projectPath, '.quartz', 'plugins', name))) {
        progress(name)
        const result = await pluginService.installPluginSource(projectPath, entry.source)
        if (!result.success) {
          warn(`pluginInstallFailed:${name}:${result.output.slice(-400)}`)
          continue
        }
      }
      if (index === undefined) next.push({ ...entry, name })
      else next[index] = { ...entry, name }
    }

    // Re-read: a CLI install appends its own bare entry to quartz.config.yaml behind our back, so
    // the in-memory copy above is stale for exactly those plugins. Entries we wrote win; anything
    // the CLI added that we do not know about is kept.
    const after = await configService.readConfig(projectPath)
    const written = new Map(next.map((entry) => [entry.name, entry]))
    const merged = after.plugins.map((entry) => written.get(entry.name) ?? entry)
    for (const entry of next) if (!merged.some((e) => e.name === entry.name)) merged.push(entry)
    await configService.writeConfig(projectPath, { ...after, plugins: merged })
  }
}

/* --------------------------------------------------------------- translations */

interface TranslationsPayload {
  scope: 'changed' | 'all'
  locales: Array<{ code: string; entries: LocaleEntry[] }>
}

const translations: TemplatePart<TranslationsPayload> = {
  id: 'translations',
  // Both scopes are reported, because the export form has to offer the fallback: where no baseline
  // can be established (`undetermined`), "changed" is empty and would otherwise leave a user with
  // real translations nothing to select at all.
  async probe({ projectPath }) {
    const customizations = await localizationService.getTranslationCustomizations(projectPath)
    const withChanges = customizations.filter((c) => c.changed.length > 0)
    const all = customizations.map((c) => localizationService.getAllEntries(projectPath, c.code)).filter((e) => e.length > 0)
    return {
      languages: withChanges.length,
      entries: withChanges.reduce((sum, c) => sum + c.changed.length, 0),
      allLanguages: all.length,
      allEntries: all.reduce((sum, e) => sum + e.length, 0),
      undetermined: customizations.filter((c) => c.source === 'none').length
    }
  },
  async collect({ projectPath, translationScope }) {
    const customizations = await localizationService.getTranslationCustomizations(projectPath)
    const locales = customizations
      .map(({ code, changed }) => ({
        code,
        entries: translationScope === 'all' ? localizationService.getAllEntries(projectPath, code) : changed
      }))
      .filter((locale) => locale.entries.length > 0)
    if (locales.length === 0) return null
    return {
      payload: { scope: translationScope, locales },
      stats: { languages: locales.length, entries: locales.reduce((sum, l) => sum + l.entries.length, 0) }
    }
  },
  async plan(payload, { projectPath }) {
    const plan = emptyPlan()
    // "Already has this" means the *target* customised that key itself - not that the key exists,
    // which it always does. Answered with the same baseline mechanism the export uses.
    const own = new Map(
      (await localizationService.getTranslationCustomizations(projectPath)).map((c) => [
        c.code,
        new Set(c.changed.map((e) => e.path.join('.')))
      ])
    )
    for (const locale of payload.locales) {
      const current = new Map(localizationService.getAllEntries(projectPath, locale.code).map((e) => [e.path.join('.'), e.value]))
      const customised = own.get(locale.code) ?? new Set<string>()
      for (const entry of locale.entries) {
        const key = entry.path.join('.')
        if (!current.has(key)) plan.notes.push(`missingKey:${locale.code}:${key}`)
        else if (current.get(key) === entry.value) continue
        else if (customised.has(key)) plan.conflicts.push(`${locale.code}: ${key}`)
        else plan.additions.push(`${locale.code}: ${key}`)
      }
    }
    return plan
  },
  async apply(payload, { projectPath, strategy, warn, progress }) {
    const own = new Map(
      (await localizationService.getTranslationCustomizations(projectPath)).map((c) => [
        c.code,
        new Set(c.changed.map((e) => e.path.join('.')))
      ])
    )
    for (const locale of payload.locales) {
      progress(locale.code)
      const customised = own.get(locale.code) ?? new Set<string>()
      const current = new Map(localizationService.getAllEntries(projectPath, locale.code).map((e) => [e.path.join('.'), e.value]))
      for (const entry of locale.entries) {
        const key = entry.path.join('.')
        if (!current.has(key)) {
          warn(`missingKey:${locale.code}:${key}`)
          continue
        }
        if (current.get(key) === entry.value) continue
        if (strategy === 'projectWins' && customised.has(key)) continue
        const result = localizationService.saveLocaleEntry(projectPath, locale.code, entry.path, entry.kind, entry.value)
        if (!result.success) warn(`translationFailed:${locale.code}:${key}:${result.error ?? ''}`)
      }
    }
  }
}

/* -------------------------------------------------------------------- presets */

interface PresetsPayload {
  presets: ThemePreset[]
}

const presets: TemplatePart<PresetsPayload> = {
  id: 'presets',
  async collect({ projectPath }) {
    const list = await themePresetsService.listPresets(projectPath)
    if (list.length === 0) return null
    return { payload: { presets: list }, stats: { presets: list.length } }
  },
  async plan(payload, { projectPath }) {
    const existing = new Set((await themePresetsService.listPresets(projectPath)).map((p) => p.id))
    const plan = emptyPlan()
    for (const preset of payload.presets) {
      if (existing.has(preset.id)) plan.conflicts.push(preset.name)
      else plan.additions.push(preset.name)
    }
    return plan
  },
  async apply(payload, { projectPath, strategy, warn }) {
    const existing = new Set((await themePresetsService.listPresets(projectPath)).map((p) => p.id))
    for (const preset of payload.presets) {
      if (existing.has(preset.id) && strategy === 'projectWins') {
        warn(`presetSkipped:${preset.name}`)
        continue
      }
      await themePresetsService.savePreset(projectPath, preset)
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the registry is heterogeneous by
// design: each part has its own payload type, which only that part's own three functions ever see.
/* -------------------------------------------------------------------- content */

// The notes themselves. The one part that carries what a site *says* rather than how it looks, and
// the only one that is genuinely optional in both directions: a template exists to be a design, and
// most of them should ship without a single page. It exists because this app's own example template
// is also its manual - the pages explain the components they are rendered by - and a manual that
// does not arrive with the thing it documents is a link somebody has to find.
//
// Three rules keep it from being a foot-gun:
//
//   * Hidden entries are skipped. A vault carries .obsidian and usually its own .git; neither is
//     content, and .git alone was 1107 of the example vault's 1392 entries.
//   * There is a cap. A template is a design, not a backup: past it the export says so instead of
//     writing a package nobody can send anywhere.
//   * A symlinked content folder is never written into. That is the important one - `content/` in
//     the target may be a link into somebody's Obsidian vault, and an import would then drop the
//     package's notes among their own. The plan says so before the click and apply refuses.
interface ContentPayload {
  files: string[]
}

const CONTENT_MAX_BYTES = 100 * 1024 * 1024

async function listContentFiles(dir: string, prefix = ''): Promise<string[]> {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) out.push(...(await listContentFiles(join(dir, entry.name), rel)))
    else out.push(rel)
  }
  return out.sort()
}

const content: TemplatePart<ContentPayload> = {
  id: 'content',
  async collect({ projectPath }) {
    const dir = contentService.contentDirPath(projectPath)
    const names = await listContentFiles(dir)
    if (names.length === 0) return null
    const entries: ZipEntry[] = []
    let bytes = 0
    for (const name of names) {
      const data = await readFile(join(dir, name))
      bytes += data.length
      if (bytes > CONTENT_MAX_BYTES) {
        throw new Error(mainT('templateContentTooLarge', { limit: Math.round(CONTENT_MAX_BYTES / 1024 / 1024) }))
      }
      entries.push({ name: `files/content/${name}`, data })
    }
    return { payload: { files: names }, files: entries, stats: { files: names.length, kilobytes: Math.round(bytes / 1024) } }
  },
  async plan(payload, { projectPath, files }) {
    const plan = emptyPlan()
    const status = await contentService.getContentStatus(projectPath)
    if (status.isSymlink) {
      // Not a conflict per file: the whole part cannot run, and saying that once is clearer than
      // saying it 254 times.
      plan.notes.push('contentIsSymlink')
      return plan
    }
    const dir = contentService.contentDirPath(projectPath)
    for (const name of payload.files) {
      const target = containedPath(dir, name)
      if (!target) continue
      if (!existsSync(target)) {
        plan.additions.push(name)
        continue
      }
      const incoming = files.get(`files/content/${name}`)
      if (incoming && sha(incoming) === sha(await readFile(target))) plan.notes.push(`identical:${name}`)
      else plan.conflicts.push(name)
    }
    return plan
  },
  async apply(payload, { projectPath, strategy, files, warn, progress }) {
    const status = await contentService.getContentStatus(projectPath)
    if (status.isSymlink) {
      warn(`contentIsSymlink:${status.symlinkTarget ?? ''}`)
      return
    }
    const dir = contentService.contentDirPath(projectPath)
    let done = 0
    for (const name of payload.files) {
      const data = files.get(`files/content/${name}`)
      if (!data) continue
      const target = containedPath(dir, name)
      if (!target) {
        warn(`fileOutsideProject:${name}`)
        continue
      }
      if (existsSync(target)) {
        if (sha(data) === sha(await readFile(target))) continue
        if (strategy === 'projectWins') {
          warn(`contentSkipped:${name}`)
          continue
        }
      }
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, data)
      done += 1
      if (done % 25 === 0) progress(`content:${done}`)
    }
  }
}

export const PARTS: Record<string, TemplatePart<any>> = {
  appearance,
  cssVariables,
  theme,
  styles,
  fonts,
  layout,
  frames,
  plugins,
  translations,
  presets,
  content
}

export async function copyIfMissing(source: string, target: string): Promise<void> {
  if (existsSync(target)) return
  await mkdir(dirname(target), { recursive: true })
  await copyFile(source, target)
}

export type { ApplyContext }

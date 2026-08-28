import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { readdir, readFile, rm, stat, writeFile } from 'fs/promises'
import { join } from 'path'
import { parse as parseYaml } from 'yaml'
import type { StyleSettingField, StyleSettingKind, StyleSettingsSchema } from '@shared/ipc-contract'

/**
 * Where the labels for a community theme's options come from.
 *
 * A `@quartz-themes/<id>` package is a port of an Obsidian community theme, and its theme.json
 * carries only compiled CSS plus the bare `classSettings` keys - no titles, no descriptions, no
 * types (see pluginSchemaService.getThemeStyleSettingsInfo). The original theme's CSS, however,
 * contains the Obsidian "Style Settings" plugin's own `/* @settings *​/` YAML block, which has all
 * of it: title, description, type, per-mode defaults, min/max/step, select options, and a heading
 * hierarchy to group by. Verified against tcmmichaelb139/obsidian-tokyonight: two blocks
 * ("Appearance", "Editor") holding 179 settings, 30 headings and 34 descriptions, whose
 * class-toggle ids match @quartz-themes/tokyo-night's classSettings keys exactly.
 *
 * Themes are matched by slugified name against obsidianmd/obsidian-releases' registry, which
 * covers 636 of the 700 ported theme ids; the rest (renamed or delisted upstream) simply get no
 * schema, and the Theme tab falls back to its raw key/value editor.
 */

const REGISTRY_URL = 'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-css-themes.json'
const REGISTRY_TTL_MS = 24 * 60 * 60 * 1000
// theme.css files run large and the spread is wide - tokyo-night is 71 KB, Ultra Lobster 4.35 MB.
// A sanity bound on a remote file, set well clear of the largest real one rather than tuned.
const MAX_CSS_BYTES = 16 * 1024 * 1024

interface RegistryEntry {
  name: string
  author: string
  repo: string
  screenshot?: string
  modes?: string[]
}

// Theme ids reach this service straight from IPC and are used as file names, so the handler's
// `themeId` schema (must start alphanumeric, no slashes) is what keeps a cache path inside this
// directory - there is no path building to sanitise here beyond that.
function cacheDir(): string {
  const dir = join(app.getPath('userData'), 'theme-docs')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

// Slug of the upstream display name: "Tokyo Night" -> "tokyo-night", "80's Neon" -> "80s-neon".
// Apostrophes are dropped rather than turned into separators, and accents are folded, because the
// port's package name was derived the same way.
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

let registryMemo: { at: number; entries: RegistryEntry[] } | null = null

async function loadRegistry(): Promise<RegistryEntry[]> {
  if (registryMemo && Date.now() - registryMemo.at < REGISTRY_TTL_MS) return registryMemo.entries

  const cachePath = join(cacheDir(), 'community-css-themes.json')
  try {
    const res = await fetch(REGISTRY_URL)
    if (res.ok) {
      const entries = (await res.json()) as RegistryEntry[]
      if (Array.isArray(entries) && entries.length > 0) {
        registryMemo = { at: Date.now(), entries }
        await writeFile(cachePath, JSON.stringify(entries), 'utf-8').catch(() => undefined)
        return entries
      }
    }
  } catch {
    // fall through to the on-disk copy - offline is a normal state here, not an error
  }

  try {
    const entries = JSON.parse(await readFile(cachePath, 'utf-8')) as RegistryEntry[]
    registryMemo = { at: Date.now(), entries }
    return entries
  } catch {
    return []
  }
}

// A ported theme id can carry a variation suffix ("catppuccin.frappe"); the upstream theme is the
// part before the first dot.
function baseThemeId(themeId: string): string {
  return themeId.split('.')[0]
}

async function findRegistryEntry(themeId: string): Promise<RegistryEntry | null> {
  const wanted = baseThemeId(themeId)
  const entries = await loadRegistry()
  return entries.find((entry) => slugify(entry.name) === wanted) ?? null
}

// GitHub's raw host resolves "HEAD" to the repo's default branch, so this works for both `main`
// and `master` themes without an extra API call to look the branch up.
async function fetchThemeCss(repo: string): Promise<string | null> {
  for (const file of ['theme.css', 'obsidian.css']) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${repo}/HEAD/${file}`)
      if (!res.ok) continue
      const text = await res.text()
      if (text.length > MAX_CSS_BYTES) return null
      return text
    } catch {
      return null
    }
  }
  return null
}

// The `/* @settings ... */` blocks. A theme can ship more than one (tokyo-night has "Appearance"
// and "Editor"), and @quartz-themes/core accepts any of their ids as the key prefix.
function extractSettingsBlocks(css: string): string[] {
  const blocks: string[] = []
  const re = /\/\*\s*@settings\b([\s\S]*?)\*\//g
  let match: RegExpExecArray | null
  while ((match = re.exec(css)) !== null) blocks.push(match[1])
  return blocks
}

const KNOWN_KINDS = new Set<StyleSettingKind>([
  'heading',
  'info-text',
  'class-toggle',
  'class-select',
  'variable-text',
  'variable-number',
  'variable-number-slider',
  'variable-select',
  'variable-color',
  'variable-themed-color'
])

interface RawSetting {
  id?: unknown
  title?: unknown
  description?: unknown
  type?: unknown
  level?: unknown
  collapsed?: unknown
  default?: unknown
  'default-light'?: unknown
  'default-dark'?: unknown
  min?: unknown
  max?: unknown
  step?: unknown
  format?: unknown
  options?: unknown
  allowEmpty?: unknown
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : undefined
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value)
  return undefined
}

// Style Settings accepts both a bare string and a {label, value} pair per option.
function parseOptions(raw: unknown): { label: string; value: string }[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const options = raw
    .map((entry) => {
      if (typeof entry === 'string') return { label: entry, value: entry }
      if (entry && typeof entry === 'object') {
        const rec = entry as Record<string, unknown>
        const value = asString(rec.value)
        if (value === undefined) return null
        return { label: asString(rec.label) ?? value, value }
      }
      return null
    })
    .filter((entry): entry is { label: string; value: string } => entry !== null)
  return options.length > 0 ? options : undefined
}

function toField(raw: RawSetting, blockId: string): StyleSettingField | null {
  const id = asString(raw.id)
  const type = asString(raw.type)
  if (!id || !type) return null
  const kind = (KNOWN_KINDS.has(type as StyleSettingKind) ? type : 'unsupported') as StyleSettingKind
  const field: StyleSettingField = {
    id,
    blockId,
    title: asString(raw.title) ?? id,
    kind
  }
  const description = asString(raw.description)
  if (description) field.description = description
  const level = asNumber(raw.level)
  if (level !== undefined) field.level = level
  if (raw.collapsed === true) field.collapsed = true
  const format = asString(raw.format)
  if (format) field.format = format
  const min = asNumber(raw.min)
  if (min !== undefined) field.min = min
  const max = asNumber(raw.max)
  if (max !== undefined) field.max = max
  const step = asNumber(raw.step)
  if (step !== undefined) field.step = step
  const options = parseOptions(raw.options)
  if (options) field.options = options
  if (typeof raw.default === 'boolean') field.default = raw.default
  else {
    const fallback = asString(raw.default)
    if (fallback !== undefined) field.default = fallback
  }
  const defaultLight = asString(raw['default-light'])
  if (defaultLight !== undefined) field.defaultLight = defaultLight
  const defaultDark = asString(raw['default-dark'])
  if (defaultDark !== undefined) field.defaultDark = defaultDark
  return field
}

function parseBlock(body: string): { id: string; fields: StyleSettingField[] } | null {
  let doc: unknown
  try {
    doc = parseYaml(body)
  } catch {
    // Hand-written YAML inside a CSS comment is routinely slightly malformed; one bad block
    // shouldn't cost the theme its other block.
    return null
  }
  if (!doc || typeof doc !== 'object') return null
  const record = doc as { id?: unknown; name?: unknown; settings?: unknown }
  const id = asString(record.id) ?? asString(record.name)
  if (!id || !Array.isArray(record.settings)) return null
  const fields = record.settings
    .map((entry) => toField((entry ?? {}) as RawSetting, id))
    .filter((field): field is StyleSettingField => field !== null)
  return { id, fields }
}

async function readCachedSchema(themeId: string): Promise<StyleSettingsSchema | null | undefined> {
  try {
    const raw = await readFile(join(cacheDir(), `${themeId}.json`), 'utf-8')
    return JSON.parse(raw) as StyleSettingsSchema | null
  } catch {
    return undefined
  }
}

/**
 * The labelled schema for a theme's Style Settings, or null when there is none to be had (no
 * registry match, no reachable theme.css, or a theme that simply never declared `@settings`).
 * A resolved answer - including a null one - is cached on disk permanently: it describes a
 * published upstream file, and re-fetching it on every visit to the Theme tab would be a request
 * per render for data that effectively never changes. The Theme tab's reload button clears it.
 */
export async function getStyleSettingsSchema(themeId: string): Promise<StyleSettingsSchema | null> {
  const cached = await readCachedSchema(themeId)
  if (cached !== undefined) return cached

  const schema = await buildSchema(themeId)
  await writeFile(join(cacheDir(), `${themeId}.json`), JSON.stringify(schema), 'utf-8').catch(() => undefined)
  return schema
}

async function buildSchema(themeId: string): Promise<StyleSettingsSchema | null> {
  const entry = await findRegistryEntry(themeId)
  if (!entry) return null
  const css = await fetchThemeCss(entry.repo)
  if (!css) return null

  const parsed = extractSettingsBlocks(css)
    .map(parseBlock)
    .filter((block): block is { id: string; fields: StyleSettingField[] } => block !== null)
  if (parsed.length === 0) return null

  return {
    ids: parsed.map((block) => block.id),
    themeName: entry.name,
    author: entry.author,
    repo: entry.repo,
    screenshotUrl: entry.screenshot
      ? `https://raw.githubusercontent.com/${entry.repo}/HEAD/${entry.screenshot}`
      : undefined,
    fields: parsed.flatMap((block) => block.fields)
  }
}

// Size and entry count of the whole theme-docs directory, for the Settings page's maintenance
// section. Deliberately does not go through cacheDir(): that one *creates* the directory, and a
// pure read must never leave a folder behind on a machine that never opened the Themes tab.
export async function themeDocsCacheStats(): Promise<{ entries: number; bytes: number }> {
  const dir = join(app.getPath('userData'), 'theme-docs')
  let entries = 0
  let bytes = 0
  try {
    for (const name of await readdir(dir)) {
      const info = await stat(join(dir, name)).catch(() => null)
      if (!info?.isFile()) continue
      // An emptied entry (see clearStyleSettingsSchemaCache below) is not a cached answer.
      if (info.size === 0) continue
      entries += 1
      bytes += info.size
    }
  } catch {
    return { entries: 0, bytes: 0 }
  }
  return { entries, bytes }
}

/** Empties the whole cache; returns how many entries were actually removed. */
export async function clearThemeDocsCache(): Promise<number> {
  registryMemo = null
  const dir = join(app.getPath('userData'), 'theme-docs')
  let removed = 0
  try {
    for (const name of await readdir(dir)) {
      // Only files this service writes, and only by an exact name match - nothing here builds a
      // path from anything that came in over IPC.
      if (!name.endsWith('.json')) continue
      await rm(join(dir, name)).then(() => {
        removed += 1
      }).catch(() => undefined)
    }
  } catch {
    return 0
  }
  return removed
}

export async function clearStyleSettingsSchemaCache(themeId: string): Promise<void> {
  registryMemo = null
  await writeFile(join(cacheDir(), `${themeId}.json`), '', 'utf-8').catch(() => undefined)
  // An empty file fails JSON.parse, which readCachedSchema treats as "not cached" - simpler and
  // safer than unlinking a path built from an id that came in over IPC.
}

import { existsSync, readFileSync } from 'fs'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import type { CssVariableGraph, CssVariableInfo } from '@shared/ipc-contract'
import { resolveBuildDir } from './projectDirs'

// Where a variable's value came from. Precedence when the same name appears in more than one
// source is theme > build: an installed theme.json is authoritative and cleanly split per mode,
// while build output is whatever the last build happened to emit (and may not exist at all).
type Origin = CssVariableInfo['origin']

// theme.json (see pluginSchemaService for the meta/classSettings slice of the same file) carries
// each mode's compiled CSS as plain strings under light.*/dark.*, the `base` entry of which opens
// with the theme's own :root block - verified against @quartz-themes/tokyo-night, where that one
// block declares 978 custom properties, 543 of them `var(--other)` references. That block is the
// theme's full variable table and its derivation graph in one, so it beats scanning build output:
// it needs no build, and it never mixes in Quartz's own or a plugin's declarations.
interface RawThemeJson {
  light?: Record<string, string>
  dark?: Record<string, string>
  // Maps a variable to every variable that references it but is *not* declared anywhere - the
  // theme's dangling references. @quartz-themes/core uses it to bridge overrides onto those
  // dependents (`--dep: var(--overridden)`), so an override here really does reach them; that
  // makes it a genuine part of the dependency graph rather than a diagnostic.
  brokenVarLinks?: Record<string, string[]>
}

const DECLARATION_RE = /--([\w-]+)\s*:\s*([^;}]+)[;}]/g
const VAR_REFERENCE_RE = /var\(\s*--([\w-]+)/g

// Only the first rule of a compiled mode blob, which is the :root block - a plain `{...}` slice
// rather than a CSS parser, matching how the rest of this codebase reads its own generated CSS
// (styleService.parseDeclarations). Everything after it is selector-scoped and would pollute a
// table of globally overridable variables with values that only apply inside one component.
function firstRuleBody(css: string): string {
  const open = css.indexOf('{')
  if (open === -1) return ''
  const close = css.indexOf('}', open)
  return close === -1 ? '' : css.slice(open + 1, close)
}

function collectDeclarations(body: string): Map<string, string> {
  const out = new Map<string, string>()
  let match: RegExpExecArray | null
  DECLARATION_RE.lastIndex = 0
  while ((match = DECLARATION_RE.exec(body)) !== null) {
    // Compiled theme CSS wraps long values across lines (`var(\n  --text-normal\n)`); collapsing
    // the whitespace keeps them one-line for display and for the renderer's alias detection,
    // without changing what the value means.
    out.set(match[1], match[2].trim().replace(/\s+/g, ' '))
  }
  return out
}

function readThemeJson(projectPath: string, themeId: string): RawThemeJson | null {
  const path = join(projectPath, 'node_modules', '@quartz-themes', themeId, 'theme.json')
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as RawThemeJson
  } catch {
    return null
  }
}

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', '.changeset'])

async function findCssFiles(dir: string, depth = 0): Promise<string[]> {
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
    if (entry.isDirectory()) results.push(...(await findCssFiles(full, depth + 1)))
    else if (entry.name.endsWith('.css')) results.push(full)
  }
  return results
}

// Splits compiled CSS into (selector, body) pairs at the top level. Nested at-rules (@media,
// @layer - Quartz wraps its own theme CSS in `@layer quartz-base`) would break a naive split on
// `}`, so this tracks brace depth and recurses into any block whose "selector" starts with `@`.
function eachRule(css: string, visit: (selector: string, body: string) => void): void {
  let depth = 0
  let start = 0
  let selectorStart = 0
  for (let i = 0; i < css.length; i++) {
    const ch = css[i]
    if (ch === '{') {
      if (depth === 0) {
        selectorStart = start
        start = i + 1
      }
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) {
        const selector = css.slice(selectorStart, start - 1).trim()
        const body = css.slice(start, i)
        if (selector.startsWith('@')) eachRule(body, visit)
        else visit(selector, body)
        start = i + 1
      }
      if (depth < 0) return // malformed input - stop rather than mis-attribute the rest
    }
  }
}

// A global custom property can only be overridden from our own unlayered `:root` rule if the
// declaration it replaces is itself on a root-level selector (see CssVariableOverride's comment in
// ipc-contract). Component-scoped declarations - `.callout[data-callout="note"] { --color: ... }`
// - are a structurally different thing the CSS tab handles with its own scaffold, so they stay out
// of this table instead of appearing as variables an override would silently fail to reach.
const SAVED_THEME_ATTR = /\[saved-theme=["']?(dark|light)["']?\]/g

function rootSelectorMode(selector: string): 'light' | 'dark' | null {
  for (const part of selector.split(',')) {
    const normalized = part.replace(/\s+/g, '')
    SAVED_THEME_ATTR.lastIndex = 0
    const attr = SAVED_THEME_ATTR.exec(normalized)
    const mode = attr ? (attr[1] as 'light' | 'dark') : 'light'
    // The mode attribute sits *on* the root element, so removing it has to leave a bare root
    // selector behind - `html[saved-theme="dark"] body h1` is a scoped rule, not a global one.
    const stripped = normalized.replace(SAVED_THEME_ATTR, '')
    if (/^(:root|html|body)+$/.test(stripped)) return mode
  }
  return null
}

/**
 * The variable table and dependency graph the Styles page's "Variablen" tab renders: every custom
 * property currently in play, its light/dark value, and - the point of the graph - which other
 * variables reference it. A value like `var(--bg_highlight)` is kept verbatim rather than
 * pre-resolved, because the renderer needs the chain itself (`--x -> var(--y) -> #1a1b26`), not
 * just the endpoint.
 *
 * Both sources are optional and the result is honest about which one answered: an uninstalled
 * theme and a project that has never been built both simply contribute nothing.
 */
export async function getVariableGraph(
  projectPath: string,
  themeId?: string,
  outputDir?: string
): Promise<CssVariableGraph> {
  const vars: Record<string, CssVariableInfo> = {}
  const dependents: Record<string, Set<string>> = {}

  function note(name: string, mode: 'light' | 'dark', value: string, origin: Origin): void {
    const existing = vars[name]
    // theme wins over build for the same name+mode, but a build-only mode still fills a gap.
    if (existing && existing.origin === 'theme' && origin === 'build' && existing[mode] !== undefined) return
    const entry = existing ?? { origin }
    entry[mode] = value
    if (origin === 'theme') entry.origin = 'theme'
    vars[name] = entry

    VAR_REFERENCE_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = VAR_REFERENCE_RE.exec(value)) !== null) {
      const target = match[1]
      if (target === name) continue
      ;(dependents[target] ??= new Set()).add(name)
    }
  }

  const theme = themeId ? readThemeJson(projectPath, themeId) : null
  if (theme) {
    for (const mode of ['light', 'dark'] as const) {
      const base = theme[mode]?.base
      if (typeof base !== 'string') continue
      for (const [name, value] of collectDeclarations(firstRuleBody(base))) note(name, mode, value, 'theme')
    }
    for (const [target, deps] of Object.entries(theme.brokenVarLinks ?? {})) {
      // Keys here carry the leading "--"; the rest of this service keys by bare name.
      const bare = target.replace(/^--/, '')
      for (const dep of deps) (dependents[bare] ??= new Set()).add(dep.replace(/^--/, ''))
    }
  }

  const buildDir = resolveBuildDir(projectPath, outputDir)
  const hasBuild = existsSync(buildDir)
  if (hasBuild) {
    const files = (await findCssFiles(buildDir)).slice(0, 50)
    for (const file of files) {
      const content = await readFile(file, 'utf-8')
      eachRule(content, (selector, body) => {
        const mode = rootSelectorMode(selector)
        if (!mode) return
        for (const [name, value] of collectDeclarations(body)) note(name, mode, value, 'build')
      })
    }
  }

  return {
    vars,
    dependents: Object.fromEntries(Object.entries(dependents).map(([k, set]) => [k, Array.from(set).sort()])),
    themeId: theme ? themeId : undefined,
    sources: { theme: theme !== null, build: hasBuild }
  }
}

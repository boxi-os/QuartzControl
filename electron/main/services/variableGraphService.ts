import { existsSync, readFileSync } from 'fs'
import { readFile, readdir } from 'fs/promises'
import { join, relative, sep } from 'path'
import type { CssVariableGraph, CssVariableInfo } from '@shared/ipc-contract'
import { resolveBuildDir } from './projectDirs'
import { getVariableOverrides, loadedStylesheetsLastFirst, stripManagedBlock, stylesDir } from './styleService'

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

// The terminator is optional at the end of the string, and that is not a nicety: eachRule() hands
// over a body *without* its closing brace, and minified CSS drops the semicolon after the last
// declaration of a block - so requiring one silently swallowed the final variable of every rule.
// Measured on a real build of the test project: three declarations were missing from the table,
// `--codeFont` (light), `--textHighlight` (dark) and `--accent-l`. The dark one was the visible
// symptom - with no dark value recorded, baseValue() falls back to the light one, which is correct
// CSS semantics for a declaration that has no dark counterpart and simply wrong for one that does.
const DECLARATION_RE = /^\s*--([\w-]+)\s*:([\s\S]+)$/
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

// A declaration ends at a `;` outside strings, parentheses and comments. Read with `[^;}]+`, a
// value ended at the first semicolon anywhere: the theme minimal's --xfa-unfocused-field-background,
// a data URL with `style='fill:…;'` inside, came out as `url("data:…0.13)`, and a dark-only edit
// carried that as the light half into _quartzcontrol.scss, where Sass then failed (forty-eighth
// review, Niedrig 2).
function splitDeclarations(body: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (ch === '"' || ch === "'") {
      for (i++; i < body.length && body[i] !== ch && body[i] !== '\n'; i++) if (body[i] === '\\') i++
    } else if (ch === '/' && body[i + 1] === '*') {
      const end = body.indexOf('*/', i + 2)
      i = end === -1 ? body.length : end + 1
    } else if (ch === '(') depth++
    else if (ch === ')') depth = Math.max(0, depth - 1)
    else if ((ch === ';' || ch === '}') && depth === 0) {
      out.push(body.slice(start, i))
      start = i + 1
    }
  }
  out.push(body.slice(start))
  return out
}

function collectDeclarations(body: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const declaration of splitDeclarations(body)) {
    const match = DECLARATION_RE.exec(declaration.replace(/\/\*[\s\S]*?\*\//g, ''))
    if (!match) continue
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
//
// Braces inside a string or a comment are not counted. A selector `[data-section^="{{"]` in a
// plugin's CSS left the count two levels deep, and every `:root` rule after it was never read -
// in Example 65 of the 66 variables the page declares itself, and with them the rows of the table.
//
// `layered` says whether the rule sits inside an `@layer`: the variables the page writes itself are
// unlayered, Quartz's own are not (see getVariableGraph). `conditional` says whether it sits inside
// any other block at-rule (@media, @supports, @container …), which only applies under a condition.
interface RuleContext {
  layered: boolean
  conditional: boolean
}

function eachRule(
  css: string,
  visit: (selector: string, body: string, context: RuleContext) => void,
  context: RuleContext = { layered: false, conditional: false }
): void {
  let depth = 0
  let start = 0
  let selectorStart = 0
  for (let i = 0; i < css.length; i++) {
    const ch = css[i]
    if (ch === '"' || ch === "'") {
      for (i++; i < css.length && css[i] !== ch && css[i] !== '\n'; i++) if (css[i] === '\\') i++
    } else if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2)
      i = end === -1 ? css.length : end + 1
    } else if (ch === '{') {
      if (depth === 0) {
        selectorStart = start
        start = i + 1
      }
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) {
        // A comment right before the rule is part of the slice: `/* the sticky header */ :root`.
        const selector = css.slice(selectorStart, start - 1).replace(/\/\*[\s\S]*?\*\//g, '').trim()
        const body = css.slice(start, i)
        if (selector.startsWith('@')) {
          const layer = /^@layer\b/.test(selector)
          eachRule(body, visit, { layered: context.layered || layer, conditional: context.conditional || !layer })
        } else visit(selector, body, context)
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

// Which of the project's own stylesheets declares a name in a global :root rule - so a variable a
// template's layout.scss sets says so, instead of "Letzter Build" (--tpl-header-pad and four more
// in every project with the example template). The page's own block is taken out first: what it
// declares is the user's value, not the stylesheet's. Read as SCSS only as far as this needs: `//`
// comments go, since an apostrophe in one would open a string for eachRule. Only loaded files are
// read, and the first that declares a name wins - loadedStylesheetsLastFirst() lists the file
// whose rules come last on the site first.
interface ProjectDeclaration {
  source: string
  light?: string
  dark?: string
}

async function projectDeclarations(projectPath: string): Promise<Map<string, ProjectDeclaration>> {
  const out = new Map<string, ProjectDeclaration>()
  for (const file of await loadedStylesheetsLastFirst(projectPath)) {
    const text = stripManagedBlock(await readFile(file, 'utf-8').catch(() => ''), 'css-vars')
    const css = text.replace(/(^|[\s;{}])\/\/[^\n]*/g, '$1')
    const source = relative(stylesDir(projectPath), file).split(sep).join('/')
    eachRule(css, (selector, body, { conditional }) => {
      const mode = conditional ? null : rootSelectorMode(selector)
      if (!mode) return
      for (const [name, value] of collectDeclarations(body)) {
        const entry = out.get(name) ?? { source }
        entry[mode] ??= value
        out.set(name, entry)
      }
    })
  }
  return out
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

  function note(name: string, mode: 'light' | 'dark', value: string, origin: Origin, unlayered = false): void {
    const existing = vars[name]
    // theme wins over build for the same name+mode, but a build-only mode still fills a gap. An
    // unlayered declaration wins over both: the theme's CSS is layered too (`@layer obsidian-theme`).
    if (!unlayered && existing && existing.origin === 'theme' && origin === 'build' && existing[mode] !== undefined) return
    const entry = existing ?? { origin }
    entry[mode] = value
    if (origin === 'theme' || unlayered) entry.origin = origin
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

  const own = new Set((await getVariableOverrides(projectPath)).map((o) => o.key))
  const buildDir = resolveBuildDir(projectPath, outputDir)
  const hasBuild = existsSync(buildDir)
  // An unlayered declaration beats every layered one whatever its selector, so a stylesheet's
  // `:root { --secondary: … }` replaces Quartz's value in both modes, its `[saved-theme="dark"]`
  // rule included. Noted in file order, these were one table with the layered values: the dark
  // mode kept Quartz's #699dc3 on gui-test while the site showed the stylesheet's #0a7a55 in both
  // (forty-seventh review, Mittel 2). So they are collected apart and laid over the rest at the end.
  const unlayered = new Map<string, { light?: string; dark?: string }>()
  if (hasBuild) {
    // The build carries the page's own variables too, compiled out of _quartzcontrol.scss. Read as
    // a base value, they were their own original: in QuartzControl-Handbuch all 48 `--tpl-*`
    // variables, which exist nowhere else, showed "Letzter Build" with the user's value, and
    // "Zurücksetzen" deleted the declaration while the row went on showing it. So for a name the
    // page sets, an unlayered declaration is skipped - that is where the page's rule lands. Quartz's
    // own variables stay, they are inside `@layer quartz-base`.
    const files = (await findCssFiles(buildDir)).slice(0, 50)
    for (const file of files) {
      const content = await readFile(file, 'utf-8')
      eachRule(content, (selector, body, { layered, conditional }) => {
        // A :root rule inside @media is no base value, it is the exception to one: the template's
        // `@media (prefers-reduced-motion: reduce) { :root { --tpl-motion: 0s } }` stood in the
        // table as the value of --tpl-motion, and a variable only set there looked set everywhere.
        if (conditional) return
        const mode = rootSelectorMode(selector)
        if (!mode) return
        for (const [name, value] of collectDeclarations(body)) {
          if (layered) note(name, mode, value, 'build')
          else if (!own.has(name)) {
            const entry = unlayered.get(name) ?? {}
            entry[mode] = value
            unlayered.set(name, entry)
          }
        }
      })
    }
  }

  // Only names the build has: the value shown is the compiled one, and the stylesheet is where it
  // comes from. A theme's value stays the theme's, unless an unlayered rule replaces it on the
  // site. A name the page sets too lost the stylesheet's
  // compiled declaration to the skip above, so its value is the stylesheet's own text - without
  // it, --tpl-header-pad set in layout.scss and in the page became "eigene Variable" with a trash
  // can whose question said nothing would set it any more (forty-sixth review, Niedrig 1). That
  // fallback needs no build, so it runs before the first one too; it sat under `hasBuild`, and
  // without public/ the same variable was "eigene Variable" again (review 2026-10-20, nebenbei).
  // It asked whether the name had no value yet, and one Quartz sets always has one: --secondary,
  // set in custom/foundation.scss and on the page, showed Quartz's #1463a3/#699dc3 under the
  // stylesheet's name, and a dark-only edit wrote #1463a3 as the light half (forty-seventh review,
  // Mittel 2). The stylesheet's text is unlayered like its compiled rule, so it goes with those.
  const declarations = await projectDeclarations(projectPath)
  for (const [name, declaration] of declarations) {
    if (own.has(name)) unlayered.set(name, { light: declaration.light, dark: declaration.dark })
  }
  for (const [name, values] of unlayered) {
    if (values.light !== undefined) note(name, 'light', values.light, 'build', true)
    // Without a dark rule of its own, dark mode gets the light one, over any layered dark value.
    const dark = values.dark ?? (vars[name]?.dark !== undefined ? values.light : undefined)
    if (dark !== undefined) note(name, 'dark', dark, 'build', true)
  }
  for (const [name, declaration] of declarations) {
    const entry = vars[name]
    if (entry?.origin === 'build') vars[name] = { ...entry, origin: 'project', source: declaration.source }
  }

  return {
    vars,
    dependents: Object.fromEntries(Object.entries(dependents).map(([k, set]) => [k, Array.from(set).sort()])),
    themeId: theme ? themeId : undefined,
    sources: { theme: theme !== null, build: hasBuild }
  }
}

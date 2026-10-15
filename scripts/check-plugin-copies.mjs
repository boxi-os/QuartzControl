// Die Abschriften der drei Plugin-Editoren gegen die Plugins, die ein Projekt wirklich installiert hat.
//
//   npm run check:plugin-copies -- <projektpfad> [--alle]
//
// `--alle` nennt jede Abweichung statt der ersten zwölf je Prüfung.
//
// Die Reiter Navigationen, Zusätzliche Inhalte und Mehrsprachigkeit kennen ihr Plugin aus einer
// Abschrift seines Codes (src/routes/Plugins/navigationVariants.ts, layoutBoxes.ts,
// multilanguageOptions.ts), gelesen gegen eine Version (`*_READ_AGAINST`). Die App sagt am Reiter,
// wenn eine andere installiert ist (ReadAgainstNote) — aber nicht, ob die Abschrift dann noch
// stimmt, und auch nicht, ob sie gegen die gelesene Version je gestimmt hat. Dieses Skript fragt
// beides am Code selbst: Es lädt die Funktionen des installierten Plugins aus
// `<projekt>/.quartz/plugins/<name>/src` und die der App aus `src/routes/Plugins`, beide über
// esbuild gebündelt statt abgeschrieben (Regel „ein Prüfskript lädt, statt abzuschreiben“), und
// gibt beiden dieselben Eingaben.
//
//   quartz-multilanguage  `resolveOptions` gegen `languagesOf`, `defaultLanguageOf` und
//                         `publishedOf` — welche Sprachen, welche Standardsprache, welche
//                         veröffentlicht werden
//   quartz-navigations    `resolveOptions` gegen `variantOf`; und für jede Option, über die
//                         `hasNoEffect` urteilt, wird die echte Komponente je Variante und
//                         Mobil-Darstellung mit jedem Wert der Option gerendert. „Ohne Wirkung“
//                         heißt hier: dasselbe Markup auf drei Seiten einer kleinen Website. Eine
//                         Wirkung allein im Client-Skript oder im CSS, die an keinem Attribut
//                         hängt, sähe das Skript nicht.
//   quartz-layout-box     die echte Komponente liest Schnipsel aus einem Wegwerf-Ordner, dessen
//                         Dateien ihren eigenen Pfad enthalten, je Seitensprache; dagegen
//                         `boxContentKind` und `snippetRefs` — Text aus der Konfiguration oder
//                         welche Datei aus welchem Ordner
//
// Ein Plugin, das im Projekt fehlt, wird nicht geprüft, und das Skript sagt es („kann nicht prüfen“
// ist nicht „alles gut“). Rückgabewert 1, sobald eine Antwort abweicht.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import esbuild from 'esbuild'

const APP_DIR = path.dirname(import.meta.dirname)
const projekt = process.argv.slice(2).find((a) => !a.startsWith('--'))
const all = process.argv.includes('--alle')
if (!projekt) {
  console.error('Aufruf: npm run check:plugin-copies -- <projektpfad>')
  process.exit(2)
}
const PROJECT = path.resolve(projekt)

const CACHE = path.join(APP_DIR, 'node_modules/.cache/check-plugin-copies')
fs.mkdirSync(CACHE, { recursive: true })

// Was beim Laden nur stört: Stylesheets und Inline-Skripte des Plugins (Text, den hier niemand
// rendert), lucide-react in der App (Icons der Kacheln), Lucides Icon-Tabelle in navigations und der Markdown-Weg von layout-box (das
// Skript legt nur .html-Schnipsel an).
const stubs = {
  name: 'stubs',
  setup(build) {
    build.onResolve({ filter: /\.scss$|\.inline(\.ts)?$/ }, (a) => ({ path: a.path, namespace: 'text-stub' }))
    build.onLoad({ filter: /.*/, namespace: 'text-stub' }, () => ({ contents: 'export default ""', loader: 'js' }))
    build.onResolve({ filter: /^lucide-react$/ }, () => ({ path: 'lucide', namespace: 'lucide-stub' }))
    build.onLoad({ filter: /.*/, namespace: 'lucide-stub' }, () => ({ contents: 'module.exports = new Proxy({}, { get: () => null })', loader: 'js' }))
    // Lucide's icon table, which navigations' build inlines; empty, so every icon renders alike.
    build.onResolve({ filter: /^virtual:lucide-nodes$/ }, () => ({ path: 'lucide-nodes', namespace: 'lucide-nodes' }))
    build.onLoad({ filter: /.*/, namespace: 'lucide-nodes' }, () => ({ contents: 'export default "{}"', loader: 'js' }))
    build.onResolve({ filter: /\/markdown$/ }, () => ({ path: 'markdown', namespace: 'md-stub' }))
    build.onLoad({ filter: /.*/, namespace: 'md-stub' }, () => ({ contents: 'export const renderMarkdown = (s) => s', loader: 'js' }))
  }
}

async function load(entry, name) {
  const out = path.join(CACHE, `${name}-${process.pid}.mjs`)
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: out,
    jsx: 'automatic',
    jsxImportSource: 'preact',
    alias: { '@shared': path.join(APP_DIR, 'shared') },
    plugins: [stubs],
    logLevel: 'error'
  })
  try {
    return await import(`file://${out}`)
  } finally {
    fs.unlinkSync(out)
  }
}

/** The installed package of a plugin, or null - `.quartz/plugins/<name>` is where `quartz plugin add` puts it. */
function pluginDir(name) {
  const dir = path.join(PROJECT, '.quartz/plugins', name)
  if (!fs.existsSync(path.join(dir, 'package.json'))) return null
  return fs.realpathSync(dir)
}

// Die Plugins warnen bei jeder unbrauchbaren Eingabe, und genau die gibt ihnen dieses Skript.
const quiet = async (fn) => {
  const warn = console.warn
  console.warn = () => {}
  try {
    return await fn()
  } finally {
    console.warn = warn
  }
}

const show = (v) => JSON.stringify(v)
let differences = 0
let unchecked = 0
const report = []

function section(name, readAgainst) {
  const dir = pluginDir(name)
  const installed = dir ? JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8')).version : null
  report.push('', `${name}  (Abschrift gelesen gegen ${readAgainst}, installiert: ${installed ?? '—'})`)
  if (!dir) {
    unchecked++
    report.push('  nicht installiert — nicht geprüft')
    return null
  }
  if (!fs.existsSync(path.join(dir, 'src'))) {
    unchecked++
    report.push('  das installierte Paket bringt keine Quelle mit (src/) — nicht geprüft')
    return null
  }
  return dir
}

function tally(label, cases, diffs) {
  differences += diffs.length
  report.push(`  ${label}: ${cases} Fälle, ${diffs.length ? `${diffs.length} abweichend` : 'alle gleich'}`)
  for (const d of all ? diffs : diffs.slice(0, 12)) report.push(`    ✗ ${d}`)
  if (!all && diffs.length > 12) report.push(`    … und ${diffs.length - 12} weitere`)
}

// ─── quartz-multilanguage ───────────────────────────────────────────────────────────────────────

{
  const copy = await load(path.join(APP_DIR, 'src/routes/Plugins/multilanguageOptions.ts'), 'app-multilanguage')
  const dir = section(copy.MULTILANGUAGE_PLUGIN, copy.MULTILANGUAGE_READ_AGAINST)
  if (dir) {
    const plugin = await load(path.join(dir, 'src/options.ts'), 'plugin-multilanguage')
    // QUARTZ_LANGS ersetzt publishLanguages beim Bauen; die Seite liest die Config.
    delete process.env.QUARTZ_LANGS
    const languages = [
      undefined,
      [],
      ['de', 'en'],
      ['DE', ' en '],
      [{ code: 'de', name: 'Deutsch' }, 'en'],
      ['de', 'de', 'en'],
      ['de', { code: '' }, 42, null, 'en'],
      [{ name: 'ohne Code' }]
    ]
    const defaults = [undefined, '', 'EN', 'fr', 'de']
    const published = [undefined, [], ['en'], ['EN', 'fr'], ['de', 'en'], ['fr']]
    const diffs = []
    let cases = 0
    for (const l of languages)
      for (const d of defaults)
        for (const p of published) {
          const options = {}
          if (l !== undefined) options.languages = l
          if (d !== undefined) options.defaultLanguage = d
          if (p !== undefined) options.publishLanguages = p
          cases++
          const theirs = await quiet(() => plugin.resolveOptions(structuredClone(options)))
          const ours = copy.languagesOf(options)
          const want = {
            languages: theirs.languages.map((x) => x.code),
            defaultLanguage: theirs.defaultLanguage,
            active: theirs.activeLanguages.map((x) => x.code)
          }
          const pub = copy.publishedOf(options, ours)
          const got = {
            languages: ours.map((x) => x.code),
            defaultLanguage: copy.defaultLanguageOf(options, ours),
            active: ours.filter((x) => copy.isPublished(x.code, pub)).map((x) => x.code)
          }
          for (const key of Object.keys(want))
            if (show(want[key]) !== show(got[key])) diffs.push(`${show(options)} → ${key}: App ${show(got[key])}, Plugin ${show(want[key])}`)
        }
    tally('Sprachen, Standard, veröffentlicht', cases, diffs)
  }
}

// ─── quartz-navigations ─────────────────────────────────────────────────────────────────────────

{
  const copy = await load(path.join(APP_DIR, 'src/routes/Plugins/navigationVariants.ts'), 'app-navigations')
  const dir = section(copy.NAVIGATIONS_PLUGIN, copy.NAVIGATIONS_READ_AGAINST)
  if (dir) {
    const entry = path.join(CACHE, `nav-entry-${process.pid}.ts`)
    fs.writeFileSync(
      entry,
      `export { resolveOptions } from ${show(path.join(dir, 'src/options.ts'))}\nexport { default as Navigation } from ${show(path.join(dir, 'src/components/Navigation.tsx'))}\n`
    )
    let plugin
    try {
      plugin = await load(entry, 'plugin-navigations')
    } finally {
      fs.unlinkSync(entry)
    }

    const ours = copy.NAV_VARIANTS.map((v) => v.value)
    const inputs = [undefined, ...ours, 'vertical', 'horizontal', 'TREE', 'nope', 42]
    const variantDiffs = []
    for (const v of inputs) {
      const options = v === undefined ? {} : { variant: v }
      const theirs = (await quiet(() => plugin.resolveOptions(options))).variant
      const got = copy.variantOf(options)
      if (theirs !== got) variantDiffs.push(`variant ${show(v)}: App ${show(got)}, Plugin ${show(theirs)}`)
    }
    tally('Variante (variantOf)', inputs.length, variantDiffs)

    // A small site: two folders, one of them nested, and pages on and off the trail.
    const page = (slug, relativePath, title) => ({ slug, filePath: `content/${relativePath}`, relativePath, frontmatter: { title } })
    const folder = (slug, title) => ({ slug, relativePath: `${slug}.md`, frontmatter: { title } })
    const allFiles = [
      page('index', 'index.md', 'Home'),
      page('docs/index', 'docs/index.md', 'Docs'),
      page('docs/intro', 'docs/Intro.md', 'Intro'),
      folder('docs/guides/index', 'Guides'),
      page('docs/guides/alpha', 'docs/guides/Alpha.md', 'Alpha'),
      page('docs/guides/beta', 'docs/guides/Beta.md', 'Beta'),
      folder('blog/index', 'Blog'),
      page('blog/first', 'blog/First.md', 'First'),
      page('blog/second', 'blog/Second.md', 'Second'),
      page('about', 'About.md', 'About')
    ]
    const slugs = ['index', 'docs/guides/alpha', 'blog/first']
    const serialize = (node) => {
      if (Array.isArray(node)) return node.map(serialize)
      if (node === null || node === undefined || typeof node === 'boolean') return null
      if (typeof node !== 'object') return node
      if (typeof node.type === 'function') return serialize(node.type(node.props))
      const { children, ...props } = node.props ?? {}
      return [node.type, props, serialize(children)]
    }
    // Two attributes sit on the root whatever the variant, and the client script reads them only
    // in setupFolders (navigations.inline.ts): `data-persist` for its `details[data-folder]`, and
    // `data-expand-active` only together with a remembered state, so only under `data-persist`.
    // Where nothing reads them they are text, and they are left out here.
    const withoutUnread = (tree) => {
      const text = show(tree)
      const drop = new Set()
      if (!text.includes('"data-folder"')) drop.add('data-persist').add('data-expand-active')
      if (!text.includes('"data-persist":"true"')) drop.add('data-expand-active')
      const strip = (node) => {
        if (!Array.isArray(node)) return node
        if (typeof node[0] === 'string' && node[1] && typeof node[1] === 'object' && !Array.isArray(node[1])) {
          const props = Object.fromEntries(Object.entries(node[1]).filter(([k]) => !drop.has(k)))
          return [node[0], props, strip(node[2])]
        }
        return node.map(strip)
      }
      return strip(tree)
    }
    const render = (options) =>
      quiet(() => {
        const component = plugin.Navigation({ id: 'nav', ...options })
        return show(
          slugs.map((slug) =>
            withoutUnread(serialize(
              component({
                ctx: { argv: { serve: false } },
                fileData: allFiles.find((f) => f.slug === slug),
                cfg: { pageTitle: 'Site', locale: 'en-US' },
                externalResources: { css: [], js: [], additionalHead: [] },
                children: [],
                tree: {},
                allFiles
              })
            ))
          )
        )
      })

    // An icon on every node, so a neighbour the pager picks has one whichever it is.
    const ICON_EVERYWHERE = Object.fromEntries(
      ['docs', 'docs/intro', 'docs/guides', 'docs/guides/alpha', 'docs/guides/beta', 'blog', 'blog/first', 'blog/second', 'about'].map((p) => [p, '★'])
    )
    // Every option hasNoEffect has a case for, with the values the plugin accepts.
    const MOBILE = ['same', 'accordion', 'offcanvas', 'select', 'hidden']
    const values = {
      mobile: MOBILE,
      chevrons: [true, false],
      exclusive: [false, true],
      folderClick: ['toggle', 'link'],
      folderDefaultState: ['collapsed', 'open'],
      expandActive: [true, false],
      persistState: [false, true],
      select: [{ button: false }, { button: true }],
      // The options the editor keeps among the ones every variant shares, and greys out where the
      // rendering code never reaches them (renderSelect, renderPager, renderTabs).
      icons: ['none', 'type', 'custom', 'both'],
      nodeIcons: [{}, ICON_EVERYWHERE],
      showHome: [false, true],
      showScopeRoot: [false, true],
      indexEntry: ['none', 'first'],
      align: ['left', 'center', 'right', 'full'],
      trigger: ['click', 'hover'],
      tabs: [{ secondary: true }, { secondary: false }],
      flyout: [{ side: 'auto' }, { side: 'left' }],
      columns: [{ max: 4 }, { max: 2 }],
      pager: [{ labels: true }, { labels: false }, { order: 'siblings' }]
    }
    // Other options an answer depends on, beyond variant and mobile: "ohne Wirkung" has to hold for
    // every one of these, "wirkt" for one. expandActive reaches the client script only through a
    // remembered state, so only under persistState.
    // icons needs an icon to draw beyond the type glyphs, nodeIcons a mode that draws it, and the
    // scope root a root with a name.
    const contexts = {
      expandActive: [{}, { persistState: true }],
      icons: [{ nodeIcons: ICON_EVERYWHERE }],
      nodeIcons: [{ icons: 'custom' }],
      showScopeRoot: [{}, { rootPath: 'docs' }]
    }
    const effectDiffs = []
    let cases = 0
    for (const variant of ours)
      for (const mobile of MOBILE)
        for (const [key, vals] of Object.entries(values)) {
          if (key === 'mobile' && mobile !== 'same') continue // its own value is what varies
          cases++
          let hasEffect = false
          for (const context of contexts[key] ?? [{}]) {
            const renders = new Set()
            for (const value of vals) renders.add(await render({ ...context, variant, mobile, [key]: value }))
            if (renders.size > 1) hasEffect = true
          }
          const saysNone = copy.hasNoEffect(key, variant, key === 'mobile' ? undefined : mobile)
          if (saysNone === hasEffect)
            effectDiffs.push(
              `${key} bei variant ${variant}${key === 'mobile' ? '' : `, mobile ${mobile}`}: App ${saysNone ? '„ohne Wirkung“' : '„wirkt“'}, Plugin rendert ${hasEffect ? 'verschieden' : 'gleich'}`
            )
        }
    tally('ohne Wirkung (hasNoEffect)', cases, effectDiffs)
  }
}

// ─── quartz-layout-box ──────────────────────────────────────────────────────────────────────────

{
  const copy = await load(path.join(APP_DIR, 'src/routes/Plugins/layoutBoxes.ts'), 'app-layout-box')
  const dir = section(copy.LAYOUT_BOX_PLUGIN, copy.LAYOUT_BOX_READ_AGAINST)
  if (dir) {
    const plugin = await load(path.join(dir, 'src/components/LayoutBox.tsx'), 'plugin-layout-box')
    const LayoutBox = plugin.default
    // Before 0.4.1 a key left empty (null) throws; the copy asks which version it is talking about.
    const installed = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8')).version

    // Every snippet holds its own path, so the rendered text says which file was read.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-plugin-copies-'))
    // One at the root as well: `dir: ""` is the project itself.
    const files = ['snippet.html', 'quartz/static/snippets/snippet.html', 'quartz/static/snippets/a.html', 'quartz/static/snippets/b.html', 'other/snippet.html', 'other/b.html']
    for (const f of files) {
      fs.mkdirSync(path.join(root, path.dirname(f)), { recursive: true })
      fs.writeFileSync(path.join(root, f), `FILE:${f}`)
    }
    const cwd = process.cwd()
    process.chdir(root)

    const optionsList = [
      {},
      { file: 'a.html' },
      { file: '' },
      { dir: 'other' },
      { dir: '' },
      { dir: './quartz/static/snippets/' },
      { html: '<p>inline</p>' },
      { html: '' },
      { html: null },
      { file: null },
      { dir: null },
      { file: 'a.html', byLang: { de: { html: null } } },
      { html: 'überall', byLang: { de: { html: null, file: null } } },
      { file: 'a.html', byLang: { de: { dir: null } } },
      { file: 'a.html', byLang: { de: { file: 'b.html' } } },
      { file: 'a.html', byLang: { DE: { file: 'b.html' } } },
      { byLang: { de: { html: 'nur deutsch' } } },
      { html: 'überall', byLang: { de: { file: 'b.html' } } },
      { byLang: { de: { dir: 'other' } } },
      { dir: 'other', byLang: { de: { file: 'b.html' } } }
    ]
    const diffs = []
    let cases = 0
    try {
      for (const options of optionsList) {
        const component = await quiet(() => LayoutBox({ ...structuredClone(options), placeholders: false }))
        const keys = Object.keys(options.byLang ?? {})
        for (const lang of [undefined, ...keys]) {
          cases++
          const pageLang = lang?.trim().toLowerCase()
          const vnode = await quiet(() => {
            try {
              return component({
                ctx: { argv: { serve: false } },
                fileData: { slug: 'x', frontmatter: pageLang ? { title: 'x', lang: pageLang } : { title: 'x' } },
                cfg: { locale: 'xx' }
              })
            } catch (e) {
              return { thrown: String(e) }
            }
          })
          const html = vnode?.thrown ?? (vnode ? JSON.stringify(vnode).match(/"__html":"((?:[^"\\]|\\.)*)"/)?.[1] : null)
          const theirs = html == null ? 'nichts' : html.startsWith('FILE:') ? `Datei ${html.slice(5)}` : html.startsWith('Type') || html.includes('Error') ? `Fehler (${html})` : 'Text aus der Konfiguration'

          const base = options
          // Merged as the app merges - since 0.4.1 a null in a language entry leaves the base value.
          const merged = copy.mergedVariants(base).find(([l]) => l === lang)[1]
          let ours
          if (copy.brokenOptions(base, installed).some((b) => b.lang === lang)) ours = 'Fehler'
          else if (copy.boxContentKind(merged) === 'html') ours = String(merged.html).trim() === '' ? 'nichts' : 'Text aus der Konfiguration'
          else {
            const ref = copy.snippetRefs(base).find((r) => r.lang === lang)
            // A path that is a folder (`file: ""`) cannot be read, and the build renders nothing.
            const named = ref && path.posix.normalize(`${copy.normalizeDir(ref.dir)}/${ref.file}`)
            ours = !ref ? 'keine Datei genannt' : fs.statSync(path.join(root, named), { throwIfNoEntry: false })?.isDirectory() ? 'nichts' : `Datei ${named}`
          }
          // The plugin's message is printed with the difference; that it threw is what is compared.
          if (ours === 'Fehler' ? !theirs.startsWith('Fehler') : ours !== theirs) diffs.push(`${show(options)}${lang ? `, Seite ${pageLang}` : ''}: App ${ours}, Plugin ${theirs}`)
        }
      }
    } finally {
      process.chdir(cwd)
      fs.rmSync(root, { recursive: true, force: true })
    }
    tally('Inhalt (boxContentKind, snippetRefs)', cases, diffs)

    // Die Platzhalter, die die App unter „Verfügbare Platzhalter“ anbietet, gegen placeholders.ts:
    // Jeder der Liste muss ersetzt werden, und jeder `case` der Funktion muss in der Liste stehen.
    const source = fs.readFileSync(path.join(dir, 'src/placeholders.ts'), 'utf-8')
    const { applyPlaceholders } = await load(path.join(dir, 'src/placeholders.ts'), 'plugin-placeholders')
    const ctx = { fileData: { slug: 'a/b', frontmatter: { title: 'T', lang: 'de-DE', author: 'A' } }, cfg: { pageTitle: 'S', baseUrl: 'example.com', locale: 'en-US' } }
    const offered = [...copy.LAYOUT_BOX_PLACEHOLDERS, `${copy.LAYOUT_BOX_FRONTMATTER_PLACEHOLDER}author`]
    const placeholderDiffs = []
    for (const name of offered) {
      if (applyPlaceholders(`{{${name}}}`, ctx) === `{{${name}}}`) placeholderDiffs.push(`{{${name}}}: die App bietet ihn an, das Plugin ersetzt ihn nicht`)
    }
    for (const [, name] of source.matchAll(/case "([\w.-]+)":/g)) {
      if (!copy.LAYOUT_BOX_PLACEHOLDERS.includes(name)) placeholderDiffs.push(`{{${name}}}: das Plugin kennt ihn, die App bietet ihn nicht an`)
    }
    if (!source.includes(`"${copy.LAYOUT_BOX_FRONTMATTER_PLACEHOLDER}"`)) placeholderDiffs.push(`${copy.LAYOUT_BOX_FRONTMATTER_PLACEHOLDER}: das Plugin nennt dieses Präfix nicht mehr`)
    tally('Platzhalter (LAYOUT_BOX_PLACEHOLDERS)', offered.length, placeholderDiffs)
  }
}

console.log(`Projekt: ${PROJECT}`)
console.log(report.join('\n'))
console.log('')
if (unchecked) console.log(`${unchecked} Plugin${unchecked === 1 ? '' : 's'} nicht geprüft.`)
console.log(differences ? `✗ ${differences} Abweichung${differences === 1 ? '' : 'en'}.` : '✓ keine Abweichung.')
process.exit(differences ? 1 : 0)

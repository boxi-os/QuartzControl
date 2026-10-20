// Which pages of a site embed which quartz-forms form, read from the Markdown the way the plugin
// reads it, and what a page's address is, the way Quartz forms it. Pure and Node-free: the main
// process scans with it (contentService.formUsages), and a check script can load it instead of
// copying it.
//
// The plugin (src/transformer.ts of quartz-forms 0.2.0) finds a form in three places:
//   - a fenced code block whose language is `codeBlockLang`; the first non-empty line is the id
//   - a placeholder `{{form:id}}` (or its URL-encoded form) in the text - not inside code, which
//     mdast keeps as code nodes the plugin never looks into
//   - the frontmatter key `frontmatterKey`: a string, a list of strings, or `false`, which hides
//     the layout form on that page
// This reads the text, not mdast: an indented code block or a fence inside an HTML block counts
// here and not there. It answers "where is it used", for a list and a question before a rename,
// not for the build.

/** Quartz's `slugifyFilePath` (@quartz-community/utils 1.0.1, path.js), for a content-relative path. */
export function quartzSlug(filePath: string): string {
  let fp = filePath.replace(/^\/+/, '').replace(/\/+$/, '')
  const ext = fp.match(/\.[A-Za-z0-9]+$/)?.[0]
  const withoutExt = ext ? fp.slice(0, -ext.length) : fp
  const finalExt = ext === undefined || ext === '.md' || ext === '.html' ? '' : ext
  let slug = withoutExt
    .split('/')
    .map((s) =>
      s
        .replace(/\s/g, '-')
        .replace(/&/g, '-and-')
        .replace(/%/g, '-percent')
        .replace(/\?/g, '')
        .replace(/#/g, '')
        .replace(/[<>:"|*]/g, '')
        .toLowerCase()
    )
    .join('/')
    .replace(/\/$/, '')
  if (slug === '_index' || slug.endsWith('/_index')) slug = slug.replace(/_index$/, 'index')
  const segments = slug.split('/')
  if (segments.length >= 2 && segments[segments.length - 1] === segments[segments.length - 2]) {
    segments[segments.length - 1] = 'index'
    slug = segments.join('/')
  }
  fp = slug + finalExt
  return fp
}

/** The address of a slug below the site's root, as the preview takes it: `index` is the folder. */
export function slugPath(slug: string): string {
  if (slug === 'index') return ''
  return slug.endsWith('/index') ? slug.slice(0, -'index'.length) : slug
}

export interface PageFormUse {
  /** The ids the page names, each once, in order. */
  forms: string[]
  /** `frontmatterKey: false` - the page hides the layout form. */
  hidesLayout: boolean
  /** The frontmatter's title, when it has one. */
  title?: string
  /** `draft` and `publish` the way Quartz's two filters read them (remove-draft, explicit-publish:
   *  `true` or `"true"`); whether either keeps the page off the site depends on which is on. */
  draft: boolean
  publish: boolean
}

const PLACEHOLDER = /\{\{\s*form:([A-Za-z0-9-]+)\s*\}\}|%7B%7Bform:([A-Za-z0-9-]+)%7D%7D/gi
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/

/**
 * What one Markdown file says about forms. `parseFrontmatter` turns the YAML between the first two
 * `---` lines into an object (the caller brings its YAML reader); null when it cannot.
 */
export function pageFormUse(text: string, codeBlockLang: string, frontmatterKey: string, parseFrontmatter: (yaml: string) => unknown): PageFormUse {
  const ids: string[] = []
  const add = (id: string | undefined): void => {
    const clean = id?.trim()
    if (clean && !ids.includes(clean)) ids.push(clean)
  }
  let body = text
  let hidesLayout = false
  let title: string | undefined
  let draft = false
  let publish = false

  const fm = /^---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)\s*(?:\r?\n|$)/.exec(text)
  if (fm) {
    body = text.slice(fm[0].length)
    let data: unknown = null
    try {
      data = parseFrontmatter(fm[1])
    } catch {
      data = null
    }
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const record = data as Record<string, unknown>
      const value = record[frontmatterKey]
      if (value === false) hidesLayout = true
      else if (typeof value === 'string') add(value)
      else if (Array.isArray(value)) for (const v of value) if (typeof v === 'string') add(v)
      if (typeof record.title === 'string' && record.title.trim()) title = record.title.trim()
      draft = record.draft === true || record.draft === 'true'
      publish = record.publish === true || record.publish === 'true'
    }
  }

  // Fenced code: a block in the plugin's language names a form; any other block hides what is in
  // it from the placeholder search, as mdast does.
  const outside: string[] = []
  const lines = body.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const open = FENCE.exec(lines[i])
    if (!open) {
      outside.push(lines[i])
      continue
    }
    const fence = open[1]
    const lang = open[2].trim().split(/\s+/)[0] ?? ''
    const inner: string[] = []
    let j = i + 1
    for (; j < lines.length; j++) {
      const close = FENCE.exec(lines[j])
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length && close[2].trim() === '') break
      inner.push(lines[j])
    }
    if (lang === codeBlockLang) add(inner.map((l) => l.trim()).find((l) => l.length > 0))
    i = j
  }
  // Inline code is code too.
  const prose = outside.join('\n').replace(/(`+)[\s\S]*?\1/g, '')
  for (const m of prose.matchAll(PLACEHOLDER)) add(m[1] ?? m[2])

  return { forms: ids, hidesLayout, ...(title ? { title } : {}), draft, publish }
}

import type { PluginEntry } from './ipc-contract'

// The project image in the site header is one instance of quartz-layout-box that this app writes and
// recognises again by its class. The plugin already does everything else: `{{root}}` and
// `{{siteTitle}}` placeholders, and a light/dark pair through `.img-light` / `.img-dark`, which it
// styles itself (layout-box.scss sets `display` on both, keyed to `saved-theme`).
//
// Measured on a copy of a fresh Quartz 5 project with the plugin added through `quartz plugin add`:
// the instance below renders in the header, both images load from `{{root}}/static/…` (Quartz's
// Static emitter copies quartz/static to public/static), the light image shows at 40×40 and the dark
// one is `display: none`, and with `saved-theme="dark"` the two swap.

export const LAYOUT_BOX_SOURCE = 'github:boxi-os/quartz-layout-box'
export const PROJECT_IMAGE_CLASS = 'layout-box-project-image'

// The size sits on the images rather than on a class: a site's stylesheet is not something this
// app writes, and without a height a 512px icon fills the header. `display` is deliberately *not*
// set inline - it would beat the plugin's light/dark switch.
const IMG_STYLE = 'height:2.5rem;width:auto'

export function isLayoutBox(entry: PluginEntry): boolean {
  return typeof entry.source === 'string' && entry.source.includes('quartz-layout-box')
}

export function projectImageHtml(hasDark: boolean): string {
  const img = (cls: string, file: string): string =>
    `<img${cls ? ` class="${cls}"` : ''} src="{{root}}/static/${file}" alt="{{siteTitle}}" style="${IMG_STYLE}">`
  const images = hasDark ? img('img-light', 'icon.png') + img('img-dark', 'icon-dark.png') : img('', 'icon.png')
  return `<a class="project-image" href="{{root}}/">${images}</a>`
}

export function findProjectImageEntry(plugins: PluginEntry[]): number {
  return plugins.findIndex((p) => isLayoutBox(p) && p.options?.className === PROJECT_IMAGE_CLASS)
}

/**
 * The entry `quartz plugin add` writes for quartz-layout-box: default options, a `file` that does
 * not exist, sitting in the left sidebar. Recognised only so the one the app just installed becomes
 * the header image instead of staying behind as a second, empty box - the caller passes the index
 * only when it counted no layout box before installing.
 */
export function isFreshLayoutBoxEntry(entry: PluginEntry): boolean {
  return isLayoutBox(entry) && !entry.options?.html && !entry.options?.className
}

/** The plugin list with the header image switched on (or its HTML brought up to date). */
export function withProjectImage(plugins: PluginEntry[], hasDark: boolean, replaceIndex?: number): PluginEntry[] {
  const html = projectImageHtml(hasDark)
  const existing = findProjectImageEntry(plugins)
  if (existing >= 0) {
    return plugins.map((p, i) => (i === existing ? { ...p, options: { ...p.options, html } } : p))
  }
  const instance = (base?: PluginEntry): PluginEntry => ({
    ...(base ?? { name: 'quartz-layout-box', source: LAYOUT_BOX_SOURCE }),
    enabled: true,
    options: { html, className: PROJECT_IMAGE_CLASS, placeholders: true },
    layout: { position: 'header', priority: 10 }
  })
  if (replaceIndex !== undefined && plugins[replaceIndex] && isFreshLayoutBoxEntry(plugins[replaceIndex])) {
    return plugins.map((p, i) => (i === replaceIndex ? instance(p) : p))
  }
  const source = plugins.find(isLayoutBox)?.source ?? LAYOUT_BOX_SOURCE
  return [...plugins, instance({ name: 'quartz-layout-box', source, enabled: true })]
}

/** The plugin list without the header image. The plugin itself stays installed. */
export function withoutProjectImage(plugins: PluginEntry[]): PluginEntry[] {
  const existing = findProjectImageEntry(plugins)
  return existing < 0 ? plugins : plugins.filter((_, i) => i !== existing)
}

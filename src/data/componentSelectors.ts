import type { PluginEntry } from '@shared/ipc-contract'
import { componentItems } from '../routes/LayoutEditor/utils'

// The selector "Komponente wählen" inserts on the custom CSS tab. It used to be `.<plugin name>`,
// and for a third of the components that is no class the site ever renders: tag-list renders
// `ul.tags`, reader-mode `.readermode`, breadcrumbs `.breadcrumb-container`, comments `.giscus`,
// footer a bare `<footer>`, and quartz-layout-box, -multilanguage and -navigations are package
// names, not classes. The rule that was inserted matched nothing, and nothing said so.
//
// A table rather than a rule, because the class is not in the plugin in a readable form - most
// components build it at render time (`classNames(displayClass, "backlinks")`). Measured on
// 2026-09-24 on a real build: a copy of the Example template's control project with every layout
// component switched on (four were off), built through the app, 349 pages, every class token
// counted per page and the root element of each component read off the HTML. Quartz v5.0.0 with
// the @quartz-community plugins of that project.
const ROOT_SELECTOR: Record<string, string> = {
  'table-of-contents': '.toc',
  // Only exists once a link has been followed: the container is created by the plugin's script.
  'stacked-pages': '.stacked-pages-container',
  explorer: '.explorer',
  graph: '.graph',
  search: '.search',
  backlinks: '.backlinks',
  'article-title': '.article-title',
  'content-meta': '.content-meta',
  'tag-list': '.tags',
  'page-title': '.page-title',
  darkmode: '.darkmode',
  'reader-mode': '.readermode',
  breadcrumbs: '.breadcrumb-container',
  comments: '.giscus',
  footer: 'footer',
  spacer: '.spacer',
  'note-properties': '.note-properties',
  'recent-notes': '.recent-notes',
  'quartz-layout-box': '.layout-box',
  'quartz-multilanguage': '.multilanguage-switcher',
  'quartz-navigations': '.quartz-nav'
}

// The plugins whose `className` option lands on the root element next to the class above -
// measured for these two (`<div class="layout-box layout-box-mark">`, `<nav class="quartz-nav …
// nav-menue">`). Another plugin's `className` may mean something else, so it is not assumed.
const INSTANCE_CLASS = new Set(['quartz-layout-box', 'quartz-navigations'])

export interface ComponentSelector {
  /** The plugin, as the Plugins page names it - what the reference panel beside the editor reads. */
  plugin: string
  /** What the list shows: the plugin, and for an instance with its own class, that class. */
  name: string
  selector: string
  /** False when the plugin is not in the table and the selector is its name, unchecked. */
  measured: boolean
}

/**
 * One entry per selector, in the order the components are placed: the plugin's root selector, and
 * for each instance that carries a class of its own, that class as a second entry - the one that
 * styles *this* box rather than all seven.
 */
export function componentSelectors(plugins: PluginEntry[]): ComponentSelector[] {
  const out: ComponentSelector[] = []
  const seen = new Set<string>()
  const add = (entry: ComponentSelector): void => {
    if (seen.has(entry.selector)) return
    seen.add(entry.selector)
    out.push(entry)
  }
  for (const { plugin } of componentItems(plugins)) {
    const root = ROOT_SELECTOR[plugin.name]
    add({ plugin: plugin.name, name: plugin.name, selector: root ?? `.${plugin.name}`, measured: root !== undefined })
    const own = plugin.options?.className
    if (INSTANCE_CLASS.has(plugin.name) && typeof own === 'string' && /^[\w-]+$/.test(own)) {
      add({ plugin: plugin.name, name: `${plugin.name} · ${own}`, selector: `.${own}`, measured: true })
    }
  }
  return out
}

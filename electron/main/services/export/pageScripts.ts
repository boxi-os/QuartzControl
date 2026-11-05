/**
 * Code that runs inside the export window, on a page of the user's built site. Every function here
 * is stringified and handed to `executeJavaScript`, so it closes over nothing - not this module,
 * not shared/ - and is written for the site's browser, not for Node (the same pattern as
 * previewHighlight.ts). What it needs from shared/exportModel.ts arrives as function source in its
 * arguments (`slugFromPathname`, `anchorFor`, `outsideUrl`), so the rule for naming a page exists
 * once.
 */

export type NavigationSource = 'explorer' | 'quartz-navigations' | 'links' | 'none'

/**
 * Waits until the page has done what the extraction needs: fonts loaded, every Mermaid block
 * rendered to an SVG, and - when asked - a navigation with links in it (Quartz's Explorer builds
 * its tree in a script after load). Not images: the extraction only takes their addresses, a
 * `loading="lazy"` picture never loads in a window nobody scrolls, and whether every picture
 * arrives is checked once, on the assembled document. Resolves with what was still missing when
 * the time ran out, so the caller can say so rather than print a half-rendered page.
 */
export function settlePage(opts: { navigation: boolean; timeoutMs: number }): Promise<{ unrenderedDiagrams: number; navigation: boolean }> {
  const started = Date.now()
  const navReady = (): boolean => !!document.querySelector('.explorer a[href], nav.quartz-nav a[href]')
  // Mermaid first puts an empty SVG into the block to measure text, and replaces it with the
  // diagram later; only the finished one carries `aria-roledescription`. Taking the first SVG as
  // done printed two diagrams of Example as empty 300×150 boxes and, in one run, lost the sequence
  // diagram altogether. A diagram also counts as finished only once its size has stopped changing.
  const diagrams = (): Element[] => [...document.querySelectorAll('article code.mermaid')]
  const pendingNow = (): number => diagrams().filter((c) => !c.querySelector('svg[aria-roledescription]')).length
  let lastShape = ''
  let stableTicks = 0
  const pendingDiagrams = (): number => {
    if (diagrams().length === 0) return 0
    const shape = diagrams().map((c) => c.querySelector('svg')?.querySelectorAll('*').length ?? -1).join(',')
    stableTicks = shape === lastShape ? stableTicks + 1 : 0
    lastShape = shape
    const pending = pendingNow()
    return pending > 0 || stableTicks < 3 ? Math.max(pending, 1) : 0
  }
  return document.fonts.ready.then(
    () =>
      new Promise((resolve) => {
        const tick = (): void => {
          const done = pendingDiagrams() === 0 && (!opts.navigation || navReady())
          if (done || Date.now() - started > opts.timeoutMs) {
            resolve({
              unrenderedDiagrams: pendingNow(),
              navigation: navReady()
            })
            return
          }
          setTimeout(tick, 50)
        }
        tick()
      })
  )
}

/**
 * The site's own order of pages, read from its navigation as built: Quartz's Explorer, or
 * quartz-navigations' `nav.quartz-nav`. Both sort differently and both can be configured beyond
 * what QuartzControl reads (Explorer's `sortFn` only in quartz.ts, quartz-navigations' `order`
 * map, `navOrder`, number prefixes), so the rendered tree is the one answer that is always right.
 * Neither present: the largest group of same-origin links outside the article, said as 'links'.
 * The first of several (a mobile copy of the same menu) wins. Links in document order, absolute,
 * same origin only; the caller turns them into slugs.
 */
export function readNavigation(): { source: NavigationSource; hrefs: string[] } {
  const own = (el: Element): string[] =>
    [...el.querySelectorAll('a[href]')]
      .map((a) => (a as HTMLAnchorElement).href)
      .filter((h) => {
        try {
          return new URL(h).origin === location.origin
        } catch {
          return false
        }
      })
  const explorer = document.querySelector('.explorer')
  if (explorer && own(explorer).length) return { source: 'explorer', hrefs: own(explorer) }
  const qnav = document.querySelector('nav.quartz-nav')
  if (qnav && own(qnav).length) return { source: 'quartz-navigations', hrefs: own(qnav) }
  let best: Element | null = null
  let bestCount = 0
  for (const el of document.querySelectorAll('nav, aside, .sidebar')) {
    if (el.closest('article')) continue
    const n = own(el).length
    if (n > bestCount) {
      best = el
      bestCount = n
    }
  }
  return best && bestCount >= 2 ? { source: 'links', hrefs: own(best) } : { source: 'none', hrefs: [] }
}

export interface ExtractArgs {
  slug: string
  /** The heading level of the page's title in the document. */
  level: number
  /** A folder's start page: its headings are signposts to the pages after it, not sections, and
   *  would sit between the page titles in the outline (the handbook script's rule). */
  signpost: boolean
  /** Every slug in the document. */
  inBook: string[]
  outsideLinks: 'site' | 'text'
  baseUrl?: string
  /** What replaces something a document cannot hold. With an address, `{{url}}` stands for the
   *  page (a form) or the source (a frame, a video); `noUrl` is said when there is none to give. */
  texts: { form: string; frame: string; media: string; canvas: string; noUrl: { form: string; frame: string; media: string; canvas: string } }
}

export interface ExtractedPage {
  slug: string
  title: string
  lang: string
  html: string
  images: string[]
  counts: { outsideLinks: number; textLinks: number; forms: number; frames: number; media: number; canvases: number; unrenderedDiagrams: number }
}

/**
 * The page's article, made to stand in one document with every other page: ids unique, links to
 * pages in the book turned into anchors, links out of it to the published site or to text, and
 * what a document cannot hold (a form, an embedded frame, a video, a button) replaced by a sentence
 * with the address or removed. Generalised from `extractPage` in scripts/build-handbook-pdf.mjs.
 */
export function extractArticle(
  args: ExtractArgs,
  slugFromPathname: (p: string) => string,
  anchorFor: (slug: string, id?: string) => string,
  outsideUrl: (baseUrl: string | undefined, slug: string, hash: string) => string | null
): ExtractedPage {
  // A .base page of bases-page has no <article>; its views are the page.
  const source = document.querySelector('article') ?? document.querySelector('.bases-page')
  if (!source) throw new Error(`no <article> on ${args.slug}`)
  const title = document.querySelector('h1.article-title')?.textContent?.trim() || document.title || args.slug
  const art = source.cloneNode(true) as HTMLElement
  const inBook = new Set(args.inBook)
  const counts = { outsideLinks: 0, textLinks: 0, forms: 0, frames: 0, media: 0, canvases: 0, unrenderedDiagrams: 0 }
  const say = (kind: 'form' | 'frame' | 'media' | 'canvas', url: string): string => (url ? args.texts[kind].replace('{{url}}', url) : args.texts.noUrl[kind])
  const note = (text: string, url: string): HTMLElement => {
    const p = document.createElement('p')
    p.className = 'qc-replaced'
    const at = text.indexOf(url)
    if (at === -1 || !/^https?:/.test(url)) {
      p.textContent = text
      return p
    }
    p.append(text.slice(0, at))
    const a = document.createElement('a')
    a.href = url
    a.textContent = url
    p.append(a, text.slice(at + url.length))
    return p
  }
  const pageUrl = outsideUrl(args.baseUrl, args.slug, '') ?? ''
  // An address a reader of the document can open: a file of the site itself on the published site
  // (the export window's own origin is a port on this machine that is gone after the run), anything
  // else as it is, and nothing for what is neither http(s).
  const publicUrl = (src: string): string => {
    if (!src) return ''
    let u: URL
    try {
      u = new URL(src, location.href)
    } catch {
      return ''
    }
    if (u.origin === location.origin) return outsideUrl(args.baseUrl, slugFromPathname(u.pathname), u.hash) ?? ''
    return /^https?:$/.test(u.protocol) ? u.href : ''
  }

  // Rendered diagrams become a figure with their SVG; the buttons Quartz puts around them go below.
  // Mermaid measured its labels in the font of the code block it sat in; in the document the SVG
  // inherits another one, and the labels were cut off ("Alle zwölf" of "Alle zwölf Bausteine?").
  // So the font each text element had while it was measured is written onto it.
  const liveCodes = source.querySelectorAll('code.mermaid')
  art.querySelectorAll('code.mermaid').forEach((code, i) => {
    const live = liveCodes[i]?.querySelector('svg[aria-roledescription]')
    const copy = code.querySelector('svg[aria-roledescription]')
    if (!live || !copy) return
    const liveEls = [live, ...live.querySelectorAll('*')]
    const copyEls = [copy, ...copy.querySelectorAll('*')]
    liveEls.forEach((el, k) => {
      const target = copyEls[k] as HTMLElement | SVGElement | undefined
      if (!target || !('style' in target)) return
      const cs = getComputedStyle(el)
      for (const prop of ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing']) {
        target.style.setProperty(prop, cs.getPropertyValue(prop))
      }
    })
  })
  art.querySelectorAll('code.mermaid').forEach((code) => {
    const svg = code.querySelector('svg[aria-roledescription]')
    const holder = code.closest('pre') ?? code
    if (!svg) {
      counts.unrenderedDiagrams++
      return
    }
    const fig = document.createElement('figure')
    fig.className = 'qc-diagram'
    fig.append(svg.cloneNode(true))
    holder.replaceWith(fig)
  })
  // Views of other plugins, measured on Example (2026-11-05): an Excalidraw drawing is an SVG and
  // stays one; a canvas is a pannable board of positioned cards that has no layout on paper, so it
  // becomes a sentence with its address; of a base's views, the one the page opens with is kept and
  // the tabs to the others go.
  art.querySelectorAll('.excalidraw-container').forEach((box) => {
    const svg = box.querySelector('svg')
    if (!svg) return
    const fig = document.createElement('figure')
    fig.className = 'qc-diagram'
    fig.append(svg.cloneNode(true))
    box.replaceWith(fig)
  })
  art.querySelectorAll('.excalidraw-controls, .excalidraw-overlays, .bases-view-tabs, .bases-view:not(.is-active), .canvas-controls').forEach((e) => e.remove())
  art.querySelectorAll('.canvas-container').forEach((c) => {
    counts.canvases++
    c.replaceWith(note(say('canvas', pageUrl), pageUrl))
  })
  // Not the <style> inside an SVG: Mermaid styles its diagram there, and without it every shape
  // printed as a black area (measured on Example's flowchart, 2026-11-05).
  art.querySelectorAll('[hidden], a[role="anchor"], .multilanguage-notice, script, style, noscript, template, dialog, button').forEach((e) => {
    if (e.tagName.toLowerCase() === 'style' && e.closest('svg')) return
    e.remove()
  })
  art.querySelectorAll('form').forEach((f) => {
    counts.forms++
    f.replaceWith(note(say('form', pageUrl), pageUrl))
  })
  art.querySelectorAll('iframe, embed, object').forEach((f) => {
    counts.frames++
    const src = f.getAttribute('src') ?? f.getAttribute('data') ?? ''
    const url = publicUrl(src)
    f.replaceWith(note(say('frame', url), url))
  })
  art.querySelectorAll('video, audio').forEach((m) => {
    counts.media++
    const src = m.getAttribute('src') ?? m.querySelector('source')?.getAttribute('src') ?? ''
    const url = publicUrl(src)
    m.replaceWith(note(say('media', url), url))
  })

  art.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
    const n = document.createElement(args.signpost ? 'p' : 'h' + Math.min(6, Number(h.tagName[1]) + args.level))
    if (args.signpost) n.className = 'index-heading'
    n.innerHTML = h.innerHTML
    if (h.id) n.id = anchorFor(args.slug, h.id)
    h.replaceWith(n)
  })
  // An SVG refers to its own ids - Mermaid's <style> by `#mermaid-0 .node`, markers and gradients
  // by `url(#…)`, `href="#…"`. Its ids are renamed together with every reference to them, per SVG,
  // so two diagrams that both call their root `mermaid-0` stay apart in one document.
  art.querySelectorAll('svg').forEach((svg, n) => {
    if (svg.parentElement?.closest('svg')) return
    const renamed = new Map<string, string>()
    for (const el of [svg, ...svg.querySelectorAll('[id]')]) {
      if (!el.id) continue
      const id = anchorFor(args.slug, `svg${n}-${el.id}`)
      renamed.set(el.id, id)
      el.id = id
    }
    if (!renamed.size) return
    // Without `.` in the name: in CSS it starts a class (`#mermaid-0.flowchart` is the id plus a class).
    const rewrite = (text: string): string => text.replace(/#([A-Za-z_][\w-]*)/g, (whole, id: string) => (renamed.has(id) ? '#' + renamed.get(id) : whole))
    for (const el of [svg, ...svg.querySelectorAll('*')]) {
      for (const attr of [...el.attributes]) {
        if (attr.name === 'aria-labelledby' || attr.name === 'aria-describedby') attr.value = attr.value.split(/\s+/).map((t) => renamed.get(t) ?? t).join(' ')
        else if (attr.name !== 'id' && attr.value.includes('#')) attr.value = rewrite(attr.value)
      }
    }
    svg.querySelectorAll('style').forEach((st) => (st.textContent = rewrite(st.textContent ?? '')))
  })
  art.querySelectorAll('[id]:not(h1,h2,h3,h4,h5,h6,p.index-heading)').forEach((e) => {
    if (!e.closest('svg')) e.id = anchorFor(args.slug, e.id)
  })

  const images: string[] = []
  art.querySelectorAll('img').forEach((img) => {
    img.setAttribute('src', img.src)
    img.removeAttribute('srcset')
    img.removeAttribute('loading')
    images.push(img.src)
  })

  art.querySelectorAll('a[href]').forEach((a) => {
    const raw = a.getAttribute('href') ?? ''
    let url: URL
    try {
      url = new URL(raw, location.href)
    } catch {
      return
    }
    if (url.origin !== location.origin) {
      if (/^https?:$/.test(url.protocol) || url.protocol === 'mailto:') a.setAttribute('href', url.href)
      return
    }
    const target = slugFromPathname(url.pathname)
    let hash = url.hash.slice(1)
    try {
      hash = decodeURIComponent(hash)
    } catch {
      // keep it encoded
    }
    if (inBook.has(target)) {
      a.setAttribute('href', '#' + anchorFor(target, hash || undefined))
      return
    }
    const out = args.outsideLinks === 'site' ? outsideUrl(args.baseUrl, target, url.hash) : null
    if (out) {
      counts.outsideLinks++
      a.setAttribute('href', out)
      a.classList.add('qc-outside')
      return
    }
    counts.textLinks++
    const span = document.createElement('span')
    span.className = 'qc-unlinked'
    span.append(...a.childNodes)
    a.replaceWith(span)
  })

  return { slug: args.slug, title, lang: document.documentElement.lang, html: art.innerHTML, images, counts }
}

export interface DocumentProblems {
  /** `<page title>: <tag> <px> px` for content that runs past the printable width. */
  overflow: string[]
  /** In-document links whose anchor does not exist. */
  deadLinks: string[]
  /** Pictures that did not load. */
  brokenImages: string[]
  counted: { links: number; images: number }
}

/**
 * Checks the assembled document at print width for what one cannot see in a finished PDF any
 * more: content past the right edge, links without a target, pictures that did not load. From the
 * handbook script's `findProblems`, with one difference measured on Example (2026-11-05): an
 * element is only a problem where it is *visible* past the edge. KaTeX draws stretchy symbols as
 * 400em-wide SVG paths inside a box with `overflow: hidden`; the old check reported them at
 * 6500 px. A clipping ancestor (`hidden`/`clip`) now limits what counts, and of an overflowing
 * subtree only the outermost element is named.
 */
export function findDocumentProblems(): DocumentProblems {
  const width = document.body.clientWidth
  const where = (el: Element): string =>
    el.closest('.doc-page')?.querySelector('.page-title')?.textContent ?? (el.closest('.qc-toc') ? 'toc' : '?')
  const visibleRight = (el: Element): number => {
    let right = el.getBoundingClientRect().right
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const o = getComputedStyle(a)
      if (/(hidden|clip)/.test(o.overflowX) || /(hidden|clip)/.test(o.overflow)) right = Math.min(right, a.getBoundingClientRect().right)
    }
    return right
  }
  const over = new Set<Element>()
  const overflow: string[] = []
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('.cover')) continue
    const r = el.getBoundingClientRect()
    if (!r.width) continue
    const right = visibleRight(el)
    if (right <= width + 1) continue
    over.add(el)
    if (el.parentElement && over.has(el.parentElement)) continue
    overflow.push(`${where(el)}: <${el.tagName.toLowerCase()}> ${Math.round(right - width)} px`)
  }
  const ids = new Set([...document.querySelectorAll('[id]')].map((e) => e.id))
  const internal = [...document.querySelectorAll('a[href^="#"]')]
  const deadLinks = internal.filter((a) => !ids.has(a.getAttribute('href')!.slice(1))).map((a) => `${where(a)}: ${a.getAttribute('href')}`)
  const brokenImages = [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => `${where(i)}: ${i.getAttribute('src')}`)
  return { overflow, deadLinks, brokenImages, counted: { links: internal.length, images: document.images.length } }
}

/** Waits until every picture of the assembled document has loaded or failed. */
export function imagesSettled(timeoutMs: number): Promise<number> {
  const pending = [...document.images].filter((i) => !i.complete)
  return Promise.race([
    Promise.all(pending.map((i) => new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }) }))).then(() => 0),
    new Promise<number>((r) => setTimeout(() => r(pending.filter((i) => !i.complete).length), timeoutMs))
  ]).then(() => document.fonts.ready).then(() => [...document.images].filter((i) => !i.complete).length)
}

/** Writes the page numbers the first pass found into the table of contents. */
export function fillPageNumbers(numbers: Record<string, number>): number {
  let filled = 0
  for (const n of document.querySelectorAll<HTMLElement>('.qc-toc .n[data-anchor]')) {
    const page = numbers[n.dataset.anchor!]
    if (page === undefined) continue
    n.textContent = String(page)
    filled++
  }
  return filled
}

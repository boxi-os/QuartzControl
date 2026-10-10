/**
 * An SVG file as markup to paste into a layout box's snippet - the one way to put a picture on the
 * site that CSS can style inside: `fill: currentColor`, a stroke on hover. As `<img src>` the file
 * is a closed box, and the stylesheet reaches only its frame.
 *
 * Pasted inline, the SVG is part of the page and runs in it, which an `<img>` never does. The file
 * is read as XML, but the site reads the result as HTML (quartz-layout-box through
 * `dangerouslySetInnerHTML`, a Markdown snippet through rehype-raw), and between the two parsers a
 * block list leaks: a processing instruction or a comment that HTML ends earlier carried an
 * `<img onerror>` past it, a tab inside `javascript:` passed the scheme check, an `<animate>` set an
 * `href` (forty-second review, finding 1). So nothing is passed through: the markup is written
 * anew from an allow list - SVG elements only, none that HTML lets break out of the SVG,
 * attributes without a namespace, text escaped, no comments, no processing instructions, no
 * `<style>` (it would style the whole page). Attribute names are read the way HTML reads them,
 * values the way CSS reads them, escapes included, and text is escaped for Markdown as well,
 * since a Markdown snippet reads it as Markdown before HTML ever sees it. A link may go to `#…`,
 * `https:` or `mailto:`, a picture to `#…`, `https:` or a raster `data:` URL; every other `href`
 * and every value CSS reads points into the file itself. The caller says how many things were
 * taken out; editor leftovers (Inkscape's namespaces, `<metadata>`) go without counting.
 * `npm run check:inline-svg` renders the result as HTML in Chrome, directly and through the
 * Markdown chain of quartz-layout-box.
 *
 * The root gets a class after the file name (`logo.svg` → `svg-logo`), the handle a stylesheet
 * needs; a class it already has stays. Blank lines go, because in a Markdown snippet a blank line
 * ends the HTML block and the rest of the SVG would be read as text.
 */
// `styled`: one of the removed parts was a `<style>`. Illustrator's default export ("internal CSS")
// keeps every colour in one, as `.st0{fill:#E30613}`, so without it the icon turns black and a line
// with only a stroke disappears - the count alone gives no hint of that (forty-third review,
// finding 7).
export type InlineSvgResult = { ok: true; markup: string; removed: number; styled: boolean } | { ok: false }

const SVG_NS = 'http://www.w3.org/2000/svg'
const XLINK_NS = 'http://www.w3.org/1999/xlink'

// No name here is one the HTML parser lets break out of foreign content (img, p, div, font, …).
const ELEMENTS = new Set([
  'svg', 'g', 'defs', 'symbol', 'use', 'title', 'desc', 'switch', 'view', 'a', 'image',
  'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect', 'text', 'tspan', 'textPath',
  'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask', 'pattern', 'marker',
  'filter', 'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix',
  'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feDropShadow', 'feFlood', 'feFuncA',
  'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode',
  'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile',
  'feTurbulence', 'animate', 'animateMotion', 'animateTransform', 'set', 'mpath'
])
const ANIMATIONS = new Set(['animate', 'animateMotion', 'animateTransform', 'set'])
// What vector editors leave behind; dropped without counting, since none of it runs or loads.
const EDITOR_NS = /inkscape|sodipodi|adobe|sketch|figma|purl\.org\/dc|creativecommons|rdf-syntax/i

// The URL parser drops tabs and newlines anywhere and C0 controls and spaces at the ends; dropping
// every such character before the check sees at least what the browser will.
const compact = (value: string): string => value.replace(/[\u0000- ]/g, '')
const safeHref = (element: string, value: string): boolean => {
  const v = compact(value)
  if (v.startsWith('#')) return true
  if (element === 'a') return /^(https|mailto):/i.test(v)
  if (element === 'image') return /^https:/i.test(v) || /^data:image\/(png|jpe?g|gif|webp|avif)[;,]/i.test(v)
  return false
}
// CSS reads `u\72 l(` as `url(`: an escape is a backslash and one to six hex digits with one
// optional space after them, or a backslash and any other character. Decoded before the question,
// so the question sees the value the way the style engine will.
const cssUnescape = (value: string): string =>
  value.replace(/\\(?:([0-9a-f]{1,6})[ \t\n\r\f]?|([^\n\r\f0-9a-f]))/gi, (_, hex: string | undefined, ch: string | undefined) =>
    hex ? String.fromCodePoint(Math.min(parseInt(hex, 16) || 0xfffd, 0x10ffff)) : (ch ?? '')
  )
// `fill="url(https://…)"`, a `style` with an `@import`: anything in a value that leaves the file.
// `image-set("…")` and its relatives load from a bare string, without any `url(`.
const leavesFile = (raw: string): boolean => {
  const value = cssUnescape(raw)
  return (
    /url\(\s*(?!['"]?\s*#)/i.test(value) ||
    /image-set\(|image\(|cross-fade\(|\bsrc\(/i.test(value) ||
    /@import|expression\s*\(|javascript:/i.test(compact(value))
  )
}

// HTML writes attribute names in lower case and gives these SVG names their capitals back
// ("adjust SVG attributes" in the HTML parser); XML takes every name as written. A name is checked
// and written the way the site will read it - `HREF` is an `href` there, `ATTRIBUTENAME` an
// `attributeName` (forty-third review, finding 3).
const SVG_CAMEL = new Map(
  [
    'attributeName', 'attributeType', 'baseFrequency', 'baseProfile', 'calcMode', 'clipPathUnits',
    'diffuseConstant', 'edgeMode', 'filterUnits', 'glyphRef', 'gradientTransform', 'gradientUnits',
    'kernelMatrix', 'kernelUnitLength', 'keyPoints', 'keySplines', 'keyTimes', 'lengthAdjust',
    'limitingConeAngle', 'markerHeight', 'markerUnits', 'markerWidth', 'maskContentUnits', 'maskUnits',
    'numOctaves', 'pathLength', 'patternContentUnits', 'patternTransform', 'patternUnits', 'pointsAtX',
    'pointsAtY', 'pointsAtZ', 'preserveAlpha', 'preserveAspectRatio', 'primitiveUnits', 'refX', 'refY',
    'repeatCount', 'repeatDur', 'requiredExtensions', 'requiredFeatures', 'specularConstant',
    'specularExponent', 'spreadMethod', 'startOffset', 'stdDeviation', 'stitchTiles', 'surfaceScale',
    'systemLanguage', 'tableValues', 'targetX', 'targetY', 'textLength', 'viewBox', 'viewTarget',
    'xChannelSelector', 'yChannelSelector', 'zoomAndPan'
  ].map((name) => [name.toLowerCase(), name])
)
const htmlName = (name: string): string => {
  const lower = name.toLowerCase()
  return SVG_CAMEL.get(lower) ?? lower
}

// A Markdown snippet is read twice: by remark, then by parse5. Whether remark reads the text
// inside the SVG as Markdown depends on the line form - an SVG in one line, or right under a line
// of text where "Insert image…" puts it at the cursor, is a paragraph with inline HTML, and
// `[x](javascript:…)` between the tags became a link on the site (forty-third review, finding 1).
// So text is written with every character Markdown builds structure from, inline or at the start
// of a line, as a numeric reference: remark reads a reference as the character and builds nothing
// from it, and in an HTML block or a layout box parse5 decodes it the same way.
// Ids are the page's, not the file's: two pasted icons from Figma both name a clip path
// `clip0_1_2`, from Illustrator both roots `Ebene_1`, and `url(#…)` takes the first element of the
// page with that id - the second icon wore the first one's gradient (forty-third review, nebenbei).
// So every id the file defines gets a prefix from its name and content, and every reference to one
// of them follows: `href="#…"`, `url(#…)` in any value, an animation's `begin`/`end` (`id.click`),
// and the ARIA attributes that list ids. A reference to an id the file does not define stays as
// it is.
const hash = (text: string): string => {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
  return (h >>> 0).toString(36).slice(0, 5)
}
const ID_LISTS = new Set([
  'aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-flowto', 'aria-details',
  'aria-activedescendant', 'aria-errormessage'
])
// A reference is read the way its reader reads it, as the checks above are: `href` the way the URL
// parser does (` #s` is `#s`), a `url()` the way CSS does (`#g\31` is `#g1`), and an animation's
// `anim.1.end` with the dot belonging to the id where the file defines one with it. In each of the
// four forms the reference kept its old id and pointed nowhere (forty-fourth review, Niedrig 8).
// Written in the read form only when it is one of the file's ids, and only an id that needs no
// escaping in CSS - anything else stays as it was written.
const PLAIN_ID = /^[\w.:-]+$/
const URL_REF = /url\(\s*(['"]?)((?:\\[0-9a-f]{1,6}[ \t\n\r\f]?|\\[^\n\r\f0-9a-f]|[^'")\s\\])+)/gi
function rewriteIds(attrName: string, value: string, ids: ReadonlySet<string>, prefix: string): string {
  const own = (id: string): string => (ids.has(id) ? prefix + id : id)
  if (attrName === 'id') return own(value)
  if (attrName === 'href') {
    const v = compact(value)
    return v.startsWith('#') && ids.has(v.slice(1)) ? `#${own(v.slice(1))}` : value
  }
  if (ID_LISTS.has(attrName)) return value.split(/(\s+)/).map((part) => (/\s/.test(part) ? part : own(part))).join('')
  if (attrName === 'begin' || attrName === 'end') {
    return value.replace(/(^|;)(\s*)([^;\s]+)/g, (whole: string, sep: string, ws: string, token: string) => {
      const parts = token.split('.')
      for (let k = parts.length - 1; k >= 1; k--) {
        const id = parts.slice(0, k).join('.')
        if (ids.has(id)) return `${sep}${ws}${own(id)}.${parts.slice(k).join('.')}`
      }
      return whole
    })
  }
  return value.replace(URL_REF, (whole: string, quote: string, raw: string) => {
    const ref = cssUnescape(raw)
    if (!ref.startsWith('#')) return whole
    const id = ref.slice(1)
    return ids.has(id) && PLAIN_ID.test(id) ? `url(${quote}#${own(id)}` : whole
  })
}

const escapeText = (s: string): string => s.replace(/[&<>[\]()!*_`~\\|:#+=.@-]/g, (c) => `&#${c.charCodeAt(0)};`)
// A value stays on the line of its tag: a line break in it is a line of the Markdown source, and
// one that starts with `#` or `-` would cut the tag in half before remark looked at it as HTML.
const escapeAttr = (s: string): string =>
  s.replace(/[&<>"\n\r]/g, (c) => `&#${c.charCodeAt(0)};`)

export function inlineSvg(text: string, fileName: string): InlineSvgResult {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const root = doc.documentElement
  if (doc.getElementsByTagName('parsererror').length > 0 || root.localName !== 'svg' || root.namespaceURI !== SVG_NS) return { ok: false }

  const slug = fileName
    .replace(/\.svg$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  let removed = 0
  let styled = false
  const ids = new Set([...doc.querySelectorAll('[id]')].map((el) => el.getAttribute('id') ?? '').filter(Boolean))
  const idPrefix = `${slug || 'svg'}-${hash(text)}-`
  const write = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) return escapeText(node.nodeValue ?? '')
    if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
      removed++
      return ''
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '' // comments
    const el = node as Element
    const name = el.localName
    if (el.namespaceURI !== SVG_NS || !ELEMENTS.has(name)) {
      if (name === 'style' && el.namespaceURI === SVG_NS && (el.textContent ?? '').trim()) styled = true
      if (!(name === 'metadata' && el.namespaceURI === SVG_NS) && !EDITOR_NS.test(el.namespaceURI ?? '')) removed++
      return ''
    }
    // The attributes as the site will see them: names the HTML way, the first of two that end up
    // with the same name, since HTML keeps the first and drops the rest. An own `href` wins over
    // `xlink:href`, which is written as plain `href`.
    const seen = new Map<string, string>()
    let xlinkHref: string | null = null
    for (const attr of el.attributes) {
      const ns = attr.namespaceURI
      if (ns === XLINK_NS && attr.localName === 'href') {
        xlinkHref ??= attr.value
        continue
      }
      if (ns !== null) {
        // xmlns declarations, xml:space, editor attributes - no meaning on the page.
        if (ns !== 'http://www.w3.org/2000/xmlns/' && ns !== 'http://www.w3.org/XML/1998/namespace' && !EDITOR_NS.test(ns)) removed++
        continue
      }
      if (!/^[A-Za-z][\w.-]*$/.test(attr.localName)) {
        removed++
        continue
      }
      const html = htmlName(attr.localName)
      if (seen.has(html)) {
        removed++
        continue
      }
      seen.set(html, attr.value)
    }
    if (xlinkHref !== null && !seen.has('href')) seen.set('href', xlinkHref)

    if (ANIMATIONS.has(name)) {
      const target = compact(seen.get('attributeName') ?? '').replace(/^.*:/, '').toLowerCase()
      if (target === 'href' || target.startsWith('on')) {
        removed++
        return ''
      }
    }

    const attrs: string[] = []
    let ownClass: string | null = null
    for (const [attrName, value] of seen) {
      if (attrName.startsWith('on')) {
        removed++
        continue
      }
      if (attrName === 'href' ? !safeHref(name, value) : leavesFile(value)) {
        removed++
        continue
      }
      if (el === root && attrName === 'class') {
        ownClass = value
        continue
      }
      attrs.push(`${attrName}="${escapeAttr(rewriteIds(attrName, value, ids, idPrefix))}"`)
    }
    if (el === root) {
      const own = ownClass?.trim() ?? ''
      const cls = slug ? `svg-${slug}` : ''
      const classes = [own, cls && !own.split(/\s+/).includes(cls) ? cls : ''].filter(Boolean).join(' ')
      attrs.unshift(`xmlns="${SVG_NS}"`, ...(classes ? [`class="${escapeAttr(classes)}"`] : []))
    }
    const inner = [...el.childNodes].map(write).join('')
    return `<${name}${attrs.length ? ' ' + attrs.join(' ') : ''}>${inner}</${name}>`
  }

  const markup = write(root)
    .replace(/\n\s*\n/g, '\n')
    .trim()
  return { ok: true, markup, removed, styled }
}

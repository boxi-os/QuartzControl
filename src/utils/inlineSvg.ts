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
export type InlineSvgResult = { ok: true; markup: string; removed: number } | { ok: false }

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
      attrs.push(`${attrName}="${escapeAttr(value)}"`)
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
  return { ok: true, markup, removed }
}

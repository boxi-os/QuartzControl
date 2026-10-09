/**
 * An SVG file as markup to paste into a layout box's snippet - the one way to put a picture on the
 * site that CSS can style inside: `fill: currentColor`, a stroke on hover. As `<img src>` the file
 * is a closed box, and the stylesheet reaches only its frame.
 *
 * Pasted inline, the SVG is part of the page and runs in it, which an `<img>` never does: a
 * `<script>`, an `onload`, a `javascript:` link would run on every page of the site. Icons from the
 * net carry such things more often than one would think (editors leave them, some sites add them),
 * so they are taken out, and the caller says how many. `foreignObject` goes as well - it embeds
 * HTML, which is what the rest of this function keeps out.
 *
 * The root gets a class after the file name (`logo.svg` → `svg-logo`), the handle a stylesheet
 * needs; a class it already has stays. Blank lines go, because in a Markdown snippet a blank line
 * ends the HTML block and the rest of the SVG would be read as text.
 */
export type InlineSvgResult = { ok: true; markup: string; removed: number } | { ok: false }

export function inlineSvg(text: string, fileName: string): InlineSvgResult {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const root = doc.documentElement
  if (doc.getElementsByTagName('parsererror').length > 0 || root.localName !== 'svg') return { ok: false }

  let removed = 0
  for (const el of [...root.querySelectorAll('script, foreignObject')]) {
    el.remove()
    removed++
  }
  for (const el of [root, ...root.querySelectorAll('*')]) {
    for (const attr of [...el.attributes]) {
      const isHandler = attr.localName.toLowerCase().startsWith('on')
      const isScriptLink = attr.localName === 'href' && /^\s*(javascript|data):/i.test(attr.value) && !/^\s*data:image\/(png|jpe?g|gif|webp|avif);/i.test(attr.value)
      if (isHandler || isScriptLink) {
        el.removeAttributeNode(attr)
        removed++
      }
    }
  }

  const slug = fileName
    .replace(/\.svg$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (slug) {
    const own = root.getAttribute('class')?.trim()
    const cls = `svg-${slug}`
    if (!own?.split(/\s+/).includes(cls)) root.setAttribute('class', own ? `${own} ${cls}` : cls)
  }

  const markup = new XMLSerializer()
    .serializeToString(root)
    .replace(/\n\s*\n/g, '\n')
    .trim()
  return { ok: true, markup, removed }
}

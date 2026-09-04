// The three self-hosted families, and the @font-face rules that point at them.
//
// Variable fonts, one file per family: `wght@400..700` makes Google return a single woff2 that
// covers the whole range, which is smaller than two static cuts and gives real intermediate
// weights instead of two steps. Latin subset only - a template that ships Cyrillic and Greek for a
// German site is 200 KB of nothing.
//
// FINDING (measured, not fixed): fontService.importFontFile writes
//
//     @font-face { font-family: "X"; src: url(...) format("woff2"); font-display: swap; }
//
// with no `font-weight`, no `font-style` and no `unicode-range` (electron/main/services/
// fontService.ts:30). For a single static cut that is fine. For a *variable* font it is wrong: with
// no weight range the browser treats the face as 400 and synthesises a faux bold for every heading,
// so the shipped variable axis is never used. Two static cuts of the same family are worse still -
// both faces claim the same weight and the last one wins.
//
// So the files travel through importFontFile (that is the real path, and it puts them where the
// emitter expects them), and the generated block is then replaced wholesale with FONT_FACE_CSS
// below via styles.save. The `fonts` part of the package exports whatever is inside the managed
// block, so the corrected rules are what ships.

export const FONTS = [
  {
    family: 'Instrument Sans',
    file: 'instrument-sans-latin-400-700.woff2',
    css: 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&display=swap',
    weight: '400 700',
    style: 'normal',
    role: 'header'
  },
  {
    family: 'Inter',
    file: 'inter-latin-400-700.woff2',
    css: 'https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap',
    weight: '400 700',
    style: 'normal',
    role: 'body'
  },
  {
    family: 'Inter',
    file: 'inter-latin-italic-400-700.woff2',
    css: 'https://fonts.googleapis.com/css2?family=Inter:ital,wght@1,400..700&display=swap',
    weight: '400 700',
    style: 'italic',
    role: 'body-italic'
  },
  {
    family: 'JetBrains Mono',
    file: 'jetbrains-mono-latin-400-700.woff2',
    css: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400..700&display=swap',
    weight: '400 700',
    style: 'normal',
    role: 'code'
  }
]

// Latin only. Copied from Google's own latin block so a character outside it falls back to the
// stack in variables.mjs rather than rendering from a subset that does not contain it.
const LATIN_RANGE =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, ' +
  'U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'

/** The corrected managed block: what importFontFile should have written. */
export function fontFaceCss() {
  return FONTS.map(
    (font) => `@font-face {
  font-family: "${font.family}";
  src: url("/static/fonts/${font.file}") format("woff2");
  font-weight: ${font.weight};
  font-style: ${font.style};
  font-display: swap;
  unicode-range: ${LATIN_RANGE};
}`
  ).join('\n\n')
}

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * Resolves the one latin woff2 URL out of a Google Fonts stylesheet.
 *
 * The stylesheet holds one @font-face per subset, distinguished only by `unicode-range`, and the
 * latin one is identified by its range starting at U+0000 - not by its position in the file, which
 * is not guaranteed. Sending a browser User-Agent is what makes Google answer with woff2 at all.
 */
export async function resolveFontUrl(cssUrl) {
  const response = await fetch(cssUrl, { headers: { 'User-Agent': BROWSER_UA } })
  if (!response.ok) throw new Error(`${cssUrl} answered ${response.status}`)
  const css = await response.text()
  for (const block of css.split('@font-face').slice(1)) {
    const range = block.match(/unicode-range:\s*([^;]+);/)
    const url = block.match(/src:\s*url\(([^)]+)\)/)
    if (!range || !url) continue
    if (/U\+0000-00FF/i.test(range[1])) return url[1].replace(/^['"]|['"]$/g, '')
  }
  throw new Error(`no latin subset found in ${cssUrl}`)
}

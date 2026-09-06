// The gallery covers - fourteen dummy images, one per Bereich of the `formatierung` section.
//
// Why they exist: the bases plugin's `gallery` and `cards` views take an `image:` option naming a
// *property* of each entry, resolve that property's value with `resolveImageSrc` (a hex colour, a
// wikilink or a plain path) and fall back to a hatched placeholder when it is empty. Measured on
// the built site before this: all 62 entries of `Alle-Ansichten` showed the placeholder, so the
// gallery view demonstrated nothing except that the view exists.
//
// Why they are generated rather than drawn: fourteen tiles that have to look like one set is
// exactly the job a few lines of arithmetic do better than fourteen files. Each one is a two-stop
// wash in its own muted hue plus one white motif at low opacity that says what the Bereich is
// about. No text - the card prints the page's title underneath, and a picture repeating it is a
// picture wasted.
//
// Where they go: into the *vault* (`assets/covers/`), because that is where this site's media
// lives and where its own git tracks it - see README section 0. This file is the generator, run
// with `node scripts/example-template/covers.mjs <vault>`, and the vault is where the result is
// versioned.
//
// The hues are deliberately narrow: same lightness band, low saturation, drawn around the
// palette's own `secondary` navy and `tertiary` sienna. A gallery of fourteen fully saturated
// tiles would be the loudest thing on a site whose whole argument is restraint.

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** id -> [ground, the motif]. `id` is the section folder's name under `2-formatierung/` without its number prefix. */
const COVERS = {
  index: ['#2A4E6C', 'grid'],
  callouts: ['#2F5D5A', 'callout'],
  code: ['#3B4A52', 'brackets'],
  diagramme: ['#4A5B7A', 'nodes'],
  eigenschaften: ['#5A5140', 'rows'],
  fussnoten: ['#6B4A55', 'footnote'],
  links: ['#37536B', 'chain'],
  listen: ['#46543A', 'bullets'],
  mathematik: ['#4B3F63', 'sigma'],
  medien: ['#7A4A2E', 'picture'],
  struktur: ['#52564A', 'stack'],
  tabellen: ['#4E4A5C', 'table'],
  text: ['#6A4436', 'letters'],
  besonderes: ['#7A5A2B', 'asterisk']
}

const W = 640
const H = 400
const INK = 'rgba(252, 252, 250, 0.86)'
const INK_SOFT = 'rgba(252, 252, 250, 0.42)'

/** A colour, lightened or darkened towards white/black by `amount` (-1 … 1). */
function shift(hex, amount) {
  const n = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const to = amount > 0 ? 255 : 0
  const t = Math.abs(amount)
  return '#' + n.map((v) => Math.round(v * (1 - t) + to * t).toString(16).padStart(2, '0')).join('')
}

// One helper for every stroked path, and the width is a *parameter* rather than something the
// caller appends: an SVG with the same attribute twice is not malformed markup that a browser
// patches up, it is an XML parse error, and the whole file renders as a broken image. Measured on
// a contact sheet of the first draft - eight of fourteen tiles were blank.
const stroke = (width = 7) => `fill="none" stroke="${INK}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`

const MOTIFS = {
  // Twelve columns and a gutter - the section index gets the thing the whole template is about.
  grid: () =>
    Array.from({ length: 6 }, (_, i) => `<rect x="${170 + i * 52}" y="120" width="30" height="160" rx="6" fill="${i % 2 ? INK_SOFT : INK}"/>`).join(''),
  // A box with the accent bar a callout carries on its start edge.
  callout: () =>
    `<rect x="150" y="130" width="340" height="140" rx="14" fill="${INK_SOFT}"/>` +
    `<rect x="150" y="130" width="14" height="140" rx="7" fill="${INK}"/>` +
    `<rect x="192" y="162" width="180" height="14" rx="7" fill="${INK}"/>` +
    `<rect x="192" y="196" width="256" height="10" rx="5" fill="${INK_SOFT}"/>` +
    `<rect x="192" y="224" width="210" height="10" rx="5" fill="${INK_SOFT}"/>`,
  brackets: () =>
    `<path d="M250 130 L190 200 L250 270" ${stroke()}/>` +
    `<path d="M390 130 L450 200 L390 270" ${stroke()}/>` +
    `<path d="M348 120 L292 280" ${stroke()}/>`,
  nodes: () =>
    `<path d="M320 150 L215 245 M320 150 L425 245 M215 245 L425 245" ${stroke(5)}/>` +
    `<circle cx="320" cy="150" r="26" fill="${INK}"/>` +
    `<circle cx="215" cy="245" r="20" fill="${INK_SOFT}"/>` +
    `<circle cx="425" cy="245" r="20" fill="${INK_SOFT}"/>`,
  rows: () =>
    [0, 1, 2].map((i) =>
      `<rect x="160" y="${140 + i * 48}" width="110" height="14" rx="7" fill="${INK}"/>` +
      `<rect x="298" y="${140 + i * 48}" width="182" height="14" rx="7" fill="${INK_SOFT}"/>`
    ).join(''),
  footnote: () =>
    `<rect x="170" y="140" width="230" height="12" rx="6" fill="${INK_SOFT}"/>` +
    `<rect x="170" y="172" width="180" height="12" rx="6" fill="${INK_SOFT}"/>` +
    `<circle cx="378" cy="166" r="13" fill="${INK}"/>` +
    `<path d="M170 232 L300 232" ${stroke(4)}/>` +
    `<circle cx="180" cy="264" r="9" fill="${INK}"/>` +
    `<rect x="200" y="258" width="200" height="12" rx="6" fill="${INK_SOFT}"/>`,
  // Two interlocking links. Drawn as two stadium outlines that overlap in the middle and tilted
  // together, rather than as four arcs stitched by hand - the hand-stitched version read as a
  // squiggle on the contact sheet.
  chain: () =>
    `<g transform="rotate(-32 320 200)">` +
    `<rect x="188" y="172" width="160" height="56" rx="28" ${stroke(14)}/>` +
    `<rect x="292" y="172" width="160" height="56" rx="28" ${stroke(14)}/>` +
    `</g>`,
  bullets: () =>
    [0, 1, 2].map((i) =>
      `<circle cx="182" cy="${146 + i * 54}" r="10" fill="${INK}"/>` +
      `<rect x="212" y="${139 + i * 54}" width="${250 - i * 40}" height="14" rx="7" fill="${INK_SOFT}"/>`
    ).join(''),
  sigma: () =>
    `<path d="M400 130 H240 L330 200 L240 270 H400" ${stroke(16)}/>`,
  picture: () =>
    `<rect x="160" y="130" width="320" height="140" rx="16" ${stroke(10)}/>` +
    `<circle cx="222" cy="176" r="18" fill="${INK}"/>` +
    `<path d="M176 258 L262 190 L330 244 L376 208 L464 258" ${stroke(10)}/>`,
  stack: () =>
    [0, 1, 2].map((i) =>
      `<rect x="${170 + i * 22}" y="${132 + i * 50}" width="${300 - i * 44}" height="36" rx="10" fill="${i === 0 ? INK : INK_SOFT}"/>`
    ).join(''),
  table: () =>
    `<rect x="160" y="132" width="320" height="136" rx="12" ${stroke(8)}/>` +
    `<path d="M160 176 H480 M266 132 V268 M373 132 V268" ${stroke(6)}/>` +
    `<rect x="160" y="132" width="320" height="44" rx="12" fill="${INK_SOFT}"/>`,
  letters: () =>
    `<path d="M186 272 L246 128 L306 272 M208 226 H284" ${stroke(16)}/>` +
    `<path d="M360 128 V272 M360 200 a44 44 0 1 1 0 60" ${stroke(16)}/>`,
  asterisk: () =>
    `<path d="M320 124 V276 M254 162 L386 238 M254 238 L386 162" ${stroke(18)}/>`
}

export function coverSvg(ground, motif) {
  const from = shift(ground, 0.14)
  const to = shift(ground, -0.24)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <g opacity="0.95">${MOTIFS[motif]()}</g>
</svg>
`
}

export function writeCovers(vault) {
  const dir = join(vault, 'assets', 'covers')
  mkdirSync(dir, { recursive: true })
  const written = []
  for (const [id, [ground, motif]] of Object.entries(COVERS)) {
    if (!MOTIFS[motif]) throw new Error(`cover ${id} asks for a motif called ${motif}, which does not exist`)
    const name = `cover-${id}.svg`
    writeFileSync(join(dir, name), coverSvg(ground, motif), 'utf-8')
    written.push(name)
  }
  return written
}

export const COVER_IDS = Object.keys(COVERS)

if (process.argv[1] && process.argv[1].endsWith('covers.mjs')) {
  const vault = process.argv[2]
  if (!vault) {
    console.error('usage: node scripts/example-template/covers.mjs <vault>')
    process.exit(1)
  }
  const written = writeCovers(vault)
  console.log(`${written.length} Titelbilder nach ${join(vault, 'assets', 'covers')}`)
}

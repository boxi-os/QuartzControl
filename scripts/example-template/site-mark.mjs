// The site mark in the header, in a light and a dark version - built from the app's own icon
// rather than copied out of it. mark-png.mjs rasterises both into site/static/icon.png and
// icon-dark.png, the project image of every template variant (see plugins.mjs); until 2026-09-24
// this file also returned them as inline SVG for the config.
//
// `build/icon-source/quartzcontrol-icon.svg` is the single source. A second, hand-trimmed copy
// pasted into plugins.mjs would be the third place this drawing lives (the .icns and the .ico are
// generated from the same file), and the one that silently stops matching the other two.
//
// What the two versions differ in is the tile, not the mark. The light one is the app icon's own
// blue-to-rose gradient. The dark one is the tile macOS itself draws for this icon when its
// appearance is set to dark icons (macOS 27, `AppleIconAppearanceTheme = RegularDark`): rendered
// through NSWorkspace and sampled on 2026-09-24 - rgb(47,49,49) at the top, rgb(24,24,24) at the
// bottom, the gear a light grey that the drawing's own rgb(235,235,235) already is. Until then the
// dark version was the gradient stepped down 15%; the user liked Apple's better.
//
// Both are cropped to the tile (`cropped()`): the icon source keeps Apple's grid - a tile of 824
// in a 1024 canvas, the rest room for the shadow - which a project image in a website header has
// no use for. Without the margin the mark is a fifth larger at the same 26 px.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ICON = join(HERE, '../../build/icon-source/quartzcontrol-icon.svg')

/** The gradient's two stops, as written in the source file. */
export const LIGHT_STOPS = [
  [69, 91, 155],   // top - the blue
  [221, 120, 127]  // bottom - the rose
]

/** The dark tile macOS draws for this icon (see the head of this file). */
export const DARK_STOPS = [
  [47, 49, 49],    // top
  [24, 24, 24]     // bottom
]

const rgb = ([r, g, b]) => `rgb(${r},${g},${b})`

// The tile's own rectangle in the source's 1024 canvas: its path runs from -9 to 183 and from 8 to
// 200, inside `matrix(4.291667,0,0,4.291667,135.99405,59.880111)` - so x 97.369, y 94.213, 824.0
// on each side. Read off the file rather than measured from a rendering, and checked by
// mark-png.mjs, which insists the crop leaves the four corners transparent and nothing else.
const TILE = { x: 97.369, y: 94.213, size: 824 }

/**
 * Trim the source down to what belongs in a config value: no XML preamble, no editor namespaces,
 * path data to one decimal.
 *
 * The transform matrices are deliberately *not* rounded. They scale every child of their group, so
 * 0.395064 -> 0.4 is a full percent of distortion on the Q - measured by rendering both.
 *
 * Used by mark-png.mjs, which rasterises the drawing. Two trimmers would be two drawings the day
 * one of them is touched.
 */
export function trimmed() {
  let s = readFileSync(ICON, 'utf8')
  s = s.replace(/<\?xml[^>]*\?>\s*/, '').replace(/<!DOCTYPE[^>]*>\s*/, '')
  s = s.replace(/\s*xmlns:(xlink|serif)="[^"]*"/g, '').replace(/\s*xml:space="[^"]*"/g, '')
  s = s.replace(/\s*version="[^"]*"/g, '')
  s = s.replace(/d="([^"]*)"/g, (_, d) => `d="${d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10))}"`)
  return s.replace(/>\s+</g, '><').trim()
}

/**
 * The drawing with the tile's gradient set to `stops` and its gradient id renamed.
 *
 * `id` matters wherever two versions share a document, and it is passed anyway when only one is
 * rendered, because a function that is only safe in one of its two call sites is one nobody re-reads.
 */
export function recoloured(id, stops) {
  return trimmed()
    .replace(/_Linear1/g, id)
    .replace(/stop-color:rgb\(69,\s*91,\s*155\)/, `stop-color:${rgb(stops[0])}`)
    .replace(/stop-color:rgb\(221,\s*120,\s*127\)/, `stop-color:${rgb(stops[1])}`)
}

/** The same drawing with the viewBox on the tile - no margin around it. */
export function cropped(svg) {
  const out = svg.replace(/viewBox="0 0 1024 1024"/, `viewBox="${TILE.x} ${TILE.y} ${TILE.size} ${TILE.size}"`)
  if (out === svg) throw new Error('site-mark.mjs: viewBox of the icon source is no longer 0 0 1024 1024')
  return out
}

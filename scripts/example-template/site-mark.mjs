// The site mark in the header, in a light and a dark version - built from the app's own icon
// rather than copied out of it. mark-png.mjs rasterises both into site/static/icon.png and
// icon-dark.png, the project image of every template variant (see plugins.mjs); until 2026-09-24
// this file also returned them as inline SVG for the config.
//
// `build/icon-source/quartzcontrol-icon.svg` is the single source. A second, hand-trimmed copy
// pasted into plugins.mjs would be the third place this drawing lives (the .icns and the .ico are
// generated from the same file), and the one that silently stops matching the other two.
//
// The two versions, since 2026-09-24. Light mode: the tile macOS 27 draws for this icon under dark
// icon appearance (`AppleIconAppearanceTheme = RegularDark`), rendered through NSWorkspace and
// sampled - rgb(47,49,49) at the top, rgb(24,24,24) at the bottom - with the drawing's own light
// grey gear. Dark mode: the exact colour inverse of that, a light tile with a near-black gear.
// Neither is the icon's blue-to-rose gradient any more; that stays the app's own icon.
//
// Both are cropped to the tile (`cropped()`): the icon source keeps Apple's grid - a tile of 824
// in a 1024 canvas, the rest room for the shadow - which a project image in a website header has
// no use for. Without the margin the mark is a fifth larger at the same 26 px.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ICON = join(HERE, '../../build/icon-source/quartzcontrol-icon.svg')

/** The tile's two gradient stops and the gear's fill, as written in the source file. */
const SOURCE = {
  stops: [
    [69, 91, 155],   // top - the blue
    [221, 120, 127]  // bottom - the rose
  ],
  gear: [235, 235, 235]
}

const invert = ([r, g, b]) => [255 - r, 255 - g, 255 - b]

/** The light-mode mark: macOS's dark tile, the source's gear (see the head of this file). */
export const MARK_LIGHT = {
  stops: [
    [47, 49, 49],   // top
    [24, 24, 24]    // bottom
  ],
  gear: SOURCE.gear
}

/** The dark-mode mark: the colour inverse of the light one, computed rather than written twice. */
export const MARK_DARK = { stops: MARK_LIGHT.stops.map(invert), gear: invert(MARK_LIGHT.gear) }

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
 * The drawing with the tile's gradient and the gear's fill set to `colors`, and its gradient id
 * renamed. Every replacement is checked: a source that no longer carries the colour it looks for
 * would otherwise come out in the icon's own colours, silently.
 *
 * `id` matters wherever two versions share a document, and it is passed anyway when only one is
 * rendered, because a function that is only safe in one of its two call sites is one nobody re-reads.
 */
export function recoloured(id, colors) {
  const pattern = ([r, g, b]) => new RegExp(`rgb\\(${r},\\s*${g},\\s*${b}\\)`, 'g')
  let svg = trimmed().replace(/_Linear1/g, id)
  const swaps = [
    [`stop-color:`, SOURCE.stops[0], colors.stops[0]],
    [`stop-color:`, SOURCE.stops[1], colors.stops[1]],
    [`fill:`, SOURCE.gear, colors.gear]
  ]
  for (const [prop, from, to] of swaps) {
    const re = new RegExp(prop + pattern(from).source, 'g')
    if (!re.test(svg)) throw new Error(`site-mark.mjs: ${prop}rgb(${from}) steht nicht mehr in der Quelle`)
    svg = svg.replace(re, `${prop}${rgb(to)}`)
  }
  return svg
}

/** The same drawing with the viewBox on the tile - no margin around it. */
export function cropped(svg) {
  const out = svg.replace(/viewBox="0 0 1024 1024"/, `viewBox="${TILE.x} ${TILE.y} ${TILE.size} ${TILE.size}"`)
  if (out === svg) throw new Error('site-mark.mjs: viewBox of the icon source is no longer 0 0 1024 1024')
  return out
}

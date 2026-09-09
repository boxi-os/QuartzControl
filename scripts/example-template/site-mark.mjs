// The site mark in the header, in a light and a dark version - built from the app's own icon
// rather than copied out of it.
//
// `build/icon-source/quartzcontrol-icon.svg` is the single source. A second, hand-trimmed copy
// pasted into plugins.mjs would be the third place this drawing lives (the .icns and the .ico are
// generated from the same file), and the one that silently stops matching the other two.
//
// What the two versions differ in is the tile, not the mark: the drawing sits on its own gradient
// and covers the page ground completely, so neither version needs the ground's colour. On
// #16171A the full-strength gradient reads as a lit square in the corner of an otherwise quiet
// header, which is why the dark one is stepped down 15%. The Q itself stays as it is - at 26px
// it is three shapes and a hole, and dimming those costs the hole.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ICON = join(HERE, '../../build/icon-source/quartzcontrol-icon.svg')

/** The gradient's two stops, as written in the source file. */
const STOPS = [
  [69, 91, 155],   // top - the blue
  [221, 120, 127]  // bottom - the rose
]

const scale = ([r, g, b], f) => `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`

/**
 * Trim the source down to what belongs in a config value: no XML preamble, no editor namespaces,
 * path data to one decimal.
 *
 * The transform matrices are deliberately *not* rounded. They scale every child of their group, so
 * 0.395064 -> 0.4 is a full percent of distortion on the Q - measured by rendering both.
 */
function trimmed() {
  let s = readFileSync(ICON, 'utf8')
  s = s.replace(/<\?xml[^>]*\?>\s*/, '').replace(/<!DOCTYPE[^>]*>\s*/, '')
  s = s.replace(/\s*xmlns:(xlink|serif)="[^"]*"/g, '').replace(/\s*xml:space="[^"]*"/g, '')
  s = s.replace(/\s*version="[^"]*"/g, '')
  s = s.replace(/d="([^"]*)"/g, (_, d) => `d="${d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10))}"`)
  return s.replace(/>\s+</g, '><').trim()
}

/**
 * One version. `id` makes the gradient's id unique: both versions are in the same document at the
 * same time - the plugin switches them with `display`, it does not remove one - and two
 * `<linearGradient id="_Linear1">` in one document is the first one winning for both.
 */
function version(cls, id, dim) {
  return trimmed()
    .replace('<svg', `<svg class="${cls}" role="img" aria-label=""`)
    .replace('width="100%" height="100%"', 'width="26" height="26"')
    .replace(/_Linear1/g, id)
    .replace(/stop-color:rgb\(69,\s*91,\s*155\)/, `stop-color:${scale(STOPS[0], dim)}`)
    .replace(/stop-color:rgb\(221,\s*120,\s*127\)/, `stop-color:${scale(STOPS[1], dim)}`)
}

export const MARK_LIGHT = version('img-light', 'qcMarkLight', 1)
export const MARK_DARK = version('img-dark', 'qcMarkDark', 0.85)

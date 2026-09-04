// The template's colours, and the arithmetic that decides whether they are allowed to be these
// colours.
//
// Quartz names its palette by *role*, and two of the roles read backwards: `light` is the page
// ground and `dark` is the body text - in BOTH modes. So the dark palette's `light` is nearly
// black. Verified against a real project's quartz.config.yaml before writing a single value.
//
// Every pair below is measured, not eyeballed: WCAG 2.1 contrast, AA thresholds (4.5 for text,
// 3.0 for a divider or a control's edge). `highlight` and `textHighlight` carry alpha, so they are
// composited over the ground first - a ratio computed against the bare hex would be a fiction.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const PALETTE = {
  lightMode: {
    light: '#FCFCFA',        // ground - warm off-white, not paper-white
    lightgray: '#DEDCD5',    // dividers, card and code backgrounds
    gray: '#5F5D57',         // meta text, dates, muted labels
    darkgray: '#33322E',     // body text
    dark: '#17171A',         // headings, the darkest ink
    secondary: '#2A4E6C',    // links, the one accent - a deep, slightly grey navy
    tertiary: '#9C4221',     // link hover, active nav - the warm counterpart, a burnt sienna
    highlight: 'rgba(42, 78, 108, 0.10)',  // surface tint behind quoted/active blocks
    textHighlight: 'rgba(226, 189, 92, 0.45)' // ==mark==
  },
  darkMode: {
    light: '#16171A',
    lightgray: '#2E3036',
    gray: '#A1A3A8',
    darkgray: '#D5D7DB',
    dark: '#F3F4F6',
    secondary: '#8CB8DA',
    tertiary: '#E8A56B',
    highlight: 'rgba(140, 184, 218, 0.12)',
    textHighlight: 'rgba(140, 184, 218, 0.30)'
  }
}

export const TYPOGRAPHY = {
  header: 'Instrument Sans',
  body: 'Inter',
  code: 'JetBrains Mono'
}

/* ------------------------------------------------------------------ WCAG arithmetic */

function parseColor(value) {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const raw = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1]
    return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16), 1]
  }
  const rgba = value.trim().match(/^rgba?\(([^)]+)\)$/i)
  if (rgba) {
    const parts = rgba[1].split(',').map((p) => Number(p.trim()))
    return [parts[0], parts[1], parts[2], parts[3] === undefined ? 1 : parts[3]]
  }
  throw new Error(`cannot parse colour: ${value}`)
}

/** Alpha over an opaque ground, because that is what the eye actually sees. */
function composite(colour, ground) {
  const [r, g, b, a] = parseColor(colour)
  if (a === 1) return [r, g, b]
  const [gr, gg, gb] = parseColor(ground)
  return [r * a + gr * (1 - a), g * a + gg * (1 - a), b * a + gb * (1 - a)]
}

function luminance([r, g, b]) {
  const channel = (c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrast(foreground, background, ground = background) {
  const a = luminance(composite(foreground, ground))
  const b = luminance(composite(background, ground))
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Every pair the built site actually puts on top of each other, with the threshold that applies to
 * it. `min: 3` is for something that is not text: a divider, a border, the edge of a control.
 */
const PAIRS = [
  { fg: 'darkgray', bg: 'light', min: 4.5, what: 'body text on the page' },
  { fg: 'dark', bg: 'light', min: 4.5, what: 'headings on the page' },
  { fg: 'gray', bg: 'light', min: 4.5, what: 'meta text on the page' },
  { fg: 'secondary', bg: 'light', min: 4.5, what: 'links on the page' },
  { fg: 'tertiary', bg: 'light', min: 4.5, what: 'hovered links on the page' },
  // `lightgray` is deliberately NOT checked against 3.0 here. It carries two roles at once - the
  // hairline between blocks and the fill of a code block or card - and WCAG 1.4.11 asks for 3:1
  // from *user interface components and their states*, not from a decorative rule or a surface.
  // Raising it to 3:1 would turn every code block mid-grey and take the design with it. The
  // obligation does not vanish, it moves: anything a user operates draws its edge from `gray`,
  // and those are the two rows below. The stylesheet has to honour that - see 00-base.scss.
  { fg: 'gray', bg: 'light', min: 3.0, what: 'edge of a control on the page' },
  { fg: 'gray', bg: 'lightgray', min: 3.0, what: 'edge of a control on a card' },
  { fg: 'darkgray', bg: 'lightgray', min: 4.5, what: 'body text on a card or code block' },
  { fg: 'dark', bg: 'lightgray', min: 4.5, what: 'headings on a card' },
  { fg: 'gray', bg: 'lightgray', min: 4.5, what: 'meta text on a card' },
  { fg: 'secondary', bg: 'lightgray', min: 4.5, what: 'links on a card' },
  { fg: 'darkgray', bg: 'highlight', min: 4.5, what: 'body text on a tinted surface' },
  { fg: 'dark', bg: 'highlight', min: 4.5, what: 'headings on a tinted surface' },
  { fg: 'secondary', bg: 'highlight', min: 4.5, what: 'links on a tinted surface' },
  { fg: 'darkgray', bg: 'textHighlight', min: 4.5, what: 'text inside ==mark==' }
]

export function checkContrast() {
  const rows = []
  for (const [mode, colours] of Object.entries(PALETTE)) {
    for (const pair of PAIRS) {
      const ratio = contrast(colours[pair.fg], colours[pair.bg], colours.light)
      rows.push({ mode, ...pair, ratio, ok: ratio >= pair.min })
    }
  }
  return rows
}

/* -------------------------------------------------------- callout colours, read from the file */

/**
 * Callout colours are checked by reading body-callouts.scss, not by keeping a copy of them here.
 *
 * The stylesheet is what ships, so it is what gets measured: a value edited there is measured
 * there, and there is no second list to forget to update. The file states every colour twice -
 * once at the top level for light mode, once inside the `:root[saved-theme="dark"]` block - so the
 * split point is that selector.
 */
export function calloutPairs() {
  const source = readFileSync(join(import.meta.dirname, 'styles', 'body-callouts.scss'), 'utf-8')
  const darkAt = source.indexOf(':root[saved-theme="dark"]')
  if (darkAt === -1) throw new Error('body-callouts.scss no longer has a dark-mode block')

  const read = (text) => {
    const out = {}
    for (const [, type, colour] of text.matchAll(/\.callout\[data-callout="([a-z]+)"\]\s*\{\s*--color:\s*([^;]+);/g)) {
      // `quote` aliases --secondary, which the base palette check already covers.
      if (colour.trim().startsWith('var(')) continue
      out[type] = colour.trim()
    }
    return out
  }

  const rows = []
  for (const [mode, text] of [['lightMode', source.slice(0, darkAt)], ['darkMode', source.slice(darkAt)]]) {
    const ground = PALETTE[mode].light
    const tint = mode === 'lightMode' ? 0.08 : 0.12
    for (const [type, colour] of Object.entries(read(text))) {
      const [r, g, b] = parseColor(colour)
      const tinted = `rgba(${r}, ${g}, ${b}, ${tint})`
      rows.push(
        { mode, fg: `callout ${type}`, bg: 'light', min: 4.5, what: `${type} callout title`, ratio: contrast(colour, ground) },
        { mode, fg: `callout ${type}`, bg: 'its own tint', min: 4.5, what: `${type} callout title on its box`, ratio: contrast(colour, tinted, ground) }
      )
    }
  }
  return rows.map((row) => ({ ...row, ok: row.ratio >= row.min }))
}

/* ------------------------------------------------- syntax colours, read from the file as well */

/**
 * The five token colours this template corrects, measured against the code block's own surface.
 *
 * Read out of body-code.scss for the same reason the callout colours are read out of their file:
 * the stylesheet is what ships. What is *not* here is the rest of github-light - a theme's other
 * colours only exist in the built HTML, on inline styles, so they were audited once by counting
 * every `--shiki-light` value across the built site. The four light corrections and the one dark
 * one are what that audit turned up; the numbers are in the comment above the block.
 *
 * The surface is not `light`: a code block has a ground of its own (`tpl-surface-code`), which is
 * lighter than the page tint in light mode and `lightgray` in dark.
 */
export function syntaxPairs() {
  const source = readFileSync(join(import.meta.dirname, 'styles', 'body-code.scss'), 'utf-8')
  const start = source.indexOf('/* --- Quartz-GUI:syntax:start --- */')
  const end = source.indexOf('/* --- Quartz-GUI:syntax:end --- */')
  if (start === -1 || end === -1) throw new Error('body-code.scss no longer marks its syntax block')
  const block = source.slice(start, end)

  const surface = { lightMode: '#F1EFE9', darkMode: PALETTE.darkMode.lightgray }
  const rows = []
  for (const [, which, was, now] of block.matchAll(
    /--shiki-(light|dark):#([0-9A-Fa-f]{6})"\]\s*\{\s*--shiki-\1:\s*(#[0-9A-Fa-f]{6})/g
  )) {
    const mode = which === 'light' ? 'lightMode' : 'darkMode'
    rows.push({
      mode,
      fg: `syntax ${now}`,
      bg: 'code surface',
      min: 4.5,
      what: `syntax token (was #${was.toUpperCase()})`,
      ratio: contrast(now, surface[mode])
    })
  }
  if (rows.length === 0) throw new Error('body-code.scss marks a syntax block but it is empty')
  return rows.map((row) => ({ ...row, ok: row.ratio >= row.min }))
}

/** Everything this template puts on top of something else, in one list. */
export function checkAll() {
  return [...checkContrast(), ...calloutPairs(), ...syntaxPairs()]
}

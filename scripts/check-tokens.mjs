#!/usr/bin/env node
// Does every variable the example template writes actually change a pixel?
//
// The template's `cssVariables` part is what the user gets in the app under *Stile → Variablen*.
// A token in that list makes a promise: turn me and something moves. Three ways it can fail to
// keep it, all of them found on 2026-09-06 in a list of 53:
//
//   * nobody reads it - `background-modifier-border` and its two neighbours were declared twice
//     and read by no `var()` in quartz or in any component plugin;
//   * something reads it and something else wins - quartz reads `--titleFont` for `.page-title`,
//     but the template's own unlayered rule set that font itself;
//   * it reaches an element that has the property set directly - the two leading tokens, for a
//     while, because quartz gives `p`, `li` and `tbody` a line-height of their own (BEFUNDE 59).
//
// None of the three is visible in the file. All three are visible here, because this does not read
// the CSS: it changes the token in a live page and counts how many computed values move.
//
// Three blind spots are designed around rather than lived with, because each cost a wrong answer
// on a real run: a token that only shows in a state (the three focus ones) needs something
// focused, one that only shows at a breakpoint (the drawer width) needs that breakpoint, and a
// page that is still settling moves values on its own, which otherwise gets credited to whatever
// token was being probed. So every page is visited at two widths with a control focused, and every
// count has the page's own noise floor subtracted.
//
//     node scripts/check-tokens.mjs [baseUrl]        default http://localhost:8080
//
// Needs the site served - the app's own dev server is fine, and being read-only this cannot
// disturb it.

import { chromium } from 'playwright-core'
import { VARIABLE_OVERRIDES } from './example-template/variables.mjs'

const BASE = process.argv[2] ?? 'http://localhost:8080'

// Between them these render every component the template styles. A token used by exactly one
// component is dead everywhere else, and that is not a finding - so the list has to be wide.
const PAGES = [
  '/',
  '/beispiele/langer-artikel',
  '/formatierung/callouts/alle-typen',
  '/formatierung/code/bloecke',
  '/formatierung/tabellen/ausrichtung',
  '/formatierung/medien/bilder',
  '/formatierung/mathematik/bloecke',
  '/formatierung/diagramme/fluss',
  '/obsidian-formate/bases/alle-ansichten.base',
  '/obsidian-formate/canvas/aufbau-der-vorlage.canvas',
  '/tags/callouts',
  '/gibtsnicht'
]

const VIEWPORTS = [
  [1456, 950],
  [390, 844]
]

// Every property any of these tokens can reach. A token that moves something outside this list
// would read as dead, so a new kind of token means a new entry here.
const PROPS = [
  'color', 'backgroundColor', 'backgroundImage', 'borderTopColor', 'borderTopWidth', 'borderTopStyle',
  'borderBottomColor', 'borderLeftColor', 'borderLeftWidth', 'borderRightColor', 'borderTopLeftRadius',
  'fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing', 'paddingTop', 'paddingLeft',
  'paddingBottom', 'marginTop', 'marginBottom', 'marginLeft', 'gap', 'rowGap', 'columnGap', 'width',
  'height', 'minHeight', 'minWidth', 'maxWidth', 'maxHeight', 'boxShadow', 'outlineColor', 'outlineWidth',
  'outlineOffset', 'opacity', 'transitionDuration', 'maskImage', 'fill', 'stroke', 'textDecorationColor',
  'textUnderlineOffset', 'flexBasis', 'gridTemplateColumns', 'inset', 'top', 'backdropFilter'
]

/** A probe value unmistakably different from the current one, matched to its shape. */
function probe(value) {
  const v = String(value).trim()
  if (/^#|^rgb|^var\(--/.test(v)) return 'magenta'
  if (/rem$|px$|em$|%$|^calc|^min\(/.test(v)) return '77px'
  if (/^[\d.]+$/.test(v)) return '3.7'
  if (/ms$|ease|s$/.test(v)) return '4321ms'
  return '"Courier New", monospace'
}

const fingerprint = () => {
  const props = window.__PROPS
  const rows = []
  for (const el of document.querySelectorAll('body *')) {
    const c = getComputedStyle(el)
    let row = ''
    for (const p of props) row += c[p] + '|'
    rows.push(row)
  }
  return rows
}

const browser = await chromium.launch({ channel: 'chrome' })
const effect = new Map(VARIABLE_OVERRIDES.map((o) => [o.key, 0]))
let visited = 0

try {
  for (const [width, height] of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width, height } })
    await page.addInitScript((props) => { window.__PROPS = props }, PROPS)
    for (const path of PAGES) {
      await page.goto(BASE + path, { waitUntil: 'load', timeout: 30_000 })
      await page.waitForTimeout(250)
      // Something has to be focus-visible or every focus token reads as dead.
      for (let i = 0; i < 3; i++) await page.keyboard.press('Tab')
      await page.waitForTimeout(80)
      visited++
      const base = await page.evaluate(fingerprint)
      // A page is not perfectly still: a webfont swapping in, mermaid finishing, the graph's canvas
      // settling - all of them move a computed value between two identical reads. Without this,
      // that noise gets attributed to whichever token was probed at the time, and a dead one is
      // reported alive. Measured: `--font-monospace` passed one run and failed the next with
      // nobody reading it in either. So the floor is taken first and a token has to beat it.
      const noise = await page.evaluate(([baseline]) => {
        const props = window.__PROPS
        let changed = 0
        let i = 0
        for (const el of document.querySelectorAll('body *')) {
          const c = getComputedStyle(el)
          let row = ''
          for (const p of props) row += c[p] + '|'
          if (row !== baseline[i]) changed++
          i++
        }
        return changed
      }, [base])
      for (const token of VARIABLE_OVERRIDES) {
        const moved = await page.evaluate(
          ([key, value, baseline]) => {
            const root = document.documentElement
            const had = root.style.getPropertyValue('--' + key)
            root.style.setProperty('--' + key, value)
            const props = window.__PROPS
            let changed = 0
            let i = 0
            for (const el of document.querySelectorAll('body *')) {
              const c = getComputedStyle(el)
              let row = ''
              for (const p of props) row += c[p] + '|'
              if (row !== baseline[i]) changed++
              i++
            }
            if (had) root.style.setProperty('--' + key, had)
            else root.style.removeProperty('--' + key)
            return changed
          },
          [token.key, probe(token.light), base]
        )
        effect.set(token.key, effect.get(token.key) + Math.max(0, moved - noise))
      }
    }
    await page.close()
  }
} finally {
  await browser.close()
}

const dead = [...effect].filter(([, n]) => n === 0)
console.log(`\n${VARIABLE_OVERRIDES.length} Tokens gegen ${visited} Seitenaufrufe geprüft.\n`)
for (const [key, n] of [...effect].sort((a, b) => a[1] - b[1])) {
  console.log(`  ${n === 0 ? '✗' : 'ok'}  ${String(n).padStart(6)}  --${key}`)
}
if (dead.length) {
  console.log(`\n${dead.length} Token ohne jede Wirkung. Entweder liest sie niemand, oder eine`)
  console.log('Regel setzt die Eigenschaft am Zielelement direkt und schlägt die Vererbung.')
  process.exit(1)
}
console.log('\n✓ jedes Token bewegt etwas.')

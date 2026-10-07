// Wo eine Variable der Stile-Seite gegen eine eigene Regel in custom.scss gewinnt — in drei Lagen.
//
//   node scripts/measure-variable-rules.mjs <projektpfad>
//
// Kompiliert mit dem `sass` des Projekts (wie die Bau-Tür) eine Nachbildung von custom.scss in
// einem Wegwerf-Ordner und liest die berechneten Werte in Chrome, ohne `saved-theme`, hell und
// dunkel. Für 1.1 (P0, docs/plan-1.1-umsetzung.md) gemessen; das Ergebnis steht in
// docs/decisions/styles-and-fonts.md. P4 misst damit nach, sobald der Schreiber die Form C kann.
//
//   1.0.x       der verwaltete Block steht am Ende von custom.scss, „nur hell“ gibt es nicht
//               (die helle Hälfte steht in :root und gilt mangels dunkler auch dunkel)
//   1.1 :root   der Block in _quartzcontrol.scss, per @use vor allen Regeln, Form wie 1.0.x
//   1.1 Form C  dasselbe, „nur hell“ als :root:not([saved-theme="dark"])
//
// Quartz' Theme-Variablen davor in @layer quartz-base, wie componentResources.ts:347.
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const projekt = process.argv[2]
const sassEntry = projekt && path.join(projekt, 'node_modules/sass/sass.node.mjs')
if (!sassEntry || !fs.existsSync(sassEntry)) {
  console.error('Aufruf: node scripts/measure-variable-rules.mjs <projektpfad>  (braucht dessen node_modules/sass)')
  process.exit(2)
}
const { compile } = await import(`file://${sassEntry}`)
const sassVersion = JSON.parse(fs.readFileSync(path.join(projekt, 'node_modules/sass/package.json'), 'utf-8')).version

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'variable-rules-'))
const dir = path.join(work, 'styles')
const write = (f, s) => fs.writeFileSync(path.join(dir, f), s)

// Je Variable: was die App schreibt (hell / dunkel / nur hell) und was der Nutzer in custom.scss setzt.
const VARS = {
  'm-both': { m: { light: 'M-both' } },
  'm-split': { m: { light: 'M-light', dark: 'M-dark' } },
  'm-lightonly': { m: { lightOnly: 'M-lightonly' } },
  'u-root': { u: { root: 'U-root' } },
  'u-dark': { u: { dark: 'U-dark' } },
  'm-both__u-root': { m: { light: 'M-both' }, u: { root: 'U-root' } },
  'm-split__u-root': { m: { light: 'M-light', dark: 'M-dark' }, u: { root: 'U-root' } },
  'm-split__u-dark': { m: { light: 'M-light', dark: 'M-dark' }, u: { dark: 'U-dark' } },
  'm-lightonly__u-root': { m: { lightOnly: 'M-lightonly' }, u: { root: 'U-root' } },
  'm-lightonly__u-dark': { m: { lightOnly: 'M-lightonly' }, u: { dark: 'U-dark' } }
}
const decls = (pick) => Object.entries(VARS).filter(([, v]) => pick(v) !== undefined).map(([k, v]) => `  --${k}: ${pick(v)};`).join('\n')

function managed(formC) {
  const light = decls((v) => v.m?.light ?? (formC ? undefined : v.m?.lightOnly))
  const dark = decls((v) => v.m?.dark)
  const lightOnly = formC ? decls((v) => v.m?.lightOnly) : ''
  return [
    '/* --- QuartzControl:managed:css-vars:start --- */',
    `:root {\n${light}\n}`,
    `:root[saved-theme="dark"] {\n${dark}\n}`,
    lightOnly && `:root:not([saved-theme="dark"]) {\n${lightOnly}\n}`,
    '/* --- QuartzControl:managed:css-vars:end --- */'
  ].filter(Boolean).join('\n\n')
}
const user = `.b { color: rgb(2, 2, 2); }\n\n:root {\n${decls((v) => v.u?.root)}\n}\n\n:root[saved-theme="dark"] {\n${decls((v) => v.u?.dark)}\n}\n`
const imports = '/* --- QuartzControl:managed:imports:start --- */\n@use "./custom/a";\n/* --- QuartzControl:managed:imports:end --- */\n'

fs.mkdirSync(path.join(dir, 'custom'), { recursive: true })
write('variables.scss', '$mobile: "(max-width: 800px)";\n')
write('custom/a.scss', '.a { color: rgb(1, 1, 1); }\n')

const scenarios = {
  '1.0.x': () => {
    write('custom.scss', `@use "./variables.scss" as *;\n\n${imports}\n${user}\n${managed(false)}\n`)
  },
  '1.1 :root': () => {
    write('_quartzcontrol.scss', `${imports}\n${managed(false)}\n`)
    write('custom.scss', `@use "./variables.scss" as *;\n@use "./quartzcontrol";\n\n${user}`)
  },
  '1.1 Form C': () => {
    write('_quartzcontrol.scss', `${imports}\n${managed(true)}\n`)
    write('custom.scss', `@use "./variables.scss" as *;\n@use "./quartzcontrol";\n\n${user}`)
  }
}

const keys = Object.keys(VARS)
const q = (mode) => keys.map((k) => `--${k}: Q-${mode};`).join(' ')
const quartzBase = `@layer quartz-base {\n:root { ${q('light')} }\n:root[saved-theme="dark"] { ${q('dark')} }\n}`

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
const table = {}
for (const [name, setup] of Object.entries(scenarios)) {
  setup()
  const css = compile(path.join(dir, 'custom.scss')).css
  // Reihenfolge der Ausgabe: wo stehen .a (Import), die verwalteten Variablen und .b (Nutzer)?
  const at = (needle) => css.indexOf(needle)
  console.log(`${name}: .a@${at('.a {')}  managed@${at('managed:css-vars:start')}  .b@${at('.b {')}  user-:root@${at('--u-root: U-root')}`)
  await page.setContent(`<html><head><style>${quartzBase}\n${css}</style></head><body></body></html>`)
  for (const attr of [null, 'light', 'dark']) {
    const got = await page.evaluate(
      ([attr, keys]) => {
        const root = document.documentElement
        if (attr) root.setAttribute('saved-theme', attr)
        else root.removeAttribute('saved-theme')
        const s = getComputedStyle(root)
        return keys.map((k) => s.getPropertyValue('--' + k).trim())
      },
      [attr, keys]
    )
    keys.forEach((k, i) => ((table[k] ??= {})[`${name} ${attr ?? 'ohne'}`] = got[i]))
  }
}
await browser.close()
fs.rmSync(work, { recursive: true, force: true })

const cols = Object.keys(table[keys[0]])
console.log(`\nsass ${sassVersion}`)
console.log('\n' + 'Variable'.padEnd(22) + cols.map((c) => c.padEnd(17)).join(''))
for (const k of keys) console.log(k.padEnd(22) + cols.map((c) => table[k][c].padEnd(17)).join(''))

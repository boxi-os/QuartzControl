// REPL driver for QuartzControl (Electron + React, HashRouter). macOS only - this repo's
// postinstall (scripts/brand-electron.mjs) renames the local Electron.app bundle to
// QuartzControl.app, so the executable path is read from node_modules/electron/path.txt at
// runtime rather than hardcoded (works whether or not branding has run).
// Designed for agents: wrap in tmux, send-keys commands, capture-pane output.
import { _electron as electron } from 'playwright-core'
import * as readline from 'node:readline'
import * as fs from 'node:fs'
import * as path from 'node:path'

const APP_DIR = path.resolve(import.meta.dirname, '../../..')
const SHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp/shots'
fs.mkdirSync(SHOT_DIR, { recursive: true })

let app = null
let page = null

function electronBinPath() {
  const relPath = fs.readFileSync(path.join(APP_DIR, 'node_modules/electron/path.txt'), 'utf-8')
  return path.join(APP_DIR, 'node_modules/electron/dist', relPath)
}

const COMMANDS = {
  async launch() {
    if (app) return console.log('already launched')
    // Uses the production build in out/ (npm run build) - electron/main/index.ts only tries a
    // dev server URL if ELECTRON_RENDERER_URL is set, which we deliberately don't set here.
    if (!fs.existsSync(path.join(APP_DIR, 'out/main/index.js'))) {
      console.log('ERROR: out/main/index.js missing - run `npm run build` first')
      return
    }
    app = await electron.launch({
      executablePath: electronBinPath(),
      args: [APP_DIR],
      timeout: 30_000
    })
    // Electron has no clean "loaded" signal - poll for the HashRouter to have rendered
    // something into #root instead of a blind sleep.
    page = app.windows().find((w) => !w.url().startsWith('devtools://')) ?? (await app.firstWindow())
    try {
      await page.waitForFunction(() => document.getElementById('root')?.children.length > 0, { timeout: 15_000 })
    } catch {
      console.log('WARNING: #root never populated within 15s - app may be stuck (see windows/eval)')
    }
    console.log('launched.', app.windows().length, 'windows:')
    for (const w of app.windows()) console.log(' ', w.url())
  },

  async ss(name) {
    if (!page) return console.log('ERROR: launch first')
    const f = path.join(SHOT_DIR, (name || `ss-${Date.now()}`) + '.png')
    await page.screenshot({ path: f })
    console.log('screenshot:', f)
  },

  // Click via evaluate(), not locator.click() - DOM click sidesteps any coordinate/layer
  // mismatch (hiddenInset title bar, custom drag regions) entirely.
  async click(sel) {
    if (!page) return console.log('ERROR: launch first')
    const r = await page.evaluate((s) => {
      const el = document.querySelector(s)
      if (!el) return 'NOT_FOUND'
      el.click()
      return 'OK'
    }, sel)
    console.log('click', sel, '→', r)
  },

  async 'click-text'(text) {
    if (!page) return console.log('ERROR: launch first')
    const r = await page.evaluate((t) => {
      const els = [...document.querySelectorAll('button, a, [role="button"]')]
      const el = els.find((e) => e.textContent?.trim() === t) ?? els.find((e) => e.textContent?.includes(t))
      if (!el) return 'NOT_FOUND'
      el.click()
      return 'OK: ' + el.tagName
    }, text)
    console.log('click-text', JSON.stringify(text), '→', r)
  },

  // Navigates the HashRouter directly, e.g. `goto /project/<id>/themes` - far more reliable
  // than clicking through Home.tsx's project list when you already know the project id (read it
  // from ~/Library/Application Support/QuartzControl/projects.json).
  async goto(hashPath) {
    if (!page) return console.log('ERROR: launch first')
    await page.evaluate((p) => {
      location.hash = p.startsWith('#') ? p : '#' + p
    }, hashPath)
    console.log('goto', hashPath)
  },

  // Sets a controlled React input's value directly via the native property setter + dispatches
  // a real 'input' event, instead of page.keyboard.type(). Two independent reasons: (1) this app's
  // window doesn't reliably hold OS-level keyboard focus under Playwright's _electron, so
  // keyboard.type() silently no-ops; (2) even when focus works, React's controlled-input value
  // tracking only reacts to the native setter + a dispatched event, not a plain el.value = x.
  // First word is the CSS selector, the rest (rejoined with spaces) is the text.
  async fill(rest) {
    if (!page) return console.log('ERROR: launch first')
    const [sel, ...words] = rest.split(' ')
    const text = words.join(' ')
    const r = await page.evaluate(
      ({ sel, text }) => {
        const el = document.querySelector(sel)
        if (!el) return 'NOT_FOUND'
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
        setter.call(el, text)
        el.dispatchEvent(new Event('input', { bubbles: true }))
        return 'OK: ' + el.value
      },
      { sel, text }
    )
    console.log('fill', sel, JSON.stringify(text), '→', r)
  },

  async type(text) {
    if (page) await page.keyboard.type(text, { delay: 30 })
  },
  async press(key) {
    if (page) await page.keyboard.press(key)
  },

  // Real Playwright mouse input (down/move.../up) for exercising drag-and-drop libraries like
  // dnd-kit, which listen for actual pointer events rather than being clickable via DOM .click().
  async drag(rest) {
    if (!page) return console.log('ERROR: launch first')
    const [x1, y1, x2, y2, steps] = rest.split(/\s+/).map(Number)
    await page.mouse.move(x1, y1)
    await page.mouse.down()
    await page.mouse.move(x2, y2, { steps: steps || 10 })
    await page.mouse.up()
    console.log('drag', x1, y1, '→', x2, y2)
  },

  async wait(sel) {
    if (!page) return console.log('ERROR: launch first')
    try {
      await page.waitForSelector(sel, { timeout: 10_000 })
      console.log('found:', sel)
    } catch {
      console.log('TIMEOUT:', sel)
    }
  },

  async eval(expr) {
    if (!page) return console.log('ERROR: launch first')
    try {
      console.log(JSON.stringify(await page.evaluate(expr)))
    } catch (e) {
      console.log('ERROR:', e.message)
    }
  },

  async text(sel) {
    if (!page) return console.log('ERROR: launch first')
    console.log(await page.evaluate((s) => (s ? document.querySelector(s) : document.body)?.innerText ?? '(null)', sel || null))
  },

  async windows() {
    if (!app) return console.log('ERROR: launch first')
    for (const w of app.windows()) console.log(' ', w.url())
    const wcs = await app.evaluate(({ webContents }) =>
      webContents.getAllWebContents().map((w) => ({ id: w.id, type: w.getType(), url: w.getURL() }))
    )
    console.log('webContents:')
    for (const w of wcs) console.log(` [${w.id}] ${w.type}: ${w.url}`)
  },

  async quit() {
    if (app) await app.close().catch(() => {})
    app = null
    page = null
  },
  help() {
    console.log('commands:', Object.keys(COMMANDS).join(', '))
  }
}

// Stop Electron from stealing stdin - use the raw fd.
const stdin = fs.createReadStream(null, { fd: fs.openSync('/dev/stdin', 'r') })
const rl = readline.createInterface({ input: stdin, output: process.stdout, prompt: 'driver> ' })

rl.on('line', async (line) => {
  const [cmd, ...rest] = line.trim().split(/\s+/)
  if (!cmd) return rl.prompt()
  const fn = COMMANDS[cmd]
  if (!fn) {
    console.log('unknown:', cmd, '— try: help')
    return rl.prompt()
  }
  try {
    await fn(rest.join(' '))
  } catch (e) {
    console.log('ERROR:', e.message)
  }
  if (cmd === 'quit') {
    rl.close()
    process.exit(0)
  }
  rl.prompt()
})
rl.on('close', async () => {
  await COMMANDS.quit()
  process.exit(0)
})

console.log('QuartzControl driver — "help" for commands, "launch" to start')
rl.prompt()

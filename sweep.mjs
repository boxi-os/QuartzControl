import { chromium, firefox, webkit } from 'playwright-core'
const PAGES = ['/', '/beispiele/langer-artikel', '/beispiele', '/formatierung',
  '/formatierung/callouts/alle-typen', '/formatierung/code/bloecke',
  '/formatierung/tabellen/ausrichtung', '/formatierung/medien/bilder',
  '/formatierung/mathematik/bloecke', '/formatierung/diagramme/fluss',
  '/formatierung/diagramme/zahlen', '/formatierung/diagramme/zeit',
  '/formatierung/diagramme/sequenz', '/formatierung/diagramme/struktur',
  '/obsidian-formate/bases/alle-ansichten.base',
  '/obsidian-formate/canvas/aufbau-der-vorlage.canvas', '/tags', '/tags/callouts',
  '/gibtsnicht', '/en/']
let problems = 0, checks = 0
for (const [n, e] of Object.entries({ chromium, firefox, webkit })) {
  const b = await e.launch(n === 'chromium' ? { channel: 'chrome' } : {})
  for (const w of [1728, 1100, 390]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } })
    const errs = []
    p.on('pageerror', (x) => errs.push('uncaught: ' + x.message))
    p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 110)) })
    for (const path of PAGES) {
      errs.length = 0
      try { await p.goto('http://localhost:8080' + path, { waitUntil: 'load', timeout: 25000 }) }
      catch { console.log(`  ✗ ${n} ${w} ${path}: Ladefehler`); problems++; continue }
      await p.waitForTimeout(700); checks++
      const r = await p.evaluate(() => {
        const h = document.querySelector('.qgframe-area-header')
        return { over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          header: !!h, rows: h ? new Set([...h.querySelectorAll(':scope > * > *')].map((e) => Math.round(e.getBoundingClientRect().top))).size : 0,
          empty: document.body.innerText.trim().length < 40 }
      })
      const bad = []
      if (r.over > 1) bad.push(`${r.over}px seitlich`)
      if (!r.header) bad.push('kein Header')
      if (r.rows > 1) bad.push(`Header ${r.rows} Reihen`)
      if (r.empty) bad.push('leere Seite')
      if (path !== '/gibtsnicht' && errs.length) bad.push(...errs.slice(0, 2))
      if (bad.length) { console.log(`  ✗ ${n} ${w} ${path}: ${bad.join(', ')}`); problems++ }
    }
    await p.close()
  }
  await b.close()
}
console.log(`\n${checks} Seitenaufrufe in drei Engines, ${problems} Befunde.`)

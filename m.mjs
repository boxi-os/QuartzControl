import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome' })
const p = await b.newPage({ viewport: { width: 620, height: 700 } })
await p.goto('http://localhost:8080/beispiele/langer-artikel', { waitUntil: 'load' })
await p.waitForTimeout(500)
await p.evaluate(() => { document.querySelector('.page-title a').textContent = 'Ein deutlich längerer Websitename für den Test' })
await p.waitForTimeout(250)
console.log(JSON.stringify(await p.evaluate(() => {
  const t = document.querySelector('.page-title'), a = t.querySelector('a')
  const r = t.getBoundingClientRect(), ar = a.getBoundingClientRect()
  return { h2Breite: Math.round(r.width), h2Hoehe: Math.round(r.height), h2scrollW: t.scrollWidth,
    aBreite: Math.round(ar.width), aHoehe: Math.round(ar.height),
    aRechts: Math.round(ar.right), sucheLinks: Math.round(document.querySelector('.search').getBoundingClientRect().left),
    ueberlappt: ar.right > document.querySelector('.search').getBoundingClientRect().left,
    whiteSpace: getComputedStyle(a).whiteSpace, overflow: getComputedStyle(t).overflow }
}), null, 1))
await p.screenshot({ path: 'trunc.png', clip: { x: 0, y: 0, width: 620, height: 90 } })
await b.close()

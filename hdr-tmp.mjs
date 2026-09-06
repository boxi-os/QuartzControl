import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome' })
const p = await b.newPage({ viewport: { width: 1456, height: 950 } })
await p.goto('http://localhost:8080/formatierung/code/bloecke', { waitUntil: 'load' })
await p.waitForTimeout(700)
console.log(JSON.stringify(await p.evaluate(() => {
  const out = {}
  for (const sel of ['.search-button', '.darkmode button', '.readermode button', '.qgframe-area-header .search']) {
    const el = document.querySelector(sel)
    out[sel] = el ? getComputedStyle(el).borderTopColor + ' / ' + getComputedStyle(el).borderTopWidth : 'nicht da'
  }
  // and every element in the document whose border resolves to the mixed control tone
  const want = 'rgb(142, 141, 136)'
  out.treffer = [...document.querySelectorAll('body *')]
    .filter((e) => getComputedStyle(e).borderTopColor === want || getComputedStyle(e).outlineColor === want).length
  return out
}), null, 1))
await b.close()

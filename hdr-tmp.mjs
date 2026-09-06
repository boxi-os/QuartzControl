import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome' })
for (const scheme of ['light','dark']) {
  const p = await b.newPage({ viewport: { width: 1456, height: 950 }, colorScheme: scheme })
  await p.goto('http://localhost:8080/beispiele/langer-artikel', { waitUntil: 'load' })
  await p.waitForTimeout(700)
  console.log(scheme, JSON.stringify(await p.evaluate(() => {
    const rs = getComputedStyle(document.documentElement)
    const r = document.querySelector('.qgframe-area-right')
    return {
      tokenEnd: (rs.getPropertyValue('--tpl-fade-mask-end') || '(leer)').trim().slice(0, 40),
      tokenBoth: (rs.getPropertyValue('--tpl-fade-mask') || '(leer)').trim().slice(0, 40),
      rightMask: r ? getComputedStyle(r).maskImage.slice(0, 60) : 'keine rechte Spalte'
    }
  }), null, 0))
  await p.close()
}
await b.close()

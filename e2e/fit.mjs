// 1280x800 で、全事件・全生徒・GHOST/GOD・全切り口の EVIDENCE / OPERATION ツリーがスクロールなしで収まるか
import { chromium } from 'playwright-core'
const URL = process.env.URL ?? 'http://localhost:5199/'
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome' })
const p = await b.newPage({ viewport: { width: +(process.env.VW ?? 1280), height: +(process.env.VH ?? 800) } })
const fails = []
let checked = 0
for (const cid of ['まるやま', 'コンビニ']) for (const mode of ['GHOST', 'GOD']) {
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload()
  await p.locator('.title-case-wrap', { hasText: cid }).getByRole('button', { name: mode }).click()
  for (const ph of ['EVIDENCE', 'OPERATION']) {
    await p.getByRole('button', { name: new RegExp('^' + ph) }).first().click()
    for (let s = 0; s < 6; s++) {
      await p.locator('.model-students__toggle').click(); await p.locator('.model-students__pop button').nth(s).click()
      const tabSel = ph === 'EVIDENCE' ? '.sheet-tabs [role=tab]' : null
      const n = ph === 'EVIDENCE' ? await p.locator(tabSel).count() : await p.locator('.operation__sheet-select option').count()
      for (let t = 0; t < Math.max(1, n); t++) {
        if (n > 1) {
          if (tabSel) await p.locator(tabSel).nth(t).click()
          else await p.locator('.operation__sheet-select select').selectOption({ index: t })
        }
        await p.waitForTimeout(80)
        const r = await p.evaluate(() => {
          const el = document.querySelector('.evidence__scroll')
          const rect = el.getBoundingClientRect()
          return { sh: el.scrollHeight, ch: el.clientHeight, sw: el.scrollWidth, cw: el.clientWidth, bottom: rect.bottom, vh: innerHeight, scale: el.dataset.scale }
        })
        checked++
        if (r.sh > r.ch + 2 || r.sw > r.cw + 2 || r.bottom > r.vh + 1) fails.push({ cid, mode, ph, s: s + 1, t, ...r })
      }
    }
  }
}
console.log(JSON.stringify({ checked, fails }, null, 1))
await b.close()
process.exit(fails.length ? 1 : 0)

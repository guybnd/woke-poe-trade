// Checks the built site (npx vitepress build first) at phone and desktop sizes:
// nothing wider than the screen, thumb-sized plates, phones get the crops and
// desktops the 1280px copies, and swiping, "Whole screen" and the "?" cards
// work. Run from docs/: node scripts/check-phone.mjs
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { HIGHLIGHTS } from '../.vitepress/theme/landing/content.js'

const PORT = 4179
const SITE = `http://localhost:${PORT}/woke-poe-trade/`
const failures = []
const fail = (msg) => { failures.push(msg); console.error(`FAIL ${msg}`) }

for (const s of HIGHLIGHTS.flatMap(h => h.slides.flatMap(s => s.folder ?? [s]))) {
  if (!s.focus) fail(`slide "${s.label}" (${s.shot}) has no focus for its phone crop`)
}

// Not through npx, so killing it stops the server itself.
const server = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/vitepress/bin/vitepress.js', import.meta.url)), 'preview', '--port', String(PORT)], { stdio: 'ignore' })
let exited = false
server.on('exit', () => { exited = true })
try {
  for (let i = 0; ; i++) {
    if (exited) throw new Error(`vitepress preview stopped (port ${PORT} taken?)`)
    try { if ((await fetch(SITE)).ok) break } catch {}
    if (i > 60) throw new Error('vitepress preview did not start')
    await new Promise(r => setTimeout(r, 500))
  }
  const browser = await chromium.launch()
  for (const [name, width, height, phone] of [['phone 390', 390, 844, true], ['phone 360', 360, 740, true], ['desktop', 1440, 900, false]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, isMobile: phone, hasTouch: phone })
    const page = await ctx.newPage()
    page.on('pageerror', e => fail(`${name}: ${e.message}`))
    // Vue's hydration mismatches only reach the console.
    page.on('console', m => { if (m.type() === 'error' || /hydration/i.test(m.text())) fail(`${name}: console: ${m.text()}`) })
    await page.goto(SITE, { waitUntil: 'networkidle' })
    // Walk down the page so every lazy picture loads.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 300) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)) }
      scrollTo(0, 0)
    })
    await page.waitForLoadState('networkidle')

    const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    if (wide > 0) fail(`${name}: the page is ${wide}px wider than the screen`)

    const pictures = await page.$$eval('.stage picture.on img', imgs => imgs.map(i => ({ src: i.currentSrc, w: i.naturalWidth })))
    if (pictures.length !== HIGHLIGHTS.length) fail(`${name}: ${pictures.length} pictures on show, want one for each of the ${HIGHLIGHTS.length} highlights`)
    for (const p of pictures) {
      const want = phone ? '/shots/phone/' : '/shots/1280/'
      if (!p.src.includes(want)) fail(`${name}: showed ${p.src}, not a picture from ${want}`)
      else if (!p.w) fail(`${name}: ${p.src} did not load`)
    }

    if (phone) {
      const small = await page.$$eval('.plate', ps => ps.map(p => p.getBoundingClientRect().height).filter(h => h < 44))
      if (small.length) fail(`${name}: ${small.length} plates are under 44px tall`)

      // Swipe the Path of Building picture left: the next plate. Then right.
      const pressed = () => page.$eval('#pob .plates [aria-pressed="true"]', b => b.textContent.trim())
      const swipe = (dx) => page.$eval('#pob .stage', (stage, dx) => {
        const r = stage.getBoundingClientRect()
        const at = (x) => [new Touch({ identifier: 1, target: stage, clientX: x, clientY: r.top + r.height / 2 })]
        const x0 = r.left + r.width / 2
        stage.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, changedTouches: at(x0), touches: at(x0) }))
        stage.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: at(x0 + dx) }))
      }, dx)
      const first = await pressed()
      await swipe(-120)
      const second = await pressed()
      if (second === first) fail(`${name}: swiping left did not move on from "${first}"`)
      await swipe(120)
      if (await pressed() !== first) fail(`${name}: swiping right did not go back to "${first}"`)

      await page.click('#pob .whole')
      if (!await page.$eval('dialog.viewer', d => d.open && !!d.querySelector('img'))) fail(`${name}: "Whole screen" did not open the shot`)
      await page.keyboard.press('Escape')

      const withTip = HIGHLIGHTS.find(h => h.slides.some(s => s.more))
      if (withTip) {
        await page.click(`#${withTip.id} .plates button:nth-child(${withTip.slides.findIndex(s => s.more) + 1})`)
        await page.click(`#${withTip.id} .say-more`)
        const shown = () => page.$eval(`#${withTip.id} .say-card`, c => getComputedStyle(c).display !== 'none')
        if (!await shown()) fail(`${name}: tapping "?" did not open its card`)
        await page.mouse.click(5, 5)
        if (await shown()) fail(`${name}: tapping elsewhere did not close the "?" card`)
      }
    } else if (await page.isVisible('.whole')) {
      fail(`${name}: "Whole screen" shows outside phones`)
    }
    await ctx.close()
    console.log(`${name}: checked`)
  }
  await browser.close()
} finally {
  server.kill()
}
if (failures.length) process.exit(1)
console.log('Landing page OK at phone and desktop sizes')

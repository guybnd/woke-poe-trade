// Screenshots for the landing page (docs/index.md) and the README: the real
// overlay drawn over real game screens. Not part of the normal run; take them
// again after a module's look changes:
//
//   WOKE_LANDING_SHOTS=1 npx playwright test landing-shots
//
// Each shot is written to docs/public/shots/<name>.webp at 1600x900.
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { test, expect, FIXTURES, haveOcr, logFixture } from './harness'
import type { Overlay } from './harness'

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/public/shots')

test.skip(!process.env.WOKE_LANDING_SHOTS, 'Set WOKE_LANDING_SHOTS=1 to take the landing page screenshots')

// The toolkit tools the rail shows, as a player who maps would have them,
// with the names their rail icons carry.
const RAIL: Record<string, string> = {
  'woke-market-tracker': 'Market',
  'woke-farming': 'Farming',
  'woke-map-mods': 'Map mods',
  'woke-essence-scan': 'Essence scan',
  'woke-loot-filter': 'Loot filter',
  'woke-lab': 'Labyrinth',
  'woke-trade': 'Trades'
}

async function bootWithRail (overlay: Overlay, extra: Array<Record<string, unknown>> = [], overlayActive = false) {
  const rail = Object.keys(RAIL).filter(t => !extra.some(e => e.wmType === t))
  await overlay.boot({
    overlayActive,
    widgets: [...rail.map(wmType => ({ wmType, anchor: { pos: 'tl', x: 40, y: 30 }, })), ...extra],
    patch: (config) => {
      const menu = config.widgets.find((w: { wmType: string }) => w.wmType === 'menu')
      menu.pinned = config.widgets.filter((w: { wmType: string }) => w.wmType in RAIL).map((w: { wmId: number }) => w.wmId)
      menu.dismissed = []
    }
  })
}

// The fixture screens hold only the part OCR reads; the page background is
// the whole screenshot it was cut from (fixtures/screens/landing, 1920x1080).
async function showGame (overlay: Overlay, fixture: string, backdrop: string) {
  await overlay.showScreen(fixture)
  const jpg = fs.readFileSync(path.join(FIXTURES, 'screens/landing', backdrop)).toString('base64')
  await overlay.page.evaluate((url) => {
    const root = document.documentElement
    root.style.minHeight = '100vh'
    root.style.background = `#000 url(${url}) center / cover no-repeat`
  }, `data:image/jpeg;base64,${jpg}`)
}

// Saves the page, or a 16:9 part of it to zoom in on, as a 1600x900 webp
// encoded by the page's own canvas.
async function save (overlay: Overlay, name: string, clip?: { x: number, y: number, width?: number, height?: number }) {
  await overlay.page.waitForTimeout(400)
  // Item art from web.poecdn that didn't load (offline) would show as broken.
  await overlay.page.evaluate(() => {
    for (const img of document.images) if (img.complete && !img.naturalWidth) img.style.visibility = 'hidden'
  })
  const png = await overlay.page.screenshot(clip ? { clip: { width: 1440, height: 810, ...clip } } : {})
  const page = await overlay.page.context().newPage()
  const webp = await page.evaluate(async (src) => {
    const img = new Image()
    img.src = src
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 1600
    canvas.height = 900
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/webp', 0.86)
  }, `data:image/png;base64,${png.toString('base64')}`)
  await page.close()
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, `${name}.webp`), Buffer.from(webp.split(',')[1], 'base64'))
}

function cursorOf (screen: string): { x: number, y: number } {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, `screens/${screen}.json`), 'utf8')).cursor
}

test('hero: the overlay open in a map, the rail on the left', async ({ overlay }) => {
  await bootWithRail(overlay, [], true)
  await showGame(overlay, 'screens/essence-real-20.png', 'screenshot-0020.jpg')
  // New tools open themselves once; keep the market tracker, close the rest.
  const rail = overlay.widget('menu')
  for (const name of Object.values(RAIL).filter(n => n !== 'Market')) {
    const icon = rail.getByRole('button', { name, exact: true })
    if (/open/.test(await icon.getAttribute('class') ?? '')) await icon.click()
    await expect(icon).not.toHaveClass(/open/)
  }
  await expect(rail.getByRole('button', { name: 'Market', exact: true })).toHaveClass(/open/)
  await overlay.page.mouse.move(1500, 1000)
  await save(overlay, 'hero')
})

test('story: map scan marks a dangerous map', async ({ overlay }) => {
  test.skip(!haveOcr, 'OCR files missing: npm run get:ocr')
  await bootWithRail(overlay, [{ wmType: 'woke-map-scan' }])
  await showGame(overlay, 'screens/map-real-07.png', 'screenshot-0007.jpg')
  const cursor = cursorOf('map-real-07')
  await overlay.moveMouse(cursor.x, cursor.y)
  await overlay.pressHotkey('Alt + S')
  await expect(overlay.page.locator('[class*="badge"]').first()).toContainText('CARE', { timeout: 20_000 })
  await save(overlay, 'story-maps', { x: 0, y: 120 })
})

test('story: essence scan reads a monolith', async ({ overlay }) => {
  test.skip(!haveOcr, 'OCR files missing: npm run get:ocr')
  await bootWithRail(overlay, [])
  await showGame(overlay, 'screens/essence-real-25.png', 'screenshot-0025.jpg')
  const cursor = cursorOf('essence-real-25')
  await overlay.moveMouse(cursor.x, cursor.y)
  await overlay.pressHotkey('Alt + E')
  await expect(overlay.page.getByText('CORRUPT', { exact: true }).filter({ visible: true })).toBeVisible({ timeout: 20_000 })
  await save(overlay, 'story-essence', { x: 40, y: 0 })
})

test('story: a rare ring priced with its rolls', async ({ overlay }) => {
  await bootWithRail(overlay)
  await showGame(overlay, 'screens/essence-real-17.png', 'screenshot-0017.jpg')
  await overlay.copyItem('items/rare-ring.txt')
  const panel = overlay.widget('price-check')
  await panel.locator('[data-roll-presets]').getByText('Low').click()
  await expect(panel).toContainText('Matched: 42')
  await save(overlay, 'story-price', { x: 240, y: 0 })
})

test('story: the filter rule for the hovered item', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  try {
    fs.copyFileSync(path.join(FIXTURES, 'filters', 'neversink-sample.filter'), path.join(folder, 'NeverSink.filter'))
    await bootWithRail(overlay, [{ wmType: 'woke-loot-filter', wmFlags: ['invisible-on-blur'], sampleHotkey: 'Alt + F', folder, sourceName: 'NeverSink.filter' }])
    await showGame(overlay, 'screens/essence-real-26.png', 'screenshot-0026.jpg')
    await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+F')
    await overlay.copyItem('items/currency-divine.txt', 'Alt + F')
    await expect(overlay.page.getByText('Filter rule for this item')).toBeVisible()
    await save(overlay, 'story-loot', { x: 160, y: 135 })
  } finally {
    fs.rmSync(folder, { recursive: true, force: true })
  }
})

// ---- The tool tour: one stop per tool, each caught at its best moment. ----

// New tools open themselves the first time the overlay opens: close all but `keep`.
async function closeRail (overlay: Overlay, keep?: string) {
  const rail = overlay.widget('menu')
  for (const name of Object.values(RAIL).filter(n => n !== keep)) {
    const icon = rail.getByRole('button', { name, exact: true })
    if (/open/.test(await icon.getAttribute('class') ?? '')) await icon.click()
    await expect(icon).not.toHaveClass(/open/)
  }
}

// The demo's sample prices (boss drops and more) on top of the recorded
// poe.ninja answer, as docs/scripts/build-demo.mjs serves them to the demo.
async function withDemoPrices (overlay: Overlay) {
  const dense = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'http/poe.ninja/poe1/api/economy/current/dense/overviews.json'), 'utf8'))
  const extra = JSON.parse(fs.readFileSync(path.resolve(OUT, '../../scripts/demo-prices.json'), 'utf8'))
  for (const [type, lines] of Object.entries(extra) as Array<[string, Array<Record<string, unknown>>]>) {
    if (type.startsWith('_')) continue
    let ov = [...dense.currencyOverviews, ...dense.itemOverviews].find((o: { type: string }) => o.type === type)
    if (!ov) dense.itemOverviews.push(ov = { type, lines: [] })
    ov.lines.push(...lines.map(l => ({ ...l, graph: [0, 0, 0, 0, 0, 0, 0] })))
  }
  const body = JSON.stringify(dense)
  await overlay.page.route('**/dense/overviews*', (route) => route.fulfill({ contentType: 'application/json', body }))
}

const area = (id: string, level: number, name: string) => [
  `2026/11/05 15:00:36 3725546 1186a8a3 [DEBUG Client 25552] Generating level ${level} area "${id}" with seed 1`,
  `2026/11/05 15:00:37 3727812 cffb065b [INFO Client 25552] : You have entered ${name}.`
]

test('tour: the boss arena icon prices Uber Atziri\'s drops', async ({ overlay }) => {
  await withDemoPrices(overlay)
  await bootWithRail(overlay, [{ wmType: 'woke-boss-runs' }])
  await showGame(overlay, 'screens/essence-real-20.png', 'screenshot-0012.jpg')
  await overlay.log(area('MapAtziri2', 80, 'The Alluring Abyss'))
  await overlay.hoverDockIcon('boss-runs')
  await expect(overlay.dockIcon('boss-runs').getByText("Atziri's Acuity")).toBeVisible()
  await save(overlay, 'tour-boss', { x: 120, y: 0 })
})

test('tour: the campaign chip, and its card on hover', async ({ overlay }) => {
  // The chip carries the values you pin: level and XP penalty, run and act time, the step.
  const pins = ['level', 'run', 'delta', 'step']
  await bootWithRail(overlay, [{ wmType: 'woke-campaign', wmWants: 'show', pins }, { wmType: 'woke-run-timer', wmWants: 'show' }])
  await showGame(overlay, 'screens/essence-real-17.png', 'screenshot-0017.jpg')
  await overlay.replayLog('client-logs/campaign-act1.txt')
  const icon = overlay.dockIcon('campaign')
  await expect(icon).toContainText('Lv 13')
  await overlay.moveMouse(1800, 1000)
  await save(overlay, 'tour-campaign-chip', { x: 640, y: 0, width: 1120, height: 630 })
  await overlay.hoverDockIcon('campaign')
  await expect(icon).toContainText('The Southern Forest')
  await save(overlay, 'tour-campaign', { x: 640, y: 0, width: 1120, height: 630 })
})

test('tour: trade offers waiting in the hideout', async ({ overlay }) => {
  const lines = logFixture('client-logs/trade-hideout.txt')
  await bootWithRail(overlay, [{ wmType: 'woke-trade', stepHotkey: 'F3', busyHotkey: 'F4', ping: false }])
  await showGame(overlay, 'screens/essence-real-17.png', 'screenshot-0010.jpg')
  await overlay.log(lines.slice(0, lines.findIndex(l => l.includes('#Spammer')) + 1))
  await overlay.hoverDockIcon('trade')
  await expect(overlay.dockIcon('trade')).toContainText('xXLeagueStartXx', { timeout: 5000 })
  await save(overlay, 'tour-trade', { x: 120, y: 0 })
})

test('tour: market movers, with the item under the cursor', async ({ overlay }) => {
  const dense = path.join(FIXTURES, 'http/poe.ninja/poe1/api/economy/current/dense/overviews.json')
  const recorded = fs.readFileSync(dense, 'utf8')
  const rows: Array<[string, string, string, number, Array<number | null>]> = [
    ['SkillGem', 'Pact of Lycia', '1', 692, [null, 0, -8.33, 0, 16.17, 8.33, 3838]],
    ['Scarab', 'Incursion Scarab of Champions', '', 8.7, [16.13, -12.75, 7.75, 18.5, -0.67, -50.73, 621.8]],
    ['UniqueArmour', "Foulborn Kitava's Thirst", 'Life Trigger', 166, [0, -14.89, -14.89, -19.15, -36.17, -36.17, 608.1]],
    ['Essence', 'Shrieking Essence of Loathing', '', 80, [0, -59.5, -59.5, -59.5, -67.52, -69.28, 3140]],
    ['SkillGem', 'Increased Critical Strikes Support', '20/20c', 814, [0, -0.99, -24.63, -23.03, -29.06, 23.15, 903.4]],
    ['DivinationCard', 'A Chilling Wind', '', 75, [0, null, 650, null, 250, -80, 650]]
  ]
  const blocks = rows.map(([type, name, variant, chaos, graph]) =>
    `{"type":"${type}","lines":[${JSON.stringify({ name, ...(variant ? { variant } : {}), chaos, graph })}]}`)
  await overlay.page.route('**/dense/overviews*', (route) => route.fulfill({
    contentType: 'application/json',
    body: recorded.replace(/\[\s*\{"type":"/, () => `[${blocks.join(',')},{"type":"`)
  }))
  await bootWithRail(overlay, [{
    wmType: 'woke-market-tracker',
    wmWants: 'show',
    wmFlags: [],
    anchor: { pos: 'tl', x: 4, y: 12 },
    view: 'watchlist',
    period: '24h',
    minChaos: 5,
    typeFilter: '',
    watchlist: rows.map(([type, name, variant]) => ({ type, name, variant }))
  }, { wmType: 'woke-scarab-flip', wmWants: 'show' }], true)
  await closeRail(overlay, 'Market')
  await showGame(overlay, 'screens/essence-real-20.png', 'screenshot-0020.jpg')
  const panel = overlay.widget('woke-market-tracker')
  const scarabs = overlay.widget('woke-scarab-flip')
  await expect(scarabs.getByText(/\d+ scarabs? worth vendoring/)).toBeVisible()
  // Side by side: drag the scarab window off the tracker by its title.
  const title = await scarabs.getByText('Flips', { exact: true }).first().boundingBox()
  if (!title) throw new Error('No scarab flip title to drag')
  await overlay.page.mouse.move(title.x + 10, title.y + title.height / 2)
  await overlay.page.mouse.down()
  await overlay.page.mouse.move(title.x + 560, title.y + title.height / 2, { steps: 12 })
  await overlay.page.mouse.up()
  await expect.poll(async () => (await scarabs.getByText('Flips', { exact: true }).first().boundingBox())?.x ?? 0).toBeGreaterThan(title.x + 400)
  await panel.locator('.w-row', { hasText: 'Pact of Lycia' }).hover()
  await expect(overlay.page.getByRole('tooltip')).toContainText('Pact of Lycia')
  await save(overlay, 'tour-market')
})

test('tour: your Path of Building build in the game', async ({ overlay }) => {
  await bootWithRail(overlay, [{
    wmType: 'woke-pob-builds',
    wmWants: 'show',
    wmFlags: ['invisible-on-blur'],
    anchor: { pos: 'tl', x: 4, y: 12 },
    buildsDir: path.join(FIXTURES, 'pob'),
    pobExe: '',
    pinned: [],
    activeBuild: null,
    followChars: {}
  }], true)
  await closeRail(overlay)
  await showGame(overlay, 'screens/essence-real-26.png', 'screenshot-0026.jpg')
  await overlay.widget('woke-pob-builds').getByText('Showcase', { exact: false }).first().click()
  const detail = overlay.page.locator('[data-w-panel]').filter({ hasText: 'Open in PoB' })
  await detail.getByRole('tab', { name: 'Gear' }).click()
  await overlay.page.mouse.move(1800, 1000)
  await save(overlay, 'tour-pob', { x: 0, y: 0 })
})

test('tour: the regex library copies stash searches', async ({ overlay }) => {
  await bootWithRail(overlay, [{ wmType: 'woke-regex-library', wmWants: 'show', anchor: { pos: 'tl', x: 4, y: 12 } }], true)
  await closeRail(overlay)
  await showGame(overlay, 'screens/map-real-07.png', 'screenshot-0007.jpg')
  await overlay.page.mouse.move(1800, 1000)
  await save(overlay, 'tour-regex', { x: 0, y: 0 })
})

test('tour: map mods, the strings you never want to roll', async ({ overlay }) => {
  await bootWithRail(overlay, [{ wmType: 'woke-map-mods', wmWants: 'show', anchor: { pos: 'tl', x: 4, y: 12 } }], true)
  await closeRail(overlay, 'Map mods')
  await showGame(overlay, 'screens/map-real-07.png', 'screenshot-0007.jpg')
  await overlay.page.mouse.move(1800, 1000)
  await save(overlay, 'tour-map-mods', { x: 0, y: 0 })
})

// The loot filter editor, open from the rail on NeverSink's sample, after a
// rule that hides valuable uniques (so the safety net has something to catch).
async function openFilter (overlay: Overlay, folder: string, hideUniques: boolean) {
  const sample = fs.readFileSync(path.join(FIXTURES, 'filters', 'neversink-sample.filter'), 'utf8')
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), !hideUniques ? sample : [
    'Hide # $type->uniques $tier->hideable',
    '\tRarity Unique',
    '\tBaseType == "Despot Axe" "Sorcerer Boots" "Leather Belt"',
    '',
    sample
  ].join('\r\n'))
  await bootWithRail(overlay, [{ wmType: 'woke-loot-filter', wmFlags: ['invisible-on-blur'], sampleHotkey: 'Alt + F', editorHotkey: 'Alt + Shift + F', folder, sourceName: 'NeverSink.filter' }], true)
  await closeRail(overlay, 'Loot filter')
  const icon = overlay.widget('menu').getByRole('button', { name: 'Loot filter', exact: true })
  if (!/open/.test(await icon.getAttribute('class') ?? '')) await icon.click()
  await showGame(overlay, 'screens/essence-real-26.png', 'screenshot-0026.jpg')
}

for (const [tab, name, ready] of [
  ['Rules', 'tour-filter-rules', /General currency/],
  ['Prices', 'tour-filter-prices', /would move|to move/]
] as const) {
  test(`tour: the loot filter editor, ${tab} tab`, async ({ overlay }) => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
    try {
      await openFilter(overlay, folder, tab === 'Prices')
      await overlay.page.getByRole('tab', { name: new RegExp(`^${tab}`) }).click()
      await expect(overlay.page.getByText(ready).first()).toBeVisible({ timeout: 20_000 })
      await overlay.page.mouse.move(1800, 1000)
      await save(overlay, name, { x: 0, y: 0 })
    } finally {
      fs.rmSync(folder, { recursive: true, force: true })
    }
  })
}

test('tour: boss runs, every boss priced by its drops', async ({ overlay }) => {
  await withDemoPrices(overlay)
  await bootWithRail(overlay, [{ wmType: 'woke-boss-runs', wmWants: 'show', anchor: { pos: 'tl', x: 4, y: 12 } }], true)
  await closeRail(overlay)
  await showGame(overlay, 'screens/essence-real-17.png', 'screenshot-0012.jpg')
  await overlay.log(area('MapAtziri2', 80, 'The Alluring Abyss'))
  const panel = overlay.widget('woke-boss-runs')
  await panel.getByText('Uber Atziri', { exact: true }).first().click()
  // You own the fragments and plan 20 runs: the estimator fills in.
  await panel.getByText('I own the entry items').click()
  await panel.locator('input[type="number"]').first().fill('20')
  await expect(panel.getByText(/rarer than 1 in 20 runs/)).toBeVisible()
  await expect(panel.getByText('Counted as free (you own them).')).toBeVisible()
  await overlay.page.mouse.move(1800, 1000)
  await save(overlay, 'tour-boss-runs', { x: 0, y: 0 })
})

// The README's banner: the name over the hero shot, in the landing page's
// type. Needs the docs' fonts (cd docs && npm install).
test('readme banner', async ({ page }) => {
  const fonts = path.resolve(OUT, '../../node_modules/@fontsource-variable')
  const display = path.join(fonts, 'bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2')
  const body = path.join(fonts, 'geist/files/geist-latin-wght-normal.woff2')
  test.skip(!fs.existsSync(display) || !fs.existsSync(body), 'Docs fonts missing: cd docs && npm install')
  const b64 = (f: string) => fs.readFileSync(f).toString('base64')
  await page.setViewportSize({ width: 1280, height: 400 })
  await page.setContent(`<style>
    @font-face { font-family: D; src: url(data:font/woff2;base64,${b64(display)}) format('woff2'); font-weight: 100 900; }
    @font-face { font-family: B; src: url(data:font/woff2;base64,${b64(body)}) format('woff2'); font-weight: 100 900; }
    body { margin: 0; width: 1280px; height: 400px; overflow: hidden; background: #0d0b09; color: #efe8db; font-family: B, sans-serif; position: relative; }
    .glow { position: absolute; width: 900px; height: 900px; right: -260px; top: -420px; border-radius: 50%; background: radial-gradient(closest-side, rgba(138, 75, 28, 0.6), transparent); }
    .shot { position: absolute; right: -90px; top: 46px; width: 620px; border-radius: 16px; border: 1px solid rgba(212, 166, 74, 0.38); box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6); }
    .copy { position: absolute; left: 64px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; gap: 18px; width: 660px; }
    h1 { margin: 0; font: 800 52px/0.98 D, sans-serif; letter-spacing: -0.045em; }
    h1 span { color: #f0c66e; }
    p { margin: 0; font-size: 20px; color: #bdb3a3; }
  </style>
  <div class="glow"></div>
  <img class="shot" src="data:image/webp;base64,${b64(path.join(OUT, 'hero.webp'))}">
  <div class="copy"><h1>Woke PoE Trade<br><span>Your toolkit, in the game.</span></h1><p>An overlay for Path of Exile 1</p></div>`)
  await page.evaluate(() => document.fonts.ready)
  const png = await page.screenshot()
  const webp = await page.evaluate(async (src) => {
    const img = new Image()
    img.src = src
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    return canvas.toDataURL('image/webp', 0.88)
  }, `data:image/png;base64,${png.toString('base64')}`)
  fs.writeFileSync(path.join(OUT, 'readme-banner.webp'), Buffer.from(webp.split(',')[1], 'base64'))
})

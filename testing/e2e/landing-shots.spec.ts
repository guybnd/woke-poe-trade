// Screenshots for the landing page (docs/index.md) and the README: the real
// overlay drawn over real game screens, for the tools shown as a whole window
// (landing-highlights.spec.ts takes the close-ups). Not part of the normal run; take them
// again after a module's look changes:
//
//   WOKE_LANDING_SHOTS=1 npx playwright test landing-shots
//
// Each shot is written to docs/public/shots/<name>.webp at double resolution, so the page
// can show it at 1280x720 and stay sharp.
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { test, expect, FIXTURES } from './harness'
import type { Overlay } from './harness'

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/public/shots')

test.skip(!process.env.WOKE_LANDING_SHOTS, 'Set WOKE_LANDING_SHOTS=1 to take the landing page screenshots')
test.use({ deviceScaleFactor: 2 })

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

// Saves the page, or a 16:9 part of it to zoom in on, as a webp
// encoded by the page's own canvas.
async function save (overlay: Overlay, name: string, clip?: { x: number, y: number, width?: number, height?: number }) {
  // Tests sharing the machine can trip the app's port notice: not for the picture.
  const notice = overlay.page.getByRole('button', { name: 'Dismiss' })
  if (await notice.count()) await notice.first().click()
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
    const scale = Math.min(1, 2560 / img.naturalWidth)
    canvas.width = img.naturalWidth * scale
    canvas.height = img.naturalHeight * scale
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/webp', 0.86)
  }, `data:image/png;base64,${png.toString('base64')}`)
  await page.close()
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, `${name}.webp`), Buffer.from(webp.split(',')[1], 'base64'))
}

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
  await showGame(overlay, 'screens/essence-real-20.png', '../frames/town.jpg')
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
  await showGame(overlay, 'screens/essence-real-26.png', '../frames/town.jpg')
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
  // You own the fragments and plan 20 runs: the estimator fills in.
  await bootWithRail(overlay, [{
    wmType: 'woke-boss-runs',
    wmTitle: 'Boss runs',
    wmWants: 'show',
    wmFlags: ['invisible-on-blur'],
    anchor: { pos: 'tl', x: 4, y: 12 },
    sort: 'hour',
    tier: 'all',
    runSeconds: {},
    rates: {},
    extraDrops: {},
    kills: {},
    ownEntry: true,
    plannedRuns: 20,
    dropToggles: {},
    priceModes: {},
    customPrices: {}
  }], true)
  await closeRail(overlay)
  await showGame(overlay, 'screens/essence-real-17.png', '../frames/town.jpg')
  await overlay.log(area('MapAtziri2', 80, 'The Alluring Abyss'))
  const panel = overlay.widget('woke-boss-runs')
  await panel.getByText('Uber Atziri', { exact: true }).first().click()
  await expect(panel.getByText(/rarer than 1 in 20 runs/)).toBeVisible()
  await expect(panel.getByText('Counted as free (you own them).')).toBeVisible()
  await overlay.page.mouse.move(1800, 1000)
  await save(overlay, 'tour-boss-runs', { x: 0, y: 0 })
})

// The README's banner: the name over the hero shot, in the game's type.
test('readme banner', async ({ page }) => {
  const fonts = path.resolve(OUT, '../../../renderer/src/assets/font')
  const b64 = (f: string) => fs.readFileSync(f).toString('base64')
  await page.setViewportSize({ width: 1280, height: 400 })
  await page.setContent(`<style>
    @font-face { font-family: C; src: url(data:font/ttf;base64,${b64(path.join(fonts, 'Fontin-SmallCaps-Hinted.ttf'))}); }
    @font-face { font-family: I; src: url(data:font/ttf;base64,${b64(path.join(fonts, 'Fontin-Italic-Hinted.ttf'))}); }
    body { margin: 0; width: 1280px; height: 400px; overflow: hidden; background: #070605; position: relative; }
    .shot { position: absolute; left: 0; top: -160px; width: 1280px; opacity: 0.42; }
    .copy { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; text-shadow: 0 2px 18px #000; }
    h1 { margin: 0; font: 88px/1 C, serif; color: #e0c78f; }
    p { margin: 0; font: 28px I, serif; color: #e8dcc2; }
  </style>
  <img class="shot" src="data:image/webp;base64,${b64(path.join(OUT, 'tour-market.webp'))}">
  <div class="copy"><h1>Woke PoE Trade</h1><p>Your toolkit, in the game.</p></div>`)
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

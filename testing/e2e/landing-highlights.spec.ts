// Screenshots for the landing page's highlights: the real overlay over real
// game screens, cropped close enough to read. Not part of the normal run:
//
//   WOKE_LANDING_SHOTS=1 npx playwright test landing-highlights
//
// Each shot is written to docs/public/shots/<name>.webp at 1600x900.
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import type { Locator, Page } from '@playwright/test'
import { test, expect, FIXTURES, logFixture } from './harness'
import type { Overlay } from './harness'

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/public/shots')
const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }

test.skip(!process.env.WOKE_LANDING_SHOTS, 'Set WOKE_LANDING_SHOTS=1 to take the landing page screenshots')

async function backdrop (overlay: Overlay, file: string) {
  const data = fs.readFileSync(path.join(FIXTURES, 'screens', file)).toString('base64')
  const type = file.endsWith('.png') ? 'image/png' : 'image/jpeg'
  await overlay.page.evaluate((url) => {
    const root = document.documentElement
    root.style.minHeight = '100vh'
    root.style.background = `#000 url(${url}) center / cover no-repeat`
  }, `data:${type};base64,${data}`)
}

// A 16:9 window of the 1920x1080 page around these elements, as large as they
// need and no smaller than `min`, kept on the page. Saved at 1600x900.
async function saveAround (overlay: Overlay, name: string, around: Locator[], min = 1120) {
  const { page } = overlay
  await page.waitForTimeout(500)
  await page.evaluate(() => {
    for (const img of document.images) if (img.complete && !img.naturalWidth) img.style.visibility = 'hidden'
  })
  const boxes = (await Promise.all(around.map(l => l.first().boundingBox()))).filter(b => b != null)
  if (!boxes.length) throw new Error(`Nothing to crop around for ${name}`)
  const left = Math.min(...boxes.map(b => b.x))
  const top = Math.min(...boxes.map(b => b.y))
  const right = Math.max(...boxes.map(b => b.x + b.width))
  const bottom = Math.max(...boxes.map(b => b.y + b.height))
  const pad = 36
  const width = Math.min(1920, Math.max(min, right - left + pad * 2, (bottom - top + pad * 2) * 16 / 9))
  const height = width * 9 / 16
  const x = Math.max(0, Math.min(1920 - width, (left + right) / 2 - width / 2))
  const y = Math.max(0, Math.min(1080 - height, (top + bottom) / 2 - height / 2))
  await writeWebp(page, name, await page.screenshot({ clip: { x, y, width, height } }))
}

async function writeWebp (from: Page, name: string, png: Buffer) {
  const page = await from.context().newPage()
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
    return canvas.toDataURL('image/webp', 0.88)
  }, `data:image/png;base64,${png.toString('base64')}`)
  await page.close()
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, `${name}.webp`), Buffer.from(webp.split(',')[1], 'base64'))
}

// The stash fixture is black beside the stash: draw its left part over a game frame.
async function stashOverGame (overlay: Overlay) {
  const b64 = (f: string) => fs.readFileSync(path.join(FIXTURES, 'screens', f)).toString('base64')
  await overlay.page.evaluate(async ([stash, game]) => {
    const load = async (src: string) => { const i = new Image(); i.src = src; await i.decode(); return i }
    const [s, g] = await Promise.all([load(stash), load(game)])
    const c = document.createElement('canvas')
    c.width = s.width
    c.height = s.height
    const ctx = c.getContext('2d')!
    ctx.drawImage(g, 0, 0, c.width, c.height)
    const edge = Math.round(s.width * 0.34)
    ctx.drawImage(s, 0, 0, edge, s.height, 0, 0, edge, s.height)
    const root = document.documentElement
    root.style.minHeight = '100vh'
    root.style.background = `#000 url(${c.toDataURL('image/jpeg', 0.92)}) center / cover no-repeat`
  }, [`data:image/png;base64,${b64('stash-scarab-real.png')}`, `data:image/jpeg;base64,${b64('landing/screenshot-0020.jpg')}`])
}

const area = (id: string, level = 83) => `2026/11/05 20:49:09 18884906 1186a8a3 [DEBUG Client 34092] Generating level ${level} area "${id}" with seed 1`

// ---- 1. Price check ----

// amount, energy shield, life, fire res, cold res, chaos res
const LISTINGS: Array<[number, number, number, number, number, number]> = [
  [30, 1192, 112, 33, 31, 33],
  [32, 1210, 120, 34, 34, 31],
  [33, 1231, 125, 35, 35, 28],
  [40, 1189, 118, 31, 34, 35],
  [40, 1226, 129, 35, 31, 31],
  [45, 1244, 131, 37, 36, 29],
  [50, 1251, 127, 38, 33, 34],
  [58, 1268, 134, 36, 38, 36]
]

async function statListings (page: Page) {
  await page.route('**/api/trade/search/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({ id: 'q', total: 42, result: LISTINGS.map((_, i) => `r${i}`) })
  }))
  await page.route('**/api/trade/fetch/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({
      result: route.request().url().split('/fetch/')[1].split('?')[0].split(',').map(id => {
        const [amount, es, life, fire, cold, chaos] = LISTINGS[Number(id.slice(1))]
        return {
          id,
          item: {
            ilvl: 86,
            frameType: 2,
            name: 'Listed',
            typeLine: 'Twilight Regalia',
            properties: [{ name: 'Energy Shield', values: [[String(es), 1]], type: 18 }],
            extended: { es },
            explicitMods: [
              { description: `+${life} to maximum Life`, domain: 'explicit' },
              { description: `+${fire}% to Fire Resistance`, domain: 'explicit' },
              { description: `+${cold}% to Cold Resistance`, domain: 'explicit' },
              { description: `+${chaos}% to Chaos Resistance`, domain: 'explicit' }
            ]
          },
          listing: {
            indexed: new Date().toISOString(),
            fee: 1,
            price: { amount, currency: 'chaos' },
            account: { name: `seller${id}`, lastCharacterName: `char${id}` }
          }
        }
      })
    })
  }))
}

const TIER_ITEMS: unknown[] = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'trade/listing-tiers.json'), 'utf8'))

async function tierListings (page: Page) {
  await page.route('**/api/trade/search/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({ id: 'q', total: TIER_ITEMS.length, result: TIER_ITEMS.map((_, i) => `r${i}`) })
  }))
  await page.route('**/api/trade/fetch/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({
      result: TIER_ITEMS.map((item, i) => ({
        id: `r${i}`,
        item,
        listing: {
          indexed: new Date().toISOString(),
          fee: 1,
          price: { amount: 30 + i, currency: 'chaos' },
          account: { name: `seller${i}`, lastCharacterName: `char${i}` }
        }
      }))
    })
  }))
}

test('price check: competing listings, each stat against yours', async ({ overlay }) => {
  await statListings(overlay.page)
  await overlay.boot()
  await backdrop(overlay, 'landing/screenshot-0017.jpg')
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  await panel.getByRole('button', { name: 'Search' }).click()
  await expect(panel.locator('tr.w-pc-yours')).toContainText('Yours')
  await expect(panel.locator('tbody')).toContainText('1268', { timeout: 15_000 })
  await overlay.page.mouse.move(100, 1000)
  await saveAround(overlay, 'hl-price-columns', [panel.locator('.w-pc-table'), panel.getByText('Body Armour')], 1240)
})

test('price check: a listing\'s tooltip, tiers and rolls', async ({ overlay }) => {
  await tierListings(overlay.page)
  await overlay.boot()
  await backdrop(overlay, 'landing/screenshot-0017.jpg')
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  await panel.getByRole('button', { name: 'Search' }).click()
  await expect(panel.locator('.w-pc-foot')).toBeVisible()
  await panel.locator('.w-pc-table tbody tr').nth(2).hover()
  const tip = overlay.page.getByRole('tooltip')
  await expect(tip).toContainText('Rage Guardian')
  await saveAround(overlay, 'hl-price-tooltip', [panel.locator('.w-pc-table'), tip], 1240)
})

// ---- 2. Loot filter ----

const lootFilter = (folder: string) => ({ wmType: 'woke-loot-filter', wmFlags: ['invisible-on-blur'], sampleHotkey: 'Alt + F', editorHotkey: 'Alt + Shift + F', folder, sourceName: 'NeverSink.filter' })

test('filter: Alt+F from the item to its rule', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  try {
    fs.copyFileSync(path.join(FIXTURES, 'filters', 'neversink-sample.filter'), path.join(folder, 'NeverSink.filter'))
    await overlay.boot({ widgets: [lootFilter(folder)] })
    await backdrop(overlay, 'landing/screenshot-0026.jpg')
    await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+F')
    await overlay.copyItem('items/currency-divine.txt', 'Alt + F')
    const card = overlay.page.getByText('Filter rule for this item')
    await expect(card).toBeVisible()
    await saveAround(overlay, 'hl-filter-item', [overlay.page.locator('[data-w-panel]').filter({ has: card })], 1120)
  } finally {
    fs.rmSync(folder, { recursive: true, force: true })
  }
})

// ---- 3. PoB ----

async function openBuild (overlay: Overlay) {
  await overlay.boot({
    overlayActive: true,
    widgets: [{
      wmType: 'woke-pob-builds',
      wmWants: 'show',
      wmFlags: ['invisible-on-blur'],
      anchor: { pos: 'tl', x: 4, y: 12 },
      buildsDir: path.join(FIXTURES, 'pob'),
      pobExe: '',
      pinned: [],
      activeBuild: null,
      followChars: {}
    }]
  })
  await backdrop(overlay, 'landing/screenshot-0026.jpg')
  await overlay.widget('woke-pob-builds').getByText('Showcase', { exact: false }).first().click()
  const detail = overlay.page.locator('[data-w-panel]').filter({ hasText: 'Open in PoB' })
  await expect(detail.getByRole('tab', { name: 'Gear' })).toBeVisible()
  return detail
}

test('pob: gear with an item tooltip, and the build\'s links', async ({ overlay }) => {
  const detail = await openBuild(overlay)
  await detail.getByRole('tab', { name: 'Gear' }).click()
  const row = detail.locator('[class*="gearRow"]').first()
  await row.hover()
  const tip = overlay.page.getByRole('tooltip')
  await expect(tip).toBeVisible()
  await saveAround(overlay, 'hl-pob-gear', [detail, tip], 1280)
})

test('pob: gems by level', async ({ overlay }) => {
  const detail = await openBuild(overlay)
  await overlay.page.mouse.move(1800, 1000)
  await saveAround(overlay, 'hl-pob-levelling', [detail], 1280)
})

// ---- 4. Market ----

test('market: the flips window', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-scarab-flip', wmWants: 'show', anchor: { pos: 'tl', x: 8, y: 8 } } as never] })
  await backdrop(overlay, 'landing/screenshot-0020.jpg')
  const panel = overlay.widget('woke-scarab-flip')
  await expect(panel.getByText(/\d+ scarabs? worth vendoring/)).toBeVisible()
  await overlay.page.mouse.move(1800, 1000)
  await saveAround(overlay, 'hl-flips', [panel], 1280)
})

test('market: scarabs to buy, outlined in your stash', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-scarab-flip', stashHotkey: 'Alt + J' } as never] })
  await overlay.showScreen('screens/stash-scarab-real.png')
  await stashOverGame(overlay)
  await overlay.pressHotkey('Alt + J')
  const layer = overlay.page.locator('[data-stash-outlines]')
  await expect(layer).toBeVisible()
  await overlay.page.mouse.move(1800, 1000)
  await overlay.page.waitForTimeout(500)
  await writeWebp(overlay.page, 'hl-stash-outlines', await overlay.page.screenshot({ clip: { x: 0, y: 40, width: 1440, height: 810 } }))
})

// ---- 5. On screen ----

// The icon row low on the screen, over the calmest frame there is, a little
// darker still so the card is what you read.
const lowDock = (config: { woke?: Record<string, unknown> }) => {
  config.woke = { ...config.woke, dock: { x: 20, y: 80, vertical: false, noPeek: [], hidden: [], dismissed: {} } }
}

async function calmFrame (overlay: Overlay) {
  const jpg = fs.readFileSync(path.join(FIXTURES, 'screens/landing/screenshot-0010.jpg')).toString('base64')
  await overlay.page.evaluate((url) => {
    const root = document.documentElement
    root.style.minHeight = '100vh'
    root.style.background = `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), #000 url(${url}) center / cover no-repeat`
  }, `data:image/jpeg;base64,${jpg}`)
}

async function saveLow (overlay: Overlay, name: string) {
  await overlay.page.waitForTimeout(500)
  await writeWebp(overlay.page, name, await overlay.page.screenshot({ clip: { x: 0, y: 135, width: 1360, height: 765 } }))
}

test('on screen: trade offers waiting', async ({ overlay }) => {
  const lines = logFixture('client-logs/trade-hideout.txt')
  await overlay.boot({ patch: lowDock, widgets: [{ wmType: 'woke-trade', stepHotkey: 'F3', busyHotkey: 'F4', ping: false }] })
  await calmFrame(overlay)
  await overlay.log(lines.slice(0, lines.findIndex(l => l.includes('#Spammer')) + 1))
  await overlay.hoverDockIcon('trade')
  await expect(overlay.dockIcon('trade')).toContainText('xXLeagueStartXx', { timeout: 5000 })
  await saveLow(overlay, 'hl-trade')
})

test('on screen: the Expedition card knows who is here', async ({ overlay }) => {
  const FLAT = [0, 0, 0, 0, 0, 0]
  const recorded = fs.readFileSync(path.join(FIXTURES, 'http/poe.ninja/poe1/api/economy/current/dense/overviews.json'), 'utf8')
  const artifacts = JSON.stringify({
    type: 'Artifact',
    lines: [
      { name: 'Burial Medallion', chaos: 1, graph: [...FLAT, -64.49] },
      { name: 'Astragali', chaos: 0.07292, graph: [...FLAT, 31.25] },
      { name: 'Exotic Coinage', chaos: 7.2, graph: [...FLAT, 78.85] },
      { name: 'Scrap Metal', chaos: 2.94, graph: [...FLAT, 1018] }
    ]
  })
  await overlay.page.route('**/dense/overviews*', (route) => route.fulfill({
    contentType: 'application/json',
    body: recorded.replace(/\[\s*\{"type":"/, () => `[${artifacts},{"type":"`)
  }))
  await overlay.boot({ patch: lowDock, widgets: [{ wmType: 'woke-mechanics' }] })
  await calmFrame(overlay)
  await overlay.log([area('ExpeditionBattlegroundGraves'), '2026/11/05 20:49:11 18887484 cffb065b [INFO Client 34092] Tujen, the Haggler: Oi! Over here!'])
  await expect(overlay.dockIcon('mechanics')).toBeVisible({ timeout: 20_000 })
  await expect(async () => {
    await overlay.hoverDockIcon('mechanics')
    await expect(overlay.page.getByText('Tujen is here')).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 20_000 })
  await saveLow(overlay, 'hl-expedition')
})

test('on screen: the campaign chip and its card', async ({ overlay }) => {
  const pins = ['level', 'run', 'delta', 'step']
  await overlay.boot({ patch: lowDock, widgets: [{ wmType: 'woke-campaign', wmWants: 'show', pins }, { wmType: 'woke-run-timer', wmWants: 'show' }] })
  await calmFrame(overlay)
  await overlay.replayLog('client-logs/campaign-act1.txt')
  const icon = overlay.dockIcon('campaign')
  await expect(icon).toContainText('Lv 13')
  await overlay.hoverDockIcon('campaign')
  await expect(icon).toContainText('The Southern Forest')
  await saveLow(overlay, 'hl-campaign')
})

test('on screen: today\'s lab stays one hover away', async ({ overlay }) => {
  const IMG = 'https://www.poelab.com/wp-content/labfiles/normal.jpg'
  const layout = fs.readFileSync(path.join(FIXTURES, 'lab-layout.jpg'))
  await overlay.page.route(IMG, route => route.fulfill({ contentType: 'image/jpeg', body: layout }))
  const LAB = { wmType: 'woke-lab', wmTitle: 'Labyrinth', wmWants: 'show' as const, wmFlags: ['invisible-on-blur'], anchor: { pos: 'tl', x: 10, y: 10 }, urls: { normal: '', cruel: '', merciless: '', uber: '' }, defaultDifficulty: 'normal', hotkeyOverlay: 'Ctrl + Alt + L', hotkeyExternal: null, notes: '' }
  await overlay.boot({ patch: lowDock, overlayActive: true, widgets: [LAB] })
  await calmFrame(overlay)
  await overlay.widget('woke-lab').getByText('Normal', { exact: true }).click()
  await overlay.page.locator('webview').evaluate((el, src) => {
    (el as unknown as { executeJavaScript: () => Promise<string> }).executeJavaScript = async () => src
    el.dispatchEvent(new Event('did-stop-loading'))
  }, IMG)
  await expect(overlay.widget('woke-lab').getByText('Normal Labyrinth')).toBeVisible()
  overlay.app.focusGame(true)
  await expect(overlay.dockIcon('lab')).toContainText('N')
  const map = overlay.page.locator(`[data-dock="lab"] img[src="${IMG}"]`)
  await expect(async () => {
    await overlay.hoverDockIcon('lab')
    await expect(map).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 20_000 })
  await saveLow(overlay, 'hl-lab')
})

test('on screen: challenges, your count and what is next', async ({ overlay }) => {
  await overlay.boot({
    patch: lowDock,
    widgets: [{
      wmType: 'woke-challenges',
      wmTitle: 'Challenges',
      wmFlags: ['invisible-on-blur'],
      anchor: { pos: 'tl', x: 10, y: 10 },
      dockIcon: true,
      hotkey: null,
      url: '',
      lastSynced: Date.now(),
      summary: { done: 23, total: 40, next: [{ n: 24, name: 'Stacked Scarabs' }, { n: 25, name: 'Corrupted Crystals' }, { n: 26, name: 'Cross Contamination' }] }
    } as never]
  })
  await calmFrame(overlay)
  await expect(overlay.dockIcon('challenges')).toBeVisible({ timeout: 20_000 })
  await overlay.hoverDockIcon('challenges')
  await saveLow(overlay, 'hl-challenges')
})

// ---- 6. Lab gems and regex ----

test('market: Divine Font gem values', async ({ overlay }) => {
  // The recording has too few gems to price a font: today's live prices.
  const live = await fetch('https://poe.ninja/poe1/api/economy/current/dense/overviews?league=Allflame')
  if (!live.ok) throw new Error(`poe.ninja answered ${live.status}`)
  const body = await live.text()
  await overlay.page.route('**/dense/overviews*', (route) => route.fulfill({ contentType: 'application/json', body }))
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-lab-gems', wmTitle: 'Lab gems', wmFlags: ['uninitialized'], anchor: { pos: 'tl', x: 40, y: 30 } }] })
  await backdrop(overlay, 'landing/screenshot-0017.jpg')
  const w = overlay.widget('woke-lab-gems')
  await expect(w.getByText('Red pool').locator('..')).not.toContainText('EV 0 c', { timeout: 15_000 })
  await overlay.page.mouse.move(1800, 1000)
  await saveAround(overlay, 'hl-lab-gems', [w.locator('[data-w-panel]')], 1120)
})

test('regex: the maker writes the stash search', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-map-mods', wmWants: 'show', anchor: { pos: 'tl', x: 4, y: 12 } }] })
  await backdrop(overlay, 'landing/screenshot-0007.jpg')
  await overlay.page.mouse.move(1800, 1000)
  await saveAround(overlay, 'hl-regex-maker', [overlay.widget('woke-map-mods').locator('[data-w-panel]')], 1280)
})

test('regex: the clipboard of saved searches', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-regex-library', wmWants: 'show', anchor: { pos: 'tl', x: 4, y: 12 } }] })
  await backdrop(overlay, 'landing/screenshot-0020.jpg')
  const panel = overlay.page.locator('[data-w-panel]').filter({ hasText: 'Regex library' }).last()
  await expect(panel).toBeVisible()
  await overlay.page.mouse.move(1800, 1000)
  await saveAround(overlay, 'hl-regex-clipboard', [panel], 1120)
})

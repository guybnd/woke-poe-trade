// Screenshots for the landing page's highlights: the real overlay over real
// game screens, cropped close enough to read. Not part of the normal run:
//
//   WOKE_LANDING_SHOTS=1 npx playwright test landing-highlights
//
// Each shot is written to docs/public/shots/<name>.webp at 1600x900.
import fs from 'fs'
import os from 'os'
import path from 'path'
import zlib from 'zlib'
import { fileURLToPath } from 'url'
import type { Locator, Page } from '@playwright/test'
import { test, expect, FIXTURES, logFixture } from './harness'
import type { Overlay } from './harness'

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/public/shots')
const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }

test.skip(!process.env.WOKE_LANDING_SHOTS, 'Set WOKE_LANDING_SHOTS=1 to take the landing page screenshots')

async function backdrop (overlay: Overlay, file: string, place = 'center / cover') {
  const data = fs.readFileSync(path.join(FIXTURES, 'screens', file)).toString('base64')
  const type = file.endsWith('.png') ? 'image/png' : 'image/jpeg'
  await overlay.page.evaluate(([url, place]) => {
    const root = document.documentElement
    root.style.minHeight = '100vh'
    root.style.background = `#000 url(${url}) ${place} no-repeat`
  }, [`data:${type};base64,${data}`, place])
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
  await backdrop(overlay, 'frames/town-inventory.jpg')
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
  await backdrop(overlay, 'frames/town-inventory.jpg')
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  await panel.getByRole('button', { name: 'Search' }).click()
  await expect(panel.locator('.w-pc-foot')).toBeVisible()
  await panel.locator('.w-pc-table tbody tr').nth(2).hover()
  const tip = overlay.page.getByRole('tooltip')
  await expect(tip).toContainText('Rage Guardian')
  await saveAround(overlay, 'hl-price-tooltip', [panel.locator('.w-pc-table'), tip], 1240)
  // Shift + scroll over the listing swaps the ranges for a bar on each roll.
  await overlay.page.keyboard.down('Shift')
  try {
    await overlay.page.mouse.wheel(0, 100)
    await expect(tip.locator('[class*="bar"]').first()).toBeVisible()
    await saveAround(overlay, 'hl-price-bars', [panel.locator('.w-pc-table'), tip], 1240)
  } finally {
    await overlay.page.keyboard.up('Shift')
  }
})

// ---- 2. Loot filter ----

const BOOTS = ['Item Class: Boots', 'Rarity: Rare', 'Sol League', 'Wyvernscale Boots', '--------', 'Armour: 80', 'Evasion Rating: 80', '--------', 'Requirements:', 'Level: 62', '--------', 'Item Level: 83', '--------', '+40 to maximum Life'].join('\n')

const lootFilter = (folder: string) => ({ wmType: 'woke-loot-filter', wmFlags: ['invisible-on-blur'], sampleHotkey: 'Alt + F', editorHotkey: 'Alt + Shift + F', folder, sourceName: 'NeverSink.filter' })

test('filter: Alt+F from the item to its rule', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  try {
    fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters', 'neversink', '1-REGULAR.filter.gz'))))
    await overlay.boot({ widgets: [lootFilter(folder)] })
    // Zoomed and moved so the card doesn't cover the label on the ground.
    await backdrop(overlay, 'frames/item-on-ground.jpg', '-540px -140px / 125%')
    await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+F')
    await overlay.copyItem(BOOTS, 'Alt + F')
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
  await backdrop(overlay, 'frames/town.jpg')
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

const showcaseInUse = () => [{
  wmType: 'woke-pob-builds',
  wmWants: 'hide' as const,
  wmFlags: ['invisible-on-blur'],
  anchor: { pos: 'tl', x: 4, y: 12 },
  buildsDir: path.join(FIXTURES, 'pob'),
  pobExe: '',
  pinned: [],
  activeBuild: 'Showcase.xml',
  followChars: {},
  loadouts: {}
}]

test('pob: a checked item against the one your build wears', async ({ overlay }) => {
  await overlay.boot({ widgets: showcaseInUse() })
  await backdrop(overlay, 'frames/town-inventory.jpg')
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  const chip = panel.locator('[data-swap-chip]')
  await expect(chip).toContainText('Compare to your body armour')
  await chip.hover()
  const tip = overlay.page.getByRole('tooltip')
  await expect(tip).toContainText('Against your body armour')
  await saveAround(overlay, 'hl-pob-swap', [panel.getByText('Body Armour'), panel.getByRole('button', { name: 'Search' }), tip], 1000)
})

test('pob: the build in use, on one small icon', async ({ overlay }) => {
  await overlay.boot({ patch: lowDock, widgets: [{ ...showcaseInUse()[0], activeBuild: 'Loadouts.xml' }] })
  await backdrop(overlay, 'frames/hideout.jpg')
  await overlay.replayLog('client-logs/campaign-act1.txt')
  await overlay.hoverDockIcon('pob-builds')
  await expect(overlay.page.getByText('Your links')).toBeVisible()
  await saveLow(overlay, 'hl-pob-hover')
})

test('pob: what each stage costs', async ({ overlay }) => {
  // The recording's unique rows have no variant; the live feed's name the base.
  const recorded = fs.readFileSync(path.join(FIXTURES, 'http/poe.ninja/poe1/api/economy/current/dense/overviews.json'), 'utf8')
    .replace('"name":"Kaom\'s Heart",', '"name":"Kaom\'s Heart","variant":"Glorious Plate",')
    .replace('"name":"Kingmaker",', '"name":"Kingmaker","variant":"Despot Axe",')
    .replace('"name":"Headhunter",', '"name":"Headhunter","variant":"Leather Belt",')
  await overlay.page.route('**/dense/overviews*', (route) => route.fulfill({ contentType: 'application/json', body: recorded }))
  const dir = grownBuildsDir()
  try {
    const detail = await openLevellingBuild(overlay, dir)
    await detail.getByRole('tab', { name: 'Gear' }).click()
    await expect(detail.getByText('Cost of each stage')).toBeVisible()
    const stage = detail.locator('button[class*="stage"]').filter({ hasText: 'Day 1.5 Clusters' })
    await expect(stage).not.toContainText('unpriced', { timeout: 15_000 })
    await stage.click()
    await expect(detail.getByText('Headhunter')).toBeVisible()
    await overlay.page.mouse.move(1800, 1000)
    await saveAround(overlay, 'hl-pob-costs', [detail], 1280)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('pob: two builds side by side', async ({ overlay }) => {
  const dir = grownBuildsDir()
  try {
    await overlay.boot({ overlayActive: true, widgets: [{ ...showcaseInUse()[0], wmWants: 'show' as const, buildsDir: dir }] })
    await backdrop(overlay, 'frames/town.jpg')
    const list = overlay.widget('woke-pob-builds')
    const detail = overlay.page.locator('[data-w-panel]').filter({ hasText: 'Open in PoB' })
    await expect(detail).toContainText('Showcase')
    await list.getByRole('button', { name: /Loadouts/ }).first().click({ button: 'right' })
    await overlay.page.getByText('Compare with Showcase').click()
    const panel = overlay.page.locator('[data-w-panel]').filter({ hasText: 'Compare builds' })
    await expect(panel).toContainText('Gear ·')
    // Only the comparison in the picture, not the panel it opened beside.
    await detail.evaluate(el => { el.style.visibility = 'hidden' })
    await overlay.page.mouse.move(1800, 1000)
    await saveAround(overlay, 'hl-pob-compare', [panel], 1120)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

// The Loadouts fixture allocates four points, too few to see on a whole tree.
// The same build with real paths from the Witch start, walked over the tree
// data: the next set adds a path to one more notable and respecs two points.
function grownBuildsDir () {
  type Node = [number, number, number, string, string, string[], number[]]
  const nodes: Node[] = JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../renderer/public/data/tree/passive-tree.json'), 'utf8'))
  const walkable = new Set(nodes.filter(n => n[3] !== 'asc' && n[3] !== 'mastery').map(n => n[0]))
  const links = new Map<number, number[]>()
  for (const [id, , , , , , out] of nodes) {
    for (const to of out) {
      if (!walkable.has(id) || !walkable.has(to)) continue
      links.set(id, [...links.get(id) ?? [], to])
      links.set(to, [...links.get(to) ?? [], id])
    }
  }
  const WITCH = 54447
  const from = new Map<number, number>([[WITCH, WITCH]])
  const dist = new Map<number, number>([[WITCH, 0]])
  for (const queue = [WITCH]; queue.length;) {
    const at = queue.shift()!
    for (const to of links.get(at) ?? []) {
      if (from.has(to)) continue
      from.set(to, at)
      dist.set(to, dist.get(at)! + 1)
      queue.push(to)
    }
  }
  const pathTo = (id: number) => {
    const out: number[] = []
    for (let at = id; at !== WITCH; at = from.get(at)!) out.push(at)
    return out
  }
  const notables = nodes.filter(n => n[3] === 'notable' && (dist.get(n[0]) ?? 99) >= 6 && dist.get(n[0])! <= 16).sort((a, b) => a[4].localeCompare(b[4]))
  const picks = Array.from({ length: 9 }, (_, i) => notables[Math.floor((i + 0.5) * notables.length / 9)][0])
  const first = new Set(picks.slice(0, 8).flatMap(pathTo))
  const next = new Set([...first, ...pathTo(picks[8])])
  const leaves = [...pathTo(picks[7])].filter(id => !picks.slice(0, 7).flatMap(pathTo).includes(id) && !pathTo(picks[8]).includes(id)).slice(0, 2)
  for (const id of leaves) next.delete(id)
  // Uniques the recorded poe.ninja feed has prices for, so stages cost something.
  const unique = (id: number, name: string, base: string) => `<Item id="${id}">\nRarity: UNIQUE\n${name}\n${base}\nImplicits: 0\n</Item>`
  const gear = [
    '<Items activeItemSet="1">',
    unique(3, 'Kaom\'s Heart', 'Glorious Plate'),
    unique(4, 'Kingmaker', 'Despot Axe'),
    unique(5, 'Headhunter', 'Leather Belt'),
    '<Item id="1">\nRarity: RARE\nEarly Loop\nIron Ring\nImplicits: 0\n</Item>',
    '<ItemSet id="1" title="Day 1 No Cluster"><Slot name="Body Armour" itemId="3"/><Slot name="Ring 1" itemId="1"/></ItemSet>',
    '<ItemSet id="2" title="Day 1.5 Clusters"><Slot name="Body Armour" itemId="3"/><Slot name="Weapon 1" itemId="4"/><Slot name="Belt" itemId="5"/><Slot name="Ring 1" itemId="1"/></ItemSet>',
    '</Items>'
  ].join('\n')
  const xml = fs.readFileSync(path.join(FIXTURES, 'pob/Loadouts.xml'), 'utf8')
    .replace('nodes="94,127,223,33435"', `nodes="${[...next].join(',')}"`)
    .replace('nodes="94,127,223"', `nodes="${[...first].join(',')}"`)
    .replace(/<Items[\s\S]*<\/Items>/, () => gear)
  // A second build for comparing, with a tree that shares only the first paths.
  const other = new Set([...picks.slice(0, 3), notables[Math.floor(notables.length / 18)][0], notables[Math.floor(notables.length / 3)][0]].flatMap(pathTo))
  const showcase = fs.readFileSync(path.join(FIXTURES, 'pob/Showcase.xml'), 'utf8')
    .replace('<Spec title="Endgame">', `<Spec title="Endgame" nodes="${[...other].join(',')}">`)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-landing-pob-'))
  fs.writeFileSync(path.join(dir, 'Loadouts.xml'), xml)
  fs.writeFileSync(path.join(dir, 'Showcase.xml'), showcase)
  return dir
}

async function openLevellingBuild (overlay: Overlay, buildsDir = path.join(FIXTURES, 'pob')) {
  await overlay.boot({
    overlayActive: true,
    widgets: [
      {
        wmType: 'woke-pob-builds',
        wmWants: 'show',
        wmFlags: ['invisible-on-blur'],
        anchor: { pos: 'tl', x: 4, y: 12 },
        buildsDir,
        pobExe: '',
        pinned: [],
        activeBuild: 'Loadouts.xml',
        followChars: {},
        loadouts: {}
      },
      { wmType: 'woke-campaign', wmWants: 'show' }
    ]
  })
  await backdrop(overlay, 'frames/town.jpg')
  await overlay.replayLog('client-logs/campaign-act1.txt')
  return overlay.page.locator('[data-w-panel]').filter({ hasText: 'Open in PoB' })
}

test('pob: what changes at the next step', async ({ overlay }) => {
  const detail = await openLevellingBuild(overlay)
  await expect(detail.getByRole('button', { name: /Tree: Day 1\.5 Clusters/ })).toContainText('Holy Dominion')
  await overlay.page.mouse.move(1800, 1000)
  await saveAround(overlay, 'hl-pob-next', [detail], 1280)
})

test('pob: the passive tree in the overlay', async ({ overlay }) => {
  const dir = grownBuildsDir()
  try {
    const detail = await openLevellingBuild(overlay, dir)
    await detail.getByRole('button', { name: /Tree: Day 1\.5 Clusters/ }).click()
    const tree = overlay.page.locator('[data-w-panel]').filter({ hasText: 'Passive tree' }).filter({ has: overlay.page.locator('svg') }).last()
    await expect(tree).toContainText(/\d+ new points?/)
    // Only the tree in the picture, not the panels it opened over.
    await detail.evaluate(el => { el.style.visibility = 'hidden' })
    await overlay.page.mouse.move(1800, 1000)
    await saveAround(overlay, 'hl-pob-tree', [tree], 1280)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

// ---- 4. Market ----

test('market: the flips window', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-scarab-flip', wmWants: 'show', anchor: { pos: 'tl', x: 8, y: 8 } } as never] })
  await backdrop(overlay, 'frames/town.jpg')
  const panel = overlay.widget('woke-scarab-flip')
  await expect(panel.getByText(/\d+ scarabs? worth vendoring/)).toBeVisible()
  await overlay.page.mouse.move(1800, 1000)
  await saveAround(overlay, 'hl-flips', [panel], 1280)
})

test('market: scarabs to buy, outlined in your stash', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-scarab-flip', stashHotkey: 'Alt + J' } as never] })
  await overlay.showScreen('screens/stash-scarab-real.png')
  await backdrop(overlay, 'frames/stash-scarabs.jpg')
  await overlay.pressHotkey('Alt + J')
  const layer = overlay.page.locator('[data-stash-outlines]')
  await expect(layer).toBeVisible()
  await overlay.page.mouse.move(1800, 1000)
  await overlay.page.waitForTimeout(500)
  await writeWebp(overlay.page, 'hl-stash-outlines', await overlay.page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 810 } }))
})

// ---- 5. On screen ----

// The icon row low on the screen, just above the skill bar.
const lowDock = (config: { woke?: Record<string, unknown> }) => {
  config.woke = { ...config.woke, dock: { x: 20, y: 80, vertical: false, noPeek: [], hidden: [], dismissed: {} } }
}

async function saveLow (overlay: Overlay, name: string) {
  await overlay.page.waitForTimeout(500)
  await writeWebp(overlay.page, name, await overlay.page.screenshot({ clip: { x: 0, y: 315, width: 1360, height: 765 } }))
}

test('on screen: trade offers waiting', async ({ overlay }) => {
  const lines = logFixture('client-logs/trade-hideout.txt')
  await overlay.boot({ patch: lowDock, widgets: [{ wmType: 'woke-trade', stepHotkey: 'F3', busyHotkey: 'F4', ping: false }] })
  await backdrop(overlay, 'frames/hideout.jpg')
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
  await backdrop(overlay, 'frames/cave-fight.jpg')
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
  await backdrop(overlay, 'frames/submerged-passage.jpg')
  const log = logFixture('client-logs/campaign-act1.txt')
  await overlay.log(log.slice(0, log.findIndex(l => l.includes('You have entered The Submerged Passage')) + 1))
  const icon = overlay.dockIcon('campaign')
  await expect(icon).toBeVisible({ timeout: 20_000 })
  await overlay.hoverDockIcon('campaign')
  await expect(icon).toContainText('The Submerged Passage')
  await saveLow(overlay, 'hl-campaign')
})

test('on screen: today\'s lab stays one hover away', async ({ overlay }) => {
  const IMG = 'https://www.poelab.com/wp-content/labfiles/normal.jpg'
  const layout = fs.readFileSync(path.join(FIXTURES, 'lab-layout.jpg'))
  await overlay.page.route(IMG, route => route.fulfill({ contentType: 'image/jpeg', body: layout }))
  const LAB = { wmType: 'woke-lab', wmTitle: 'Labyrinth', wmWants: 'show' as const, wmFlags: ['invisible-on-blur'], anchor: { pos: 'tl', x: 10, y: 10 }, urls: { normal: '', cruel: '', merciless: '', uber: '' }, defaultDifficulty: 'normal', hotkeyOverlay: 'Ctrl + Alt + L', hotkeyExternal: null, notes: '' }
  await overlay.boot({ patch: lowDock, overlayActive: true, widgets: [LAB] })
  await backdrop(overlay, 'frames/plaza.jpg')
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
  await backdrop(overlay, 'frames/town.jpg')
  await expect(overlay.dockIcon('challenges')).toBeVisible({ timeout: 20_000 })
  await overlay.hoverDockIcon('challenges')
  await saveLow(overlay, 'hl-challenges')
})

test('on screen: the drop counter, on one small icon', async ({ overlay }) => {
  await overlay.boot({
    patch: lowDock,
    widgets: [{
      wmType: 'woke-drop-counter',
      wmFlags: ['invisible-on-blur'],
      wmTitle: 'Drop counter',
      anchor: { pos: 'cc', x: 50, y: 50 },
      items: [
        { type: 'Currency', name: 'Divine Orb', drops: [2, 9, 21, 38] },
        { type: 'Currency', name: 'Exalted Orb', drops: [7, 33] },
        { type: 'Currency', name: 'Orb of Annulment', drops: [12, 25, 40] }
      ],
      maps: 44,
      autoCountMaps: true,
      layout: 'list',
      hotkey: null
    } as never]
  })
  await backdrop(overlay, 'frames/hideout.jpg')
  await overlay.log([area('HideoutLuxurious')])
  await expect(overlay.dockIcon('drop-counter')).toBeVisible({ timeout: 20_000 })
  await overlay.hoverDockIcon('drop-counter')
  await expect(overlay.dockIcon('drop-counter').getByRole('button', { name: 'Add one Divine Orb' })).toBeVisible()
  await saveLow(overlay, 'hl-drop-counter')
})

test('on screen: the death recap names the map\'s mods', async ({ overlay, fakeApp }) => {
  fs.rmSync(path.join(fakeApp.opts.userData, 'woke-death-recap'), { recursive: true, force: true })
  // Log times run on from now, so the death comes a while into the map.
  const stamp = (later = 0) => {
    const d = new Date(Date.now() + later * 1000)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  }
  const areaNow = (id: string, seed: string, level = 83) => `${stamp()} 18884906 1186a8a3 [DEBUG Client 34092] Generating level ${level} area "${id}" with seed ${seed}`
  const info = (text: string, later = 0) => `${stamp(later)} 18887484 cffb065b [INFO Client 34092] ${text}`
  await overlay.boot({ patch: lowDock, widgets: [{ wmType: 'woke-map-mods' }] })
  // Zoomed past the frame's "You have entered" line, which names another area.
  await backdrop(overlay, 'frames/cave-fight.jpg', 'right bottom / 130%')
  await overlay.log([areaNow('HideoutArenaSearingExarch', '1', 60), info(': You have entered Searing Hideout.')])
  await overlay.copyItem('items/map-rare-t16-deadly.txt', 'Alt + M')
  await expect(overlay.page.locator('body')).toContainText('Cemetery')
  overlay.app.focusGame(true)
  await overlay.page.waitForTimeout(300)
  await overlay.log([areaNow('MapWorldsCemetery', '42'), info(': You have entered Cemetery.'), info('The Maven: Show me.', 248), info(': Exile has been slain.', 252)])
  const card = overlay.page.locator('[data-death-card]')
  await expect(async () => {
    await overlay.hoverDockIcon('death-recap')
    await expect(card).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 20_000 })
  await expect(card).toContainText('Exact')
  await saveLow(overlay, 'hl-death-recap')
})

// ---- 6. Lab gems and regex ----

test('market: Divine Font gem values', async ({ overlay }) => {
  // The recording has too few gems to price a font: today's live prices.
  const live = await fetch('https://poe.ninja/poe1/api/economy/current/dense/overviews?league=Allflame')
  if (!live.ok) throw new Error(`poe.ninja answered ${live.status}`)
  const body = await live.text()
  await overlay.page.route('**/dense/overviews*', (route) => route.fulfill({ contentType: 'application/json', body }))
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-lab-gems', wmTitle: 'Lab gems', wmFlags: ['uninitialized'], anchor: { pos: 'tl', x: 40, y: 30 } }] })
  await backdrop(overlay, 'frames/town.jpg')
  const w = overlay.widget('woke-lab-gems')
  await expect(w.getByText('Red pool').locator('..')).not.toContainText('EV 0 c', { timeout: 15_000 })
  await overlay.page.mouse.move(1800, 1000)
  await saveAround(overlay, 'hl-lab-gems', [w.locator('[data-w-panel]')], 1120)
})

test('regex: the maker writes the stash search', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-map-mods', wmWants: 'show', anchor: { pos: 'tl', x: 4, y: 12 } }] })
  await backdrop(overlay, 'frames/stash-maps.jpg')
  await overlay.page.mouse.move(1800, 1000)
  await saveAround(overlay, 'hl-regex-maker', [overlay.widget('woke-map-mods').locator('[data-w-panel]')], 1280)
})

test('regex: the clipboard of saved searches', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-regex-library', wmWants: 'show', anchor: { pos: 'tl', x: 4, y: 12 } }] })
  await backdrop(overlay, 'frames/stash-maps.jpg')
  const panel = overlay.page.locator('[data-w-panel]').filter({ hasText: 'Regex library' }).last()
  await expect(panel).toBeVisible()
  await overlay.page.mouse.move(1800, 1000)
  await saveAround(overlay, 'hl-regex-clipboard', [panel], 1120)
})

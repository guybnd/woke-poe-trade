// Screenshots for the landing page's highlights: the real overlay over real
// game screens, cropped close enough to read. Not part of the normal run:
//
//   WOKE_LANDING_SHOTS=1 npx playwright test landing-highlights
//
// Each shot is written to docs/public/shots/<name>.webp at double resolution, so the page
// can show it at 1280x720 and stay sharp.
import fs from 'fs'
import os from 'os'
import path from 'path'
import zlib from 'zlib'
import { fileURLToPath } from 'url'
import type { Locator, Page } from '@playwright/test'
import { test, expect, FIXTURES, haveOcr, logFixture, fixtureText } from './harness'
import { Clip, around } from './clip'
import type { Rect } from './clip'
import type { Overlay } from './harness'

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/public/shots')
const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }

// WOKE_LANDING_CLIPS=1 records the clips instead (the `clip:` tests at the end).
test.skip(!process.env.WOKE_LANDING_SHOTS && !process.env.WOKE_LANDING_CLIPS, 'Set WOKE_LANDING_SHOTS=1 to take the landing page screenshots')
// A clips run leaves the stills alone.
test.beforeEach(({}, info) => { // eslint-disable-line no-empty-pattern
  test.skip(!process.env.WOKE_LANDING_SHOTS && !info.title.startsWith('clip:'), 'Set WOKE_LANDING_SHOTS=1 to take the landing page screenshots')
})
test.use({ deviceScaleFactor: 2 })

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
// need and no smaller than `min`, kept on the page.
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
    const scale = Math.min(1, 2560 / img.naturalWidth)
    canvas.width = img.naturalWidth * scale
    canvas.height = img.naturalHeight * scale
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
})

// Today's poe.ninja prices in place of the recording, for real numbers and a
// real week of history.
async function liveNinja (page: Page) {
  const live = await fetch('https://poe.ninja/poe1/api/economy/current/dense/overviews?league=Allflame')
    .catch(e => { if (!process.env.WOKE_SHOTS_OFFLINE) throw e })
  if (!live) return // A trial run with no network: the recording stands in.
  if (!live.ok) throw new Error(`poe.ninja answered ${live.status}`)
  const body = await live.text()
  await page.route('**/dense/overviews*', (route) => route.fulfill({ contentType: 'application/json', body }))
}

// ---- 1b. Quick search (Ctrl+Space) ----

// Opens the palette and types `query` once the saved prices have loaded.
async function searchFor (overlay: Overlay, query: string, expected: RegExp) {
  await overlay.pressHotkey('Ctrl + Space')
  const panel = overlay.widget('woke-search')
  const box = panel.getByRole('textbox', { name: 'Search' })
  await expect(async () => {
    await box.fill(query)
    await expect(panel.getByRole('button', { name: expected }).first()).toBeVisible({ timeout: 500 })
  }).toPass({ timeout: 20_000 })
  return { panel, box, palette: panel.locator('[data-search-palette]') }
}

// The test app only knows its own league, but these prices are Allflame's.
async function allflameLabel (palette: Locator) {
  await palette.evaluate(root => {
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (n.textContent?.includes('Testleague')) n.textContent = n.textContent.replace('Testleague', 'Allflame')
    }
  })
}

test('search: any price, now and a week ago', async ({ overlay }) => {
  await liveNinja(overlay.page)
  await overlay.boot()
  await backdrop(overlay, 'frames/hideout.jpg')
  const { panel, palette } = await searchFor(overlay, 'mageblood', /Mageblood/)
  await expect(panel.getByText('Trade site')).toBeVisible()
  // First shot of a run, so the item art is still on its way from the CDN.
  if (!process.env.WOKE_SHOTS_OFFLINE) await expect.poll(() => palette.locator('img').evaluateAll(imgs => imgs.length > 0 && imgs.every(i => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0)), { timeout: 20_000 }).toBe(true)
  await overlay.page.mouse.move(1900, 1060)
  await allflameLabel(palette)
  await saveAround(overlay, 'hl-search-price', [palette], 1240)
})

test('search: pin prices to compare them', async ({ overlay }) => {
  await liveNinja(overlay.page)
  await overlay.boot()
  await backdrop(overlay, 'frames/hideout.jpg')
  const { panel, box, palette } = await searchFor(overlay, 'divine orb', /Divine Orb/)
  for (const [query, name] of [['divine orb', /Divine Orb/], ['headhunter', /Headhunter/], ['mirror of kalandra', /Mirror of Kalandra/]] as const) {
    await box.fill(query)
    await panel.getByRole('button', { name }).first().click()
    await panel.getByRole('button', { name: 'Pin to compare' }).first().click()
  }
  await expect(panel.getByTitle('Remove from the comparison')).toHaveCount(3)
  await overlay.page.mouse.move(1900, 1060)
  await allflameLabel(palette)
  await saveAround(overlay, 'hl-search-compare', [palette], 1240)
})

test('search: tools and settings by name', async ({ overlay }) => {
  await liveNinja(overlay.page)
  await overlay.boot()
  await backdrop(overlay, 'frames/hideout.jpg')
  const { palette } = await searchFor(overlay, 'filter', /Loot filter editor/)
  await overlay.page.mouse.move(1900, 1060)
  await allflameLabel(palette)
  await saveAround(overlay, 'hl-search-tools', [palette], 1240)
})

test('search: hover a result to see the item', async ({ overlay }) => {
  await liveNinja(overlay.page)
  await overlay.boot()
  await backdrop(overlay, 'frames/hideout.jpg')
  const { panel, palette } = await searchFor(overlay, 'headhunter', /Headhunter/)
  await panel.getByRole('button', { name: /Headhunter/ }).first().hover()
  const tip = overlay.page.getByRole('tooltip')
  await expect(tip).toContainText('Leather Belt')
  await allflameLabel(palette)
  await saveAround(overlay, 'hl-search-hover', [palette, tip], 1240)
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
    // Two believable versions of one build, with the numbers PoB would save.
    const stats = (o: Record<string, number>) => Object.entries(o).map(([stat, value]) => `<PlayerStat stat="${stat}" value="${value}"/>`).join('')
    const withStats = (xml: string, o: Record<string, number>) => xml.replace(/<Build ([^>]*?)\/>/, (_, attrs: string) => `<Build ${attrs}>${stats(o)}</Build>`)
    const showcase = fs.readFileSync(path.join(dir, 'Showcase.xml'), 'utf8')
    fs.rmSync(path.join(dir, 'Showcase.xml'))
    fs.rmSync(path.join(dir, 'Loadouts.xml'))
    fs.writeFileSync(path.join(dir, 'Arc Elementalist.xml'), withStats(showcase, { CombinedDPS: 4820000, Life: 4210, EnergyShield: 1180, TotalEHP: 61200, FireResistOverCap: 34, ColdResistOverCap: 41, LightningResistOverCap: 52 }))
    const safer = showcase.replace('Kaom&apos;s Binding', 'Headhunter').replace('Heavy Belt', 'Leather Belt').replace(/nodes="([^"]*)"/, (_, ids: string) => `nodes="${ids.split(',').slice(0, -6).join(',')}"`)
    fs.writeFileSync(path.join(dir, 'Arc Elementalist safer.xml'), withStats(safer, { CombinedDPS: 3910000, Life: 5040, EnergyShield: 1180, TotalEHP: 88400, FireResistOverCap: 12, ColdResistOverCap: 18, LightningResistOverCap: 27 }))
    await overlay.boot({ overlayActive: true, widgets: [{ ...showcaseInUse()[0], wmWants: 'show' as const, buildsDir: dir, activeBuild: 'Arc Elementalist.xml' }] })
    await backdrop(overlay, 'frames/town.jpg')
    const detail = overlay.page.locator('[data-w-panel]').filter({ hasText: 'Open in PoB' })
    await detail.getByTitle('More').first().click()
    await overlay.page.getByText('Compare with another build').click()
    const panel = overlay.page.locator('[data-w-panel]').filter({ hasText: 'Compare builds' })
    await panel.getByRole('combobox', { name: 'Second build' }).selectOption('Arc Elementalist safer.xml')
    await expect(panel).toContainText("Gear that's different")
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
  const { nodes }: { nodes: Node[] } = JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../renderer/public/data/tree/passive-tree.json'), 'utf8'))
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
    const tree = overlay.page.locator('[data-w-panel]').filter({ hasText: 'Passive tree' }).filter({ has: overlay.page.locator('canvas') }).last()
    await tree.getByRole('switch').click()
    await expect(tree).toContainText(/\+\d+/)
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
  await saveAround(overlay, 'hl-flips', [panel.locator('[data-w-panel]')], 1280)
})

test('market: uniques worth disenchanting', async ({ overlay }) => {
  await liveNinja(overlay.page)
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-disenchant', wmWants: 'show', anchor: { pos: 'tl', x: 8, y: 8 }, wokeSizes: { main: { h: 590 } } } as never] })
  await backdrop(overlay, 'frames/town.jpg')
  const panel = overlay.widget('woke-disenchant')
  await expect(panel.locator('.w-row:not(.w-row--head)').first()).toBeVisible({ timeout: 15_000 })
  await overlay.page.mouse.move(1800, 1000)
  await saveAround(overlay, 'hl-disenchant', [panel.locator('[data-w-panel]')], 1280)
})

test('market: scarabs to buy, outlined in your stash', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-scarab-flip', stashHotkey: 'Alt + J', stashTotals: false } as never] })
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

// The League mechanics folder on the landing page: one card per mechanic, in
// its own zone, with prices put in here (a sample, like the Expedition card's).
const FLAT7 = [0, 0, 0, 0, 0, 0, 0]
const MECHANIC_PRICES: Record<string, Array<[string, number]>> = {
  Currency: [
    ['Vivid Crystallised Lifeforce', 0.09], ['Primal Crystallised Lifeforce', 0.07],
    ['Wild Crystallised Lifeforce', 0.12], ['Sacred Crystallised Lifeforce', 38]
  ],
  Fossil: [
    ['Fractured Fossil', 95], ['Faceted Fossil', 62], ['Glyphic Fossil', 14], ['Hollow Fossil', 9],
    ['Bloodstained Fossil', 7], ['Sanctified Fossil', 6], ['Gilded Fossil', 4], ['Prismatic Fossil', 3],
    ['Pristine Fossil', 2], ['Dense Fossil', 1]
  ],
  Resonator: [['Prime Chaotic Resonator', 28], ['Powerful Chaotic Resonator', 4], ['Potent Chaotic Resonator', 1]],
  Oil: [
    ['Tainted Oil', 160], ['Golden Oil', 75], ['Prismatic Oil', 9], ['Silver Oil', 7], ['Opalescent Oil', 4],
    ['Black Oil', 2], ['Crimson Oil', 1.5], ['Violet Oil', 1], ['Indigo Oil', 0.8], ['Azure Oil', 0.5]
  ],
  DeliriumOrb: [
    ['Kalguuran Delirium Orb', 32], ['Fine Delirium Orb', 18], ['Skittering Delirium Orb', 12], ['Diviner\'s Delirium Orb', 9],
    ['Fossilised Delirium Orb', 7], ['Blighted Delirium Orb', 4], ['Whispering Delirium Orb', 3], ['Abyssal Delirium Orb', 2]
  ],
  Fragment: [['Simulacrum', 95], ['Simulacrum Splinter', 1.4]],
  Omen: [
    ['Omen of Fortune', 340], ['Omen of the Soul Devourer', 110], ['Omen of Death\'s Door', 45], ['Omen of the Jeweller', 30],
    ['Omen of Connections', 18], ['Omen of Amelioration', 12], ['Omen of Return', 6], ['Omen of Refreshment', 3]
  ],
  Corpse: [
    ['Perfect Astral Lich', 85], ['Perfect Blasphemer', 40], ['Perfect Blood Demon', 22], ['Perfect Conjuror of Rot', 9]
  ],
  Beast: [
    ['Wild Brambleback', 120], ['Fenumal Plagued Arachnid', 22], ['Vivid Vulture', 8],
    ['Black Mórrigan', 6], ['Saqawine Rhex', 4], ['Wild Hellion Alpha', 3]
  ]
}

async function mechanicPrices (overlay: Overlay) {
  const recorded = fs.readFileSync(path.join(FIXTURES, 'http/poe.ninja/poe1/api/economy/current/dense/overviews.json'), 'utf8')
  const extra = Object.entries(MECHANIC_PRICES).map(([type, lines]) =>
    JSON.stringify({ type, lines: lines.map(([name, chaos]) => ({ name, chaos, graph: FLAT7 })) })).join(',')
  await overlay.page.route('**/dense/overviews*', (route) => route.fulfill({
    contentType: 'application/json',
    body: recorded.replace(/\[\s*\{"type":"/, () => `[${extra},{"type":"`)
  }))
}

// In the zone, hovering the icon.
const MECHANIC_CARDS: Array<{ shot: string, frame: string, lines: string[], see: RegExp }> = [
  { shot: 'hl-mech-harvest', frame: 'frames/cave-fight.jpg', lines: [area('HarvestLeagueHub')], see: /Crystallised Lifeforce/ },
  { shot: 'hl-mech-delve', frame: 'frames/cave-fight.jpg', lines: [area('Delve_Main')], see: /Fractured Fossil/ },
  { shot: 'hl-mech-blight', frame: 'frames/submerged-passage.jpg', lines: [area('MapWorldsBlightedCity')], see: /Tainted Oil/ },
  { shot: 'hl-mech-delirium', frame: 'frames/submerged-passage.jpg', lines: [area('AfflictionTown1')], see: /Delirium Orb/ },
  {
    shot: 'hl-mech-bestiary',
    frame: 'frames/cave-fight.jpg',
    lines: [area('MapWorldsCaveTest'), '2026/11/05 20:49:11 18887484 cffb065b [INFO Client 34092] Einhar, Beastmaster: Exile! You came to hunt with Einhar!'],
    see: /Wild Brambleback/
  }
]

for (const card of MECHANIC_CARDS) {
  test(`on screen: League mechanics folder, ${card.shot}`, async ({ overlay }) => {
    await mechanicPrices(overlay)
    await overlay.boot({ patch: lowDock, widgets: [{ wmType: 'woke-mechanics' }] })
    await backdrop(overlay, card.frame)
    await overlay.log(card.lines)
    await expect(overlay.dockIcon('mechanics')).toBeVisible({ timeout: 20_000 })
    await expect(async () => {
      await overlay.hoverDockIcon('mechanics')
      await expect(overlay.page.getByText(card.see).first()).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 20_000 })
    await saveLow(overlay, card.shot)
  })
}

// Ritual has no zone of its own, so the full window, as Betrayal.
test('on screen: League mechanics folder, Ritual omens', async ({ overlay }) => {
  await mechanicPrices(overlay)
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-mechanics' }] })
  await backdrop(overlay, 'frames/town.jpg')
  const w = overlay.widget('woke-mechanics')
  await overlay.widget('menu').getByRole('button', { name: 'All tools' }).click()
  await overlay.page.getByRole('button', { name: /League mechanics/ }).first().click()
  await w.getByRole('tab', { name: /ritual/i }).click()
  await expect(w.getByText('Omen of Fortune').first()).toBeVisible()
  await expect(w.getByText('Perfect Astral Lich').first()).toBeVisible()
  await overlay.page.mouse.move(1800, 1000)
  await saveAround(overlay, 'hl-mech-ritual', [w.locator('[data-w-panel]').first()], 1280)
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
  await liveNinja(overlay.page)
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

// ---- More slides: price moves, maps, Betrayal, investments, setup ----

const cursorOf = (screen: string): { x: number, y: number } =>
  JSON.parse(fs.readFileSync(path.join(FIXTURES, `screens/${screen}.json`), 'utf8')).cursor

// Today's prices, for the screens where the recording is too thin to show them.
async function livePrices (overlay: Overlay) {
  await liveNinja(overlay.page)
}

test('filter: today\'s prices, and the moves to pick from', async ({ overlay }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  try {
    fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters', 'neversink', '1-REGULAR.filter.gz'))))
    await livePrices(overlay)
    await overlay.boot({ overlayActive: true, widgets: [{ ...lootFilter(folder), wmWants: 'show' }] })
    await backdrop(overlay, 'frames/town.jpg')
    await overlay.page.getByRole('tab', { name: /^Prices/ }).click()
    await expect(overlay.page.getByText(/\d+ items? would move/)).toBeVisible({ timeout: 20_000 })
    // The test app only knows its own league, but these prices are Allflame's.
    await overlay.page.getByText(/Testleague · prices/).evaluate(el => { el.textContent = (el.textContent ?? '').replace('Testleague', 'Allflame') })
    await overlay.page.mouse.move(1800, 1000)
    await saveAround(overlay, 'hl-filter-moves', [overlay.page.locator('[data-w-panel]').filter({ hasText: 'would move' }).first()], 1280)
  } finally {
    fs.rmSync(folder, { recursive: true, force: true })
  }
})

test('maps: map scan marks what your build can\'t run', async ({ overlay }) => {
  test.skip(!haveOcr, 'OCR files missing: npm run get:ocr')
  await overlay.boot({ widgets: [{ wmType: 'woke-map-scan' }, { wmType: 'woke-map-mods' }] })
  await overlay.showScreen('screens/map-real-07.png')
  await backdrop(overlay, 'landing/screenshot-0007.jpg')
  const cursor = cursorOf('map-real-07')
  await overlay.moveMouse(cursor.x, cursor.y)
  await overlay.pressHotkey('Alt + S')
  const badge = overlay.page.locator('[class*="badge"]').first()
  await expect(badge).toContainText('CARE', { timeout: 20_000 })
  await overlay.page.waitForTimeout(500)
  await writeWebp(overlay.page, 'hl-map-scan', await overlay.page.screenshot({ clip: { x: 0, y: 165, width: 960, height: 540 } }))
})

test('maps: essence scan says whether to corrupt', async ({ overlay }) => {
  test.skip(!haveOcr, 'OCR files missing: npm run get:ocr')
  await livePrices(overlay)
  await overlay.boot({ widgets: [{ wmType: 'woke-essence-scan', wmWants: 'show' }] })
  await overlay.showScreen('screens/essence-real-25.png')
  await backdrop(overlay, 'landing/screenshot-0025.jpg')
  const cursor = cursorOf('essence-real-25')
  await overlay.moveMouse(cursor.x, cursor.y)
  await overlay.pressHotkey('Alt + E')
  const card = overlay.page.getByText('CORRUPT', { exact: true }).filter({ visible: true })
  await expect(card).toBeVisible({ timeout: 20_000 })
  await saveAround(overlay, 'hl-essence-scan', [card], 1280)
})

// An atlas tree link taking the real notables for these mechanics.
async function atlasTreeLink (words: RegExp) {
  const res = await fetch('https://raw.githubusercontent.com/grindinggear/atlastree-export/master/data.json')
  if (!res.ok) throw new Error(`Atlas data answered ${res.status}`)
  const { nodes } = await res.json() as { nodes: Record<string, { skill?: number, name?: string, stats?: string[], isNotable?: boolean }> }
  const ids = Object.values(nodes)
    .filter(n => n.isNotable && n.skill != null && words.test(`${n.name} ${(n.stats ?? []).join(' ')}`))
    .map(n => n.skill as number)
    .slice(0, 30)
  const bytes = Buffer.alloc(7 + ids.length * 2)
  bytes.writeUInt32BE(4, 0)
  ids.forEach((id, i) => bytes.writeUInt16BE(id, 7 + i * 2))
  return `https://www.pathofexile.com/fullscreen-atlas-skill-tree/${bytes.toString('base64url')}`
}

test('maps: atlas strategies keep tree, scarabs and regex together', async ({ overlay }) => {
  await livePrices(overlay)
  const treeUrl = await atlasTreeLink(/Essence/)
  await overlay.boot({
    overlayActive: true,
    widgets: [{
      wmType: 'woke-atlas-strategies',
      wmTitle: 'Atlas strategies',
      wmWants: 'show',
      wmFlags: ['invisible-on-blur'],
      anchor: { pos: 'tl', x: 4, y: 12 },
      dataUrl: '',
      selectedId: 1,
      strategies: [
        { id: 1, name: 'Essence farm', league: 'Allflame', tags: ['currency', 'juiced'], treeUrl, scarabs: '2x Essence Scarab of Calcification\n2x Essence Scarab of Adaptation', device: 'Kirac: 8 mod maps\nAtlas: Essence wheel', regex: '"!eflec|t regen" "m q.*[2-9].%"', notes: 'Corrupt anything essence scan marks.' },
        { id: 2, name: 'Scarab farm', league: 'Allflame', tags: ['scarabs'], treeUrl: '', scarabs: '', device: '', regex: '', notes: '' },
        { id: 3, name: 'Ritual', league: 'Allflame', tags: ['currency'], treeUrl: '', scarabs: '', device: '', regex: '', notes: '' }
      ]
    } as never]
  })
  await backdrop(overlay, 'frames/town.jpg')
  const panel = overlay.page.locator('[data-w-panel]').filter({ hasText: 'Essence farm' }).first()
  await expect(panel).toBeVisible()
  await overlay.page.waitForTimeout(3000)
  await overlay.page.mouse.move(1800, 1000)
  await saveAround(overlay, 'hl-atlas', [panel], 1280)
})

test('on screen: Betrayal, the slots worth having', async ({ overlay }) => {
  await livePrices(overlay)
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-mechanics' }] })
  await backdrop(overlay, 'frames/town.jpg')
  const w = overlay.widget('woke-mechanics')
  await overlay.widget('menu').getByRole('button', { name: 'All tools' }).click()
  await overlay.page.getByRole('button', { name: /League mechanics/ }).first().click()
  await w.getByRole('tab', { name: /betrayal/i }).click()
  await expect(w.locator('[title="Star this slot"]').first()).toBeVisible()
  await w.getByText('Inter', { exact: true }).click()
  for (const i of [0, 3, 7]) await w.locator('[title="Star this slot"]').nth(i).click()
  await overlay.page.mouse.move(1800, 1000)
  await saveAround(overlay, 'hl-betrayal', [w.locator('[data-w-panel]').first()], 1280)
})

test('market: league-start investments', async ({ overlay }) => {
  await livePrices(overlay)
  await overlay.boot({
    overlayActive: true,
    widgets: [{
      wmType: 'woke-league-invest',
      wmTitle: 'League investments',
      wmWants: 'show',
      wmFlags: ['invisible-on-blur'],
      anchor: { pos: 'tl', x: 4, y: 12 },
      budgetDiv: 5,
      slots: 5,
      horizon: 7,
      bulkOnly: false,
      minMultiple: 1.2,
      leagueStart: '',
      dayOverride: 3
    } as never]
  })
  await backdrop(overlay, 'frames/town.jpg')
  const panel = overlay.page.locator('[data-w-panel]').filter({ hasText: 'League investments' }).first()
  await expect(panel).toBeVisible()
  await overlay.page.waitForTimeout(5000)
  await overlay.page.mouse.move(1800, 1000)
  await saveAround(overlay, 'hl-invest', [panel], 1280)
})

test('setup: pick how you play', async ({ overlay, fakeApp }) => {
  await overlay.boot({ firstRun: true, overlayActive: true })
  const page = overlay.page
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(`${fakeApp.url}#setup`)
  await page.reload()
  await page.getByRole('button', { name: /Tools/ }).click()
  await page.getByRole('radio', { name: 'Mapper' }).click()
  await page.mouse.move(1800, 1000)
  // The test build's version number isn't a real one.
  await page.getByText('v0.0.0-test').evaluate(el => { el.style.visibility = 'hidden' })
  await page.waitForTimeout(500)
  await writeWebp(page, 'hl-setup', await page.screenshot())
})

// ---- Clips: the same setups, recorded while the overlay is used ----
//
//   WOKE_LANDING_CLIPS=1 npx playwright test landing-highlights -g "clip:"
//
// Each writes docs/public/clips/<name>.mp4, .webm and a .webp poster (see clip.ts).

// The stat listings again, now with each mod's tier and roll range, so
// hovering a row shows the full listing tooltip.
const NAMES = ['Doom Shell', 'Rapture Wrap', 'Corpse Pelt', 'Gale Cloak', 'Mind Mantle', 'Sol Coat', 'Dusk Veil', 'Storm Shroud']
function tiered (value: number, ladder: Array<[string, string, number, number]>) {
  const hit = ladder.find(([, , min, max]) => value >= min && value <= max) ?? ladder[ladder.length - 1]
  return [{ name: hit[0], tier: hit[1], level: 1, magnitudes: [{ min: String(hit[2]), max: String(hit[3]) }] }]
}
const LIFE: Array<[string, string, number, number]> = [['Rapturous', 'P1', 130, 139], ['Prime', 'P2', 120, 129], ['Fecund', 'P3', 110, 119], ['Vigorous', 'P4', 100, 109]]
const RES: Array<[string, string, number, number]> = [['of Tzteosh', 'S1', 46, 48], ['of Haast', 'S2', 42, 45], ['of the Furnace', 'S3', 36, 41], ['of the Volcano', 'S4', 30, 35]]
const COLD: Array<[string, string, number, number]> = [['of Ephij', 'S1', 46, 48], ['of the Polar Bear', 'S2', 42, 45], ['of the Ice', 'S3', 36, 41], ['of the Tundra', 'S4', 30, 35]]
const CHAOS: Array<[string, string, number, number]> = [['of Bameth', 'S1', 31, 35], ['of Exile', 'S2', 26, 30], ['of Expulsion', 'S3', 21, 25]]

async function richListings (page: Page) {
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
        const n = Number(id.slice(1))
        const [amount, es, life, fire, cold, chaos] = LISTINGS[n]
        return {
          id,
          item: {
            ilvl: 86,
            frameType: 2,
            rarity: 'Rare',
            identified: true,
            name: NAMES[n],
            typeLine: 'Twilight Regalia',
            baseType: 'Twilight Regalia',
            properties: [{ name: 'Energy Shield', values: [[String(es), 1]], displayMode: 0, type: 18 }],
            requirements: [{ name: 'Level', values: [['68', 0]], displayMode: 0, type: 62 }],
            extended: { es, es_aug: true },
            explicitMods: [
              { description: `+${life} to maximum Life`, domain: 'explicit', hash: 'stat.explicit.stat_3299347043', mods: tiered(life, LIFE) },
              { description: `+${fire}% to Fire Resistance`, domain: 'explicit', hash: 'stat.explicit.stat_3372524247', mods: tiered(fire, RES) },
              { description: `+${cold}% to Cold Resistance`, domain: 'explicit', hash: 'stat.explicit.stat_4220027924', mods: tiered(cold, COLD) },
              { description: `+${chaos}% to Chaos Resistance`, domain: 'explicit', hash: 'stat.explicit.stat_2923486259', mods: tiered(chaos, CHAOS) }
            ]
          },
          listing: {
            indexed: new Date(Date.now() - n * 7 * 60_000).toISOString(),
            fee: 1,
            price: { amount, currency: 'chaos' },
            account: { name: `seller${id}`, lastCharacterName: `char${id}` }
          }
        }
      })
    })
  }))
}

// Delirium orb prices for the stash outlines (Allflame, 5 Nov 2026: chaos, and
// chaos traded in a day), as scarab-flip.spec.ts routes them.
const DELI_ORBS: Array<[string, number, number]> = [
  ["Armoursmith's Delirium Orb", 12.3, 812],
  ["Jeweller's Delirium Orb", 16.89, 1866],
  ["Blacksmith's Delirium Orb", 17.1, 1607],
  ['Whispering Delirium Orb', 7, 70],
  ['Fine Delirium Orb', 37.55, 5701],
  ["Diviner's Delirium Orb", 34.6, 496]
]
async function deliriumPrices (page: Page) {
  const dense = JSON.parse(fixtureText('http/poe.ninja/poe1/api/economy/current/dense/overviews.json'))
  dense.itemOverviews.push({ type: 'DeliriumOrb', lines: DELI_ORBS.map(([name, chaos]) => ({ name, chaos, graph: [] })) })
  dense.currencyOverviews[0].lines.push({ name: 'Primal Crystallised Lifeforce', chaos: 0.033, graph: [] })
  await page.route('**/poe.ninja/poe1/api/economy/current/dense/overviews*', route => route.fulfill({ json: dense }))
  await page.route('**/poe.ninja/poe1/api/economy/exchange/current/overview*', route => {
    const rows = new URL(route.request().url()).searchParams.get('type') === 'DeliriumOrb' ? DELI_ORBS : []
    return route.fulfill({ json: { core: { primary: 'chaos', items: [], rates: {} }, items: rows.map(([name]) => ({ id: name, name })), lines: rows.map(([name, primaryValue, volumePrimaryValue]) => ({ id: name, primaryValue, volumePrimaryValue })) } })
  })
}

test.describe('clips', () => {
  test.skip(!process.env.WOKE_LANDING_CLIPS, 'Set WOKE_LANDING_CLIPS=1 to record the landing page clips')
  test.setTimeout(120_000)


  test('clip: market, outline the Delirium tab', async ({ overlay }) => {
    await deliriumPrices(overlay.page)
    await overlay.boot({ patch: lowDock, widgets: [{ wmType: 'woke-scarab-flip' } as never] })
    await overlay.log(logFixture('client-logs/mapping-session.txt').slice(0, 3)) // The hideout.
    // The app reads the recorded Delirium tab. It only has the stash panel, so
    // the page shows that panel over a whole stash frame (whose folder list is
    // already blurred, as the recording's is not).
    await overlay.showScreen('screens/stash-delirium-real.png')
    await backdrop(overlay, 'frames/stash-scarabs.jpg')
    const deli = fs.readFileSync(path.join(FIXTURES, 'screens/stash-delirium-real.png')).toString('base64')
    await overlay.page.evaluate((url) => {
      const d = document.createElement('div')
      Object.assign(d.style, { position: 'fixed', left: '0', top: '0', width: '688px', height: '1080px', background: `url(${url}) 0 0 / 1920px 1080px no-repeat`, pointerEvents: 'none' })
      document.body.prepend(d)
    }, `data:image/png;base64,${deli}`)
    const icon = (await overlay.dockIcon('scarab-flip').boundingBox())!
    // The tab and its slots, close up; and the icon, down by the stash's search box.
    const view = around([{ x: 20, y: 100, width: 650, height: 460 }], 700, 10)
    const down = around([{ x: 30, y: 560, width: 630, height: 1 }, icon], 700, 30)
    const rest: [number, number] = [745, 330]
    const game = (x: number, y: number) => overlay.app.moveMouse(x, y)
    const clip = await Clip.start(overlay.page, 'clip-market', rest, view)
    await clip.hold(700)
    clip.look(down)
    await clip.moveTo(icon.x + icon.width / 2, icon.y + icon.height / 2, 900, 'game', game)
    await clip.hold(1100)
    overlay.app.pressMouse(Math.round(icon.x + icon.width / 2), Math.round(icon.y + icon.height / 2))
    overlay.app.releaseMouse()
    await clip.click()
    // Off the tab, so no tooltip hides what is under it.
    clip.look(view)
    await clip.moveTo(...rest, 700, 'game', game)
    await expect(overlay.page.locator('[data-stash-outlines]')).toBeVisible({ timeout: 15_000 })
    await clip.hold(1200)
    await clip.poster()
    await clip.hold(2000)
    // A click in game clears them, as the clip began.
    overlay.app.pressMouse(...rest)
    overlay.app.releaseMouse()
    await clip.click()
    await expect(overlay.page.locator('[data-stash-outlines]')).toBeHidden()
    await clip.hold(700)
    await clip.save()
  })

  test('clip: on screen, through the League mechanics tabs', async ({ overlay }) => {
    await mechanicPrices(overlay)
    await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-mechanics' }] })
    await backdrop(overlay, 'frames/town.jpg')
    const page = overlay.page
    const w = overlay.widget('woke-mechanics')
    await overlay.widget('menu').getByRole('button', { name: 'All tools' }).click()
    await page.getByRole('button', { name: /League mechanics/ }).first().click()
    const tabs = w.getByRole('tab')
    await expect(tabs.first()).toBeVisible()
    console.log('tabs', await tabs.allTextContents())
    const names = [/harvest/i, /delve/i, /blight/i, /delirium/i, /ritual/i]
    // A first pass so the camera holds still on the widest tab.
    const seen: Array<Rect | null> = []
    for (const name of names) {
      await w.getByRole('tab', { name }).click()
      await page.waitForTimeout(300)
      seen.push(await w.locator('[data-w-panel]').first().boundingBox())
    }
    await w.getByRole('tab', { name: names[0] }).click()
    const tb = (await w.getByRole('tab', { name: names[0] }).boundingBox())!
    const rest: [number, number] = [tb.x + 40, tb.y + 140]
    await page.mouse.move(...rest)
    await page.waitForTimeout(500)
    const clip = await Clip.start(page, 'clip-on-screen', rest, around(seen, 760, 24))
    await clip.hold(1400)
    for (const name of [...names.slice(1), names[0]]) {
      const b = (await w.getByRole('tab', { name }).boundingBox())!
      await clip.moveTo(b.x + b.width / 2, b.y + b.height / 2, 500)
      await clip.click()
      await clip.hold(name === names[0] ? 600 : 1700)
    }
    await clip.moveTo(...rest, 500)
    await clip.hold(500)
    await clip.save()
  })

  test('clip: quick search, type and pick', async ({ overlay }) => {
    await liveNinja(overlay.page)
    await overlay.boot()
    await backdrop(overlay, 'frames/hideout.jpg')
    const page = overlay.page
    // Open it once to learn its size with results, then start empty.
    const { panel, box, palette } = await searchFor(overlay, 'headhunter', /Headhunter/)
    await panel.getByRole('button', { name: /Headhunter/ }).first().hover()
    const tip = page.getByRole('tooltip')
    await expect(tip).toBeVisible()
    const view = around([await palette.boundingBox(), await tip.boundingBox()], 1000, 30)
    await box.fill('')
    const pb = (await box.boundingBox())!
    const rest: [number, number] = [pb.x + pb.width + 60, pb.y + 220]
    await page.mouse.move(...rest)
    await page.waitForTimeout(400)
    await allflameLabel(palette)
    const clip = await Clip.start(page, 'clip-search', rest, view)
    await clip.hold(700)
    const show = async (query: string, expected: RegExp, pause = 1400) => {
      await box.focus()
      await clip.type(query, 95)
      await expect(panel.getByRole('button', { name: expected }).first()).toBeVisible({ timeout: 10_000 })
      await allflameLabel(palette)
      await clip.hold(pause)
    }
    await show('divine', /Divine Orb/)
    await box.fill('')
    await clip.hold(250)
    await show('filter', /Loot filter editor/)
    await box.fill('')
    await clip.hold(250)
    await show('headhunter', /Headhunter/, 500)
    const hb = (await panel.getByRole('button', { name: /Headhunter/ }).first().boundingBox())!
    await clip.moveTo(hb.x + 120, hb.y + hb.height / 2, 600)
    await expect(tip).toBeVisible()
    await allflameLabel(palette)
    await clip.poster()
    await clip.hold(2000)
    await clip.moveTo(...rest, 600)
    await box.fill('')
    await clip.hold(600)
    await clip.save()
  })

  test('clip: filter, re-tier an item from the ground', async ({ overlay, fakeApp }) => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
    try {
      fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters', 'neversink', '1-REGULAR.filter.gz'))))
      await overlay.boot({ widgets: [lootFilter(folder)] })
      await backdrop(overlay, 'frames/item-on-ground.jpg', '-540px -140px / 125%')
      await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+F')
      // The boots' label on the ground, and where the card opens beside it.
      const label = { x: 160, y: 450, width: 365, height: 85 }
      const card = { x: 665, y: 85, width: 432, height: 911 }
      const top = around([label, { ...card, height: 540 }], 1040, 60)
      const rest: [number, number] = [640, 760]
      const game = (x: number, y: number) => overlay.app.moveMouse(x, y)
      const clip = await Clip.start(overlay.page, 'clip-filter', rest, top)
      await clip.hold(600)
      await clip.moveTo(label.x + 190, label.y + 45, 650, 'game', game)
      await clip.keys(['Alt', 'F'], label.x + 110, label.y + 120, () => overlay.copyItem(BOOTS, 'Alt + F'))
      const panel = overlay.page.locator('[data-w-panel]').filter({ has: overlay.page.getByText('Filter rule for this item') })
      await expect(panel).toBeVisible()
      await clip.hold(700)
      const go = async (name: string | RegExp, ms = 600) => {
        const b = (await panel.getByRole('button', { name }).first().boundingBox())!
        await clip.moveTo(b.x + Math.min(b.width / 2, 50), b.y + b.height / 2, ms)
        await clip.click()
      }
      await go(/^Tier 3/)
      await clip.hold(500)
      await clip.poster()
      await clip.hold(800)
      // Close the card: back to the ground, as the clip began.
      const close = (await panel.locator('button:has(i.fa-times)').last().boundingBox())!
      await clip.moveTo(close.x + close.width / 2, close.y + close.height / 2, 700)
      await clip.click()
      await expect(panel).toBeHidden()
      await clip.moveTo(...rest, 800, 'none')
      await clip.hold(900)
      await clip.save()
    } finally {
      fs.rmSync(folder, { recursive: true, force: true })
    }
  })

  test('clip: pob, tabs, tree and loadouts', async ({ overlay }) => {
    const dir = grownBuildsDir()
    try {
      const detail = await openLevellingBuild(overlay, dir)
      await expect(detail.getByRole('tab', { name: 'Gear' })).toBeVisible()
      const page = overlay.page
      const list = page.locator('[data-w-panel]').filter({ hasText: 'PoB builds' }).first()
      const panels = around([await detail.boundingBox(), await list.boundingBox()], 880)
      const rest: [number, number] = [900, 420]
      await page.mouse.move(...rest)
      const clip = await Clip.start(page, 'clip-pob', rest, panels)
      const to = async (target: Locator, ms = 550) => {
        const b = (await target.boundingBox())!
        await clip.moveTo(b.x + Math.min(b.width / 2, 60), b.y + b.height / 2, ms)
        await clip.click()
      }
      await clip.hold(600)
      // Change loadout: the next stage's gems, links and gear.
      await to(detail.getByRole('button', { name: /^Day 1\.5 Clusters$/ }))
      await clip.hold(1500)
      // Through the tabs.
      await to(detail.getByRole('tab', { name: 'Gear' }))
      await clip.hold(1300)
      const row = detail.locator('[class*="gearRow"]').first()
      if (await row.count()) {
        const rb = (await row.boundingBox())!
        await clip.moveTo(rb.x + 60, rb.y + rb.height / 2, 450)
        await clip.hold(1400)
      }
      await to(detail.getByRole('tab', { name: 'Filter' }))
      await clip.hold(1100)
      await to(detail.getByRole('tab', { name: 'Leveling' }))
      await clip.hold(600)
      // The passive tree, with what the next tree changes.
      await to(detail.getByRole('button', { name: 'Passive tree' }))
      const tree = page.locator('[data-w-panel]').filter({ hasText: 'Passive tree' }).filter({ has: page.locator('canvas') }).last()
      await expect(tree).toBeVisible()
      clip.look(around([await detail.boundingBox(), await tree.boundingBox()], 1280))
      await clip.hold(1200)
      await to(tree.getByRole('switch'), 500)
      await clip.hold(1200)
      await clip.poster()
      await clip.hold(1000)
      await to(tree.getByTitle('Close').first(), 500)
      clip.look(panels)
      await clip.hold(700)
      // Back to the first loadout, as the clip began.
      await to(detail.getByRole('button', { name: /^Day 1 No Cluster/ }))
      await clip.moveTo(...rest, 500)
      await clip.hold(600)
      await clip.save()
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('clip: price check, hover the listings', async ({ overlay }) => {
    await richListings(overlay.page)
    await overlay.boot()
    await backdrop(overlay, 'frames/town-inventory.jpg')
    const page = overlay.page
    const game = (x: number, y: number) => overlay.app.moveMouse(x, y)
    // The whole screen, so the checker looks as Awakened PoE Trade users know it.
    const rest: [number, number] = [1420, 470]
    const clip = await Clip.start(page, 'clip-price-check', rest, { x: 0, y: 0, width: 1920, height: 1080 })
    await clip.hold(700)
    // The body armour the character wears.
    await clip.moveTo(1582, 300, 700, 'game', game)
    await clip.keys(['Ctrl', 'D'], 1500, 390, () => overlay.copyItem('items/rare-body-armour-es.txt'))
    const panel = overlay.widget('price-check')
    const search = panel.getByRole('button', { name: 'Search' })
    await expect(search).toBeVisible()
    await allflameLabel(panel)
    const sb = (await search.boundingBox())!
    await clip.moveTo(sb.x + sb.width / 2, sb.y + sb.height / 2, 700)
    await clip.click()
    await clip.hold(900)
    await expect(panel.locator('.w-pc-foot')).toBeVisible()
    await allflameLabel(panel)
    await clip.hold(500)
    const rows = panel.locator('.w-pc-table tbody tr:not(.w-pc-yours)')
    for (const [n, i] of [0, 2, 5, 3].entries()) {
      const rb = (await rows.nth(i).boundingBox())!
      await clip.moveTo(rb.x + rb.width * 0.32, rb.y + rb.height / 2, 420)
      await expect(page.getByRole('tooltip')).toBeVisible()
      if (n === 0) await clip.poster()
      await clip.hold(1500)
    }
    await clip.moveTo(...rest, 700)
    await clip.hold(700)
    await clip.save()
  })
})

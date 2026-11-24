// Map price check: no trade search until you press Search (maps get checked
// by habit), and every mod on the map strip has an Any / Has / Not switch
// that goes into the search.
import type { Page } from '@playwright/test'
import { test, expect } from './harness'

// The map kind's "not" filters (pseudo/maps.ts): Elder or Shaper, a conqueror, the Originator.
const KIND_IDS = ['implicit.stat_1792283443', 'implicit.stat_2563183002', 'implicit.stat_2696470877']
const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }
type Query = { query: { stats: Array<{ type: string, filters: Array<{ id: string, disabled?: boolean, value?: unknown }>, disabled?: boolean }> } }

async function fakeTrade (page: Page) {
  const searches: Query[] = []
  await page.route('**/api/trade/search/**', (route) => {
    searches.push(route.request().postDataJSON())
    return route.fulfill({ contentType: 'application/json', headers: LIMITS, body: JSON.stringify({ id: 'q', total: 0, result: [] }) })
  })
  await page.route('**/api/trade/exchange/**', (route) => {
    searches.push(route.request().postDataJSON())
    return route.fulfill({ contentType: 'application/json', headers: LIMITS, body: JSON.stringify({ id: 'q', total: 0, result: {} }) })
  })
  return searches
}

test('map: no search until Search, then each mod searches as has or not', async ({ overlay }) => {
  const searches = await fakeTrade(overlay.page)
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods' }] })
  await overlay.copyItem('items/map-rare-t16-deadly.txt')
  const panel = overlay.widget('price-check')
  await expect(panel.getByText('Risky', { exact: true })).toBeVisible({ timeout: 20_000 })
  // Nothing went to trade on its own.
  await overlay.page.waitForTimeout(1500)
  expect(searches).toEqual([])
  // The rows below leave the map's mods to the strip; the Atlas Drops row has its label.
  await expect(panel).not.toContainText('item.map_atlas_drops')

  // Open the strip's mod list and set two mods.
  const strip = panel.locator('[data-map-trade] > button').first()
  if (await panel.locator('[data-map-mod]').count() === 0) await strip.click()
  const hexproof = panel.locator('[data-map-mod]').filter({ hasText: 'Monsters are Hexproof' })
  const twin = panel.locator('[data-map-mod]').filter({ hasText: 'two Unique Bosses' })
  await hexproof.locator('[data-state="not"]').click()
  await twin.locator('[data-state="has"]').click()
  await expect(hexproof.locator('[data-state="not"]')).toHaveAttribute('aria-checked', 'true')
  // Any other mod goes in from Trade search; the rows below don't offer it twice.
  await expect(panel.locator('[data-map-trade] [data-map-add-mod]')).toBeVisible()
  await expect(panel.getByPlaceholder(/Add a mod to search for/)).toHaveCount(1)
  await expect(panel.locator('[data-map-mod-picked]')).toHaveText('has 1 · not 1')
  // The map's numbers are chips on the strip, not rows below: Rarity on, Pack off.
  const rarity = panel.locator('[data-map-prop="Rarity"]')
  const pack = panel.locator('[data-map-prop="Pack"]')
  await expect(rarity).toHaveAttribute('aria-pressed', 'true')
  // The wheel moves the min the rows used to edit.
  const rarityMin = panel.locator('[data-map-prop-min="Rarity"]')
  const before = await rarityMin.inputValue()
  await rarity.hover()
  await overlay.page.mouse.wheel(0, -100)
  await expect(rarityMin).not.toHaveValue(before)
  // Says what the switches do.
  await expect(panel.locator('[data-map-mod] [data-state="not"]').first()).toHaveAttribute('title', 'Trade search finds maps without this mod')
  await pack.click()
  await expect(pack).toHaveAttribute('aria-pressed', 'false')
  await expect(panel.getByText('Monster Pack Size')).toHaveCount(0)
  await overlay.snap('map mods has and not')

  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => searches.length).toBeGreaterThan(0)
  const stats = searches[0].query.stats
  const not = stats.find(g => g.type === 'not')!
  // Hexproof, and the kinds this map isn't (on from the start, WOKEPOET-523).
  const hexNot = not.filters.filter(f => !KIND_IDS.includes(f.id))
  expect(hexNot.length).toBe(1)
  expect(hexNot[0].disabled).toBeFalsy()
  expect(not.filters.find(f => f.id === 'implicit.stat_1792283443')?.disabled).toBeFalsy()
  const and = stats.find(g => g.type === 'and')!
  expect(and.filters.filter(f => !f.disabled).length).toBeGreaterThanOrEqual(1)
  // Pack size went out of the search with its chip.
  const filters = searches[0].query as unknown as { filters?: { map_filters?: { filters?: Record<string, { min?: number } | undefined> } } }
  expect(filters.filters?.map_filters?.filters?.map_packsize).toBeUndefined()
  expect(overlay.errors).toEqual([])
})

// Guy's pick A (2026-11-23): every number on the strip is a chip filter. The
// More Currency / More Maps totals are chips too, not lines below; off chips
// say they're clickable, and the min is typed in the chip.
test('map: every number is a chip filter, typed min goes into the search', async ({ overlay }) => {
  const searches = await fakeTrade(overlay.page)
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods' }] })
  await overlay.copyItem('items/map-originator-more.txt')
  const panel = overlay.widget('price-check')
  const currency = panel.locator('[data-map-prop="Currency"]')
  const maps = panel.locator('[data-map-prop="Maps"]')
  const drops = panel.locator('[data-map-prop="Drops"]')
  await expect(currency).toBeVisible({ timeout: 20_000 })
  // Currency and Rarity start on (Rarity too, More Currency or not), Maps and Drops off.
  await expect(currency).toHaveAttribute('aria-pressed', 'true')
  await expect(panel.locator('[data-map-prop="Rarity"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(maps).toHaveAttribute('aria-pressed', 'false')
  await expect(drops).toHaveAttribute('aria-pressed', 'false')
  // Drops says why it's off.
  await expect(drops).toHaveAttribute('title', /no listings/)
  // No second control for the same number in the lines below.
  await expect(panel.getByText(/More Currency: 92%/)).toHaveCount(0)
  await expect(panel.getByText(/More Maps: 35%/)).toHaveCount(0)

  await maps.click()
  await expect(maps).toHaveAttribute('aria-pressed', 'true')
  const curMin = panel.locator('[data-map-prop-min="Currency"]')
  await curMin.fill('70')
  await curMin.press('Enter')
  // Past the map's own number is clamped to it.
  const mapsMin = panel.locator('[data-map-prop-min="Maps"]')
  await mapsMin.fill('99')
  await mapsMin.press('Enter')
  await expect(mapsMin).toHaveValue('35')
  await overlay.snap('map chips all filters')
  expect(searches).toEqual([])

  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => searches.length).toBeGreaterThan(0)
  const and = searches[0].query.stats.find(g => g.type === 'and')!
  const byId = (id: string) => and.filters.find(f => f.id === id)
  expect(byId('pseudo.pseudo_map_more_currency_drops')?.disabled).toBeFalsy()
  expect(byId('pseudo.pseudo_map_more_currency_drops')?.value).toMatchObject({ min: 70 })
  expect(byId('pseudo.pseudo_map_more_map_drops')?.disabled).toBeFalsy()
  expect(byId('pseudo.pseudo_map_more_map_drops')?.value).toMatchObject({ min: 35 })
  // Atlas Drops stayed out.
  const q = searches[0].query as unknown as { filters?: { map_filters?: { filters?: Record<string, unknown> } } }
  expect(q.filters?.map_filters?.filters?.map_bonus).toBeUndefined()
  expect(overlay.errors).toEqual([])
})

// WOKEPOET-523: Elder (and Shaper) maps list cheap and crowd a search for
// Originator maps, so No Elder starts on. Exchange searches the map's bulk
// exchange entry, one seller per row with their stock, only on the click.
test('map: No Elder starts on; Exchange lists the bulk exchange entry, and back', async ({ overlay, fakeApp }) => {
  const searches: Query[] = []
  const wants: string[][] = []
  await overlay.page.route('**/api/trade/search/**', (route) => {
    searches.push(route.request().postDataJSON())
    return route.fulfill({ contentType: 'application/json', headers: LIMITS, body: JSON.stringify({ id: 'q', total: 0, result: [] }) })
  })
  const offer = (id: string, amount: number, stock: number) => ({
    id,
    item: null,
    listing: {
      indexed: new Date().toISOString(),
      account: { name: `${id}#1`, lastCharacterName: `${id}c`, online: { league: 'Testleague' } },
      offers: [{ exchange: { currency: 'chaos', amount, whisper: '{0} Chaos Orb' }, item: { currency: 'zana-map-tier-16', amount: 1, stock, id, whisper: '{0} Map (Tier 16) (Memory-Influenced)' } }],
      whisper: `@${id}c Hi, I'd like to buy your {0} for my {1} in Testleague.`
    }
  })
  await overlay.page.route('**/api/trade/exchange/**', (route) => {
    wants.push(JSON.parse(route.request().postData()!).query.want)
    const rows = [offer('s1', 5, 36), offer('s2', 60, 1400)]
    return route.fulfill({ contentType: 'application/json', headers: LIMITS, body: JSON.stringify({ id: 'xq', total: 2, result: Object.fromEntries(rows.map(r => [r.id, r])) }) })
  })
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods' }] })
  await overlay.copyItem('items/map-originator-t16.txt')
  const panel = overlay.widget('price-check')
  // Guy (2026-11-24): No Elder became the Kind switch: this kind only, or any kind.
  const noElder = panel.locator('[data-map-kind] [data-kind="this"]')
  await expect(noElder).toBeVisible({ timeout: 20_000 })
  await expect(noElder).toHaveText('Originator')
  await expect(noElder).toHaveAttribute('title', /Searching only Originator maps \(this map's kind\)/)
  const anyKind = panel.locator('[data-map-kind] [data-kind="any"]')
  await expect(anyKind).toHaveAttribute('aria-pressed', 'false')
  // The switch stands in for the row below.
  await expect(panel.getByText('Area is influenced by The Elder or The Shaper')).toHaveCount(0)
  await overlay.page.waitForTimeout(1000)
  expect(searches).toEqual([])
  expect(wants).toEqual([])

  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => searches.length).toBe(1)
  const not = searches[0].query.stats.find(g => g.type === 'not')!
  // Shaper and Elder each by option: with no option it matched nothing.
  expect(not.filters.filter(f => f.id === 'implicit.stat_1792283443')).toEqual([
    { id: 'implicit.stat_1792283443', value: { option: 1 } },
    { id: 'implicit.stat_1792283443', value: { option: 2 } }
  ])

  // Off: the next search includes them.
  await anyKind.click()
  await expect(anyKind).toHaveAttribute('aria-pressed', 'true')
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => searches.length).toBe(2)
  const not2 = searches[1].query.stats.find(g => g.type === 'not')
  expect(not2?.filters.find(f => f.id === 'implicit.stat_1792283443')?.disabled ?? true).toBe(true)

  // Exchange, from the listings' toolbar: the Memory-Influenced T16 entry.
  const chip = panel.locator('[data-exchange-chip]')
  await expect(chip).toHaveAttribute('title', /Memory-Influenced Map \(Tier 16\)/)
  await chip.click()
  await expect.poll(() => wants.length).toBe(1)
  expect(wants[0]).toEqual(['zana-map-tier-16'])
  // Stock and the fulfill count both read 1400.
  await expect(panel.getByText('1400', { exact: true }).first()).toBeVisible()
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
  expect(searches.length).toBe(2)
  // Faustus's Currency Exchange doesn't trade maps: no banner saying it does.
  await expect(panel.getByText(/Currency Exchange/)).toHaveCount(0)
  // A click on a seller whispers them for the count in Buy (WOKEPOET-523).
  await panel.locator('[data-bulk-buy]').fill('10')
  const big = panel.locator('[data-bulk-whisper]').filter({ hasText: '1400' })
  await expect(big).toHaveAttribute('title', /Click to whisper: @s2c .*10 Map/)
  await big.click()
  const text = "@s2c Hi, I'd like to buy your 10 Map (Tier 16) (Memory-Influenced) for my 600 Chaos Orb in Testleague."
  await expect.poll(() => fakeApp.received.some(e => e.name === 'CLIENT->MAIN::user-action' &&
    (e.payload as { action?: string, text?: string }).action === 'paste-in-chat' &&
    (e.payload as { text?: string }).text === text)).toBe(true)
  await expect(panel.locator('[data-bulk-whispered]')).toHaveText('Whispered s2c')
  await overlay.snap('map exchange sellers')

  // Back to the listings: the same trade search again (from the cache, as it's unchanged).
  await chip.click()
  await expect(panel.getByText('1400', { exact: true })).toHaveCount(0)
  await expect(panel.locator('[data-exchange-chip]')).not.toHaveAttribute('aria-pressed', 'true')
  await expect(panel.locator('.w-pc-foot, .w-pc-matched').first()).toBeVisible()
  expect(wants.length).toBe(1)
  expect(overlay.errors).toEqual([])
})

// Guy (2026-11-24): one click unticks every number and mod to search the plain
// map; a second click brings them back. Neither click searches.
test('map: Base map unticks every chip and mod, and brings them back', async ({ overlay }) => {
  const searches = await fakeTrade(overlay.page)
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods' }] })
  await overlay.copyItem('items/map-rare-t16-deadly.txt')
  const panel = overlay.widget('price-check')
  const base = panel.locator('[data-map-base]')
  const pack = panel.locator('[data-map-prop="Pack"]')
  const rarity = panel.locator('[data-map-prop="Rarity"]')
  await expect(base).toBeVisible({ timeout: 20_000 })
  await expect(base).toHaveAttribute('aria-pressed', 'false')
  // A mod set to Not goes too.
  const strip = panel.locator('[data-map-trade] > button').first()
  if (await panel.locator('[data-map-mod]').count() === 0) await strip.click()
  const hexproof = panel.locator('[data-map-mod]').filter({ hasText: 'Monsters are Hexproof' })
  await hexproof.locator('[data-state="not"]').click()

  await base.click()
  await expect(base).toHaveAttribute('aria-pressed', 'true')
  for (const chip of await panel.locator('[data-map-prop]').all()) await expect(chip).toHaveAttribute('aria-pressed', 'false')
  await expect(hexproof.locator('[data-state="any"]')).toHaveAttribute('aria-checked', 'true')
  await overlay.page.waitForTimeout(500)
  expect(searches).toEqual([])

  await base.click()
  await expect(base).toHaveAttribute('aria-pressed', 'false')
  await expect(pack).toHaveAttribute('aria-pressed', 'true')
  await expect(rarity).toHaveAttribute('aria-pressed', 'true')
  await expect(hexproof.locator('[data-state="not"]')).toHaveAttribute('aria-checked', 'true')

  // Plain map: the search carries no number and no mod.
  await base.click()
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => searches.length).toBeGreaterThan(0)
  const groups = searches[0].query.stats
  // Nothing at all: no mod, no total, no mod count. The kind stays: it's what the map is.
  expect(groups.flatMap(g => g.disabled ? [] : g.filters.filter(f => !f.disabled && !KIND_IDS.includes(f.id)))).toEqual([])
  const q = searches[0].query as unknown as { filters?: { map_filters?: { filters?: Record<string, unknown> } } }
  expect(q.filters?.map_filters?.filters?.map_iir).toBeUndefined()
  expect(q.filters?.map_filters?.filters?.map_packsize).toBeUndefined()
  expect(q.filters?.map_filters?.filters?.map_iiq).toBeUndefined()
  expect(overlay.errors).toEqual([])
})

// Guy (2026-11-24): the map's influence (here the Originator) is the base map,
// so Base map keeps it in the search, and so does the Bulk tab.
test('map: Base map and the Bulk tab keep the map\'s influence', async ({ overlay }) => {
  const searches = await fakeTrade(overlay.page)
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods' }] })
  await overlay.copyItem('items/map-originator-implicit.txt')
  const panel = overlay.widget('price-check')
  const base = panel.locator('[data-map-base]')
  await expect(base).toBeVisible({ timeout: 20_000 })
  await base.click()
  await expect(base).toHaveAttribute('aria-pressed', 'true')
  const search = panel.getByRole('button', { name: 'Search', exact: true })
  const ORIGINATOR = 'implicit.stat_2696470877'
  const onIds = (q: Query) => q.query.stats.flatMap(g => g.disabled ? [] : g.filters.filter(f => !f.disabled).map(f => f.id))
  await search.click()
  await expect.poll(() => searches.length).toBeGreaterThan(0)
  // And the kinds it isn't (WOKEPOET-523): Elder or Shaper by 2 options, a conqueror's Citadel by 4.
  const CONQ = 'implicit.stat_2563183002'
  expect(onIds(searches[0]).sort()).toEqual([ORIGINATOR, 'implicit.stat_1792283443', 'implicit.stat_1792283443', CONQ, CONQ, CONQ, CONQ].sort())

  await panel.locator('[data-trade-presets]').getByText('Bulk', { exact: true }).click()
  const before = searches.length
  await search.click()
  await expect.poll(() => searches.length).toBeGreaterThan(before)
  expect(onIds(searches[searches.length - 1])).toContain(ORIGINATOR)
  expect(overlay.errors).toEqual([])
})

// Guy's pick (veteran review, 2026-11-24): a Farming switch on the map's Trade
// search picks which numbers start on, and is remembered for the next map.
test('map: the farming goal picks which number chips start on', async ({ overlay }) => {
  const searches = await fakeTrade(overlay.page)
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods' }] })
  await overlay.copyItem('items/map-originator-more.txt')
  const panel = overlay.widget('price-check')
  const chip = (label: string) => panel.locator(`[data-map-prop="${label}"]`)
  const goal = (g: string) => panel.locator(`[data-map-goal] [data-goal="${g}"]`)
  await expect(chip('Currency')).toBeVisible({ timeout: 20_000 })
  // Any to start: the chips as they always were.
  await expect(goal('any')).toHaveAttribute('aria-checked', 'true')
  await expect(chip('Currency')).toHaveAttribute('aria-pressed', 'true')
  await expect(chip('Maps')).toHaveAttribute('aria-pressed', 'false')
  // Each number says what it raises.
  await expect(chip('Drops')).toHaveAttribute('title', /not currency/)
  await expect(chip('Rarity')).toHaveAttribute('title', /better currency/)

  await goal('atlas').click()
  await expect(goal('atlas')).toHaveAttribute('aria-checked', 'true')
  await expect(chip('Maps')).toHaveAttribute('aria-pressed', 'true')
  await expect(chip('Pack')).toHaveAttribute('aria-pressed', 'true')
  await expect(chip('Currency')).toHaveAttribute('aria-pressed', 'false')
  await expect(chip('Rarity')).toHaveAttribute('aria-pressed', 'false')
  // Atlas Drops can't be searched (no listings), so it stays off.
  await expect(chip('Drops')).toHaveAttribute('aria-pressed', 'false')
  await overlay.snap('map farming goal')
  expect(searches).toEqual([])

  // The next map starts on the goal.
  await overlay.copyItem('items/map-originator-more.txt')
  await expect(goal('atlas')).toHaveAttribute('aria-checked', 'true')
  await expect(chip('Maps')).toHaveAttribute('aria-pressed', 'true')
  await expect(chip('Currency')).toHaveAttribute('aria-pressed', 'false')
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => searches.length).toBeGreaterThan(0)
  const and = searches[0].query.stats.find(g => g.type === 'and')!
  const byId = (id: string) => and.filters.find(f => f.id === id)
  expect(byId('pseudo.pseudo_map_more_map_drops')?.disabled).toBeFalsy()
  expect(byId('pseudo.pseudo_map_more_currency_drops')?.disabled).toBe(true)
  const q = searches[0].query as unknown as { filters?: { map_filters?: { filters?: Record<string, unknown> } } }
  expect(q.filters?.map_filters?.filters?.map_iir).toBeUndefined()

  // Currency flips it back.
  await goal('currency').click()
  await expect(chip('Currency')).toHaveAttribute('aria-pressed', 'true')
  await expect(chip('Rarity')).toHaveAttribute('aria-pressed', 'true')
  await expect(chip('Maps')).toHaveAttribute('aria-pressed', 'false')
  expect(overlay.errors).toEqual([])
})

// Guy (2026-11-24): a buried Sentinel is never searched by default, and an Evocator
// searches any of the three kinds until narrowed to this one.
test('map: Sentinels start Any; an Evocator searches any of the three, or this one', async ({ overlay }) => {
  const searches = await fakeTrade(overlay.page)
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods' }] })
  await overlay.copyItem('items/map-sentinel-t16.txt')
  const panel = overlay.widget('price-check')
  await expect(panel.locator('[data-map-trade]')).toBeVisible({ timeout: 20_000 })
  const strip = panel.locator('[data-map-trade] > button').first()
  if (await panel.locator('[data-map-mod]').count() === 0) await strip.click()
  const sentinel = panel.locator('[data-map-mod]').filter({ hasText: 'buried Stalker Sentinel' })
  const evocator = panel.locator('[data-map-mod]').filter({ hasText: 'Evocator of Beidat' })
  await expect(sentinel.locator('[data-state="any"]')).toHaveAttribute('aria-checked', 'true')
  const anyOf = evocator.locator('[data-map-any-of]')
  await expect(anyOf).toHaveText('any Evocator')
  await evocator.locator('[data-state="has"]').click()
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => searches.length).toBe(1)
  const groupWith = (q: Query, id: string) => q.query.stats.find(g => g.filters.some(f => f.id === id))
  const any = groupWith(searches[0], 'explicit.stat_260515856')!
  expect(any.type).toBe('count')
  expect(any.filters.map(f => f.id).sort()).toEqual(['explicit.stat_1290924623', 'explicit.stat_260515856', 'explicit.stat_2896557935'])
  // The Sentinel stayed out of the search.
  expect(groupWith(searches[0], 'explicit.stat_2712450522')?.disabled ?? true).toBe(true)

  await anyOf.click()
  await expect(anyOf).toHaveText('this one')
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => searches.length).toBe(2)
  const exact = groupWith(searches[1], 'explicit.stat_260515856')!
  expect(exact.type).toBe('and')
  expect(exact.filters.filter(f => f.id.startsWith('explicit.stat_') && ['explicit.stat_1290924623', 'explicit.stat_2896557935'].includes(f.id))).toEqual([])
  expect(overlay.errors).toEqual([])
})

// Guy (2026-11-24): one place for the map's lines. The influence is the Kind switch, not a line
// in the list and not again in rows under it; the numbers are tiles.
test('map: the kind is one switch, the list holds only mods, and the numbers are tiles', async ({ overlay }) => {
  const searches = await fakeTrade(overlay.page)
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods' }] })
  await overlay.copyItem('items/map-originator-elder.txt')
  const panel = overlay.widget('price-check')
  const kind = panel.locator('[data-map-kind] [data-kind="this"]')
  await expect(kind).toBeVisible({ timeout: 20_000 })
  await expect(kind).toHaveText('Elder Originator')
  // Game art: the Elder's mark and the Originator's orb (and the menu's caret).
  await expect(kind.locator('img, i')).toHaveCount(3)
  const strip = panel.locator('[data-map-trade] > button').first()
  if (await panel.locator('[data-map-mod]').count() === 0) await strip.click()
  await expect(panel.locator('[data-map-mod]').first()).toBeVisible()
  // Listed nowhere else: not in the strip's list, not as a row under it.
  await expect(panel.getByText("Originator's Memories")).toHaveCount(0)
  await expect(panel.getByText('influenced by The Elder')).toHaveCount(0)
  await expect(panel.locator('[data-map-tile]')).toHaveCount(4)
  await overlay.snap('map-one-list-tiles')

  const ORIGINATOR = 'implicit.stat_2696470877'
  const onIds = (q: Query) => q.query.stats.flatMap(g => g.disabled ? [] : g.filters.filter(f => !f.disabled).map(f => f.id))
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => searches.length).toBe(1)
  expect(onIds(searches[0])).toContain(ORIGINATOR)
  // Any kind: no influence in the search.
  await panel.locator('[data-map-kind] [data-kind="any"]').click()
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => searches.length).toBe(2)
  expect(onIds(searches[1]).filter(id => id.startsWith('implicit.'))).toEqual([])
  // The menu: Any Originator searches the Originator only, whatever else the map is.
  await kind.click()
  const menu = panel.locator('[data-map-kind-menu]')
  await expect(menu.locator('[data-kind-option]')).toHaveCount(10)
  await expect(menu.locator('[data-kind-option="elder Originator"]')).toContainText('(this map)')
  await overlay.snap('map-kind-menu')
  await menu.locator('[data-kind-option="any-originator"]').click()
  await expect(menu).toHaveCount(0)
  await expect(kind).toHaveText('Any Originator')
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => searches.length).toBe(3)
  expect(onIds(searches[2]).filter(id => id.startsWith('implicit.'))).toEqual([ORIGINATOR])
  expect(overlay.errors).toEqual([])
})

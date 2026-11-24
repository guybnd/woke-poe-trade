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
  // The tile's head: its min box takes the rest.
  await rarity.hover({ position: { x: 12, y: 8 } })
  await overlay.page.mouse.wheel(0, -100)
  await expect(rarityMin).not.toHaveValue(before)
  // Says what the switches do.
  await expect(panel.locator('[data-map-mod] [data-state="not"]').first()).toHaveAttribute('title', 'Trade search finds maps without this mod')
  await pack.click({ position: { x: 12, y: 8 } })
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
  // Currency, Rarity and Drops start on (Rarity too, More Currency or not), Maps off.
  await expect(currency).toHaveAttribute('aria-pressed', 'true')
  await expect(panel.locator('[data-map-prop="Rarity"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(maps).toHaveAttribute('aria-pressed', 'false')
  // Guy (2026-11-24): the trade site's Atlas Drops filter works, so it searches like the rest.
  await expect(drops).toHaveAttribute('aria-pressed', 'true')
  await expect(drops).not.toHaveAttribute('title', /no listings/)
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
  // Atlas Drops went in as a map filter.
  const q = searches[0].query as unknown as { filters?: { map_filters?: { filters?: Record<string, unknown> } } }
  expect(q.filters?.map_filters?.filters?.map_bonus).toBeDefined()
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
  // One row per price (Guy, 2026-11-24): 36 maps at 5c, 1400 at 60c.
  const steps = panel.locator('[data-bulk-step]')
  await expect(steps).toHaveCount(2)
  await expect(steps.nth(1)).toContainText('1400')
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
  expect(searches.length).toBe(2)
  // Faustus's Currency Exchange doesn't trade maps: no banner saying it does.
  await expect(panel.getByText(/Currency Exchange/)).toHaveCount(0)
  // Buy 40: what it costs from the cheapest up (36 at 5c, 4 at 60c).
  await panel.locator('[data-bulk-buy]').fill('40')
  await expect(panel.locator('[data-bulk-total]')).toContainText('Buy 40 → 420')
  await expect(panel.locator('[data-bulk-total]')).toContainText('2 sellers')
  // The cheapest price starts open; the 60c one opens on a click, its seller with an amount and Whisper.
  await steps.nth(1).click()
  const amount = panel.locator('[data-bulk-amount]').nth(1)
  await expect(amount).toHaveValue('4')
  // More than they have snaps to their stock.
  await amount.fill('5000')
  await amount.blur()
  await expect(amount).toHaveValue('1400')
  await amount.fill('10')
  await amount.blur()
  const big = panel.locator('[data-bulk-whisper]').nth(1)
  await expect(big).toHaveAttribute('title', /Whisper: @s2c .*10 Map/)
  await big.click()
  const text = "@s2c Hi, I'd like to buy your 10 Map (Tier 16) (Memory-Influenced) for my 600 Chaos Orb in Testleague."
  await expect.poll(() => fakeApp.received.some(e => e.name === 'CLIENT->MAIN::user-action' &&
    (e.payload as { action?: string, text?: string }).action === 'paste-in-chat' &&
    (e.payload as { text?: string }).text === text)).toBe(true)
  await expect(panel.locator('[data-bulk-whispered]')).toHaveText('Whispered s2c')
  // Whisper next works down the buy's sellers, cheapest first, each for what the buy takes.
  await panel.locator('[data-bulk-next]').click()
  const first = "@s1c Hi, I'd like to buy your 36 Map (Tier 16) (Memory-Influenced) for my 180 Chaos Orb in Testleague."
  await expect.poll(() => fakeApp.received.some(e => (e.payload as { text?: string })?.text === first)).toBe(true)
  await expect(panel.locator('[data-bulk-next]')).toContainText('(2/2)')
  await overlay.snap('map exchange sellers')

  // Back to the listings: the same trade search again (from the cache, as it's unchanged).
  await chip.click()
  await expect(panel.locator('[data-bulk-step]')).toHaveCount(0)
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
  // Atlas Drops is a maps number, and the trade site searches it.
  await expect(chip('Drops')).toHaveAttribute('aria-pressed', 'true')
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
  // A tick box with a fixed label (Guy: "which one am I clicking for?"), ticked = any of the three.
  await expect(anyOf).toBeChecked()
  await expect(evocator.locator('label', { has: overlay.page.locator('[data-map-any-of]') })).toHaveText('any Evocator')
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
  await expect(anyOf).not.toBeChecked()
  await expect(evocator.locator('label', { has: overlay.page.locator('[data-map-any-of]') })).toHaveText('any Evocator')
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

// Guy (2026-11-24): any map number can be searched, also one this map hasn't got.
test('map: the + tile adds a number this map hasn\'t got, with its own minimum', async ({ overlay }) => {
  const searches = await fakeTrade(overlay.page)
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods' }] })
  await overlay.copyItem('items/map-originator-elder.txt')
  const panel = overlay.widget('price-check')
  const add = panel.locator('[data-map-add-prop]')
  await expect(add).toBeVisible({ timeout: 20_000 })
  const own = await panel.locator('[data-map-tile]').count()
  await add.click()
  const menu = panel.locator('[data-map-add-prop-menu]')
  await expect(menu.locator('[data-add-prop="Maps"]')).toBeVisible()
  // Never a number the map already has, and each with its icon.
  for (const label of await panel.locator('[data-map-tile] [data-map-prop]').evaluateAll(els => els.map(e => e.getAttribute('data-map-prop')))) {
    await expect(menu.locator(`[data-add-prop="${label}"]`)).toHaveCount(0)
  }
  await expect(menu.locator('[data-add-prop="Maps"]').locator('img, i')).toHaveCount(1)
  await overlay.snap('map-add-number-menu')
  await menu.locator('[data-add-prop="Maps"]').click()
  await expect(menu).toHaveCount(0)
  await expect(panel.locator('[data-map-tile]')).toHaveCount(own + 1)
  const box = panel.locator('[data-map-prop-min="Maps"]')
  await box.fill('40')
  await box.press('Enter')
  await overlay.snap('map-added-number')
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => searches.length).toBe(1)
  const maps = searches[0].query.stats.flatMap(g => g.filters).find(f => f.id === 'pseudo.pseudo_map_more_map_drops')
  expect(maps).toMatchObject({ value: { min: 40 }, disabled: false })
  // Click the tile to take it back out: it returns to the menu.
  await panel.locator('[data-map-extra] [data-map-prop="Maps"]').click({ position: { x: 12, y: 8 } })
  await expect(panel.locator('[data-map-tile]')).toHaveCount(own)
  // Never a row under the strip.
  await expect(panel.getByText('More Maps: #%')).toHaveCount(0)
  expect(overlay.errors).toEqual([])
})

// Guy (2026-11-24, his own map): "why show mods in two places? why are they unclickable
// in the top list? ... rare map mods that are yellow ... any evocator type". The
// 3.30 rare-only map mods must be in the strip's one list, yellow, with Any/Has/Not,
// and a buried Sentinel (or Evocator) offers "any" of its kinds. Nothing listed twice.
test('map: rare-only mods sit in the one list, yellow and searchable, any Sentinel kind', async ({ overlay }) => {
  const searches = await fakeTrade(overlay.page)
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods' }] })
  await overlay.copyItem('items/map-originator-special.txt')
  const panel = overlay.widget('price-check')
  await expect(panel.locator('[data-map-kind]')).toBeVisible({ timeout: 20_000 })
  const strip = panel.locator('[data-map-trade] > button').first()
  if (await panel.locator('[data-map-mod]').count() === 0) await strip.click()
  const rows = panel.locator('[data-map-mod]')
  // Every mod line of the map, each once, each with its switches.
  const lines = ['increased Area of Effect', 'fire 2 additional Projectiles', 'more Monster Life', 'Chain 3 additional times',
    'Chain when colliding with Terrain', 'buried Stalker Sentinel', 'Mirror of Delirium', 'Area contains a Mirage']
  for (const line of lines) {
    await expect(panel.getByText(line)).toHaveCount(1)
    await expect(rows.filter({ hasText: line }).locator('[data-state]')).toHaveCount(3)
  }
  // No second block of mod rows under the strip.
  await expect(panel.locator('[data-map-trade]').getByText(/of 3|of 8/)).toHaveCount(0)
  // The rare-only ones are marked and yellow.
  await expect(panel.locator('[data-map-mod][data-rare-only]')).toHaveCount(3)
  const color = await panel.locator('[data-map-mod][data-rare-only]').first().getByText('buried Stalker Sentinel')
    .evaluate(el => getComputedStyle(el).color)
  expect(color).toBe('rgb(255, 255, 119)')
  // Any buried Sentinel by default, narrowable to this one.
  const sentinel = rows.filter({ hasText: 'buried Stalker Sentinel' })
  const anyOf = sentinel.locator('[data-map-any-of]')
  await expect(anyOf).toBeChecked()
  await expect(sentinel.locator('label', { has: overlay.page.locator('[data-map-any-of]') })).toHaveText('any buried Sentinel')
  // Guy (2026-11-24): the switches stay in one column; the tick box sits left of them.
  const segX = await rows.locator('[role="radiogroup"]').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().right)))
  expect(new Set(segX).size).toBe(1)
  const tickX = (await sentinel.locator('label', { has: overlay.page.locator('[data-map-any-of]') }).boundingBox())!.x
  expect(tickX).toBeLessThan((await sentinel.locator('[role="radiogroup"]').boundingBox())!.x)
  await sentinel.locator('[data-state="has"]').click()
  // Picked, it shows its search state like any other mod (green for Has).
  expect(await sentinel.getByText('buried Stalker Sentinel').evaluate(el => getComputedStyle(el).color)).not.toBe('rgb(255, 255, 119)')
  // Guy (2026-11-24): clicking the row cycles it, as in the price check: Has, Not, Any.
  const mirror = rows.filter({ hasText: 'Mirror of Delirium' })
  const checked = () => mirror.locator('[aria-checked="true"]')
  for (const state of ['has', 'not', 'any']) {
    await mirror.getByText('Mirror of Delirium').click()
    await expect(checked()).toHaveAttribute('data-state', state)
  }
  // Guy (2026-11-24): the rating is a word chip on the row, clicked through Bad, Care, Want
  // and saved to the profile; the header no longer names the mods a second time.
  const chipOf = mirror.locator('[data-map-rate]')
  await expect(chipOf).toHaveText('–')
  const at = async () => (await rows.allInnerTexts()).findIndex(t => t.includes('Mirror of Delirium'))
  const before = await at()
  for (const word of ['Bad', 'Care', 'Want', '–']) {
    await chipOf.click()
    await expect(chipOf).toHaveText(word)
    if (word === 'Bad') await expect(panel.locator('[data-map-trade] > button').first()).not.toContainText('Mirror')
    // The row stays put, so the next click rates the same mod.
    expect(await at()).toBe(before)
  }
  await expect(mirror.locator('[aria-checked="true"]')).toHaveAttribute('data-state', 'any')
  const mirage = rows.filter({ hasText: 'Area contains a Mirage' })
  await mirage.locator('[data-state="not"]').click()
  // The + for more numbers sits on the tiles' row.
  const tile = await panel.locator('[data-map-tile]').first().boundingBox()
  const add = await panel.locator('[data-map-add-prop]').boundingBox()
  expect(Math.abs(add!.y - tile!.y)).toBeLessThan(8)
  // Guy (2026-11-24, "cant these all fit in one row"): with every number added, still one row.
  for (const label of ['Threads', 'Maps', 'Div cards']) {
    await panel.locator('[data-map-add-prop]').click()
    await panel.locator(`[data-map-add-prop-menu] [data-add-prop="${label}"]`).click()
  }
  await expect(panel.locator('[data-map-tile]')).toHaveCount(7)
  const ys = await panel.locator('[data-map-tile]').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().top)))
  expect(new Set(ys).size).toBe(1)
  await overlay.snap('map-tiles-one-row')
  // Take them back out (first number only, at its head: the min box takes the rest).
  for (const label of ['Threads', 'Maps', 'Div cards']) await panel.locator(`[data-map-extra] [data-map-prop="${label}"]`).click({ position: { x: 8, y: 6 } })
  await expect(panel.locator('[data-map-tile]')).toHaveCount(4)
  await overlay.snap('map-rare-only-mods')
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => searches.length).toBe(1)
  const stats = searches[0].query.stats
  // Has any buried Sentinel: a count group of its three kinds.
  const any = stats.find(g => g.type === 'count')!
  expect(any.filters.length).toBe(3)
  expect(stats.find(g => g.type === 'not')!.filters.some(f => !f.disabled && !KIND_IDS.includes(f.id))).toBe(true)
  expect(overlay.errors).toEqual([])
})

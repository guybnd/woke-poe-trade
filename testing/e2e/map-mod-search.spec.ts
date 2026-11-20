// Map price check: no trade search until you press Search (maps get checked
// by habit), and every mod on the map strip has an Any / Has / Not switch
// that goes into the search.
import type { Page } from '@playwright/test'
import { test, expect } from './harness'

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
  const before = await rarity.textContent()
  await rarity.hover()
  await overlay.page.mouse.wheel(0, -100)
  await expect(rarity).not.toHaveText(before!)
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
  expect(not.filters.length).toBe(1)
  expect(not.filters[0].disabled).toBeFalsy()
  const and = stats.find(g => g.type === 'and')!
  expect(and.filters.filter(f => !f.disabled).length).toBeGreaterThanOrEqual(1)
  // Pack size went out of the search with its chip.
  const filters = searches[0].query as unknown as { filters?: { map_filters?: { filters?: Record<string, { min?: number } | undefined> } } }
  expect(filters.filters?.map_filters?.filters?.map_packsize).toBeUndefined()
  expect(overlay.errors).toEqual([])
})

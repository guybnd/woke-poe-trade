// Valdo maps: a rare "Valdo Map" with a Reward line, Unmodifiable and Foil.
// The Valdo strip sets Void (Any / Void / No void) and the Reward, with a
// picker for another reward; its mods are a folded list, not "couldn't read".
import { test, expect } from './harness'

const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }
type Query = { query: { type?: string, stats: Array<{ type: string, filters: Array<{ id: string, disabled?: boolean }>, disabled?: boolean }>, filters: { map_filters?: { filters: { map_completion_reward?: { option?: string } } } } } }
const VOID = 'explicit.stat_1095765106'

function voidSearch (q: Query): 'has' | 'not' | 'any' {
  for (const g of q.query.stats) {
    if (g.disabled) continue
    if (g.filters.some(f => f.id === VOID && !f.disabled)) return g.type === 'not' ? 'not' : 'has'
  }
  return 'any'
}

test('a Valdo map searches its reward and Void, and can pick another reward', async ({ overlay }) => {
  const searches: Query[] = []
  await overlay.page.route('**/api/trade/search/**', (route) => {
    searches.push(route.request().postDataJSON())
    return route.fulfill({ contentType: 'application/json', headers: LIMITS, body: JSON.stringify({ id: 'q', total: 0, result: [] }) })
  })
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods' }] })
  await overlay.copyItem('items/map-valdo-void.txt')
  const panel = overlay.widget('price-check')
  const strip = panel.locator('[data-valdo-strip]')
  await expect(strip).toBeVisible({ timeout: 20_000 })
  // Not the map mods strip, and nothing about mods it couldn't read.
  await expect(panel).not.toContainText("couldn't read")
  await expect(panel.locator('[data-map-strip]')).toHaveCount(0)
  // A void map searches void maps, with its own reward.
  await expect(strip.locator('[data-valdo-void] [data-state="has"]')).toHaveAttribute('aria-checked', 'true')
  await expect(strip.locator('[data-valdo-reward-pick]')).toHaveText(/Foil Nimis/)
  // The mods fold open, Void first, without the "Unscalable Value" tag.
  await strip.locator('[data-valdo-mods-toggle]').click()
  await expect(strip.locator('[data-valdo-mods] li').first()).toHaveText('Players who Die in area are sent to the Void')
  await expect(strip.locator('[data-valdo-mods]')).toContainText('Players cannot gain Flask Charges')
  await expect(strip.locator('[data-valdo-mods]')).not.toContainText('Unscalable')
  await overlay.snap('valdo map strip')

  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => searches.length).toBe(1)
  expect(searches[0].query.filters.map_filters?.filters.map_completion_reward?.option).toBe('Nimis')
  expect(voidSearch(searches[0])).toBe('has')

  // Another reward, and no void.
  await strip.locator('[data-valdo-void] [data-state="not"]').click()
  await strip.locator('[data-valdo-reward-pick]').click()
  await strip.getByLabel('Reward to search for').fill('headhunt')
  await strip.locator('[data-valdo-option="Headhunter"]').click()
  await expect(strip.locator('[data-valdo-reward-pick]')).toHaveText(/Foil Headhunter/)
  await overlay.snap('valdo map other reward')
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => searches.length).toBe(2)
  expect(searches[1].query.filters.map_filters?.filters.map_completion_reward?.option).toBe('Headhunter')
  expect(voidSearch(searches[1])).toBe('not')

  // Any reward, either Void.
  await strip.locator('[data-valdo-void] [data-state="any"]').click()
  await strip.locator('[data-valdo-reward-pick]').click()
  await strip.locator('[data-valdo-option="any"]').click()
  await expect(strip.locator('[data-valdo-reward-pick]')).toHaveText(/Any reward/)
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => searches.length).toBe(3)
  expect(searches[2].query.filters.map_filters?.filters.map_completion_reward).toBeUndefined()
  expect(voidSearch(searches[2])).toBe('any')
  // Back to this map's reward.
  await strip.locator('[data-valdo-reward-reset]').click()
  await expect(strip.locator('[data-valdo-reward-pick]')).toHaveText(/Foil Nimis/)
})

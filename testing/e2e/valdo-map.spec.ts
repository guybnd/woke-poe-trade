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

test('a Valdo map hides listings with a mod you skip, with no new search', async ({ overlay }) => {
  let searches = 0
  await overlay.page.route('**/api/trade/search/**', (route) => {
    searches++
    return route.fulfill({ contentType: 'application/json', headers: LIMITS, body: JSON.stringify({ id: 'q', total: 3, result: ['a', 'b', 'c'] }) })
  })
  const MODS: Record<string, string[]> = {
    a: ['Players who Die in area are sent to the Void', 'Players cannot gain Flask Charges'],
    b: ['Players who Die in area are sent to the Void', 'Area contains The Feared'],
    c: ['Players who Die in area are sent to the Void', 'Players deal 12% less Damage per Equipped Item\nPlayers\' Minions deal 12% less Damage per Item Equipped by their Master']
  }
  await overlay.page.route('**/api/trade/fetch/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({
      result: route.request().url().split('/fetch/')[1].split('?')[0].split(',').map((id, i) => ({
        id,
        item: { ilvl: 100, frameType: 2, rarity: 'Rare', name: 'Festering Sanctuary', typeLine: 'Valdo Map', baseType: 'Valdo Map', explicitMods: MODS[id], properties: [] },
        listing: {
          indexed: '2026-11-20T00:00:00Z',
          price: { amount: 30 + i, currency: 'divine' },
          account: { name: `seller${i}`, lastCharacterName: `char${i}`, online: { league: 'Mirage' } }
        }
      }))
    })
  }))
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods' }] })
  await overlay.copyItem('items/map-valdo-void.txt')
  const panel = overlay.widget('price-check')
  const strip = panel.locator('[data-valdo-strip]')
  await expect(strip).toBeVisible({ timeout: 20_000 })
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => searches).toBe(1)

  // Skip a mod from this map's list: the listing with it is hidden, nothing searched.
  if (await strip.locator('[data-valdo-mods]').count() === 0) await strip.locator('[data-valdo-mods-toggle]').click()
  const flask = strip.locator('[data-valdo-mods] li', { hasText: 'Players cannot gain Flask Charges' })
  await flask.locator('[data-valdo-skip-toggle]').click()
  await expect(flask.locator('[data-valdo-skip-toggle]')).toHaveText('Skipped')
  await expect(strip.locator('[data-valdo-skip="Players cannot gain Flask Charges"]')).toBeVisible()
  await expect(strip.locator('[data-valdo-hidden]')).toHaveText('1 of 3 listings hidden')

  // A second one, whatever its number: "per Equipped Item" rolled 10 here, 12 on the listing.
  await strip.locator('[data-valdo-mods] li', { hasText: 'per Equipped Item' }).locator('[data-valdo-skip-toggle]').click()
  await expect(strip.locator('[data-valdo-hidden]')).toHaveText('2 of 3 listings hidden')
  await overlay.snap('valdo map skips')

  // The chip takes it off again.
  await strip.locator('[data-valdo-skip="Players cannot gain Flask Charges"]').click()
  await expect(strip.locator('[data-valdo-hidden]')).toHaveText('1 of 3 listings hidden')
  expect(searches).toBe(1)
})

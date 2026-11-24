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
  const voidSeg = strip.locator('[data-valdo-mod="Players who Die in area are sent to the Void"]')
  await expect(voidSeg.locator('[data-state="has"]')).toHaveAttribute('aria-checked', 'true')
  await expect(strip.locator('[data-valdo-reward-pick]')).toHaveText(/Foil Nimis/)
  // Once: on the strip, not in the heading too.
  await expect(panel.getByText('Foil Nimis')).toHaveCount(1)
  // The mods are listed, Void first, without the "Unscalable Value" tag.
  if (await strip.locator('[data-valdo-mod]').count() < 2) await strip.locator('[data-valdo-mods-toggle]').click()
  await expect(strip.locator('[data-valdo-mod]').first()).toHaveAttribute('data-valdo-mod', 'Players who Die in area are sent to the Void')
  await expect(strip.locator('[data-valdo-mods]')).toContainText('Players cannot gain Flask Charges')
  await expect(strip.locator('[data-valdo-mods]')).not.toContainText('Unscalable')
  await overlay.snap('valdo map strip')

  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => searches.length).toBe(1)
  expect(searches[0].query.filters.map_filters?.filters.map_completion_reward?.option).toBe('Nimis')
  expect(voidSearch(searches[0])).toBe('has')

  // Another reward, and no void.
  await voidSeg.locator('[data-state="not"]').click()
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
  await voidSeg.locator('[data-state="any"]').click()
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
    c: ['Players who Die in area are sent to the Void', 'Players deal 12% less Damage per Equipped Item\nPlayers\' Minions deal 12% less Damage per Item Equipped by their Master', 'Monsters cannot be Stunned']
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

  if (await strip.locator('[data-valdo-mod="Players cannot gain Flask Charges"]').count() === 0) await strip.locator('[data-valdo-mods-toggle]').click()
  // Not on a mod hides the loaded listings with it, with no new search.
  const flask = strip.locator('[data-valdo-mod="Players cannot gain Flask Charges"]')
  await flask.locator('[data-state="not"]').click()
  await expect(flask.locator('[data-state="not"]')).toHaveAttribute('aria-checked', 'true')
  await expect(strip.locator('[data-valdo-headline]')).toHaveText('1 Not · 1 of 3 listings hidden')

  // A second one, whatever its number: "per Equipped Item" rolled 10 here, 12 on the listing.
  // Its minions line is the same row.
  const perItem = strip.locator('[data-valdo-mod="Players deal 10% less Damage per Equipped Item"]')
  await perItem.locator('[data-state="not"]').click()
  // Its minions line is in the same row, not a row of its own.
  await expect(strip.locator('[data-valdo-mod^="Players\' Minions"]')).toHaveCount(0)
  await expect(strip.locator('[data-valdo-headline]')).toHaveText('2 Not · 2 of 3 listings hidden')
  await overlay.snap('valdo map skips')

  // Any brings it back; Has keeps only the listings with the mod.
  await flask.locator('[data-state="any"]').click()
  await expect(strip.locator('[data-valdo-headline]')).toHaveText('1 Not · 1 of 3 listings hidden')
  await perItem.locator('[data-state="any"]').click()
  await strip.locator('[data-valdo-mod="Area contains The Feared"] [data-state="has"]').click()
  await expect(strip.locator('[data-valdo-headline]')).toHaveText('1 Has · 2 of 3 listings hidden')
  await strip.locator('[data-valdo-mod="Area contains The Feared"] [data-state="any"]').click()

  // A mod met on a listing, not this map: "Add a mod" finds it, and Not on it
  // is saved to the Map mods profile.
  await strip.locator('[data-valdo-add-input]').fill('stun')
  await strip.locator('[data-valdo-add-option="Monsters cannot be Stunned"]').click()
  const stun = strip.locator('[data-valdo-mod="Monsters cannot be Stunned"]')
  await expect(stun).toContainText('other maps')
  await stun.locator('[data-state="not"]').click()
  await expect(strip.locator('[data-valdo-headline]')).toHaveText('1 Not · 1 of 3 listings hidden')
  await expect(strip.locator('[data-valdo-saved]')).toContainText('Saved to')
  await expect(strip.locator('[data-valdo-template-pick]')).toBeVisible()

  // Clicking a row cycles it, as in the price check: Any, Has, Not, Any.
  const feared = strip.locator('[data-valdo-mod="Area contains The Feared"]')
  await feared.locator('span', { hasText: 'Area contains The Feared' }).click()
  await expect(feared.locator('[data-state="has"]')).toHaveAttribute('aria-checked', 'true')
  await feared.locator('span', { hasText: 'Area contains The Feared' }).click()
  await expect(feared.locator('[data-state="not"]')).toHaveAttribute('aria-checked', 'true')
  await feared.locator('span', { hasText: 'Area contains The Feared' }).click()
  await expect(feared.locator('[data-state="any"]')).toHaveAttribute('aria-checked', 'true')
  // The rating chip: Bad (can't run) sets it Not too; on through Care and Want.
  const chip = feared.locator('[data-valdo-rate]')
  await expect(chip).toHaveAttribute('data-valdo-rate', 'ok')
  await chip.click()
  await expect(chip).toHaveAttribute('data-valdo-rate', 'deadly')
  await expect(feared.locator('[data-state="not"]')).toHaveAttribute('aria-checked', 'true')
  await expect(strip.locator('[data-valdo-headline]')).toHaveText('2 Not · 2 of 3 listings hidden')
  await chip.click()
  await expect(chip).toHaveText('Care')
  // The listing with it says so on its row, without a filter for it.
  await expect(panel.locator('[data-valdo-mark="warn"]')).toHaveText(['Area contains The Feared'])
  await overlay.snap('valdo map ratings')
  await overlay.snap('valdo map add a mod')
  expect(searches).toBe(1)
})

test('a Valdo map without the Void mod still shows the Void line, set No void', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods' }] })
  await overlay.copyItem('items/map-valdo.txt')
  const strip = overlay.widget('price-check').locator('[data-valdo-strip]')
  await expect(strip).toBeVisible({ timeout: 20_000 })
  const voidLine = strip.locator('[data-valdo-mod="Players who Die in area are sent to the Void"]')
  await expect(voidLine).toContainText('not on this map')
  await expect(voidLine.locator('[data-state="not"]')).toHaveAttribute('aria-checked', 'true')
})

test('"valdo headhunter" in Search opens a Valdo map price check for that reward', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods' }] })
  await overlay.pressHotkey('Ctrl + Space')
  const search = overlay.widget('woke-search')
  const box = search.getByRole('textbox', { name: 'Search', exact: true })
  // Prices load a moment after the palette opens: type again until they're in.
  const result = search.getByRole('button', { name: /Valdo map: Headhunter/ })
  await expect(async () => {
    await box.fill('valdo headhunter')
    await expect(result).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 20_000 })
  await result.click()
  await search.getByRole('button', { name: 'Price check', exact: true }).click()
  const strip = overlay.widget('price-check').locator('[data-valdo-strip]')
  await expect(strip).toBeVisible({ timeout: 20_000 })
  await expect(strip.locator('[data-valdo-reward-pick]')).toHaveText(/Foil Headhunter/)
  // Any void: the made-up map has no Void mod, but the search is for any map with the reward.
  const voidLine = strip.locator('[data-valdo-mod="Players who Die in area are sent to the Void"]')
  await expect(voidLine.locator('[data-state="any"]')).toHaveAttribute('aria-checked', 'true')
  await overlay.snap('valdo lookup')
})

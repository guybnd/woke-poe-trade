// Swappable mods: a ⇄ on a mod a Harvest swap can change, nothing searched until
// a button is pressed, and a Flip tab that splits one search by element.
import type { Page } from '@playwright/test'
import { test, expect, fixtureText } from './harness'

const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }

const JEWEL = `Item Class: Jewels
Rarity: Rare
Corruption Spark
Cobalt Jewel
--------
Item Level: 83
--------
{ Prefix Modifier "Healthy" (Tier: 1) — Life }
7(5-7)% increased maximum Life
{ Suffix Modifier "of the Ice" (Tier: 1) — Elemental, Cold, Resistance }
+1(1-2)% to maximum Cold Resistance
--------
Place into an allocated Jewel Socket on the Passive Skill Tree. Right click to remove from the Socket.`

// [price in chaos, element of the max res mod]
const LISTINGS: Array<[number, string]> = [
  [100, 'Cold'], [110, 'Cold'], [120, 'Cold'],
  [300, 'Fire'], [320, 'Fire'], [340, 'Fire'],
  [60, 'Lightning']
]

async function fakeMarket (page: Page) {
  const searches: string[] = []
  // Lifeforce prices, added to the recorded poe.ninja answer.
  await page.route('**/dense/overviews**', (route) => {
    const data = JSON.parse(fixtureText('http/poe.ninja/poe1/api/economy/current/dense/overviews.json'))
    data.currencyOverviews[0].lines.push(
      { name: 'Wild Crystallised Lifeforce', chaos: 0.01, graph: [0, 0, 0, 0, 0, 0, 0] },
      { name: 'Vivid Crystallised Lifeforce', chaos: 0.01, graph: [0, 0, 0, 0, 0, 0, 0] },
      { name: 'Primal Crystallised Lifeforce', chaos: 0.01, graph: [0, 0, 0, 0, 0, 0, 0] })
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
  })
  await page.route('**/api/trade/search/**', (route) => {
    searches.push(route.request().postData() ?? '')
    return route.fulfill({
      contentType: 'application/json',
      headers: LIMITS,
      body: JSON.stringify({ id: 'q', total: LISTINGS.length, result: LISTINGS.map((_, i) => `r${i}`) })
    })
  })
  await page.route('**/api/trade/fetch/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({
      result: route.request().url().split('/fetch/')[1].split('?')[0].split(',').map(id => {
        const [amount, element] = LISTINGS[Number(id.slice(1))]
        return {
          id,
          item: {
            ilvl: 84,
            frameType: 2,
            name: 'Listed',
            typeLine: 'Cobalt Jewel',
            explicitMods: [
              { description: '7% increased maximum Life', domain: 'explicit' },
              { description: `+1% to maximum ${element} Resistance`, domain: 'explicit' }
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
  return searches
}

test('a max res jewel gets a ⇄ and a Flip tab that searches only on a click', async ({ overlay }) => {
  const searches = await fakeMarket(overlay.page)
  await overlay.boot()
  await overlay.copyItem(JEWEL)
  const panel = overlay.widget('price-check')
  const marker = panel.getByRole('button', { name: '⇄' })
  await expect(marker).toHaveCount(1)
  await expect(panel.getByRole('tab', { name: /Flip/ })).toBeVisible()

  // Opening the popover and the Flip tab spends nothing.
  await marker.click()
  await expect(overlay.page.getByText('Cold → Fire')).toBeVisible()
  await expect(overlay.page.getByText('Another mod on this item')).toHaveCount(0)
  await marker.click()
  await panel.getByRole('tab', { name: /Flip/ }).click()
  await expect(panel.getByRole('button', { name: 'Check (1 search)' })).toBeVisible()
  await overlay.page.waitForTimeout(300)
  const before = searches.length

  await panel.getByRole('button', { name: 'Check (1 search)' }).click()
  await expect(panel).toContainText('Keep Cold')
  expect(searches.length).toBe(before + 1)
  // The one search had the mod as any of the three elements.
  const body = JSON.parse(searches[searches.length - 1])
  expect(body.query.stats.some((g: { type: string, filters: unknown[] }) => g.type === 'count' && g.filters.length === 3)).toBe(true)

  await expect(panel).toContainText('Fire')
  await expect(panel).toContainText('1, search alone')
  await overlay.snap('harvest-swap-flip')

  // Lightning had one listing: searching it alone is one more search, on a click.
  await panel.getByRole('button', { name: /search alone/ }).click()
  await expect.poll(() => searches.length).toBe(before + 2)

  // A filter change marks the result out of date without searching.
  await panel.getByRole('tab', { name: 'Results' }).click()
  await panel.getByPlaceholder('min').first().fill('5')
  await panel.getByRole('tab', { name: /Flip/ }).click()
  await expect(panel).toContainText('Your filters changed since this search.')
  await overlay.page.waitForTimeout(300)
  expect(searches.length).toBe(before + 2)
})

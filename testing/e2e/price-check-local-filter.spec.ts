// A tighter stat range filters the listings already loaded, with no new trade
// search; a wider one keeps them, dimmed, until you search again.
import type { Page } from '@playwright/test'
import { test, expect } from './harness'

const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }

// Twelve listings with 115 to 126 maximum Life.
async function fakeTrade (page: Page) {
  const calls = { search: 0, fetch: 0 }
  await page.route('**/api/trade/search/**', (route) => {
    calls.search += 1
    return route.fulfill({
      contentType: 'application/json',
      headers: LIMITS,
      body: JSON.stringify({ id: 'q', total: 40, result: Array.from({ length: 12 }, (_, i) => `r${i}`) })
    })
  })
  await page.route('**/api/trade/fetch/**', (route) => {
    calls.fetch += 1
    return route.fulfill({
      contentType: 'application/json',
      headers: LIMITS,
      body: JSON.stringify({
        result: route.request().url().split('/fetch/')[1].split('?')[0].split(',').map(id => ({
          id,
          item: {
            ilvl: 86,
            frameType: 2,
            name: 'Listed',
            typeLine: 'Twilight Regalia',
            extended: { es: 1200 },
            explicitMods: [{ description: `+${115 + Number(id.slice(1))} to maximum Life`, domain: 'explicit' }]
          },
          listing: {
            indexed: new Date().toISOString(),
            fee: 1,
            price: { amount: 30 + Number(id.slice(1)), currency: 'chaos' },
            account: { name: `seller${id}`, lastCharacterName: `char${id}` }
          }
        }))
      })
    })
  })
  return calls
}

test('a raised min filters the loaded listings here; a lowered one asks for a new search', async ({ overlay }) => {
  const calls = await fakeTrade(overlay.page)
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(panel).toContainText('Matched: 40')
  const listings = panel.locator('.w-pc-table tbody tr[data-item-tip]')
  await expect(listings).toHaveCount(12)
  const searches = calls.search
  const fetches = calls.fetch

  const lifeMin = panel.locator('[data-stat-row]').filter({ hasText: 'total maximum Life' }).locator('input.w-roll-input').first()
  await lifeMin.fill('121')

  // 121 to 126: six fit. No dimming, and the row says it was filtered here.
  const status = panel.locator('.w-pc-status')
  await expect(status).toContainText('Filtered here')
  await expect(status).toContainText('6 of 12 loaded fit')
  await expect(listings).toHaveCount(6)
  await expect(panel.locator('.w-pc-results-stale')).toHaveCount(0)
  await expect(panel.locator('.w-pc-foot')).toContainText('6 of 12 loaded listings fit')

  // A filtered row keeps the listing's tooltip.
  await listings.first().hover()
  await expect(overlay.page.getByRole('tooltip')).toBeVisible()
  await lifeMin.hover()
  await overlay.snap('filtered here')

  // The hidden ones can be shown, faded.
  await status.getByRole('button', { name: 'Show 6' }).click()
  await expect(listings).toHaveCount(12)
  await expect(panel.locator('.w-pc-table tbody tr.w-pc-local-out')).toHaveCount(6)
  await status.getByRole('button', { name: 'Hide 6' }).click()
  await expect(listings).toHaveCount(6)

  // Lower than the search went: those listings were never loaded.
  await lifeMin.fill('100')
  await expect(status).toContainText('Needs a new search')
  await expect(panel.locator('.w-pc-results-stale').first()).toBeVisible()
  await expect(listings).toHaveCount(12)
  await overlay.snap('needs a new search')

  // None of it spent a trade search.
  await overlay.page.waitForTimeout(300)
  expect(calls.search).toBe(searches)
  expect(calls.fetch).toBe(fetches)
})

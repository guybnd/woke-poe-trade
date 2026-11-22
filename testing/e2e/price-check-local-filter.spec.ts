// A tighter stat range filters the listings already loaded, with no new trade
// search; a wider one keeps them, dimmed, until you search again.
import type { Page } from '@playwright/test'
import { test, expect } from './harness'

const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }

// Thirty listings with 115 to 144 maximum Life; a check loads the first 20.
async function fakeTrade (page: Page) {
  const calls = { search: 0, fetch: 0 }
  await page.route('**/api/trade/search/**', (route) => {
    calls.search += 1
    return route.fulfill({
      contentType: 'application/json',
      headers: LIMITS,
      body: JSON.stringify({ id: 'q', total: 30, result: Array.from({ length: 30 }, (_, i) => `r${i}`) })
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
  await expect(panel).toContainText('Matched: 30')
  const listings = panel.locator('.w-pc-table tbody tr[data-item-tip]')
  await expect(listings).toHaveCount(20)
  const searches = calls.search
  const fetches = calls.fetch

  const lifeRow = panel.locator('[data-stat-row]').filter({ hasText: 'total maximum Life' }).first()
  const lifeMin = lifeRow.locator('input.w-roll-input').first()
  await lifeMin.fill('121')

  // 121 to 134 of the loaded 115 to 134: fourteen fit. Not dimmed; the count, the
  // column header and the mod row say it's filtered here.
  const status = panel.locator('.w-pc-status')
  await expect(status).toContainText('14 of 20 here')
  await expect(listings).toHaveCount(14)
  await expect(panel.locator('.w-pc-results-stale')).toHaveCount(0)
  // Life may sit behind the header's +N: its chip names it there.
  await expect(panel.locator('thead .w-pc-local-chip')).toHaveText(/^(Life )?≥121$/)
  await expect(lifeRow).toHaveClass(/w-pc-local-row/)
  await expect(panel.locator('.w-pc-local-hint')).toHaveCount(0)
  const search = panel.getByRole('button', { name: 'Search', exact: true })
  await expect(search).not.toHaveClass(/w-pc-glow/)

  // A filtered row keeps the listing's tooltip.
  await listings.first().hover()
  await expect(overlay.page.getByRole('tooltip')).toBeVisible()
  await lifeMin.hover()
  await overlay.snap('filtered here')

  // None of the loaded ones fit: Load 10 more fetches the last search's next page.
  await lifeMin.fill('140')
  const hint = panel.locator('.w-pc-local-hint')
  await expect(hint).toContainText('None of the 20 loaded fit')
  await overlay.snap('short list, more to load')
  await hint.getByRole('button', { name: 'Load 10 more' }).click()
  await expect(listings).toHaveCount(5)
  await expect(status).toContainText('5 of 30 here')
  expect(calls.fetch).toBe(fetches + 1)

  // All 30 the search found are loaded: a search would find no more, so it isn't suggested.
  await lifeMin.fill('150')
  await expect(hint).toContainText('None of the 30 listings the search found fit')
  await expect(hint.getByRole('button', { name: 'Load 10 more' })).toHaveCount(0)
  await expect(hint).not.toContainText('Search for these filters')
  await expect(search).not.toHaveClass(/w-pc-glow/)
  await overlay.snap('short list, all loaded')

  // Lower than the search went: those listings were never loaded.
  await lifeMin.fill('100')
  await expect(panel.locator('.w-pc-results-stale').first()).toBeVisible()
  await expect(status).toHaveCount(0)
  await expect(listings).toHaveCount(30)
  await expect(search).toHaveClass(/w-pc-glow/)
  await overlay.snap('needs a new search')

  // None of it ran a trade search.
  await overlay.page.waitForTimeout(300)
  expect(calls.search).toBe(searches)
  expect(calls.fetch).toBe(fetches + 1)
})

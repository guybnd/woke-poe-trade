// A column per ticked stat in the price check's listings, compared to the item
// being checked.
import type { Page } from '@playwright/test'
import { test, expect } from './harness'

const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }

// amount, energy shield, life, fire res, cold res, chaos res
const LISTINGS: Array<[number, number, number, number, number, number]> = [
  [30, 1192, 112, 33, 31, 33],
  [32, 1210, 120, 34, 34, 31],
  [33, 1231, 125, 35, 35, 28],
  [40, 1189, 118, 31, 34, 35],
  [40, 1226, 129, 35, 31, 31]
]

async function fakeTrade (page: Page, listings: typeof LISTINGS, opts: { oneStashSeller?: boolean } = {}) {
  await page.route('**/api/trade/search/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({ id: 'q', total: listings.length, result: listings.map((_, i) => `r${i}`) })
  }))
  await page.route('**/api/trade/fetch/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({
      result: route.request().url().split('/fetch/')[1].split('?')[0].split(',').map(id => {
        const [amount, es, life, fire, cold, chaos] = listings[Number(id.slice(1))]
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
            ...(opts.oneStashSeller ? {} : { fee: 1 }),
            price: { amount, currency: 'chaos' },
            account: opts.oneStashSeller
              ? { name: 'seller', lastCharacterName: 'char', online: { league: 'Testleague' } }
              : { name: `seller${id}`, lastCharacterName: `char${id}` }
          }
        }
      })
    })
  }))
}

test('a seller\'s stash listings with different stats keep their own rows', async ({ overlay }) => {
  await fakeTrade(overlay.page, LISTINGS.slice(0, 2).map(l => [30, ...l.slice(1)] as typeof LISTINGS[number]), { oneStashSeller: true })
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  await panel.getByRole('button', { name: 'Search' }).click()
  await expect(panel).toContainText('Matched: 2')
  await expect(panel.locator('tbody tr:not(.w-pc-yours)')).toHaveCount(2)
  await expect(panel.locator('tbody')).toContainText('1192')
  await expect(panel.locator('tbody')).toContainText('1210')
})

test('ticked stats get columns, coloured against the checked item', async ({ overlay }) => {
  await fakeTrade(overlay.page, LISTINGS)
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  await panel.getByRole('button', { name: 'Search' }).click()
  await expect(panel).toContainText('Matched: 5')

  const yours = panel.locator('tr.w-pc-yours')
  await expect(yours).toContainText('Yours')
  await expect(yours).toContainText('1210')

  const rows = panel.locator('tbody tr:not(.w-pc-yours)')
  const esCell = (row: number) => rows.nth(row).locator('td.w-pc-stat').first()
  // Higher than yours: orange with an up arrow. Lower: blue. Equal: plain.
  await expect(esCell(2)).toHaveText('1231')
  await expect(esCell(2)).toHaveClass(/w-pc-stat-higher/)
  await expect(esCell(0)).toHaveText('1192')
  await expect(esCell(0)).toHaveClass(/w-pc-stat-lower/)
  await expect(esCell(1)).toHaveText('1210')
  await expect(esCell(1)).not.toHaveClass(/w-pc-stat-(higher|lower)/)

  // Same price, different numbers: two rows, not one row that hides a number.
  await expect(rows).toHaveCount(LISTINGS.length)
  // Item level isn't ticked, so its slot goes to the stats.
  await expect(panel.locator('thead')).not.toContainText(/ilvl|item level/i)

  await overlay.snap('stat columns')

  // Price and Listed stay on screen, with no sideways scrolling.
  const scroller = panel.locator('.w-pc-scroll')
  const fits = () => scroller.evaluate(el => el.scrollWidth <= el.clientWidth)
  expect(await fits()).toBe(true)

  // A fifth ticked stat goes behind the header's +1, and the table still fits.
  await panel.locator('[data-stat-row]').getByText('18% increased Stun and Block Recovery').first().click()
  // Moving from a filter onto Search runs the search and removes the button,
  // so Playwright's click or hover would wait for it forever.
  const search = (await panel.getByRole('button', { name: 'Search' }).boundingBox())!
  await overlay.page.mouse.move(search.x + search.width / 2, search.y + search.height / 2)
  await expect(panel.locator('thead')).toContainText('+1')
  await expect(panel.locator('thead th.w-pc-stat-head')).toHaveCount(5)
  await overlay.snap('stat columns over the cap')
  expect(await fits()).toBe(true)
})

// Socket colours: a Skin of the Lords searches its colours by default, listings show
// their colours as dots, and the chip turns the colours off.
import type { Page } from '@playwright/test'
import { test, expect } from './harness'

const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }
const COLOURS = [['R', 'R', 'R', 'G', 'G', 'B'], ['B', 'B', 'B', 'B', 'G', 'G']]

async function fakeTrade (page: Page) {
  await page.route('**/api/trade/search/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({ id: 'q', total: 2, result: ['r0', 'r1'] })
  }))
  await page.route('**/api/trade/fetch/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({
      result: route.request().url().split('/fetch/')[1].split('?')[0].split(',').map(id => ({
        id,
        item: {
          ilvl: 84,
          frameType: 3,
          corrupted: true,
          name: 'Skin of the Lords',
          typeLine: 'Simple Robe',
          sockets: COLOURS[Number(id.slice(1))].map(sColour => ({ group: 0, sColour })),
          explicitMods: ['Sockets cannot be modified', '+2 to Level of Socketed Gems', 'Iron Reflexes']
        },
        listing: {
          indexed: new Date().toISOString(),
          fee: 1,
          price: { amount: 200 + Number(id.slice(1)), currency: 'chaos' },
          account: { name: `seller${id}`, lastCharacterName: `char${id}` }
        }
      }))
    })
  }))
}

test('Skin of the Lords searches its socket colours, and the chip turns them off', async ({ overlay }) => {
  await fakeTrade(overlay.page)
  const searches: any[] = []
  overlay.page.on('request', (req) => {
    if (req.url().includes('/api/trade/search/')) searches.push(req.postDataJSON())
  })
  await overlay.boot()
  await overlay.copyItem('items/unique-skin-of-the-lords.txt')
  const panel = overlay.widget('price-check')

  const chip = panel.locator('[data-socket-colours]')
  await expect(chip).toHaveText(/3R 2G 1B/)
  await expect(chip).toHaveAttribute('aria-pressed', 'true')

  const search = panel.getByRole('button', { name: 'Search' })
  if (await search.isVisible()) await search.click()
  await expect.poll(() => searches.length).toBeGreaterThan(0)
  expect(searches[0].query.filters.socket_filters.filters.sockets).toEqual({ r: 3, g: 2, b: 1 })

  // Each listing's sockets show as six dots in the Sockets column.
  await expect(panel.locator('.w-pc-sdots').nth(1).locator('.w-pc-sdot')).toHaveCount(6)
  await overlay.snap('socket colours on')

  const before = searches.length
  await chip.click()
  await expect(chip).toHaveAttribute('aria-pressed', 'false')
  if (await search.isVisible()) await search.click()
  await expect.poll(() => searches.length).toBeGreaterThan(before)
  expect(searches.at(-1).query.filters.socket_filters?.filters.sockets).toBeUndefined()
  await overlay.snap('socket colours off')
})

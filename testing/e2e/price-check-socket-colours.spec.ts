// Socket colour tiles (Guy's pick B): a Skin of the Lords searches its colours by default,
// listings show their colours as dots, and right-click on Links offers the tiles on any linked item.
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

async function searchNow (page: Page, panel: ReturnType<Page['locator']>, searches: any[]) {
  const before = searches.length
  const search = panel.getByRole('button', { name: 'Search', exact: true })
  if (await search.isVisible()) await search.click()
  await expect.poll(() => searches.length).toBeGreaterThan(before)
  return searches.at(-1).query.filters.socket_filters?.filters.sockets
}

test('Skin of the Lords searches its socket colours, and each colour tile turns off', async ({ overlay }) => {
  await fakeTrade(overlay.page)
  const searches: any[] = []
  overlay.page.on('request', (req) => {
    if (req.url().includes('/api/trade/search/')) searches.push(req.postDataJSON())
  })
  await overlay.boot()
  await overlay.copyItem('items/unique-skin-of-the-lords.txt')
  const panel = overlay.widget('price-check')

  await expect(panel.locator('[data-socket-colour]')).toHaveCount(4)
  if (!searches.length) await searchNow(overlay.page, panel, searches)
  expect(searches[0].query.filters.socket_filters.filters.sockets).toEqual({ r: 3, g: 2, b: 1 })

  // Each listing's sockets show as six dots in the Sockets column.
  await expect(panel.locator('.w-pc-sdots').nth(1).locator('.w-pc-sdot')).toHaveCount(6)
  await overlay.snap('socket colour tiles')

  // Switching the G tile off leaves R and B.
  await panel.locator('[data-socket-colour="g"]').getByText('G', { exact: true }).click()
  expect(await searchNow(overlay.page, panel, searches)).toEqual({ r: 3, b: 1 })
})

test('right-click Links shows colour tiles on any linked item, off until switched on', async ({ overlay }) => {
  await fakeTrade(overlay.page)
  const searches: any[] = []
  overlay.page.on('request', (req) => {
    if (req.url().includes('/api/trade/search/')) searches.push(req.postDataJSON())
  })
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-ar-ev.txt')
  const panel = overlay.widget('price-check')
  await expect(panel.locator('[data-links-tile]')).toBeVisible()
  await expect(panel.locator('[data-socket-colour]')).toHaveCount(0)

  await panel.locator('[data-links-tile]').click({ button: 'right' })
  await expect(panel.locator('[data-socket-colour]')).toHaveCount(4)
  await overlay.snap('colour tiles from right-click')
  // Shown off: nothing about colours is searched until a tile is switched on.
  expect(searches.every(s => s.query.filters.socket_filters?.filters.sockets == null)).toBe(true)

  await panel.locator('[data-socket-colour="g"]').getByText('G', { exact: true }).click()
  expect(await searchNow(overlay.page, panel, searches)).toEqual({ g: 4 })

  // A second right-click keeps tiles that are on; with all off it hides them.
  await panel.locator('[data-links-tile]').click({ button: 'right' })
  await expect(panel.locator('[data-socket-colour]')).toHaveCount(4)
  await panel.locator('[data-socket-colour="g"]').getByText('G', { exact: true }).click()
  await panel.locator('[data-links-tile]').click({ button: 'right' })
  await expect(panel.locator('[data-socket-colour]')).toHaveCount(0)
})

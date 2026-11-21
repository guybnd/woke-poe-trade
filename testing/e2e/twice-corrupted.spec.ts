// 3.30 twice-corrupted items: the Corrupted chip says "Twice Corrupted", and each
// twice-corrupted listing in the results says so too. The search itself still
// finds once and twice corrupted items alike (no twice_corrupted filter).
import type { Page } from '@playwright/test'
import { test, expect } from './harness'

const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }

// The trade site's fetch JSON for this belt; a twice-corrupted copy carries
// doubleCorrupted: true (seen in a real 3.30 fetch), a once-corrupted one doesn't.
const belt = (twice: boolean) => ({
  w: 2, h: 1, league: 'Testleague', identified: true, ilvl: 84,
  name: 'String of Servitude', typeLine: 'Heavy Belt', baseType: 'Heavy Belt', rarity: 'Unique', frameType: 3,
  corrupted: true,
  ...(twice ? { doubleCorrupted: true } : {}),
  implicitMods: ['+75 to Strength', '5% increased maximum Life', '+14% to all Elemental Resistances'],
  explicitMods: ['Implicit Modifier magnitudes are tripled']
})
const ITEMS = [belt(true), belt(false)]

const searches: string[] = []

async function fakeTrade (page: Page) {
  // A page route answers before the fake host, so the search body is kept here.
  await page.route('**/api/trade/search/**', (route) => {
    searches.push(route.request().postData() ?? '')
    return route.fulfill({
      contentType: 'application/json',
      headers: LIMITS,
      body: JSON.stringify({ id: 'q', total: ITEMS.length, result: ITEMS.map((_, i) => `r${i}`) })
    })
  })
  await page.route('**/api/trade/fetch/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({
      result: ITEMS.map((item, i) => ({
        id: `r${i}`,
        item,
        listing: {
          indexed: new Date().toISOString(),
          fee: 1,
          price: { amount: 30, currency: 'chaos' },
          account: { name: 'seller', lastCharacterName: 'char' }
        }
      }))
    })
  }))
}

test('twice corrupted: the chip and each such listing say so', async ({ overlay }) => {
  await fakeTrade(overlay.page)
  await overlay.boot()
  await overlay.copyItem('items/unique-belt-twice-corrupted.txt')
  const panel = overlay.widget('price-check')
  const chip = panel.locator('[data-corrupted-chip]')
  await expect(chip.locator('span.shown')).toHaveText('Twice Corrupted')
  await expect(chip).toHaveAttribute('title', /twice corrupted/)

  const rows = panel.locator('.w-pc-table tbody tr')
  await expect(rows.filter({ hasText: 'Twice Corrupted' })).toHaveCount(1)
  // Same seller, same price: the once-corrupted copy still keeps its own row and plain tag.
  const once = rows.filter({ hasText: 'Corrupted' }).filter({ hasNotText: 'Twice' })
  await expect(once).toHaveCount(1)
  await overlay.snap('twice corrupted listing tag')

  // The search asks for corrupted items, not only twice-corrupted ones.
  const misc = JSON.parse(searches.at(-1)!).query.filters.misc_filters?.filters
  expect(misc?.corrupted?.option).toBe('true')
  expect(misc?.twice_corrupted).toBeUndefined()

  // The row keeps its item tooltip.
  await rows.filter({ hasText: 'Twice Corrupted' }).hover()
  const tip = overlay.page.getByRole('tooltip')
  await expect(tip).toContainText('String of Servitude')
  await expect(tip).toContainText('Twice Corrupted')
})

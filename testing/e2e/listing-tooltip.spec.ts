// Hovering a trade listing shows the item as the game does, with its tiers and rolls.
import { readFileSync } from 'fs'
import type { Page } from '@playwright/test'
import { test, expect } from './harness'

const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }
// A fractured weapon, a crafted body armour and a unique.
const ITEMS: unknown[] = JSON.parse(readFileSync(new URL('../fixtures/trade/listing-tiers.json', import.meta.url), 'utf-8'))

async function fakeTrade (page: Page) {
  await page.route('**/api/trade/search/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({ id: 'q', total: ITEMS.length, result: ITEMS.map((_, i) => `r${i}`) })
  }))
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
          price: { amount: 30 + i, currency: 'chaos' },
          account: { name: `seller${i}`, lastCharacterName: `char${i}` }
        }
      }))
    })
  }))
}

test('a listing shows tiers, rolls and its numbers on hover', async ({ overlay }) => {
  await fakeTrade(overlay.page)
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  await panel.getByRole('button', { name: 'Search' }).click()
  await expect(panel.locator('.w-pc-foot')).toBeVisible()

  const tip = overlay.page.getByRole('tooltip')
  const rows = panel.locator('.w-pc-table tbody tr')

  await rows.nth(1).hover()
  await expect(tip).toContainText('Mind Thirst')
  await expect(tip).toContainText('Physical Damage: 158-304')
  await expect(tip).toContainText('Prefix "Chosen"')
  await expect(tip).toContainText('136(120-139)% increased Physical Damage')
  await expect(tip).toContainText('P1')
  await expect(tip).toContainText('84%')
  await expect(tip).toContainText('pDPS 411')
  await expect(tip).toContainText('at 20% quality')
  await overlay.snap('listing tooltip weapon')

  await rows.nth(2).hover()
  await expect(tip).toContainText('Rage Guardian')
  await expect(tip).toContainText('Crafted "of Craft"')
  await expect(tip).toContainText('Energy Shield 255')
  await overlay.snap('listing tooltip armour')

  await rows.nth(3).hover()
  await expect(tip).toContainText('Starforge')
  await expect(tip).toContainText('405(400-450)% increased Physical Damage')
  await overlay.snap('listing tooltip unique')
})

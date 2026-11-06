// Disenchant: the ranked dust list on poe.ninja prices, listing counts only
// on request, ticks, and the price check's "disenchant or sell" chip.
import type { Page } from '@playwright/test'
import { test, expect, fixtureText } from './harness'

const DENSE = '**/poe.ninja/poe1/api/economy/current/dense/overviews*'
const FULL = '**/poe.ninja/poe1/api/economy/stash/current/item/overview*'

// Allflame prices from 6 Nov 2026, with poe.ninja's unique variant (the base).
const ARMOUR = [
  { name: "Speaker's Wreath", variant: 'Prophet Crown', chaos: 0.36 },
  { name: 'Kingsguard', variant: 'Conquest Chainmail', chaos: 0.39 },
  { name: "Kaom's Heart", variant: 'Glorious Plate', chaos: 15 },
  { name: "Kaom's Heart", variant: 'Glorious Plate, 6L', chaos: 2 }
]

async function routePrices (page: Page) {
  const dense = JSON.parse(fixtureText('http/poe.ninja/poe1/api/economy/current/dense/overviews.json'))
  const armour = dense.itemOverviews.find((o: { type: string }) => o.type === 'UniqueArmour')
  armour.lines = ARMOUR.map(l => ({ ...l, graph: [0, 0, 0, 0, 0, 0, 0] }))
  await page.route(DENSE, route => route.fulfill({ json: dense }))
}

test('disenchant: uniques ranked by dust per chaos, listing counts on request, ticks', async ({ overlay, page }) => {
  await routePrices(page)
  const full: string[] = []
  await page.route(FULL, route => {
    const type = new URL(route.request().url()).searchParams.get('type')
    full.push(type ?? '')
    const lines = type === 'UniqueArmour'
      ? [{ name: "Speaker's Wreath", detailsId: 'speakers-wreath-prophet-crown', listingCount: 3 }, { name: 'Kingsguard', detailsId: 'kingsguard-conquest-chainmail', listingCount: 40 }]
      : []
    return route.fulfill({ json: { lines } })
  })

  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-disenchant', wmWants: 'show' }] })
  const panel = overlay.widget('woke-disenchant')
  const rows = panel.locator('.w-row:not(.w-row--head)')

  await expect(rows.first()).toContainText("Speaker's Wreath", { timeout: 15000 })
  // 7.81 base dust at item level 84 and 20% quality, for 0.36c.
  await expect(rows.first()).toContainText('27,335')
  await expect(rows.first()).toContainText('75,931')
  await expect(rows.nth(1)).toContainText('Kingsguard')
  // Kaom's Heart uses its plain price, not the cheaper 6-link line.
  await expect(panel.locator('.w-row').filter({ hasText: "Kaom's Heart" })).toContainText('10,145')
  // No listing requests until asked.
  expect(full).toEqual([])
  await expect(panel.getByText('Listed', { exact: true })).toHaveCount(0)
  await overlay.snap('disenchant-ranked')

  await panel.getByRole('button', { name: 'Count listings' }).click()
  await expect(panel.getByText('Listed', { exact: true })).toBeVisible()
  expect(full.sort()).toEqual(['UniqueAccessory', 'UniqueArmour', 'UniqueWeapon'])
  await expect(rows.first().locator('.w-down').filter({ hasText: /^3$/ })).toBeVisible()

  await panel.getByRole('button', { name: "Bought Speaker's Wreath" }).click()
  await expect(panel.getByRole('button', { name: 'Clear 1 ticked' })).toBeVisible()
  await overlay.snap('disenchant-counted-and-ticked')
  await panel.getByRole('button', { name: 'Clear 1 ticked' }).click()
  await expect(panel.getByRole('button', { name: /Clear \d+ ticked/ })).toHaveCount(0)

  // The gold fee ranking asks what gold is worth.
  await panel.getByRole('button', { name: 'With gold' }).click()
  await expect(panel.getByText('10k gold is worth')).toBeVisible()
  await panel.getByPlaceholder('Unique or base').fill('chainmail')
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('Kingsguard')
})

test('disenchant: price check shows dust per chaos only when switched on', async ({ overlay, page }) => {
  await routePrices(page)
  await overlay.boot()
  await overlay.copyItem('items/unique-kaoms-heart.txt')
  const pc = overlay.widget('price-check')
  await expect(pc.getByText("Kaom's Heart").first()).toBeVisible()
  await expect(pc.getByText(/dust\/c/)).toHaveCount(0)

  await routePrices(page)
  await overlay.boot({ patch: c => { c.woke = { ...c.woke, disenchantVerdict: { on: true, line: 5000 } } } })
  await overlay.copyItem('items/unique-kaoms-heart.txt')
  // 43.48 base dust at item level 86, no quality: 108,700 dust for 15c.
  await expect(overlay.widget('price-check').getByText('Disenchant · 7,247 dust/c')).toBeVisible({ timeout: 15000 })
  await overlay.snap('disenchant-price-check-chip')
})

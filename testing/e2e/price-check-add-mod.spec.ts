// "Add a mod": a search line under the stats adds any trade mod the item doesn't
// have. Adding, typing in it and Enter there never search: only Search does.
import type { Page } from '@playwright/test'
import { test, expect } from './harness'

const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }

async function fakeTrade (page: Page) {
  await page.route('**/api/trade/search/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({ id: 'q', total: 0, result: [] })
  }))
}

const LAYOUTS = {
  rows: undefined,
  poe: (config: any) => { config.widgets.find((w: { wmType: string }) => w.wmType === 'price-check').wokeWindowStyle = 'poe' }
}

for (const [layout, patch] of Object.entries(LAYOUTS)) {
test(`${layout}: an added mod waits for Search, then searches with the item`, async ({ overlay }) => {
  await fakeTrade(overlay.page)
  const searches: any[] = []
  overlay.page.on('request', (req) => {
    if (req.url().includes('/api/trade/search/')) searches.push(req.postDataJSON())
  })
  await overlay.boot(patch ? { patch } : {})
  await overlay.copyItem('items/rare-ring.txt')
  const panel = overlay.widget('price-check')
  await panel.getByRole('button', { name: 'Search' }).waitFor()
  const before = searches.length

  const box = panel.getByRole('combobox', { name: 'Add a mod to search for' })
  await box.click()
  await box.fill('rarity')
  await expect(panel.getByRole('option').first()).toHaveText('#% increased Rarity of Items found')
  await expect(panel.locator('[data-add-kind="pseudo"]')).toHaveClass(/on/)
  await overlay.snap('typing rarity')
  // Tab picks the next kind, Enter adds without searching.
  await box.press('Tab')
  await expect(panel.locator('[data-add-kind="explicit"]')).toHaveClass(/on/)
  await box.press('Shift+Tab')
  await box.press('Enter')
  const row = panel.locator('[data-added-mod]')
  await expect(row).toHaveCount(1)
  await expect(row).toContainText('Rarity of Items found')
  // The new row's min has the focus.
  await overlay.page.keyboard.type('25')
  await expect(row.getByRole('spinbutton', { name: 'Min' })).toHaveValue('25')
  await overlay.page.waitForTimeout(500)
  expect(searches.length).toBe(before)
  await overlay.snap('added, waiting for Search')

  await panel.getByRole('button', { name: 'Search' }).click()
  await expect.poll(() => searches.length).toBe(before + 1)
  const and = searches[before].query.stats[0]
  expect(and.filters).toContainEqual({ id: 'pseudo.pseudo_increased_rarity', value: { min: 25 }, disabled: false })
  // The item's own ticked stats are still there.
  expect(and.filters.length).toBeGreaterThan(1)

  // Unticking keeps it in the query, switched off; ✕ drops it.
  await row.getByRole('checkbox').click()
  await panel.getByRole('button', { name: 'Search' }).click()
  await expect.poll(() => searches.length).toBe(before + 2)
  expect(searches[before + 1].query.stats[0].filters)
    .toContainEqual(expect.objectContaining({ id: 'pseudo.pseudo_increased_rarity', disabled: true }))
  await row.getByRole('button', { name: 'Remove' }).click()
  await expect(row).toHaveCount(0)
})
}

test('a new item drops the added mods', async ({ overlay }) => {
  await fakeTrade(overlay.page)
  await overlay.boot({ patch: LAYOUTS.poe })
  await overlay.copyItem('items/rare-ring.txt')
  const panel = overlay.widget('price-check')
  const box = panel.getByRole('combobox', { name: 'Add a mod to search for' })
  await box.click()
  await box.fill('maximum life')
  await box.press('Enter')
  await expect(panel.locator('[data-added-mod]')).toHaveCount(1)
  await overlay.copyItem('items/rare-body-armour-es.txt')
  // The window shows the item class, not its name: wait for the ring's mods to go.
  await expect(panel.getByText(/Physical Damage to Attacks/)).toHaveCount(0)
  await expect(panel.getByRole('combobox', { name: 'Add a mod to search for' })).toBeVisible()
  await expect(panel.locator('[data-added-mod]')).toHaveCount(0)
})

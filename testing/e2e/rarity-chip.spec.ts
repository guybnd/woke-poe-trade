// The rarity chip on gear: Any / Magic / Rare. A rare body armour can search
// magic bases with its mods (to craft or recombine), and the chip turns amber
// when Magic can't match the ticked prefixes and suffixes.
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

test('rare armour: the rarity chip searches magic, then rare, then any', async ({ overlay }) => {
  await fakeTrade(overlay.page)
  const searches: any[] = []
  overlay.page.on('request', (req) => {
    if (req.url().includes('/api/trade/search/')) searches.push(req.postDataJSON())
  })
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  const chip = panel.locator('[data-rarity-chip]')
  const search = panel.getByRole('button', { name: 'Search', exact: true })
  const rarity = () => searches.at(-1)?.query.filters.type_filters?.filters.rarity?.option

  await expect(chip.locator('span.shown')).toHaveText('Any')
  await expect(chip).toHaveAttribute('title', /Rarity filter: searching any non-unique item/)
  await search.click()
  await expect.poll(rarity).toBe('nonunique')

  await chip.click()
  await expect(chip.locator('span.shown')).toHaveText('Magic')
  await expect(chip).toHaveAttribute('data-step', 'magic')
  await overlay.snap('rarity chip on magic')
  const before = searches.length
  await search.click()
  await expect.poll(() => searches.length).toBe(before + 1)
  expect(rarity()).toBe('magic')

  await chip.click()
  await expect(chip.locator('span.shown')).toHaveText('Rare')
  await search.click()
  await expect.poll(rarity).toBe('rare')

  await chip.click()
  await expect(chip.locator('span.shown')).toHaveText('Any')
})

test('rare armour: Magic with two prefixes ticked turns the chip amber', async ({ overlay }) => {
  await fakeTrade(overlay.page)
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  const chip = panel.locator('[data-rarity-chip]')
  await chip.click()
  // Life and Stun and Block Recovery are two prefixes: tick both if they're off.
  for (const text of ['total maximum Life', 'Stun and Block Recovery']) {
    const row = panel.locator('[data-stat-row]').filter({ hasText: text }).first()
    await expect(row).toBeVisible()
    const box = row.locator('.w-pc-check').first()
    if (await box.locator('.fa-square').count()) await box.click()
  }
  await expect(chip).toHaveClass(/clash/)
  await expect(chip).toHaveAttribute('title', /2 prefixes are ticked/)
  await overlay.snap('rarity chip clash')
})

test('uniques have no rarity chip', async ({ overlay }) => {
  await fakeTrade(overlay.page)
  await overlay.boot()
  await overlay.copyItem('items/unique-kaoms-heart.txt')
  const panel = overlay.widget('price-check')
  await expect(panel.getByText(/Kaom/).first()).toBeVisible()
  await expect(panel.locator('[data-rarity-chip]')).toHaveCount(0)
})

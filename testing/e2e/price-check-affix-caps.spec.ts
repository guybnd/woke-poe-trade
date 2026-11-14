// Prefix / suffix caps: editing them waits for Search, which sends them as a "not" group.
import type { Locator, Page } from '@playwright/test'
import { test, expect } from './harness'

const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }

async function fakeTrade (page: Page) {
  await page.route('**/api/trade/search/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({ id: 'q', total: 12, result: Array.from({ length: 12 }, (_, i) => `r${i}`) })
  }))
  await page.route('**/api/trade/fetch/**', (route) => route.fulfill({
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
          extended: { es: 1200 + Number(id.slice(1)) },
          explicitMods: [{ description: '+120 to maximum Life', domain: 'explicit' }]
        },
        listing: {
          indexed: new Date().toISOString(),
          fee: 1,
          price: { amount: 30 + Number(id.slice(1)), currency: 'chaos' },
          account: { name: `seller${id}`, lastCharacterName: `char${id}` }
        }
      }))
    })
  }))
}

async function top (locator: Locator) {
  return Math.round((await locator.boundingBox())!.y)
}

// Tooltip lines (PoE mode) is the default layout; Rows the old one.
const LAYOUTS = {
  rows: undefined,
  poe: (config: any) => { config.widgets.find((w: { wmType: string }) => w.wmType === 'price-check').wokeWindowStyle = 'poe' }
}

for (const [layout, patch] of Object.entries(LAYOUTS)) {
test(`${layout}: affix caps search only on Search and leave out fuller listings`, async ({ overlay }) => {
  await fakeTrade(overlay.page)
  const searches: any[] = []
  overlay.page.on('request', (req) => {
    if (req.url().includes('/api/trade/search/')) searches.push(req.postDataJSON())
  })
  await overlay.boot(patch ? { patch } : {})
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  await overlay.snap('caps empty')
  await panel.getByRole('button', { name: 'Search' }).click()
  await expect(panel).toContainText('Matched: 12')
  expect(searches).toHaveLength(1)
  expect(JSON.stringify(searches[0].query.stats)).not.toContain('pseudo_number_of_prefix_mods')

  // The caps sit on the results bar, or on the Search row while results wait: one is shown.
  const prefix = panel.locator('[data-affix-cap="prefix"]:visible')
  const suffix = panel.locator('[data-affix-cap="suffix"]:visible')
  await overlay.snap('caps on the results bar')
  const onBar = (await prefix.boundingBox())!
  await prefix.locator('input').fill('2')
  await prefix.locator('input').press('Tab')
  // The bar gives way to the Search row; the caps stay where they were.
  await expect(panel.getByRole('button', { name: 'Search' })).toBeVisible()
  const onRow = (await prefix.boundingBox())!
  expect(Math.abs(onRow.x - onBar.x)).toBeLessThan(2)
  expect(Math.abs(onRow.y - onBar.y)).toBeLessThan(6)
  await suffix.getByRole('button', { name: /Suf/ }).click()
  await expect(suffix.locator('input')).toHaveValue('2')
  await overlay.page.waitForTimeout(500)
  // No search of its own: the results go stale and wait for the button.
  expect(searches).toHaveLength(1)
  await overlay.snap('caps set, waiting for Search')
  await panel.getByRole('button', { name: 'Search' }).click()
  await expect.poll(() => searches.length).toBe(2)
  const not = searches[1].query.stats.find((g: any) => g.type === 'not')
  expect(not.filters).toEqual(expect.arrayContaining([
    { id: 'pseudo.pseudo_number_of_prefix_mods', value: { min: 3 } },
    { id: 'pseudo.pseudo_number_of_suffix_mods', value: { min: 3 } }
  ]))

  // Clearing a box drops that cap only.
  await prefix.locator('input').fill('')
  await prefix.locator('input').press('Tab')
  await panel.getByRole('button', { name: 'Search' }).click()
  await expect.poll(() => searches.length).toBe(3)
  const stats = JSON.stringify(searches[2].query.stats)
  expect(stats).not.toContain('pseudo_number_of_prefix_mods')
  expect(stats).toContain('pseudo_number_of_suffix_mods')
})

}

test('folded mods keep the caps by Search', async ({ overlay }) => {
  await fakeTrade(overlay.page)
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  await panel.getByRole('button', { name: /Collapse/ }).click()
  await expect(panel.locator('[data-affix-caps]:visible')).toHaveCount(1)
  await overlay.snap('mods folded')
})

test('no caps on uniques', async ({ overlay }) => {
  await fakeTrade(overlay.page)
  await overlay.boot()
  await overlay.copyItem('items/unique-kaoms-heart.txt')
  await expect(overlay.widget('price-check').getByText(/Kaom/).first()).toBeVisible()
  await expect(overlay.widget('price-check').locator('[data-affix-caps]')).toHaveCount(0)
})

test('poe: Enter in a cap box searches with the number just typed', async ({ overlay }) => {
  await fakeTrade(overlay.page)
  const searches: any[] = []
  overlay.page.on('request', (req) => {
    if (req.url().includes('/api/trade/search/')) searches.push(req.postDataJSON())
  })
  await overlay.boot({ patch: LAYOUTS.poe })
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  const input = panel.locator('[data-affix-cap="suffix"]:visible input')
  await input.fill('1')
  await input.press('Enter')
  await expect.poll(() => searches.length).toBe(1)
  expect(searches[0].query.stats.find((g: any) => g.type === 'not')?.filters)
    .toEqual([{ id: 'pseudo.pseudo_number_of_suffix_mods', value: { min: 2 } }])
})

// A Mercenary Warrant's supports ranked by what buyers pay (merc thread,
// option A1): nothing searched until Measure, then the skill alone and the
// skill with each support, remembered for the next warrant.
import type { Page } from '@playwright/test'
import { test, expect } from './harness'

const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }

// Written from the parser's format, not copied from the game (no real copy yet).
const WARRANT = ['Item Class: Mercenary Warrants', 'Rarity: Normal', 'Mercenary Warrant', '--------',
  'Mercenary Level: 84', 'Build: Bastion', '--------',
  'Shield Crush', 'Greater Pulverise', 'Greater Fortify', 'Brutality', 'Faster Attacks', '--------',
  'Determination', '--------', 'Dash'].join('\n')

// Pulverise (support_64416) lists at 40c, the skill alone at 10c, the rest at 12c.
async function fakeMarket (page: Page) {
  const searches: string[] = []
  await page.route('**/api/trade/search/**', (route) => {
    const body = route.request().postData() ?? ''
    searches.push(body)
    const q = JSON.parse(body).query.stats as Array<{ type: string, disabled?: boolean, filters: Array<{ id: string, disabled: boolean }> }>
    const supports = q.filter(g => g.type === 'mercenary' && !g.disabled)
      .flatMap(g => g.filters.filter(f => !f.disabled && f.id.startsWith('mercenary.support')).map(f => f.id))
    const id = supports.includes('mercenary.support_64416') ? 'pulv' : supports.length ? 'other' : 'bare'
    return route.fulfill({ contentType: 'application/json', headers: LIMITS, body: JSON.stringify({ id, total: 9, result: Array.from({ length: 6 }, (_, i) => `${id}${i}`) }) })
  })
  await page.route('**/api/trade/fetch/**', (route) => {
    const ids = route.request().url().split('/fetch/')[1].split('?')[0].split(',')
    return route.fulfill({
      contentType: 'application/json',
      headers: LIMITS,
      body: JSON.stringify({
        result: ids.map((id, i) => ({
          id,
          item: { frameType: 0, name: '', typeLine: 'Mercenary Warrant' },
          listing: {
            indexed: new Date().toISOString(),
            price: { amount: (id.startsWith('pulv') ? 40 : id.startsWith('bare') ? 10 : 12) + i % 2, currency: 'chaos' },
            account: { name: `seller${id}`, lastCharacterName: `char${id}` }
          }
        }))
      })
    })
  })
  return searches
}

test('a warrant ranks its supports by what buyers pay, searching only on Measure', async ({ overlay }) => {
  const searches = await fakeMarket(overlay.page)
  await overlay.boot()
  await overlay.copyItem(WARRANT)
  const panel = overlay.widget('price-check')
  const measure = panel.getByRole('button', { name: /Measure · 5 searches/ })
  await expect(measure).toBeVisible()
  await expect(panel.getByText('not measured').first()).toBeVisible()
  await overlay.page.waitForTimeout(300)
  const before = searches.length

  await measure.click()
  await expect(panel.getByText('not measured')).toHaveCount(0, { timeout: 30_000 })
  expect(searches.length).toBe(before + 5)
  // Pulverise moves to the top with what it adds.
  const first = panel.locator('label').first()
  await expect(first).toContainText('Pulverise')
  await expect(first).toContainText('+30')
  await overlay.snap('merc-ladder-measured')

  // Ticking a support ticks it for the price check's own search.
  await first.locator('input[type=checkbox]').check()
  await expect(first.locator('input[type=checkbox]')).toBeChecked()
})

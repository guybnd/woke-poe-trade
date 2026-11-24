// Scrying: maps ranked by what a Scrying Orb adds per map, from the map's own
// divination cards and their prices. Nothing searches trade until Price orbs;
// then the orb's price and payback show. Map and card names have the item
// tooltip (tip-audit gate).
import fs from 'fs'
import { fileURLToPath } from 'url'
import { test, expect } from './harness'

const DENSE = fileURLToPath(new URL('../fixtures/http/poe.ninja/poe1/api/economy/current/dense/overviews.json', import.meta.url))
const FLAT = [0, 0, 0, 0, 0, 0, 0]
const CARDS = JSON.stringify({
  type: 'DivinationCard',
  lines: [
    { name: 'The Celestial Justicar', chaos: 320, graph: FLAT },
    { name: 'Coveted Possession', chaos: 9, graph: FLAT },
    { name: 'Cursed Words', chaos: 4, graph: FLAT },
    { name: 'The Last Supper', chaos: 22, graph: FLAT },
    { name: 'The Warden', chaos: 2, graph: FLAT }
  ]
})
const LIMIT = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }
const SLOW = { timeout: 20_000 }

test('Scrying ranks maps by card value, and Price orbs shows the orb and its payback', async ({ overlay }) => {
  const recorded = fs.readFileSync(DENSE, 'utf8')
  await overlay.page.route('**/dense/overviews*', (route) => route.fulfill({
    contentType: 'application/json',
    // Ahead of the recorded rows: the first row of a name is the one counted.
    body: recorded.replace(/\[\s*\{"type":"/, () => `[${CARDS},{"type":"`)
  }))
  const searches: Array<{ query: { type: unknown, status: { option: string } } }> = []
  await overlay.page.route('**/api/trade/search/**', async (route) => {
    const body = route.request().postDataJSON()
    searches.push(body)
    await route.fulfill({ contentType: 'application/json', headers: LIMIT, body: JSON.stringify({ id: `q-${searches.length}`, total: 7, result: ['a', 'b', 'c'] }) })
  })
  await overlay.page.route('**/api/trade/fetch/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMIT,
    body: JSON.stringify({
      result: route.request().url().split('/fetch/')[1].split('?')[0].split(',').map(id => ({
        id,
        item: { properties: [] },
        listing: { indexed: '2026-11-05T00:00:00Z', price: { amount: 150, currency: 'chaos' }, account: { name: 'seller', lastCharacterName: 'seller_char', online: { league: 'Allflame' } } }
      }))
    })
  }))

  await overlay.boot({
    overlayActive: true,
    widgets: [{ wmType: 'woke-scrying' }],
    patch: c => {
      const w = c.widgets.find((w: { wmType: string }) => w.wmType === 'woke-scrying')
      w.wmFlags = ['invisible-on-blur']
      w.wmWants = 'show'
      w.anchor = { pos: 'cc', x: 50, y: 50 }
    }
  })

  const panel = overlay.widget('woke-scrying')
  // The Celestial Justicar is 1 in 7 of Bone Crypt's own cards, 1 in 15 of Necropolis's.
  const rows = panel.locator('[data-qa="scry-row"]')
  await expect(rows.first()).toContainText('Bone Crypt', SLOW)
  await expect(rows.nth(1)).toContainText('Necropolis')
  // The best map opens on its own, with its cards and what each adds.
  const detail = panel.locator('[data-qa="scry-detail"]')
  await expect(detail).toContainText('Bone Crypt')
  await rows.nth(1).click()
  await expect(detail.locator('[data-qa="scry-card"]').filter({ hasText: 'Coveted Possession' })).toBeVisible()
  await detail.getByText('The Celestial Justicar', { exact: true }).hover()
  await expect(overlay.page.getByRole('tooltip')).toContainText('The Celestial Justicar')
  // A map with no priced card isn't worth scrying.
  await expect(panel.getByText('Worth scrying', { exact: true })).toBeVisible()
  expect(searches).toEqual([])
  await expect(detail.locator('[data-qa="scry-orb"]')).toContainText('?')

  // Price this orb: one search, for Necropolis's orb.
  await detail.getByText('Price this orb').click()
  await expect(detail.locator('[data-qa="scry-orb"]')).toContainText('150', SLOW)
  expect(searches).toHaveLength(1)
  expect(searches[0].query.type).toEqual({ discriminator: 'scrying_orb', option: '2279' })
  expect(searches[0].query.status.option).toBe('securable')
  await expect(detail).toContainText(/Pays back\s*\d+ maps?/)
  await expect(rows.nth(1)).toContainText('orb pays back in')
  // Price orbs looks up the rest of the top maps.
  await panel.locator('[data-qa="scry-price-orbs"]').click()
  await expect(rows.first()).toContainText('orb pays back in', { timeout: 30_000 })
  await overlay.snap('scrying ranked with an orb priced')

  // The map you run comes off the gain, and leaves the list.
  await expect(rows.filter({ hasText: /^Cage/ })).toHaveCount(1)
  await panel.locator('select[data-qa="scry-from"]').selectOption('Cage Map')
  await expect(rows.filter({ hasText: /^Cage/ })).toHaveCount(0)
})

// Boss runs: jewels at their unidentified trade price, estimated chances marked
// as estimates, and a drop poe.ninja doesn't list filled in from trade.
import fs from 'fs'
import { fileURLToPath } from 'url'
import { test, expect } from './harness'

const DENSE = fileURLToPath(new URL('../fixtures/http/poe.ninja/poe1/api/economy/current/dense/overviews.json', import.meta.url))
const FLAT = [0, 0, 0, 0, 0, 0, 0]
const JEWELS = JSON.stringify({
  type: 'UniqueJewel',
  lines: [
    { name: 'Sublime Vision', variant: 'Prismatic Jewel', chaos: 393, graph: FLAT },
    { name: "Watcher's Eye", variant: 'Prismatic Jewel', chaos: 42, graph: FLAT }
  ]
})
// Priced by poe.ninja, so the lookups reach the key without a long wait.
const OTHERS = JSON.stringify({
  type: 'UniqueWeapon',
  lines: [{ name: 'Voidforge', variant: 'Infernal Sword', chaos: 5000, graph: FLAT }]
})
const ORB = JSON.stringify({ type: 'Currency', lines: [{ name: 'Orb of Dominance', chaos: 1500, graph: FLAT }] })
const SLOW = { timeout: 20_000 }

test('Boss runs: unidentified jewel prices and estimated chances', async ({ overlay }) => {
  const recorded = fs.readFileSync(DENSE, 'utf8')
  await overlay.page.route('**/dense/overviews*', (route) => route.fulfill({
    contentType: 'application/json',
    body: recorded.replace(/\[\s*\{"type":"/, () => `[${JEWELS},${OTHERS},${ORB},{"type":"`)
  }))

  const searches: Array<{ query: { name?: string, type: string, status: { option: string }, filters: unknown } }> = []
  await overlay.page.route('**/api/trade/search/**', async (route) => {
    const body = route.request().postDataJSON()
    searches.push(body)
    const known = body.query.name === 'Sublime Vision' || body.query.type === 'Decaying Reliquary Key'
    await route.fulfill({
      contentType: 'application/json',
      headers: { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' },
      body: JSON.stringify({ id: known ? `q-${searches.length}` : 'none', total: known ? 12 : 0, result: known ? [1, 2, 3].map(n => `r${searches.length}-${n}`) : [] })
    })
  })
  await overlay.page.route('**/api/trade/fetch/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' },
    body: JSON.stringify({
      result: route.request().url().split('/fetch/')[1].split('?')[0].split(',').map(id => ({
        id,
        item: { ilvl: 86, properties: [] },
        listing: {
          indexed: '2026-11-05T00:00:00Z',
          price: { amount: 80, currency: 'divine' },
          account: { name: 'seller', lastCharacterName: 'seller_char', online: { league: 'Allflame' } }
        }
      }))
    })
  }))

  await overlay.boot({
    overlayActive: true,
    widgets: [{ wmType: 'woke-boss-runs' }],
    patch: c => {
      const w = c.widgets.find((w: { wmType: string }) => w.wmType === 'woke-boss-runs')
      w.wmFlags = ['invisible-on-blur']
      w.wmWants = 'show'
      w.anchor = { pos: 'cc', x: 50, y: 50 }
      w.selected = 'uber-uber-elder'
      w.tier = 'all'
      w.sort = 'hour'
      w.runSeconds = {}
      w.rates = {}
      w.extraDrops = {}
      w.kills = {}
      w.ownEntry = false
    }
  })

  const panel = overlay.widget('woke-boss-runs')
  const row = panel.locator('.w-row').filter({ hasText: 'Sublime Vision' }).first()
  await expect(row).toBeVisible(SLOW)
  await expect(row).toContainText('~1.50%', SLOW)
  await expect(panel).toContainText('is an estimated chance')

  // The opened boss's jewels are searched first, unidentified at instant buyout.
  await expect(row.getByText('unid', { exact: true })).toBeVisible(SLOW)
  const vision = searches.find(s => s.query.name === 'Sublime Vision')!.query
  expect(vision.status.option).toBe('securable')
  expect(vision.filters).toEqual({ misc_filters: { filters: { identified: { option: 'false' } } } })
  // The key poe.ninja doesn't list is filled in from trade, by type.
  await expect(panel.locator('.w-row').filter({ hasText: 'Decaying Reliquary Key' }).first()).toContainText('trade', SLOW)
  expect(searches.find(s => s.query.type === 'Decaying Reliquary Key')!.query.filters).toEqual({})
  await overlay.snap('uber uber elder with unidentified prices and estimates')

  // The price strip names what the price is built from and lets you go back.
  await row.getByText('unid', { exact: true }).click()
  await expect(panel).toContainText('12 unidentified instant buyouts')
  await expect(panel.getByRole('button', { name: 'poe.ninja' })).toBeVisible()
  await overlay.snap('price strip for an unidentified jewel')

  // Rates tab: estimates are labelled, with the source named.
  await panel.getByText('Rates & sources').click()
  await expect(panel).toContainText('use estimated chances, not measured kills')
  await expect(panel.getByText('estimate', { exact: true }).first()).toBeVisible()
  await overlay.snap('rates tab with estimates')
})

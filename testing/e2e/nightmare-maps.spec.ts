// Nightmare (T17) maps: a Nightmare Map's price check lists all five maps it
// can go into with their boss fragment value, best first, and Boss runs has a
// Nightmare tab with the same numbers. Chances are estimates (no published
// rates), marked ~. Nothing searches trade.
// The item copy is built from the 3.30 map copy format (map-rare-t16-330.txt),
// not a real Nightmare Map copy.
import fs from 'fs'
import { fileURLToPath } from 'url'
import { test, expect } from './harness'
import type { Overlay } from './harness'

const DENSE = fileURLToPath(new URL('../fixtures/http/poe.ninja/poe1/api/economy/current/dense/overviews.json', import.meta.url))
const FLAT = [0, 0, 0, 0, 0, 0, 0]
// poe.ninja Covens, 2026-11-20.
const FRAGMENTS = JSON.stringify({
  type: 'Fragment',
  lines: [
    ['Reality Fragment', 143], ['Awakening Fragment', 20], ['Decaying Fragment', 79], ['Blazing Fragment', 19],
    ['Devouring Fragment', 177], ['Cosmic Fragment', 131], ['Synthesising Fragment', 13], ['Lonely Fragment', 12],
    ['Traumatic Fragment', 8], ['Reverent Fragment', 126]
  ].map(([name, chaos]) => ({ name, chaos, graph: FLAT }))
})
const UNIQUES = [
  JSON.stringify({ type: 'UniqueWeapon', lines: [{ name: 'The Dark Seer', variant: 'Shadow Sceptre', chaos: 646, graph: FLAT }] }),
  JSON.stringify({ type: 'UniqueArmour', lines: [{ name: 'Wraithlord', variant: 'Bone Circlet', chaos: 6, graph: FLAT }, { name: "Malachai's Mark", variant: 'Murder Mitts', chaos: 30, graph: FLAT }, { name: 'Manastorm', variant: 'Lacewood Spirit Shield', chaos: 30, graph: FLAT }] }),
  JSON.stringify({ type: 'UniqueAccessory', lines: [{ name: 'Yoke of Suffering', variant: 'Onyx Amulet', chaos: 35, graph: FLAT }] })
].join(',')
const MAPS = JSON.stringify({ type: 'Map', lines: [{ name: 'Nightmare Map', variant: 'T0, Gen-24', chaos: 65, graph: FLAT }] })
const SLOW = { timeout: 20_000 }

async function setup (overlay: Overlay, show: boolean) {
  const recorded = fs.readFileSync(DENSE, 'utf8')
  await overlay.page.route('**/dense/overviews*', (route) => route.fulfill({
    contentType: 'application/json',
    body: recorded.replace(/\[\s*\{"type":"/, () => `[${FRAGMENTS},${MAPS},${UNIQUES},{"type":"`)
  }))
  const searches: unknown[] = []
  await overlay.page.route('**/api/trade/search/**', async (route) => {
    searches.push(route.request().postDataJSON())
    await route.fulfill({
      contentType: 'application/json',
      headers: { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' },
      body: JSON.stringify({ id: 'q', total: 0, result: [] })
    })
  })
  await overlay.boot({
    overlayActive: show,
    widgets: [{ wmType: 'woke-boss-runs' }],
    patch: c => {
      const w = c.widgets.find((w: { wmType: string }) => w.wmType === 'woke-boss-runs')
      w.wmFlags = ['invisible-on-blur']
      if (show) w.wmWants = 'show'
      w.anchor = { pos: 'cc', x: 50, y: 50 }
      w.selected = 'nightmare-ziggurat'
      w.tier = 'nightmare'
      w.sort = 'hour'
      w.runSeconds = {}
      w.rates = {}
      w.extraDrops = {}
      w.kills = {}
      w.ownEntry = false
    }
  })
  return searches
}

test('Nightmare Map price check: five maps ranked by fragment value', async ({ overlay }) => {
  const searches = await setup(overlay, false)
  await overlay.copyItem('items/map-nightmare-330.txt')
  const strip = overlay.widget('price-check').locator('[data-woke-nightmare]')
  const maps = strip.locator('[data-nightmare-map]')
  await expect(maps).toHaveCount(5, SLOW)
  // Ziggurat (Devouring) pays most, Fortress least, at these prices.
  await expect(maps.first()).toHaveText('Ziggurat')
  await expect(maps.last()).toHaveText('Fortress')
  // Devouring: ~80% under Ziggurat, which favours it; ~5% elsewhere.
  const devouring = strip.locator('[data-nightmare-frag="Devouring Fragment"] td')
  await expect(devouring.nth(1)).toHaveText('~80%')
  await expect(devouring.nth(2)).toHaveText('~5%')
  // Sanctuary favours three: ~53% each.
  const sanct = await maps.allTextContents()
  const col = sanct.indexOf('Sanctuary') + 1
  await expect(strip.locator('[data-nightmare-frag="Reverent Fragment"] td').nth(col)).toHaveText('~53%')
  // Each boss's own unique, priced, in its map's column.
  const unique = strip.locator('[data-nightmare-unique] td').nth(col)
  await expect(unique).toHaveAttribute('title', 'The Dark Seer')
  await expect(unique).toContainText('~5%')
  await expect(strip).toContainText('~ is an estimate')
  await overlay.snap('nightmare map price check')
  expect(searches).toEqual([])
  expect(overlay.errors).toEqual([])
})

test('Boss runs: Nightmare tab with estimated fragment chances', async ({ overlay }) => {
  const searches = await setup(overlay, true)
  const panel = overlay.widget('woke-boss-runs')
  await expect(panel.getByText('Ziggurat Map').first()).toBeVisible(SLOW)
  await expect(panel).toContainText('Fragments a kill')
  await expect(panel.locator('.w-row').filter({ hasText: 'Devouring Fragment' }).first()).toContainText('~80.0%', SLOW)
  await expect(panel).toContainText('is an estimated chance')
  await overlay.snap('boss runs nightmare tab')
  expect(searches).toEqual([])
  expect(overlay.errors).toEqual([])
})

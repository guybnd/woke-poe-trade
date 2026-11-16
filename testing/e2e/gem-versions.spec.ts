// A gem's other versions under its name: poe.ninja prices at once, folded to
// one line, and a trade search only for the row that is clicked.
import type { Page } from '@playwright/test'
import { test, expect, fixtureText } from './harness'

const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }

const GEM = `Item Class: Skill Gems
Rarity: Gem
Eye of Winter of Transience
--------
Projectile, Spell, Cold, Duration
Level: 21 (Max)
Cost: 20 Mana
Cast Time: 0.70 sec
Quality: +20% (augmented)
--------
Requirements:
Level: 72
Int: 155
--------
Fires a projectile.
--------
Experience: 1/1
--------
Place into an item socket of the right colour to gain this skill. Right click to remove from a socket.
--------
Corrupted`

// Real poe.ninja prices for this gem on 2026-11-16.
const VERSIONS: Array<[string, number]> = [
  ['21/23c', 155], ['21/20c', 90], ['21c', 30], ['20/20', 25], ['20/20c', 20], ['1/20', 10], ['1', 3]
]

async function fakeMarket (page: Page) {
  const searches: string[] = []
  await page.route('**/dense/overviews**', (route) => {
    const data = JSON.parse(fixtureText('http/poe.ninja/poe1/api/economy/current/dense/overviews.json'))
    const gems = data.itemOverviews.find((o: { type: string }) => o.type === 'SkillGem')
    gems.lines.push(...VERSIONS.map(([variant, chaos]) =>
      ({ name: 'Eye of Winter of Transience', variant, chaos, graph: [0, 0, 0, 0, 0, 0, 0] })))
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
  })
  await page.route('**/api/trade/search/**', (route) => {
    searches.push(route.request().postData() ?? '')
    return route.fulfill({
      contentType: 'application/json',
      headers: LIMITS,
      body: JSON.stringify({ id: 'q', total: 31, result: ['r0', 'r1', 'r2'] })
    })
  })
  await page.route('**/api/trade/fetch/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({
      result: route.request().url().split('/fetch/')[1].split('?')[0].split(',').map((id, i) => ({
        id,
        item: { frameType: 4, name: '', typeLine: 'Eye of Winter of Transience', corrupted: false },
        listing: {
          indexed: new Date().toISOString(),
          fee: 1,
          price: { amount: 22 + i, currency: 'chaos' },
          account: { name: `seller${id}`, lastCharacterName: `char${id}` }
        }
      }))
    })
  }))
  return searches
}

test('a gem lists its other versions with poe.ninja prices and searches one only on a click', async ({ overlay }) => {
  const searches = await fakeMarket(overlay.page)
  await overlay.boot()
  await overlay.copyItem(GEM)
  const panel = overlay.widget('price-check')
  const fold = panel.getByRole('button', { name: /7 versions/ })
  await expect(fold).toBeVisible()
  // Open from the start: poe.ninja prices for every version, nothing searched.
  const table = panel.locator('[data-gem-versions]')
  const row = table.getByRole('row').filter({ hasText: /^20\s*20\s*25/ })
  await expect(table.getByRole('row')).toHaveCount(8)
  await expect(table.getByRole('row').filter({ hasText: 'yours' })).toContainText('21')
  await overlay.page.waitForTimeout(300)
  const before = searches.length

  // Folding and opening again spends nothing.
  await fold.click()
  await expect(table.getByRole('row')).toHaveCount(0)
  await fold.click()
  await expect(table.getByRole('row')).toHaveCount(8)
  await overlay.page.waitForTimeout(300)
  expect(searches.length).toBe(before)

  await row.click()
  await expect(row).toContainText('31 listed')
  expect(searches.length).toBe(before + 1)
  const body = JSON.parse(searches[searches.length - 1])
  expect(body.query.filters.misc_filters.filters).toMatchObject({
    gem_level: { min: 20 }, quality: { min: 20 }, corrupted: { option: 'false' }
  })
  await overlay.snap('gem-versions-open')

  // A second click on a searched row spends nothing.
  await row.click()
  await overlay.page.waitForTimeout(300)
  expect(searches.length).toBe(before + 1)
})

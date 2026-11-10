// Ticking mods in the price check must not move what you are clicking.
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

test('ticking and unticking mods leaves everything where it is', async ({ overlay }) => {
  await fakeTrade(overlay.page)
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  const stunBeforeSearch = await top(panel.locator('[data-stat-row]').getByText('18% increased Stun and Block Recovery').first())
  await panel.getByRole('button', { name: 'Search' }).click()
  // Through the first search too: loading, then the verdict arriving.
  expect(await top(panel.locator('[data-stat-row]').getByText('18% increased Stun and Block Recovery').first())).toBe(stunBeforeSearch)
  await expect(panel).toContainText('Matched: 12')
  await expect(panel.locator('.w-pc-foot')).toBeVisible()
  await expect(panel.locator('.w-pc-foot')).toContainText('12 of 12')

  const stun = panel.locator('[data-stat-row]').getByText('18% increased Stun and Block Recovery').first()
  expect(await top(stun)).toBe(stunBeforeSearch)
  const life = panel.getByText('total maximum Life').first()
  const window = overlay.page.locator('#price-window')
  const before = {
    stun: await top(stun),
    life: await top(life),
    firstRow: await top(panel.locator('.w-pc-table tbody tr').nth(1)),
    windowTop: await top(window),
    windowHeight: Math.round((await window.boundingBox())!.height)
  }

  // Tick, untick, tick: a row that moves puts the next click on the wrong mod.
  for (let i = 0; i < 3; i += 1) {
    await stun.click()
    await overlay.page.waitForTimeout(50)
    expect(await top(stun)).toBe(before.stun)
    expect(await top(life)).toBe(before.life)
    expect(await top(window)).toBe(before.windowTop)
    expect(Math.round((await window.boundingBox())!.height)).toBe(before.windowHeight)
  }
  await overlay.snap('after changing filters')

  // Old results stay on screen, marked as out of date, until you search again.
  const firstRow = panel.locator('.w-pc-table tbody tr').nth(1)
  await expect(firstRow).toBeVisible()
  await expect(panel.locator('.w-pc-results-stale').first()).toBeVisible()
  expect(await top(firstRow)).toBe(before.firstRow)

  // Dimmed results still scroll and show their tooltips.
  await firstRow.hover()
  await expect(overlay.page.getByRole('tooltip')).toBeVisible()
  await stun.hover()

  // Passing over Search on the way to the results doesn't search.
  const search = (await panel.getByRole('button', { name: 'Search' }).boundingBox())!
  await overlay.page.mouse.move(search.x + search.width / 2, search.y + search.height / 2)
  await overlay.page.mouse.move(search.x + search.width / 2, search.y + search.height + 40)
  await overlay.page.waitForTimeout(300)
  await expect(panel.locator('.w-pc-results-stale').first()).toBeVisible()

  // Coming from the filters and stopping on Search does.
  await stun.hover()
  await overlay.page.mouse.move(search.x + search.width / 2, search.y + search.height / 2)
  await expect(panel.locator('.w-pc-results-stale')).toHaveCount(0)
  // Nothing above the filters collapses while the new results load.
  expect(await top(stun)).toBe(before.stun)
  // Loading rows take the space the last results did.
  expect(Math.round((await window.boundingBox())!.height)).toBe(before.windowHeight)
  await expect(panel).toContainText('Matched: 12')
  await overlay.page.waitForTimeout(1200)
  expect(await top(stun)).toBe(before.stun)
  await overlay.snap('after searching again')
})

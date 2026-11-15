// The Market window: a Prices tab with poe.ninja's categories in a side list, a
// filter, sorting and the 7-day line, beside the Movers and Watchlist tabs.
import fs from 'node:fs'
import { test, expect } from './harness'

// MARKET_DENSE=path/to/overviews.json shows a live poe.ninja download instead
// of the recorded one (for screenshots of the current league).
async function routeDense (page: import('@playwright/test').Page) {
  const file = process.env.MARKET_DENSE
  if (!file) return
  const body = fs.readFileSync(file, 'utf8')
  await page.route('**/dense/overviews*', route => route.fulfill({ contentType: 'application/json', body }))
}

test('the Prices tab lists every category and filters and sorts one', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await routeDense(overlay.page)
  await overlay.boot({
    overlayActive: true,
    widgets: [{ wmType: 'woke-market-tracker', wmWants: 'show', wmFlags: ['uninitialized'], anchor: { pos: 'tl', x: 20, y: 12 } }]
  })
  const panel = overlay.widget('woke-market-tracker')
  await expect(panel.getByRole('tab', { name: 'Prices' })).toHaveAttribute('aria-selected', 'true')
  const side = panel.getByRole('navigation', { name: 'Categories' })
  await expect(side.getByRole('button', { name: /^Currency\s*\d+$/ })).toBeVisible({ timeout: 20_000 })
  await expect(side).toContainText('Divination Cards')
  await expect(side).toContainText('Unique Armours')
  await expect(side).not.toContainText('Base Types')
  await expect(panel.locator('.w-row', { hasText: 'Divine Orb' }).first()).toBeVisible()
  // Each category wears its art, like poe.ninja.
  await expect(side.getByRole('button', { name: /^Currency/ }).locator('img')).toHaveCount(1)
  await overlay.snap('currency')
  // A live download (MARKET_DENSE) has 3.30's Viscera, with poe.ninja's art.
  if (process.env.MARKET_DENSE) {
    await side.getByRole('button', { name: /^Viscera/ }).click()
    await expect(panel.locator('.w-row img').first()).toBeVisible()
    await overlay.snap('viscera')
    await side.getByRole('button', { name: /^Currency/ }).click()
  }

  // Right-click: the item strip, then poe.ninja's 1-day and 7-day change.
  await panel.locator('.w-row', { hasText: 'Divine Orb' }).first().click({ button: 'right' })
  const menu = overlay.page.getByRole('menu')
  await expect(menu).toContainText('1 day')
  await expect(menu).toContainText('7 days')
  await expect(menu.getByRole('menuitem', { name: 'Open on poe.ninja' })).toBeVisible()
  await overlay.snap('row menu')
  // A click outside closes it (Esc would close the whole overlay).
  await overlay.page.mouse.click(1800, 1000)
  await expect(menu).toHaveCount(0)

  // Value, highest first: the first row is worth at least the second.
  const values = async () => panel.locator('.w-row:not(.w-row--head)').evaluateAll(rows =>
    rows.slice(0, 5).map(r => r.querySelector('span:nth-child(2)')?.textContent ?? ''))
  expect((await values()).length).toBeGreaterThan(1)

  await side.getByRole('button', { name: /^Divination Cards/ }).click()
  await expect(panel.getByRole('textbox')).toHaveAttribute('placeholder', 'Filter Divination Cards')
  const rowsBefore = await panel.locator('.w-row:not(.w-row--head)').count()
  expect(rowsBefore).toBeGreaterThan(1)
  // Under 1c a price reads per divine, as poe.ninja shows it ("1 div / 224").
  if (!process.env.MARKET_DENSE) await expect(panel.locator('.w-row', { hasText: 'Rain of Chaos' })).toContainText('/')
  await panel.getByRole('textbox').fill('doctor')
  await expect(panel.locator('.w-row:not(.w-row--head)').first()).toContainText(/doctor/i)
  await panel.getByRole('textbox').fill('zzzz no such card')
  await expect(panel).toContainText('No divination cards match "zzzz no such card"')
  await panel.getByRole('textbox').fill('')

  // Name sort, A first.
  await panel.getByRole('button', { name: 'Name' }).click()
  const names = await panel.locator('.w-row:not(.w-row--head) > span:first-child').evaluateAll(rows => rows.slice(0, 6).map(r => r.textContent?.trim() ?? ''))
  expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names)
  await overlay.snap('divination cards by name')

  // Movers and the watchlist are tabs of the same window.
  await panel.getByRole('tab', { name: 'Movers' }).click()
  await expect(panel.getByPlaceholder('Search every price')).toBeVisible()
  await expect(side).toHaveCount(0)
  await panel.getByRole('tab', { name: 'Prices' }).click()
  await expect(side).toBeVisible()
  expect(overlay.errors).toEqual([])
})

test('a separate Market window from a dev build folds back into one window with tabs', async ({ overlay, fakeApp }) => {
  await overlay.boot({
    patch: (config) => {
      config.woke.version = 2
      config.widgets = config.widgets.filter((w: { wmType: string }) => w.wmType !== 'woke-market' && w.wmType !== 'woke-market-tracker')
      const id = Math.max(...config.widgets.map((w: { wmId: number }) => w.wmId)) + 1
      const base = { wmWants: 'hide', wmZorder: null, wmFlags: ['invisible-on-blur'], anchor: { pos: 'tl', x: 20, y: 12 } }
      config.widgets.push(
        { ...base, wmId: id, wmType: 'woke-market-tracker', wmTitle: 'Movers', view: 'watchlist', period: '24h', minChaos: 5, typeFilter: '', watchlist: [] },
        { ...base, wmId: id + 1, wmType: 'woke-market', wmTitle: 'Market', category: 'Essence', sort: 'value', desc: true, unit: 'chaos', hideThin: false, corrupted: 'any' }
      )
      const menu = config.widgets.find((w: { wmType: string }) => w.wmType === 'menu')
      menu.pinned = [id + 1, id]
    }
  })
  fakeApp.clearReceived()
  await overlay.page.evaluate(() => window.dispatchEvent(new Event('blur')))
  const config = JSON.parse((await fakeApp.waitForReceived('CLIENT->MAIN::save-config')).contents as string) as
    { widgets: Array<{ wmId: number, wmType: string, wmTitle: string, view?: string, priceCategory?: string, pinned?: number[] }> }
  expect(config.widgets.some(w => w.wmType === 'woke-market')).toBe(false)
  const market = config.widgets.find(w => w.wmType === 'woke-market-tracker')!
  expect(market).toMatchObject({ wmTitle: 'Market', view: 'prices', priceCategory: 'Essence' })
  expect(config.widgets.find(w => w.wmType === 'menu')?.pinned).toEqual([market.wmId])
  expect(overlay.errors).toEqual([])
})

test('a Viscera tooltip lists each of its effects with its price', async ({ overlay }) => {
  const recorded = fs.readFileSync(new URL('../fixtures/http/poe.ninja/poe1/api/economy/current/dense/overviews.json', import.meta.url), 'utf8')
  const rows = [
    { name: "Greater Sirus' Head", variant: 'Enemies you Kill have a #% chance to Explode', chaos: 3000, graph: [] },
    { name: "Greater Sirus' Head", variant: 'Transfiguration of Soul', chaos: 900, graph: [] },
    { name: "Greater Sirus' Head", variant: 'Transfiguration of Body', chaos: 200, graph: [] }
  ]
  await overlay.page.route('**/dense/overviews*', route => route.fulfill({
    contentType: 'application/json',
    body: recorded.replace(/\[\s*\{"type":"/, () => `[{"type":"Viscera","lines":${JSON.stringify(rows)}},{"type":"`)
  }))
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({
    overlayActive: true,
    widgets: [{ wmType: 'woke-market-tracker', wmWants: 'show', wmFlags: ['uninitialized'], anchor: { pos: 'tl', x: 20, y: 12 } }]
  })
  const panel = overlay.widget('woke-market-tracker')
  await panel.getByRole('navigation', { name: 'Categories' }).getByRole('button', { name: /^Viscera/ }).click({ timeout: 20_000 })
  await panel.locator('.w-row', { hasText: 'Transfiguration of Soul' }).hover()
  const tip = overlay.page.getByRole('tooltip')
  await expect(tip).toContainText('Viscera · 3 effects')
  await expect(tip).toContainText('Enemies you Kill have a #% chance to Explode')
  await expect(tip).toContainText('Transfiguration of Body')
  await overlay.snap('viscera tooltip')
  expect(overlay.errors).toEqual([])
})

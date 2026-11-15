// The Market window: poe.ninja's categories in a side list, a filter, sorting,
// the 7-day line, and the Movers window that holds the old movers and watchlist.
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

test('the Market window lists every category and filters and sorts one', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await routeDense(overlay.page)
  await overlay.boot({
    overlayActive: true,
    widgets: [{ wmType: 'woke-market', wmWants: 'show', wmFlags: ['uninitialized'], anchor: { pos: 'tl', x: 20, y: 12 } }]
  })
  const panel = overlay.widget('woke-market')
  const side = panel.getByRole('navigation', { name: 'Categories' })
  await expect(side.getByRole('button', { name: /^Currency\s*\d+$/ })).toBeVisible({ timeout: 20_000 })
  await expect(side).toContainText('Divination Cards')
  await expect(side).toContainText('Unique Armours')
  await expect(side).not.toContainText('Base Types')
  await expect(panel.locator('.w-row', { hasText: 'Divine Orb' }).first()).toBeVisible()
  await overlay.snap('currency')

  // Value, highest first: the first row is worth at least the second.
  const values = async () => panel.locator('.w-row:not(.w-row--head)').evaluateAll(rows =>
    rows.slice(0, 5).map(r => r.querySelector('span:nth-child(2)')?.textContent ?? ''))
  expect((await values()).length).toBeGreaterThan(1)

  await side.getByRole('button', { name: /^Divination Cards/ }).click()
  await expect(panel.getByRole('textbox')).toHaveAttribute('placeholder', 'Filter Divination Cards')
  const rowsBefore = await panel.locator('.w-row:not(.w-row--head)').count()
  expect(rowsBefore).toBeGreaterThan(1)
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

  // The old movers and watchlist open in their own window.
  await panel.getByRole('button', { name: 'Movers' }).click()
  await expect(overlay.page.getByRole('tab', { name: /Watchlist/ })).toBeVisible()
  expect(overlay.errors).toEqual([])
})

test('an old Market window becomes Movers, and the new Market goes just before it on the rail', async ({ overlay, fakeApp }) => {
  await overlay.boot({
    patch: (config) => {
      config.woke.version = 1
      config.widgets = config.widgets.filter((w: { wmType: string }) => w.wmType !== 'woke-market' && w.wmType !== 'woke-market-tracker')
      const wmId = Math.max(...config.widgets.map((w: { wmId: number }) => w.wmId)) + 1
      config.widgets.push({
        wmId, wmType: 'woke-market-tracker', wmTitle: 'Market', wmWants: 'hide', wmZorder: null, wmFlags: ['invisible-on-blur'],
        anchor: { pos: 'tl', x: 20, y: 12 }, view: 'watchlist', period: '24h', minChaos: 5, typeFilter: '', watchlist: []
      })
      const menu = config.widgets.find((w: { wmType: string }) => w.wmType === 'menu')
      menu.pinned = [wmId]
    }
  })
  fakeApp.clearReceived()
  await overlay.page.evaluate(() => window.dispatchEvent(new Event('blur')))
  const config = JSON.parse((await fakeApp.waitForReceived('CLIENT->MAIN::save-config')).contents as string) as
    { widgets: Array<{ wmId: number, wmType: string, wmTitle: string, pinned?: number[] }> }
  const market = config.widgets.find(w => w.wmType === 'woke-market')
  const saved = {
    market: market && { id: market.wmId, title: market.wmTitle },
    movers: config.widgets.find(w => w.wmType === 'woke-market-tracker')?.wmTitle,
    moversId: config.widgets.find(w => w.wmType === 'woke-market-tracker')?.wmId,
    pinned: config.widgets.find(w => w.wmType === 'menu')?.pinned
  }
  expect(saved.market?.title).toBe('Market')
  expect(saved.movers).toBe('Movers')
  expect(saved.pinned).toEqual([saved.market?.id, saved.moversId])
  expect(overlay.errors).toEqual([])
})

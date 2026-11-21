// The mouse wheel steps number boxes without clicking into them first: price
// check's roll boxes (min and max), a loot filter number, and boxes with a
// wheel of their own still step once a notch, never twice. Over a box the
// wheel doesn't scroll the panel behind it.
import type { Locator, Page } from '@playwright/test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import zlib from 'zlib'
import { test, expect, FIXTURES } from './harness'

// One notch, as Chrome sends it with Windows' default 3 lines. A box takes
// the wheel only when no scroll was going on, so this waits that out first.
async function wheel (page: Page, box: Locator, notches: number) {
  await box.hover()
  for (let i = 0; i < Math.abs(notches); i++) {
    await page.mouse.wheel(0, notches > 0 ? -100 : 100)
  }
}

// Whether the last wheel event's default (the panel scroll) was stopped.
// Registered after the app's own listener, so it sees the final state.
async function watchScroll (page: Page) {
  await page.evaluate(() => {
    window.addEventListener('wheel', (e) => { (window as any).__wheelStopped = e.defaultPrevented }, { passive: true })
  })
}

const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }
async function fakeTrade (page: Page) {
  await page.route('**/api/trade/search/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({ id: 'q', total: 1, result: ['r0'] })
  }))
  await page.route('**/api/trade/fetch/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({
      result: [{
        id: 'r0',
        item: { ilvl: 86, frameType: 2, name: 'Listed', typeLine: 'Twilight Regalia', explicitMods: [{ description: '+120 to maximum Life', domain: 'explicit' }] },
        listing: { indexed: new Date().toISOString(), fee: 1, price: { amount: 30, currency: 'chaos' }, account: { name: 'seller', lastCharacterName: 'char' } }
      }]
    })
  }))
}

test('price check: the wheel steps a mod row min and max boxes without a click', async ({ overlay }) => {
  await overlay.boot()
  await watchScroll(overlay.page)
  await overlay.copyItem('items/unique-belt-catalysed.txt')
  const win = overlay.page.locator('#price-window')
  await expect(win).toContainText('Elemental Damage with Attack Skills')
  const row = win.locator('div', { has: overlay.page.locator('[data-catalyst-band]') })
    .filter({ hasText: 'Elemental Damage with Attack Skills' }).last()
  const min = row.locator('input.w-roll-input').first()
  const max = row.locator('input.w-roll-input').nth(1)
  await min.fill('25')
  await min.press('Tab')
  await max.fill('')
  await max.press('Tab')
  await max.evaluate((e: HTMLInputElement) => e.blur())
  await expect(min).not.toBeFocused()
  await expect(max).not.toBeFocused()

  await wheel(overlay.page, min, -1)
  await expect(min).toHaveValue('24')
  expect(await overlay.page.evaluate(() => (window as any).__wheelStopped)).toBe(true)
  await wheel(overlay.page, min, 2)
  await expect(min).toHaveValue('26')
  await expect(min).not.toBeFocused()

  // An empty max starts from the item's own roll, then steps from there.
  await expect(max).toHaveValue('')
  await overlay.page.waitForTimeout(600)
  await wheel(overlay.page, max, 1)
  await expect(max).not.toHaveValue('')
  const start = Number(await max.inputValue())
  expect(start).toBeGreaterThanOrEqual(26)
  await wheel(overlay.page, max, -1)
  await expect(max).toHaveValue(String(start - 1))
  await overlay.snap('roll boxes stepped by the wheel')
})

test('price check: boxes that had their own wheel still step once a notch', async ({ overlay }) => {
  await fakeTrade(overlay.page)
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(panel).toContainText('Matched: 1')

  const cap = panel.locator('[data-affix-cap="prefix"]:visible input')
  await cap.fill('2')
  await cap.press('Tab')
  await wheel(overlay.page, cap, -1)
  await expect(cap).toHaveValue('1')

  // A number tile (item level, quality and the like).
  const tile = panel.locator('[role="button"][aria-pressed] input[type="number"]:visible').first()
  const before = Number(await tile.inputValue())
  await wheel(overlay.page, tile, -1)
  await expect(tile).toHaveValue(String(before - 1))
})

test('loot filter: the wheel steps a rule\'s number box without a click', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'),
    zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters', 'neversink', '1-REGULAR.filter.gz'))))
  await overlay.boot({ widgets: [{ wmType: 'woke-loot-filter', wmFlags: ['invisible-on-blur'], sampleHotkey: 'Alt + F', editorHotkey: 'Alt + Shift + F', folder, sourceName: 'NeverSink.filter' }] })
  await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+Shift+F')
  await overlay.pressHotkey('Alt + Shift + F')
  const page = overlay.page
  await watchScroll(page)
  await page.getByRole('tab', { name: 'Rules' }).click()
  await page.getByPlaceholder('Filter groups').fill('cluster')
  await page.getByText('Jewels › Cluster', { exact: true }).click()

  const box = page.getByRole('spinbutton', { name: 'High large: highest passives', exact: true })
  await expect(box).toHaveValue('8')

  // A scroll that drifts onto the box carries on: the box doesn't take it.
  await page.locator('[data-tiers="highlarge"]').getByText('Large Cluster Jewel').hover()
  await page.mouse.wheel(0, 100)
  await box.hover()
  await page.mouse.wheel(0, 100)
  await expect(box).toHaveValue('8')
  expect(await page.evaluate(() => (window as any).__wheelStopped)).toBe(false)
  await page.waitForTimeout(600)
  await wheel(page, box, -1)
  await expect(page.getByRole('spinbutton', { name: 'High large: highest passives', exact: true })).toHaveValue('7')
  expect(await page.evaluate(() => (window as any).__wheelStopped)).toBe(true)
})

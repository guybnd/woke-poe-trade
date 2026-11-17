// Item rows in lists: what hover, right-click and left-click do on an item in
// each list. One shared row gives every list the tooltip and the item menu;
// the left-click stays each list's own.
import fs from 'fs'
import os from 'os'
import path from 'path'
import zlib from 'zlib'
import { test, expect, FIXTURES } from './harness'
import type { Locator, Page } from '@playwright/test'

const tooltip = (page: Page) => page.getByRole('tooltip')
const strip = (page: Page) => page.getByRole('menu')

async function hoverShowsTip (page: Page, row: Locator, name: string | RegExp) {
  await row.hover()
  await expect(tooltip(page)).toBeVisible()
  await expect(tooltip(page)).toContainText(name)
  await page.mouse.move(2, 2)
  await expect(tooltip(page)).toBeHidden()
}

async function rightClickGivesStrip (page: Page, row: Locator, name: string | RegExp) {
  await row.click({ button: 'right' })
  const menu = strip(page)
  await expect(menu).toBeVisible()
  await expect(menu).toContainText(name)
  await expect(menu.getByRole('menuitem', { name: 'Price check' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
}

test('Search: a base\'s uniques show their tooltip and menu, a click opens the unique', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ widgets: [{ wmType: 'woke-market-tracker', wmTitle: 'Market', anchor: { pos: 'tl', x: 40, y: 30 } }] })
  await overlay.showScreen('screens/map-real-01.png')
  await overlay.pressHotkey('Ctrl + Space')
  const page = overlay.page
  const panel = overlay.widget('woke-search')
  const box = panel.getByRole('textbox', { name: 'Search' })
  await expect(async () => {
    await box.fill('headhunter')
    await expect(panel.getByRole('button', { name: /Headhunter/ }).first()).toBeVisible({ timeout: 500 })
  }).toPass({ timeout: 20_000 })

  await box.fill('shagreen boots')
  await panel.getByRole('button', { name: /^Shagreen Boots/ }).first().click()
  await expect(panel.getByText('Uniques on this base')).toBeVisible()
  const row = panel.getByRole('button', { name: /Temptation Step.*40/ }).last()
  await expect(panel.getByTestId('unique-on-base').filter({ hasText: 'Temptation Step' })).toHaveCount(1)
  await hoverShowsTip(page, row, 'Temptation Step')
  await rightClickGivesStrip(page, row, 'Temptation Step')
  await row.click()
  await expect(panel.getByText('Unique Armour')).toBeVisible()
})

test('Alt + F: the uniques a base can drop as', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters/neversink/3-STRICT.filter.gz'))))
  await overlay.boot({
    widgets: [{
      wmType: 'woke-loot-filter',
      wmFlags: ['invisible-on-blur'],
      sampleHotkey: 'Alt + F',
      editorHotkey: 'Alt + Shift + F',
      folder,
      sourceName: 'NeverSink.filter',
      safetyNet: { on: false, minChaos: 20 }
    }]
  })
  await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+F')
  await overlay.copyItem('items/unique-three-step-assault.txt', 'Alt + F')
  const page = overlay.page
  await expect(page.getByText('Can drop as')).toBeVisible()
  // The same list as Search's: art, tooltip and item menu on every row.
  const row = page.getByTestId('unique-on-base').filter({ hasText: 'Temptation Step' })
  await expect(row).toBeVisible()
  await expect(row.locator('img.w-game-icon')).toBeVisible()
  await hoverShowsTip(page, row, 'Temptation Step')
  await rightClickGivesStrip(page, row, 'Temptation Step')
  await overlay.snap('alt f can drop as')
  // A click price checks it.
  await row.click()
  await expect(overlay.widget('price-check')).toContainText('Temptation Step')
})

test('price check side window: a row shows its tooltip and menu, a click price checks it', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/essence-deafening-misery.txt')
  const page = overlay.page
  const side = page.locator('.w-pc-side')
  await expect(side).toBeVisible({ timeout: 20_000 })
  const row = side.getByText(/^Shrieking Essence of Misery$/).first()
  await expect(row).toBeVisible()
  await hoverShowsTip(page, row, 'Shrieking Essence of Misery')
  await rightClickGivesStrip(page, row, 'Shrieking Essence of Misery')
  await row.click()
  await expect(page.getByText('Shrieking Essence of Misery').first()).toBeVisible()
  await expect(side.getByText(/^Deafening Essence of Misery$/)).toBeVisible()
})

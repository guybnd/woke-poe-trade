// The first price check after the overlay starts, in the Tooltip lines (PoE) layout.
// That layout holds the window back until its code loads, so the search started
// before the trade listing was there and used to sit at "Matched: ..." for good.
import { test, expect } from './harness'

const poe = (config: any) => {
  config.widgets.find((w: { wmType: string }) => w.wmType === 'price-check').wokeWindowStyle = 'poe'
}

test('a unique priced from search searches on the first check in PoE mode', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ patch: poe, widgets: [{ wmType: 'woke-market-tracker', wmTitle: 'Market', anchor: { pos: 'tl', x: 40, y: 30 } }] })
  await overlay.showScreen('screens/map-real-01.png')
  await overlay.pressHotkey('Ctrl + Space')
  const panel = overlay.widget('woke-search')
  await panel.getByRole('textbox', { name: 'Search' }).fill('mortem morsu')
  const result = panel.getByRole('button', { name: /Mortem Morsu/ }).first()
  await expect(result).toBeVisible({ timeout: 20_000 })
  await result.click({ button: 'right' })
  await overlay.page.getByRole('menu').getByRole('menuitem', { name: 'Price check' }).click()

  const win = overlay.page.locator('#price-window')
  await expect(win).toHaveClass(/w-poe/)
  await expect(win).toContainText('Fright Claw')
  await expect(win).toContainText('Matched: 42')
  expect(overlay.errors).toEqual([])
})

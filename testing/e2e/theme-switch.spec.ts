// Quick theme switches: the rail's layout popup and the price check's palette button.
import { test, expect } from './harness'

const theme = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.dataset.wokeTheme)

test('the rail layout popup switches the theme', async ({ overlay }) => {
  const { page } = overlay
  await overlay.boot({ overlayActive: true })
  const rail = overlay.widget('menu').locator('.w-surface').first()
  await rail.hover()
  await overlay.widget('menu').getByRole('button', { name: 'Rail layout and size', exact: true }).click()
  const row = page.locator('[data-rail-theme]')
  // One shared list: the game look with PoE 1's or PoE 2's art first, then the themes.
  await expect(row.getByRole('button')).toHaveText(['PoE 1', 'PoE 2', 'Hybrid', 'Native', 'Modern', 'Classic'])
  expect(await theme(page)).toBe('hybrid')
  await row.getByRole('button', { name: 'Modern', exact: true }).click()
  expect(await theme(page)).toBe('modern')
  expect(await page.evaluate(() => localStorage.getItem('woke.theme'))).toBe('modern')
  await expect(row.getByRole('button', { name: 'Modern', exact: true })).toHaveClass(/chipOn/)
})

test('the price check palette switches the look and the filter layout', async ({ overlay }) => {
  const { page } = overlay
  await page.setViewportSize({ width: 2560, height: 1440 })
  // A config that never picked a layout: Tooltip lines.
  await overlay.boot({
    patch: (config) => { delete config.widgets.find((w: { wmType: string }) => w.wmType === 'price-check').wokeWindowStyle }
  })
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const win = page.locator('#price-window')
  await expect(win).toContainText('Energy Shield')
  await expect(win).toHaveClass(/w-poe/)

  const palette = win.getByRole('button', { name: 'Look and filter layout' })
  const pop = win.getByRole('dialog', { name: 'Look and filter layout' })
  // Esc closes the menu, not the window.
  await palette.click()
  await expect(pop).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(pop).toHaveCount(0)
  await expect(win).toBeVisible()

  await palette.click()
  await expect(pop).toBeVisible()
  // PoE 1's art is the default look.
  await expect(pop.getByRole('button', { name: 'PoE 1' })).toHaveAttribute('aria-pressed', 'true')
  await expect(pop.getByRole('button', { name: 'Tooltip lines' })).toHaveAttribute('aria-pressed', 'true')
  await overlay.snap('price check style menu')

  await pop.getByRole('button', { name: 'PoE-native' }).click()
  expect(await theme(page)).toBe('native')

  // Rows: the window redraws at once and the menu stays open.
  await pop.getByRole('button', { name: 'Rows', exact: true }).click()
  await expect(win).not.toHaveClass(/w-poe/)
  await expect(pop).toBeVisible()

  // A click outside closes it, and the window stays put.
  const before = await win.boundingBox()
  await page.mouse.click(2500, 1400)
  await expect(pop).toHaveCount(0)
  expect(await win.boundingBox()).toEqual(before)

  // The next check keeps Rows, and a menu left open when the window hid is gone.
  await palette.click()
  await expect(pop).toBeVisible()
  overlay.app.sendToOverlay({ name: 'MAIN->OVERLAY::hide-exclusive-widget', payload: undefined })
  await expect(win).toBeHidden()
  await expect.poll(() => overlay.savedWidget('price-check')?.wokeWindowStyle).toBe('standard')
  await overlay.copyItem('items/rare-body-armour-es.txt')
  await expect(win).toContainText('Energy Shield')
  await expect(win).not.toHaveClass(/w-poe/)
  await expect(pop).toHaveCount(0)
})

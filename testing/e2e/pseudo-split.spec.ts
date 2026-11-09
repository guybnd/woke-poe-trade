// Splitting a pseudo total into its mods from the chip, and the stat rows'
// right-click menu. Neither searches.
import { test, expect } from './harness'

test('the Pseudo chip splits a total into its mods and folds them back', async ({ overlay }) => {
  const searches: string[] = []
  await overlay.page.route('**/api/trade/search/**', (route) => {
    searches.push(route.request().postData() ?? '')
    return route.abort()
  })
  await overlay.boot()
  await overlay.copyItem('items/rare-ring.txt')
  const panel = overlay.widget('price-check')
  const chip = panel.getByRole('button', { name: /pseudo x 4/i }).first()
  await expect(chip).toBeVisible()
  const fireRow = panel.getByRole('button', { name: /^\+?38% to Fire Resistance$/ })
  await expect(fireRow).toHaveCount(0)

  await chip.click()
  await expect(fireRow).toHaveCount(1)
  await expect(panel.getByRole('button', { name: /^\+?46% to Lightning Resistance$/ })).toHaveCount(1)
  // Fire and Lightning can now be swapped, each to Cold (the other is on the ring).
  await expect(panel.getByRole('button', { name: '⇄' })).toHaveCount(2)
  await overlay.snap('pseudo-split-open')

  // Right-click offers the row's actions, including the swap.
  await fireRow.click({ button: 'right' })
  await expect(overlay.page.getByText('Price as Cold')).toBeVisible()
  await expect(overlay.page.getByText('Search only this')).toBeVisible()
  await overlay.snap('pseudo-split-menu')
  await overlay.page.keyboard.press('Escape')

  await chip.click()
  await expect(fireRow).toHaveCount(0)
  expect(searches).toEqual([])
})

test('Search only this unticks every other stat', async ({ overlay }) => {
  await overlay.page.route('**/api/trade/search/**', (route) => route.abort())
  await overlay.boot()
  await overlay.copyItem('items/rare-ring.txt')
  const panel = overlay.widget('price-check')
  const life = panel.getByRole('button', { name: /total maximum Life$/ })
  await life.click({ button: 'right' })
  await overlay.page.getByText('Search only this').click()
  await expect(panel.getByRole('button', { name: /^1 of \d+/ })).toBeVisible()
})

test('switching presets folds an open split, so coming back finds the total as it was', async ({ overlay }) => {
  await overlay.page.route('**/api/trade/search/**', (route) => route.abort())
  await overlay.boot()
  await overlay.copyItem('items/rare-ring.txt')
  const panel = overlay.widget('price-check')
  const chip = panel.getByRole('button', { name: /pseudo x 4/i }).first()
  const fireRow = panel.getByRole('button', { name: /^\+?38% to Fire Resistance$/ })
  await chip.click()
  await expect(fireRow).toHaveCount(1)
  await panel.getByRole('button', { name: 'Base item' }).click()
  await panel.getByRole('button', { name: 'Pseudo', exact: true }).click()
  await expect(fireRow).toHaveCount(0)
  // The chip splits again rather than saying the mods are already listed.
  await chip.click()
  await expect(fireRow).toHaveCount(1)
})

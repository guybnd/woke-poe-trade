// The window's right-click menu says its entries act on the whole window
// (it can open over a panel's own Hide, like a loot filter rule's), and
// hiding the window offers Undo instead of just making it vanish.
import { test, expect } from './harness'

test('window menu: Hide window hides it, Undo brings it back', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({
    overlayActive: true,
    widgets: [{ wmType: 'woke-market-tracker', wmWants: 'show', wmFlags: ['uninitialized'], anchor: { pos: 'tl', x: 20, y: 12 } }]
  })
  const panel = overlay.widget('woke-market-tracker')
  await expect(panel.getByRole('tab', { name: 'Prices' })).toBeVisible({ timeout: 20_000 })

  await panel.getByRole('tab', { name: 'Prices' }).click({ button: 'right' })
  const menu = overlay.page.getByRole('menu')
  await expect(menu.getByRole('menuitem', { name: 'Minimize window' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: /^Hide$/ })).toHaveCount(0)
  await menu.getByRole('menuitem', { name: 'Hide window' }).click()
  await expect(panel).toBeHidden()

  await expect(overlay.page.getByText('Window hidden.')).toBeVisible()
  await overlay.page.getByRole('button', { name: 'Undo' }).click()
  await expect(panel.getByRole('tab', { name: 'Prices' })).toBeVisible()
})

// The price check's side window: a related row (not the item being checked)
// opens its own price check on a click. Watcher's Eye lists Wild Hellion
// Alpha, a captured beast, which once had no price check to open.
import { test, expect } from './harness'

test('side window: clicking a related beast row price checks that beast', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/unique-watchers-eye.txt')
  const page = overlay.page
  const side = page.locator('.w-pc-side')
  await expect(side).toBeVisible({ timeout: 20_000 })
  // The item being checked stays as it is: no click.
  await expect(side.locator('div[data-item-row]', { hasText: "Watcher's Eye" })).toBeVisible()
  const beast = side.locator('button[data-item-row]', { hasText: 'Wild Hellion Alpha' })
  await expect(beast).toBeVisible()
  await beast.click()
  const panel = overlay.widget('price-check')
  await expect(panel.getByText('Wild Hellion Alpha').first()).toBeVisible()
  await expect(side.locator('div[data-item-row]', { hasText: 'Wild Hellion Alpha' })).toBeVisible()
})

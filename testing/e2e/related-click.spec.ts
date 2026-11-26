// The price check's side window: a related row (not the item being checked)
// opens its own price check on a click. A Deafening essence lists the other
// Deafening essences; its own row stays as it is.
import { test, expect } from './harness'

test('side window: clicking a related row price checks that item', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/essence-deafening-misery.txt')
  const page = overlay.page
  const side = page.locator('.w-pc-side')
  await expect(side).toBeVisible({ timeout: 20_000 })
  // The item being checked stays as it is: no click.
  await expect(side.locator('div[data-item-row]', { hasText: 'Deafening Essence of Misery' })).toBeVisible()
  const other = side.locator('button[data-item-row]', { hasText: 'Deafening Essence of Greed' })
  await expect(other).toBeVisible()
  await other.click()
  const panel = overlay.widget('price-check')
  await expect(panel.getByText('Deafening Essence of Greed').first()).toBeVisible()
  await expect(side.locator('div[data-item-row]', { hasText: 'Deafening Essence of Greed' })).toBeVisible()
})

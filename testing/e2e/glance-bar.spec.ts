// Session story's glance bar: its drag handle shows only while Settings is
// open, never just because the overlay is open over a price check or trade search.
import { test, expect } from './harness'

test('the glance bar handle shows with Settings open, not over a price check', async ({ overlay }) => {
  const boot = () => overlay.boot({ widgets: [{ wmType: 'woke-session-story', glance: true }], overlayActive: true })
  await boot()
  const bar = overlay.page.locator('[data-glance-bar]')
  const handle = overlay.page.locator('[data-glance-drag]')

  // The overlay is open, nothing else: no bar outside a map, no handle.
  await expect(bar).toBeHidden()

  // A price check is up (it hides every other window): still no handle.
  await overlay.copyItem('items/currency-divine.txt')
  await expect(overlay.widget('price-check')).toContainText('Divine Orb')
  await expect(bar).toBeHidden()
  await expect(handle).toBeHidden()

  // Settings open (from a fresh overlay: the menu is under the price check):
  // the bar shows with its handle, and can be dragged.
  await boot()
  await expect(bar).toBeHidden()
  await overlay.widget('menu').locator('.fa-cog').click()
  await expect(overlay.widget('settings')).toBeVisible()
  await expect(bar).toBeVisible()
  await expect(handle).toBeVisible()
  await expect(bar).toHaveAttribute('title', 'Drag to move')
  await overlay.snap('glance-bar-in-settings')
})

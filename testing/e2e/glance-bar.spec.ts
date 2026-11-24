// Session story's glance bar: its drag handle shows only while Settings is
// open, never just because the overlay is open over a price check or trade search.
import { test, expect } from './harness'

// The default config already has the session story widget (its bar on by
// default since the veteran review): turn it on explicitly, not a second copy.
function patch (c: { widgets: Array<{ wmType: string, glance?: boolean }> }) {
  c.widgets.find(w => w.wmType === 'woke-session-story')!.glance = true
}

test('the glance bar handle stays hidden with the overlay open over a price check', async ({ overlay }) => {
  await overlay.boot({ patch })
  const bar = overlay.page.locator('[data-glance-bar]')

  // Price check first (hotkeys only work while the game has focus), then the overlay.
  await overlay.copyItem('items/currency-divine.txt')
  await expect(overlay.widget('price-check')).toContainText('Divine Orb')
  await overlay.pressHotkey(overlay.config.overlayKey)
  await expect(overlay.widget('price-check')).toBeVisible()
  await expect(bar).toBeHidden()
  await expect(overlay.page.locator('[data-glance-drag]')).toBeHidden()
})

test('the glance bar handle shows with Settings open, not with only the overlay open', async ({ overlay }) => {
  await overlay.boot({ patch, overlayActive: true })
  const bar = overlay.page.locator('[data-glance-bar]')
  const handle = overlay.page.locator('[data-glance-drag]')

  // The overlay is open, nothing else: no bar outside a map, no handle.
  await expect(bar).toBeHidden()

  await overlay.widget('menu').locator('.fa-cog').click()
  await expect(overlay.widget('settings')).toBeVisible()
  await expect(bar).toBeVisible()
  await expect(handle).toBeVisible()
  await expect(bar).toHaveAttribute('title', 'Drag to move')
  await overlay.snap('glance-bar-in-settings')
})

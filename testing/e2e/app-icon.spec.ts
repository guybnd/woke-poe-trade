// Picking an app icon in Settings > Look reaches the host (tray, windows) and
// the overlay's own mark.
import { test, expect } from './harness'

test('Eternal Orb by default; a picked icon reaches the tab bar and the host', async ({ overlay, fakeApp, page }) => {
  await overlay.boot({ overlayActive: true })
  const mark = overlay.widget('menu').locator('img[src*="app-icons"]').first()
  await expect(mark).toHaveAttribute('src', '/images/app-icons/eternal-orb.png')

  await overlay.widget('menu').locator('.fa-cog').click()
  await overlay.widget('settings').getByText('Look & icon row').first().click()
  const picker = overlay.widget('settings').getByRole('radio', { name: 'Goldrim' })
  await expect(overlay.widget('settings').getByRole('radio', { name: 'Eternal Orb' })).toBeChecked()
  await overlay.snap('app icon picker')

  await picker.check({ force: true })
  await expect(mark).toHaveAttribute('src', '/images/app-icons/goldrim.png')
  await fakeApp.waitForReceived('CLIENT->MAIN::update-host-config',
    (cfg: { appIcon?: string }) => cfg.appIcon === 'goldrim', 10_000)
  await overlay.snap('goldrim on the tab bar')

  const broken = await page.evaluate(() => [...document.images]
    .filter(i => i.src.includes('app-icons') && i.complete && i.naturalWidth === 0).map(i => i.src))
  expect(broken).toEqual([])
})

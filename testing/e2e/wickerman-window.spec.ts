// The Wickerman window: each Viscera shows the mod of the version for your
// area level, and every version on hover.
import { test, expect } from './harness'

test('each Viscera row shows its mod for your level, every version on hover', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({
    overlayActive: true,
    widgets: [{ wmType: 'woke-wickerman', wmWants: 'show', wmFlags: ['uninitialized'], anchor: { pos: 'tl', x: 20, y: 12 } }]
  })
  const panel = overlay.widget('woke-wickerman')
  const row = panel.locator('[data-woke-wickerman-row]', { hasText: "Warden's Arm" })
  await expect(row).toContainText('to maximum Life', { timeout: 20_000 })
  await expect(row).toHaveAttribute('title', /Low: \+\(30-50\) to maximum Life\nMed: .*\nHigh: /)
  await expect(panel).toContainText('Mods of the plain versions')
  await overlay.snap('wickerman window')
  expect(overlay.errors).toEqual([])
})

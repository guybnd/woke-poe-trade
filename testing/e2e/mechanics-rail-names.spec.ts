// The League mechanics rail: short tags by default, a toggle at its foot
// shows full names, and the choice is kept in the widget's config.
import { test, expect } from './harness'

test('rail toggle switches short tags and full names, buttons never clipped', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ widgets: [{ wmType: 'woke-mechanics' }], overlayActive: true })
  const widget = overlay.widget('woke-mechanics')
  await overlay.widget('menu').getByRole('button', { name: 'All tools' }).click()
  await overlay.page.getByRole('button', { name: /League mechanics/ }).first().click()
  const rail = widget.getByRole('tablist')
  const delve = rail.getByRole('tab', { name: 'Delve' })
  await expect(delve).toHaveText('DLV')

  // No tab is wider than the rail's inside (the old 52px column clipped them).
  // scrollWidth, not screen boxes: panels carry CSS zoom.
  const fits = () => rail.evaluate(el => el.scrollWidth <= el.clientWidth)
  expect(await fits()).toBe(true)
  await overlay.snap('mechanics-rail-short')

  await widget.getByRole('button', { name: 'Show full names' }).click()
  await expect(delve).toHaveText('Delve')
  await expect(rail.getByRole('tab', { name: 'Expedition' })).toHaveText('Expedition')
  expect(await fits()).toBe(true)
  await overlay.snap('mechanics-rail-names')

  await widget.getByRole('button', { name: 'Short names' }).click()
  await expect(delve).toHaveText('DLV')
})

// What's new in the dock (renderer/src/web/woke/dock/WhatsNew.vue): players
// who update see what's new while they play, can open each feature, and
// dismiss each line.
import { test, expect } from './harness'

test('players who update get a What\'s new icon in the dock; a hover lists the lines', async ({ overlay }) => {
  await overlay.boot()
  const icon = overlay.dockIcon('whats-new')
  await expect(icon).toBeVisible()
  await overlay.hoverDockIcon('whats-new')
  await expect(icon.locator('[data-whats-new-line]')).toHaveCount(3)
  await expect(icon).toContainText('Map mods')
  await overlay.snap('what\'s new card in the dock')
})

test('with the overlay open: Show me opens the tool, dismiss takes a line off, the last one takes the icon', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true })
  const icon = overlay.dockIcon('whats-new')
  await icon.click()
  await overlay.page.mouse.move(5, 5)
  const lines = icon.locator('[data-whats-new-line]')
  await expect(lines).toHaveCount(3)

  await lines.filter({ hasText: 'Atlas strategies' }).locator('[data-whats-new-dismiss]').click()
  await expect(lines).toHaveCount(2)

  await lines.filter({ hasText: 'Map mods' }).getByRole('button', { name: 'Show me' }).click()
  await expect(lines).toHaveCount(1)
  await expect(overlay.page.getByRole('button', { name: 'Map mods', exact: true })).toHaveClass(/open/)

  // Net worth's reader is off: its line still shows. Dismissing the last line takes the icon.
  await expect(lines).toContainText('Net worth')
  await lines.locator('[data-whats-new-dismiss]').click()
  await expect(icon).toHaveCount(0)
})

test('a fresh install gets no What\'s new icon', async ({ overlay }) => {
  await overlay.boot({ patch: c => { c.woke.seenNews = ['net-worth-public', 'map-mods-t17-planner', 'atlas-planner-links'] } })
  await overlay.page.waitForTimeout(1000)
  await expect(overlay.dockIcon('whats-new')).toHaveCount(0)
})

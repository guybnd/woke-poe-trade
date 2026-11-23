// What's new in the dock (renderer/src/web/woke/dock/WhatsNew.vue): players
// who update see what's new while they play, can open each feature, and
// dismiss each line.
import { test, expect } from './harness'
import { NEWS } from '../../renderer/src/web/woke/tab-bar/news'
import { gotoTargets } from '../../renderer/src/web/woke/tab-bar/goto-targets'

test('players who update get a What\'s new icon in the dock; a hover lists the lines', async ({ overlay }) => {
  await overlay.boot({ whatsNew: true })
  const icon = overlay.dockIcon('whats-new')
  await expect(icon).toBeVisible()
  await overlay.hoverDockIcon('whats-new')
  await expect(icon.locator('[data-whats-new-line]')).toHaveCount(NEWS.length)
  await expect(icon).toContainText('Map mods')
  await overlay.snap('what\'s new card in the dock')
})

test('with the overlay open: Show me opens the tool, dismiss takes a line off, the last one takes the icon', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, whatsNew: true })
  const icon = overlay.dockIcon('whats-new')
  await icon.click()
  await overlay.page.mouse.move(5, 5)
  const lines = icon.locator('[data-whats-new-line]')
  await expect(lines).toHaveCount(NEWS.length)

  await lines.filter({ hasText: 'Atlas strategies' }).first().locator('[data-whats-new-dismiss]').click()
  await expect(lines).toHaveCount(NEWS.length - 1)

  await lines.filter({ hasText: 'Map mods' }).first().getByRole('button', { name: 'Show me' }).click()
  await expect(lines).toHaveCount(NEWS.length - 2)
  await expect(overlay.page.getByRole('button', { name: 'Map mods', exact: true })).toHaveClass(/open/)

  // Net worth's reader is off: its line still shows. Dismiss all takes the icon.
  await expect(lines.filter({ hasText: 'Net worth' }).first()).toBeVisible()
  await icon.locator('[data-whats-new-dismiss-all]').click()
  await expect(icon).toHaveCount(0)
})

test('a fresh install gets no What\'s new icon, even before setup is finished', async ({ overlay }) => {
  await overlay.boot({ firstRun: true, whatsNew: true })
  await overlay.page.waitForTimeout(1000)
  await expect(overlay.dockIcon('whats-new')).toHaveCount(0)
})

// Every line's Show me lands on the tab it names (tab-bar/goto.ts). Net worth's
// lines go to its switch in Settings here, since the stash reader is off.
for (const n of NEWS.filter(n => n.goto && n.wmType !== 'woke-net-worth')) {
  test(`Show me on "${n.id}" opens ${n.name} on its tab`, async ({ overlay }) => {
    await overlay.boot({ overlayActive: true, whatsNew: true })
    const icon = overlay.dockIcon('whats-new')
    await icon.click()
    await overlay.page.mouse.move(5, 5)
    const line = icon.locator('[data-whats-new-line]').filter({ hasText: n.note.replace(/^New: /, '').slice(1, 30) })
    await line.getByRole('button', { name: 'Show me' }).click()
    const label = gotoTargets(n.wmType)![n.goto!]
    await expect(overlay.page.getByRole('tab', { name: label, selected: true }).first()).toBeVisible()
  })
}

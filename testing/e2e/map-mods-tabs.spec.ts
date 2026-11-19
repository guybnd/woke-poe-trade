// Map mods tabs: the T17 switch, the picked-first list, and a real chart on the
// verdict card. Runs against the fake game, so it's safe while PoE is open.
import { test, expect } from './harness'

test('tabs switch the list, picks sort to the top, the T17 switch hides T17 mods', async ({ overlay }) => {
  // The panel hides while the game has focus.
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-map-mods', wmWants: 'show' }] })
  const panel = overlay.widget('woke-map-mods')

  await expect(panel.getByRole('tab', { name: /^Maps/ })).toHaveAttribute('aria-selected', 'true')
  await expect(panel.getByPlaceholder(/Search \d+ map mods/)).toBeVisible()
  // The picks block is gone: the default profile's picks head the list.
  await expect(panel.getByText(/^Careful · \d+$/)).toBeVisible()
  await overlay.snap('map mods maps tab')

  const search = panel.getByPlaceholder(/Search \d+ map mods/)
  await search.fill('Drowning Orbs')
  await expect(panel.getByText('Area contains Drowning Orbs')).toBeVisible()
  await panel.getByRole('switch').click()
  await expect(panel.getByText('Area contains Drowning Orbs')).toHaveCount(0)
  await panel.getByRole('switch').click()
  await search.fill('')

  await panel.getByRole('tab', { name: /^Heist/ }).click()
  await expect(panel.getByText('Guards deal #% increased Damage')).toBeVisible()
  await expect(panel.getByRole('switch')).toHaveCount(0)
  // Its own search: starts empty, and a pick fills only this one.
  await expect(panel.getByText('Rate mods to build a search')).toBeVisible()
  await panel.getByText('Guards deal #% increased Damage').locator('..').getByRole('radio', { name: 'avoid' }).or(
    panel.getByText('Guards deal #% increased Damage').locator('..').getByRole('button', { name: 'avoid' })
  ).first().click()
  await expect(panel.getByText('Rate mods to build a search')).toHaveCount(0)
  await expect(panel.getByRole('tab', { name: /^Heist/ })).toContainText('1')
  await overlay.snap('map mods heist tab')

  await panel.getByRole('tab', { name: /^Charts/ }).click()
  await expect(panel.getByText('Monsters fire # additional Projectiles')).toBeVisible()
  await overlay.snap('map mods charts tab')
})

test('checking a chart shows the verdict card with its mods', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/chart-sandy-seabed.txt', 'Alt + M')
  const card = overlay.widget('woke-map-check')
  await expect(card).toContainText('Monsters fire 2 additional Projectiles')
  await expect(card).toContainText('Juice')
  await expect(card).not.toContainText('Voyage Modifier')
  await overlay.snap('chart verdict card')
})

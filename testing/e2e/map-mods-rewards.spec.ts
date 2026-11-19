// Map mods redesign: the Rewards table (minimums + juice weights), the
// map check card's "Your rewards" block and its Edit link, and naming a
// search saved to the Regex library. Fake game only, safe while PoE is open.
import { test, expect } from './harness'

test('rewards set in Map mods show on the map check card', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-map-mods', wmWants: 'show' }] })
  const panel = overlay.widget('woke-map-mods')
  const rewards = panel.getByTestId('map-rewards-table')
  await expect(rewards).toBeVisible()

  await rewards.getByLabel('Minimum atlas drops').fill('80')
  await rewards.getByLabel('Minimum pack size').fill('25')
  await expect(rewards).toContainText('2 minimums set')
  // The search picks up the minimums.
  await expect(panel.locator('code').first()).toContainText('ops: .')

  // Juice weight: the fourth square sets the 2× maximum, clicking it again lowers it.
  const currency = rewards.getByRole('group', { name: 'More currency juice weight' })
  const max = currency.getByRole('button', { name: '2×' })
  await max.click()
  await expect(max).toHaveAttribute('aria-pressed', 'true')
  await max.click()
  await expect(max).toHaveAttribute('aria-pressed', 'false')
  await expect(currency.getByRole('button', { name: '1.5×' })).toHaveAttribute('aria-pressed', 'true')
  await overlay.snap('map mods rewards table')

  // Back to the game, where the check hotkey works.
  // Atlas drops +72% misses 80, pack size +28% meets 25.
  overlay.app.focusGame(true)
  await expect.poll(() => overlay.app.registeredHotkeys().length).toBeGreaterThan(0)
  await overlay.copyItem('items/map-rare-t16-330.txt', 'Alt + M')
  const card = overlay.widget('woke-map-check')
  const block = card.getByTestId('map-rewards')
  await expect(block).toContainText('1 of 2 met')
  await expect(block).toContainText('need 80')
  await expect(block).toContainText('+72%')
  await overlay.snap('map check card rewards')

  await block.getByRole('button', { name: /Edit rewards/ }).click()
  await expect(panel.getByTestId('map-rewards-table')).toBeVisible()
})

test('saving a search asks for a name, and a second save renames it', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-map-mods', wmWants: 'show' }] })
  const panel = overlay.widget('woke-map-mods')

  await panel.getByRole('button', { name: /Save…/ }).click()
  const name = panel.getByLabel('Name in the Regex library')
  await expect(name).toHaveValue(/^Maps: /)
  await name.fill('T16 juice')
  await name.press('Enter')
  await expect.poll(() => overlay.savedWidget('woke-regex-library')?.entries?.some((e: { name: string }) => e.name === 'T16 juice')).toBe(true)

  await panel.getByRole('button', { name: /Save…/ }).click()
  await expect(panel.getByText('Already saved as "T16 juice".')).toBeVisible()
  await name.fill('T16 juice v2')
  await panel.getByRole('button', { name: 'Rename' }).click()
  await expect.poll(() => overlay.savedWidget('woke-regex-library')?.entries?.filter((e: { name: string }) => e.name.startsWith('T16 juice')).map((e: { name: string }) => e.name)).toEqual(['T16 juice v2'])
})

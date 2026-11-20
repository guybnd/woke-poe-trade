// Map mods page: the stash search sits above the rewards, and Save can
// overwrite one of the tab's saved searches. Runs against the fake game.
import { test, expect } from './harness'

type Entry = { name: string, text: string }

test('stash search comes first, and Save overwrites a picked saved search', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-map-mods', wmWants: 'show' }] })
  const panel = overlay.widget('woke-map-mods')

  const stash = await panel.getByTestId('map-stash-search').boundingBox()
  const rewards = await panel.getByTestId('map-rewards-table').boundingBox()
  expect(stash!.y).toBeLessThan(rewards!.y)

  await panel.getByRole('button', { name: /Save…/ }).click()
  const name = panel.getByLabel('Name in the Regex library')
  await name.fill('T16 juice')
  await name.press('Enter')
  const saved = () => (overlay.savedWidget('woke-regex-library')?.entries ?? []) as Entry[]
  await expect.poll(() => saved().filter(e => e.name === 'T16 juice').length).toBe(1)
  const before = saved().find(e => e.name === 'T16 juice')!.text

  // A different search, saved over the first one.
  await panel.getByPlaceholder(/Search \d+ map mods/).fill('Buffs on Players expire')
  await panel.getByText('Buffs on Players expire #% faster').locator('..').getByRole('button', { name: 'avoid' }).click()
  await panel.getByRole('button', { name: /Save…/ }).click()
  await panel.getByRole('button', { name: 'Saved searches' }).click()
  await panel.getByRole('option', { name: /T16 juice/ }).click()
  await expect(name).toHaveValue('T16 juice')
  await expect(panel.getByText('Replaces the search saved as "T16 juice".', { exact: false })).toBeVisible()
  await overlay.snap('map mods save overwrite')
  await panel.getByRole('button', { name: 'Overwrite' }).click()

  await expect.poll(() => saved().filter(e => e.name === 'T16 juice').map(e => e.text === before)).toEqual([false])
  await expect(panel.getByText(/No unique text found/)).toHaveCount(0)
})

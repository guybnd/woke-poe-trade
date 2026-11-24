// Map mods: what each mod gives (Atlas Drops / rarity / pack size, more-X from
// poedb), sorting by a bonus and rating every mod with it as want. Fake game
// only, safe while PoE is open.
import { test, expect } from './harness'

test('rows show their bonuses, sort by one and want them all', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-map-mods', wmWants: 'show' }] })
  const panel = overlay.widget('woke-map-mods')
  const sort = panel.getByTestId('map-mods-sort')
  await expect(sort).toBeVisible()

  // A T17 mod's row: its numbers, its more-X tag and a tooltip with the whole mod.
  await panel.getByRole('searchbox').fill('Bloodstained Sawblades')
  const row = panel.getByText('13/8/5').first()
  await expect(row).toBeVisible()
  await expect(panel.getByText('+47% Currency').first()).toBeVisible()
  await expect(panel.getByTitle(/Ultimate \(T17\)\n/).first()).toBeAttached()

  // Sort by more currency: the best one first, and a button to want them all.
  await panel.getByRole('searchbox').fill('')
  await sort.locator('select').selectOption('currency')
  await expect(panel.getByText(/^\+64% Currency$/).first()).toBeVisible()
  const wantAll = sort.getByRole('button', { name: /Want all \d+ with more currency/ })
  await expect(wantAll).toBeVisible()
  await overlay.snap('map mods sorted by more currency')
  await wantAll.click()
  await expect(wantAll).toBeHidden()
  await expect(panel.getByText(/^Want · \d+$/)).toBeVisible()
  // The wanted mods go into the stash search.
  await expect(panel.getByTestId('map-stash-search').locator('code')).not.toHaveText('Rate mods or set a minimum')
})

test('the Planner lists T17 mods by bonus and builds a counted search', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-map-mods', wmWants: 'show' }] })
  const panel = overlay.widget('woke-map-mods')
  await panel.getByRole('tab', { name: /^Planner/ }).click()
  const planner = panel.getByTestId('map-planner')
  await expect(planner.getByRole('row', { name: /of Defiance/ })).toContainText('+64%')
  await expect(planner.getByRole('row', { name: /Fecund/ }).getByText('P', { exact: true })).toBeVisible()
  await overlay.snap('map mods planner')

  // Trade search first (it can count); with every mod ticked the stash text
  // doesn't fit, and a plain line says so.
  await expect(planner.getByTestId('map-planner-trade').getByRole('button', { name: 'Search trade' })).toBeEnabled()
  await expect(panel.getByTestId('map-planner-stash-too-long')).toBeVisible()
  const order = await planner.locator('[data-testid="map-planner-trade"], [data-testid="map-planner-search"]').evaluateAll(els => els.map(e => e.getAttribute('data-testid')))
  expect(order).toEqual(['map-planner-trade', 'map-planner-search'])

  // Untick all but four, ask for 2 of them: the search fits.
  for (const name of ['of Defiance', 'Diluted', 'Punishing', 'Stalwart']) {
    await planner.getByRole('checkbox', { name: `Use ${name}` }).click()
    await expect(planner.getByRole('checkbox', { name: `Use ${name}` })).not.toBeChecked()
  }
  const search = panel.getByTestId('map-planner-search')
  await expect(search.locator('code')).toContainText('"!')
  await expect(search.getByRole('button', { name: 'Copy' })).toBeEnabled()
  await expect(panel.getByTestId('map-planner-stash-too-long')).toHaveCount(0)
  await expect(planner.getByText('of the 4 ticked mods', { exact: true })).toBeVisible()
})

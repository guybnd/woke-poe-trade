// A unique priced by name from search has its mods as stat rows, to tick and search by.
import { test, expect } from './harness'

test('a unique priced from search lists its mods, and a ticked one goes into the search', async ({ overlay, fakeApp }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ widgets: [{ wmType: 'woke-market-tracker', wmTitle: 'Market', anchor: { pos: 'tl', x: 40, y: 30 } }] })
  await overlay.showScreen('screens/map-real-01.png')
  await overlay.pressHotkey('Ctrl + Space')
  const search = overlay.widget('woke-search')
  await search.getByRole('textbox', { name: 'Search' }).fill('mortem morsu')
  const result = search.getByRole('button', { name: /Mortem Morsu/ }).first()
  await expect(result).toBeVisible({ timeout: 20_000 })
  await result.click({ button: 'right' })
  await overlay.page.getByRole('menu').getByRole('menuitem', { name: 'Price check' }).click()

  const check = overlay.widget('price-check')
  await expect(check).toContainText('Matched: 42')
  const phys = check.getByText('increased Physical Damage').first()
  await expect(phys).toBeVisible()
  await expect(check).toContainText('of Physical Damage Converted to Chaos Damage')
  await overlay.snap('unique by name mods')

  // The first search was the name alone; ticking a mod and searching sends it.
  const bodies = () => fakeApp.requests.filter(r => r.url.includes('/api/trade/search')).map(r => r.body)
  expect(bodies().at(-1)).not.toContain('"disabled":false')
  await phys.click()
  await check.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => bodies().at(-1)).toContain('explicit.stat_1509134228')
  const sent = JSON.parse(bodies().at(-1)!)
  const filter = sent.query.stats[0].filters.find((f: { id: string }) => f.id === 'explicit.stat_1509134228')
  expect(filter.disabled).toBeFalsy()
  expect(filter.value.min).toBe(75)
  expect(overlay.errors).toEqual([])
})

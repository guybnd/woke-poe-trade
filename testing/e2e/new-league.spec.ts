// A new league's item, before the item data has it: the price check searches
// trade by its name and base instead of stopping at Unknown item.
import { test, expect } from './harness'

test('a new league\'s unique is searched by name until the item data has it', async ({ overlay, fakeApp }) => {
  await overlay.boot()
  await overlay.copyItem('items-new-league/unique.txt')
  const panel = overlay.widget('price-check')
  await expect(panel.getByTestId('new-item-search')).toBeVisible()
  await expect(panel).toContainText('Veilwoven Grasp')
  await expect(panel).toContainText('Searched by name only')
  await expect(panel).toContainText('listed')
  const posted = fakeApp.requests.find(r => r.url.includes('/api/trade/search/'))
  expect(posted?.url).toContain('/api/trade/search/Testleague')
  expect(JSON.parse(posted!.body).query).toMatchObject({ name: 'Veilwoven Grasp', type: 'Vaal Gauntlets' })
})

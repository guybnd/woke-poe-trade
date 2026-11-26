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

// Guy's pick: a new transfigured gem gets a note and no trade search, which
// the trade site can't answer until the item data knows the gem.
test('a new transfigured gem shows a note and searches nothing', async ({ overlay, fakeApp }) => {
  await overlay.boot()
  await overlay.copyItem('items-new-league/gem-transfigured.txt')
  const panel = overlay.widget('price-check')
  await expect(panel.getByTestId('new-item-search')).toBeVisible()
  await expect(panel).toContainText('Ice Nova of Snowfall')
  await expect(panel).toContainText('New gem: no price until the next data update.')
  await expect(panel).not.toContainText('Open on trade site')
  expect(fakeApp.requests.some(r => r.url.includes('/api/trade/search/'))).toBe(false)
})

// The scarab flip panel on recorded poe.ninja prices: the verdict, each tab,
// and the rare-but-cheap marks.
import { test, expect } from './harness'

test('scarab flip: buy list, odds and rare scarabs from recorded prices', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-scarab-flip', wmWants: 'show' }] })
  const panel = overlay.widget('woke-scarab-flip')

  await expect(panel.getByText(/\d+ scarabs? worth vendoring/)).toBeVisible()
  // Volume comes from the exchange feed, so the supply columns show.
  await expect(panel.getByText('Traded / day')).toBeVisible()
  await expect(panel.getByText('Breach of the Hive', { exact: true })).toBeVisible()
  await overlay.snap('scarab-flip-buy')

  await panel.getByRole('tab', { name: /^Odds/ }).click()
  await expect(panel.getByText('Biggest sources of value')).toBeVisible()
  await expect(panel.getByText('200c+', { exact: true })).toBeVisible()
  await overlay.snap('scarab-flip-odds')

  await panel.getByRole('tab', { name: /^Rare & cheap/ }).click()
  await expect(panel.getByText('Scarab of Radiant Storms', { exact: true })).toBeVisible()
  await overlay.snap('scarab-flip-rare')
})

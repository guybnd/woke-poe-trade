// The right-click item menu (pick C): the item's name over a strip of big
// buttons, on top of the row's own entries.
import { test, expect } from './harness'

test('right-clicking an item gives its strip: price check, stash search, watch', async ({ overlay, fakeApp }) => {
  await overlay.boot({
    overlayActive: true,
    patch: (config) => {
      config.widgets.push({
        wmId: 9001,
        wmType: 'woke-market-tracker',
        wmTitle: 'Market',
        wmWants: 'show',
        wmZorder: 200,
        wmFlags: [],
        anchor: { pos: 'tl', x: 15, y: 15 },
        view: 'watchlist',
        period: '24h',
        minChaos: 5,
        typeFilter: '',
        watchlist: [
          { type: 'Currency', name: 'Divine Orb', variant: '' },
          { type: 'DivinationCard', name: 'The Doctor', variant: '' }
        ]
      })
    }
  })
  const page = overlay.page
  const panel = overlay.widget('woke-market-tracker')
  const menu = page.getByRole('menu')
  const row = (name: string) => panel.locator('.w-row', { hasText: name })
  await expect(row('The Doctor')).toBeVisible()

  // The item first, then the row's own entries.
  await row('The Doctor').click({ button: 'right' })
  await expect(menu).toContainText('The Doctor')
  const strip = menu.getByRole('group', { name: 'The Doctor' })
  await expect(strip).toHaveText(/Price\s*Trade\s*Wiki\s*Copy\s*Stash\s*Unwatch/)
  await expect(menu.getByRole('menuitem', { name: 'Set price alert…' })).toBeVisible()
  await overlay.snap('item menu')

  await menu.getByRole('menuitem', { name: 'Find in your stash' }).click()
  await expect(menu).toHaveCount(0)
  await expect.poll(() => fakeApp.game.stashSearches).toEqual(['"The Doctor"'])

  // Unwatch takes it off the watchlist.
  await row('The Doctor').click({ button: 'right' })
  await menu.getByRole('menuitem', { name: 'Stop watching its price in Market' }).click()
  await expect(row('The Doctor')).toHaveCount(0)

  // A currency's price check reads it like Ctrl+C in game would.
  await row('Divine Orb').click({ button: 'right' })
  await menu.getByRole('menuitem', { name: 'Price check' }).click()
  const check = overlay.widget('price-check')
  await expect(check).toContainText('Divine Orb')
  await expect(check).toContainText('Matched: 5')
  expect(overlay.errors).toEqual([])
})

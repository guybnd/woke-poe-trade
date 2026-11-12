// Search: the palette on its hotkey, prices in the launcher, and the Market
// tracker's search row with the corrupted filter, on recorded poe.ninja prices.
import { test, expect } from './harness'
import type { Overlay } from './harness'

const SEARCH_KEY = 'Ctrl + Space'

// Prices are saved a moment after they load.
async function waitForPrices (overlay: Overlay) {
  const panel = overlay.widget('woke-search')
  const box = panel.getByRole('textbox', { name: 'Search' })
  await expect(async () => {
    await box.fill('headhunter')
    await expect(panel.getByRole('button', { name: /Headhunter/ }).first()).toBeVisible({ timeout: 500 })
  }).toPass({ timeout: 20_000 })
  return { panel, box }
}

function bootOptions () {
  return {
    widgets: [{ wmType: 'woke-market-tracker', wmTitle: 'Market', anchor: { pos: 'tl', x: 40, y: 30 } }]
  }
}

test('the hotkey opens the palette ready to type, and Esc leaves it', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot(bootOptions())
  await overlay.showScreen('screens/map-real-01.png')
  expect(overlay.app.registeredHotkeys()).toContain('Ctrl+Space')

  await overlay.pressHotkey(SEARCH_KEY)
  const palette = overlay.widget('woke-search')
  const box = palette.getByRole('textbox', { name: 'Search' })
  await expect(box).toBeVisible()
  await expect(box).toBeFocused()
  await overlay.snap('search-opened')

  // Keys go straight to the box.
  await overlay.page.keyboard.type('headh')
  await expect(box).toHaveValue('headh')

  await box.press('Escape')
  await expect(box).toBeHidden()

  // The same key closes it, since global hotkeys are off while it has the keyboard.
  await overlay.pressHotkey(SEARCH_KEY)
  await expect(box).toBeFocused()
  await overlay.page.keyboard.press('Control+Space')
  await expect(box).toBeHidden()
})

test('prices are grouped, and the detail shows every variant and its actions', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot(bootOptions())
  await overlay.showScreen('screens/map-real-01.png')
  await overlay.pressHotkey(SEARCH_KEY)
  const { panel, box } = await waitForPrices(overlay)

  await expect(panel.getByText('Trade site')).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Wiki', exact: true })).toBeVisible()
  await expect(panel.getByText('Live listings')).toBeVisible()
  await overlay.snap('search-unique')

  // A gem: the Vaal orb button narrows it to corrupted variants.
  await box.fill('enlighten')
  await expect(panel.getByText('4/20c').first()).toBeVisible()
  await panel.getByRole('button', { name: /Corrupted gems are shown/ }).click()
  // The filter's click leaves the keyboard on the box.
  await expect(box).toBeFocused()
  await expect(panel.getByText('4/20c').first()).toBeVisible()
  await panel.getByRole('button', { name: /Only corrupted gems/ }).click()
  await expect(panel.getByText('4/20c').first()).toBeHidden()
  await panel.getByRole('button', { name: /Corrupted gems are hidden/ }).click()
  await expect(panel.getByText('4/20c').first()).toBeVisible()

  // Tools and settings are found too, and an item with no price gets links.
  // Filtered out isn't the same as having no price.
  await box.fill('headhunter')
  await panel.getByRole('button', { name: /Corrupted gems are shown/ }).click()
  await expect(panel.getByText('No poe.ninja price')).toHaveCount(1) // Replica Headhunter only
  await panel.getByRole('button', { name: /Only corrupted gems/ }).click()
  await panel.getByRole('button', { name: /Corrupted gems are hidden/ }).click()

  await box.fill('market')
  await expect(panel.getByRole('button', { name: /Market\s*Tool/ })).toBeVisible()
  await expect(panel.getByRole('button', { name: /Market & investments/ })).toBeVisible()
  await overlay.snap('search-tools')

  await box.fill('astral plate')
  await expect(panel.getByRole('button', { name: /Astral Plate/ })).toBeVisible()
  await expect(panel.getByText('poe.ninja has no price')).toBeVisible()
  await overlay.snap('search-no-price')

  expect(overlay.errors).toEqual([])
})

test('the launcher lists prices, and a click opens the palette on them', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ ...bootOptions(), overlayActive: true })
  const rail = overlay.widget('menu')
  await rail.getByRole('button', { name: 'All tools' }).click()
  const box = overlay.page.getByRole('textbox', { name: 'Find a tool or an item, or paste an item' })
  await expect(async () => {
    await box.fill('headhunter')
    await expect(overlay.page.getByRole('button', { name: /Headhunter/ })).toBeVisible({ timeout: 500 })
  }).toPass({ timeout: 20_000 })
  await overlay.snap('search-launcher')

  await overlay.page.getByRole('button', { name: /Headhunter/ }).click()
  const palette = overlay.widget('woke-search')
  await expect(palette.getByRole('textbox', { name: 'Search' })).toHaveValue('Headhunter')
  await expect(palette.getByText('Trade site')).toBeVisible()
  expect(overlay.errors).toEqual([])
})

test('Market searches every price, whatever the filters', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({
    ...bootOptions(),
    overlayActive: true,
    widgets: [{ wmType: 'woke-market-tracker', wmTitle: 'Market', wmWants: 'show', anchor: { pos: 'tl', x: 40, y: 30 } }]
  })
  const panel = overlay.widget('woke-market-tracker')
  const box = panel.getByPlaceholder('Search every price')
  await expect(box).toBeVisible()
  await expect(async () => {
    await box.fill('enlighten')
    await expect(panel.getByText('Enlighten Support')).toBeVisible({ timeout: 500 })
  }).toPass({ timeout: 20_000 })
  await expect(panel.getByText(/prices? for "enlighten"/)).toBeVisible()
  await expect(panel.getByRole('combobox')).toBeHidden()
  await overlay.snap('market-search')

  await panel.getByRole('button', { name: /Corrupted gems are shown/ }).click()
  await expect(panel.getByRole('button', { name: /Only corrupted gems/ })).toBeVisible()
  await overlay.snap('market-search-corrupted')

  // Watching from a result.
  await panel.getByTitle('Add to watchlist').first().click()
  await box.fill('')
  await expect(panel.getByRole('combobox')).toBeVisible()
  await panel.getByRole('tab', { name: /Watchlist/ }).click()
  await expect(panel.getByText('Enlighten Support')).toBeVisible()
  expect(overlay.errors).toEqual([])
})

test('hovering a result shows the item, with its price or its range', async ({ overlay }) => {
  await overlay.boot(bootOptions())
  await overlay.pressHotkey(SEARCH_KEY)
  const { panel, box } = await waitForPrices(overlay)
  const tip = overlay.page.getByRole('tooltip')

  // Not yet selected, so the hover is all that shows it.
  await box.fill('headhunter')
  await panel.getByRole('button', { name: /Headhunter/ }).first().hover()
  await expect(tip).toContainText('Headhunter')
  await expect(tip).toContainText('Leather Belt')
  await overlay.snap('search result tooltip')

  // Several prices: the range, not one of them picked at random.
  await box.fill('enlighten')
  await panel.getByRole('button', { name: /Enlighten Support/ }).first().hover()
  await expect(tip).toContainText(/\d+ prices/)
  await expect(tip).toContainText(' to ')
  await expect(tip).not.toContainText(' 7d')

  // An item with no price is still an item.
  await box.fill('undying flesh talisman')
  await panel.getByRole('button', { name: /Undying Flesh Talisman/ }).hover()
  await expect(tip).toContainText('Undying Flesh Talisman')

  // Tools aren't items.
  await box.fill('market')
  await panel.getByRole('button', { name: /Market/ }).first().hover()
  await expect(tip).toHaveCount(0)
})

test('currency maths and countdowns answer first, and the web is always offered', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot(bootOptions())
  await overlay.showScreen('screens/map-real-01.png')
  await overlay.pressHotkey(SEARCH_KEY)
  const { panel, box } = await waitForPrices(overlay)

  await box.fill('3 div')
  const first = panel.locator('[data-selected]')
  await expect(first).toContainText(/3 Divine Orb = [\d,.]+ c/)
  await expect(panel.getByRole('button', { name: /^Copy / })).toBeVisible()
  await expect(panel.getByText(/Search poewiki for "3 div"/)).toBeVisible()
  await overlay.snap('search-currency-maths')

  await box.fill('lab reset')
  await expect(first).toContainText(/Lab layout resets in/)
  await overlay.snap('search-lab-reset')
})

test('a boss card shows its entry and drops, and an item says where it drops', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot(bootOptions())
  await overlay.showScreen('screens/map-real-01.png')
  await overlay.pressHotkey(SEARCH_KEY)
  const { panel, box } = await waitForPrices(overlay)

  await box.fill('uber maven')
  await expect(panel.locator('[data-selected]')).toContainText('Uber Maven')
  await expect(panel.getByText(/4 × Reality Fragment/)).toBeVisible()
  await overlay.snap('search-boss')

  await box.fill('progenesis')
  await expect(panel.getByText(/Progenesis drops from/)).toBeVisible()
  await panel.getByText(/Progenesis drops from/).click()
  await overlay.snap('search-where-it-drops')
})

test('a div card compares its full set with the reward', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot(bootOptions())
  await overlay.showScreen('screens/map-real-01.png')
  await overlay.pressHotkey(SEARCH_KEY)
  const { panel, box } = await waitForPrices(overlay)

  await box.fill('the doctor')
  const set = panel.getByText(/^The Doctor: /)
  await expect(set).toBeVisible()
  await set.click()
  await expect(panel.getByText('Full set: 8 cards')).toBeVisible()
  await expect(panel.getByText('Reward: Headhunter')).toBeVisible()
  await overlay.snap('search-card-set')
})

test('a vendor recipe shows what to sell and what you get', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot(bootOptions())
  await overlay.showScreen('screens/map-real-01.png')
  await overlay.pressHotkey(SEARCH_KEY)
  const { panel, box } = await waitForPrices(overlay)

  await box.fill('6 link')
  const recipe = panel.getByText('20 × Orb of Fusing').first()
  await expect(recipe).toBeVisible()
  await recipe.click()
  await expect(panel.getByText('An item with 6 linked sockets', { exact: true })).toBeVisible()
  await overlay.snap('search-recipe')
})

test('a gem says where to get it in the campaign', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot(bootOptions())
  await overlay.showScreen('screens/map-real-01.png')
  await overlay.pressHotkey(SEARCH_KEY)
  const { panel, box } = await waitForPrices(overlay)

  await box.fill('leap slam')
  const card = panel.getByText('Where to get Leap Slam', { exact: true })
  await expect(card).toBeVisible()
  await card.click()
  await expect(panel.getByText('Quest reward (free)')).toBeVisible()
  await overlay.snap('search-gem')
})

test('a keystone says what it does, and a Betrayal member lists their rewards', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot(bootOptions())
  await overlay.showScreen('screens/map-real-01.png')
  await overlay.pressHotkey(SEARCH_KEY)
  const { panel, box } = await waitForPrices(overlay)

  await box.fill('resolute tech')
  const key = panel.getByText('Resolute Technique', { exact: true }).first()
  await expect(key).toBeVisible()
  await key.click()
  await expect(panel.getByText('Never deal Critical Strikes')).toBeVisible()
  await overlay.snap('search-keystone')

  await box.fill('aisling')
  await expect(panel.getByText('Research: Crafting bench: veiled chaos', { exact: true })).toBeVisible()
  await overlay.snap('search-betrayal')
})

test('the ? button lists things to try, and picking one searches it', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot(bootOptions())
  await overlay.showScreen('screens/map-real-01.png')
  await overlay.pressHotkey(SEARCH_KEY)
  const { panel, box } = await waitForPrices(overlay)

  await box.fill('')
  await panel.getByRole('button', { name: 'What can I search for?' }).click()
  await expect(box).toHaveValue('?')
  await expect(panel.getByText('Things to try', { exact: true })).toBeVisible()
  await overlay.snap('search-help')
  await panel.getByText('rustic sash', { exact: true }).dblclick()
  await expect(box).toHaveValue('rustic sash')
  await expect(panel.locator('[data-selected]')).toContainText('physical damage')
})

test('an empty search box shows things to try', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot(bootOptions())
  await overlay.showScreen('screens/map-real-01.png')
  await overlay.pressHotkey(SEARCH_KEY)
  const { panel, box } = await waitForPrices(overlay)

  await box.fill('')
  await expect(panel.getByText('Things to try', { exact: true })).toBeVisible()
  await expect(panel.getByText('the doctor', { exact: true })).toBeVisible()
  await expect(panel.getByText(/^1 Mirror of Kalandra = /)).toBeVisible()
  await overlay.snap('search-empty')
})

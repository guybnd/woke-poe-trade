// Price check (APT) with the toolkit's additions, from the hotkey press in
// game to the panel: the item is copied by the fake game, priced from
// recorded trade site and poe.ninja responses.
import { test, expect } from './harness'

test('currency: Ctrl+D shows the poe.ninja price and bulk exchange offers', async ({ overlay, fakeApp }) => {
  await overlay.boot()
  await overlay.copyItem('items/currency-divine.txt')
  const panel = overlay.widget('price-check')
  await expect(panel).toContainText('Divine Orb')
  await expect(panel).toContainText('180')
  // The five recorded exchange offers, cheapest first.
  await expect(panel).toContainText('Matched: 5')
  await expect(panel).toContainText('178 / 1')
  // The game copied with Ctrl held (advanced mod text), and nothing else was typed.
  expect(fakeApp.game.keyTaps).toEqual([{ key: 'C', mods: ['Ctrl'] }])
  await overlay.snap('divine orb price check')
  const posted = fakeApp.requests.find(r => r.url.includes('/api/trade/exchange/'))
  expect(posted?.url).toContain('/api/trade/exchange/Testleague')
  expect(JSON.parse(posted!.body).query.want).toEqual(['divine'])
})

test('the window can be dragged, resized, saved and put back', async ({ overlay, fakeApp }) => {
  await overlay.boot()
  await overlay.copyItem('items/currency-divine.txt')
  const panel = overlay.page.locator('#price-window')
  await expect(panel).toContainText('Divine Orb')
  // Offers arriving later would grow the window between measuring and resizing.
  await expect(panel).toContainText('Matched: 5')
  const box = async () => (await panel.boundingBox())!
  const page = overlay.page
  const start = await box()
  const leaguePicker = page.getByText('Testleague')

  // By the title bar, and the drag doesn't open the league picker.
  const title = await leaguePicker.boundingBox()
  await page.mouse.move(title!.x + 5, title!.y + 5)
  await page.mouse.down()
  await page.mouse.move(title!.x + 105, title!.y + 85, { steps: 4 })
  await page.mouse.up()
  const moved = await box()
  expect(Math.abs(moved.x - start.x - 100)).toBeLessThan(10)
  expect(Math.abs(moved.y - start.y - 80)).toBeLessThan(10)
  await expect(page.getByTestId('price-window-dock')).toBeVisible()
  await expect(panel).toBeVisible()
  await expect(overlay.widget('settings')).toBeHidden()

  // From the corner: the top left stays put.
  const grip = (await page.getByTestId('price-window-resize').boundingBox())!
  await page.mouse.move(grip.x + 6, grip.y + 6)
  await page.mouse.down()
  await page.mouse.move(grip.x + 66, grip.y - 44, { steps: 4 })
  await page.mouse.up()
  const resized = await box()
  expect(Math.abs(resized.x - moved.x)).toBeLessThan(2)
  expect(Math.abs(resized.y - moved.y)).toBeLessThan(2)
  expect(Math.abs(resized.width - moved.width - 60)).toBeLessThan(10)
  expect(Math.abs(resized.height - moved.height + 50)).toBeLessThan(10)
  await overlay.snap('moved and resized price check')

  // Saved when the window closes, and still there on the next price check.
  fakeApp.sendToOverlay({ name: 'MAIN->OVERLAY::hide-exclusive-widget', payload: undefined })
  await expect(panel).toBeHidden()
  await fakeApp.waitForReceived('CLIENT->MAIN::save-config', (p: { contents: string }) => p.contents.includes('wokeWindow'))
  fakeApp.clearReceived()
  await overlay.copyItem('items/currency-divine.txt')
  await expect(panel).toContainText('Divine Orb')
  const again = await box()
  // The mouse enters the window where it is now, not the docked spot.
  const tracked = await fakeApp.waitForReceived('OVERLAY->MAIN::track-area') as { area: { x: number, y: number, width: number } }
  expect(Math.abs(tracked.area.x - resized.x)).toBeLessThan(2)
  expect(Math.abs(tracked.area.y - resized.y)).toBeLessThan(2)
  expect(Math.abs(tracked.area.width - resized.width)).toBeLessThan(2)
  expect(Math.abs(again.x - resized.x)).toBeLessThan(2)
  expect(Math.abs(again.y - resized.y)).toBeLessThan(2)
  expect(Math.abs(again.width - resized.width)).toBeLessThan(2)

  // The button puts it back.
  await page.getByTestId('price-window-dock').click()
  const docked = await box()
  expect(Math.abs(docked.y - start.y)).toBeLessThan(2)
  expect(Math.abs(docked.width - start.width)).toBeLessThan(2)
  await expect(page.getByTestId('price-window-dock')).toHaveCount(0)
})

// Hiding the window starts a delayed chart redraw. A new check removes the chart first,
// and the redraw then has nothing to measure: NaN in the svg, page errors.
test('a price check right after closing the window draws no broken chart', async ({ overlay, fakeApp }) => {
  await overlay.boot()
  await overlay.copyItem('items/currency-divine.txt')
  const panel = overlay.widget('price-check')
  const chart = panel.locator('.apexcharts-canvas svg')
  // The poe.ninja card starts folded onto the name row; open it to draw the chart.
  await panel.getByTitle(/^poe\.ninja price/).click()
  await expect(chart).toBeVisible()
  await overlay.page.waitForTimeout(300)
  fakeApp.sendToOverlay({ name: 'MAIN->OVERLAY::hide-exclusive-widget', payload: undefined })
  await expect(panel).toBeHidden()

  await overlay.copyItem('items/currency-divine.txt')
  await expect(chart).toBeVisible()
  await expect(chart).toHaveAttribute('width', /^\d+(\.\d+)?$/)
})

test('rare: roll presets search with the item\'s rolls', async ({ overlay, fakeApp }) => {
  await overlay.boot()
  await overlay.copyItem('items/rare-ring.txt')
  const panel = overlay.widget('price-check')
  await expect(panel).toContainText('Generic')
  const rollPresets = panel.locator('[data-roll-presets]')
  await expect(rollPresets.getByText('Low')).toBeVisible()
  const lastSearch = () => {
    const r = fakeApp.requests.filter(r => r.url.includes('/api/trade/search/')).pop()
    return r ? JSON.parse(r.body).query.stats[0].filters as Array<{ id: string, value: { min?: number, max?: number }, disabled: boolean }> : []
  }
  const filter = (id: string) => lastSearch().find(f => f.id === id)

  await rollPresets.getByText('Approx').click()
  await expect.poll(() => filter('pseudo.pseudo_total_life')?.value).toEqual({ min: 63, max: 65 })
  expect(filter('pseudo.pseudo_total_life')?.disabled).toBe(false)
  expect(filter('pseudo.pseudo_total_elemental_resistance')?.value).toEqual({ min: 143, max: 147 })

  fakeApp.requests.length = 0
  await rollPresets.getByText('Low').click()
  // Any roll of the same tier: the bottom of the life roll's range (60-69).
  await expect.poll(() => filter('pseudo.pseudo_total_life')?.value?.min).toBeLessThanOrEqual(60)
  await expect(panel).toContainText('Matched: 42')
  await overlay.snap('rare ring with current rolls')
})

test('rare: the Generic / Base switch changes the title and the search', async ({ overlay, fakeApp }) => {
  await overlay.boot()
  await overlay.copyItem('items/rare-ring.txt')
  const panel = overlay.widget('price-check')
  const title = panel.locator('.filter-name-label')
  const scope = panel.locator('[data-search-scope]')
  await expect(title).toHaveText('Ring')
  await overlay.snap('filter header on generic')

  await scope.getByText('Base').click()
  await expect(title).toHaveText('Two-Stone Ring')
  // Moving from a filter onto Search runs the search and removes the button,
  // so Playwright's click or hover would wait for it forever.
  const search = (await panel.getByRole('button', { name: 'Search', exact: true }).boundingBox())!
  await overlay.page.mouse.move(search.x + search.width / 2, search.y + search.height / 2)
  await expect.poll(() => {
    const r = fakeApp.requests.filter(r => r.url.includes('/api/trade/search/')).pop()
    return r ? JSON.parse(r.body).query.type : undefined
  }).toEqual('Two-Stone Ring')
  await overlay.snap('filter header on base')

  await scope.getByText('Generic').click()
  await expect(title).toHaveText('Ring')
})

test('unique: the Corrupted chip cycles Any, Corrupted, Uncorrupted at one width', async ({ overlay, fakeApp }) => {
  await overlay.boot()
  await overlay.copyItem('items/unique-kaoms-heart-corrupted.txt')
  const panel = overlay.widget('price-check')
  const chip = panel.locator('[data-corrupted-chip]')
  const shown = chip.locator('span.shown')
  await expect(shown).toHaveText('Any')
  const width = (await chip.boundingBox())!.width
  await overlay.snap('corrupted chip on any')

  const lastOption = () => {
    const r = fakeApp.requests.filter(r => r.url.includes('/api/trade/search/')).pop()
    return r ? JSON.parse(r.body).query.filters.misc_filters?.filters.corrupted?.option ?? 'none' : undefined
  }
  await expect.poll(lastOption).toBe('none')

  for (const [label, option] of [['Corrupted', 'true'], ['Uncorrupted', 'false']]) {
    await chip.click()
    await expect(shown).toHaveText(label)
    expect((await chip.boundingBox())!.width).toBe(width)
    await overlay.snap(`corrupted chip on ${label}`)
    // Moving from a filter onto Search runs the search and removes the button,
    // so Playwright's click or hover would wait for it forever.
    const search = (await panel.getByRole('button', { name: 'Search', exact: true }).boundingBox())!
    await overlay.page.mouse.move(search.x + search.width / 2, search.y + search.height / 2)
    await expect.poll(lastOption).toBe(option)
  }

  // Back on Any: the search is the first one again, so it answers from the cache.
  await chip.click()
  await expect(shown).toHaveText('Any')
  expect((await chip.boundingBox())!.width).toBe(width)
})

test('filter tiles change by scrolling or dragging', async ({ overlay, page }) => {
  await overlay.boot()
  await overlay.copyItem('items/rare-ring.txt')
  const panel = overlay.widget('price-check')
  const value = panel.locator('.filter-name-tiles input').first()
  await expect(value).toHaveValue('84')
  const tile = panel.locator('.filter-name-tiles > div').first()
  const box = (await tile.boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + 8 // the label

  await page.mouse.move(x, y)
  await page.mouse.wheel(0, -100)
  await expect(value).toHaveValue('85')
  await page.mouse.wheel(0, 100)
  await page.mouse.wheel(0, 100)
  await expect(value).toHaveValue('83')

  // Only the number drags: pressing the label and moving does nothing to the value.
  const atRest = await tile.getAttribute('class')
  await page.mouse.down()
  await page.mouse.move(x, y - 40, { steps: 5 })
  await expect(value).toHaveValue('83')
  await page.mouse.move(x + 400, y - 40, { steps: 2 }) // let go outside, so it's no click
  await page.mouse.up()
  await expect(tile).toHaveAttribute('class', atRest!)

  const num = (await value.boundingBox())!
  const nx = num.x + num.width / 2
  const ny = num.y + num.height / 2
  await page.mouse.move(nx, ny)
  await page.mouse.down()
  await page.mouse.move(nx, ny - 40, { steps: 5 })
  await expect(value).toHaveValue('85')
  await page.mouse.move(nx, ny - 24, { steps: 3 })
  await expect(value).toHaveValue('84')
  await page.mouse.up()

  // Letting go of a drag isn't a click on the box, which would switch the filter off.
  await expect(tile).toHaveAttribute('class', atRest!)

  // A press that starts on the number and lets go beside it doesn't switch it either.
  await page.mouse.move(nx, ny)
  await page.mouse.down()
  await page.mouse.move(x, y, { steps: 2 })
  await page.mouse.up()
  await expect(tile).toHaveAttribute('class', atRest!)
  await value.blur()

  // Clicking anywhere else in the box, label or edge, switches it off and on.
  await page.mouse.click(x, y)
  await expect(tile).not.toHaveAttribute('class', atRest!)
  await page.mouse.click(box.x + 3, box.y + box.height - 3)
  await expect(tile).toHaveAttribute('class', atRest!)
})

test('map: price check shows the map mod verdict strip', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods' }] })
  await overlay.copyItem('items/map-rare-t16-deadly.txt')
  const panel = overlay.widget('price-check')
  // Default profile: max res and no regen are "careful", twin bosses "good".
  await expect(panel.getByText('CARE', { exact: true })).toBeVisible()
  await expect(panel).toContainText('Quant 64%')
  await overlay.snap('map verdict strip')
})

test('map check hotkey (Alt+M) opens the verdict card, even before the widget is placed', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/map-rare-t16.txt', 'Alt + M')
  const card = overlay.widget('woke-map-check')
  await expect(card).toContainText('Strand')
  await expect(card).toContainText('RUN')
  await overlay.snap('map check card')
})

test('unique: improved merges same prices with a count, classic lists every listing', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-trade-searches' }] })
  await overlay.copyItem('items/unique-kaoms-heart.txt')
  const panel = overlay.widget('price-check')
  const rows = panel.locator('.w-pc-table tbody tr')
  await expect(panel.locator('.w-pc-foot')).toContainText('listings')
  await expect(panel.locator('.w-pc-count-n').first()).toContainText('×')
  const merged = await rows.count()

  // The switch lives in Settings > Price check > Listings, not in the window.
  await expect(panel.getByRole('button', { name: 'Classic' })).toHaveCount(0)
  await setPriceView(overlay.page, 'classic')
  await expect.poll(() => rows.count()).toBeGreaterThan(merged)
  await expect(panel.locator('.w-pc-foot')).toHaveCount(0)
  await setPriceView(overlay.page, 'improved')

  // The toolbar fits: nothing runs past the window, the toggle's labels aren't clipped.
  const edge = (await overlay.page.locator('#price-window').boundingBox())!
  const toolbarButtons = panel.locator('.w-pc-toolbar button')
  for (let i = 0; i < await toolbarButtons.count(); i++) {
    const box = (await toolbarButtons.nth(i).boundingBox())!
    expect(box.x + box.width).toBeLessThanOrEqual(edge.x + edge.width)
  }
  await overlay.snap('unique with merged listings')
})

test('Settings > Price check > Listings switches Classic and Improved', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true })
  await overlay.widget('menu').locator('.fa-cog').click()
  const settings = overlay.widget('settings')
  await settings.getByText('Price check', { exact: true }).first().click()
  const row = settings.locator('[data-price-view]')
  await expect(row).toContainText('Listings')
  await row.getByText('Classic', { exact: true }).click()
  await expect.poll(() => overlay.page.evaluate(() => localStorage.getItem('woke.priceView'))).toBe('classic')
  await row.getByText('Improved', { exact: true }).click()
  await expect.poll(() => overlay.page.evaluate(() => localStorage.getItem('woke.priceView'))).toBe('improved')
})

test('the poe.ninja card folds onto the name row and stays as left', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/currency-divine.txt')
  const panel = overlay.widget('price-check')
  const chip = panel.getByTitle(/^poe\.ninja price/)
  const fold = panel.getByTitle('Fold onto the name row')
  // Folded by default: the price sits on the name row, the same height as the title.
  await expect(chip).toBeVisible()
  await expect(fold).toHaveCount(0)
  const title = (await panel.locator('.filter-name-title').boundingBox())!
  const chipBox = (await chip.boundingBox())!
  expect(Math.abs(chipBox.y - title.y)).toBeLessThan(8)

  await chip.click()
  await expect(fold).toBeVisible()
  await overlay.copyItem('items/currency-divine.txt')
  await expect(fold).toBeVisible()
  expect(await overlay.page.evaluate(() => localStorage.getItem('woke.ninjaCardOpen'))).toBe('1')

  await expect(panel.getByRole('link', { name: 'Open on poe.ninja ↗' })).toBeVisible()
  await fold.click()
  await expect(chip).toBeVisible()
  expect(await overlay.page.evaluate(() => localStorage.getItem('woke.ninjaCardOpen'))).toBe('0')
})

test('a rare shows no poe.ninja chip: poe.ninja only prices its base', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  await expect(panel).toContainText('Body Armour')
  await expect(panel.getByTitle(/^poe\.ninja price/)).toHaveCount(0)
})

// What Settings > Price check > Listings does, without opening Settings.
async function setPriceView (page: import('@playwright/test').Page, v: 'classic' | 'improved') {
  await page.evaluate((v) => {
    localStorage.setItem('woke.priceView', v)
    window.dispatchEvent(new StorageEvent('storage', { key: 'woke.priceView', newValue: v }))
  }, v)
}

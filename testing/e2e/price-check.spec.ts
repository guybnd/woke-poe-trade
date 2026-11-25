// Price check (APT) with the toolkit's additions, from the hotkey press in
// game to the panel: the item is copied by the fake game, priced from
// recorded trade site and poe.ninja responses.
import type { Page } from '@playwright/test'
import { test, expect } from './harness'

// Each test boots its own overlay: the file's tests can spread over workers
// and shards (one file alone otherwise sets how short a shard can be).
test.describe.configure({ mode: 'parallel' })

// The full window for currency, not the instant card by the item (WOKEPOET-480).
const windowCheck = (config: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  config.widgets.find((w: { wmType: string }) => w.wmType === 'price-check').wokeNinjaInstant = false
}

test('currency: Ctrl+D shows the poe.ninja price by the item, and exchange offers on a click', async ({ overlay, fakeApp }) => {
  await overlay.boot()
  await overlay.copyItem('items/currency-divine.txt')
  // The instant check: a small card by the item, no window and no search (WOKEPOET-480).
  const card = overlay.page.getByTestId('instant-ninja-card')
  await expect(card).toContainText('Divine Orb')
  // The exchange rate, as the game's Currency Exchange shows it (Guy's pick I2, 2026-11-25).
  await expect(card.getByTestId('instant-ninja-price')).toHaveText('1⇄180')
  // Its badge says what the price is and which key gets live data.
  const badge = card.getByTestId('instant-ninja-badge')
  await expect(badge).toHaveAttribute('title', /instant pricing without any delay\. For live data, press the price check key again/)
  await expect(badge).toHaveAttribute('data-tip-keys', 'Ctrl + D')
  // A divine's parts in chaos, for paying in div.
  // Beside it, 0.1 to 1 div in chaos (Guy, 2026-11-23).
  const tenths = card.getByTestId('instant-ninja-tenths').locator('tr')
  await expect(tenths).toHaveCount(10)
  await expect(tenths.first()).toHaveText('0.1 div18c')
  await expect(tenths.last()).toHaveText('1 div180c')
  // The graph box starts on 24h: poe.ninja's last two days, 104% to 105%.
  const graph = card.getByTestId('instant-ninja-graph')
  await expect(graph.getByTestId('instant-ninja-range-24h')).toHaveClass(/on/)
  // The graph box and the table beside it span the card's width; the graph stretches with the box.
  const [gb, tb, cb, pb] = await Promise.all([graph, card.getByTestId('instant-ninja-tenths'), card.locator('[data-card]'), card.getByTestId('instant-ninja-plot')].map(l => l.boundingBox()))
  expect(Math.abs(Math.min(gb!.x, tb!.x) - cb!.x)).toBeLessThan(2)
  expect(Math.abs(Math.max(gb!.x + gb!.width, tb!.x + tb!.width) - (cb!.x + cb!.width))).toBeLessThan(2)
  expect(pb!.width).toBeGreaterThan(gb!.width * 0.8)
  await expect(card.getByTestId('instant-ninja-change')).toHaveText('▲1%')
  await expect(card.getByTestId('instant-ninja-change')).toHaveAttribute('title', /last 24 hours/)
  // The mouse wheel steps to 3 days, a click on a range picks it.
  await graph.hover()
  await overlay.page.mouse.wheel(0, 100)
  await expect(graph.getByTestId('instant-ninja-range-3d')).toHaveClass(/on/)
  await expect(card.getByTestId('instant-ninja-change')).toHaveAttribute('title', /last 3 days/)
  await graph.getByTestId('instant-ninja-range-24h').click()
  await expect(graph.getByTestId('instant-ninja-range-24h')).toHaveClass(/on/)
  // poe.ninja's price is sure here: no button, Space is the way to live offers.
  await expect(card.getByTestId('instant-ninja-live')).toHaveCount(0)
  await expect(overlay.page.locator('#price-window')).toHaveCount(0)
  await overlay.snap('divine orb instant check')
  // The mouse is tracked into the card, not the window.
  const tracked = await fakeApp.waitForReceived('OVERLAY->MAIN::track-area') as { area: { width: number } }
  // The card and its Divine in chaos panel beside it (plus the tracking pad), not the window.
  const shown = await card.boundingBox()
  expect(tracked.area.width).toBeLessThan(shown!.width + 60)
  expect(fakeApp.requests.some(r => r.url.includes('/api/trade/exchange/'))).toBe(false)
  await overlay.page.keyboard.press('Space')
  await expect(card).toHaveCount(0)
  const panel = overlay.widget('price-check')
  // The five recorded exchange offers, cheapest first.
  await expect(panel).toContainText('Chaos 5')
  await expect(panel.getByTestId('bulk-each').first()).toHaveText('178')
  // The live verdict says how far it is from poe.ninja.
  await expect(panel.getByTestId('bulk-verdict-ninja')).toContainText('poe.ninja 180c each')
  // The game copied with Ctrl held (advanced mod text), and nothing else was typed.
  expect(fakeApp.game.keyTaps).toEqual([{ key: 'C', mods: ['Ctrl'] }])
  await overlay.snap('divine orb price check')
  const posted = fakeApp.requests.find(r => r.url.includes('/api/trade/exchange/'))
  expect(posted?.url).toContain('/api/trade/exchange/Testleague')
  expect(JSON.parse(posted!.body).query.want).toEqual(['divine'])
})

// poe.ninja has no row for a Chaos Orb (it prices in chaos): it gets the card
// anyway, at 1c, with what chaos amounts are in div (Guy, 2026-11-23).
test('currency: a Chaos Orb gets the instant card with the same 0.1 to 1 div panel', async ({ overlay, fakeApp }) => {
  await overlay.boot()
  await overlay.copyItem('items/currency-chaos.txt')
  const card = overlay.page.getByTestId('instant-ninja-card')
  // One line: what a divine buys (a chaos against itself says nothing).
  await expect(card.getByTestId('instant-ninja-price')).toHaveText('1⇄180')
  await expect(card.getByTestId('instant-ninja-rate')).toHaveCount(0)
  const tenths = card.getByTestId('instant-ninja-tenths').locator('tr')
  await expect(tenths).toHaveCount(10)
  await expect(tenths.nth(4)).toHaveText('0.5 div90c')
  await overlay.snap('chaos orb instant check')
  expect(fakeApp.requests.some(r => r.url.includes('/api/trade/exchange/'))).toBe(false)
})

test('currency: in the window, a click on the cached price shows it per divine', async ({ overlay, fakeApp }) => {
  await overlay.boot({ patch: windowCheck })
  await overlay.copyItem('items/currency-chaos.txt')
  // Guy, 2026-11-24.
  const verdictPrice = overlay.widget('price-check').getByTestId('ninja-verdict-price')
  await expect(verdictPrice).toHaveText('1c')
  await verdictPrice.click()
  await expect(verdictPrice).toHaveText('180 per div')
  await verdictPrice.click()
  await expect(verdictPrice).toHaveText('1c')
  expect(fakeApp.requests.some(r => r.url.includes('/api/trade/exchange/'))).toBe(false)
})

test('currency: with the instant card off, the window shows poe.ninja\'s price without a search', async ({ overlay, fakeApp }) => {
  await overlay.boot({ patch: windowCheck })
  await overlay.copyItem('items/currency-divine.txt')
  const panel = overlay.widget('price-check')
  await expect(panel.getByTestId('ninja-verdict')).toContainText('180c')
  expect(fakeApp.requests.some(r => r.url.includes('/api/trade/exchange/'))).toBe(false)
})

test('divination card: the instant card shows the poe.ninja price and no trade search runs', async ({ overlay, fakeApp }) => {
  await overlay.boot()
  await overlay.copyItem('items/card-the-doctor.txt')
  const card = overlay.page.getByTestId('instant-ninja-card')
  await expect(card).toContainText('The Doctor')
  await expect(card.getByTestId('instant-ninja-stack')).toContainText('Your 2 =')
  await overlay.snap('the doctor instant check')
  expect(fakeApp.requests.some(r => r.url.includes('/api/trade/search/'))).toBe(false)
})

test('divination card: the window says a live check uses one trade search, and runs none', async ({ overlay, fakeApp }) => {
  await overlay.boot({ patch: windowCheck })
  await overlay.copyItem('items/card-the-doctor.txt')
  await expect(overlay.widget('price-check').getByTestId('ninja-verdict')).toContainText('uses one trade search')
  expect(fakeApp.requests.some(r => r.url.includes('/api/trade/search/'))).toBe(false)
})

test('currency: the price check hotkey again on the same item opens live offers', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/currency-divine.txt')
  const card = overlay.page.getByTestId('instant-ninja-card')
  await expect(card.getByTestId('instant-ninja-badge')).toHaveAttribute('data-tip-keys', /Ctrl/)
  await overlay.copyItem('items/currency-divine.txt')
  await expect(card).toHaveCount(0)
  await expect(overlay.widget('price-check')).toContainText('Chaos 5')
})

test('currency: the locked price check key shows the card too', async ({ overlay, fakeApp }) => {
  await overlay.boot()
  await overlay.copyItem('items/currency-divine.txt', 'Ctrl + Alt + D')
  const card = overlay.page.getByTestId('instant-ninja-card')
  await expect(card.getByTestId('instant-ninja-price')).toHaveText('1⇄180')
  expect(fakeApp.requests.some(r => r.url.includes('/api/trade/exchange/'))).toBe(false)
  // The game's hotkeys don't reach a focused overlay, so no "again" hint here.
  await expect(card.getByTestId('instant-ninja-badge')).toHaveAttribute('data-tip-keys', 'Space')
  // The overlay has the keyboard here, so Space works straight away.
  await overlay.page.keyboard.press('Space')
  await expect(overlay.widget('price-check')).toContainText('Chaos 5')
})

test('currency: once the card closed, the hotkey on the same item shows the card again', async ({ overlay, fakeApp }) => {
  await overlay.boot()
  await overlay.copyItem('items/currency-divine.txt')
  const card = overlay.page.getByTestId('instant-ninja-card')
  await expect(card).toBeVisible()
  // The mouse moved away: main hides the price check.
  fakeApp.sendToOverlay({ name: 'MAIN->OVERLAY::hide-exclusive-widget', payload: undefined })
  await expect(card).toBeHidden()
  await overlay.copyItem('items/currency-divine.txt')
  await expect(card).toBeVisible()
  expect(fakeApp.requests.some(r => r.url.includes('/api/trade/exchange/'))).toBe(false)
})

test('currency: with poe.ninja first off, Ctrl+D searches right away', async ({ overlay }) => {
  await overlay.boot({
    patch: (config: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      config.widgets.find((w: { wmType: string }) => w.wmType === 'price-check').wokeNinjaFirst = false
    }
  })
  await overlay.copyItem('items/currency-divine.txt')
  const panel = overlay.widget('price-check')
  await expect(panel).toContainText('Chaos 5')
  await expect(overlay.page.getByTestId('instant-ninja-card')).toHaveCount(0)
  await expect(panel.getByTestId('ninja-verdict')).toHaveCount(0)
})

test('the window can be dragged, resized, saved and put back', async ({ overlay, fakeApp }) => {
  await overlay.boot({ patch: windowCheck })
  await overlay.copyItem('items/currency-divine.txt')
  const panel = overlay.page.locator('#price-window')
  await expect(panel).toContainText('Divine Orb')
  // An exchange item poe.ninja prices waits for a click before searching (WOKEPOET-479).
  await panel.getByTestId('ninja-verdict-live').click()
  // Offers arriving later would grow the window between measuring and resizing.
  await expect(panel).toContainText('Chaos 5')
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
  // The area holds the window, and the related items' column beside it on one side.
  const right = tracked.area.x + tracked.area.width
  expect(Math.abs(tracked.area.y - resized.y)).toBeLessThan(2)
  expect(tracked.area.x).toBeLessThanOrEqual(resized.x + 2)
  expect(right).toBeGreaterThanOrEqual(resized.x + resized.width - 2)
  expect(Math.abs(tracked.area.x - resized.x) < 2 || Math.abs(right - resized.x - resized.width) < 2).toBe(true)
  expect(tracked.area.width).toBeGreaterThan(resized.width)
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
  await overlay.boot({ patch: windowCheck })
  await overlay.copyItem('items/currency-divine.txt')
  const panel = overlay.widget('price-check')
  const chart = panel.locator('.apexcharts-canvas svg')
  // An exchange item poe.ninja prices waits for a click before searching (WOKEPOET-479).
  await panel.getByTestId('ninja-verdict-live').click()
  // The poe.ninja card starts folded onto the name row; open it to draw the chart.
  await panel.getByTitle(/^poe\.ninja price/).click()
  await expect(chart).toBeVisible()
  await overlay.page.waitForTimeout(300)
  fakeApp.sendToOverlay({ name: 'MAIN->OVERLAY::hide-exclusive-widget', payload: undefined })
  await expect(panel).toBeHidden()

  await overlay.copyItem('items/currency-divine.txt')
  await panel.getByTestId('ninja-verdict-live').click()
  await expect(chart).toBeVisible()
  await expect(chart).toHaveAttribute('width', /^\d+(\.\d+)?$/)
})

test('rare: roll presets search with the item\'s rolls', async ({ overlay, fakeApp }) => {
  await overlay.boot()
  await overlay.copyItem('items/rare-ring.txt')
  const panel = overlay.widget('price-check')
  await expect(panel.locator('.filter-name-label')).toHaveText('Ring')
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

test('rare: clicking the title switches Generic / Base, and the search follows', async ({ overlay, fakeApp }) => {
  await overlay.boot()
  await overlay.copyItem('items/rare-ring.txt')
  const panel = overlay.widget('price-check')
  const title = panel.locator('.filter-name-label')
  // The title is the only scope switch now.
  await expect(panel.locator('[data-search-scope]')).toHaveCount(0)
  await expect(title).toHaveText('Ring')
  await overlay.snap('filter header on generic')

  await title.click()
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

  await title.click()
  await expect(title).toHaveText('Ring')
})

test('unique: the Corrupted chip cycles Any, Corr, Not at one width', async ({ overlay, fakeApp }) => {
  await overlay.boot()
  await overlay.copyItem('items/unique-kaoms-heart-corrupted.txt')
  const panel = overlay.widget('price-check')
  const chip = panel.locator('[data-corrupted-chip]')
  const shown = chip.locator('span.shown')
  await expect(shown).toHaveText('Any')
  // Measured once the fonts are in: under load the first look came before them.
  await overlay.page.evaluate(async () => { await document.fonts.ready })
  const width = (await chip.boundingBox())!.width
  await overlay.snap('corrupted chip on any')

  const lastOption = () => {
    const r = fakeApp.requests.filter(r => r.url.includes('/api/trade/search/')).pop()
    return r ? JSON.parse(r.body).query.filters.misc_filters?.filters.corrupted?.option ?? 'none' : undefined
  }
  await expect.poll(lastOption).toBe('none')

  for (const [label, option] of [['Corr', 'true'], ['Not', 'false']]) {
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
  await expect(panel.getByText('Risky', { exact: true })).toBeVisible({ timeout: 20_000 })
  await expect(panel.locator('[data-map-tile]').filter({ hasText: 'Quant' })).toContainText('64%')
  await overlay.snap('map verdict strip')
})

test('map check hotkey (Alt+M) opens the verdict card, even before the widget is placed', async ({ overlay }) => {
  await overlay.boot()
  const card = overlay.widget('woke-map-check')
  // A default widget, lazy: a key pressed before its chunk mounts is lost (CI flake).
  await card.waitFor({ state: 'attached', timeout: 15_000 })
  await overlay.copyItem('items/map-rare-t16.txt', 'Alt + M')
  await expect(card).toContainText('Strand')
  await expect(card).toContainText('Safe')
  await overlay.snap('map check card')
})

test('unique: improved merges same prices with a count, classic lists every listing', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-trade-searches' }] })
  await overlay.copyItem('items/unique-kaoms-heart.txt')
  const panel = overlay.widget('price-check')
  const rows = panel.locator('.w-pc-table tbody tr')
  await expect(panel.locator('.w-pc-foot')).toContainText('listings')
  // Rows without a count keep an empty slot, so the tags after it line up.
  await expect(panel.locator('.w-pc-count-n').filter({ hasText: '×' }).first()).toBeVisible()
  const merged = await rows.count()

  // The switch lives in Settings > Price check > Listings, not in the window.
  await expect(panel.getByRole('button', { name: 'Classic' })).toHaveCount(0)
  await setPriceView(overlay.page, 'classic')
  await expect.poll(() => rows.count()).toBeGreaterThan(merged)
  await expect(panel.locator('.w-pc-foot')).toHaveCount(0)
  // Classic colours the listed time by age too.
  await expect(rows.locator('td.w-pc-age:is(.w-pc-age-new, .w-pc-age-day, .w-pc-age-week, .w-pc-age-old)').first()).toBeVisible()
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

test('the 3rd price check shows a short tour once, and the mod tip waits for it', async ({ overlay }) => {
  // Tips on, two checks already done.
  await overlay.boot({ tips: true, patch: c => { c.woke.hints = { checks: 2 } } })
  await overlay.copyItem('items/unique-kaoms-heart.txt')
  const panel = overlay.widget('price-check')
  await expect(panel.locator('.w-pc-foot')).toContainText('listings')
  const tour = overlay.page.locator('[data-pc-tour]')
  await expect(tour).toHaveAttribute('data-step', 'mods')
  await expect(tour).toContainText('1 of 2')
  await expect(tour).toContainText('Ctrl')
  await expect(panel.locator('[data-tip-line]')).toHaveCount(0)
  await overlay.snap('price check tour, mods')
  await tour.locator('[data-pc-tour-next]').click()
  await expect(tour).toHaveAttribute('data-step', 'listing')
  await expect(tour).toBeVisible()
  await expect(tour).toContainText('Highlighted prices')
  // Over the list, not on its first row.
  const head = (await panel.locator('.w-pc-table thead').boundingBox())!
  await expect.poll(async () => { const b = (await tour.boundingBox())!; return b.y + b.height }).toBeLessThanOrEqual(head.y + 1)
  await overlay.snap('price check tour, listings')
  await expect(tour.locator('[data-pc-tour-next]')).toHaveCount(0)
  await tour.locator('[data-pc-tour-done]').click()
  await expect(tour).toHaveCount(0)
  await expect(panel.locator('[data-tip-line]')).toBeVisible()
  // Once only.
  await overlay.copyItem('items/unique-kaoms-heart.txt')
  await expect(panel.locator('.w-pc-foot')).toContainText('listings')
  await overlay.page.waitForTimeout(700)
  await expect(tour).toHaveCount(0)
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
  await overlay.boot({ patch: windowCheck })
  await overlay.copyItem('items/currency-divine.txt')
  const panel = overlay.widget('price-check')
  const chip = panel.getByTitle(/^poe\.ninja price/)
  const fold = panel.getByTitle('Fold onto the name row')
  // Before a search the poe.ninja verdict shows the price; the chip is for after it.
  await panel.getByTestId('ninja-verdict-live').click()
  // Folded by default: the price sits on the name row, the same height as the title.
  await expect(chip).toBeVisible()
  await expect(fold).toHaveCount(0)
  const title = (await panel.locator('.filter-name-title').boundingBox())!
  const chipBox = (await chip.boundingBox())!
  expect(Math.abs(chipBox.y - title.y)).toBeLessThan(8)

  await chip.click()
  await expect(fold).toBeVisible()
  await overlay.copyItem('items/currency-divine.txt')
  await panel.getByTestId('ninja-verdict-live').click()
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

test('an item price check can\'t read offers its copied text to copy', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem(['Item Class: Woven Things', 'Woven Thread of Testing', '--------', 'Stack Size: 1/10', ''].join('\n'))
  const panel = overlay.widget('price-check')
  await expect(panel).toContainText('Woven Thread of Testing')
  await expect(panel.getByRole('button', { name: 'Copy text' })).toBeVisible()
  // No Rarity line, so there's no name to search by.
  await expect(panel.getByRole('button', { name: 'Search on trade' })).toHaveCount(0)
})

// Sellers asking divines often ask "1 div" for items worth a few chaos. The first
// search (both currencies, sorted by the raw number) then holds the chaos side
// back. The check never spends a second search by itself: it leads with what came
// back, and loads the chaos offers when the player picks them (WOKEPOET-487).
const XCHG_LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }
const xchgOffer = (id: string, currency: string, amount: number, stock: number, ageDays = 0) => ({
  id,
  item: null,
  listing: {
    indexed: new Date(Date.now() - ageDays * 86400_000).toISOString(),
    account: { name: `${id}#1`, lastCharacterName: `${id}c`, online: { league: 'Testleague' } },
    offers: [{ exchange: { currency, amount, whisper: '' }, item: { currency: 'originators-exalted-orb', amount: 1, stock, id, whisper: '' } }],
    whisper: ''
  }
})

// The exchange for Originator's Exalted Orb as seen live: the first search (both
// currencies) is mostly "1 div" rows, the chaos one is 1-3c. failChaos: the chaos
// search fails `failChaos` times first.
async function fakeOriginatorExchange (page: Page, failChaos = 0) {
  const haves: string[][] = []
  await page.route('**/api/trade/exchange/**', (route) => {
    const have: string[] = JSON.parse(route.request().postData()!).query.have
    haves.push(have)
    if (have.length === 1 && failChaos > 0) {
      failChaos--
      return route.fulfill({ status: 400, contentType: 'application/json', headers: XCHG_LIMITS, body: JSON.stringify({ error: { code: 1, message: 'Test failure' } }) })
    }
    const rows = have.length > 1
      ? [...Array.from({ length: 85 }, (_, i) => xchgOffer(`d${i}`, 'divine', 1, 10 + i)), ...Array.from({ length: 15 }, (_, i) => xchgOffer(`c${i}`, 'chaos', 1, 5 + i))]
      : Array.from({ length: 30 }, (_, i) => xchgOffer(`c${i}`, 'chaos', 1 + Math.floor(i / 10), 5 + i, i % 3 === 1 ? 10 : 0))
    return route.fulfill({
      contentType: 'application/json',
      headers: XCHG_LIMITS,
      body: JSON.stringify({ id: 'xq', total: have.length > 1 ? 1222 : 911, result: Object.fromEntries(rows.map(r => [r.id, r])) })
    })
  })
  return haves
}

test('bulk: a held-back chaos side costs no search until picked, then shows the cheaper chaos offers', async ({ overlay }) => {
  const haves = await fakeOriginatorExchange(overlay.page)
  await overlay.boot()
  await overlay.copyItem('items/currency-originators-exalted.txt')
  const panel = overlay.widget('price-check')
  const price = panel.getByTestId('bulk-verdict-price')
  // Only the first search ran: the divine offers lead, and nothing waits on the chaos side.
  await expect(price).toHaveText('1 div')
  await expect(panel.getByTestId('bulk-verdict-other')).toContainText("Chaos offers weren't searched yet")
  await expect(panel.locator('.w-pc-matched button').nth(0)).toContainText('?')
  // The divine count isn't double-reduced: the first search's total less the chaos rows it had.
  await expect(panel.locator('.w-pc-matched button').nth(1)).toContainText('1207')
  await expect(panel.locator('.w-pc-table .w-pc-skel')).toHaveCount(0)
  await expect(panel.getByTestId('bulk-each').first()).toBeVisible()
  expect(haves).toEqual([['divine', 'chaos']])
  // Picking chaos loads those offers: one search, from the click.
  await panel.locator('.w-pc-matched button').nth(0).click()
  await expect(price).toHaveText('1c')
  await expect(panel).toContainText('Chaos offers, with stock for your 3')
  // The divine offers are named, with their chaos value.
  await expect(panel.getByTestId('bulk-verdict-other')).toHaveText('Divine offers ask 1 div each (≈ 180c), 180× as much')
  // Every price in the table carries its currency's icon.
  const each = panel.getByTestId('bulk-each').first()
  await expect(each).toHaveText('1')
  await expect(each.locator('img')).toHaveAttribute('alt', 'chaos')
  expect(haves).toEqual([['divine', 'chaos'], ['chaos']])
  // Once chaos loaded, divine's count is the first search's total less chaos's.
  await expect(panel.locator('.w-pc-matched button').nth(1)).toContainText('311')
  // The listed time is coloured by age, as in the listings table: green for new, red past a week.
  await expect(panel.locator('.w-pc-table td.w-pc-age.w-pc-age-new').first()).toBeVisible()
  await expect(panel.locator('.w-pc-table td.w-pc-age.w-pc-age-old').first()).toBeVisible()
  await overlay.snap('bulk check after picking chaos offers')
  // Picking divine again shows those offers, priced in div with their chaos value, with no new search.
  await panel.locator('.w-pc-matched button').nth(1).click()
  await expect(price).toHaveText('1 div')
  await expect(panel).toContainText('each ≈ 180c')
  await expect(panel.getByTestId('bulk-verdict-other')).toContainText('Chaos offers ask 1c each')
  await expect(each.locator('img')).toHaveAttribute('alt', 'divine')
  expect(haves).toHaveLength(2)
})

test('bulk: when the picked chaos offers fail to load, it says so and Retry gets them', async ({ overlay }) => {
  const haves = await fakeOriginatorExchange(overlay.page, 1)
  await overlay.boot()
  await overlay.copyItem('items/currency-originators-exalted.txt')
  const panel = overlay.widget('price-check')
  await expect(panel.getByTestId('bulk-verdict-price')).toHaveText('1 div')
  await panel.locator('.w-pc-matched button').nth(0).click()
  await expect(panel).toContainText('Test failure')
  await panel.getByRole('button', { name: 'Retry' }).click()
  await expect(panel.getByTestId('bulk-verdict-price')).toHaveText('1 div')
  await panel.locator('.w-pc-matched button').nth(0).click()
  await expect(panel.getByTestId('bulk-verdict-price')).toHaveText('1c')
  // Each chaos search came from a click.
  expect(haves.filter(have => have.length === 1)).toHaveLength(2)
})

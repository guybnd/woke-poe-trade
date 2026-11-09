// Price check "PoE mode" (Settings > Price check > Window style). Standard is the
// window as it was; PoE draws unpicked mods as tooltip lines in the game's colours,
// and a picked one as the usual row with boxes.
import { test, expect } from './harness'

const poe = (config: any) => {
  config.widgets.find((w: { wmType: string }) => w.wmType === 'price-check').wokeWindowStyle = 'poe'
}

test('the setting switches the window style, Standard by default', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const win = overlay.page.locator('#price-window')
  await expect(win).toContainText('Energy Shield')
  await expect(win).not.toHaveClass(/w-poe/)
  await expect(win.locator('.w-poe-line')).toHaveCount(0)

  await overlay.boot({ overlayActive: true })
  await overlay.widget('menu').locator('.fa-cog').click()
  const settings = overlay.widget('settings')
  await settings.getByText('Price check', { exact: true }).first().click()
  const row = settings.locator('[data-window-style]')
  await expect(row).toContainText('Window style')
  await row.getByText('PoE', { exact: true }).click()
  await expect.poll(() => overlay.savedWidget('price-check')?.wokeWindowStyle).toBe('poe')

  // Back to the game, and the next check is drawn the PoE way.
  overlay.app.focusGame(true)
  await expect.poll(() => overlay.app.registeredHotkeys().length).toBeGreaterThan(0)
  await overlay.copyItem('items/rare-body-armour-es.txt')
  await expect(win).toHaveClass(/w-poe/)
  await expect(win.locator('.w-poe-line').first()).toBeVisible()
})

test('PoE mode: unpicked mods are tooltip lines, clicking one picks it', async ({ overlay, fakeApp }) => {
  await overlay.boot({ patch: poe })
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const win = overlay.page.locator('#price-window')
  await expect(win).toHaveClass(/w-poe/)
  const lines = win.locator('.w-poe-line')
  await expect(lines.first()).toBeVisible()
  const count = await lines.count()
  expect(count).toBeGreaterThan(0)
  // Separators between sections, in the filter well.
  await expect(win.locator('.w-poe-well .w-poe-sep').first()).toBeAttached()
  // Lines say what kind of mod they are on hover.
  const first = lines.first()
  expect(await first.getAttribute('title')).toBeTruthy()
  // Header: the 2x2 grid, numbers as chips.
  await expect(win.locator('.w-poe-head')).toBeVisible()
  await overlay.snap('poe mode rare body armour')

  // Picking a line makes it a row with min and max, and spends no search.
  const before = fakeApp.requests.filter(r => r.url.includes('/api/trade/search')).length
  const text = (await first.locator('.w-poe-line-text').innerText()).trim()
  await first.locator('.w-poe-line-text').click()
  await expect(lines).toHaveCount(count - 1)
  const picked = win.locator('.w-poe-row', { hasText: text.slice(0, 12) })
  await expect(picked.locator('.w-roll-input').first()).toBeVisible()
  // Long text wraps, never an ellipsis.
  await expect(picked.locator('.w-poe-row-text')).toHaveCSS('white-space', 'normal')
  expect(fakeApp.requests.filter(r => r.url.includes('/api/trade/search')).length).toBe(before)

  // Enter searches.
  await picked.locator('.w-roll-input').first().focus()
  await overlay.page.keyboard.press('Enter')
  await expect.poll(() => fakeApp.requests.filter(r => r.url.includes('/api/trade/search')).length).toBeGreaterThan(before)
  await overlay.snap('poe mode picked row and results')
})

test('PoE mode: number chips toggle on the label and change by wheel without a search', async ({ overlay, fakeApp }) => {
  await overlay.boot({ patch: poe })
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const win = overlay.page.locator('#price-window')
  const chip = win.locator('.w-poe-nchip').first()
  await expect(chip).toBeVisible()
  const label = chip.locator('.w-poe-nlab')
  const was = await label.getAttribute('aria-pressed')
  await label.click()
  await expect(label).toHaveAttribute('aria-pressed', was === 'true' ? 'false' : 'true')
  // Off, then a scroll on the number: changed and on.
  if (await label.getAttribute('aria-pressed') === 'true') await label.click()
  const input = chip.locator('input').first()
  const v0 = Number(await input.inputValue())
  const before = fakeApp.requests.filter(r => r.url.includes('/api/trade/search')).length
  await input.hover()
  await overlay.page.mouse.wheel(0, 100)
  await expect(input).toHaveValue(String(Math.max(v0 - 1, 0)))
  await expect(label).toHaveAttribute('aria-pressed', 'true')
  // Dragging sideways changes it too.
  const box = (await input.boundingBox())!
  await overlay.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await overlay.page.mouse.down()
  await overlay.page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2, { steps: 6 })
  await overlay.page.mouse.up()
  expect(Number(await input.inputValue())).toBeGreaterThan(Math.max(v0 - 1, 0))
  expect(fakeApp.requests.filter(r => r.url.includes('/api/trade/search')).length).toBe(before)
})

test('PoE mode: a pseudo total splits into its mods and folds back', async ({ overlay }) => {
  await overlay.boot({ patch: poe })
  await overlay.copyItem('items/rare-ring.txt')
  const win = overlay.page.locator('#price-window')
  const tag = win.locator('.w-poe-ptag').first()
  await expect(tag).toBeVisible()
  await expect(tag).toContainText('▾')
  const lines = await win.locator('.w-poe-line, .w-poe-row').count()
  await tag.click()
  await expect(win.locator('.w-poe-ptag').first()).toContainText('▴')
  await expect(win.locator('.w-poe-child').first()).toBeVisible()
  expect(await win.locator('.w-poe-line, .w-poe-row').count()).toBeGreaterThan(lines)
  await overlay.snap('poe mode pseudo split')
  await win.locator('.w-poe-ptag').first().click()
  await expect(win.locator('.w-poe-child')).toHaveCount(0)
  expect(await win.locator('.w-poe-line, .w-poe-row').count()).toBe(lines)
})

test('PoE mode: a fractured mod gets "Fractured only" once picked', async ({ overlay, fakeApp }) => {
  await overlay.boot({ patch: poe })
  await overlay.copyItem('items/rare-ring-fractured.txt')
  const win = overlay.page.locator('#price-window')
  const frac = win.locator('.w-poe-line .w-poe-k-fractured, .w-poe-row .w-poe-k-fractured').first()
  await expect(frac).toBeVisible()
  if (await win.locator('.w-poe-line .w-poe-k-fractured').count()) {
    await win.locator('.w-poe-line .w-poe-k-fractured').first().click()
  }
  const chip = win.locator('.w-poe-chip', { hasText: 'Fractured only' }).first()
  await expect(chip).toBeVisible()
  await chip.click()
  await expect(chip).toHaveClass(/\bon\b/)
  await win.locator('.btn.w-pc-primary').click()
  await expect.poll(() => fakeApp.requests.some(r => r.url.includes('/api/trade/search') && r.body.includes('fractured.stat_'))).toBe(true)
  await overlay.snap('poe mode fractured only')
})

test('PoE mode: other items keep their features', async ({ overlay }) => {
  await overlay.boot({ patch: poe })
  for (const [file, name] of [
    ['items/unique-kaoms-heart.txt', 'unique'],
    ['items/currency-divine.txt', 'currency'],
    ['items/gem-enlighten.txt', 'gem'],
    ['items/map-rare-t16.txt', 'map'],
    ['items/rare-cluster-large.txt', 'cluster'],
    ['items/rare-eldritch.txt', 'eldritch']
  ] as const) {
    await overlay.copyItem(file)
    const win = overlay.page.locator('#price-window')
    await expect(win).toHaveClass(/w-poe/)
    await overlay.page.waitForTimeout(400)
    await overlay.snap(`poe mode ${name}`)
  }
})

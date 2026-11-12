// Price check "Tooltip lines" filter layout (Settings > Price check > Filter layout), the default.
// Rows is the window as it was; Tooltip lines draws unpicked mods as tooltip lines in the game's colours,
// and a picked one as the usual row with boxes.
import { test, expect } from './harness'

const poe = (config: any) => {
  config.widgets.find((w: { wmType: string }) => w.wmType === 'price-check').wokeWindowStyle = 'poe'
}

// A config that never picked a style, as a new install or an update has.
const unpicked = (config: any) => {
  delete config.widgets.find((w: { wmType: string }) => w.wmType === 'price-check').wokeWindowStyle
}

test('Tooltip lines is the default filter layout, and Settings switches it to Rows', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ patch: unpicked })
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const win = overlay.page.locator('#price-window')
  await expect(win).toContainText('Energy Shield')
  await expect(win).toHaveClass(/w-poe/)
  await expect(win.locator('.w-poe-line').first()).toBeVisible()

  await overlay.boot({ overlayActive: true, patch: unpicked })
  await overlay.widget('menu').locator('.fa-cog').click()
  const settings = overlay.widget('settings')
  await settings.getByText('Price check', { exact: true }).first().click()
  const row = settings.locator('[data-window-style]')
  await expect(row).toContainText('Filter layout')
  await row.getByText('Rows', { exact: true }).click()
  await expect.poll(() => overlay.savedWidget('price-check')?.wokeWindowStyle).toBe('standard')

  // Back to the game, and the next check is the Rows layout.
  overlay.app.focusGame(true)
  await expect.poll(() => overlay.app.registeredHotkeys().length).toBeGreaterThan(0)
  await overlay.copyItem('items/rare-body-armour-es.txt')
  await expect(win).toContainText('Energy Shield')
  await expect(win).not.toHaveClass(/w-poe/)
  await expect(win.locator('.w-poe-line')).toHaveCount(0)
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

  // Enter searches, right after the click: the line it was is gone, so nothing has focus.
  await overlay.page.keyboard.press('Enter')
  await expect.poll(() => fakeApp.requests.filter(r => r.url.includes('/api/trade/search')).length).toBeGreaterThan(before)
  await overlay.snap('poe mode picked row and results')

  // Esc in a box only leaves the box; Esc again closes the window.
  const box = picked.locator('.w-roll-input').first()
  await box.focus()
  await overlay.page.keyboard.press('Escape')
  await expect(box).not.toBeFocused()
  await expect(win).toBeVisible()
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

test('PoE mode: the catalyst Q tag shows on picked rows and unpicked lines, and searches only on a click', async ({ overlay, fakeApp }) => {
  await overlay.boot({ patch: poe })
  await overlay.copyItem('items/rare-belt-catalysed.txt')
  const win = overlay.page.locator('#price-window')
  const searches = () => fakeApp.requests.filter(r => r.url.includes('/api/trade/search')).length
  // Unpicked tooltip lines carry it.
  const line = win.locator('.w-poe-line', { has: overlay.page.locator('[data-catalyst-tag]') }).first()
  await expect(line).toBeVisible()
  const text = (await line.locator('.w-poe-line-text').innerText()).trim()
  const tag = line.locator('[data-catalyst-tag]')
  await expect(tag).toHaveText('Q20')
  const before = searches()
  await tag.click()
  // It switches the catalyst filter, not the line, and doesn't search by itself.
  await expect(tag).toHaveClass('w-poe-qtag on')
  await expect(line).toBeVisible()
  expect(searches()).toBe(before)
  // Picked, the row keeps it, still on.
  await line.locator('.w-poe-line-text').click()
  const row = win.locator('.w-poe-row', { hasText: text.slice(0, 10) })
  await expect(row.locator('[data-catalyst-tag]')).toHaveText('Q20')
  expect(searches()).toBe(before)
  await overlay.snap('poe mode catalyst tag')
  await win.locator('.btn.w-pc-primary').click()
  await expect.poll(() => fakeApp.requests.some(r => r.url.includes('/api/trade/search') && r.body.includes('pseudo_jewellery_attribute_quality'))).toBe(true)
})

test('PoE mode: other items keep their features', async ({ overlay }) => {
  await overlay.boot({ patch: poe })
  for (const [file, name] of [
    ['items/unique-kaoms-heart.txt', 'unique'],
    ['items/currency-divine.txt', 'currency'],
    ['items/gem-enlighten.txt', 'gem'],
    ['items/map-rare-t16.txt', 'map'],
    ['items/rare-cluster-large.txt', 'cluster'],
    ['items/rare-eldritch.txt', 'eldritch'],
    ['items/unique-watchers-eye.txt', 'watchers eye'],
    ['items/magic-flask.txt', 'flask']
  ] as const) {
    await overlay.copyItem(file)
    const win = overlay.page.locator('#price-window')
    await expect(win).toHaveClass(/w-poe/)
    await overlay.page.waitForTimeout(400)
    await overlay.snap(`poe mode ${name}`)
  }
})

// At a big window and text size (20px, 115%), Hidden filters under the list and Mod details
// in the header each keep their label on one line, in both window styles.
for (const style of ['poe', 'standard']) {
  test(`${style}: Hidden filters and Mod details stay on one line at a big size`, async ({ overlay }) => {
    await overlay.page.setViewportSize({ width: 2560, height: 1440 })
    await overlay.boot({
      patch: (config: any) => {
        config.fontSize = 20
        config.widgets.find((w: { wmType: string }) => w.wmType === 'price-check').wokeWindowStyle = style
      }
    })
    await overlay.page.evaluate(() => {
      localStorage.setItem('woke.textScale', '115')
      window.dispatchEvent(new StorageEvent('storage', { key: 'woke.textScale' }))
    })
    await overlay.copyItem('items/rare-ring.txt')
    const win = overlay.page.locator('#price-window')
    const foot = win.locator('.w-pc-stat-foot')
    await expect(foot).toBeVisible()
    const toggles = [foot.locator('button', { hasText: 'Hidden filters' }), win.locator('[data-mods-toggle]')]
    for (const toggle of toggles) {
      await expect(toggle).toHaveCount(1)
      const h = await toggle.evaluate(el => {
        const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.3
        return el.getBoundingClientRect().height / lh
      })
      expect(h).toBeLessThan(1.9)
    }
    if (style === 'poe') {
      const well = (await win.locator('.w-poe-well').boundingBox())!
      const footBox = (await foot.boundingBox())!
      expect(footBox.y).toBeGreaterThanOrEqual(well.y + well.height)
    }
  })
}

// Mod details, off by default, lists the mods behind each total once; a one-mod line has none.
// Its toggle sits above the list, so it turns off however long the list grows.
test('PoE mode: Mod details shows the mods behind totals, once, and turns off', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ patch: poe })
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const win = overlay.page.locator('#price-window')
  await expect(win).toContainText('Energy Shield')
  const toggle = win.locator('[data-mods-toggle]')
  const sources = win.locator('.w-pc-sources')
  await expect(toggle).toBeVisible()
  await expect(sources).toHaveCount(0)
  await toggle.click()
  await expect(sources.first()).toBeVisible()
  // Seraphim's (a hybrid: ES and stun recovery) is behind three lines, listed once.
  await expect(sources.filter({ hasText: 'Seraphim' })).toHaveCount(1)
  await expect(sources.filter({ hasText: 'Unassailable' })).toHaveCount(1)
  // Life is one mod: no details under it.
  await expect(sources.filter({ hasText: 'Fecund' })).toHaveCount(0)
  expect((await sources.allInnerTexts()).join(' ')).not.toContain('#%')
  expect(await win.locator('.w-pc-sources .line-through').count()).toBe(0)
  // A total shows its mods' tiers.
  await expect(win.locator('.w-poe-tier', { hasText: 'T1/1' }).first()).toBeVisible()
  await overlay.snap('poe mode mod details')
  const box = (await toggle.boundingBox())!
  const first = (await sources.first().boundingBox())!
  expect(box.y).toBeLessThan(first.y)
  await toggle.click()
  await expect(sources).toHaveCount(0)
})

test('PoE mode lists the local Energy Shield mod behind the total, once; Standard keeps it hidden', async ({ overlay }) => {
  await overlay.boot({ patch: poe })
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const win = overlay.page.locator('#price-window')
  await expect(win).toHaveClass(/w-poe/)
  const local = win.locator('.w-poe-line', { hasText: 'increased Energy Shield' })
  await expect(local).toHaveCount(1)
  await expect(local).toContainText('162')
  await overlay.snap('poe mode local es mod')

  await overlay.boot({})
  await overlay.copyItem('items/rare-body-armour-es.txt')
  await expect(win).not.toHaveClass(/w-poe/)
  await expect(win).toContainText('Energy Shield')
  await expect(win.locator('[data-stat-row]').getByText('increased Energy Shield')).toHaveCount(0)
})

test('PoE mode: a local line two mods add up to splits, and a hybrid box searches that mod', async ({ overlay, fakeApp }) => {
  await overlay.boot({ patch: poe })
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const win = overlay.page.locator('#price-window')
  await expect(win).toHaveClass(/w-poe/)
  const line = win.locator('.w-poe-line', { hasText: '162' })
  await line.getByRole('button', { name: /2 mods/ }).click()
  const box = win.locator('.w-poe-line.w-poe-hybrid')
  await expect(box).toHaveCount(2)
  await expect(box.first()).toContainText('42')
  await expect(box.first()).toContainText("Seraphim's")
  await expect(box.last()).toContainText('Stun and Block Recovery')
  await overlay.snap('poe mode hybrid box')

  const searches = fakeApp.requests.filter(r => r.url.includes('/api/trade/search')).length
  await box.last().locator('.w-poe-line-text').click()
  // Both of the mod's lines are picked rows now, at the bottom of their tier; no search spent.
  const picked = win.locator('.w-poe-row')
  await expect(picked.filter({ hasText: 'Stun and Block Recovery' })).toHaveCount(1)
  await expect(picked.filter({ hasText: 'increased Energy Shield' })).toHaveCount(1)
  await expect(win.locator('.w-poe-line', { hasText: '120' })).toHaveCount(1)
  expect(fakeApp.requests.filter(r => r.url.includes('/api/trade/search')).length).toBe(searches)
  await overlay.snap('poe mode hybrid picked')
})

test('PoE mode: added damage lines read with both numbers', async ({ overlay }) => {
  await overlay.boot({ patch: poe })
  await overlay.copyItem('items/rare-sword-local-phys.txt')
  const win = overlay.page.locator('#price-window')
  await expect(win.locator('.w-poe-line', { hasText: 'Physical Damage' }).filter({ hasText: 'Adds' })).toContainText(/Adds\s*30\s*to\s*60/)
  await overlay.snap('poe mode adds line')
})

test('a foulborn mod shows in its own colour among the explicit mods', async ({ overlay }) => {
  await overlay.boot({ patch: poe })
  await overlay.copyItem('items/unique-kaoms-heart-foulborn.txt')
  const win = overlay.page.locator('#price-window')
  const foul = win.locator('.w-poe-k-foulborn', { hasText: 'Corrupted Item' })
  await expect(foul).toBeVisible()
  await expect(foul).toHaveCSS('color', 'rgb(232, 136, 156)')
  await expect(foul).toHaveAttribute('title', 'Foulborn modifier')
  await overlay.snap('foulborn mod in poe mode')
})

// The rail on the left edge and its launcher: every tool in one place, a short
// row of pins, and item paste from anywhere in the overlay.
import { test, expect, fixtureText } from './harness'
import type { Overlay } from './harness'

const ITEM = fixtureText('items/rare-ring.txt')

const icon = (overlay: Overlay, name: string) =>
  overlay.widget('menu').getByRole('button', { name, exact: true })

// The tools and open windows of a real config, still on the old bar.
async function boot (overlay: Overlay, patchMenu?: (menu: any) => void) { // eslint-disable-line @typescript-eslint/no-explicit-any
  overlay.page.setViewportSize({ width: 2560, height: 1440 })
  // New widgets open themselves as they initialize; closed again below.
  const seed = (wmType: string, wmTitle: string) =>
    ({ wmType, wmTitle, anchor: { pos: 'tl', x: 40, y: 30 } })
  await overlay.boot({
    overlayActive: true,
    widgets: [
      seed('woke-market-tracker', 'Market'),
      seed('woke-boss-runs', 'Boss runs'),
      seed('woke-map-scan', 'Map scan'),
      seed('woke-loot-filter', 'Loot filter'),
      seed('woke-lab-gems', 'Lab gems'),
      seed('woke-challenges', 'Challenges')
    ],
    patch: (config) => {
      const menu = config.widgets.find((w: { wmType: string }) => w.wmType === 'menu')
      menu.pinned = config.widgets.filter((w: { wmFlags: string[] }) => !w.wmFlags.includes('menu::skip')).map((w: { wmId: number }) => w.wmId)
      menu.dismissed = []
      // The default config was saved by a running app, so it's already moved.
      delete menu.rail
      menu.anchor = { pos: 'tl', x: 5, y: 5 }
      patchMenu?.(menu)
    }
  })
  await overlay.showScreen('screens/map-real-01.png')
  const rail = overlay.widget('menu').locator('.w-surface').first()
  await expect(rail).toBeVisible()
  if (!patchMenu) {
    for (const name of ['Market', 'Map scan', 'Loot filter', 'Challenges']) {
      await expect(icon(overlay, name)).toHaveClass(/open/)
      await icon(overlay, name).click()
    }
    await overlay.page.mouse.move(1500, 1300)
  }
  return rail
}

test('an old bar becomes a short rail on the left edge, below the buffs', async ({ overlay }) => {
  const rail = await boot(overlay)
  const box = (await rail.boundingBox())!
  expect(box.x).toBe(0)
  expect(box.y).toBeGreaterThan(120)
  expect(box.width).toBeLessThan(70)
  await expect(icon(overlay, 'Market')).toBeVisible()
  await expect(icon(overlay, 'Boss runs')).toBeVisible()
  await expect(icon(overlay, 'Lab gems')).toBeVisible() // not pinned, but open
  await expect(icon(overlay, 'Challenges')).toHaveCount(0) // not pinned, closed
  await overlay.snap('rail')
  expect(overlay.errors).toEqual([])
})

test('a rail that was moved stays moved', async ({ overlay }) => {
  const rail = await boot(overlay, (menu) => {
    menu.rail = true
    menu.anchor = { pos: 'tl', x: 40, y: 20 }
    menu.pinned = []
  })
  const box = (await rail.boundingBox())!
  expect(box.x).toBe(1024)
  expect(box.y).toBe(288)
})

test('hovering names the tool, on top of the windows', async ({ overlay }) => {
  await boot(overlay)
  await icon(overlay, 'Boss runs').hover()
  await expect(overlay.page.locator('[class*="tip"]', { hasText: 'Boss runs' })).toContainText('open')
  await overlay.snap('hover')
  await overlay.page.mouse.move(1500, 1200)
  await expect(overlay.page.locator('[class*="tip"]', { hasText: 'Boss runs' })).toHaveCount(0)
})

test('clicking an open tool that is not pinned closes it and takes it off the rail', async ({ overlay }) => {
  await boot(overlay)
  await expect(overlay.widget('woke-lab-gems').locator('.w-surface, [data-w-panel]').first()).toBeVisible()
  await icon(overlay, 'Lab gems').click()
  await expect(icon(overlay, 'Lab gems')).toHaveCount(0)
  await expect(overlay.page.locator('[class*="tip"]', { hasText: 'Lab gems' })).toHaveCount(0)
})

test('the launcher lists every tool, finds them, opens them and pins them', async ({ overlay }) => {
  const { page } = overlay
  await boot(overlay)
  await icon(overlay, 'All tools').click()
  const box = page.getByRole('textbox', { name: 'Find a tool or an item, or paste an item' })
  await expect(box).toBeFocused()
  await expect(page.getByRole('button', { name: 'Challenges', exact: true })).toBeVisible()
  await expect(page.getByText('Economy', { exact: true })).toBeVisible()
  await overlay.snap('launcher')

  await page.getByRole('button', { name: 'Pin Challenges to the rail' }).click()
  await page.mouse.click(1500, 1300)
  await expect(box).toHaveCount(0)
  await expect(icon(overlay, 'Challenges')).toBeVisible()

  // Enter with nothing typed opens nothing.
  await icon(overlay, 'All tools').click()
  await page.keyboard.press('Enter')
  await expect(box).toBeVisible()
  await box.fill('chall')
  await expect(page.locator('[class*="launcher"]').getByRole('button', { name: 'Boss runs', exact: true })).toHaveCount(0)
  await page.keyboard.press('Enter')
  await expect(box).toHaveCount(0)
  await expect(icon(overlay, 'Challenges')).toHaveClass(/open/)

  await icon(overlay, 'All tools').click()
  await box.fill('nothing like this')
  await expect(page.getByText('Nothing matches')).toBeVisible()
  expect(overlay.errors).toEqual([])
})

test('the launcher opens toward the screen when the rail is on the right', async ({ overlay }) => {
  const rail = await boot(overlay, (menu) => {
    menu.rail = true
    menu.anchor = { pos: 'tr', x: 100, y: 10.5 }
  })
  await icon(overlay, 'All tools').click()
  const panel = overlay.page.getByRole('textbox', { name: 'Find a tool or an item, or paste an item' })
  const railBox = (await rail.boundingBox())!
  const panelBox = (await panel.boundingBox())!
  expect(panelBox.x + panelBox.width).toBeLessThan(railBox.x)
  expect(panelBox.x).toBeGreaterThan(0)
})

test('an item pasted into the launcher goes to the price check, other text is a search', async ({ overlay }) => {
  const { page } = overlay
  await boot(overlay)
  await icon(overlay, 'All tools').click()
  const box = page.getByRole('textbox', { name: 'Find a tool or an item, or paste an item' })
  const paste = (text: string) => box.evaluate((el, t) => {
    const data = new DataTransfer()
    data.setData('text/plain', t)
    const e = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
    if (el.dispatchEvent(e)) (el as HTMLTextAreaElement).value = t
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, text)
  await paste('boss')
  await expect(box).toHaveValue('boss')
  await expect(page.getByRole('button', { name: 'Challenges', exact: true })).toHaveCount(0)
  await paste(ITEM)
  await expect(box).toHaveCount(0)
  await expect(overlay.widget('price-check').locator('[data-scope-cycle]')).toBeVisible()
})

test('Ctrl V anywhere in the overlay price checks a copied item', async ({ overlay }) => {
  const { page } = overlay
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await boot(overlay)
  await page.evaluate(t => navigator.clipboard.writeText(t), ITEM)
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press('Control+V')
  await expect(overlay.widget('price-check').locator('[data-scope-cycle]')).toBeVisible()
})

test('Ctrl V does nothing while the overlay is closed', async ({ overlay }) => {
  const { page } = overlay
  await boot(overlay)
  overlay.app.focusGame(true)
  await page.evaluate((t) => {
    const data = new DataTransfer()
    data.setData('text/plain', t)
    document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
  }, ITEM)
  await page.waitForTimeout(300)
  await expect(overlay.widget('price-check').locator('[data-scope-cycle]')).toHaveCount(0)
})

test('opening a tool from the launcher gets the launcher out of the way', async ({ overlay }) => {
  const { page } = overlay
  await boot(overlay)
  await icon(overlay, 'All tools').click()
  const launcher = page.locator('[class*="launcher"]')
  await launcher.getByRole('button', { name: 'Challenges', exact: true }).click()
  await expect(launcher).toHaveCount(0)
  await expect(icon(overlay, 'Challenges')).toHaveClass(/open/)
  // Closing one leaves it up, for the next.
  await icon(overlay, 'All tools').click()
  await launcher.getByRole('button', { name: 'Challenges', exact: true }).click()
  await expect(launcher).toBeVisible()
  await expect(icon(overlay, 'Challenges')).toHaveCount(0)
})

test('Ctrl V with the launcher open and focus off its box closes the launcher', async ({ overlay }) => {
  const { page } = overlay
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await boot(overlay)
  await page.evaluate(t => navigator.clipboard.writeText(t), ITEM)
  await icon(overlay, 'All tools').click()
  const launcher = page.locator('[class*="launcher"]')
  await launcher.getByRole('button', { name: 'Pin Challenges to the rail' }).click()
  await page.keyboard.press('Control+V')
  await expect(overlay.widget('price-check').locator('[data-scope-cycle]')).toBeVisible()
  await expect(launcher).toHaveCount(0)
})

test('Ctrl V leaves Settings alone', async ({ overlay }) => {
  const { page } = overlay
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await boot(overlay)
  await page.evaluate(t => navigator.clipboard.writeText(t), ITEM)
  await icon(overlay, 'Settings').click()
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press('Control+V')
  await page.waitForTimeout(300)
  await expect(overlay.widget('price-check').locator('[data-scope-cycle]')).toHaveCount(0)
})

test('the launcher lists tools not placed yet, and clicking one opens it', async ({ overlay }) => {
  const { page } = overlay
  await boot(overlay)
  await icon(overlay, 'All tools').click()
  const launcher = page.locator('[class*="launcher"]')
  await launcher.getByRole('button', { name: 'Essence scan', exact: true }).click()
  await expect(launcher).toHaveCount(0)
  await expect(icon(overlay, 'Essence scan')).toHaveClass(/open/)
  await expect(page.locator('[data-w-panel]').filter({ hasText: 'Essence scan' }).first()).toBeVisible()
  expect(overlay.errors).toEqual([])
})

test('a switched-off tool is listed as off, and clicking it turns it on and opens it', async ({ overlay }) => {
  const { page } = overlay
  await overlay.boot({ overlayActive: true, off: ['scarab-flip'] })
  const menu = overlay.widget('menu')
  await menu.getByRole('button', { name: 'All tools', exact: true }).click()
  const launcher = page.locator('[class*="launcher"]')
  const row = launcher.locator('[class*="_row_"]').filter({ hasText: 'Flips' })
  await expect(row).toContainText('Off')
  await overlay.snap('off row')
  await row.getByRole('button', { name: 'Flips', exact: true }).click()
  await expect(launcher).toHaveCount(0)
  await expect(menu.getByRole('button', { name: 'Flips', exact: true })).toHaveClass(/open/)
  expect(overlay.errors).toEqual([])
})

test('right-clicking a tool that allows copies adds another one', async ({ overlay }) => {
  const { page } = overlay
  await boot(overlay)
  await icon(overlay, 'All tools').click()
  const launcher = page.locator('[class*="launcher"]')
  const before = await launcher.getByRole('button', { name: /Pin .* to the rail|Unpin .* from the rail/ }).count()
  await launcher.locator('[class*="_row_"]').filter({ hasText: 'Cheat sheets' }).click({ button: 'right' })
  await page.getByRole('button', { name: 'Add another copy' }).click()
  await icon(overlay, 'All tools').click()
  await expect(launcher.getByRole('button', { name: /Pin .* to the rail|Unpin .* from the rail/ })).toHaveCount(before + 1)
})

test('a second Settings or Item search cannot be added', async ({ overlay }) => {
  const { page } = overlay
  await boot(overlay)
  for (const name of ['Settings', 'Item search']) {
    await icon(overlay, name).click({ button: 'right' })
    await expect(page.getByRole('button', { name: 'Unpin from the rail' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add another copy' })).toHaveCount(0)
    await page.mouse.click(1500, 1300)
  }
})

test('a tool placed from the launcher gets its default hotkeys straight away', async ({ overlay }) => {
  const { page } = overlay
  await boot(overlay)
  await icon(overlay, 'All tools').click()
  await page.locator('[class*="launcher"]').getByRole('button', { name: 'Essence scan', exact: true }).click()
  await expect(icon(overlay, 'Essence scan')).toBeVisible()
  // Hotkeys only register while the game has focus.
  overlay.app.focusGame(true)
  await expect.poll(() => overlay.app.registeredHotkeys()).toContain('Alt+E')
})

test('a pinned icon drags to a new place, and a plain click still opens it', async ({ overlay }) => {
  await boot(overlay)
  const pins = overlay.widget('menu').locator('[data-pin]')
  const names = () => pins.evaluateAll(els => els.map(e => e.getAttribute('aria-label')))
  const before = await names()
  expect(before.length).toBeGreaterThan(2)
  const first = await pins.nth(0).boundingBox()
  const last = await pins.nth(before.length - 1).boundingBox()
  await overlay.page.mouse.move(first!.x + 10, first!.y + 10)
  await overlay.page.mouse.down()
  await overlay.page.mouse.move(first!.x + 10, first!.y + 30, { steps: 3 })
  await overlay.page.mouse.move(last!.x + 10, last!.y + last!.height, { steps: 5 })
  await overlay.page.mouse.up()
  await expect.poll(names).toEqual([...before.slice(1), before[0]])
  // The drag didn't open it.
  await expect(icon(overlay, before[0]!)).not.toHaveClass(/open/)
  await icon(overlay, before[0]!).click()
  await expect(icon(overlay, before[0]!)).toHaveClass(/open/)
})

test('the settings button appears on hover, and flips and resizes the rail with the mouse alone', async ({ overlay }) => {
  const rail = await boot(overlay)
  const cfg = overlay.widget('menu').getByRole('button', { name: 'Rail layout and size' })
  await rail.hover()
  await cfg.click()
  const menu = overlay.page.locator('[data-rail-layout]')
  await expect(menu).toBeVisible()
  const tall = await rail.boundingBox()
  expect(tall!.height).toBeGreaterThan(tall!.width)

  await menu.getByRole('button', { name: 'Horizontal' }).click()
  await expect.poll(async () => { const b = await rail.boundingBox(); return b!.width > b!.height }).toBe(true)
  await expect(menu).toBeVisible()

  await menu.getByRole('button', { name: 'S', exact: true }).click()
  await overlay.page.waitForTimeout(100)
  const before = (await rail.boundingBox())!.height
  await menu.getByRole('button', { name: 'XXL', exact: true }).click()
  await expect.poll(async () => (await rail.boundingBox())!.height).toBeGreaterThan(before * 1.3)

  await menu.getByRole('button', { name: 'Reset position and size' }).click()
  await expect.poll(async () => { const b = await rail.boundingBox(); return b!.height > b!.width }).toBe(true)
})

test('a rail on the far right lays flat at full length, on screen', async ({ overlay }) => {
  const rail = await boot(overlay, (menu) => { menu.anchor = { pos: 'tl', x: 97, y: 10.5 } })
  const cfg = overlay.widget('menu').getByRole('button', { name: 'Rail layout and size' })
  await rail.hover()
  await cfg.click()
  const menu = overlay.page.locator('[data-rail-layout]')
  await menu.getByRole('button', { name: 'Horizontal' }).click()
  await expect.poll(async () => { const b = await rail.boundingBox(); return b!.width > b!.height }).toBe(true)
  const fits = await rail.evaluate(el => el.scrollWidth <= el.clientWidth + 1)
  expect(fits).toBe(true)
  const b = (await rail.boundingBox())!
  expect(b.x + b.width).toBeLessThanOrEqual(overlay.page.viewportSize()!.width + 1)
})

test('dropping the rail on the top edge lays it flat under the buffs, and on a side stands it up', async ({ overlay }) => {
  const rail = await boot(overlay)
  const grip = rail.locator('[title^="Drag to move the rail"]')
  const drag = async (x: number, y: number) => {
    const g = (await grip.boundingBox())!
    await overlay.page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
    await overlay.page.mouse.down()
    await overlay.page.mouse.move(g.x + 40, g.y - 40, { steps: 3 })
    await overlay.page.mouse.move(x, y, { steps: 5 })
    await overlay.page.mouse.up()
  }
  await drag(600, 10)
  await expect.poll(async () => { const b = await rail.boundingBox(); return b!.width > b!.height }).toBe(true)
  const flat = (await rail.boundingBox())!
  // Not over the buff row: 10.5% of the screen down.
  expect(flat.y).toBeGreaterThan(overlay.page.viewportSize()!.height * 0.09)

  await drag(10, 700)
  await expect.poll(async () => { const b = await rail.boundingBox(); return b!.height > b!.width }).toBe(true)
  expect((await rail.boundingBox())!.x).toBeLessThan(8)
})

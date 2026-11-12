// Pins (WOKEPOET-207): a dock card or a piece of a PoB build stays on screen
// while you play, where you drag it, as see-through as you set it, with its
// own spot in hideouts and in maps.
import path from 'path'
import { test, expect, FIXTURES } from './harness'

const area = (id: string, seed: number) => `2026/11/12 12:00:00 3725546 1186a8a3 [DEBUG Client 25552] Generating level 83 area "${id}" with seed ${seed}`
const HIDEOUT = area('HideoutLuxurious', 1)
const MAP = area('MapWorldsStrand', 2)

const counter = {
  wmType: 'woke-drop-counter',
  wmFlags: ['invisible-on-blur'],
  wmTitle: 'Drop counter',
  anchor: { pos: 'cc', x: 50, y: 50 },
  items: [{ type: 'Currency', name: 'Divine Orb', drops: [4] }],
  maps: 10,
  autoCountMaps: true,
  layout: 'list',
  hotkey: null
}

test('a dock card pins off the dock, drags, fades, and keeps a spot per place', async ({ overlay }) => {
  const { page } = overlay
  await overlay.boot({ widgets: [counter] })
  await overlay.log([HIDEOUT])
  await overlay.hoverDockIcon('drop-counter')
  const icon = overlay.dockIcon('drop-counter')
  const pinBtn = icon.getByRole('button', { name: 'Pin this card' })
  await expect(pinBtn).toBeVisible()
  const b = (await pinBtn.boundingBox())!
  await overlay.moveMouse(Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2))
  await pinBtn.click()

  const pin = page.locator('[data-pin="dock:drop-counter"]')
  await expect(pin).toContainText('Divine Orb')
  // The hover card makes way: the pin shows it now.
  await overlay.moveMouse(5, 5)
  await overlay.hoverDockIcon('drop-counter')
  await page.waitForTimeout(500)
  await expect(icon.locator('[data-dock-pin]')).toHaveCount(0)
  await overlay.moveMouse(5, 5)

  // Faded while the mouse is away, solid on it.
  await page.waitForTimeout(400)
  expect(Number(await pin.evaluate(el => getComputedStyle(el).opacity))).toBeCloseTo(0.85, 2)
  const head = pin.locator('[title^="Drag to move"]')
  const h = (await head.boundingBox())!
  await overlay.moveMouse(Math.round(h.x + 20), Math.round(h.y + h.height / 2))
  await expect.poll(() => pin.evaluate(el => getComputedStyle(el).opacity)).toBe('1')

  // Scroll over the half-moon: less see-through steps of 5.
  const fade = pin.locator('[data-pin-fade]')
  await fade.hover()
  await page.mouse.wheel(0, 100)
  await expect(fade).toContainText('80%')
  // While you set it, it shows that level, not solid.
  await expect.poll(() => pin.evaluate(el => getComputedStyle(el).opacity)).toBe('0.8')
  // A click opens a slider too.
  await fade.click()
  await pin.locator('[data-pin-fade-range]').fill('40')
  await expect(fade).toContainText('40%')
  await expect.poll(() => pin.evaluate(el => getComputedStyle(el).opacity)).toBe('0.4')
  await fade.click()
  await pin.locator('[data-pin-fade-range]').waitFor({ state: 'detached' })
  await page.mouse.wheel(0, -100)
  await page.mouse.wheel(0, -100)
  await page.mouse.wheel(0, -100)
  await page.mouse.wheel(0, -100)
  await page.mouse.wheel(0, -100)
  await page.mouse.wheel(0, -100)
  await page.mouse.wheel(0, -100)
  await page.mouse.wheel(0, -100)
  await expect(fade).toContainText('80%')
  await overlay.snap('pinned dock card')

  // Drag it in the hideout...
  await page.mouse.move(h.x + 20, h.y + h.height / 2)
  await page.mouse.down()
  await page.mouse.move(h.x + 320, h.y + 220, { steps: 6 })
  await page.mouse.up()
  const inHideout = (await pin.boundingBox())!
  expect(inHideout.x).toBeGreaterThan(h.x + 250)

  // ...and in a map it starts from the hideout spot, then keeps its own.
  await overlay.log([MAP])
  const m = (await pin.locator('[title^="Drag to move"]').boundingBox())!
  expect(Math.abs(m.x - inHideout.x)).toBeLessThan(4)
  await overlay.moveMouse(Math.round(m.x + 20), Math.round(m.y + m.height / 2))
  await page.mouse.move(m.x + 20, m.y + m.height / 2)
  await page.mouse.down()
  await page.mouse.move(m.x - 180, m.y + 40, { steps: 6 })
  await page.mouse.up()
  const inMap = (await pin.boundingBox())!
  await overlay.log([HIDEOUT])
  await expect.poll(async () => Math.round((await pin.boundingBox())!.x)).toBe(Math.round(inHideout.x))
  await overlay.log([MAP])
  await expect.poll(async () => Math.round((await pin.boundingBox())!.x)).toBe(Math.round(inMap.x))

  // Survives a reload.
  await page.reload()
  await expect(page.locator('[data-pin="dock:drop-counter"]')).toContainText('Divine Orb')

  // Unpin: the dock card comes back on hover.
  const again = page.locator('[data-pin="dock:drop-counter"]')
  const close = again.locator('[data-pin-close]')
  const c = (await close.boundingBox())!
  await overlay.moveMouse(Math.round(c.x + c.width / 2), Math.round(c.y + c.height / 2))
  await close.click()
  await expect(again).toHaveCount(0)
})

test('PoB pieces pin: a gear slot and the tree stay with the overlay closed', async ({ overlay }) => {
  const { page } = overlay
  await page.setViewportSize({ width: 1920, height: 1080 })
  await overlay.boot({
    widgets: [{
      wmType: 'woke-pob-builds',
      wmWants: 'show',
      wmFlags: ['invisible-on-blur'],
      anchor: { pos: 'tl', x: 5, y: 12 },
      buildsDir: path.join(FIXTURES, 'pob'),
      pobExe: '',
      pinned: [],
      activeBuild: null,
      followChars: {}
    }],
    overlayActive: true
  })
  await overlay.widget('woke-pob-builds').getByText('Showcase', { exact: false }).first().click()
  const detail = page.locator('[data-w-panel]').filter({ hasText: 'Open in PoB' })
  await detail.getByRole('tab', { name: 'Gear' }).click()
  const row = detail.locator('[class*="rowWrap"]').filter({ hasText: 'Dread Shell' }).first()
  await row.hover()
  await row.getByRole('button', { name: /^Pin this item/ }).click()
  const slot = page.locator('[data-pin^="pob-slot:"]')
  await expect(slot).toContainText('Dread Shell')

  await detail.getByRole('button', { name: 'Passive tree' }).click()
  const tree = page.locator('[data-w-panel]').filter({ hasText: 'Passive tree' }).filter({ has: page.locator('canvas') }).last()
  await tree.getByRole('button', { name: /^Pin the tree/ }).click()
  const treePin = page.locator('[data-pin^="pob-tree:"]')
  await expect(treePin.locator('canvas').first()).toBeVisible()
  await page.waitForTimeout(800)
  await overlay.snap('tree panel and pin')

  // Back to the game: the panels go, the pins stay.
  overlay.app.focusGame(true)
  await expect(detail).toBeHidden()
  await expect(slot).toBeVisible()
  await expect(treePin).toBeVisible()
  await page.waitForTimeout(800)
  await overlay.snap('pinned build pieces')
})

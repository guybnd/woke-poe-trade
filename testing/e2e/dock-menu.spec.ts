// An icon's right-click menu, while the game has focus: its actions, dismissing
// it, and bringing it back.
import { test, expect, logFixture } from './harness'
import type { Overlay } from './harness'

// Each test boots its own overlay: the file's tests can spread over workers
// and shards (one file alone otherwise sets how short a shard can be).
test.describe.configure({ mode: 'parallel' })

const session = logFixture('client-logs/mapping-session.txt')
const lineOf = (text: string, from = 0) => session.findIndex((l, i) => i >= from && l.includes(text))
// The hideout, up to and including "You have entered".
const hideout = session.slice(0, lineOf('You have entered') + 1)
const TRADE = { wmType: 'woke-trade', ping: false }
const whisper = (who: string, item: string) => `2026/11/05 10:00:00 500000000 cff94598 [INFO Client 21088] @From ${who}: Hi, I would like to buy your ${item} listed for 10 chaos in Standard (stash tab "Sale"; position: left 1, top 1)`
const WHISPER = [whisper('Kaltenhalt', 'Tabula Rasa Simple Robe')]
const WHISPER2 = [whisper('Sunder', 'Goldrim Leather Cap')]
const WHISPER3 = [whisper('Mirelle', 'Wanderlust Wool Shoes')]

// Mechanics reads the game log, which is how the dock knows the zone.
async function bootInHideout (overlay: Overlay, opts: { overlayActive?: boolean } = {}) {
  await overlay.boot({ widgets: [{ wmType: 'woke-mechanics' }], ...opts })
  await overlay.log(hideout)
}

async function rightClickIcon (overlay: Overlay, fakeApp: any, id: string) { // eslint-disable-line @typescript-eslint/no-explicit-any
  await overlay.hoverDockIcon(id)
  const box = await overlay.dockIcon(id).boundingBox()
  await overlay.page.waitForTimeout(50)
  fakeApp.pressMouse(Math.round(box!.x + box!.width / 2), Math.round(box!.y + box!.height / 2), 2)
  fakeApp.releaseMouse(2)
}

// The app runs on between tests: don't leave the mouse holding a card open.
test.afterEach(async ({ overlay }) => {
  await overlay.moveMouse(1000, 900)
  await overlay.page.waitForTimeout(100)
})

test('right-click on an icon in game opens its menu in place of the card, and it goes when you leave', async ({ overlay, fakeApp }) => {
  await bootInHideout(overlay)
  await rightClickIcon(overlay, fakeApp, 'regex-library')
  const menu = overlay.dockIcon('regex-library').locator('[data-dock-menu]')
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'This visit' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Always' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Turn off Regex library' })).toBeVisible()
  // The card isn't under it.
  await expect(overlay.dockIcon('regex-library').getByText('Regex library', { exact: true })).toHaveCount(0)

  await overlay.moveMouse(1000, 900)
  await expect(menu).toHaveCount(0, { timeout: 1500 })
})

test('a right-click passing over the icon before the mouse is taken stays with the game', async ({ overlay, fakeApp }) => {
  await bootInHideout(overlay)
  const box = await overlay.dockIcon('regex-library').boundingBox()
  fakeApp.pressMouse(Math.round(box!.x + box!.width / 2), Math.round(box!.y + box!.height / 2), 2)
  fakeApp.releaseMouse(2)
  await overlay.moveMouse(1000, 900)
  await overlay.page.waitForTimeout(100)
  await expect(overlay.dockIcon('regex-library').locator('[data-dock-menu]')).toHaveCount(0)
})

test('a stash search row runs from the click, with no overlay key', async ({ overlay, fakeApp }) => {
  await bootInHideout(overlay)
  await rightClickIcon(overlay, fakeApp, 'regex-library')
  await overlay.dockIcon('regex-library').getByRole('menuitem', { name: /Search stash: / }).first().click()
  await expect.poll(() => fakeApp.game.stashSearches.length).toBe(1)
})

test('dismissed for this map: gone through the hideout and back, back with the next map', async ({ overlay, fakeApp }) => {
  await overlay.boot({ widgets: [TRADE, { wmType: 'woke-mechanics' }] })
  // No whisper from the session: a new offer brings the icon back on its own.
  const quiet = session.filter(l => !l.includes('@From'))
  const entered = (name: string, from = 0) => quiet.findIndex((l, i) => i >= from && l.includes(`You have entered ${name}`))
  const strand = entered('Strand')
  await overlay.log(WHISPER)
  await overlay.log(quiet.slice(0, strand + 1))

  await rightClickIcon(overlay, fakeApp, 'trade')
  await overlay.dockIcon('trade').getByRole('menuitem', { name: 'This map', exact: true }).click()
  await expect(overlay.dockIcon('trade')).toHaveCount(0)
  await expect(overlay.page.getByRole('status').filter({ hasText: 'Trades dismissed for this map' })).toBeVisible()

  // Out to the hideout and back into the same map, then out again.
  const strandAgain = entered('Strand', strand + 1)
  const hideoutAgain = entered('Luxurious Hideout', strandAgain)
  await overlay.log(quiet.slice(strand + 1, hideoutAgain + 1))
  await expect(overlay.dockIcon('trade')).toHaveCount(0)

  // A different map.
  await overlay.log(quiet.slice(hideoutAgain + 1, entered('Cemetery') + 1))
  await expect(overlay.dockIcon('trade')).toBeVisible()
})

test('a new offer brings a dismissed icon back, but not one dismissed for good', async ({ overlay, fakeApp }) => {
  // The page's clock, so the start-up wait below takes no real time.
  await overlay.page.clock.install()
  await overlay.boot({ widgets: [TRADE, { wmType: 'woke-mechanics' }] })
  await overlay.log(WHISPER)
  // Offers read at start-up don't count, so past that first.
  await overlay.page.clock.fastForward(21_000)

  await rightClickIcon(overlay, fakeApp, 'trade')
  await overlay.dockIcon('trade').getByRole('menuitem', { name: 'Today' }).click()
  await expect(overlay.dockIcon('trade')).toHaveCount(0)
  await overlay.log(WHISPER2)
  await expect(overlay.dockIcon('trade')).toBeVisible()

  await rightClickIcon(overlay, fakeApp, 'trade')
  await overlay.dockIcon('trade').getByRole('menuitem', { name: 'Always' }).click()
  await expect(overlay.dockIcon('trade')).toHaveCount(0)
  await overlay.log(WHISPER3)
  await overlay.page.waitForTimeout(200)
  await expect(overlay.dockIcon('trade')).toHaveCount(0)
})

test('a click on a menu row leaves no card behind', async ({ overlay, fakeApp }) => {
  await overlay.boot({ widgets: [TRADE, { wmType: 'woke-mechanics' }] })
  await overlay.log(WHISPER)
  await rightClickIcon(overlay, fakeApp, 'trade')
  const row = overlay.dockIcon('trade').getByRole('menuitem', { name: 'Sound on new offers' })
  const box = await row.boundingBox()
  // Across the gap, onto the row, long enough for the card's hover delay.
  await overlay.moveMouse(1000, 900)
  await overlay.moveMouse(Math.round(box!.x + 20), Math.round(box!.y + 5))
  await overlay.page.waitForTimeout(300)
  await row.click()
  await overlay.page.waitForTimeout(300)
  await expect(overlay.dockIcon('trade').locator('[data-dock-menu]')).toHaveCount(0)
  // The offer's row, not the name: the bubble keeps naming the buyer.
  await expect(overlay.dockIcon('trade').locator('[data-offer]')).toHaveCount(0)
})

test('undoing one dismissal leaves another alone', async ({ overlay, fakeApp }) => {
  await overlay.boot({ widgets: [TRADE, { wmType: 'woke-mechanics' }] })
  await overlay.log(WHISPER)
  await overlay.log(hideout)
  await rightClickIcon(overlay, fakeApp, 'trade')
  await overlay.dockIcon('trade').getByRole('menuitem', { name: '30 min' }).click()
  const first = overlay.page.getByRole('status').filter({ hasText: 'Trades dismissed' })
  await expect(first).toBeVisible()
  // The game gets focus back once the icon has gone.
  await overlay.moveMouse(1000, 900)
  fakeApp.focusGame(true)
  await overlay.page.waitForTimeout(100)
  await rightClickIcon(overlay, fakeApp, 'regex-library')
  await overlay.dockIcon('regex-library').getByRole('menuitem', { name: '30 min' }).click()
  await expect(overlay.dockIcon('regex-library')).toHaveCount(0)
  await first.getByRole('button', { name: 'Undo' }).click()
  await expect(overlay.dockIcon('trade')).toBeVisible()
  await expect(overlay.dockIcon('regex-library')).toHaveCount(0)
})

test('dismissed for 30 minutes: the note can undo it, and it survives a restart', async ({ overlay, fakeApp }) => {
  await bootInHideout(overlay)
  await rightClickIcon(overlay, fakeApp, 'regex-library')
  await overlay.dockIcon('regex-library').getByRole('menuitem', { name: '30 min' }).click()
  await expect(overlay.dockIcon('regex-library')).toHaveCount(0)
  const note = overlay.page.getByRole('status').filter({ hasText: 'Regex library dismissed for 30 minutes' })
  await expect(note).toBeVisible()
  await note.getByRole('button', { name: 'Undo' }).click()
  await expect(overlay.dockIcon('regex-library')).toBeVisible()

  await rightClickIcon(overlay, fakeApp, 'regex-library')
  await overlay.dockIcon('regex-library').getByRole('menuitem', { name: '30 min' }).click()
  await expect(overlay.dockIcon('regex-library')).toHaveCount(0)
  await expect.poll(() => fakeApp.readConfig()?.woke?.dock?.dismissed?.['regex-library'] ?? 0).toBeGreaterThan(Date.now())
})

test('the grip brings a dismissed icon back, with the overlay open', async ({ overlay, fakeApp }) => {
  await bootInHideout(overlay)
  await rightClickIcon(overlay, fakeApp, 'regex-library')
  await overlay.dockIcon('regex-library').getByRole('menuitem', { name: 'Always' }).click()
  await expect(overlay.dockIcon('regex-library')).toHaveCount(0)
  await expect.poll(() => fakeApp.readConfig()?.woke?.dock?.hidden ?? []).toContain('regex-library')

  // Hotkeys are off while a clicked card holds the keyboard: leave it first.
  await overlay.moveMouse(1000, 900)
  await expect.poll(() => fakeApp.registeredHotkeys().length).toBeGreaterThan(0)
  await overlay.pressHotkey(overlay.config.overlayKey)
  await overlay.page.locator('[title^="Drag to move the icon row"]').click({ button: 'right' })
  await overlay.page.getByRole('menuitem', { name: 'Regex library · always' }).click()
  await expect(overlay.dockIcon('regex-library')).toBeVisible()
})

test('turning off the module from its icon can be undone', async ({ overlay, fakeApp }) => {
  await bootInHideout(overlay)
  await rightClickIcon(overlay, fakeApp, 'regex-library')
  await overlay.dockIcon('regex-library').getByRole('menuitem', { name: 'Turn off Regex library' }).click()
  await expect(overlay.dockIcon('regex-library')).toHaveCount(0)
  await expect.poll(() => fakeApp.readConfig()?.woke?.off ?? []).toContain('regex-library')
  const note = overlay.page.getByRole('status').filter({ hasText: 'Regex library turned off' })
  await note.getByRole('button', { name: 'Undo' }).click()
  await expect(overlay.dockIcon('regex-library')).toBeVisible()
})

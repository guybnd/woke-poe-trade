// An opened lab layout leaves the screen with the overlay and stays as a dock
// icon whose card shows the map.
import { test, expect } from './harness'
import type { Overlay } from './harness'

const IMG = 'https://www.poelab.com/wp-content/labfiles/normal.jpg'
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==', 'base64')
const area = (id: string, level: number) => `2026/11/05 20:49:09 18884906 1186a8a3 [DEBUG Client 34092] Generating level ${level} area "${id}" with seed 1`
const SLOW = { timeout: 20_000 }

const LAB = {
  wmType: 'woke-lab',
  wmTitle: 'Labyrinth',
  wmWants: 'show' as const,
  wmFlags: ['invisible-on-blur'],
  anchor: { pos: 'tl', x: 10, y: 10 },
  urls: { normal: '', cruel: '', merciless: '', uber: '' },
  defaultDifficulty: 'normal',
  hotkeyOverlay: 'Ctrl + Alt + L',
  hotkeyExternal: null,
  notes: ''
}

async function boot (overlay: Overlay, overlayActive: boolean) {
  await overlay.page.route(IMG, route => route.fulfill({ contentType: 'image/png', body: PIXEL }))
  return await overlay.boot({ overlayActive, widgets: [LAB] })
}

// The test browser has no <webview>: answer as poelab's page would.
async function pageLoaded (overlay: Overlay) {
  await overlay.page.locator('webview').evaluate((el, src) => {
    (el as unknown as { executeJavaScript: () => Promise<string> }).executeJavaScript = async () => src
    el.dispatchEvent(new Event('did-stop-loading'))
  }, IMG)
}

async function openNormal (overlay: Overlay) {
  await overlay.widget('woke-lab').getByText('Normal', { exact: true }).click()
  await pageLoaded(overlay)
  await expect(overlay.widget('woke-lab').getByText('Normal Labyrinth')).toBeVisible()
}

test('Lab layout: goes with the overlay, comes back with it, and leaves a map on hover', async ({ overlay }) => {
  const { overlayKey } = await boot(overlay, true)
  await expect(overlay.dockIcon('lab')).toHaveCount(0)
  await openNormal(overlay)

  overlay.app.focusGame(true)
  await expect(overlay.widget('woke-lab')).toBeHidden()
  await expect(overlay.dockIcon('lab')).toContainText('N')
  await overlay.snap('playing: only the icon')

  const map = overlay.page.locator(`[data-dock="lab"] img[src="${IMG}"]`)
  await expect(async () => {
    await overlay.hoverDockIcon('lab')
    await expect(map).toBeVisible({ timeout: 2000 })
  }).toPass(SLOW)
  await expect(overlay.page.locator('[data-dock="lab"]')).toContainText('Normal Labyrinth')
  await overlay.snap('playing: map on hover')
  await overlay.moveMouse(1000, 900)
  await expect(map).toHaveCount(0)

  await overlay.pressHotkey(overlayKey)
  await expect(overlay.widget('woke-lab').getByText('Normal Labyrinth')).toBeVisible()

  // Closing the layout ends the icon.
  await overlay.widget('woke-lab').locator('[title="Close"]').click()
  await expect(overlay.dockIcon('lab')).toHaveCount(0)
})

// A reloaded overlay (and the next test on this worker) reuses zone ids, and main
// remembers the mouse was inside them: it has to say so, as the mouse won't re-enter.
test('Lab layout: a new page knows the mouse is already on the icon', async ({ overlay }) => {
  await boot(overlay, true)
  await openNormal(overlay)
  overlay.app.focusGame(true)
  await overlay.hoverDockIcon('lab')
  const map = overlay.page.locator(`[data-dock="lab"] img[src="${IMG}"]`)
  await expect(map).toBeVisible()

  await boot(overlay, true)
  await openNormal(overlay)
  overlay.app.focusGame(true)
  await expect(overlay.dockIcon('lab')).toBeVisible()
  await overlay.hoverDockIcon('lab')
  await expect(map).toBeVisible()
})

test('Lab layout: the hotkey holds the card open in play, and never opens the window', async ({ overlay }) => {
  await boot(overlay, false)
  await overlay.pressHotkey(LAB.hotkeyOverlay)
  await expect(overlay.dockIcon('lab')).toContainText('Labyrinth')
  await expect(overlay.widget('woke-lab')).toBeHidden()

  await overlay.pressHotkey(LAB.hotkeyOverlay)
  await expect(overlay.dockIcon('lab')).toHaveCount(0)
})

test('Lab layout: leaving the lab ends the icon', async ({ overlay }) => {
  await boot(overlay, true)
  await openNormal(overlay)
  overlay.app.focusGame(true)
  await overlay.log([area('Labyrinth_Airlock', 33)])
  await expect(overlay.dockIcon('lab')).toBeVisible(SLOW)
  await overlay.log([area('HideoutFelled', 60)])
  await expect(overlay.dockIcon('lab')).toHaveCount(0, SLOW)
})

test('Lab layout: the first room corrects the difficulty, because every plaza logs level 33', async ({ overlay }) => {
  await boot(overlay, false)
  await overlay.log([area('Labyrinth_Airlock', 33)])
  await expect(overlay.dockIcon('lab')).toContainText('N', SLOW)
  await overlay.log([area('EndGame_Labyrinth_estate_passage', 75)])
  await expect(overlay.dockIcon('lab')).toContainText('U', SLOW)
})

test('Lab layout: with the icon switched off, the hotkey still opens and closes the layout', async ({ overlay }) => {
  await overlay.page.route(IMG, route => route.fulfill({ contentType: 'image/png', body: PIXEL }))
  const { overlayKey } = await overlay.boot({
    widgets: [{ ...LAB, wmWants: 'hide' }],
    patch: (config) => { config.woke.dock = { x: 35, y: 1.2, vertical: false, peeks: true, noPeek: [], hidden: ['lab'] } }
  })
  await overlay.pressHotkey(LAB.hotkeyOverlay)
  await expect(overlay.widget('woke-lab')).toBeHidden()
  await overlay.pressHotkey(overlayKey)
  await expect(overlay.widget('woke-lab').getByText('Normal Labyrinth')).toBeVisible()
  overlay.app.focusGame(true)
  await overlay.pressHotkey(LAB.hotkeyOverlay)
  await overlay.pressHotkey(overlayKey)
  await expect(overlay.widget('woke-lab')).toBeHidden()
})

test('Lab layout: the plaza guesses the lab you ran last, and its card lets you pick another', async ({ overlay }) => {
  await boot(overlay, false)
  overlay.app.focusGame(true)
  await overlay.log([area('Labyrinth_Airlock', 33)])
  await overlay.log([area('EndGame_Labyrinth_estate_passage', 75)])
  await expect(overlay.dockIcon('lab')).toContainText('U')
  await overlay.log([area('HideoutFelled', 60)])
  await expect(overlay.dockIcon('lab')).toHaveCount(0)

  // Back in a plaza: Uber, the last lab run, not the default Normal.
  await overlay.log([area('Labyrinth_Airlock', 33)])
  await expect(overlay.dockIcon('lab')).toContainText('U', SLOW)
  await expect(async () => {
    await overlay.hoverDockIcon('lab')
    await expect(overlay.page.locator('[data-dock="lab"]').getByText('your last lab')).toBeVisible({ timeout: 2000 })
  }).toPass(SLOW)
  await overlay.page.locator('[data-dock="lab"]').getByText('Merciless', { exact: true }).click()
  await expect(overlay.dockIcon('lab')).toContainText('M')
  await expect.poll(() => overlay.savedWidget('woke-lab')?.lastDifficulty).toBe('merciless')
})

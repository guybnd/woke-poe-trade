// Map scan lives in Map mods (WOKEPOET-458): the scan box in the Maps tab,
// its list (hover and click), the dock icon, the keys moved over from the old
// Map scan window, and Ctrl+Space finding it. Readings are sent as main sends
// them, so no OCR files are needed (map-scan.spec.ts reads real screenshots).
import { test, expect } from './harness'
import type { Overlay } from './harness'

test.describe.configure({ mode: 'parallel' })

function scanEvent (overlay: Overlay, data: Record<string, unknown>) {
  overlay.app.sendToOverlay({ name: 'MAIN->CLIENT::woke-event', payload: { topic: 'map-scan', data } } as never)
}

async function bootWithReadings (overlay: Overlay) {
  await overlay.boot({ overlayActive: true, titleTips: true, widgets: [{ wmType: 'woke-map-mods', wmWants: 'show' }] })
  const box = overlay.widget('woke-map-mods').getByTestId('map-scan-box')
  await expect(box).toBeVisible()
  scanEvent(overlay, { type: 'state', running: true })
  // Max res down: careful in the default profile. Then a clean map elsewhere.
  scanEvent(overlay, { type: 'reading', reading: { lines: ['Map Tier: 16', 'Players have -12% to all maximum Resistances'], at: { x: 0.3, y: 0.5 } } })
  scanEvent(overlay, { type: 'reading', reading: { lines: ['Map Tier: 16', 'Item Quantity: +80%'], at: { x: 0.6, y: 0.5 } } })
  await expect(box).toContainText('2 scanned')
  return box
}

test('the scan box lists scanned maps, each with a hover card of what decided it', async ({ overlay }) => {
  const box = await bootWithReadings(overlay)
  const rows = box.getByTestId('map-scan-entry')
  await expect(rows).toHaveCount(2)
  // Newest first.
  await expect(rows.nth(0)).toContainText('T16 map')
  await expect(rows.nth(1)).toContainText('Risky')
  await expect(box.getByTestId('map-scan-tally')).toContainText('1safe')
  await expect(box.getByTestId('map-scan-tally')).toContainText('1risky')

  await rows.nth(1).hover()
  const card = overlay.page.getByRole('tooltip')
  await expect(card).toContainText('Players have -12% to all maximum Resistances')
  await expect(card).toContainText('Careful')
  await rows.nth(0).hover()
  await expect(card).toContainText('No rated mods')
  await overlay.snap('map mods scan box with two maps')

  // The on-screen badge shows the latest reading.
  await expect(overlay.page.getByTestId('map-scan-badge')).toBeVisible()
})

test('clearing the scan list can be undone', async ({ overlay }) => {
  const box = await bootWithReadings(overlay)
  await box.getByTitle('Clear the scan list. You can undo.').click()
  await expect(box.getByTestId('map-scan-entry')).toHaveCount(0)
  await overlay.page.getByRole('button', { name: 'Undo' }).click()
  await expect(box.getByTestId('map-scan-entry')).toHaveCount(2)
})

test('the Scan button starts main\'s scanner and Stop ends it', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-map-mods', wmWants: 'show' }] })
  const box = overlay.widget('woke-map-mods').getByTestId('map-scan-box')
  overlay.app.clearReceived()
  await box.getByRole('button', { name: 'Scan', exact: true }).click()
  await expect(box.getByRole('button', { name: 'Stop', exact: true })).toBeVisible()
  await box.getByRole('button', { name: 'Stop', exact: true }).click()
  await expect(box.getByRole('button', { name: 'Scan', exact: true })).toBeVisible()
})

test('the scan box is on the Maps tab only', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-map-mods', wmWants: 'show' }] })
  const panel = overlay.widget('woke-map-mods')
  await expect(panel.getByTestId('map-scan-box')).toBeVisible()
  await panel.getByRole('tab', { name: /Heist/ }).click()
  await expect(panel.getByTestId('map-scan-box')).toHaveCount(0)
})

test('a new Map mods window registers the scan keys; Ctrl+Space finds map scan in Map mods', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods' }] })
  await expect.poll(() => overlay.app.registeredHotkeys()).toContain('Alt+S')
  expect(overlay.app.registeredHotkeys()).toContain('Alt+R')

  await overlay.pressHotkey('Ctrl + Space')
  const palette = overlay.widget('woke-search')
  const input = palette.getByRole('textbox', { name: 'Search', exact: true })
  await input.fill('map scan')
  await expect(palette.getByRole('button', { name: /Map mods/ }).first()).toBeVisible()
  await expect(palette.getByRole('button', { name: /Map scan on or off/ })).toBeVisible()
  await expect(palette.getByRole('button', { name: /Map scan: rolling mode/ })).toBeVisible()
})

test('an old Map scan window: its keys move to Map mods and it is gone from the overlay', async ({ overlay }) => {
  await overlay.boot({
    widgets: [
      { wmType: 'woke-map-scan', wmFlags: ['invisible-on-blur'], hotkey: 'Alt + Q', rollHotkey: null, alertOnPass: false, anchor: { pos: 'tr', x: 98, y: 12 } },
      { wmType: 'woke-map-mods' }
    ],
    // Before the merge.
    patch: (config) => { config.woke.version = 3 }
  })
  await expect.poll(() => overlay.app.registeredHotkeys()).toContain('Alt+Q')
  expect(overlay.app.registeredHotkeys()).not.toContain('Alt+S')
  expect(overlay.app.registeredHotkeys()).not.toContain('Alt+R')
  await expect(overlay.widget('woke-map-scan')).not.toBeAttached()
  await expect.poll(() => overlay.app.readConfig()?.widgets.find((w: { wmType: string }) => w.wmType === 'woke-map-mods')?.scanAlertOnPass).toBe(false)
})

test('a switched-off Map scan moves no keys', async ({ overlay }) => {
  await overlay.boot({
    widgets: [
      { wmType: 'woke-map-scan', wmFlags: ['invisible-on-blur'], hotkey: 'Alt + S', rollHotkey: 'Alt + R', alertOnPass: true },
      { wmType: 'woke-map-mods', wmFlags: ['invisible-on-blur'], profiles: [], activeProfile: 1, weights: {}, hotkey: 'Alt + M' }
    ],
    off: ['map-scan'],
    patch: (config) => { config.woke.version = 3 }
  })
  await expect.poll(() => overlay.app.registeredHotkeys()).toContain('Alt+M')
  expect(overlay.app.registeredHotkeys()).not.toContain('Alt+S')
  expect(overlay.app.registeredHotkeys()).not.toContain('Alt+R')
})

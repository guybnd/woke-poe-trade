// Map scan (OCR): the scan hotkey starts main's screen scanner, which
// screenshots the fake game, reads the tooltip under the cursor with the real
// vision worker (opencv + tesseract), and Map mods shows a verdict badge.
//
// Needs the OCR files (`npm run get:ocr`); skipped without them.
import fs from 'fs'
import path from 'path'
import type { Locator } from '@playwright/test'
import { test, expect, FIXTURES, haveOcr } from './harness'

test.skip(!haveOcr, 'OCR files missing: npm run get:ocr')

function screen (name: string): { cursor: { x: number, y: number } } {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, `screens/${name}.json`), 'utf8'))
}

// The screens are 2560x1440, the test page 1920x1080.
async function expectAt (marker: Locator, cursor: { x: number, y: number }) {
  const box = (await marker.boundingBox())!
  expect(Math.abs(box.x + box.width / 2 - cursor.x * 0.75)).toBeLessThan(3)
  expect(Math.abs(box.y + box.height / 2 - cursor.y * 0.75)).toBeLessThan(3)
}

test('Alt+S scans the hovered map: a map with max res down gets Risky with its flagged mods', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods' }] })
  // Real screenshot: Players have -20% to all maximum Resistances, cursed
  // with Temporal Chains and Enfeeble.
  await overlay.showScreen('screens/map-real-07.png')
  const { cursor } = screen('map-real-07')
  await overlay.moveMouse(cursor.x, cursor.y)
  await overlay.pressHotkey('Alt + S')

  const badge = overlay.page.locator('[class*="badge"]').first()
  await expect(badge).toBeVisible({ timeout: 20_000 })
  await expect(badge).toContainText('Risky')
  await expect(badge).toContainText(/maximum Resistances|max res/i)
  await overlay.snap('map scan badge on a max res map')

  // The same hotkey stops scanning, and the badge goes away.
  await overlay.pressHotkey('Alt + S')
  await expect(badge).toBeHidden()
})

test('map scan: a clean map gets a verdict, and moving off it reads nothing new', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods', wmWants: 'show' }] })
  await overlay.showScreen('screens/map-real-09.png')
  const { cursor } = screen('map-real-09')
  await overlay.moveMouse(cursor.x, cursor.y)
  await overlay.pressHotkey('Alt + S')

  // Map mods' Scan tab counts the maps read (the window hides while the game has focus).
  const scanTab = overlay.widget('woke-map-mods').getByRole('tab', { name: /Scan/, includeHidden: true })
  await expect(scanTab).toHaveText(/Scan\s*1$/, { timeout: 20_000 })
  await overlay.snap('map mods scan tab after one map')
  // Off the tooltip: still one reading.
  await overlay.moveMouse(2300, 1300)
  await overlay.page.waitForTimeout(1500)
  await expect(scanTab).toHaveText(/Scan\s*1$/)
  // The fake app outlives the page: leave the scanner off for the next test.
  await overlay.pressHotkey('Alt + S')
})

// The badge and marker follow the real cursor, even when it got to the map with
// a mouse button held (the global mouse hook reports no moves then).
test('map scan: the marker sits on the map when the cursor was dragged there', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods' }] })
  await overlay.showScreen('screens/map-real-07.png')
  const { cursor } = screen('map-real-07')
  await overlay.moveMouse(2300, 1300)
  await overlay.pressHotkey('Alt + S')
  await overlay.dragMouse(cursor.x, cursor.y)

  const marker = overlay.page.locator('[class*="marker"]').first()
  await expect(marker).toBeVisible({ timeout: 20_000 })
  await expectAt(marker, cursor)
  await overlay.pressHotkey('Alt + S')
})

// Rolling: moving on to another map (or another stash tab) finds its tooltip
// instead of watching the box locked on the first one.
test('rolling mode follows the cursor to another map', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods', wmWants: 'show' }] })
  await overlay.showScreen('screens/map-real-07.png')
  const first = screen('map-real-07').cursor
  await overlay.moveMouse(first.x, first.y)
  await overlay.pressHotkey('Alt + R')
  const scanTab = overlay.widget('woke-map-mods').getByRole('tab', { name: /Scan/, includeHidden: true })
  await expect(scanTab).toHaveText(/Scan\s*1$/, { timeout: 20_000 })

  await overlay.showScreen('screens/map-real-09.png')
  const second = screen('map-real-09').cursor
  await overlay.moveMouse(second.x, second.y)
  await expect(scanTab).toHaveText(/Scan\s*2$/, { timeout: 20_000 })
  await expectAt(overlay.page.locator('[class*="marker"]').last(), second)
  await overlay.pressHotkey('Alt + S')
})

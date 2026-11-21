// Records the browser demo (docs/demo): the overlay talking to the real app
// on the fake game, for each thing the demo lets you do. The demo replays
// what the app sent for each hotkey, answers the overlay's requests from what
// it answered here, and serves trade and poe.ninja responses from
// fixtures/http. Not part of the normal run; record again after the app's
// messages change:
//
//   WOKE_DEMO_RECORD=1 npx playwright test demo-record
//
// Writes docs/public/demo/recording.json.
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { test, expect, FIXTURES, haveOcr, logFixture } from './harness'
import type { Overlay } from './harness'

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/public/demo/recording.json')

test.skip(!process.env.WOKE_DEMO_RECORD, 'Set WOKE_DEMO_RECORD=1 to record the browser demo')

interface Rec { dir: 'in' | 'out', name: string, payload: unknown }

// The demo's tools: the rail of a player who maps, plus the scanners.
const WIDGETS = [
  'woke-market-tracker', 'woke-session-analytics', 'woke-map-mods', 'woke-map-scan', 'woke-essence-scan',
  'woke-atlas-strategies', 'woke-mechanics', 'woke-lab', 'woke-lab-gems', 'woke-scarab-flip', 'woke-trade', 'woke-regex-library', 'woke-trade-searches',
  'woke-boss-runs', 'woke-campaign', 'woke-run-timer'
]

// The fake app stamps each line with the time it's written.
const stamp = (l: string) => l.replace(/^.*?\] /, '')
// Where the demo's scenes are, as Client.txt says so. The overlay's icon row
// shows what fits the zone.
const SCENES: Record<string, string[]> = {
  'zone-map': [
    'Generating level 83 area "MapWorldsJungleValley" with seed 3912385001',
    ': You have entered Jungle Valley.'
  ],
  'zone-hideout': logFixture('client-logs/trade-hideout.txt').slice(1, 7).map(stamp),
  'zone-boss': [
    'Generating level 80 area "MapAtziri2" with seed 3345257283',
    ': You have entered The Alluring Abyss.'
  ],
  'zone-campaign': logFixture('client-logs/campaign-act1.txt')
    .filter(l => /Generating level|You have entered|is now level/.test(l)).slice(0, 18).map(stamp)
}

function cursorOf (screen: string): { x: number, y: number } {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, `screens/${screen}.json`), 'utf8')).cursor
}

async function drain (overlay: Overlay): Promise<Rec[]> {
  await overlay.page.waitForTimeout(600)
  return await overlay.page.evaluate(() => {
    const w = window as unknown as { __rec: Rec[] }
    return w.__rec.splice(0)
  })
}

test('record the demo', async ({ overlay, fakeApp }) => {
  test.skip(!haveOcr, 'OCR files missing: npm run get:ocr')
  test.setTimeout(180_000)
  const page = overlay.page
  // Every message on the app's socket, both ways, and the config it served.
  await page.addInitScript(() => {
    const w = window as unknown as { __rec: Rec[], __config: unknown }
    w.__rec = []
    const Native = window.WebSocket
    class Tap extends Native {
      constructor (url: string | URL, protocols?: string | string[]) {
        super(url, protocols)
        this.addEventListener('message', (e) => {
          const ev = JSON.parse(e.data as string)
          w.__rec.push({ dir: 'in', name: ev.name, payload: ev.payload })
        })
      }

      send (data: string) {
        const ev = JSON.parse(data)
        w.__rec.push({ dir: 'out', name: ev.name, payload: ev.payload })
        super.send(data)
      }
    }
    window.WebSocket = Tap
    const nativeFetch = window.fetch.bind(window)
    window.fetch = async (input, init) => {
      const res = await nativeFetch(input, init)
      if (String(input) === '/config') w.__config = await res.clone().json()
      return res
    }
  })

  const filters = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-demo-filters-'))
  fs.copyFileSync(path.join(FIXTURES, 'filters', 'neversink-sample.filter'), path.join(filters, 'NeverSink.filter'))
  const config = await overlay.boot({
    widgets: [
      ...WIDGETS.map(wmType => ({ wmType, anchor: { pos: 'tl', x: 40, y: 30 } })),
      { wmType: 'woke-loot-filter', wmFlags: ['invisible-on-blur'], sampleHotkey: 'Alt + F', editorHotkey: 'Alt + Shift + F', folder: filters, sourceName: 'NeverSink.filter' }
    ],
    patch: (config) => {
      const menu = config.widgets.find((w: { wmType: string }) => w.wmType === 'menu')
      const pinned = ['woke-market-tracker', 'woke-session-analytics', 'woke-boss-runs', 'woke-map-mods', 'woke-essence-scan', 'woke-loot-filter',
        'woke-campaign', 'woke-lab', 'woke-trade', 'woke-regex-library']
      menu.pinned = config.widgets.filter((w: { wmType: string }) => pinned.includes(w.wmType)).map((w: { wmId: number }) => w.wmId)
      menu.dismissed = []
    }
  })
  await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+F')
  // New tools open themselves once, with the overlay; open and close it so
  // the demo starts from a settled layout.
  await overlay.pressHotkey(config.overlayKey)
  await page.waitForTimeout(800)
  fakeApp.focusGame(true)
  await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 10_000 }).toContain('Alt+F')
  const boot = await drain(overlay)
  const served = await page.evaluate(() => (window as unknown as { __config: { contents: string } }).__config)
  // The layout the overlay settled on, so the demo opens like this.
  const settled = fakeApp.lastSavedContents() ?? served.contents

  // Back to the game after an action (the overlay may have taken focus).
  const backToGame = async () => {
    await page.keyboard.press('Escape')
    fakeApp.focusGame(true)
    await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 10_000 }).toContain('Alt+E')
  }
  const actions: Record<string, Rec[]> = {}
  const record = async (name: string, act: () => Promise<void>) => {
    await drain(overlay)
    await act()
    actions[name] = (await drain(overlay)).filter(r => r.dir === 'in')
  }

  // Price checks: the app copies the hovered item and sends its text.
  for (const [name, item] of [['price-unique', 'unique-kaoms-heart'], ['price-rare', 'rare-ring'], ['price-currency', 'currency-divine'], ['price-map', 'map-rare-t16-deadly']]) {
    await record(name, async () => {
      await overlay.copyItem(`items/${item}.txt`)
      await expect(overlay.widget('price-check')).toBeVisible()
    })
    await backToGame()
  }
  await record('filter-card', async () => {
    await overlay.copyItem('items/currency-divine.txt', 'Alt + F')
    await expect(page.getByText('Filter rule for this item')).toBeVisible()
  })
  await backToGame()

  // Scans: the app reads the screen and pushes what it read.
  await overlay.showScreen('screens/essence-real-25.png')
  let cursor = cursorOf('essence-real-25')
  await overlay.moveMouse(cursor.x, cursor.y)
  await record('essence-scan', async () => {
    await overlay.pressHotkey('Alt + E')
    await expect(page.getByText('CORRUPT', { exact: true }).filter({ visible: true })).toBeVisible({ timeout: 20_000 })
  })
  await record('essence-scan-stop', async () => { await overlay.pressHotkey('Alt + E') })
  await backToGame()

  await overlay.showScreen('screens/map-real-07.png')
  cursor = cursorOf('map-real-07')
  await overlay.moveMouse(cursor.x, cursor.y)
  await record('map-scan', async () => {
    await overlay.pressHotkey('Alt + S')
    await expect(page.locator('[class*="badge"]').first()).toContainText('Risky', { timeout: 20_000 })
  })
  await record('map-scan-stop', async () => { await overlay.pressHotkey('Alt + S') })

  // Scenes: what the app sends as the game writes Client.txt.
  await backToGame()
  for (const [name, lines] of Object.entries(SCENES)) {
    await record(name, async () => { await overlay.log(lines) })
  }

  // What the overlay asked the app, with what it answered.
  const all = [...boot, ...Object.values(actions).flat()]
  const requests: Record<string, unknown> = {}
  const asked = new Map<number, string>()
  for (const r of all) {
    const p = r.payload as { id: number, op: string, args: unknown, ok: boolean, data?: unknown, error?: string }
    if (r.name === 'CLIENT->MAIN::woke-request') asked.set(p.id, `${p.op} ${JSON.stringify(p.args)}`)
    if (r.name === 'MAIN->CLIENT::woke-response' && asked.has(p.id)) {
      requests[asked.get(p.id)!] = { ok: p.ok, data: p.data, error: p.error }
    }
  }
  // Responses to requests are answered by the demo itself; drop them from
  // replays, and the app's config echoes, which would undo the visitor's layout.
  const NOT_REPLAYED = ['MAIN->CLIENT::woke-response', 'MAIN->CLIENT::log-entry', 'MAIN->CLIENT::config-changed']
  for (const k of Object.keys(actions)) {
    actions[k] = actions[k].filter(r => !NOT_REPLAYED.includes(r.name))
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify({
    config: { ...served, contents: settled },
    boot: boot.filter(r => r.dir === 'in' && r.name !== 'MAIN->CLIENT::woke-response' && r.name !== 'MAIN->CLIENT::log-entry'),
    actions,
    requests
  }, null, 1) + '\n')
  fs.rmSync(filters, { recursive: true, force: true })
})

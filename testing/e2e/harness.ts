// Test fixtures for the fake game.
//
//   test('...', async ({ overlay, fakeApp }) => {
//     await overlay.boot({ widgets: [{ wmType: 'woke-run-timer', wmWants: 'show' }] })
//     await overlay.replayLog('client-logs/campaign-act1.txt')
//     await expect(overlay.page.getByText('Act 2')).toBeVisible()
//   })
//
// `fakeApp` is the app's main process running on the fake game
// (fake-host/app.ts): hotkeys, Client.txt, screenshots, saved settings.
// `overlay` is the overlay page in Chromium, booted with a given config.
import { test as base, expect } from '@playwright/test'
import type { Page, TestInfo } from '@playwright/test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const FIXTURES = path.resolve(here, '../fixtures')
// APT's OCR files (opencv + tesseract): `npm run get:ocr`.
export const OCR_DIR = process.env.WOKE_OCR_DIR ?? path.resolve(here, '../.cache/cv-ocr')
export const haveOcr = fs.existsSync(path.join(OCR_DIR, 'opencv.js'))
const require = createRequire(import.meta.url)

// Typed loosely: the bundle is built from TypeScript sources at test time.
type FakeAppModule = typeof import('../fake-host/app')
export type FakeApp = Awaited<ReturnType<FakeAppModule['startFakeApp']>>

function loadFakeApp (): FakeAppModule {
  const bundle = path.resolve(here, '../fake-host/dist/fake-app.cjs')
  if (!fs.existsSync(bundle) || !fs.existsSync(path.resolve(here, '../fake-host/dist/index.html'))) {
    throw new Error('Fake app not built: run `npx vite build` in renderer/, then `npm run build:host` in testing/.')
  }
  return require(bundle) as FakeAppModule
}

export function fixtureText (rel: string): string {
  return fs.readFileSync(path.join(FIXTURES, rel), 'utf8').replace(/\r\n/g, '\n')
}

// Client.txt fixture lines, without comments (# ...) and blank lines.
export function logFixture (rel: string): string[] {
  return fixtureText(rel).split('\n').filter(l => l.trim() && !l.startsWith('#'))
}

export interface WidgetSeed {
  wmType: string
  wmWants?: 'show' | 'hide'
  wmFlags?: string[]
  [key: string]: unknown
}

export interface BootOptions {
  // Widgets to place, like adding them from the widget menu. Each one
  // initializes its own defaults on first mount, unless `wmFlags` says
  // otherwise. Extra keys are merged into the widget's config.
  widgets?: WidgetSeed[]
  // Modules switched off (Settings → Modules). Default: all on.
  off?: string[]
  // Show the first-run module setup (default: already done).
  firstRun?: boolean
  // Any other changes to the saved config.
  patch?: (config: any) => void // eslint-disable-line @typescript-eslint/no-explicit-any
  // Start with the overlay active (Shift+Space) instead of the game focused.
  overlayActive?: boolean
  // Client.txt lines written before the app starts (a fixture path or lines),
  // as when you played before opening the toolkit.
  logBefore?: string | string[]
}

let defaultConfigJson: string | null = null

// Page errors that are expected and harmless. Keep this list short and
// explain each entry.
const IGNORED_ERRORS = [
  // APT restarts its poe.ninja download when the league list arrives or a
  // price check asks for fresh prices; the aborted download surfaces as an
  // unhandled rejection.
  /^The user aborted a request\./,
  /^signal is aborted without reason/
]

export class Overlay {
  readonly errors: string[] = []
  // The config the overlay was booted with.
  config: any = null // eslint-disable-line @typescript-eslint/no-explicit-any

  constructor (readonly page: Page, readonly app: FakeApp, private testInfo: TestInfo) {
    page.on('pageerror', (e) => {
      if (IGNORED_ERRORS.some(re => re.test(e.message))) return
      this.errors.push(`${e.message}\n${e.stack ?? ''}`)
    })
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) this.errors.push(m.text()) })
  }

  // The config APT writes on first start (defaults + upgrades), captured once.
  private async defaultConfig (): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!defaultConfigJson) {
      fs.rmSync(this.app.configPath(), { force: true })
      this.app.clearReceived()
      await this.page.goto(this.app.url)
      await this.app.waitForReceived('CLIENT->MAIN::update-host-config', undefined, 20_000)
      // The overlay saves its settings when it loses focus.
      await this.page.evaluate(() => window.dispatchEvent(new Event('blur')))
      const saved = await this.app.waitForReceived('CLIENT->MAIN::save-config')
      defaultConfigJson = saved.contents as string
    }
    return JSON.parse(defaultConfigJson)
  }

  // Starts the overlay with this setup: writes config.json, loads the page
  // and waits until it has connected and sent its hotkeys to the app.
  async boot (opts: BootOptions = {}) {
    const config = await this.defaultConfig()
    config.leagueId = 'Testleague'
    config.woke = { ...(config.woke ?? {}), setupDone: !opts.firstRun, off: opts.off ?? [] }
    let nextId = Math.max(0, ...config.widgets.map((w: { wmId: number }) => w.wmId)) + 1
    for (const seed of opts.widgets ?? []) {
      const { wmType, wmWants, wmFlags, ...rest } = seed
      config.widgets.push({
        wmId: nextId++,
        wmType,
        wmTitle: '',
        wmWants: wmWants ?? 'hide',
        wmZorder: null,
        wmFlags: wmFlags ?? ['uninitialized'],
        ...rest
      })
    }
    opts.patch?.(config)
    // Leave the page that's open (the default config capture, or an earlier
    // boot) first: it can still save its own settings on the way out, which
    // would land over the config written here.
    if (this.page.url() !== 'about:blank') {
      await this.page.goto('about:blank')
      await this.app.settled(300, 5000)
    }
    this.app.writeConfig(config)
    this.app.newClientLog(typeof opts.logBefore === 'string' ? logFixture(opts.logBefore) : opts.logBefore ?? [])
    this.app.clearReceived()
    this.app.game.resetInputLog()
    this.app.focusGame(true)
    await this.page.goto(this.app.url)
    await this.app.waitForReceived('CLIENT->MAIN::update-host-config', undefined, 20_000)
    // Hotkeys register once the game window is attached and focused.
    await expect.poll(() => this.app.registeredHotkeys().length).toBeGreaterThan(0)
    if (opts.overlayActive) await this.pressHotkey(config.overlayKey)
    this.config = config
    return config
  }

  // A placed widget's element, by type (the first one of that type).
  widget (wmType: string) {
    const w = this.config?.widgets.find((w: { wmType: string }) => w.wmType === wmType)
    if (!w) throw new Error(`No ${wmType} widget in the booted config`)
    return this.page.locator(`#widget-${w.wmId}`)
  }

  // A module's icon in the dock (the row of icons shown while you play).
  dockIcon (moduleId: string) {
    return this.page.locator(`[data-dock="${moduleId}"]`)
  }

  // Rests the mouse on a dock icon until its card opens (main's hover
  // tracker sees the mouse; the overlay doesn't get mouse events in game).
  async hoverDockIcon (moduleId: string) {
    const box = await this.dockIcon(moduleId).boundingBox()
    if (!box) throw new Error(`Dock icon ${moduleId} is not on screen`)
    await this.moveMouse(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2))
  }

  // A widget's saved config, as the app last wrote it to config.json.
  savedWidget (wmType: string): any { // eslint-disable-line @typescript-eslint/no-explicit-any
    return this.app.readConfig()?.widgets.find((w: { wmType: string }) => w.wmType === wmType)
  }

  // Appends lines to the game's Client.txt (see fixtures/client-logs) and
  // waits for the app's log watcher to pick them up.
  async log (lines: string[]) {
    this.app.appendClientLog(lines)
    await this.page.waitForTimeout(700)
  }

  async replayLog (fixture: string) {
    await this.log(logFixture(fixture))
  }

  // Hover an item in game and press a hotkey, e.g. price check (Ctrl + D).
  async copyItem (fixture: string, hotkey = 'Ctrl + D') {
    const text = fixture.includes('\n') ? fixture : fixtureText(fixture)
    this.app.hoverItem(text)
    await this.pressHotkey(hotkey)
  }

  // Waits for the hotkey to be registered first: a widget placed at boot
  // sets its default hotkeys on mount, and main registers them a moment later.
  async pressHotkey (shortcut: string) {
    for (let waited = 0; ; waited += 100) {
      try {
        this.app.pressHotkey(shortcut)
        break
      } catch (err) {
        if (waited >= 5000) throw err
        await this.page.waitForTimeout(100)
      }
    }
    await this.page.waitForTimeout(100)
  }

  // Shows a screenshot as the game's screen; also used as the page
  // background, so test screenshots look like the overlay over the game.
  async showScreen (fixture: string) {
    this.app.showScreen(path.join(FIXTURES, fixture))
    await this.page.evaluate((url) => {
      document.documentElement.style.background = `#000 url(${url}) 0 0 / 100% 100% no-repeat`
    }, `/__fake/screen.png?${Date.now()}`)
  }

  // Full-window screenshot, attached to the test report.
  async snap (name: string) {
    const body = await this.page.screenshot()
    await this.testInfo.attach(name, { body, contentType: 'image/png' })
    // WOKE_SNAP_DIR=some/folder keeps every snapshot as a file, to look over.
    const dir = process.env.WOKE_SNAP_DIR
    if (dir) {
      fs.mkdirSync(dir, { recursive: true })
      const slug = (s: string) => s.replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
      fs.writeFileSync(path.join(dir, `${slug(this.testInfo.title)}--${slug(name)}.png`), body)
    }
    return body
  }

  // Moves the mouse in game (the overlay doesn't get mouse events while the
  // game has focus; the app's global mouse hook does).
  async moveMouse (x: number, y: number) {
    this.app.moveMouse(x, y)
    await this.page.waitForTimeout(50)
  }

  // Clicks a dock icon in game, then leaves it straight away, so only the
  // click can have opened its card (the hover delay gets cancelled).
  async clickDockIconAndLeave (moduleId: string) {
    const box = await this.dockIcon(moduleId).boundingBox()
    if (!box) throw new Error(`Dock icon ${moduleId} is not on screen`)
    this.app.pressMouse(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2))
    this.app.moveMouse(1000, 900)
  }
}

export const test = base.extend<{ overlay: Overlay }, { fakeApp: FakeApp }>({
  fakeApp: [async ({}, use, workerInfo) => { // eslint-disable-line no-empty-pattern
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), `woke-e2e-${workerInfo.workerIndex}-`))
    if (haveOcr) {
      fs.cpSync(OCR_DIR, path.join(userData, 'apt-data', 'cv-ocr'), { recursive: true })
    }
    const app = await loadFakeApp().startFakeApp({ userData, httpFixtures: path.join(FIXTURES, 'http') })
    await use(app)
  }, { scope: 'worker' }],

  overlay: async ({ page, fakeApp }, use, testInfo) => {
    await page.route('**/__fake/screen.png*', async (route) => {
      const file = fakeApp.game.screenFile
      if (!file) return await route.fulfill({ status: 404 })
      await route.fulfill({ path: file, contentType: 'image/png' })
    })
    const overlay = new Overlay(page, fakeApp, testInfo)
    await use(overlay)
    const unmocked = fakeApp.unmockedRequests()
    if (unmocked.length) {
      await testInfo.attach('unmocked requests', { body: unmocked.map(r => `${r.method} ${r.url}`).join('\n'), contentType: 'text/plain' })
    }
    fakeApp.requests.length = 0
    expect(overlay.errors, 'errors in the overlay page').toEqual([])
  }
})

export { expect }

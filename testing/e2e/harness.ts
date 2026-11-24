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
import { NEWS } from '../../renderer/src/web/woke/tab-bar/news'
import { test as base, expect } from '@playwright/test'
import type { Page, TestInfo } from '@playwright/test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { installTipAudit, itemNames } from './tip-audit'
import type { TipGap } from './tip-audit'
import { installLayoutAudit, GATED_RULES, gateKey } from './layout-audit'
import type { LayoutIssue } from './layout-audit'
import crypto from 'crypto'

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
  // Leave What's new unseen (tab-bar/news.ts), as after an update. Off by
  // default, so the dock and rail look as they do once it's been read.
  whatsNew?: boolean
  // Any other changes to the saved config.
  patch?: (config: any) => void // eslint-disable-line @typescript-eslint/no-explicit-any
  // Start with the overlay active (Shift+Space) instead of the game focused.
  overlayActive?: boolean
  // Title hovers in the app's card (title-tip.ts). Off by default: it takes a
  // hovered element's title off while the card shows, so getByTitle would miss
  // whatever the mouse rests on. title-tip.spec.ts turns it on.
  titleTips?: boolean
  // Client.txt lines written before the app starts (a fixture path or lines),
  // as when you played before opening the toolkit.
  logBefore?: string | string[]
  // Leave the game mouse and hovered item where they are, for a test about a
  // page that loads under a mouse that doesn't move. Otherwise every boot
  // starts with the mouse in the middle, over nothing.
  keepMouse?: boolean
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
  // The website's shots set this: the price check keeps the app's default layout
  // (Tooltip lines) instead of the Rows layout the other specs check.
  appDefaults = false

  constructor (readonly page: Page, readonly app: FakeApp, private testInfo: TestInfo) {
    page.on('pageerror', (e) => {
      if (IGNORED_ERRORS.some(re => re.test(e.message))) return
      this.errors.push(`${e.message}\n${e.stack ?? ''}`)
    })
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) this.errors.push(m.text()) })
    // Every item named on screen has the item tooltip (tip-audit.ts).
    this.auditReady = page.addInitScript(installTipAudit, itemNames())
    // WOKE_LAYOUT_AUDIT=<folder> records layout faults (layout-audit.ts).
    // WOKE_LAYOUT_GATE fails a test on a new layout fault (layout-baseline.json).
    const layoutDir = process.env.WOKE_LAYOUT_AUDIT
    if (layoutDir || process.env.WOKE_LAYOUT_GATE) {
      this.auditReady = Promise.all([
        this.auditReady,
        page.addInitScript(installLayoutAudit, { marks: !!layoutDir }),
        page.exposeBinding('__wokeLayoutIssue', async (_src, issue: LayoutIssue) => {
          const widget = this.config?.widgets.find((w: { wmId: number }) => `widget-${w.wmId}` === issue.widget)?.wmType ?? issue.widget
          // Only a booted page's: the default-config capture isn't any test's screen.
          if (this.config && GATED_RULES.includes(issue.rule)) this.layoutFaults.push({ key: gateKey(issue.rule, widget, issue.where), text: issue.text, detail: issue.detail })
          if (layoutDir) await this.saveLayoutIssue(layoutDir, issue)
        })
      ])
    }
  }

  private async saveLayoutIssue (dir: string, issue: LayoutIssue) {
    const widget = this.config?.widgets.find((w: { wmId: number }) => `widget-${w.wmId}` === issue.widget)?.wmType ?? issue.widget
    const key = crypto.createHash('sha1').update(`${issue.rule}|${widget}|${issue.where}|${issue.text}`).digest('hex').slice(0, 12)
    const vp = this.page.viewportSize()
    const shots = path.join(dir, 'shots')
    fs.mkdirSync(shots, { recursive: true })
    const shot = path.join(shots, `${key}.png`)
    if (!fs.existsSync(shot)) {
      const f = issue.frame ?? issue.rect
      const pad = 24
      const x = Math.max(0, Math.min(f.x, issue.rect.x) - pad)
      const y = Math.max(0, Math.min(f.y, issue.rect.y) - pad)
      const right = Math.min(vp?.width ?? 1920, Math.max(f.x + f.w, issue.rect.x + issue.rect.w) + pad)
      const bottom = Math.min(vp?.height ?? 1080, Math.max(f.y + f.h, issue.rect.y + issue.rect.h) + pad)
      if (right - x > 4 && bottom - y > 4) {
        await this.page.screenshot({ path: shot, clip: { x, y, width: right - x, height: bottom - y }, animations: 'disabled' }).catch(() => {})
      }
    }
    fs.appendFileSync(path.join(dir, 'issues.jsonl'), JSON.stringify({
      ...issue, widget, key, viewport: vp ? `${vp.width}x${vp.height}` : null,
      textScale: process.env.WOKE_TEXT_SCALE ?? '100', test: this.testInfo.titlePath.join(' › ')
    }) + '\n')
  }

  // Items shown without the item tooltip on hover, since the page last loaded
  // (tip-audit.ts). The harness fails a test that leaves any.
  async tipGaps (): Promise<TipGap[]> {
    if (this.page.isClosed() || this.page.url() === 'about:blank') return this.pastGaps
    const now = await this.page.evaluate(() => {
      const w = window as unknown as { __wokeTipGaps?: TipGap[], __wokeTipAudit?: () => void }
      w.__wokeTipAudit?.()
      return w.__wokeTipGaps ?? []
    }).catch(() => [] as TipGap[])
    const type = (id: string | null) => this.config?.widgets.find((w: { wmId: number }) => `widget-${w.wmId}` === id)?.wmType ?? id
    return [...this.pastGaps, ...now.map(g => ({ ...g, widget: type(g.widget) }))]
  }

  private auditReady: Promise<unknown>

  // Lets the layout audit finish a second look still due and send its faults.
  async settleLayout () {
    if (this.page.isClosed() || this.page.url() === 'about:blank') return
    await this.page.evaluate(() => (window as unknown as { __wokeLayoutSettle?: () => Promise<void> }).__wokeLayoutSettle?.()).catch(() => {})
  }
  // Gated layout faults seen in this test (layout-audit.ts).
  readonly layoutFaults: Array<{ key: string, text: string, detail: string }> = []

  // Gaps from pages a test has since left (a second boot reloads the page).
  private pastGaps: TipGap[] = []

  // The config APT writes on first start (defaults + upgrades), captured once.
  private async defaultConfig (): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!defaultConfigJson) {
      fs.rmSync(this.app.configPath(), { force: true })
      this.app.clearReceived()
      await this.page.goto(this.app.url)
      await this.app.waitForReceived('CLIENT->MAIN::update-host-config', undefined, 20_000)
    // A line written before the watcher is following the file counts as old and
    // is never seen. The extra moment is for watchFile's first look at the file.
    await this.app.logWatcherReady
    await this.page.waitForTimeout(150)
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
    await this.auditReady
    // WOKE_UI_ART=poe1|poe2|simple runs a test in that UI style, to look over each.
    const art = process.env.WOKE_UI_ART
    if (art) await this.page.addInitScript(a => { try { localStorage.setItem('woke.uiArt', a) } catch {} }, art)
    // WOKE_TEXT_SCALE=125 runs a test with Settings > Text size at 125%.
    const textScale = process.env.WOKE_TEXT_SCALE
    if (textScale) await this.page.addInitScript(v => { try { localStorage.setItem('woke.textScale', v) } catch {} }, textScale)
    if (!opts.titleTips) await this.page.addInitScript(() => { (window as unknown as { __wokeNativeTitles?: boolean }).__wokeNativeTitles = true })
    const config = await this.defaultConfig()
    config.leagueId = 'Testleague'
    config.woke = { ...(config.woke ?? {}), setupDone: !opts.firstRun, off: opts.off ?? [] }
    if (!opts.whatsNew) config.woke.seenNews = NEWS.map(n => n.id)
    let nextId = Math.max(0, ...config.widgets.map((w: { wmId: number }) => w.wmId)) + 1
    const seeded: number[] = []
    for (const seed of opts.widgets ?? []) {
      const { wmType, wmWants, wmFlags, ...rest } = seed
      // A widget of a module switched off never mounts (module ids are mostly the type's name).
      if (!opts.off?.includes(wmType.replace(/^woke-/, ''))) seeded.push(nextId)
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
    // The price check's specs check the Standard layout; PoE mode (the default) has its own spec.
    const priceCheck = config.widgets.find((w: { wmType: string }) => w.wmType === 'price-check')
    if (priceCheck && priceCheck.wokeWindowStyle == null && !this.appDefaults) priceCheck.wokeWindowStyle = 'standard'
    opts.patch?.(config)
    // Leave the page that's open (the default config capture, or an earlier
    // boot) first: it can still save its own settings on the way out, which
    // would land over the config written here.
    if (this.page.url() !== 'about:blank') {
      // Only a booted page's: the default-config capture isn't any test's screen.
      this.pastGaps = this.config ? await this.tipGaps() : []
      if (this.config) await this.settleLayout()
      await this.page.goto('about:blank')
      await this.app.settled(300, 5000)
    }
    this.app.writeConfig(config)
    this.app.newClientLog(typeof opts.logBefore === 'string' ? logFixture(opts.logBefore) : opts.logBefore ?? [])
    this.app.clearReceived()
    this.app.game.resetInputLog()
    // The fake app lives for the whole worker, so the mouse is wherever the
    // last test left it, over whatever item it hovered. A dock icon that
    // appears under it opens its card, which then covers what this test clicks
    // (the stack sizes flake), and Ctrl + D finds the old item (the "no item
    // under the mouse" flake). Every test starts as the first one does: the
    // mouse in the middle, over nothing.
    if (!opts.keepMouse) {
      this.app.hoverItem(null)
      this.app.moveMouse(960, 540)
    }
    this.app.focusGame(true)
    // Set before the page loads, so a fault seen while it boots names its widget type.
    this.config = config
    await this.page.goto(this.app.url)
    await this.app.waitForReceived('CLIENT->MAIN::update-host-config', undefined, 20_000)
    // A line written before the watcher is following the file counts as old and
    // is never seen. The extra moment is for watchFile's first look at the file.
    await this.app.logWatcherReady
    await this.page.waitForTimeout(150)
    // Hotkeys register once the game window is attached and focused.
    await expect.poll(() => this.app.registeredHotkeys().length).toBeGreaterThan(0)
    // A placed widget's hotkeys register from the saved config, before its lazy
    // chunk has loaded and it listens; a key pressed in between is lost (the
    // loot filter editor flake, under CI load). Its element appears once it
    // has mounted. Bounded: a widget that renders nothing never shows one.
    for (const id of seeded) {
      await this.page.locator(`#widget-${id}`).waitFor({ state: 'attached', timeout: 15_000 }).catch(() => {})
    }
    if (opts.overlayActive) await this.pressHotkey(config.overlayKey)
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
    // The watcher opens the file a moment after the config arrives, later under
    // load. Bounded: with no module reading the log, it never opens.
    for (let waited = 0; waited < 5000 && !this.app.logFollowed; waited += 50) await this.page.waitForTimeout(50)
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

  async dragMouse (x: number, y: number) {
    this.app.dragMouse(x, y)
    await this.page.waitForTimeout(50)
  }

  // Clicks a dock icon in game, then leaves it straight away, so only the
  // click can have opened its card (the hover delay gets cancelled).
  // A real click: the mouse rests on the icon first, so the overlay takes it.
  async restAndClickDockIcon (moduleId: string) {
    const box = await this.dockIcon(moduleId).boundingBox()
    if (!box) throw new Error(`Dock icon ${moduleId} is not on screen`)
    const [x, y] = [Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2)]
    await this.moveMouse(x, y)
    this.app.pressMouse(x, y)
    this.app.releaseMouse()
    await this.moveMouse(1000, 900)
  }

  async clickDockIconAndLeave (moduleId: string) {
    const box = await this.dockIcon(moduleId).boundingBox()
    if (!box) throw new Error(`Dock icon ${moduleId} is not on screen`)
    this.app.pressMouse(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2))
    this.app.moveMouse(1000, 900)
  }
}

let baseline: Set<string> | undefined
function layoutBaseline () {
  baseline ??= new Set(JSON.parse(fs.readFileSync(path.join(here, 'layout-baseline.json'), 'utf-8')) as string[])
  return baseline
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
    // Guy's rule: an item named on screen shows the item tooltip on hover.
    // Put v-item-tip (or WItemRow) on its row; see tip-audit.ts for the rare
    // name that rightly has none.
    const gaps = (await overlay.tipGaps()).map(g => `${g.name} — in ${g.widget ?? 'the page'}: ${g.where}`)
    expect(gaps, 'items shown without the item tooltip (testing/e2e/tip-audit.ts)').toEqual([])
    // Layout gate: no new text cut off, box out of its window, sideways
    // scrollbar, wrapped button row or text under 11px (layout-audit.ts).
    const gate = process.env.WOKE_LAYOUT_GATE
    if (gate) {
      await overlay.settleLayout()
      const known = layoutBaseline()
      const fresh = [...new Map(overlay.layoutFaults.filter(f => !known.has(f.key)).map(f => [f.key, f])).values()]
      if (gate === 'write') {
        for (const f of fresh) fs.appendFileSync(path.join(here, 'layout-baseline.new'), f.key + '\n')
      } else {
        expect(fresh.map(f => `${f.key}  "${f.text}" (${f.detail})`),
          'new layout faults: fix them, or mark a deliberate one with data-layout-ok="<why>" (testing/e2e/layout-audit.ts)').toEqual([])
      }
    }
  }
})

export { expect }

// The landing page's Profit section (landing-highlights.spec.ts, `profit:`
// tests and the clip-profit clip): a mapper's stash read by Net worth, a week
// of reads on its chart, two hours of Strand maps in the log, a strategy run
// over them, and a day of sales. Everything is made up; none of it is anyone's
// real stash.
//
// The week before today can't be read for real, so after the first real read
// it is written into Net worth's saved docs, ending at that read, and the
// overlay reloads to pick it up. Then a second read lands: the maps used up,
// what dropped came in, and the run's profit goes up.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { expect } from './harness'
import type { FakeApp, Overlay } from './harness'

const LEAGUE = 'Testleague'
const RUN_MS = 115 * 60_000

// Real item art from the app's own item data, so the shots show the game's icons
// (web.poecdn.com: they load where that site does, like the other shots).
// Item icons for the shots, saved from web.poecdn.com as 48px WebP (fixtures/icons/<path>),
// so the pictures look the same wherever they are taken. A missing one is
// listed in icons-missing.txt there.
const ICONS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/icons')
export async function localIcons (overlay: Overlay) {
  await overlay.page.route('https://web.poecdn.com/**', async (route) => {
    const rel = new URL(route.request().url()).pathname
    const file = path.join(ICONS, rel)
    if (fs.existsSync(file)) return await route.fulfill({ path: file, contentType: 'image/webp' })
    // WOKE_SAVE_ICONS=1 (the Website shots workflow, where the site loads):
    // fetch the missing one and keep it, so later runs anywhere have it.
    if (process.env.WOKE_SAVE_ICONS) {
      try {
        const res = await route.fetch()
        if (res.ok()) {
          const body = await res.body()
          fs.mkdirSync(path.dirname(file), { recursive: true })
          fs.writeFileSync(file, body)
          return await route.fulfill({ body, contentType: res.headers()['content-type'] ?? 'image/png' })
        }
      } catch {}
    }
    fs.mkdirSync(ICONS, { recursive: true })
    fs.appendFileSync(path.join(ICONS, 'icons-missing.txt'), route.request().url() + '\n')
    await route.continue()
  })
}

const ITEMS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../renderer/public/data/en/items.ndjson')
let icons: Map<string, string> | null = null
function iconOf (name: string): string {
  if (!icons) {
    icons = new Map()
    for (const line of fs.readFileSync(ITEMS, 'utf8').split('\n')) {
      if (!line) continue
      const it = JSON.parse(line) as { name?: string, icon?: string }
      if (it.name && it.icon && !icons.has(it.name)) icons.set(it.name, it.icon)
    }
  }
  return icons.get(name) ?? ''
}

type Stack = [name: string, count: number, frame: number]
// frameType: 5 currency, 0 normal (maps, fragments, scarabs), 6 cards, 4 gems.
const CURRENCY: Stack[] = [
  ['Divine Orb', 38, 5], ['Chaos Orb', 1450, 5], ['Exalted Orb', 22, 5],
  ['Orb of Annulment', 9, 5], ['Vaal Orb', 140, 5], ['Orb of Alchemy', 260, 5]
]
const DUMP: Stack[] = [
  ['Strand Map', 24, 0], ['Ambush Scarab of Containment', 30, 0], ['Divination Scarab of The Cloister', 4, 0],
  ['Sacrifice at Midnight', 12, 0], ['Deafening Essence of Misery', 18, 5], ['Essence of Horror', 2, 5],
  ['The Doctor', 1, 6], ['Rain of Chaos', 37, 6]
]
// Two hours of Strand: 9 maps (the run's, the tenth is its card) and 18 scarabs
// used up, what dropped came in.
const AFTER: Record<string, number> = {
  'Divine Orb': 41, 'Chaos Orb': 1830, 'Exalted Orb': 25, 'Orb of Annulment': 10, 'Orb of Alchemy': 310,
  'Strand Map': 15, 'Ambush Scarab of Containment': 12, 'Divination Scarab of The Cloister': 6,
  'Deafening Essence of Misery': 26, 'Essence of Horror': 3, 'Rain of Chaos': 46
}

function items (stacks: Stack[], after: boolean, prefix: string) {
  return stacks.map(([name, count, frameType], i) => ({
    id: `${prefix}${i}`,
    w: 1,
    h: 1,
    x: i % 12,
    y: Math.floor(i / 12),
    icon: iconOf(name),
    name: '',
    typeLine: name,
    baseType: name,
    identified: true,
    frameType,
    stackSize: after ? (AFTER[name] ?? count) : count,
    maxStackSize: 5000
  }))
}

function tabList (after: boolean) {
  return JSON.stringify({
    numTabs: 2,
    tabs: [
      { n: 'Currency', i: 0, id: 'aa01', type: 'CurrencyStash', selected: true, colour: { r: 124, g: 84, b: 54 } },
      { n: 'Dump', i: 1, id: 'bb02', type: 'QuadStash', colour: { r: 40, g: 90, b: 140 } }
    ],
    items: items(CURRENCY, after, 'c')
  })
}
const tabDump = (after: boolean) => JSON.stringify({ numTabs: 2, items: items(DUMP, after, 'd') })

// A day of sales from the trade history, newest first.
function sales () {
  const ago = (m: number) => new Date(Date.now() - m * 60_000).toISOString()
  const sale = (m: number, name: string, amount: number, currency: string, frameType: number, more: Record<string, unknown> = {}) =>
    ({ time: ago(m), item_id: `s${m}`, price: { amount, currency }, item: { typeLine: name, baseType: name, frameType, icon: iconOf(name), ...more } })
  return JSON.stringify({
    result: [
      sale(9, 'The Doctor', 5, 'divine', 6),
      sale(31, 'Divination Scarab of The Cloister', 30, 'chaos', 0, { stackSize: 1 }),
      sale(58, 'Essence of Horror', 42, 'chaos', 5),
      sale(96, 'Empower Support', 4, 'divine', 4, { properties: [{ name: 'Level', values: [['4', 0]] }, { name: 'Quality', values: [['+20%', 1]] }] }),
      sale(150, 'Sacrifice at Midnight', 1, 'chaos', 0),
      sale(240, 'Thread of Hope', 150, 'chaos', 3, { name: 'Thread of Hope', typeLine: 'Crimson Jewel', baseType: 'Crimson Jewel', icon: iconOf('Thread of Hope') }),
      sale(420, 'Awakened Multistrike Support', 300, 'chaos', 4, { properties: [{ name: 'Level', values: [['1', 0]] }] }),
      sale(700, 'Kaom\'s Heart', 15, 'chaos', 3, { name: 'Kaom\'s Heart', typeLine: 'Glorious Plate', baseType: 'Glorious Plate', icon: iconOf('Kaom\'s Heart') })
    ]
  })
}

// The log's time format, minutes before now.
function stamp (minutesAgo: number): string {
  const d = new Date(Date.now() - minutesAgo * 60_000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
const area = (ago: number, level: number, id: string, seed: number) =>
  `${stamp(ago)} 3725546 1186a8a3 [DEBUG Client 25552] Generating level ${level} area "${id}" with seed ${seed}`
const entered = (ago: number, name: string) => `${stamp(ago)} 3727812 cffb065b [INFO Client 25552] : You have entered ${name}.`
const slain = (ago: number) => `${stamp(ago)} 3727812 cffb065b [INFO Client 25552] : Tester has been slain.`

// Ten Strand maps over the run's two hours, hideout between; one death. The
// last ends a few minutes ago, so its card is up (a map is saved to the
// history when the next one starts: nine there).
export function mapLog (): string[] {
  const lines: string[] = []
  const times = [8.2, 7.6, 9.1, 7.9, 8.4, 7.4, 8.8, 7.7, 8.0, 7.5]
  let at = 112
  times.forEach((len, i) => {
    lines.push(area(at, 60, 'HideoutArenaSearingExarch', 1), entered(at, 'Searing Hideout'))
    at -= 2.5
    lines.push(area(at, 83, 'MapWorldsStrand', 100 + i), entered(at, 'Strand'))
    if (i === 6) lines.push(slain(at - 2))
    at -= len
  })
  return lines
}
// The way out of the last map, logged apart: a map is saved when the next one
// starts, before this leave compares to it (as map-toast-resize.spec.ts does).
export function lastLeave (): string[] {
  const at = 112 - 10 * 2.5 - [8.2, 7.6, 9.1, 7.9, 8.4, 7.4, 8.8, 7.7, 8.0, 7.5].reduce((a, b) => a + b, 0)
  return [area(at, 60, 'HideoutArenaSearingExarch', 1), entered(at, 'Searing Hideout')]
}

// A clean start: the worker's fake app keeps saved docs between tests.
export function clearDocs (fakeApp: FakeApp) {
  fs.rmSync(path.join(fakeApp.opts.userData, 'woke-docs'), { recursive: true, force: true })
}

export async function showcaseSite (fakeApp: FakeApp) {
  const state = { after: false }
  fakeApp.site.reply = (url) => {
    const u = new URL(url)
    if (u.pathname === '/my-account') return { status: 200, body: '<html><title>View Profile - Path of Exile - Tester#1234</title></html>' }
    if (u.pathname === '/character-window/get-stash-items') return { status: 200, body: u.searchParams.get('tabIndex') === '0' ? tabList(state.after) : tabDump(state.after) }
    if (u.pathname.startsWith('/api/trade/history/')) return { status: 200, body: sales() }
    return null
  }
  return state
}

// Turns the stash reader on and reads both tabs once. Returns the window.
export async function firstRead (overlay: Overlay) {
  await overlay.widget('menu').locator('.fa-cog').click()
  const settings = overlay.widget('settings')
  await settings.getByText('All modules', { exact: true }).first().click()
  // The fake app keeps the reader on from an earlier test in the worker.
  const reader = settings.getByRole('switch', { name: 'Net worth' })
  if (await reader.getAttribute('aria-checked') !== 'true') {
    await reader.click()
    await settings.getByRole('button', { name: 'Turn on' }).click()
  }
  await expect(settings.getByText('Signed in as Tester#1234')).toBeVisible()
  await settings.getByTitle('Close').first().click()
  await expect(settings).toBeHidden()
  await overlay.widget('menu').getByRole('button', { name: 'All tools' }).click()
  await overlay.page.getByRole('button', { name: /Net worth/ }).first().click()
  // The window: asking which tabs to read, or (tabs picked in an earlier test
  // in the worker) on Holdings.
  const win = overlay.page.locator('[id^="widget-"]').filter({ has: overlay.page.getByRole('tab', { name: 'Runs' }).or(overlay.page.getByText('Tabs to read')) })
  await expect(win).toHaveCount(1)
  const id = await win.getAttribute('id')
  const panel = overlay.page.locator(`#${id}`)
  const picker = panel.getByText('Tabs to read')
  if (await picker.waitFor({ timeout: 3000 }).then(() => true, () => false)) {
    await panel.getByRole('checkbox', { name: /Dump/ }).check()
    await panel.getByRole('button', { name: 'Read these tabs' }).click()
  } else {
    await panel.getByRole('button', { name: 'Refresh' }).click({ timeout: 15_000 })
  }
  await expect(panel.getByText('Rain of Chaos').first()).toBeVisible({ timeout: 20_000 })
  return id!
}

interface Point { at: number, chaos: number, divine: number | null, byCategory: Record<string, number>, netChaos: number | null, top: string[] }

// The week before the first read, written into its saved docs: a few reads an
// evening, the stash growing with a bad night in the middle; and the last two
// hours as the run, read every half hour.
export function seedWeek (fakeApp: FakeApp, runName: string) {
  const dir = path.join(fakeApp.opts.userData, 'woke-docs', 'net-worth')
  const ledgerFile = path.join(dir, `${LEAGUE}-ledger.json`)
  const ledger = JSON.parse(fs.readFileSync(ledgerFile, 'utf8')) as { points: Point[], diffs: unknown[], tabChaos: unknown }
  const now = ledger.points[ledger.points.length - 1]
  const share = Object.fromEntries(Object.entries(now.byCategory).map(([k, v]) => [k, v / now.chaos]))
  const at = (chaos: number) => Object.fromEntries(Object.entries(share).map(([k, s]) => [k, Math.round(chaos * s)]))
  // Value as a share of today's, by day: a dip on day 3 (a bad trade night).
  const days = [0.52, 0.58, 0.55, 0.66, 0.74, 0.83, 0.9]
  const points: Point[] = []
  const day0 = new Date(now.at)
  day0.setHours(0, 0, 0, 0)
  let seed = 7
  const noise = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 - 0.5 }
  days.forEach((v, i) => {
    const start = day0.getTime() - (7 - i) * 86_400_000 + 18 * 3_600_000
    const next = i + 1 < days.length ? days[i + 1] : 0.95
    for (let k = 0; k < 6; k++) {
      const f = k / 6
      points.push({ at: start + k * 50 * 60_000, chaos: Math.round(now.chaos * (v + (next - v) * f + noise() * 0.012)), divine: now.divine, byCategory: {}, netChaos: null, top: [] })
    }
  })
  // The run: five reads up to the real one.
  const runStart = now.at - RUN_MS
  const run = [0.95, 0.962, 0.974, 0.988]
  run.forEach((v, k) => points.push({ at: runStart + k * 28 * 60_000, chaos: Math.round(now.chaos * v), divine: now.divine, byCategory: {}, netChaos: null, top: [] }))
  for (const p of points) p.byCategory = at(p.chaos)
  points.push(now)
  for (let i = 1; i < points.length; i++) points[i].netChaos = points[i].chaos - points[i - 1].chaos
  points[points.length - 1].top = ['8 × Rain of Chaos', '2 × Divine Orb', '−4 × Strand Map']
  ledger.points = points
  fs.writeFileSync(ledgerFile, JSON.stringify(ledger))

  // The run, started at the first of its reads, with what those reads saw.
  const icon = iconOf
  const line = (name: string, added: number, removed: number, unit: number) =>
    ({ name, icon: icon(name), added, removed, addedChaos: added * unit, removedChaos: removed * unit })
  const runsDoc = {
    live: {
      id: 'showcase',
      league: LEAGUE,
      name: runName,
      startAt: runStart,
      tally: {
        'Divine Orb': line('Divine Orb', 2, 0, now.divine ?? 180),
        'Rain of Chaos': line('Rain of Chaos', 8, 0, 0.5),
        'Deafening Essence of Misery': line('Deafening Essence of Misery', 5, 0, 6)
      },
      tallyAt: now.at,
      costs: [],
      once: []
    },
    done: [
      { id: 'yday', league: LEAGUE, name: 'Essence farm', startAt: runStart - 26 * 3_600_000, stoppedAt: runStart - 24 * 3_600_000, tally: {}, tallyAt: runStart - 24 * 3_600_000, costs: [], once: [], final: { profitChaos: 1240, maps: 14, perMapChaos: 88.6, perHourChaos: 620 } }
    ]
  }
  fs.writeFileSync(path.join(dir, `${LEAGUE}-runs.json`), JSON.stringify(runsDoc))
}

// After seeding: load the overlay again so Net worth reads its docs, make it
// active and open the window. Returns the window's element id (null when
// `open` is false).
export async function reload (overlay: Overlay, open = true) {
  const { page, app } = overlay
  app.clearReceived()
  app.focusGame(true)
  await page.goto(app.url)
  await app.waitForReceived('CLIENT->MAIN::update-host-config', undefined, 20_000)
  await page.waitForTimeout(300)
  await expect.poll(() => app.registeredHotkeys().length).toBeGreaterThan(0)
  await overlay.pressHotkey(overlay.config.overlayKey)
  return open ? await openNetWorth(overlay) : null
}

export async function openNetWorth (overlay: Overlay) {
  const win = overlay.page.locator('[id^="widget-"]').filter({ has: overlay.page.getByRole('tab', { name: 'Runs' }) })
  if (!await win.count()) {
    await overlay.widget('menu').getByRole('button', { name: 'All tools' }).click()
    await overlay.page.getByRole('button', { name: /Net worth/ }).first().click()
  }
  await expect(win).toHaveCount(1)
  return (await win.getAttribute('id'))!
}

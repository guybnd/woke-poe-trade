// The item tooltip on the market tracker: the rows that started it, on prices
// with a real week of movement.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { test, expect } from './harness'

type Row = [type: string, name: string, variant: string, chaos: number, graph: Array<number | null>, shows: string]

const ROWS: Row[] = [
  ['Essence', 'Shrieking Essence of Loathing', '', 80, [0, -59.5, -59.5, -59.5, -67.52, -69.28, 3140], 'guaranteeing one property'],
  ['DivinationCard', 'A Chilling Wind', '', 75, [0, null, 650, null, 250, -80, 650], 'Level 21 Vaal Cold Snap'],
  ['Tattoo', 'Tattoo of the Hinekora Warmonger', '', 1221, [null, null, null, null, null, 0, 2900], 'Minions have 5% increased maximum Life'],
  ['SkillGem', 'Minion Life Support', '1', 28, [0, 64.71, 8.24, 41.18, 38.24, -87.47, 65.88], '30% more Minion maximum Life'],
  ['Scarab', 'Incursion Scarab of Champions', '', 8.7, [16.13, -12.75, 7.75, 18.5, -0.67, -50.73, 621.8], 'at least Magic'],
  ['UniqueArmour', "Foulborn Kitava's Thirst", 'Life Trigger', 166, [0, -14.89, -14.89, -19.15, -36.17, -36.17, 608.1], 'Armour: 202-247'],
  ['SkillGem', 'Pact of Lycia', '1', 692, [null, 0, -8.33, 0, 16.17, 8.33, 3838], 'Empowers the next 3 Channelling Spells'],
  ['SkillGem', 'Increased Critical Strikes Support', '20/20c', 814, [0, -0.99, -24.63, -23.03, -29.06, 23.15, 903.4], '117% increased Critical Strike Chance']
]

const DENSE = fileURLToPath(new URL('../fixtures/http/poe.ninja/poe1/api/economy/current/dense/overviews.json', import.meta.url))

test('hovering a market row shows the item at the cursor, with its price', async ({ overlay }) => {
  const recorded = fs.readFileSync(DENSE, 'utf8')
  const blocks = ROWS.map(([type, name, variant, chaos, graph]) =>
    `{"type":"${type}","lines":[${JSON.stringify({ name, ...(variant ? { variant } : {}), chaos, graph })}]}`)
  await overlay.page.route('**/dense/overviews*', (route) => route.fulfill({
    contentType: 'application/json',
    body: recorded.replace(/\[\s*\{"type":"/, () => `[${blocks.join(',')},{"type":"`)
  }))

  await overlay.boot({
    overlayActive: true,
    patch: (config) => {
      config.widgets.push({
        wmId: 9001,
        wmType: 'woke-market-tracker',
        wmTitle: 'Market tracker',
        wmWants: 'show',
        wmZorder: 200,
        wmFlags: [],
        anchor: { pos: 'tl', x: 15, y: 15 },
        view: 'watchlist',
        period: '24h',
        minChaos: 5,
        typeFilter: '',
        watchlist: ROWS.map(([type, name, variant]) => ({ type, name, variant }))
      })
    }
  })
  const panel = overlay.widget('woke-market-tracker')
  const tip = overlay.page.getByRole('tooltip')
  await expect(panel.getByText('Minion Life Support')).toBeVisible()

  for (const [, name, , , , shows] of ROWS) {
    const row = panel.locator('.w-row', { hasText: name })
    await row.hover()
    await expect(tip).toContainText(name)
    await expect(tip).toContainText(shows)
    // Beside the cursor, and it follows.
    const r = (await row.boundingBox())!
    const near = async (x: number, y: number) => {
      await overlay.page.mouse.move(x, y)
      const t = (await tip.boundingBox())!
      expect(t.x).toBeCloseTo(x + 16, -1)
      expect(t.y).toBeCloseTo(y + 16, -1)
    }
    await near(r.x + 60, r.y + r.height / 2)
    await near(r.x + 200, r.y + r.height / 2)
    await overlay.snap(`tip ${name}`)
    await overlay.page.mouse.move(1800, 1000)
    await expect(tip).toHaveCount(0)
  }

  // The first hover asked for prices; once in, every tooltip has its strip.
  await expect(async () => {
    await panel.locator('.w-row', { hasText: 'Pact of Lycia' }).hover()
    await expect(tip).toContainText('7 days', { timeout: 500 })
  }).toPass()
  await expect(tip).toContainText('+3838%')
  await overlay.snap('with price strip')

  // At the screen's edge it flips to stay on screen.
  await overlay.page.mouse.move(1800, 1000)
  const box = (await panel.locator('.w-row', { hasText: 'Pact of Lycia' }).boundingBox())!
  const size = { width: Math.round(box.x + 300), height: Math.round(box.y + 60) }
  await overlay.page.setViewportSize(size)
  await panel.locator('.w-row', { hasText: 'Pact of Lycia' }).hover()
  await expect(tip).toContainText('Pact of Lycia')
  const flipped = (await tip.boundingBox())!
  expect(flipped.x + flipped.width).toBeLessThanOrEqual(size.width)
  expect(flipped.x).toBeGreaterThanOrEqual(0)
  expect(flipped.y + flipped.height).toBeLessThanOrEqual(size.height)
  await overlay.page.setViewportSize({ width: 1920, height: 1080 })

  // It stays out of the way of the right-click menu.
  await panel.locator('.w-row', { hasText: 'Pact of Lycia' }).click({ button: 'right' })
  await expect(tip).toHaveCount(0)
  expect(overlay.errors).toEqual([])
})

test('a base in a unique tier lists the uniques it can drop as, with their prices', async ({ overlay, fakeApp }) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  const gz = fs.readFileSync(fileURLToPath(new URL('../fixtures/filters/neversink/1-REGULAR.filter.gz', import.meta.url)))
  fs.writeFileSync(path.join(dir, 'NeverSink.filter'), zlib.gunzipSync(gz))
  await overlay.boot({
    widgets: [{ wmType: 'woke-loot-filter', wmFlags: ['invisible-on-blur'], sampleHotkey: 'Alt + F', editorHotkey: 'Alt + Shift + F', folder: dir, sourceName: 'NeverSink.filter' }]
  })
  await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+Shift+F')
  await overlay.pressHotkey('Alt + Shift + F')
  const page = overlay.page
  await page.getByRole('navigation', { name: /Where you are/ }).getByRole('button', { name: 'All' }).click()
  await page.getByRole('button', { name: /^Uniques/ }).first().click()
  await page.getByRole('button', { name: /^All uniques/ }).first().click()
  const tip = page.getByRole('tooltip')

  // Many uniques on one base: the best in full, then each with its price and grade.
  await page.locator('[title="multispecialhigh"]').first().click()
  const chip = page.getByText('Leather Belt', { exact: true }).first()
  await chip.hover()
  await expect(tip).toContainText('Headhunter')
  await expect(tip).toContainText('Leather Belt')
  await expect(tip).toContainText('worth it')
  await expect(tip).toContainText('Cyclopean Coil')
  await overlay.snap('unique base')
})

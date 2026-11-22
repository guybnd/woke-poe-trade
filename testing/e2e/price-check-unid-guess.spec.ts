// An unidentified unique jewel: the price check guesses which unique it is
// from the art under the mouse (main/src/woke/unid-art.ts), shows poe.ninja's
// price without a trade search, and the pick can be changed (WOKEPOET-481).
import fs from 'fs'
import path from 'path'
import { PNG } from 'pngjs'
import { test, expect, FIXTURES } from './harness'

test.describe.configure({ mode: 'parallel' })

const UNID_CRIMSON = [
  'Item Class: Jewels',
  'Rarity: Unique',
  'Crimson Jewel',
  '--------',
  'Item Level: 84',
  '--------',
  'Unidentified',
  '--------',
  'Place into an allocated Jewel Socket on the Passive Skill Tree. Right click to remove from the Socket.'
].join('\n')

// The Crimson Jewel uniques and their icons, as the price check lists them.
const CRIMSON: Array<{ name: string, icon: string }> = fs.readFileSync(path.join(FIXTURES, '../../renderer/public/data/en/items.ndjson'), 'utf8')
  .split('\n').filter(l => l.includes('"Crimson Jewel"') && l.includes('"UNIQUE"'))
  .map(l => JSON.parse(l)).filter(d => d.namespace === 'UNIQUE' && d.unique.base === 'Crimson Jewel')
  .map(d => ({ name: d.name, icon: d.icon }))

// Stand-in art: a few coloured blobs, different for every icon.
const ICON = 47
function art (seed: number): Uint8Array {
  let s = seed * 7919 + 13
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
  const blobs = Array.from({ length: 5 }, () => ({ x: 8 + rnd() * 31, y: 8 + rnd() * 31, r: 5 + rnd() * 9, c: [rnd() * 255, rnd() * 255, rnd() * 255] }))
  const px = new Uint8Array(ICON * ICON * 4)
  for (let y = 0; y < ICON; y++) {
    for (let x = 0; x < ICON; x++) {
      const b = blobs.find(b => Math.hypot(x - b.x, y - b.y) < b.r)
      if (!b) continue
      const o = (y * ICON + x) * 4
      px[o] = b.c[0]; px[o + 1] = b.c[1]; px[o + 2] = b.c[2]; px[o + 3] = 255
    }
  }
  return px
}
const ART = new Map(CRIMSON.map((c, i) => [c.icon, art(i + 1)]))
function iconPng (url: string): Uint8Array | null {
  const px = ART.get(url)
  if (!px) return null
  const png = new PNG({ width: ICON, height: ICON })
  png.data = Buffer.from(px)
  return PNG.sync.write(png)
}

// The game's screen: dark inventory slots, with this unique's art in the slot under the mouse.
function screenWith (game: { bounds: { width: number, height: number }, screen: Uint8Array }, name: string | null, at: { x: number, y: number }) {
  const { width, height } = game.bounds
  const cell = height * 0.0488
  const screen = new Uint8Array(width * height * 4)
  const ox = Math.round(at.x - cell * 0.4)
  const oy = Math.round(at.y - cell * 0.6)
  const px = name ? ART.get(CRIMSON.find(c => c.name === name)!.icon)! : null
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let col = [20, 22, 30]
      const inCell = x >= ox && x < ox + cell && y >= oy && y < oy + cell
      if (inCell) col = [38, 44, 70]
      if (inCell && px) {
        const io = (Math.floor((y - oy) / cell * ICON) * ICON + Math.floor((x - ox) / cell * ICON)) * 4
        const al = px[io + 3] / 255
        col = col.map((k, i) => k * (1 - al) + px[io + i] * al)
      }
      const o = (y * width + x) * 4
      screen[o] = col[2]; screen[o + 1] = col[1]; screen[o + 2] = col[0]; screen[o + 3] = 255
    }
  }
  game.screen = screen
}

test('the art names the unique: poe.ninja price first, and Change picks another', async ({ overlay, fakeApp }) => {
  expect(CRIMSON.length).toBeGreaterThan(10)
  fakeApp.site.reply = (url) => {
    const png = iconPng(url)
    return png ? { status: 200, body: png } : null
  }
  const saved = fakeApp.game.screen
  const savedCursor = fakeApp.game.cursor
  try {
    await overlay.boot()
    fakeApp.game.cursor = { x: 300, y: 600 }
    screenWith(fakeApp.game, 'Thread of Hope', { x: 300, y: 600 })
    await overlay.copyItem(UNID_CRIMSON)
    const panel = overlay.widget('price-check')
    const strip = panel.getByTestId('unid-guess')
    await expect(strip).toContainText('Guessed from the art')
    await expect(strip).toContainText(`${CRIMSON.length} Crimson Jewel uniques compared`)
    await expect(panel).toContainText('Thread of Hope')
    // poe.ninja's price, and no trade search until a click.
    const verdict = panel.getByTestId('ninja-verdict')
    await expect(verdict).toContainText('150c')
    await expect(verdict).toContainText('uses one trade search')
    expect(fakeApp.requests.some(r => r.url.includes('/api/trade/search/'))).toBe(false)
    await overlay.snap('unid jewel guessed')

    // Change: best match first, with prices; picking one is "your pick".
    await panel.getByTestId('unid-guess-change').click()
    const list = panel.getByTestId('unid-guess-list')
    await expect(list.locator('button').first()).toContainText('Thread of Hope')
    await expect(list.locator('button').first()).toContainText('match')
    await expect(list.getByRole('button', { name: /Split Personality/ })).toContainText('40c')
    await overlay.snap('unid jewel change list')
    await list.getByRole('button', { name: /Split Personality/ }).click()
    await expect(strip).toContainText('Your pick')
    await expect(panel.getByTestId('ninja-verdict')).toContainText('40c')

    // The live search is for unidentified listings of the picked unique.
    await panel.getByTestId('ninja-verdict-live').click()
    await expect.poll(() => fakeApp.requests.find(r => r.url.includes('/api/trade/search/'))?.body ?? '').toContain('Split Personality')
    const body = JSON.parse(fakeApp.requests.find(r => r.url.includes('/api/trade/search/'))!.body)
    expect(body.query.filters.misc_filters.filters.identified).toEqual({ option: 'false' })
  } finally {
    fakeApp.site.reply = null
    fakeApp.game.screen = saved
    fakeApp.game.cursor = savedCursor
  }
})

test('no art to read: the picker, dearest first with prices', async ({ overlay, fakeApp }) => {
  const saved = fakeApp.game.cursor
  try {
    await overlay.boot()
    // The mouse off the game window (as for an item in a chat link elsewhere): nothing is kept,
    // whatever icons an earlier test left cached.
    fakeApp.game.cursor = { x: fakeApp.game.bounds.x + fakeApp.game.bounds.width + 50, y: 600 }
    await overlay.copyItem(UNID_CRIMSON)
    const panel = overlay.widget('price-check')
    const picker = panel.getByTestId('unid-picker')
    await expect(picker).toBeVisible()
    await expect(picker.getByTestId('unid-guess-note')).toHaveCount(0)
    const tiles = picker.locator('button')
    await expect(tiles).toHaveCount(CRIMSON.length)
    await expect(tiles.nth(0)).toContainText('Thread of Hope')
    await expect(tiles.nth(0)).toContainText('150c')
    await expect(tiles.nth(1)).toContainText('Split Personality')
    await overlay.snap('unid jewel picker')
    await tiles.nth(1).click()
    await expect(panel.getByTestId('unid-guess')).toContainText('Your pick')
  } finally {
    fakeApp.game.cursor = saved
  }
})

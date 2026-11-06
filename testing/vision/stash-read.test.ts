// Reading the Scarab stash tab from Guy's real 2560x1440 screenshots: finding
// it wherever the panel sits, knowing which slots hold something, and refusing
// every other screen. Plain pixel maths, so it needs no OCR files.
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { decodePng } from '../fake-host/png'
import { readScarabTab } from '../../main/src/woke/stash-read'
import { SCARAB_LAYOUTS } from '../../main/src/woke/stash-scarab-data'
import { DIGITS, DIGIT_HEIGHT, DIGIT_TOP } from '../../main/src/woke/stash-digits-data'

const SCREENS = path.resolve(__dirname, '../fixtures/screens')

function screen (file: string) {
  const img = decodePng(fs.readFileSync(path.join(SCREENS, file)))
  const data = new Uint8Array(img.width * img.height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = img.data[i + 2]
    data[i + 1] = img.data[i + 1]
    data[i + 2] = img.data[i]
    data[i + 3] = 255
  }
  return { width: img.width, height: img.height, data }
}

// The same picture moved on screen, as with Faustus open or a folder row above.
function shifted (s: ReturnType<typeof screen>, dx: number, dy: number) {
  const data = new Uint8Array(s.data.length)
  for (let y = 0; y + dy < s.height; y++) {
    const from = y * s.width * 4
    const len = (s.width - dx) * 4
    data.set(s.data.subarray(from, from + len), ((y + dy) * s.width + dx) * 4)
  }
  return { ...s, data }
}

function shrunk (s: ReturnType<typeof screen>, height: number) {
  const width = Math.round(s.width * height / s.height)
  const data = new Uint8Array(width * height * 4)
  const f = s.height / height
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sum = [0, 0, 0]
      let n = 0
      for (let j = Math.floor(y * f); j < Math.floor((y + 1) * f); j++) {
        for (let i = Math.floor(x * f); i < Math.floor((x + 1) * f); i++) {
          const p = (j * s.width + i) * 4
          sum[0] += s.data[p]; sum[1] += s.data[p + 1]; sum[2] += s.data[p + 2]
          n++
        }
      }
      const q = (y * width + x) * 4
      data[q] = sum[0] / n; data[q + 1] = sum[1] / n; data[q + 2] = sum[2] / n; data[q + 3] = 255
    }
  }
  return { width, height, data }
}

const read = (s: { width: number, height: number, data: Uint8Array }) => readScarabTab(s.data, s.width, s.height)

describe('reading the scarab tab', () => {
  const tab = screen('stash-scarab-real.png')

  it('finds the tab and tells filled slots from empty ones', () => {
    const res = read(tab)
    expect(res.found).toBe(true)
    if (!res.found) return
    expect(res.slots.length).toBe(SCARAB_LAYOUTS[0].slots.length)
    const by = new Map(res.slots.map(s => [s.name, s]))
    expect(by.get('Horned Scarab of Bloodlines')?.filled).toBe(true)
    expect(by.get('Breach Scarab of the Hive')?.filled).toBe(true)
    // These two show as dim ghosts in this screenshot.
    expect(by.get('Cartography Scarab of Risk')?.filled).toBe(false)
    expect(by.get('Scarab of Radiant Storms')?.filled).toBe(false)
    expect(res.slots.filter(s => s.filled).length).toBe(113)
  })

  it('reads fast enough to feel instant', () => {
    const t0 = performance.now()
    read(tab)
    const ms = performance.now() - t0
    // eslint-disable-next-line no-console
    console.log(`stash read: ${Math.round(ms)} ms`)
    expect(ms).toBeLessThan(1000)
  })

  it('finds the tab wherever the panel sits, and moves the slots with it', () => {
    const base = read(tab)
    const res = read(shifted(tab, 640, 48))
    expect(res.found).toBe(true)
    if (!base.found || !res.found) return
    expect(res.slots[0].x - base.slots[0].x).toBeCloseTo(640 / tab.width, 5)
    expect(res.slots[0].y - base.slots[0].y).toBeCloseTo(48 / tab.height, 5)
    expect(res.slots.filter(s => s.filled).length).toBe(base.slots.filter(s => s.filled).length)
  })

  it('reads a real screenshot with Faustus open and no folder row above the tab', () => {
    const shot = screen('stash-scarab-faustus-real.png')
    const res = read(shot)
    const base = read(tab)
    expect(res.found).toBe(true)
    if (!res.found || !base.found) return
    // Up by the missing folder row, not sideways.
    expect(Math.round(res.slots[0].x * shot.width)).toBe(Math.round(base.slots[0].x * tab.width))
    expect(Math.round(res.slots[0].y * shot.height)).toBe(251)
    expect(res.slots.filter(s => s.filled).length).toBe(113)
  })

  it('reads a stash with an extra sub-tab button, using its own slot table', () => {
    const res = read(screen('stash-scarab-breach-real.png'))
    expect(res.found).toBe(true)
    if (!res.found) return
    expect(res.slots.length).toBe(SCARAB_LAYOUTS[1].slots.length)
    const at = (name: string) => {
      const s = res.slots.find(s => s.name === name)!
      return [Math.round(s.x * 2560), Math.round(s.y * 1440), s.filled]
    }
    // Rows keep their family between layouts; these stacks are in the screenshot.
    expect(at('Divination Scarab of The Cloister')).toEqual([77, 361, true])
    expect(at('Torment Scarab')).toEqual([77, 991, true])
    expect(at('Abyss Scarab of Multitudes')).toEqual([454, 424, true])
    expect(at('Scarab of Wisps')).toEqual([721, 725, true])
    expect(res.slots.map(s => s.name)).not.toContain('Scarab of Hunted Traitors')
  })

  it('tells filled slots from empty ones on a darker screen', () => {
    for (const file of ['stash-scarab-real.png', 'stash-scarab-breach-real.png']) {
      const s = screen(file)
      const base = read(s)
      const data = s.data.map((v, i) => i % 4 === 3 ? v : v * 0.5)
      const dim = read({ ...s, data })
      expect(dim.found && base.found && dim.slots.filter(x => x.filled).length).toBe(base.found && base.slots.filter(x => x.filled).length)
    }
  })

  it('scales to a smaller window', () => {
    // Exactly half, a clean resample. Real smaller windows are still untested.
    const small = read(shrunk(tab, 720))
    expect(small.found).toBe(true)
    if (small.found) expect(small.slots.filter(s => s.filled).length).toBeGreaterThan(SCARAB_LAYOUTS[0].slots.length - 6)
    expect(read(shrunk(screen('stash-scarab-breach-real.png'), 720)).found).toBe(true)
  })

  it('refuses another sub-tab, though it shows the same button', () => {
    expect(read(screen('stash-general-real.png')).found).toBe(false)
  })

  it('refuses a screen with no stash', () => {
    expect(read(screen('map-real-01.png')).found).toBe(false)
  })
})

describe('stack counts', () => {
  const truth = JSON.parse(fs.readFileSync(path.join(SCREENS, 'stash-scarab-counts.json'), 'utf8')) as Record<string, Record<string, number | null>>
  it.each([
    ['stash-scarab-real.png', 'stash-scarab-real'],
    ['stash-scarab-faustus-real.png', 'stash-scarab-real'],
    ['stash-scarab-breach-real.png', 'stash-scarab-breach-real']
  ])('reads every count in %s, checked by eye', (file, key) => {
    const s = screen(file)
    const res = readScarabTab(s.data, s.width, s.height)
    if (!res.found) throw new Error('tab not found')
    const counts = Object.fromEntries(res.slots.filter(s => s.filled).map(s => [s.name, s.count]))
    expect(counts).toEqual(truth[key])
  })

  // Paints a number into the first filled slot, the way the game spaces them.
  function withCount (text: string) {
    const s = screen('stash-scarab-real.png')
    const first = readScarabTab(s.data, s.width, s.height)
    if (!first.found) throw new Error('tab not found')
    const slot = first.slots.find(f => f.filled)!
    const x0 = Math.round(slot.x * s.width)
    const y0 = Math.round(slot.y * s.height)
    let x = x0 + 2
    for (const ch of text) {
      const d = DIGITS.find(g => g.digit === Number(ch))!
      for (let j = 0; j < DIGIT_HEIGHT; j++) {
        for (let i = 0; i < d.width; i++) {
          const p = ((y0 + DIGIT_TOP + j) * s.width + x + i) * 4
          s.data[p] = s.data[p + 1] = s.data[p + 2] = d.gray[j * d.width + i]
        }
      }
      x += d.width + 2
    }
    const res = readScarabTab(s.data, s.width, s.height)
    if (!res.found) throw new Error('tab not found')
    return res.slots.find(f => f.name === slot.name)!.count
  }

  it('reads four digits, and refuses a number that starts with 0', () => {
    expect(withCount('1200')).toBe(1200)
    expect(withCount('9999')).toBe(9999)
    expect(withCount('012')).toBeNull()
  })

  it('reads no counts at another window size', () => {
    const s = shrunk(screen('stash-scarab-real.png'), 720)
    const res = readScarabTab(s.data, s.width, s.height)
    if (!res.found) throw new Error('tab not found')
    expect(res.slots.every(f => f.count === null)).toBe(true)
  })
})

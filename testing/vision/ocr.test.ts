// OCR tests: the vision worker's code (opencv + tesseract, as shipped with
// APT) reads the screenshots in fixtures/screens, and the overlay's parsers
// turn the text into map mods / essences. Each screenshot's .json says what
// should come out. They're real 2560x1440 game screenshots, blacked out away
// from the tooltip to keep them small; main/ocr-bench reads the same ones and
// reports accuracy in more detail.
//
// Needs the OCR files: `npm run get:ocr` (CI caches them).
import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { TooltipMatcher } from '../../renderer/src/web/woke/map-mods/tooltip-parse'
import { parseMonolith } from '../../renderer/src/web/woke/essence-scan/essences'
import { parseAreaModLines } from '../../renderer/src/web/woke/death-recap/area-list'

const require = createRequire(import.meta.url)
const SCREENS = path.resolve(__dirname, '../fixtures/screens')
const OCR_DIR = process.env.WOKE_OCR_DIR ?? path.resolve(__dirname, '../.cache/cv-ocr')
const haveOcr = fs.existsSync(path.join(OCR_DIR, 'opencv.js'))
// The model the app's scans read with (map-scan.ts useScanModel).
const SCAN_MODEL = path.resolve(__dirname, '../../renderer/public/data/ocr/poe.traineddata')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let V: any

interface Screen {
  file: string
  cursor: { x: number, y: number }
  kind: 'map' | 'essence' | 'essence-all' | 'area-list'
  // What the screenshot shows that makes it hard, if anything.
  note?: string
  // Not checked: the scan reads from the first property line down, not the
  // header ("Map (Tier 16)").
  tier?: number
  props?: Record<string, number>
  // Matcher strings of the map mods, as the overlay's data has them.
  mods?: string[]
  // Map mod lines the game data doesn't have (Valdo maps).
  unmatched?: number
  essences?: string[]
  // A known misread: the test expects it to fail until the scan gets better.
  knownMiss?: string
  labels?: string[][]
}

function screens (kind: Screen['kind']): Screen[] {
  return fs.readdirSync(SCREENS).filter(f => f.endsWith('.json')).map(f => ({
    file: f.replace(/\.json$/, '.png'),
    ...JSON.parse(fs.readFileSync(path.join(SCREENS, f), 'utf8'))
  })).filter((s: Screen) => s.kind === kind)
}

// A screenshot as the app gets it on Windows: BGRA.
function loadScreen (file: string) {
  const img = V.decodePng(fs.readFileSync(path.join(SCREENS, file)))
  const data = new Uint8Array(img.data.length)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = img.data[i + 2]; data[i + 1] = img.data[i + 1]; data[i + 2] = img.data[i]; data[i + 3] = 255
  }
  return { width: img.width, height: img.height, data }
}

// Every map mod line in the game data (what the overlay matches against).
function areaMods (): string[] {
  const ndjson = fs.readFileSync(path.resolve(__dirname, '../../renderer/public/data/en/stats.ndjson'), 'utf8')
  const out = new Set<string>()
  for (const line of ndjson.split('\n')) {
    if (!line.includes('fromAreaMods')) continue
    const entry = JSON.parse(line)
    for (const stat of ('stats' in entry ? entry.stats : [entry])) {
      if (!stat.fromAreaMods || stat.fromAreaMods === 'heist_exclusive') continue
      for (const m of stat.matchers) out.add(m.string)
    }
  }
  return [...out]
}

// Map scan, as main runs it: a first frame finds the tooltip, the next
// (unchanged) frame cuts it into lines, then each line is OCR'd.
function readMapTooltip (screen: Screen): string[] {
  const img = loadScreen(screen.file)
  const first = V.scanTooltip({ ...img, data: img.data.slice() }, { cursor: screen.cursor, stableSig: null, lastReadSig: null })
  expect(first.sig, 'tooltip found near the cursor').toBeTruthy()
  const second = V.scanTooltip(img, { cursor: screen.cursor, stableSig: first.sig, lastReadSig: null })
  expect(second.lineImages?.length).toBeGreaterThan(0)
  return second.lineImages.map((l: unknown) => V.ocrLine(l).trim()).filter(Boolean)
}

describe.skipIf(!haveOcr)('OCR on game screenshots', () => {
  beforeAll(async () => {
    V = require('../fake-host/dist/vision-lib.cjs')
    await V.Bindings.init(OCR_DIR)
    await V.Bindings.changeLanguage('en', OCR_DIR)
    V.Bindings.loadModelData(new Uint8Array(fs.readFileSync(SCAN_MODEL)), 'poe')
  })

  const matcher = new TooltipMatcher(areaMods())

  for (const screen of screens('map')) {
    it(`map scan reads ${screen.file}`, () => {
      const lines = readMapTooltip(screen)
      const parsed = matcher.parse(lines)
      const read = `read:\n${lines.join('\n')}`
      expect(parsed, read).not.toBeNull()
      expect(parsed!.mods.map(m => m.matcher).sort(), read).toEqual([...screen.mods!].sort())
      expect(parsed!.weak.length, `lines read with low confidence; ${read}`).toBe(screen.unmatched ?? 0)
      expect(parsed!.props, read).toMatchObject(screen.props!)
    })
  }

  describe('finding the list', () => {
    const cols = 400
    const rows = 300
    const lineH = 20
    const mask = (lines: Array<[y: number, h: number]>) => {
      const m = new Uint8Array(cols * rows)
      for (const [y, h] of lines) {
        for (let r = y; r < y + h; r++) m.fill(255, r * cols + 100, r * cols + cols - 4)
      }
      return m
    }

    it('wants two lines, so a tooltip touching the edge is no list', () => {
      expect(V.areaModStack(mask([[10, 12]]), cols, rows, lineH)).toBeNull()
    })

    it('keeps the lines either side of a hidden stretch', () => {
      expect(V.areaModStack(mask([[10, 12], [28, 12], [100, 12], [118, 12]]), cols, rows, lineH)).toHaveLength(4)
    })

    it('splits two lines joined by a descender', () => {
      expect(V.areaModStack(mask([[10, 12], [28, 34]]), cols, rows, lineH)).toHaveLength(3)
    })

    it('wants the text at the very edge', () => {
      const m = new Uint8Array(cols * rows)
      for (const y of [10, 28]) {
        for (let r = y; r < y + 12; r++) m.fill(255, r * cols + 100, r * cols + cols - 30)
      }
      expect(V.areaModStack(m, cols, rows, lineH)).toBeNull()
    })
  })

  for (const screen of screens('area-list')) {
    it(`death recap reads the game's mod list in ${screen.file}`, () => {
      const img = loadScreen(screen.file)
      const width = Math.round(img.height * 0.7)
      const height = Math.round(img.height * 0.75)
      const corner = new Uint8Array(width * height * 4)
      for (let y = 0; y < height; y++) {
        const from = (y * img.width + img.width - width) * 4
        corner.set(img.data.subarray(from, from + width * 4), y * width * 4)
      }
      const started = performance.now()
      const images = V.scanAreaModList({ width, height, data: corner }, img.height)
      const lines: string[] = (images ?? []).map((l: unknown) => V.ocrLine(l).trim())
      const read = `read in ${Math.round(performance.now() - started)} ms:\n${lines.join('\n')}`
      const parsed = parseAreaModLines(lines, matcher)
      expect(parsed.mods.map(m => m.matcher).sort(), read).toEqual([...screen.mods!].sort())
      expect(parsed.weak, read).toEqual([])
    })
  }

  for (const screen of screens('essence')) {
    const test = screen.knownMiss ? it.fails : it
    test(`essence scan reads ${screen.file}${screen.knownMiss ? ` (known miss: ${screen.knownMiss})` : ''}`, () => {
      const img = loadScreen(screen.file)
      const first = V.scanEssenceLabel({ ...img, data: img.data.slice() }, { cursor: screen.cursor, stableSig: null, lastReadSig: null })
      expect(first.sig, 'label found near the cursor').toBeTruthy()
      const second = V.scanEssenceLabel(img, { cursor: screen.cursor, stableSig: first.sig, lastReadSig: null })
      const lines: string[] = (second.lineImages ?? []).map((l: unknown) => V.ocrLine(l).trim()).filter(Boolean)
      const mono = parseMonolith(lines)
      expect(mono?.essences.map(e => e.name), `read:\n${lines.join('\n')}`).toEqual(screen.essences)
    })
  }

  for (const screen of screens('essence-all')) {
    it(`whole-screen essence read finds every label in ${screen.file}`, () => {
      const { labels } = V.scanAllEssenceLabels(loadScreen(screen.file))
      const found = (labels as Array<{ lines: string[] }>)
        .map(l => parseMonolith(l.lines)?.essences.map(e => e.name) ?? [])
        .filter(names => names.length)
      expect(found.map(f => f.join(' | ')).sort()).toEqual(screen.labels!.map(l => l.join(' | ')).sort())
    })
  }
})

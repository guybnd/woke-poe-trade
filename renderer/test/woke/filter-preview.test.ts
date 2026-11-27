// Loot filter phase 3: the loot shower preview (drop pile, label layout,
// verdicts) and custom alert sounds.
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { FIXTURES } from '../helpers/game-data'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { applyStyle, readStyle } from '@/web/woke/loot-filter/edits'
import { rollDrops, defaultTextColour } from '@/web/woke/loot-filter/drops'
import type { Drop } from '@/web/woke/loot-filter/drops'
import { labelBox, layoutLabels, runDrops, soundsOf, summarize } from '@/web/woke/loot-filter/shower'
import type { Rect } from '@/web/woke/loot-filter/shower'
import { customSoundsIn, isCustomSound, isPackSound, soundLabel, soundUses } from '@/web/woke/loot-filter/sounds'

const SOURCE = fs.readFileSync(path.join(FIXTURES, 'filters/neversink-sample.filter'), 'utf8')

function overlap (a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

function currency (name: string, id: number): Drop {
  return {
    id,
    label: name,
    facts: { name, baseType: name, itemClass: 'Stackable Currency', rarity: 'Normal', stackSize: 1, influences: [], explicitModNames: [], areaLevel: 83 }
  }
}

describe('drop pile', () => {
  it('is the same pile for the same seed and a new one on reroll', () => {
    const a = rollDrops(83, 1).map(d => d.label)
    expect(rollDrops(83, 1).map(d => d.label)).toEqual(a)
    expect(rollDrops(83, 2).map(d => d.label)).not.toEqual(a)
    expect(a).toHaveLength(60)
  })

  it('gives drops the item class filters see (a Stacked Deck is currency)', () => {
    const decks = rollDrops(83, 5, 3000).filter(d => d.facts.baseType === 'Stacked Deck')
    expect(decks.length).toBeGreaterThan(0)
    expect(new Set(decks.map(d => d.facts.itemClass))).toEqual(new Set(['Stackable Currency']))
  })

  // Every drop is an item the game still has (APT's item data; shards and
  // maps aren't listed there), with its real size.
  it('drops only real items, at their real size', () => {
    const data = new Map<string, { w?: number, h?: number }>()
    for (const line of fs.readFileSync(path.join(__dirname, '../../public/data/en/items.ndjson'), 'utf8').split('\n')) {
      if (!line) continue
      const item = JSON.parse(line) as { name: string, namespace: string, w?: number, h?: number }
      if (item.namespace !== 'AREA' && !data.has(item.name)) data.set(item.name, item)
    }
    const wrong = new Set<string>()
    for (const d of rollDrops(83, 7, 5000).concat(rollDrops(40, 7, 3000))) {
      const f = d.facts
      if (f.itemClass === 'Maps' || f.baseType === 'Transmutation Shard') continue
      const item = data.get(f.baseType!)
      if (!item) wrong.add(`${f.baseType}: not in the game`)
      else if (item.w && (item.w !== f.width || (item.h ?? 1) !== f.height)) wrong.add(`${f.baseType}: ${f.width}x${f.height}, is ${item.w}x${item.h ?? 1}`)
    }
    expect([...wrong]).toEqual([])
  })

  it('drops what the area level allows', () => {
    const acts = rollDrops(45, 3, 400)
    expect(acts.some(d => d.facts.itemClass === 'Maps')).toBe(false)
    expect(acts.some(d => d.facts.baseType === 'Vaal Regalia')).toBe(false)
    const t16 = rollDrops(83, 3, 400)
    const maps = t16.filter(d => d.facts.itemClass === 'Maps')
    expect(maps.length).toBeGreaterThan(0)
    for (const m of maps) expect(m.facts.mapTier).toBeGreaterThanOrEqual(15)
    // Campaign-only bases stop dropping.
    expect(t16.some(d => d.facts.baseType === 'Rusted Sword')).toBe(false)
    for (const d of t16) expect(d.facts.itemLevel).toBe(83)
  })

  it('writes stacks the way the game labels them', () => {
    const stacked = rollDrops(83, 5, 400).filter(d => (d.facts.stackSize ?? 1) > 1)
    expect(stacked.length).toBeGreaterThan(0)
    for (const d of stacked) expect(d.label).toBe(`${d.facts.stackSize}x ${d.facts.baseType}`)
  })

  it('colours labels by rarity when no rule does', () => {
    const f = rollDrops(83, 1)[0].facts
    expect(defaultTextColour({ ...f, itemClass: 'Rings', rarity: 'Rare' })).toEqual([255, 255, 119, 255])
    expect(defaultTextColour({ ...f, itemClass: 'Divination Cards', rarity: 'Normal' })).toEqual([14, 186, 255, 255])
  })
})

describe('loot shower', () => {
  it('runs the pile through the filter: hidden, shown, beams and sounds', () => {
    const doc = parseFilter(SOURCE)
    const list = runDrops(doc, [currency('Divine Orb', 1), currency('Chaos Orb', 2), currency('Portal Scroll', 3), currency('Exalted Orb', 4)])
    expect(list.map(d => d.visibility)).toEqual(['Show', 'Show', 'Hide', 'Show'])
    expect(list[0].tier).toBe('t1exalted')
    expect(list[0].look.icon).toEqual({ size: 0, color: 'Red', shape: 'Star' })
    expect(summarize(list)).toEqual({ shown: 3, hidden: 1, beams: 2, sounds: 1 })
    expect(soundsOf(list)).toEqual([{ id: '6', volume: 300, count: 1 }])
  })

  it('lays labels out without overlaps, clear of the minimap', () => {
    const sizes = rollDrops(83, 9, 40).map(d => labelBox(d.label, 32, 1.15))
    const minimap = { x: 896, y: 0, w: 104, h: 82 }
    const { rects, height } = layoutLabels(sizes, 1000, 380, 9, 40, [minimap])
    expect(rects).toHaveLength(40)
    expect(height).toBeGreaterThanOrEqual(380)
    for (let i = 0; i < rects.length; i++) {
      expect(overlap(rects[i], minimap)).toBe(false)
      expect(rects[i].y).toBeGreaterThanOrEqual(40)
      expect(rects[i].x + rects[i].w).toBeLessThanOrEqual(1000)
      expect(rects[i].y + rects[i].h).toBeLessThanOrEqual(height)
      for (let j = i + 1; j < rects.length; j++) expect(overlap(rects[i], rects[j]), `${i} and ${j}`).toBe(false)
    }
    // Same seed, same layout.
    expect(layoutLabels(sizes, 1000, 380, 9, 40, [minimap]).rects).toEqual(rects)
    // A small pile keeps the ground's height.
    expect(layoutLabels(sizes.slice(0, 8), 1000, 380, 9, 40, [minimap]).height).toBe(380)
  })
})

describe('custom sounds', () => {
  it('a sound file is written as CustomAlertSoundOptional, a number as PlayAlertSound', () => {
    const doc = parseFilter(SOURCE)
    const b = doc.blocks.find(x => x.tier === 't1exalted')!
    applyStyle(b, { sound: { id: '2currency.mp3', volume: 250 } })
    expect(b.actions.filter(a => a.key.includes('AlertSound')).map(a => [a.key, ...a.args])).toEqual([['CustomAlertSoundOptional', '2currency.mp3', '250']])
    expect(serializeFilter(doc)).toContain('CustomAlertSoundOptional "2currency.mp3" 250')
    expect(readStyle(b.actions).sound).toEqual({ id: '2currency.mp3', volume: 250 })
    expect(customSoundsIn(doc)).toEqual(['2currency.mp3'])

    // Read back from the saved text.
    const again = parseFilter(serializeFilter(doc))
    expect(readStyle(again.blocks.find(x => x.tier === 't1exalted')!.actions).sound).toEqual({ id: '2currency.mp3', volume: 250 })

    applyStyle(b, { sound: { id: '3', volume: 300 } })
    expect(b.actions.filter(a => a.key.includes('AlertSound')).map(a => [a.key, ...a.args])).toEqual([['PlayAlertSound', '3', '300']])
  })

  it('names sounds and says which groups use the game ones', () => {
    expect(isCustomSound('ping.wav')).toBe(true)
    expect(isCustomSound('6')).toBe(false)
    expect(isPackSound('6VeryValuable.mp3')).toBe(true)
    expect(soundLabel('6veryvaluable.mp3')).toBe('NeverSink: Very valuable')
    expect(soundLabel('sounds/ping.mp3')).toBe('sounds/ping')
    expect(soundLabel('6')).toBe('Game sound 6: Tink')
    expect(soundLabel('9')).toBe('Game sound 9: Small')
    expect(soundLabel('8')).toBe('Game sound 8')
    expect(soundUses(parseFilter(SOURCE)).get('6')).toEqual(['General currency'])
  })
})

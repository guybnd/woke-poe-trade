// The Changes tab's History in words, and repeats folded into one row.
import { describe, it, expect } from 'vitest'
import { changeText, historyRows, rowSummary, stepChanges } from '@/web/woke/loot-filter/history-words'
import { TIMELINE_MERGE_MS, emptyTimeline, observe } from '@/web/woke/loot-filter/timeline'
import type { Settings, TimelineStep } from '@/web/woke/loot-filter/timeline'
import { defaultPresets } from '@/web/woke/loot-filter/presets'
import type { Presets } from '@/web/woke/loot-filter/presets'

function settings (edit: (p: Presets) => void = () => {}): Settings {
  const presets = defaultPresets()
  edit(presets)
  return { edits: [], rules: [], presets, moves: [], locks: [] }
}
const texts = (b: Settings, a: Settings) => stepChanges(b, a).map(changeText)

describe('stepChanges', () => {
  it('names a section ruler step and both prices', () => {
    const b = settings(p => { p.currency.rulers = { essences: [0.2, 2.8, 10, 60, 200] } })
    const a = settings(p => { p.currency.rulers = { essences: [0.2, 3.5, 10, 60, 200] } })
    expect(texts(b, a)).toEqual(['Essences ruler · Normal 2.8c → 3.5c'])
  })

  it('names an item and its price bias', () => {
    const b = settings()
    const a = settings(p => { p.currency.items = { 'Divine Orb': { mult: 1.25 } } })
    const cs = stepChanges(b, a)
    expect(cs.map(changeText)).toEqual(['Divine Orb · price bias 0% → +25%'])
    expect(cs[0].item).toBe('Divine Orb')
  })

  it('says each main ruler value, a section mode and a step turned off', () => {
    const b = settings()
    const a = settings(p => {
      p.currency.line = 0.5
      p.currency.catMode = { cards: 'always' }
      p.currency.offBy = { all: [1] }
    })
    expect(texts(b, a)).toEqual(expect.arrayContaining(['Main ruler · Small starts 0.2c → 0.5c', 'Every page steps · Small turned off']))
    expect(texts(b, a).some(t => /· shows By price → Always$/.test(t))).toBe(true)
  })

  it('says rare weight values', () => {
    const b = settings()
    const a = settings(p => { p.weights.need = 6; p.weights.mult.l6 = 80 })
    const t = texts(b, a)
    expect(t).toContain('Rare gear · score needed to show 4 → 6')
    expect(t.some(x => /^Rare gear · .* weight \d+ → 80$/.test(x))).toBe(true)
  })

  it('says another preset by its name', () => {
    const b = settings()
    const a = settings(p => { p.cheapCurrency.on = !p.cheapCurrency.on })
    expect(texts(b, a)[0]).toMatch(/^Hide cheap currency · turned (on|off)$/)
  })

  it('reads a saved step that holds only the presets', () => {
    const b = settings()
    const a = settings(p => { p.currency.line = 1 })
    expect(stepChanges({ presets: b.presets }, { presets: a.presets }).map(changeText)).toEqual(['Main ruler · Small starts 0.2c → 1c'])
  })
})

describe('historyRows', () => {
  const at = (line: number) => settings(p => { p.currency.line = line })
  const step = (b: Settings, a: Settings, ts: number): TimelineStep => ({ ts, label: 'x', before: { presets: b.presets }, after: { presets: a.presets } })
  const changesOf = (s: TimelineStep) => stepChanges(s.before, s.after)

  it('folds steps in a row on the same control, first value to last', () => {
    const steps = [step(at(0.2), at(0.3), 1000), step(at(0.3), at(0.4), 60_000), step(at(0.4), at(0.5), 120_000)]
    const rows = historyRows(steps, changesOf)
    expect(rows).toHaveLength(1)
    expect(rows[0].count).toBe(3)
    expect(rows[0].n).toBe(2)
    expect(rowSummary(rows[0])).toBe('Main ruler · Small starts 0.2c → 0.5c')
    expect([...rows[0].trails.values()][0]).toEqual(['0.2c', '0.3c', '0.4c', '0.5c'])
  })

  it('keeps different controls, and the same one far apart, as their own rows, newest first', () => {
    const other = settings(p => { p.currency.line = 0.3; p.currency.mapFrom = 5 })
    const steps = [step(at(0.2), at(0.3), 1000), step(at(0.3), other, 2000), step(other, settings(p => { p.currency.line = 0.4; p.currency.mapFrom = 5 }), 3000 + 3_600_000)]
    const rows = historyRows(steps, changesOf)
    expect(rows.map(r => r.n)).toEqual([2, 1, 0])
    expect(rows.every(r => r.count === 1)).toBe(true)
  })
})

describe('observe merges a quick burst on one control', () => {
  const at = (line: number) => settings(p => { p.currency.line = line })

  it('grows the last step within the burst time', () => {
    let t = observe(emptyTimeline(), at(0.2), at(0.3), 'a', 1000)
    t = observe(t, at(0.3), at(0.4), 'b', 1000 + TIMELINE_MERGE_MS - 1)
    expect(t.steps).toHaveLength(1)
    expect(t.steps[0].before.presets!.currency.line).toBe(0.2)
    expect(t.steps[0].after.presets!.currency.line).toBe(0.4)
  })

  it('starts a new step after the burst time or on another control', () => {
    let t = observe(emptyTimeline(), at(0.2), at(0.3), 'a', 1000)
    t = observe(t, at(0.3), at(0.4), 'b', 1000 + TIMELINE_MERGE_MS)
    expect(t.steps).toHaveLength(2)
    const other = settings(p => { p.currency.line = 0.4; p.currency.mapFrom = 3 })
    t = observe(t, at(0.4), other, 'c', 1000 + TIMELINE_MERGE_MS + 10)
    expect(t.steps).toHaveLength(3)
  })

  it('still treats going back as an undo', () => {
    let t = observe(emptyTimeline(), at(0.2), at(0.3), 'a', 1000)
    t = observe(t, at(0.3), at(0.2), 'b', 1100)
    expect(t.steps).toHaveLength(1)
    expect(t.at).toBe(0)
  })
})

// The list of changes you can step back and forward through.
import { describe, it, expect } from 'vitest'
import { TIMELINE_MAX_CHARS, TIMELINE_SIZE, canRedo, canUndo, changedParts, describePatch, describeStep, emptyTimeline, normalizeTimeline, observe, settingsAt } from '@/web/woke/loot-filter/timeline'
import type { Settings, Timeline } from '@/web/woke/loot-filter/timeline'
import type { FilterEdit } from '@/web/woke/loot-filter/edits'
import { defaultPresets } from '@/web/woke/loot-filter/presets'
import { newRule } from '@/web/woke/loot-filter/rules'

function settings (over: Partial<Settings> = {}): Settings {
  return { edits: [], rules: [], presets: defaultPresets(), moves: [], locks: [], ...over }
}

const hide = (id: number, tier = 't1'): FilterEdit => ({ id, kind: 'visibility', type: 'currency', tier, visibility: 'Hide' })

// Walks a timeline through a list of settings.
function walk (list: Settings[]): Timeline {
  let t = emptyTimeline()
  for (let i = 1; i < list.length; i++) t = observe(t, list[i - 1], list[i], `step ${i}`, i)
  return t
}

describe('steps', () => {
  const a = settings()
  const b = settings({ edits: [hide(1)] })
  const c = settings({ edits: [hide(1), hide(2, 't2')] })

  it('adds a step for each change, keeping only what changed', () => {
    const t = walk([a, b, c])
    expect(t.at).toBe(2)
    expect(Object.keys(t.steps[0].before)).toEqual(['edits'])
    expect(t.steps[1].after.edits).toHaveLength(2)
  })

  it('adds nothing when nothing changed', () => {
    expect(observe(emptyTimeline(), a, settings(), 'x')).toEqual(emptyTimeline())
  })

  it('an Undo note taking the last change back moves the pointer, not the list', () => {
    const t = observe(walk([a, b, c]), c, b, 'undo')
    expect(t.steps).toHaveLength(2)
    expect(t.at).toBe(1)
    expect(canRedo(t)).toBe(true)
  })

  it('doing the undone change again counts as a redo', () => {
    const undone = observe(walk([a, b, c]), c, b, 'undo')
    const t = observe(undone, b, c, 'again')
    expect(t.steps).toHaveLength(2)
    expect(t.at).toBe(2)
  })

  it('a new change after an undo drops what was undone', () => {
    const undone = observe(walk([a, b, c]), c, b, 'undo')
    const d = settings({ edits: [hide(1), hide(3, 't3')] })
    const t = observe(undone, b, d, 'new')
    expect(t.steps.map(s => s.label)).toEqual(['step 1', 'new'])
    expect(t.at).toBe(2)
    expect(canRedo(t)).toBe(false)
  })

  it('keeps the newest steps only', () => {
    let t = emptyTimeline()
    let prev = settings()
    for (let i = 1; i <= TIMELINE_SIZE + 5; i++) {
      const next = settings({ edits: [hide(i)] })
      t = observe(t, prev, next, `s${i}`)
      prev = next
    }
    expect(t.steps).toHaveLength(TIMELINE_SIZE)
    expect(t.at).toBe(TIMELINE_SIZE)
    expect(t.steps[TIMELINE_SIZE - 1].label).toBe(`s${TIMELINE_SIZE + 5}`)
  })

  it('a step does not change when the settings are edited later', () => {
    const edits = [hide(1)]
    const t = observe(emptyTimeline(), settings(), settings({ edits }), 'x')
    edits[0].type = 'changed'
    expect((t.steps[0].after.edits as FilterEdit[])[0].type).toBe('currency')
  })
})

describe('going to a point', () => {
  const a = settings()
  const b = settings({ edits: [hide(1)] })
  const c = settings({ edits: [hide(1)], moves: [{ type: 'c', base: 'X', from: 'a', to: 'b', chaos: 1 }] })
  const d = settings({ edits: [hide(1), hide(2)], moves: [{ type: 'c', base: 'X', from: 'a', to: 'b', chaos: 1 }] })
  const t = walk([a, b, c, d])

  it('back one step restores that step only', () => {
    expect(settingsAt(t, 2)).toEqual({ edits: c.edits })
  })

  it('back several restores every part they touched', () => {
    expect(settingsAt(t, 1)).toEqual({ edits: b.edits, moves: [] })
    expect(settingsAt(t, 0)).toEqual({ edits: [], moves: [] })
  })

  it('forward again ends where it was', () => {
    const back = { ...t, at: 0 }
    expect(settingsAt(back, 3)).toEqual({ edits: d.edits, moves: d.moves })
    expect(settingsAt(back, 1)).toEqual({ edits: b.edits })
  })

  it('here is no change', () => {
    expect(settingsAt(t, t.at)).toEqual({})
  })

  it('knows when there is nowhere to go', () => {
    expect(canUndo(emptyTimeline())).toBe(false)
    expect(canUndo(t)).toBe(true)
    expect(canRedo(t)).toBe(false)
  })

  it('walking every step back and forward gives the same settings', () => {
    const apply = (s: Settings, part: Partial<Settings>) => ({ ...s, ...part })
    let now = d
    let at = t.at
    for (const target of [0, 2, 1, 3, 0, 3]) {
      now = apply(now, settingsAt({ ...t, at }, target))
      at = target
      expect(now.edits).toEqual([a, b, c, d][target].edits)
      expect(now.moves).toEqual([a, b, c, d][target].moves)
    }
  })
})

describe('in words', () => {
  it('says the values before and after', () => {
    expect(describePatch({ fontSize: 45 }, { fontSize: 40 })).toBe('font size 40 → 45')
    expect(describePatch({ text: [1, 2, 3, 255], border: null }, { text: [4, 5, 6, 255], border: [1, 1, 1, 255] })).toBe('text colour 4 5 6 → 1 2 3, border 1 1 1 → none')
    expect(describePatch({ effect: { color: 'Red', temp: false } }, {})).toBe('beam none → Red')
    expect(describePatch({ fontSize: 40 }, { fontSize: 40 })).toBe('')
  })

  it('a restyle says what it was, from the filter or your last change', () => {
    const edit = (patch: object, id = 1): FilterEdit => ({ id, kind: 'style', type: 'currency', tier: 't1exalted', patch })
    const look = () => ({ fontSize: 40 })
    expect(describeStep(settings(), settings({ edits: [edit({ fontSize: 45 })] }), look)).toBe('General currency › Tier 1: font size 40 → 45')
    expect(describeStep(settings({ edits: [edit({ fontSize: 45 })] }), settings({ edits: [edit({ fontSize: 42 })] }), look)).toBe('General currency › Tier 1: font size 45 → 42')
  })

  it('says what each kind of change was', () => {
    expect(describeStep(settings(), settings({ edits: [{ id: 1, kind: 'move', type: 'currency', base: 'Divine Orb', from: 't2divine', to: 't1exalted' }] }))).toContain('Divine Orb')
    expect(describeStep(settings({ edits: [hide(1)] }), settings())).toMatch(/^Took back/)
    expect(describeStep(settings({ edits: [hide(1), hide(2)] }), settings())).toBe('Took back Hide General currency › Tier 1 and Hide General currency › Tier 1')
    const m = { type: 'c', base: 'X', from: 'a', to: 'b', chaos: 1 }
    expect(describeStep(settings(), settings({ moves: [m] }))).toBe('Prices moved X A → B')
    expect(describeStep(settings({ moves: [m] }), settings())).toBe('Back to NeverSink\'s tiers')
    const rule = newRule(1, 1)
    expect(describeStep(settings(), settings({ rules: [rule] }))).toBe('New rule: My rule 1')
    expect(describeStep(settings({ rules: [rule] }), settings())).toBe('Deleted rule: My rule 1')
    expect(describeStep(settings({ rules: [rule] }), settings({ rules: [{ ...rule, on: false }] }))).toBe('Changed rule: My rule 1')
    const on = defaultPresets()
    on.quiet.on = true
    expect(describeStep(settings(), settings({ presets: on }))).toBe('Preset: quiet mode on')
    expect(describeStep(settings(), settings({ locks: ['currency|Divine Orb'] }))).toBe('Kept Divine Orb where it is')
  })

  it('a change that touches several parts names each', () => {
    const s = settings({ edits: [hide(1)], locks: ['x'] })
    expect(changedParts(settings(), s)).toEqual(['edits', 'locks'])
    expect(describeStep(settings(), s)).toContain('Hide')
  })
})

describe('what a step records', () => {
  it('an undo that came with another change is a new step, so nothing is lost', () => {
    const a = settings()
    const b = settings({ edits: [hide(1)] })
    const t = walk([a, b])
    const also = settings({ locks: ['x'] })
    const next = observe(t, b, also, 'both')
    expect(next.steps).toHaveLength(2)
    expect(next.at).toBe(2)
  })

  it('drops the oldest steps when they get too big to save', () => {
    const moves = (n: number) => Array.from({ length: 1500 }, (_, i) => ({ type: 'currency', base: `Item number ${i}`, from: 't1', to: `t${n}`, chaos: 1 }))
    let t = emptyTimeline()
    let prev = settings()
    for (let i = 0; i < 20; i++) {
      const next = settings({ moves: moves(i) })
      t = observe(t, prev, next, 's', i + 1)
      prev = next
    }
    expect(JSON.stringify(t.steps).length).toBeLessThanOrEqual(TIMELINE_MAX_CHARS)
    // As many of the newest as fit: one more would go over.
    const older = JSON.stringify(observe({ steps: [], at: 0 }, settings(), settings({ moves: moves(99) }), 's', 0).steps[0]).length
    expect(JSON.stringify(t.steps).length + older + 1).toBeGreaterThan(TIMELINE_MAX_CHARS)
    expect(t.at).toBe(t.steps.length)
    expect(t.steps.length).toBeGreaterThan(0)
  })

  it('reads the game default for what a rule leaves unset', () => {
    const e: FilterEdit = { id: 1, kind: 'style', type: 'c', tier: 't1', patch: { fontSize: 45 } }
    expect(describeStep(settings(), settings({ edits: [e] }))).toContain('font size 32 → 45')
  })

  it('names the moves put back', () => {
    const m = (b: string) => ({ type: 'c', base: b, from: 'a', to: 'b', chaos: 1 })
    expect(describeStep(settings({ moves: [m('x'), m('y'), m('z')] }), settings({ moves: [m('x')] }))).toBe('Prices put back y and z')
    expect(describeStep(settings({ moves: [m('x')] }), settings({ moves: [m('y')] }))).toBe('Prices moved y A → B; put back x')
  })
})

describe('a saved timeline', () => {
  it.each([
    ['edits that are not a list', { edits: 'x' }],
    ['a broken edit', { edits: [{ id: 1, kind: 'style', type: 'c', tier: 't' }] }],
    ['moves that are empty', { moves: null }],
    ['a rule with a broken look', { rules: [{ id: 1, conditions: [], patch: { text: 'red' } }] }],
    ['locks that are not names', { locks: [1] }]
  ])('starts over on %s, so going back can\'t break the filter', (_name, before) => {
    expect(normalizeTimeline({ steps: [{ ts: 1, label: 'x', before, after: {} }], at: 1 })).toEqual(emptyTimeline())
  })

  it('reads back, and a damaged one starts over', () => {
    const good = walk([settings(), settings({ edits: [hide(1)] })])
    expect(normalizeTimeline(JSON.parse(JSON.stringify(good)))).toEqual(good)
    expect(normalizeTimeline(undefined)).toEqual(emptyTimeline())
    expect(normalizeTimeline({ steps: 'x' })).toEqual(emptyTimeline())
    expect(normalizeTimeline({ steps: [{ ts: 1 }, ...good.steps], at: 99 }).at).toBe(1)
  })
})

// Prices over time: the store with prices that arrive, age and change league,
// against a fake folder. Every result is checked in what was written.
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { effectScope, nextTick, reactive, ref, shallowRef } from 'vue'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { useLootFilter } from '@/web/woke/loot-filter/store'
import { initLootFilterWidget } from '@/web/woke/loot-filter/widget'
import type { LootFilterWidget } from '@/web/woke/loot-filter/widget'
import { SAFETY_RULE_TYPE } from '@/web/woke/loot-filter/safety'
import { ECONOMY_GROUPS, applyPriceMoves, isVolatile, mergeMoves, planRetier } from '@/web/woke/loot-filter/economy'
import type { PriceLookup, PriceMove } from '@/web/woke/loot-filter/economy'
import { loadGameData } from '../helpers/game-data'
import { LEVELS, neverSink } from '../helpers/neversink'
import { fakeHost } from '../helpers/filter-host'
import type { FakeHost } from '../helpers/filter-host'

const sent = vi.hoisted(() => ({ chat: [] as string[], log: null as null | ((lines: unknown[]) => void), host: null as FakeHost | null, toasts: [] as string[] }))

vi.mock('@/web/woke/shared/host', () => ({ hostRequest: (name: string, args: Record<string, unknown>) => sent.host!.request(name, args) }))
vi.mock('@/web/background/IPC', () => ({
  MainProcess: {
    sendEvent: (e: { payload: { text: string } }) => { sent.chat.push(e.payload.text) },
    onEvent: () => ({ abort () {} })
  },
  Host: {}
}))
vi.mock('@/web/woke/shared/game-log', () => ({ onGameLog: (fn: (lines: unknown[]) => void) => { sent.log = fn; return () => {} } }))
vi.mock('@/web/woke/loot-filter/build-input', () => ({ useBuildRuleInput: () => ref(null) }))
vi.mock('@/web/woke/loot-filter/prices', () => ({ useFilterPrices: () => P }))
vi.mock('@/web/woke/loot-filter/active-filter', () => ({ publishActiveFilter () {} }))
vi.mock('@/web/woke/loot-filter/sounds', () => ({ customSoundsIn: () => [], installPackSounds: async () => 0 }))
vi.mock('@/web/woke/ui', () => ({ toast: (text: string) => { sent.toasts.push(text) } }))

const P = {
  lookup: shallowRef<PriceLookup | null>(null),
  safety: shallowRef<PriceLookup | null>(null),
  currentLeague: shallowRef<string | null>('Allflame'),
  updatedAt: shallowRef<number | null>(null),
  wantPrices () {}
}

const OUTPUT = 'NeverSink (woke).filter'
const SOURCE = [
  'Show # $type->divination $tier->t1',
  '\tClass == "Divination Cards"',
  '\tBaseType == "Top One" "Top Two"',
  '\tSetFontSize 45',
  '',
  'Show # $type->divination $tier->t2',
  '\tClass == "Divination Cards"',
  '\tBaseType == "Mid One" "Mid Two"',
  '\tSetFontSize 40',
  '',
  'Hide # $type->divination $tier->t3',
  '\tClass == "Divination Cards"',
  '\tBaseType == "Low One" "Low Two"',
  ''
].join('\n')

const prices = (list: Record<string, number>): PriceLookup => (_, base) => list[base] != null ? { chaos: list[base], thin: false } : null
const VALUABLE = prices({ 'Top One': 1000, 'Top Two': 900, 'Mid One': 50, 'Mid Two': 40, 'Low One': 300, 'Low Two': 0.01 })

let host: FakeHost
beforeAll(loadGameData)
beforeEach(() => {
  host = fakeHost()
  sent.host = host
  sent.chat = []
  sent.toasts = []
  P.lookup.value = null
  P.safety.value = null
  P.currentLeague.value = 'Allflame'
  P.updatedAt.value = null
})
afterEach(() => {
  vi.useRealTimers()
  scopes.splice(0).forEach(s => { s.stop() })
})

// Each test's stores stop with it: they all watch the same fake prices.
const scopes: Array<ReturnType<typeof effectScope>> = []
function make (config: () => LootFilterWidget) {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(() => useLootFilter(config))!
}

function widget (over: Partial<LootFilterWidget> = {}): LootFilterWidget {
  const w = { wmId: 1, wmType: 'woke-loot-filter', wmTitle: '', wmWants: 'show', wmZorder: null, wmFlags: [] } as unknown as LootFilterWidget
  initLootFilterWidget(w)
  return reactive(Object.assign(w, over)) as LootFilterWidget
}

async function opened (over: Partial<LootFilterWidget> = {}) {
  host.files.set('NeverSink.filter', SOURCE)
  const config = widget({ sourceName: 'NeverSink.filter', ...over })
  const store = make(() => config)
  await store.listFiles()
  await store.load()
  return { store, config }
}

const written = () => parseFilter(host.files.get(OUTPUT)!)
const netBases = () => written().blocks.filter(b => b.type === SAFETY_RULE_TYPE).flatMap(b => b.conditions.find(c => c.key === 'BaseType')!.values)
const settled = async () => { await nextTick(); await nextTick(); await new Promise(resolve => setTimeout(resolve, 0)) }

describe('the net follows prices into the file', () => {
  it('writes a new list by itself when nothing of yours is unsaved', async () => {
    const { store } = await opened()
    await store.save()
    const chatBefore = sent.chat.length
    const wasPending = store.pendingReload.value
    expect(netBases()).toEqual([])
    P.safety.value = VALUABLE
    await settled()
    expect(netBases()).toEqual(['Low One'])
    expect(store.dirty.value).toBe(false)
    // Nobody pressed a key, so nothing is typed into the game for it.
    expect(sent.chat.filter(c => c.startsWith('/itemfilter'))).toHaveLength(chatBefore)
    expect(store.pendingReload.value).toBe(wasPending)
    expect(store.netWaitsForReload.value).toBe(true)
  })

  it('waits while you have unsaved changes', async () => {
    const { store } = await opened()
    await store.save()
    store.edit({ kind: 'visibility', type: 'divination', tier: 't2', visibility: 'Hide' })
    P.safety.value = VALUABLE
    await settled()
    expect(netBases()).toEqual([])
    await store.save()
    expect(netBases()).toEqual(['Low One', 'Mid One', 'Mid Two'])
  })

  it('never starts a file you have not saved yet', async () => {
    await opened()
    P.safety.value = VALUABLE
    await settled()
    expect(host.files.has(OUTPUT)).toBe(false)
  })

  it('keeps the last list when prices go away, and says so', async () => {
    const { store, config } = await opened()
    await store.save()
    P.safety.value = VALUABLE
    await settled()
    expect(config.safetyNet.last?.plain).toContain('Low One')
    P.safety.value = null
    await settled()
    expect(store.netWithoutPrices.value).toBe(true)
    await store.save()
    expect(netBases()).toEqual(['Low One'])
  })

  it('your own move down holds, and an old "off this list" doesn\'t touch the net', async () => {
    const { store, config } = await opened()
    await store.save()
    P.safety.value = VALUABLE
    await settled()
    config.healthDismissed = { 'divination|Low One': 300 }
    await settled()
    expect(netBases()).toEqual(['Low One'])
    store.edit({ kind: 'move', type: 'divination', base: 'Mid One', from: 't2', to: 't3' })
    await store.save()
    expect(netBases()).toEqual(['Low One'])
  })

  it('remembers what was valuable, so a stricter level is judged without prices', async () => {
    const { store, config } = await opened()
    await store.save()
    P.safety.value = VALUABLE
    await settled()
    P.safety.value = null
    await settled()
    store.edit({ kind: 'visibility', type: 'divination', tier: 't2', visibility: 'Hide' })
    expect(config.safetyNet.last?.plain).toContain('Mid One')
    await store.save()
    expect(netBases()).toEqual(['Low One', 'Mid One', 'Mid Two'])
  })

  it('holds a dismissed item back from the file', async () => {
    const { store, config } = await opened()
    await store.save()
    P.safety.value = VALUABLE
    await settled()
    config.netDismissed = { 'divination|Low One': 300 }
    await settled()
    expect(netBases()).toEqual([])
    expect(store.dirty.value).toBe(false)
  })
})

const MOVE: PriceMove = { type: 'divination', base: 'Mid One', from: 't2', to: 't1', chaos: 500 }
const UP = (league?: string): PriceMove => ({ ...MOVE, league })
const inTier = (tier: string) => written().blocks.find(b => b.tier === tier)!.conditions.find(c => c.key === 'BaseType')!.values

describe('moves belong to a league', () => {
  const moved = (league?: string) => ({ priceTiers: { on: true, moves: [UP(league)], prev: null, locks: [], appliedAt: 1, uniqueRule: 'max' as const } })

  it('applies moves in their own league', async () => {
    const { store } = await opened(moved('Allflame'))
    await store.save()
    expect(inTier('t1')).toContain('Mid One')
  })

  it('leaves another league\'s moves out of the file, kept in case you go back', async () => {
    const { store, config } = await opened(moved('Mirage'))
    await store.save()
    expect(inTier('t2')).toContain('Mid One')
    expect(config.priceTiers.moves).toHaveLength(1)
    expect(store.dirty.value).toBe(false)
  })

  it('new moves start over instead of building on the old league', async () => {
    P.lookup.value = VALUABLE
    const { store, config } = await opened(moved('Mirage'))
    store.applyPrices([{ ...MOVE, base: 'Mid Two' }])
    expect(config.priceTiers.moves.map(m => m.base)).toEqual(['Mid Two'])
    expect(config.priceTiers.moves[0].league).toBe('Allflame')
  })

  it('undo brings back the old league\'s moves still marked as theirs', async () => {
    const { store, config } = await opened(moved('Mirage'))
    const undo = store.applyPrices([{ ...MOVE, base: 'Mid Two' }])
    undo()
    await store.save()
    expect(config.priceTiers.moves[0].league).toBe('Mirage')
    expect(inTier('t2')).toContain('Mid One')
  })

  it('switching league takes them out of the file by itself, and nothing reads as unsaved', async () => {
    P.safety.value = VALUABLE
    const { store, config } = await opened(moved('Allflame'))
    await store.save()
    expect(inTier('t1')).toContain('Mid One')
    P.currentLeague.value = 'Mirage'
    await settled()
    expect(inTier('t2')).toContain('Mid One')
    expect(store.dirty.value).toBe(false)
    // Switching back brings them back: only the file left them out.
    expect(config.priceTiers.moves).toHaveLength(1)
  })

  it('applies moves from before leagues, and marks them at the next Apply', async () => {
    P.lookup.value = VALUABLE
    const { store, config } = await opened(moved())
    await store.save()
    expect(inTier('t1')).toContain('Mid One')
    expect(config.priceTiers.moves[0].league).toBeUndefined()
    store.applyPrices([{ ...MOVE, base: 'Mid Two' }])
    expect(config.priceTiers.moves.map(m => m.league)).toEqual(['Allflame', 'Allflame'])
  })

  it('with no league known, a move isn\'t foreign and stays in the file', async () => {
    P.currentLeague.value = null
    const { store, config } = await opened(moved('Allflame'))
    await store.save()
    expect(config.priceTiers.moves).toHaveLength(1)
    expect(inTier('t1')).toContain('Mid One')
  })
})

describe('the filter you started from changes', () => {
  const changed = SOURCE.replace('"Mid Two"', '"Mid Two" "Mid Three"')

  it('brings the copy along by itself, with nothing typed into the game', async () => {
    const { config } = await opened()
    const first = make(() => config)
    await first.load()
    await first.save()
    const chat = sent.chat.length
    host.files.set('NeverSink.filter', changed)
    const again = make(() => config)
    await again.listFiles()
    await again.load()
    await settled()
    expect(inTier('t2')).toContain('Mid Three')
    expect(sent.chat.length).toBe(chat)
    expect(again.sourceChanged.value).toBe(false)
  })

  it('leaves it to you while you have unsaved changes', async () => {
    const { config } = await opened()
    const first = make(() => config)
    await first.load()
    await first.save()
    first.edit({ kind: 'visibility', type: 'divination', tier: 't2', visibility: 'Hide' })
    host.files.set('NeverSink.filter', changed)
    const again = make(() => config)
    await again.listFiles()
    await again.load()
    await settled()
    expect(inTier('t2')).not.toContain('Mid Three')
    expect(again.sourceChanged.value).toBe(true)
  })
})

describe('auto saves stay out of your way', () => {
  it('never overwrites a file this editor has not saved', async () => {
    host.files.set(OUTPUT, '# made by hand')
    await opened()
    P.safety.value = VALUABLE
    await settled()
    expect(host.files.get(OUTPUT)).toBe('# made by hand')
  })

  it('waits when one of your changes no longer fits', async () => {
    const { store } = await opened()
    await store.save()
    const before = host.files.get(OUTPUT)
    store.edit({ kind: 'visibility', type: 'divination', tier: 'gone', visibility: 'Hide' })
    await store.save()
    expect(store.failed.value).toHaveLength(1)
    P.safety.value = VALUABLE
    await settled()
    expect(netBases()).toEqual([])
    expect(before).toBeTruthy()
  })

  it('turning price tiers off reads as a change of yours', async () => {
    const { store, config } = await opened({ priceTiers: { on: true, moves: [MOVE], prev: null, locks: [], appliedAt: 1, uniqueRule: 'max' } })
    await store.save()
    config.priceTiers.on = false
    await settled()
    expect(store.dirty.value).toBe(true)
    expect(inTier('t1')).toContain('Mid One')
  })

  it('your move to a tier outside the ranks holds, for one item and for its stacks', async () => {
    const { store } = await opened()
    await store.save()
    store.edit({ kind: 'move', type: 'divination', base: 'Low One', from: 't3', to: 'exhide' })
    P.safety.value = VALUABLE
    await store.save()
    expect(netBases()).not.toContain('Low One')
  })

  it('remembers stacks, and forgets a list made at a lower line', async () => {
    const { store, config } = await opened()
    await store.save()
    P.safety.value = VALUABLE
    await settled()
    expect(config.safetyNet.last?.line).toBe(20)
    P.safety.value = null
    config.safetyNet.minChaos = 5000
    await settled()
    await store.save()
    expect(netBases()).toEqual([])
  })

  it('opening another filter writes nothing', async () => {
    const { store, config } = await opened()
    await store.save()
    P.safety.value = VALUABLE
    await settled()
    host.files.set('Other.filter', SOURCE)
    config.sourceName = 'Other.filter'
    await store.load()
    P.safety.value = prices({ 'Low Two': 500 })
    await settled()
    expect(host.files.has('Other (woke).filter')).toBe(false)
    expect(store.sourceChanged.value).toBe(false)
  })

  it('a save you made leaves no notice about a reload still to come', async () => {
    const { store, config } = await opened()
    await store.save()
    P.safety.value = VALUABLE
    await settled()
    expect(store.netWaitsForReload.value).toBe(true)
    config.netDismissed = { 'divination|Low One': 300 }
    await store.save({ reloadNow: true })
    await settled()
    expect(store.netWaitsForReload.value).toBe(false)
  })

  it('your own move up doesn\'t hold the net back', async () => {
    const { store } = await opened()
    await store.save()
    store.edit({ kind: 'move', type: 'divination', base: 'Low One', from: 't3', to: 't2' })
    store.edit({ kind: 'visibility', type: 'divination', tier: 't2', visibility: 'Hide' })
    P.safety.value = VALUABLE
    await store.save()
    expect(netBases()).toContain('Low One')
  })
})

describe('updates', () => {
  it('never offers a version older than the one in use', async () => {
    for (let i = 0; i < 7; i++) host.neversink.set(`8.20.9//${i}`, neverSink(LEVELS[i]))
    host.latestVersion = '8.20.2'
    const config = widget({ neversink: { on: true, version: '8.20.9', prevVersion: null, style: '', level: 1, latest: null, latestChanges: '', checkedAt: null } })
    const store = make(() => config)
    await store.load()
    await store.checkForUpdate(true)
    expect(store.updateReady.value).toBeNull()
  })
})

describe('old prices', () => {
  const hours = (n: number) => Date.now() - n * 3600000

  it('warns from a day old, and offers no moves from three days old', async () => {
    P.lookup.value = VALUABLE
    P.updatedAt.value = hours(30)
    const { store } = await opened()
    expect(store.pricesStale.value).toBe(true)
    expect(store.plan.value).not.toBeNull()
    P.updatedAt.value = hours(80)
    expect(store.pricesTooOld.value).toBe(true)
    expect(store.plan.value).toBeNull()
  })

  it('fresh prices warn about nothing', async () => {
    P.updatedAt.value = hours(1)
    const { store } = await opened()
    expect(store.pricesStale.value).toBe(false)
  })
})

describe('auto strictness and your unsaved changes', () => {
  const github = () => {
    for (let i = 0; i < 7; i++) host.neversink.set(`8.20.2//${i}`, neverSink(LEVELS[i]))
    return widget({ neversink: { on: true, version: '8.20.2', prevVersion: null, style: '', level: 1, latest: null, latestChanges: '', checkedAt: Date.now() } })
  }
  const enter = (areaId: string, areaLevel: number) => sent.log!([{ ev: { kind: 'area', areaId, areaLevel } }])

  it('waits, says so, and switches once you have saved', async () => {
    const config = github()
    const store = make(() => config)
    await store.load()
    await store.save()
    store.edit({ kind: 'visibility', type: 'currency', tier: 't1exalted', visibility: 'Hide' })
    vi.useFakeTimers()
    enter('MapWorldsBeach', 83)
    enter('HideoutLuxurious', 1)
    await vi.advanceTimersByTimeAsync(4100)
    expect(config.neversink.level).toBe(1)
    expect(sent.toasts.join(' ')).toMatch(/waits until you save/)
    expect(written().blocks.find(b => b.tier === 't1exalted')?.visibility).not.toBe('Hide')
    vi.useRealTimers()
    await store.save()
    vi.useFakeTimers()
    enter('MapWorldsBeach', 83)
    enter('HideoutLuxurious', 1)
    await vi.advanceTimersByTimeAsync(4100)
    vi.useRealTimers()
    await vi.waitFor(() => expect(config.neversink.level).toBe(4))
  })
})

describe('planning moves', () => {
  const DIV = ECONOMY_GROUPS.find(g => g.type === 'divination')!
  const doc = () => parseFilter(SOURCE)
  const base = { 'Top One': 1000, 'Top Two': 1000, 'Mid One': 100, 'Mid Two': 100, 'Low One': 10, 'Low Two': 10 }

  it('going down takes a bigger drop than going up takes a rise', () => {
    const up = planRetier(doc(), prices({ ...base, 'Mid One': 1000 }), { groups: [DIV] }).moves
    expect(up.map(m => m.base)).toEqual(['Mid One'])
    // At 130c it's under the line by more than 20%, but not by 50%.
    expect(planRetier(doc(), prices({ ...base, 'Top One': 130 }), { groups: [DIV], bufferDown: 0.2 }).moves.map(m => m.base)).toEqual(['Top One'])
    expect(planRetier(doc(), prices({ ...base, 'Top One': 130 }), { groups: [DIV] }).moves).toEqual([])
    expect(planRetier(doc(), prices({ ...base, 'Top One': 100 }), { groups: [DIV] }).moves.map(m => m.base)).toEqual(['Top One'])
  })

  it('marks a move into a tier this strictness hides', () => {
    const moves = planRetier(doc(), prices({ ...base, 'Mid One': 2 }), { groups: [DIV] }).moves
    expect(moves[0]).toMatchObject({ base: 'Mid One', to: 't3', hides: true })
  })

  it('holds a price that jumped, and says why', () => {
    const jumpy: PriceLookup = (group, b) => {
      const p = prices({ ...base, 'Mid One': 1000 })(group, b)
      return p && b === 'Mid One' ? { ...p, volatile: true } : p
    }
    const plan = planRetier(doc(), jumpy, { groups: [DIV] })
    expect(plan.moves).toEqual([])
    expect(plan.skipped[0]).toMatchObject({ base: 'Mid One', reason: 'volatile' })
  })

  it('reads a jump from the week and the day', () => {
    expect(isVolatile({ chaos: 300, d7: 100 })).toBe(true)
    expect(isVolatile({ chaos: 30, d7: 100 })).toBe(true)
    expect(isVolatile({ chaos: 200, d1: 100 })).toBe(true)
    expect(isVolatile({ chaos: 150, d1: 100, d7: 100 })).toBe(false)
    expect(isVolatile({ chaos: 150 })).toBe(false)
  })

  it('a new move starts from where the item is, when the stored one gave way', () => {
    const stored: PriceMove = { type: 'divination', base: 'Mid One', from: 't2', to: 't1', chaos: 500 }
    // NeverSink has it in t3 now, so the stored move no longer holds.
    expect(mergeMoves([stored], [{ ...stored, from: 't3', to: 't2' }])).toEqual([{ ...stored, from: 't3', to: 't2' }])
    // It did hold: this is one move in two steps, and going back drops it.
    expect(mergeMoves([stored], [{ ...stored, from: 't1', to: 't3' }])[0]).toMatchObject({ from: 't2', to: 't3' })
    expect(mergeMoves([stored], [{ ...stored, from: 't1', to: 't2' }])).toEqual([])
  })

  it('gives way to NeverSink when it has re-tiered the item since', () => {
    const d = doc()
    // Stored from t3, but this version has the item in t2 already.
    expect(applyPriceMoves(d, [{ type: 'divination', base: 'Mid One', from: 't3', to: 't1', chaos: 500 }])).toBe(0)
    expect(d.blocks.find(b => b.tier === 't2')!.conditions.find(c => c.key === 'BaseType')!.values).toContain('Mid One')
  })
})

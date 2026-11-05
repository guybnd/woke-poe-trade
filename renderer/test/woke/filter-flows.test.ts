// The whole road from a key press to the file the game reads: pick a filter,
// change something, save, reload. The real store runs against a fake folder and
// game, and every result is checked by parsing what was written.
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { reactive, ref, shallowRef } from 'vue'
import { formatBlock, parseFilter, ruleLabel, serializeFilter, tierName } from '@/web/woke/loot-filter/parse'
import { itemFacts } from '@/web/woke/loot-filter/item-facts'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { matchItem } from '@/web/woke/loot-filter/match'
import { OWN_RULE_TYPE, conditionSignature, describeEdit as describeOf, moveTargets, readStyle, rehomeOptions } from '@/web/woke/loot-filter/edits'
import type { FilterEdit } from '@/web/woke/loot-filter/edits'
import { WOKE_MARK, useLootFilter } from '@/web/woke/loot-filter/store'
import { initLootFilterWidget, outputName } from '@/web/woke/loot-filter/widget'
import type { LootFilterWidget } from '@/web/woke/loot-filter/widget'
import { parseClipboard } from '@/parser'
import { fixture, loadGameData } from '../helpers/game-data'
import { LEVELS, neverSink } from '../helpers/neversink'
import type { Level } from '../helpers/neversink'
import { CLASS_ITEMS, STATE_ITEMS } from '../helpers/filter-items'
import { fakeHost } from '../helpers/filter-host'
import type { FakeHost } from '../helpers/filter-host'

const sent = vi.hoisted(() => ({ chat: [] as string[], log: null as null | ((lines: unknown[]) => void), host: null as FakeHost | null, wokeEvent: null as null | ((e: { topic: string, data: unknown }) => void) }))

vi.mock('@/web/woke/shared/host', () => ({ hostRequest: (name: string, args: Record<string, unknown>) => sent.host!.request(name, args) }))
vi.mock('@/web/background/IPC', () => ({
  MainProcess: {
    sendEvent: (e: { payload: { text: string } }) => { sent.chat.push(e.payload.text) },
    onEvent: (name: string, fn: (e: { topic: string, data: unknown }) => void) => {
      if (name === 'MAIN->CLIENT::woke-event') sent.wokeEvent = fn
      return { abort () {} }
    }
  },
  Host: {}
}))
vi.mock('@/web/woke/shared/game-log', () => ({ onGameLog: (fn: (lines: unknown[]) => void) => { sent.log = fn; return () => {} } }))
vi.mock('@/web/woke/loot-filter/build-input', () => ({ useBuildRuleInput: () => ref(null) }))
vi.mock('@/web/woke/loot-filter/prices', () => ({ useFilterPrices: () => ({ lookup: shallowRef(null), safety: shallowRef(null), currentLeague: shallowRef('Test'), updatedAt: shallowRef(null), wantPrices () {} }) }))
vi.mock('@/web/woke/loot-filter/active-filter', () => ({ publishActiveFilter () {} }))
vi.mock('@/web/woke/loot-filter/sounds', () => ({ customSoundsIn: () => [], installPackSounds: async () => 0 }))
vi.mock('@/web/woke/ui', () => ({ toast: () => {} }))

beforeAll(loadGameData)

const rehomeLabels = (doc: ReturnType<typeof parseFilter>, edit: FilterEdit) => rehomeOptions(doc, edit).map(o => o.label)

let host: FakeHost
beforeEach(() => {
  host = fakeHost()
  sent.host = host
  sent.chat = []
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

function widget (over: Partial<LootFilterWidget> = {}): LootFilterWidget {
  const w = { wmId: 1, wmType: 'woke-loot-filter', wmTitle: '', wmWants: 'show', wmZorder: null, wmFlags: [] } as unknown as LootFilterWidget
  initLootFilterWidget(w)
  return reactive(Object.assign(w, over)) as LootFilterWidget
}

async function opened (text = neverSink('1-REGULAR'), over: Partial<LootFilterWidget> = {}) {
  host.files.set('NeverSink.filter', text)
  const config = widget({ sourceName: 'NeverSink.filter', ...over })
  const store = useLootFilter(() => config)
  await store.listFiles()
  await store.load()
  expect(store.error.value).toBeNull()
  return { store, config }
}

function facts (text: string, areaLevel = 83): ItemFacts {
  const res = parseClipboard(text)
  return { ...itemFacts(text, res.isOk() ? res.value : null), areaLevel }
}

// What the game would do with the file as last written.
function inGame (name = 'NeverSink (woke).filter') {
  return parseFilter(host.files.get(name)!)
}

// The card's "just this item", as SampleCard builds it.
function ownRule (doc: ReturnType<typeof parseFilter>, f: ItemFacts, change: { visibility?: 'Show' | 'Hide', fontSize?: number, pin?: boolean }): Omit<Extract<FilterEdit, { kind: 'item' }>, 'id'> {
  const m = matchItem(doc, f)
  const b = m.final!.block
  return {
    kind: 'item',
    type: b.type!,
    tier: b.tier!,
    base: f.baseType!,
    visibility: change.visibility ?? b.visibility,
    patch: change.fontSize ? { fontSize: change.fontSize } : {},
    anchor: conditionSignature(b),
    pin: change.pin
  }
}

describe('saving', () => {
  it('an untouched filter is saved as it was, under a marker header', async () => {
    const source = neverSink('1-REGULAR')
    const { store } = await opened(source)
    expect(await store.save()).toBe(true)
    const written = host.files.get('NeverSink (woke).filter')!
    expect(written.startsWith(WOKE_MARK)).toBe(true)
    expect(written.endsWith(source)).toBe(true)
    expect(host.files.get('NeverSink.filter')).toBe(source)
  })

  it('overwrite mode keeps the original as a .bak, once', async () => {
    const source = neverSink('1-REGULAR')
    const { store, config } = await opened(source, { saveMode: 'overwrite' })
    store.edit({ kind: 'visibility', type: 'currency', tier: 't1exalted', visibility: 'Hide' })
    await store.save()
    expect(host.files.get('NeverSink.filter.bak')).toBe(source)
    expect(host.files.get('NeverSink.filter')!.startsWith(WOKE_MARK)).toBe(true)
    // Reopening starts from the original, not from our output.
    const again = useLootFilter(() => config)
    await again.load()
    await again.save()
    expect(host.files.get('NeverSink.filter.bak')).toBe(source)
    expect(host.files.get('NeverSink.filter')!.match(new RegExp(WOKE_MARK, 'g'))).toHaveLength(1)
  })

  it('two quick saves run in turn, and the file ends up with the latest edits', async () => {
    const { store } = await opened()
    let release!: () => void
    host.writeGate = new Promise<void>(resolve => { release = resolve })
    store.edit({ kind: 'visibility', type: 'currency', tier: 't1exalted', visibility: 'Hide' })
    const first = store.save()
    store.edit({ kind: 'visibility', type: 'currency', tier: 't2divine', visibility: 'Hide' })
    const second = store.save()
    release()
    expect(await first).toBe(true)
    expect(await second).toBe(true)
    expect(host.writes).toHaveLength(2)
    const doc = inGame()
    expect(doc.blocks.find(b => b.tier === 't2divine')?.visibility).toBe('Hide')
  })

  it('a failed write says so and stays unsaved', async () => {
    const { store } = await opened()
    store.edit({ kind: 'visibility', type: 'currency', tier: 't1exalted', visibility: 'Hide' })
    host.writeFails = 1
    expect(await store.save()).toBe(false)
    expect(store.error.value).toMatch(/EPERM/)
    expect(store.dirty.value).toBe(true)
    expect(await store.save()).toBe(true)
    expect(store.error.value).toBeNull()
    expect(store.dirty.value).toBe(false)
  })

  it('a rule the game would reject is refused, and the file stays', async () => {
    const { store } = await opened()
    await store.save()
    const before = host.files.get('NeverSink (woke).filter')
    store.edit({ kind: 'style', type: 'currency', tier: 't1exalted', patch: { fontSize: 99 } })
    expect(await store.save()).toBe(false)
    expect(store.error.value).toMatch(/font size/)
    expect(host.files.get('NeverSink (woke).filter')).toBe(before)
  })

  it('tells what is unsaved', async () => {
    const { store } = await opened()
    expect(store.dirty.value).toBe(false)
    const undo = store.editWithUndo({ kind: 'visibility', type: 'currency', tier: 't1exalted', visibility: 'Hide' })
    expect(store.dirty.value).toBe(true)
    undo()
    expect(store.dirty.value).toBe(false)
  })
})

describe('reloading in game', () => {
  const area = (areaId: string, areaLevel: number) => sent.log!([{ ev: { kind: 'area', areaId, areaLevel } }])

  it('Save + reload sends the command at once, even in a map (regression)', async () => {
    const { store } = await opened()
    area('MapWorldsCemetery', 83)
    await store.save({ reloadNow: true })
    expect(sent.chat).toEqual(['/itemfilter NeverSink (woke)'])
    expect(store.pendingReload.value).toBe(false)
  })

  // GGG's macro rules: a log line or timer must never send a command.
  it('a held reload never sends by itself, in town or later', async () => {
    vi.useFakeTimers()
    try {
      const { store } = await opened()
      area('MapWorldsCemetery', 83)
      await store.save()
      expect(sent.chat).toEqual([])
      expect(store.pendingReload.value).toBe(true)
      area('HideoutFelled', 1)
      await vi.advanceTimersByTimeAsync(60000)
      expect(sent.chat).toEqual([])
      expect(store.pendingReload.value).toBe(true)
      store.reloadInGame(true)
      expect(sent.chat).toEqual(['/itemfilter NeverSink (woke)'])
      expect(store.pendingReload.value).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('a quick fix made in town sends at once: you pressed something', async () => {
    const { store } = await opened()
    area('HideoutFelled', 1)
    await store.save()
    expect(sent.chat).toEqual(['/itemfilter NeverSink (woke)'])
    expect(store.pendingReload.value).toBe(false)
  })

  it('a command that never reached the game is still waiting', async () => {
    const { store } = await opened()
    await store.save({ reloadNow: true })
    expect(store.pendingReload.value).toBe(false)
    sent.wokeEvent!({ topic: 'chat-dropped', data: { text: 'something else' } })
    expect(store.pendingReload.value).toBe(false)
    sent.wokeEvent!({ topic: 'chat-dropped', data: { text: '/itemfilter NeverSink (woke)' } })
    expect(store.pendingReload.value).toBe(true)
  })

  it('sends nothing with chat reload off', async () => {
    const { store } = await opened(undefined, { reloadViaChat: false })
    await store.save({ reloadNow: true })
    expect(sent.chat).toEqual([])
  })

  it('names the copy of an online filter, with its odd characters cleaned', async () => {
    host.online.set('qX78', { title: 'My: "best" filter', text: neverSink('1-REGULAR') })
    const config = widget({ sourceName: 'qX78', sourceOnline: true, sourceTitle: 'My: "best" filter' })
    const store = useLootFilter(() => config)
    await store.load()
    await store.save({ reloadNow: true })
    expect(outputName(config)).toBe('My best filter (woke).filter')
    expect(host.files.has('My best filter (woke).filter')).toBe(true)
    expect(sent.chat).toEqual(['/itemfilter My best filter (woke)'])
  })

  it('warns when the game has another filter selected, until we switch it', async () => {
    const { store } = await opened()
    host.gameFilter = { name: 'qX78lnfV', loaded: true }
    await store.save()
    await new Promise(resolve => setTimeout(resolve, 0))
    store.reloadInGame(true)
    expect(store.wrongFilterInGame.value).toBe(false)
  })
})

describe('the step-by-step list', () => {
  const wait = () => new Promise(resolve => setTimeout(resolve, 600))

  it('records a change, undoes and redoes it, and the file only changes on save', async () => {
    const { store, config } = await opened()
    store.edit({ kind: 'style', type: 'currency', tier: 't1exalted', patch: { fontSize: 44 } })
    await wait()
    expect(config.timeline.steps).toHaveLength(1)
    expect(config.timeline.steps[0].label).toMatch(/General currency › Tier 1: font size \d+ → 44/)
    expect(readStyle(store.doc.value!.blocks.find(b => b.tier === 't1exalted')!.actions).fontSize).toBe(44)

    store.undoStep()
    expect(config.edits).toEqual([])
    expect(config.timeline.at).toBe(0)
    expect(readStyle(store.doc.value!.blocks.find(b => b.tier === 't1exalted')!.actions).fontSize).not.toBe(44)

    store.redoStep()
    expect(config.edits).toHaveLength(1)
    expect(config.timeline.at).toBe(1)
    expect(readStyle(store.doc.value!.blocks.find(b => b.tier === 't1exalted')!.actions).fontSize).toBe(44)
    expect(host.writes).toEqual([])
  })

  it('quick changes to one setting gather into one step', async () => {
    const { store, config } = await opened()
    for (const fontSize of [30, 31, 32, 33]) store.edit({ kind: 'style', type: 'currency', tier: 't1exalted', patch: { fontSize } })
    await wait()
    expect(config.timeline.steps).toHaveLength(1)
  })

  it('an Undo note taking a change back keeps the list in step', async () => {
    const { store, config } = await opened()
    const undo = store.editWithUndo({ kind: 'visibility', type: 'currency', tier: 't1exalted', visibility: 'Hide' })
    await wait()
    undo()
    await wait()
    expect(config.timeline.steps).toHaveLength(1)
    expect(config.timeline.at).toBe(0)
    store.redoStep()
    expect(config.edits).toHaveLength(1)
  })

  it('goes back to any step, across price moves and rules too, and forward again', async () => {
    const { store, config } = await opened()
    store.edit({ kind: 'visibility', type: 'currency', tier: 't1exalted', visibility: 'Hide' })
    await wait()
    store.applyPrices([{ type: 'currency', base: 'Chaos Orb', from: 't4chaos', to: 't1exalted', chaos: 1 }])
    await wait()
    store.changeWithUndo(c => { c.presets.quiet.on = true })
    await wait()
    expect(config.timeline.steps).toHaveLength(3)
    store.goToStep(1)
    expect(config.edits).toHaveLength(1)
    expect(config.priceTiers.moves).toEqual([])
    expect(config.presets.quiet.on).toBe(false)
    await wait()
    expect(config.timeline.steps).toHaveLength(3)
    store.goToStep(3)
    expect(config.priceTiers.moves).toHaveLength(1)
    expect(config.presets.quiet.on).toBe(true)
  })

  it('a new change after going back drops the steps ahead', async () => {
    const { store, config } = await opened()
    store.edit({ kind: 'visibility', type: 'currency', tier: 't1exalted', visibility: 'Hide' })
    await wait()
    store.edit({ kind: 'visibility', type: 'currency', tier: 't2divine', visibility: 'Hide' })
    await wait()
    store.undoStep()
    store.edit({ kind: 'visibility', type: 'currency', tier: 't4chaos', visibility: 'Hide' })
    await wait()
    expect(config.timeline.steps).toHaveLength(2)
    expect(config.timeline.at).toBe(2)
    expect(config.edits.map(e => (e as { tier: string }).tier)).toEqual(['t1exalted', 't4chaos'])
  })

  it('undoing right away, before the step settled, still works', async () => {
    const { store, config } = await opened()
    store.edit({ kind: 'visibility', type: 'currency', tier: 't1exalted', visibility: 'Hide' })
    store.undoStep()
    expect(config.edits).toEqual([])
    await wait()
    expect(config.timeline.at).toBe(0)
  })

  it('a change in the last moment before the window closes still becomes a step', async () => {
    const { store, config } = await opened()
    store.edit({ kind: 'visibility', type: 'currency', tier: 't1exalted', visibility: 'Hide' })
    store.redoStep()
    expect(config.timeline.steps).toHaveLength(1)
  })

  it('presets count as how the filter came, so they show no changes to reset', async () => {
    const { store, config } = await opened()
    const size = store.sourceLook('currency', 't9armour').fontSize ?? 32
    config.presets.bigger = { on: true, size: Math.max(size + 1, 44) }
    expect(store.sourceLook('currency', 't9armour').fontSize).toBe(Math.max(size + 1, 44))
  })

  it('tells the look in the filter as it came', async () => {
    const { store } = await opened()
    const before = store.sourceLook('currency', 't1exalted').fontSize
    store.edit({ kind: 'style', type: 'currency', tier: 't1exalted', patch: { fontSize: 20 } })
    expect(store.sourceLook('currency', 't1exalted').fontSize).toBe(before)
    expect(store.sourceLook('nope', 'nope')).toEqual({})
  })
})

describe('sources', () => {
  it('an online filter is read only: saves go to a copy', async () => {
    const text = neverSink('1-REGULAR')
    host.online.set('qX78', { title: '329', text })
    const config = widget({ sourceName: 'qX78', sourceOnline: true, sourceTitle: '329' })
    const store = useLootFilter(() => config)
    await store.load()
    await store.save()
    expect(host.online.get('qX78')!.text).toBe(text)
    expect(host.files.get('329 (woke).filter')!.endsWith(text)).toBe(true)
  })

  it('opening our copy of a local filter goes back to the original', async () => {
    const { store } = await opened()
    await store.save()
    const config = widget({ sourceName: 'NeverSink (woke).filter' })
    const again = useLootFilter(() => config)
    await again.load()
    expect(again.error.value).toBeNull()
    expect(config.sourceName).toBe('NeverSink.filter')
  })

  it('opening our copy of an online filter goes back to the online one', async () => {
    host.online.set('qX78', { title: '329', text: neverSink('1-REGULAR') })
    const made = widget({ sourceName: 'qX78', sourceOnline: true, sourceTitle: '329' })
    const first = useLootFilter(() => made)
    await first.load()
    await first.save()
    const config = widget({ sourceName: '329 (woke).filter' })
    const again = useLootFilter(() => config)
    await again.listFiles()
    await again.load()
    expect(again.error.value).toBeNull()
    expect(config).toMatchObject({ sourceName: 'qX78', sourceOnline: true, sourceTitle: '329' })
  })

  it('a copy with no way back says what to do', async () => {
    host.files.set('Lost.filter', `${WOKE_MARK}\n# Made from NeverSink 8.20.2, downloaded from GitHub\nShow\n`)
    const config = widget({ sourceName: 'Lost.filter' })
    const store = useLootFilter(() => config)
    await store.load()
    expect(store.error.value).toMatch(/Pick the filter it was made from/)
  })

  it('a copy whose original is gone (the game empties OnlineFilters) recovers from itself', async () => {
    host.online.set('qX78', { title: '329', text: neverSink('1-REGULAR') })
    const made = widget({ sourceName: 'qX78', sourceOnline: true, sourceTitle: '329' })
    const first = useLootFilter(() => made)
    await first.load()
    await first.save()
    host.online.clear()
    const config = widget({ sourceName: '329 (woke).filter' })
    const again = useLootFilter(() => config)
    await again.load()
    expect(again.error.value).toBeNull()
    const source = parseFilter(neverSink('1-REGULAR'))
    expect(again.doc.value!.blocks.map(b => b.raw)).toEqual(source.blocks.map(b => b.raw))
  })

    it('a missing file is an error you can act on, not a blank screen', async () => {
    const config = widget({ sourceName: 'Gone.filter' })
    const store = useLootFilter(() => config)
    await store.load()
    expect(store.error.value).toMatch(/Can't open Gone.filter/)
    expect(store.doc.value).toBeNull()
  })

  it('with no filter picked, it starts from the newest NeverSink file', async () => {
    host.files.set('NeverSink strict.filter', neverSink('3-STRICT'))
    const config = widget()
    const store = useLootFilter(() => config)
    await store.load()
    expect(config.sourceName).toBe('NeverSink strict.filter')
  })

  it('a level picked on the dock card saves, keeps your changes, pauses auto and waits for your reload', async () => {
    for (let i = 0; i < 7; i++) host.neversink.set(`8.20.1//${i}`, neverSink(LEVELS[i]))
    const config = widget({ neversink: { on: true, version: '8.20.1', prevVersion: null, style: '', level: 1, latest: null, latestChanges: '', checkedAt: Date.now() } })
    const store = useLootFilter(() => config)
    await store.load()
    store.edit({ kind: 'visibility', type: 'currency', tier: 't1exalted', visibility: 'Hide' })
    await store.save({ noReload: true })
    sent.chat.length = 0

    await store.pickLevel(4)
    expect(config.neversink.level).toBe(4)
    expect(inGame().strictness).toBe('4-VERY-STRICT')
    expect(inGame().blocks.find(b => b.tier === 't1exalted')?.visibility).toBe('Hide')
    expect(config.strictAuto.paused).toBe(true)
    expect(store.pendingReload.value).toBe(true)
    expect(sent.chat).toEqual([])

    // The same level again does nothing.
    const writes = host.writes.length
    await store.pickLevel(4)
    expect(host.writes.length).toBe(writes)

    store.reloadInGame(true)
    expect(store.pendingReload.value).toBe(false)
    expect(sent.chat).toHaveLength(1)
  })

  it('a dock card pick that can\'t save goes back, and can be tried again', async () => {
    for (let i = 0; i < 7; i++) host.neversink.set(`8.20.1//${i}`, neverSink(LEVELS[i]))
    const config = widget({ neversink: { on: true, version: '8.20.1', prevVersion: null, style: '', level: 1, latest: null, latestChanges: '', checkedAt: Date.now() } })
    const store = useLootFilter(() => config)
    await store.load()
    host.writeFails = 1
    await store.pickLevel(4)
    expect(config.neversink.level).toBe(1)
    expect(config.strictAuto.paused).toBe(false)
    expect(store.doc.value).toBeTruthy()
    await store.pickLevel(4)
    expect(config.neversink.level).toBe(4)
    expect(inGame().strictness).toBe('4-VERY-STRICT')
  })

  it('a dock card pick of a level that can\'t load goes back to one that can', async () => {
    host.neversink.set('8.20.1//1', neverSink(LEVELS[1]))
    host.latestVersion = '8.20.1'
    const config = widget({ neversink: { on: true, version: '8.20.1', prevVersion: null, style: '', level: 1, latest: null, latestChanges: '', checkedAt: Date.now() } })
    const store = useLootFilter(() => config)
    await store.load()
    await store.pickLevel(4)
    expect(config.neversink.level).toBe(1)
    expect(config.strictAuto.paused).toBe(false)
    expect(store.doc.value).toBeTruthy()
  })

  it('a dock card pick past either end stays on the last level', async () => {
    for (let i = 0; i < 7; i++) host.neversink.set(`8.20.1//${i}`, neverSink(LEVELS[i]))
    const config = widget({ neversink: { on: true, version: '8.20.1', prevVersion: null, style: '', level: 6, latest: null, latestChanges: '', checkedAt: Date.now() } })
    const store = useLootFilter(() => config)
    await store.load()
    await store.pickLevel(9)
    expect(config.neversink.level).toBe(6)
    await store.pickLevel(-3)
    expect(config.neversink.level).toBe(0)
  })

  it('changes follow NeverSink from GitHub across strictness levels and versions', async () => {
    for (let i = 0; i < 7; i++) {
      host.neversink.set(`8.20.1//${i}`, neverSink(LEVELS[i]))
      host.neversink.set(`8.20.2//${i}`, neverSink(LEVELS[i]))
    }
    const config = widget({ neversink: { on: true, version: '8.20.1', prevVersion: null, style: '', level: 1, latest: null, latestChanges: '', checkedAt: null } })
    const store = useLootFilter(() => config)
    await store.load()
    store.edit({ kind: 'visibility', type: 'currency', tier: 't1exalted', visibility: 'Hide' })
    await store.save()
    expect(inGame().blocks.find(b => b.tier === 't1exalted')?.visibility).toBe('Hide')
    await store.setLevel(4)
    expect(store.failed.value).toEqual([])
    expect(inGame().strictness).toBe('4-VERY-STRICT')
    expect(inGame().blocks.find(b => b.tier === 't1exalted')?.visibility).toBe('Hide')
    await new Promise(resolve => setTimeout(resolve, 0))
    await store.checkForUpdate(true)
    expect(store.updateReady.value).toMatchObject({ version: '8.20.2', ok: 1, total: 1 })
    await store.updateNeverSink()
    expect(config.neversink.version).toBe('8.20.2')
    expect(inGame().blocks.find(b => b.tier === 't1exalted')?.visibility).toBe('Hide')
  })
})

describe('the edit you made is the edit the game sees', () => {
  const corpus = [...CLASS_ITEMS, ...STATE_ITEMS]
  const levels: Level[] = ['1-REGULAR', '3-STRICT', '6-UBER-PLUS-STRICT']

  // Every item, in the filter the way you'd meet it: hide it, restyle it, pin it.
  describe.each(levels)('%s', (level) => {
    it.each(corpus.map(i => [i.name, i.text]))('%s: hide, restyle, always show', (_name, text) => {
      const source = neverSink(level)
      const f = facts(text)
      const start = parseFilter(source)
      const before = matchItem(start, f)
      if (!before.final || !f.baseType) return
      const apply = (edit: Omit<FilterEdit, 'id'>) => {
        const doc = parseFilter(source)
        const list = [{ ...edit, id: 1 }] as FilterEdit[]
        const res = applyAll(doc, list)
        expect(res.every(r => r.ok), 'applied').toBe(true)
        return matchItem(parseFilter(serializeFilter(doc)), f)
      }
      const hidden = apply(ownRule(start, f, { visibility: 'Hide' }))
      expect(hidden.visibility).toBe('Hide')
      const big = apply(ownRule(start, f, { visibility: 'Show', fontSize: 44 }))
      expect(big.visibility).toBe('Show')
      expect(readStyle(big.actions).fontSize).toBe(44)
      const pinned = apply(ownRule(start, f, { visibility: 'Show', pin: true }))
      expect(pinned.visibility).toBe('Show')
      expect(pinned.final!.block.type).toBe(OWN_RULE_TYPE)
    })
  })

  it('a pinned rule also holds in every area level', () => {
    const source = neverSink('3-STRICT')
    const f = facts(fixture('items/currency-divine.txt'))
    const doc = parseFilter(source)
    applyAll(doc, [{ ...ownRule(doc, f, { visibility: 'Show', pin: true }), id: 1 }])
    const out = parseFilter(serializeFilter(doc))
    for (const areaLevel of [1, 30, 68, 83, 86]) expect(matchItem(out, { ...f, areaLevel }).final!.block.type).toBe(OWN_RULE_TYPE)
  })

  it('every listed item of a group can move to every other tier and be found there', () => {
    const source = neverSink('1-REGULAR')
    const start = parseFilter(source)
    let tried = 0
    const types = [...new Set(start.blocks.filter(b => !b.disabled && b.type).map(b => b.type!))]
    for (const type of types) {
      const targets = moveTargets(start, type)
      if (targets.length < 2) continue
      const from = start.blocks.find(b => b.type === type && !b.disabled && b.conditions.some(c => c.key === 'BaseType' && c.op === '==' && c.values.length))
      if (!from) continue
      const base = from.conditions.find(c => c.key === 'BaseType' && c.op === '==')!.values[0]
      for (const to of targets) {
        if (to === from.tier) continue
        const doc = parseFilter(source)
        const [res] = applyAll(doc, [{ id: 1, kind: 'move', type, base, from: from.tier!, to }])
        expect(res.ok, `${type}: ${base} to ${to}`).toBe(true)
        const out = parseFilter(serializeFilter(doc))
        // A tier this strictness turned off lists it too, and stays off.
        const live = out.blocks.filter(b => b.type === type && b.conditions.some(c => c.key === 'BaseType' && c.op === '==' && c.values.includes(base))).map(b => b.tier)
        expect(live, `${type}: ${base} to ${to}`).toContain(to)
        expect(live, `${type}: ${base} still in ${from.tier}`).not.toContain(from.tier)
        tried++
      }
    }
    expect(tried).toBeGreaterThan(50)
  })

  it('every tier of every group can be hidden, shown and restyled, and it parses back', () => {
    const source = neverSink('1-REGULAR')
    const start = parseFilter(source)
    const tiers = new Set(start.blocks.filter(b => b.type && b.tier).map(b => `${b.type}|${b.tier}`))
    const edits: FilterEdit[] = [...tiers].flatMap((key, i) => {
      const [type, tier] = key.split('|')
      return i % 2
        ? [{ id: i, kind: 'visibility', type, tier, visibility: 'Hide' } as FilterEdit]
        : [{ id: i, kind: 'style', type, tier, patch: { fontSize: 33, text: [1, 2, 3, 255], background: [4, 5, 6, 255], border: null, sound: { id: '3', volume: 200 }, effect: { color: 'Red', temp: true }, icon: { size: 1, color: 'Blue', shape: 'Star' } } } as FilterEdit]
    })
    const doc = parseFilter(source)
    expect(applyAll(doc, edits).every(r => r.ok)).toBe(true)
    const out = parseFilter(serializeFilter(doc))
    expect(out.blocks.length).toBe(start.blocks.length)
    const again = parseFilter(serializeFilter(out))
    expect(again.blocks.map(b => b.actions)).toEqual(out.blocks.map(b => b.actions))
  })
})

describe('regressions', () => {
  it('an edit to a unique map is keyed by "Map (Tier 16)", which the game matches', () => {
    const text = 'Item Class: Maps\nRarity: Unique\nMaelström of Chaos\nMap (Tier 16)\n--------\nMap Tier: 16\n--------\nItem Level: 83\n--------\nTravel to this Map by using it in a personal Map Device.\n'
    const f = facts(text)
    expect(f.baseType).toBe('Map (Tier 16)')
    const doc = parseFilter(neverSink('1-REGULAR'))
    const m = matchItem(doc, f)
    expect(m.final).not.toBeNull()
    applyAll(doc, [{ ...ownRule(doc, f, { visibility: 'Hide' }), id: 1 }])
    const out = parseFilter(serializeFilter(doc))
    expect(matchItem(out, f).visibility).toBe('Hide')
    expect(host.files.size).toBe(0)
  })

  it('a rare and a magic item of one base each keep their own rule', () => {
    const source = 'Show # $type->rings $tier->rare\n\tRarity Rare\n\tClass == "Rings"\n\nShow # $type->rings $tier->magic\n\tRarity Magic\n\tClass == "Rings"\n'
    let list: FilterEdit[] = []
    list = addTo(list, { id: 1, kind: 'item', type: 'rings', tier: 'rare', base: 'Gold Ring', visibility: 'Hide', patch: {} })
    list = addTo(list, { id: 2, kind: 'item', type: 'rings', tier: 'magic', base: 'Gold Ring', visibility: 'Show', patch: { fontSize: 44 } })
    expect(list).toHaveLength(2)
    const doc = parseFilter(source)
    applyAll(doc, list)
    const out = parseFilter(serializeFilter(doc))
    const ring = { name: 'x', itemClass: 'Rings', baseType: 'Gold Ring', influences: [], explicitModNames: [] }
    expect(matchItem(out, { ...ring, rarity: 'Rare' }).visibility).toBe('Hide')
    expect(readStyle(matchItem(out, { ...ring, rarity: 'Magic' }).actions).fontSize).toBe(44)
  })

  it('the own rule copies the block the item hit, not the first of its tier', () => {
    const source = 'Show # $type->gear $tier->good\n\tItemLevel >= 86\n\tClass == "Rings"\n\nShow # $type->gear $tier->good\n\tItemLevel >= 60\n\tClass == "Rings"\n'
    const doc = parseFilter(source)
    const f: ItemFacts = { name: 'x', itemClass: 'Rings', baseType: 'Gold Ring', itemLevel: 70, influences: [], explicitModNames: [] }
    applyAll(doc, [{ ...ownRule(doc, f, { visibility: 'Hide' }), id: 1 }])
    expect(matchItem(parseFilter(serializeFilter(doc)), f).visibility).toBe('Hide')
  })

  it('an own rule follows its item to a tier higher up', () => {
    const source = 'Show # $type->currency $tier->t1\n\tBaseType == "Mirror of Kalandra"\n\nShow # $type->currency $tier->t3\n\tBaseType == "Chaos Orb"\n'
    const doc = parseFilter(source)
    applyAll(doc, [
      { id: 1, kind: 'move', type: 'currency', base: 'Chaos Orb', from: 't3', to: 't1' },
      { id: 2, kind: 'item', type: 'currency', tier: 't3', base: 'Chaos Orb', visibility: 'Hide', patch: {} }
    ])
    const f: ItemFacts = { name: 'x', itemClass: 'Stackable Currency', baseType: 'Chaos Orb', influences: [], explicitModNames: [] }
    expect(matchItem(parseFilter(serializeFilter(doc)), f).visibility).toBe('Hide')
  })

  it('moving one stack tier of a base leaves its other stack tiers alone', () => {
    const source = 'Show # $type->h $tier->t1\n\tStackSize >= 100\n\tBaseType == "Wild"\n\nShow # $type->h $tier->t2\n\tStackSize >= 10\n\tBaseType == "Wild" "Vivid"\n\nShow # $type->h $tier->t3\n\tStackSize >= 1\n\tBaseType == "Wild"\n\nShow # $type->h $tier->t4\n\tStackSize >= 1\n\tBaseType == "Other"\n'
    const doc = parseFilter(source)
    applyAll(doc, [{ id: 1, kind: 'move', type: 'h', base: 'Wild', from: 't2', to: 't4' }])
    const lists = parseFilter(serializeFilter(doc)).blocks.map(b => [b.tier, b.conditions.find(c => c.key === 'BaseType')!.values])
    expect(lists).toEqual([['t1', ['Wild']], ['t2', ['Vivid']], ['t3', ['Wild']], ['t4', ['Other', 'Wild']]])
  })

  it('a move whose tier no longer has the item still finds it', () => {
    const source = 'Show # $type->c $tier->t1\n\tBaseType == "A"\n\nShow # $type->c $tier->t2\n\tBaseType == "B"\n\nShow # $type->c $tier->t3\n\tBaseType == "C"\n'
    const doc = parseFilter(source)
    expect(applyAll(doc, [{ id: 1, kind: 'move', type: 'c', base: 'A', from: 't2', to: 't3' }])[0].ok).toBe(true)
    expect(parseFilter(serializeFilter(doc)).blocks.map(b => b.disabled)).toEqual([true, false, false])
  })

  it('moving into a tier commented out for being empty brings it back', () => {
    const source = 'Show # $type->currency $tier->t1\n\tBaseType == "Mirror of Kalandra"\n\n#Show # $type->currency $tier->t2\n#\tBaseType == \n#\tSetFontSize 40\n'
    const doc = parseFilter(source)
    expect(moveTargets(doc, 'currency')).toEqual(['t1', 't2'])
    const [res] = applyAll(doc, [{ id: 1, kind: 'move', type: 'currency', base: 'Mirror of Kalandra', from: 't1', to: 't2' }])
    expect(res.ok).toBe(true)
    const out = parseFilter(serializeFilter(doc))
    expect(out.blocks.map(b => [b.tier, b.disabled])).toEqual([['t1', true], ['t2', false]])
    const f: ItemFacts = { name: 'x', baseType: 'Mirror of Kalandra', influences: [], explicitModNames: [] }
    expect(matchItem(out, f).final?.block.tier).toBe('t2')
  })

  it('a rule with no tags can be restyled, hidden and given an own rule', () => {
    const source = '# FilterBlade: Conditional Entry\nHide\nSetFontSize 18\nClass == "Stackable Currency"\nBaseType == "Alteration Shard" "Alchemy Shard"\n'
    const start = parseFilter(source)
    const f: ItemFacts = { name: 'x', itemClass: 'Stackable Currency', baseType: 'Alchemy Shard', influences: [], explicitModNames: [] }
    const b = matchItem(start, f).final!.block
    const [own] = applyAll(parseFilter(source), [{ ...ownRule(start, f, { visibility: 'Show', fontSize: 44 }), id: 1 }])
    expect(own.ok).toBe(true)
    const doc = parseFilter(source)
    const res = applyAll(doc, [
      { id: 1, kind: 'visibility', type: b.type!, tier: b.tier!, visibility: 'Show' },
      { id: 2, kind: 'style', type: b.type!, tier: b.tier!, patch: { fontSize: 40 } }
    ])
    expect(res.every(r => r.ok)).toBe(true)
    const out = matchItem(parseFilter(serializeFilter(doc)), f)
    expect(out.visibility).toBe('Show')
    expect(readStyle(out.actions).fontSize).toBe(40)
  })

  it('moving into a tier this strictness turned off leaves that tier off', () => {
    const source = neverSink('3-STRICT')
    const start = parseFilter(source)
    const off = start.blocks.find(b => b.disabled && b.type === 'rr' && b.conditions.some(c => c.key === 'BaseType' && c.values.length > 5))!
    const live = start.blocks.find(b => !b.disabled && b.type === 'rr' && b.conditions.some(c => c.key === 'BaseType' && c.values.length))!
    const base = live.conditions.find(c => c.key === 'BaseType')!.values[0]
    expect(moveTargets(start, 'rr')).toContain(off.tier)
    const doc = parseFilter(source)
    const [res] = applyAll(doc, [{ id: 1, kind: 'move', type: 'rr', base, from: live.tier!, to: off.tier! }])
    expect(res.ok).toBe(true)
    const out = parseFilter(serializeFilter(doc))
    const after = out.blocks.filter(b => b.tier === off.tier && b.type === 'rr')
    expect(after.every(b => b.disabled)).toBe(true)
    expect(after[0].conditions.find(c => c.key === 'BaseType')!.values).toContain(base)
    // Everything else about the file's live rules stays put.
    const live2 = (d: ReturnType<typeof parseFilter>) => d.blocks.filter(b => !b.disabled && b.tier !== live.tier).map(b => b.tier)
    expect(live2(out)).toEqual(live2(start))
  })

  it('separate moves of a base listed in several tiers stay separate', () => {
    let list: FilterEdit[] = []
    list = addTo(list, { id: 1, kind: 'move', type: 'h', base: 'Wild', from: 'single', to: 'low' })
    list = addTo(list, { id: 2, kind: 'move', type: 'h', base: 'Wild', from: 'stack3', to: 'other' })
    expect(list).toHaveLength(2)
    list = addTo(list, { id: 3, kind: 'move', type: 'h', base: 'Wild', from: 'single2', to: 'stack3' })
    expect(list).toHaveLength(3)
    // A chain still folds, and going back still undoes it.
    list = addTo(list, { id: 4, kind: 'move', type: 'h', base: 'Wild', from: 'low', to: 'lower' })
    expect(list).toHaveLength(3)
    expect(list[0]).toMatchObject({ from: 'single', to: 'lower' })
    list = addTo(list, { id: 5, kind: 'move', type: 'h', base: 'Wild', from: 'lower', to: 'single' })
    expect(list).toHaveLength(2)
  })

  it('an own rule stays above its item when the item is moved up afterwards', () => {
    const source = 'Show # $type->currency $tier->t1\n\tBaseType == "Mirror of Kalandra"\n\nShow # $type->currency $tier->t3\n\tBaseType == "Chaos Orb"\n'
    const doc = parseFilter(source)
    const res = applyAll(doc, [
      { id: 2, kind: 'item', type: 'currency', tier: 't3', base: 'Chaos Orb', visibility: 'Hide', patch: {} },
      { id: 1, kind: 'move', type: 'currency', base: 'Chaos Orb', from: 't3', to: 't1' }
    ])
    expect(res.map(r => r.edit.id)).toEqual([2, 1])
    const f: ItemFacts = { name: 'x', itemClass: 'Stackable Currency', baseType: 'Chaos Orb', influences: [], explicitModNames: [] }
    expect(matchItem(parseFilter(serializeFilter(doc)), f).visibility).toBe('Hide')
  })

  it('an edit made while a save runs still reads as unsaved', async () => {
    const { store } = await opened()
    let release!: () => void
    host.writeGate = new Promise<void>(resolve => { release = resolve })
    store.edit({ kind: 'visibility', type: 'currency', tier: 't1exalted', visibility: 'Hide' })
    const saving = store.save()
    await new Promise(resolve => setTimeout(resolve, 0))
    store.edit({ kind: 'visibility', type: 'currency', tier: 't2divine', visibility: 'Hide' })
    release()
    await saving
    expect(store.dirty.value).toBe(true)
    await store.save()
    expect(store.dirty.value).toBe(false)
    expect(inGame().blocks.find(b => b.tier === 't2divine')?.visibility).toBe('Hide')
  })

  it('rules with no tags are not tiers to move items between, and read in words', () => {
    const doc = parseFilter('#[[1000]] Mine\nShow\n\tBaseType == "A"\n\nShow\n\tBaseType == "B"\n')
    const type = doc.blocks[0].type!
    expect(moveTargets(doc, type)).toEqual([])
    const label = describeOf({ id: 1, kind: 'style', type, tier: doc.blocks[0].tier!, patch: {} })
    expect(label).toBe('Restyled Mine')
    expect(rehomeLabels(doc, { id: 1, kind: 'style', type, tier: '#gone', patch: {} }).every(l => !l.includes('#') && !l.includes('untagged'))).toBe(true)
  })

  it('an own rule keeps its look when its tier or group is hidden afterwards', () => {
    const source = 'Show # $type->c $tier->t1\n\tBaseType == "X" "Y"\n\tPlayAlertSound 1 100\n\tPlayEffect Red\n\tMinimapIcon 1 Red Star\n'
    const f: ItemFacts = { name: 'x', baseType: 'X', influences: [], explicitModNames: [] }
    for (const after of [{ id: 2, kind: 'visibility', type: 'c', tier: 't1', visibility: 'Hide' }, { id: 2, kind: 'group', type: 'c', hidden: true }] as FilterEdit[]) {
      const doc = parseFilter(source)
      applyAll(doc, [{ id: 1, kind: 'item', type: 'c', tier: 't1', base: 'X', visibility: 'Show', patch: {}, pin: true }, after])
      const m = matchItem(parseFilter(serializeFilter(doc)), f)
      expect(m.visibility).toBe('Show')
      expect(m.actions.map(a => a.key)).toEqual(['PlayAlertSound', 'PlayEffect', 'MinimapIcon'])
    }
  })

  it('an own rule can be hidden by the tier it is, after it exists', () => {
    const doc = parseFilter('Show # $type->c $tier->t1\n\tBaseType == "X"\n')
    const own = applyAll(doc, [{ id: 7, kind: 'item', type: 'c', tier: 't1', base: 'X', visibility: 'Show', patch: {} }])
    expect(own[0].ok).toBe(true)
    const tier = doc.blocks[0].tier!
    const again = parseFilter('Show # $type->c $tier->t1\n\tBaseType == "X"\n')
    const res = applyAll(again, [
      { id: 7, kind: 'item', type: 'c', tier: 't1', base: 'X', visibility: 'Show', patch: {} },
      { id: 8, kind: 'visibility', type: OWN_RULE_TYPE, tier, visibility: 'Hide' }
    ])
    expect(res.every(r => r.ok)).toBe(true)
  })

  it('moves of a base listed in several tiers never chain, so nothing stays behind', () => {
    const source = 'Show # $type->h $tier->a\n\tBaseType == "X"\n\nShow # $type->h $tier->b\n\tBaseType == "X"\n\nShow # $type->h $tier->d\n\tBaseType == "Z"\n'
    let list: FilterEdit[] = []
    const add = (id: number, from: string, to: string) => { list = addTo(list, { id, kind: 'move', type: 'h', base: 'X', from, to }, { separateMoves: true }) }
    add(1, 'b', 'a')
    add(2, 'a', 'd')
    expect(list).toHaveLength(2)
    const doc = parseFilter(source)
    applyAll(doc, list)
    const has = parseFilter(serializeFilter(doc)).blocks.filter(b => !b.disabled && b.conditions[0].values.includes('X')).map(b => b.tier)
    expect(has).toEqual(['d'])
    add(3, 'd', 'a')
    expect(list).toHaveLength(1)
  })

  it('the store tells a base in several tiers from one in a single tier', async () => {
    const { store, config } = await opened('Show # $type->h $tier->a\n\tBaseType == "X" "O"\n\nShow # $type->h $tier->b\n\tBaseType == "X"\n\nShow # $type->h $tier->d\n\tBaseType == "Z"\n')
    store.edit({ kind: 'move', type: 'h', base: 'X', from: 'b', to: 'a' })
    store.edit({ kind: 'move', type: 'h', base: 'X', from: 'a', to: 'd' })
    expect(config.edits).toHaveLength(2)
    store.edit({ kind: 'move', type: 'h', base: 'O', from: 'a', to: 'b' })
    store.edit({ kind: 'move', type: 'h', base: 'O', from: 'b', to: 'd' })
    expect(config.edits).toHaveLength(3)
    expect(config.edits[2]).toMatchObject({ base: 'O', from: 'a', to: 'd' })
  })

  it('two own rules with the same tier name in different groups stay apart', () => {
    const doc = parseFilter('Show # $type->x $tier->t2\n\tRarity Rare\n\nShow # $type->y $tier->t2\n\tRarity Magic\n')
    applyAll(doc, [
      { id: 1, kind: 'item', type: 'x', tier: 't2', base: 'Mask', visibility: 'Hide', patch: {} },
      { id: 2, kind: 'item', type: 'y', tier: 't2', base: 'Mask', visibility: 'Show', patch: {} }
    ])
    expect(new Set(doc.blocks.filter(b => b.type === OWN_RULE_TYPE).map(b => b.tier)).size).toBe(2)
  })

  it('reads the editor\'s groups and own rules in words', () => {
    const doc = parseFilter('#[[1]] Mine\nShow\n\tRarity Rare\n')
    applyAll(doc, [{ id: 1, kind: 'item', type: doc.blocks[0].type!, tier: doc.blocks[0].tier!, base: 'Mask', visibility: 'Hide', patch: { fontSize: 99 } }])
    const own = doc.blocks[0]
    expect(own.type).toBe(OWN_RULE_TYPE)
    expect(tierName(own)).toBe('Mask')
    expect(ruleLabel(own.type, own.tier)).toBe('Your own rules')
    expect(tierName(doc.blocks[1])).toBe('Rule')
    expect(describeOf({ id: 1, kind: 'style', type: 'woke->build', tier: 'gems', patch: {} })).toBe('Restyled Your build › Gems')
    const homes = rehomeLabels(doc, { id: 1, kind: 'move', type: doc.blocks[1].type!, base: 'A', from: 'x', to: 'y' })
    expect(homes.every(h => !h.includes('#'))).toBe(true)
  })

  it('a tier emptied of its only item by a move, off at this strictness, stays off', () => {
    const doc = parseFilter('Show # $type->c $tier->a\n\tBaseType == "Q"\n\n#Show # $type->c $tier->off\n#\tBaseType == "X"\n')
    applyAll(doc, [
      { id: 1, kind: 'move', type: 'c', base: 'X', from: 'off', to: 'a' },
      { id: 2, kind: 'move', type: 'c', base: 'Q', from: 'a', to: 'off' }
    ])
    expect(doc.blocks.find(b => b.tier === 'off')!.disabled).toBe(true)
  })

  it('a live tier emptied by a move comes back when an item moves in', () => {
    const doc = parseFilter('Show # $type->c $tier->a\n\tBaseType == "X"\n\nShow # $type->c $tier->b\n\tBaseType == "Q"\n')
    applyAll(doc, [
      { id: 1, kind: 'move', type: 'c', base: 'X', from: 'a', to: 'b' },
      { id: 2, kind: 'move', type: 'c', base: 'Q', from: 'b', to: 'a' }
    ])
    expect(doc.blocks.map(b => b.disabled)).toEqual([false, false])
  })

  it('a rare and a magic own rule of one base are separate rules to restyle', () => {
    const doc = parseFilter('Show # $type->rings $tier->rare\n\tRarity Rare\n\nShow # $type->rings $tier->magic\n\tRarity Magic\n')
    applyAll(doc, [
      { id: 1, kind: 'item', type: 'rings', tier: 'rare', base: 'Gold Ring', visibility: 'Hide', patch: {} },
      { id: 2, kind: 'item', type: 'rings', tier: 'magic', base: 'Gold Ring', visibility: 'Show', patch: {} }
    ])
    const own = doc.blocks.filter(b => b.type === OWN_RULE_TYPE)
    expect(own.map(b => b.editId)).toEqual([1, 2])
    expect(new Set(own.map(b => b.tier)).size).toBe(2)
  })

  it('always show, then hide, leaves no beam or icon on the hidden item', () => {
    let list: FilterEdit[] = []
    list = addTo(list, { id: 1, kind: 'item', type: 'c', tier: 't', base: 'X', visibility: 'Show', patch: { effect: { color: 'Red', temp: true }, icon: { size: 1, color: 'Red', shape: 'Star' }, sound: { id: '1', volume: 100 } } })
    list = addTo(list, { id: 2, kind: 'item', type: 'c', tier: 't', base: 'X', visibility: 'Hide', patch: {} })
    expect(list).toHaveLength(1)
    const doc = parseFilter('Show # $type->c $tier->t\n\tBaseType == "X"\n')
    applyAll(doc, list)
    const own = doc.blocks.find(b => b.type === OWN_RULE_TYPE)!
    expect(own.actions.map(a => a.key).filter(k => /Effect|Icon|Sound$/.test(k) && k !== 'DisableDropSound')).toEqual([])
  })

  it('a block brought back from commented out writes clean lines', () => {
    const doc = parseFilter('#Show # $type->c $tier->t\n#\tBaseType == \n\nShow # $type->c $tier->u\n\tBaseType == "X"\n')
    applyAll(doc, [{ id: 1, kind: 'move', type: 'c', base: 'X', from: 'u', to: 't' }])
    expect(formatBlock(doc.blocks[0])).toEqual(['Show # $type->c $tier->t', '\tBaseType == "X"'])
  })
})

// Imported late so the mocks above are in place for the store's own imports.
import { addEdit as addTo, applyEdits as applyAll } from '@/web/woke/loot-filter/edits'

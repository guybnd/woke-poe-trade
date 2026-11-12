// The loot filter store against a fake folder and game: strictness switches
// that can't save, and the safety net's remembered stacks without prices.
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { reactive, ref, shallowRef } from 'vue'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { useLootFilter } from '@/web/woke/loot-filter/store'
import { initLootFilterWidget } from '@/web/woke/loot-filter/widget'
import type { LootFilterWidget } from '@/web/woke/loot-filter/widget'
import { SAFETY_RULE_TYPE } from '@/web/woke/loot-filter/safety'
import { loadGameData } from '../helpers/game-data'
import { LEVELS, neverSink } from '../helpers/neversink'
import { fakeHost } from '../helpers/filter-host'
import type { FakeHost } from '../helpers/filter-host'

const sent = vi.hoisted(() => ({ host: null as FakeHost | null, log: null as null | ((lines: unknown[]) => void), toasts: [] as string[] }))

vi.mock('@/web/woke/shared/host', () => ({ hostRequest: (name: string, args: Record<string, unknown>) => sent.host!.request(name, args) }))
vi.mock('@/web/background/IPC', () => ({
  MainProcess: { sendEvent () {}, onEvent: () => ({ abort () {} }) },
  Host: {}
}))
vi.mock('@/web/woke/shared/game-log', () => ({ onGameLog: (fn: (lines: unknown[]) => void) => { sent.log = fn; return () => {} } }))
vi.mock('@/web/woke/loot-filter/build-input', () => ({ useBuildRuleInput: () => ref(null) }))
vi.mock('@/web/woke/loot-filter/prices', () => ({ useFilterPrices: () => ({ lookup: shallowRef(null), safety: shallowRef(null), currentLeague: shallowRef('Test'), updatedAt: shallowRef(null), wantPrices () {} }) }))
vi.mock('@/web/woke/loot-filter/active-filter', () => ({ publishActiveFilter () {} }))
vi.mock('@/web/woke/loot-filter/sounds', () => ({ customSoundsIn: () => [], installPackSounds: async () => 0 }))
vi.mock('@/web/woke/ui', () => ({ toast: (text: string) => { sent.toasts.push(text) } }))

beforeAll(loadGameData)

let host: FakeHost
beforeEach(() => {
  host = fakeHost()
  sent.host = host
  sent.toasts = []
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

function widget (over: Partial<LootFilterWidget> = {}): LootFilterWidget {
  const w = { wmId: 1, wmType: 'woke-loot-filter', wmTitle: '', wmWants: 'show', wmZorder: null, wmFlags: [] } as unknown as LootFilterWidget
  initLootFilterWidget(w)
  return reactive(Object.assign(w, over)) as LootFilterWidget
}

async function fromGitHub (level = 1) {
  for (let i = 0; i < 7; i++) host.neversink.set(`8.20.1//${i}`, neverSink(LEVELS[i]))
  const config = widget({ neversink: { on: true, version: '8.20.1', prevVersion: null, style: '', level, latest: null, latestChanges: '', checkedAt: Date.now() } })
  const store = useLootFilter(() => config)
  await store.load()
  return { store, config }
}

describe('strictness switches that can\'t save (L3)', () => {
  it('a key press that can\'t save goes back, says why, and can be tried again', async () => {
    const { store, config } = await fromGitHub()
    host.writeFails = 1
    await store.stepLevel(1)
    expect(config.neversink.level).toBe(1)
    expect(config.strictAuto.paused).toBe(false)
    expect(store.doc.value?.strictness).toBe('1-REGULAR')
    expect(sent.toasts.at(-1)).toMatch(/^Couldn't switch to .*EPERM/)
    await store.stepLevel(1)
    expect(config.neversink.level).toBe(2)
    expect(parseFilter(host.writes.at(-1)!.text).strictness).toBe('2-SEMI-STRICT')
  })

  it('the ladder goes back when it can\'t save, and switches in the next town', async () => {
    const { store, config } = await fromGitHub()
    sent.log!([{ ev: { kind: 'area', areaId: 'MapWorldsStrand', areaLevel: 83 } }])
    host.writeFails = 1
    store.resumeLadder()
    await vi.waitFor(() => expect(sent.toasts.at(-1)).toMatch(/^Couldn't switch/))
    await vi.waitFor(() => expect(store.loading.value).toBe(false))
    expect(config.neversink.level).toBe(1)
    expect(store.doc.value?.strictness).toBe('1-REGULAR')
    store.resumeLadder()
    await vi.waitFor(() => expect(parseFilter(host.writes.at(-1)?.text ?? '').strictness).toBe('4-VERY-STRICT'))
    expect(config.neversink.level).toBe(4)
  })
})

describe('the safety net without prices', () => {
  const netStacks = (store: Awaited<ReturnType<typeof fromGitHub>>['store']) =>
    store.doc.value!.blocks.filter(b => b.type === SAFETY_RULE_TYPE && b.tier?.startsWith('stacks'))

  async function withRemembered (line: number) {
    const { store, config } = await fromGitHub()
    config.safetyNet = { on: true, minChaos: 20, last: { plain: [], unique: [], line, stacks: { 10: ['Orb of Alchemy', 'Chaos Orb'] } } }
    await store.load()
    return { store, config }
  }

  it('keeps remembered stacks at the line they were worked out for (L8)', async () => {
    const { store } = await withRemembered(20)
    expect(netStacks(store).flatMap(b => b.conditions.find(c => c.key === 'BaseType')!.values)).toEqual(['Orb of Alchemy', 'Chaos Orb'])
  })

  it('drops remembered stacks once the line is raised (L8)', async () => {
    const { store, config } = await withRemembered(20)
    config.safetyNet.minChaos = 50
    await store.load()
    expect(netStacks(store)).toEqual([])
  })

  it('leaves out a remembered stack you said isn\'t for you (L8)', async () => {
    const { store, config } = await withRemembered(20)
    config.netDismissed = { 'currency|Chaos Orb': Date.now() }
    await store.load()
    expect(netStacks(store).flatMap(b => b.conditions.find(c => c.key === 'BaseType')!.values)).toEqual(['Orb of Alchemy'])
  })

  it('the drop sound volume preset turns the net\'s sound down too (M5)', async () => {
    const { store, config } = await withRemembered(20)
    config.presets.volume = { on: true, percent: 50 }
    await store.load()
    const sound = netStacks(store)[0].actions.find(a => a.key === 'PlayAlertSound')
    expect(sound?.args).toEqual(['6', '100'])
  })
})

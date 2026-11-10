// Splitting a local line two mods add up to into its mods, boxing a hybrid's
// lines together and searching that one mod; and "Adds # to #" lines' numbers.
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { loadGameData, fixture, parseItem } from '../helpers/game-data'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import { provideStatActions } from '@/web/woke/price-insight/stat-actions'
import { rollPair } from '@/web/woke/price-insight/roll-pair'

// The menu and toasts need a page; nothing here opens one.
vi.mock('@/web/woke/ui', () => ({ openMenu: vi.fn(), copyText: vi.fn(), toast: vi.fn() }))
vi.mock('@/web/woke/price-insight/window-style', () => ({ poeOn: { value: true } }))

function setup (name: string) {
  const item = parseItem(fixture(`items/${name}`))
  const stats = ref<FilterOrGroup[]>(initUiModFilters(item, { searchStatRange: 10 }))
  // provide() outside a component only warns.
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const actions = provideStatActions(ref(item), stats, () => 10, undefined)
  warn.mockRestore()
  const rows = () => stats.value.filter((f): f is StatFilter => !f.group)
  const row = (text: string) => rows().find(f => f.text.includes(text) && !actions.isChild(f))!
  return { stats, actions, rows, row }
}

describe('a local line two mods add up to', () => {
  beforeAll(loadGameData)

  it('splits into one row per mod, the hybrid boxed with its other line', () => {
    const { actions, rows, row } = setup('rare-body-armour-es.txt')
    const line = row('increased Energy Shield')
    expect(actions.canSplit(line)).toBe(true)
    const before = rows().map(f => f.text)

    actions.toggleSplit(line)
    const list = rows()
    const at = list.findIndex(f => f.text === line.text && !actions.isChild(f))
    const [a, b, c] = list.slice(at + 1, at + 4)
    expect([a.roll?.value, b.roll?.value]).toEqual([120, 42])
    expect([a, b].every(f => actions.isChild(f) && f.disabled && f.inTotal)).toBe(true)
    expect(c.text).toContain('Stun and Block Recovery')
    expect(actions.hybridPart(a)).toBeUndefined()
    expect(actions.hybridPart(b)).toMatchObject({ first: true, last: false })
    expect(actions.hybridPart(c)).toMatchObject({ first: false, last: true })
    // The stun line moved, so it is listed once.
    expect(list.filter(f => f.text.includes('Stun and Block Recovery'))).toHaveLength(1)

    actions.toggleSplit(line)
    expect(rows().map(f => f.text)).toEqual(before)
    expect(actions.hybridPart(c)).toBeUndefined()
  })

  it('searching the hybrid ticks each of its lines at the bottom of its tier', () => {
    const { actions, rows, row } = setup('rare-body-armour-es.txt')
    actions.searchMod(row('Stun and Block Recovery'))
    const picked = rows().filter(f => !f.disabled && f.sources.length === 1 && f.sources[0].modifier.info.name === "Seraphim's")
    expect(picked.map(f => [f.statRef, f.roll?.min])).toEqual([
      ['#% increased Energy Shield', 39],
      ['#% increased Stun and Block Recovery', 17]
    ])
    // The other mod's share stays unticked.
    expect(rows().find(f => f.roll?.value === 120 && f.inTotal)!.disabled).toBe(true)
  })

  it('folding puts a moved line back under the row it followed, even right under the line', () => {
    const { stats, actions, rows, row } = setup('rare-body-armour-es.txt')
    // Stun right under the 162% line, then the rest.
    const list = stats.value
    const stun = list.splice(list.indexOf(row('Stun and Block Recovery')), 1)[0]
    list.splice(list.indexOf(row('increased Energy Shield')) + 1, 0, stun)
    const before = rows().map(f => f.text)
    const line = row('increased Energy Shield')
    actions.toggleSplit(line)
    actions.toggleSplit(line)
    expect(rows().map(f => f.text)).toEqual(before)
  })

  it('a new preset list folds the split, moved line included', async () => {
    const { stats, actions, rows, row } = setup('rare-body-armour-es.txt')
    const first = stats.value
    const before = rows().map(f => f.text)
    actions.toggleSplit(row('increased Energy Shield'))
    stats.value = [...first.slice(0, 1)]
    await nextTick()
    stats.value = first
    await nextTick()
    expect(rows().map(f => f.text)).toEqual(before)
  })

  it('searching a hybrid includes an excluded line of it again', () => {
    const { actions, rows, row } = setup('rare-body-armour-es.txt')
    const stun = row('Stun and Block Recovery')
    stun.not = true
    actions.searchMod(stun)
    const picked = rows().find(f => f.text.includes('Stun and Block Recovery'))!
    expect(picked.not).toBeUndefined()
    expect(picked.roll?.min).toBe(17)
  })

  it('a hybrid on its own lines searches from the right-click action without a split', () => {
    const { actions, rows, row } = setup('rare-body-armour-ar-ev.txt')
    actions.searchMod(row('to Armour'))
    const picked = rows().filter(f => !f.disabled && f.inTotal)
    expect(picked.map(f => [f.statRef, f.roll?.min])).toEqual([
      ['+# to Armour', 81],
      ['+# to Evasion Rating', 73]
    ])
  })
})

describe('Adds # to # lines', () => {
  beforeAll(loadGameData)

  it('read with both rolled numbers', () => {
    const { row } = setup('rare-sword-local-phys.txt')
    expect(rollPair(row('Adds'))).toEqual([30, 60])
    expect(rollPair(row('increased Attack Speed'))).toBeUndefined()
  })
})

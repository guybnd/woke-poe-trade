// The run hotkey on an unidentified unique: it copies as its base, so with one
// unique on that base it's held as that unique, with several it's refused
// (before, it was priced as a white base).
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadGameData } from '../helpers/game-data'

const toasts = vi.hoisted(() => [] as string[])
const run = vi.hoisted(() => ({ value: { live: { id: 'r1', league: 'L', name: 'Run', tally: {} as Record<string, unknown> } } }))
const edits = vi.hoisted(() => [] as unknown[])
vi.mock('@/web/woke/ui/layer', () => ({ toast: (t: string) => { toasts.push(t) } }))
vi.mock('@/web/woke/net-worth/run-store', () => ({
  loadRuns: async () => {},
  runsDoc: run,
  editRun: async (_l: string, _id: string, fn: (r: { held?: unknown[] }) => { held?: unknown[] }) => { edits.push(fn({ held: [] }).held) }
}))
vi.mock('@/web/woke/net-worth/prices', () => ({
  ninjaPriceOf: () => (i: { name: string, typeLine: string }) =>
    i.name === 'Darkness Enthroned' ? { chaos: 50 } : i.typeLine === 'Crystal Belt' && !i.name ? { chaos: 1 } : null
}))
vi.mock('@/web/woke/shared/price', () => ({ useUnidPrice: () => () => null }))

beforeAll(loadGameData)
beforeEach(() => { toasts.length = 0; edits.length = 0 })

const unid = (cls: string, base: string) => [`Item Class: ${cls}`, 'Rarity: Unique', base, '--------', 'Item Level: 84', '--------', 'Unidentified', ''].join('\n')

describe('holding an unidentified unique', () => {
  it('holds it as the one unique on its base', async () => {
    const { holdHovered } = await import('@/web/woke/net-worth/run-hold')
    await holdHovered(unid('Belts', 'Stygian Vise'), 'L', [], null)
    expect(edits[0]).toMatchObject([{ name: 'Darkness Enthroned', unitChaos: 50 }])
  })
  it('refuses a base several uniques share, instead of pricing it as a white base', async () => {
    const { holdHovered } = await import('@/web/woke/net-worth/run-hold')
    await holdHovered(unid('Belts', 'Crystal Belt'), 'L', [], null)
    expect(edits).toEqual([])
    expect(toasts[0]).toMatch(/more than one unique/)
  })
})

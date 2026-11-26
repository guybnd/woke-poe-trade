// Atlas strategies show what Net worth's runs of the same name earned (the
// Farming tool that fed them before is gone).
import { describe, expect, it } from 'vitest'
import { earningsFrom } from '@/web/woke/atlas/earnings'
import type { RunBoard, RunBoardRow } from '@/web/woke/net-worth/runs'

const row = (o: Partial<RunBoardRow>): RunBoardRow => ({
  name: 'Strand alch',
  count: 3,
  maps: 40,
  fights: 2,
  profitChaos: 4200,
  perMapChaos: 100,
  perHour: { play: 900, hub: 700, all: 600 },
  costPerMapChaos: 20,
  perMapNoTopChaos: 80,
  small: false,
  ...o
})

describe('Atlas earnings from Net worth runs', () => {
  it('keys by run name, per hour under the Per hour setting', () => {
    const board: RunBoard = { league: 'L', rows: [row({}), row({ name: 'Delirium', perHour: { play: null, hub: 50, all: 40 }, perMapChaos: null })] }
    const play = earningsFrom(board, 'play')
    expect(play.get('Strand alch')).toEqual({ runs: 3, maps: 40, fights: 2, perHour: 900, perMap: 100 })
    expect(play.get('Delirium')).toEqual({ runs: 3, maps: 40, fights: 2, perHour: null, perMap: null })
    expect(earningsFrom(board, 'all').get('Strand alch')!.perHour).toBe(600)
  })

  it('a crafting run of the same name never stands in for the maps', () => {
    const board: RunBoard = { league: 'L', rows: [row({}), row({ craft: true, perHour: { play: 5, hub: 5, all: 5 } })] }
    expect(earningsFrom(board, 'play').get('Strand alch')!.perHour).toBe(900)
  })

  it('no board, nothing to show', () => {
    expect(earningsFrom(null, 'play').size).toBe(0)
  })
})

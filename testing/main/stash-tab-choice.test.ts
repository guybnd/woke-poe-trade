// Which stash tabs the reader reads (main/src/woke/personal/tab-choice.ts):
// templates, your own ticks, saved sets, and a read that waits for a choice.
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { chosenTabs, deleteSet, fitsTemplate, readLeagueTabs, saveSet, setChoice } from '../../main/src/woke/personal/tab-choice'
import type { TabChoice } from '../../main/src/woke/personal/tab-choice'
import { StashReader, readCache } from '../../main/src/woke/personal/stash-reader'
import type { StashTabInfo } from '../../main/src/woke/personal/stash-parse'

const tab = (index: number, name: string, type: string): StashTabInfo => ({ id: `t${index}`, index, name, type, colour: null, hidden: false })

// Like a real Standard list: special tabs, priced dump tabs, plain ones, remove-only.
const TABS = [
  tab(0, '~b/o 2 chaos (Remove-only)', 'QuadStash'),
  tab(1, 'Currency', 'CurrencyStash'),
  tab(2, 'Frags', 'FragmentStash'),
  tab(3, 'Cards', 'DivinationCardStash'),
  tab(4, '$ sell', 'PremiumStash'),
  tab(5, '~price 1 chaos', 'NormalStash'),
  tab(6, '~b/o 1 divine', 'QuadStash'),
  tab(7, 'Dump', 'QuadStash'),
  tab(8, 'Gear', 'PremiumStash'),
  tab(9, 'Old maps (Remove-only)', 'MapStash'),
  tab(10, 'Folder', 'Folder')
]
const names = (tabs: StashTabInfo[]) => tabs.map(t => t.name)

beforeEach(() => {
  process.env.WOKE_FAKE_USER_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-tabs-'))
})

describe('templates', () => {
  it('Reasonable: special tabs and tabs named $ or ~price / ~b/o', () => {
    expect(names(chosenTabs({ template: 'reasonable', ids: [] }, TABS))).toEqual(['Currency', 'Frags', 'Cards', '$ sell', '~price 1 chaos', '~b/o 1 divine'])
  })

  it('Currency only: the currency tab', () => {
    expect(names(chosenTabs({ template: 'currency', ids: [] }, TABS))).toEqual(['Currency'])
  })

  it('This league, all: every tab but remove-only ones and folders', () => {
    expect(names(chosenTabs({ template: 'league', ids: [] }, TABS))).toEqual(['Currency', 'Frags', 'Cards', '$ sell', '~price 1 chaos', '~b/o 1 divine', 'Dump', 'Gear'])
  })

  it('remove-only tabs never fit, whatever their type', () => {
    for (const t of ['reasonable', 'currency', 'league'] as const) {
      expect(fitsTemplate(t, tab(0, 'Currency (Remove-only)', 'CurrencyStash'))).toBe(false)
    }
  })

  it('a template takes in new tabs that fit it; your own ticks do not', () => {
    const later = [...TABS, tab(11, '$ new', 'QuadStash')]
    expect(names(chosenTabs({ template: 'reasonable', ids: [] }, later))).toContain('$ new')
    const mine: TabChoice = { template: 'custom', ids: ['t7', 't8'] }
    expect(names(chosenTabs(mine, later))).toEqual(['Dump', 'Gear'])
  })

  it('nothing chosen: nothing read', () => {
    expect(chosenTabs(null, TABS)).toEqual([])
  })
})

describe('saved per league', () => {
  it('keeps the choice and named sets, apart per league', async () => {
    expect(await readLeagueTabs('Standard')).toEqual({ choice: null, sets: [] })
    await setChoice('Standard', { template: 'currency', ids: [] })
    let s = await saveSet('Standard', '  Dumps  ', ['t7', 't8'])
    expect(s.sets).toEqual([{ name: 'Dumps', ids: ['t7', 't8'] }])
    expect(s.choice).toEqual({ template: 'custom', ids: ['t7', 't8'], set: 'Dumps' })
    s = await saveSet('Standard', 'Dumps', ['t7'])
    expect(s.sets).toEqual([{ name: 'Dumps', ids: ['t7'] }])
    expect((await readLeagueTabs('Mercenaries')).choice).toBeNull()
    s = await deleteSet('Standard', 'Dumps')
    expect(s.sets).toEqual([])
    // The ticks stay; only the name goes.
    expect(s.choice).toEqual({ template: 'custom', ids: ['t7'] })
  })

  it('a broken file reads as nothing chosen', async () => {
    const dir = path.join(process.env.WOKE_FAKE_USER_DATA!, 'woke-personal')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'tabs.json'), JSON.stringify({ Standard: { choice: { template: 'all-of-it' }, sets: [{ name: '' }, 5] } }))
    expect(await readLeagueTabs('Standard')).toEqual({ choice: null, sets: [] })
  })
})

describe('reading the chosen tabs', () => {
  const list = JSON.stringify({ numTabs: TABS.length, tabs: TABS.map(t => ({ n: t.name, i: t.index, id: t.id, type: t.type, colour: { r: 0, g: 0, b: 0 } })), items: [] })
  const profile = '<title>View Profile - Path of Exile - Guy#1234</title>'

  function makeReader (choice: TabChoice | null) {
    const asked: string[] = []
    const reader = new StashReader({
      fetch: async (url) => {
        const u = new URL(url)
        if (u.pathname.endsWith('/my-account')) { asked.push('account'); return { status: 200, headers: {}, body: profile } }
        asked.push(u.searchParams.get('tabIndex')!)
        return { status: 200, headers: {}, body: u.searchParams.get('tabs') === '1' ? list : '{"items":[]}' }
      },
      now: () => 1_000_000,
      sleep: async () => {},
      onStatus: () => {},
      choice: async () => choice
    })
    return { reader, asked }
  }

  it('reads nothing until tabs are chosen, not even the account name, and says so', async () => {
    const { reader, asked } = makeReader(null)
    await reader.setLeague('Standard')
    const s = await reader.read('manual')
    expect(s.error?.kind).toBe('pick-tabs')
    expect(asked).toEqual([])
  })

  it('reads only the chosen tabs, and the window counts them', async () => {
    const { reader, asked } = makeReader({ template: 'custom', ids: ['t3', 't8'] })
    await reader.setLeague('Standard')
    const s = await reader.read('manual')
    expect(s.error).toBeNull()
    // The first call lists the tabs (and brings tab 0, not chosen, left out).
    expect(asked).toEqual(['account', '0', '3', '8'])
    expect(s.chosen).toBe(2)
    expect(s.listed).toBe(9)
    expect(s.skipped).toBe(2)
    expect((await readCache('Standard'))!.tabs.map(t => t.name)).toEqual(['Cards', 'Gear'])
  })

  it('the tab list is one call, remove-only tabs aside', async () => {
    const { reader, asked } = makeReader(null)
    await reader.setLeague('Standard')
    reader.restoreAccount('Guy#1234')
    const r = await reader.listTabs()
    expect(asked).toEqual(['0'])
    if ('error' in r) throw new Error(r.error)
    expect(r.league).toBe('Standard')
    expect(r.tabs.map(t => t.name)).not.toContain('Old maps (Remove-only)')
    expect(r.tabs).toHaveLength(9)
  })

  it('a tab list that fails says why and leaves the window status alone', async () => {
    const reader = new StashReader({
      fetch: async () => ({ status: 429, headers: { 'retry-after': '120' }, body: '' }),
      now: () => 1_000_000,
      sleep: async () => {},
      onStatus: () => {},
      choice: async () => null
    })
    await reader.setLeague('Standard')
    reader.restoreAccount('Guy#1234')
    const r = await reader.listTabs()
    expect('error' in r && r.error).toMatch(/slow down.*min/)
    expect(reader.current.error).toBeNull()
  })
})
